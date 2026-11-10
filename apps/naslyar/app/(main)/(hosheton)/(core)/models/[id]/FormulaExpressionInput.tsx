'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import editorStyles from './FormulaExpressionInput.module.scss';
import {
    parseFormulaText,
    serializeFormulaExpression,
    type FormulaEditorToken,
    type FormulaLookupDefinition,
    type FormulaReference,
    type TokenFormulaNode,
} from './formulaExpression';

interface RuntimeMetric {
    key: string;
    label: string;
    category: 'input' | 'output';
}

interface SettingField {
    key: string;
    label: string;
    options?: Array<{ value: string; label: string }>;
}

interface FormulaExpressionInputProps {
    value: string;
    expression: TokenFormulaNode;
    runtimeMetrics: RuntimeMetric[];
    settings: SettingField[];
    lookups: FormulaLookupDefinition[];
    onLookupsChange: (lookups: FormulaLookupDefinition[]) => void;
    onChange: (result: {
        text: string;
        tokens: FormulaEditorToken[];
        expression?: TokenFormulaNode;
        error?: string;
    }) => void;
}

const GROUP_LABELS: Record<FormulaReference['group'], string> = {
    'runtime-input': 'Runtime · input',
    'runtime-output': 'Runtime · output',
    settings: 'Model settings',
    synthetic: 'Synthetic runtime values',
    lookups: 'Weighted option variables',
    operands: 'Preset lookup operands',
};

const GROUP_ORDER: FormulaReference['group'][] = [
    'runtime-input',
    'runtime-output',
    'settings',
    'synthetic',
    'lookups',
    'operands',
];

function lookupReference(lookup: FormulaLookupDefinition): FormulaReference {
    return {
        ref: `@lookup.${lookup.id}`,
        label: lookup.label || lookup.id,
        group: 'lookups',
        node: {
            type: 'lookup',
            source: lookup.source,
            key: lookup.key,
            table: { ...lookup.table },
            fallback: lookup.fallback,
            label: lookup.label || lookup.id,
        },
    };
}

function parseLookupTable(text: string): Record<string, number> | null {
    const table: Record<string, number> = {};
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
        const separator = line.indexOf('=');
        if (separator <= 0) return null;
        const key = line.slice(0, separator).trim();
        const value = Number(line.slice(separator + 1).trim());
        if (!key || !Number.isFinite(value)) return null;
        table[key] = value;
    }
    return Object.keys(table).length ? table : null;
}

function lookupTableText(table: Record<string, number>): string {
    return Object.entries(table).map(([key, value]) => `${key}=${value}`).join('\n');
}

function lookupIdFromKey(key: string): string {
    return `${key.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'value'}_factor`;
}

function referenceQuery(text: string, caret: number): { start: number; query: string } | null {
    const match = text.slice(0, caret).match(/@([A-Za-z0-9_.-]*)$/);
    return match ? { start: caret - match[0].length, query: match[1].toLowerCase() } : null;
}

function HighlightedExpression({ value }: { value: string }) {
    const parts = value.split(/(@[A-Za-z0-9_.-]+)/g);
    return (
        <>
            {parts.map((part, index) => part.startsWith('@') ? (
                <span key={`${part}-${index}`} className={editorStyles.variableBadge}>{part}</span>
            ) : (
                <React.Fragment key={`text-${index}`}>{part}</React.Fragment>
            ))}
        </>
    );
}

export default function FormulaExpressionInput({
    value,
    expression,
    runtimeMetrics,
    settings,
    lookups,
    onLookupsChange,
    onChange,
}: FormulaExpressionInputProps) {
    const [activeQuery, setActiveQuery] = useState<{ start: number; query: string } | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [editingLookupId, setEditingLookupId] = useState<string | null>(null);
    const [lookupSettingKey, setLookupSettingKey] = useState('');
    const [lookupId, setLookupId] = useState('');
    const [lookupLabel, setLookupLabel] = useState('');
    const [lookupValuesText, setLookupValuesText] = useState('');
    const [lookupFallback, setLookupFallback] = useState(0);
    const [lookupError, setLookupError] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const caretMarkerRef = useRef<HTMLSpanElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const preservedReferences = useMemo(
        () => serializeFormulaExpression(expression).references,
        [expression],
    );

    const references = useMemo(() => {
        const result = new Map(preservedReferences.map((item) => [item.ref, item]));
        runtimeMetrics.forEach((metric) => {
            const ref = `@runtime.${metric.key}`;
            const preserved = result.get(ref);
            result.set(ref, {
                ref,
                label: metric.label || metric.key,
                group: metric.category === 'input' ? 'runtime-input' : 'runtime-output',
                node: preserved?.node || {
                    type: 'value',
                    source: 'runtime',
                    key: metric.key,
                    fallback: metric.key === 'outputFrameRate' ? 24 : 0,
                    label: metric.label,
                },
            });
        });
        settings.filter((setting) => setting.key).forEach((setting) => {
            const ref = `@setting.${setting.key}`;
            const preserved = result.get(ref);
            result.set(ref, {
                ref,
                label: setting.label || setting.key,
                group: 'settings',
                node: preserved?.node || {
                    type: 'value',
                    source: 'setting',
                    key: setting.key,
                    fallback: 0,
                    label: setting.label,
                },
            });
        });
        lookups.forEach((lookup) => {
            const reference = lookupReference(lookup);
            result.set(reference.ref, reference);
        });
        [
            { key: 'promptLength', label: 'Prompt length (characters)' },
            { key: 'pricingRate', label: 'Matched pricing rate' },
        ].forEach((metric) => {
            const ref = `@runtime.${metric.key}`;
            if (!result.has(ref)) {
                result.set(ref, {
                    ref,
                    label: metric.label,
                    group: 'synthetic',
                    node: {
                        type: 'value',
                        source: 'runtime',
                        key: metric.key,
                        fallback: 0,
                        label: metric.label,
                    },
                });
            }
        });
        return Array.from(result.values());
    }, [preservedReferences, runtimeMetrics, settings, lookups]);
    const error = useMemo(
        () => parseFormulaText(value, references).error,
        [references, value],
    );

    const suggestions = useMemo(() => {
        if (!activeQuery) return [];
        return references
            .filter((item) => {
                const haystack = `${item.ref} ${item.label} ${GROUP_LABELS[item.group]}`.toLowerCase();
                return haystack.includes(activeQuery.query);
            })
            .sort((left, right) => {
                const groupDifference = GROUP_ORDER.indexOf(left.group) - GROUP_ORDER.indexOf(right.group);
                return groupDifference || left.ref.localeCompare(right.ref);
            });
    }, [activeQuery, references]);

    /**
     * منوی @ کنار خود کرسر: مکان «@» از یک کپی نامرئی متن (هم‌اندازه‌ی لایه‌ی هایلایت) خوانده می‌شود،
     * منو با position: fixed روی body می‌نشیند تا کارت/اسکرول والد آن را نبُرد، و اگر زیر کرسر جا نباشد بالای آن باز می‌شود.
     */
    const positionMenu = useCallback(() => {
        const input = inputRef.current;
        const marker = caretMarkerRef.current;
        const menu = menuRef.current;
        if (!input || !marker || !menu) return;
        const gap = 4;
        const edge = 8;
        const caret = marker.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        // کرسر اسکرول‌شده‌ی بیرون از کادر textarea را به لبه‌ی کادر می‌چسبانیم
        const caretTop = Math.min(Math.max(caret.top - input.scrollTop, inputRect.top), inputRect.bottom - caret.height);
        const caretBottom = caretTop + caret.height;
        const caretLeft = caret.left - input.scrollLeft;
        const { offsetWidth: width, offsetHeight: height } = menu;
        const spaceBelow = window.innerHeight - caretBottom - gap - edge;
        const spaceAbove = caretTop - gap - edge;
        const top = height <= spaceBelow || spaceBelow >= spaceAbove
            ? caretBottom + gap
            : Math.max(edge, caretTop - gap - height);
        const left = Math.min(Math.max(edge, caretLeft), window.innerWidth - width - edge);
        menu.style.top = `${Math.round(top)}px`;
        menu.style.left = `${Math.round(Math.max(edge, left))}px`;
        menu.style.maxHeight = `${Math.max(120, Math.min(310, Math.max(spaceBelow, spaceAbove)))}px`;
    }, []);

    useLayoutEffect(() => {
        if (activeQuery) positionMenu();
    }, [activeQuery, value, suggestions.length, positionMenu]);

    useEffect(() => {
        if (!activeQuery) return;
        window.addEventListener('scroll', positionMenu, true);
        window.addEventListener('resize', positionMenu);
        return () => {
            window.removeEventListener('scroll', positionMenu, true);
            window.removeEventListener('resize', positionMenu);
        };
    }, [activeQuery, positionMenu]);

    const updateText = (nextText: string, caret: number) => {
        const result = parseFormulaText(nextText, references);
        onChange({ text: nextText, ...result });
        setActiveQuery(referenceQuery(nextText, caret));
        setSelectedIndex(0);
    };

    const insertReference = (reference: FormulaReference) => {
        const input = inputRef.current;
        if (!input || !activeQuery) return;
        const caret = input.selectionStart;
        const nextText = `${value.slice(0, activeQuery.start)}${reference.ref}${value.slice(caret)}`;
        const nextCaret = activeQuery.start + reference.ref.length;
        updateText(nextText, nextCaret);
        setActiveQuery(null);
        requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(nextCaret, nextCaret);
        });
    };

    const syncLookups = (nextLookups: FormulaLookupDefinition[], nextText = value) => {
        onLookupsChange(nextLookups);
        const nextReferences = [
            ...references.filter((reference) => reference.group !== 'lookups'),
            ...nextLookups.map(lookupReference),
        ];
        onChange({ text: nextText, ...parseFormulaText(nextText, nextReferences) });
    };

    const selectLookupSetting = (key: string) => {
        const setting = settings.find((item) => item.key === key);
        setLookupSettingKey(key);
        setLookupId(lookupIdFromKey(key));
        setLookupLabel(setting ? `ضریب ${setting.label}` : '');
        setLookupValuesText(
            setting?.options?.map((option) => `${option.value}=0`).join('\n') || '',
        );
        setLookupFallback(0);
        setEditingLookupId(null);
        setLookupError('');
    };

    const editLookup = (lookup: FormulaLookupDefinition) => {
        setEditingLookupId(lookup.id);
        setLookupSettingKey(lookup.key);
        setLookupId(lookup.id);
        setLookupLabel(lookup.label);
        setLookupValuesText(lookupTableText(lookup.table));
        setLookupFallback(lookup.fallback);
        setLookupError('');
    };

    const saveLookup = () => {
        const normalizedId = lookupId.trim().replace(/^@?lookup\./, '');
        const table = parseLookupTable(lookupValuesText);
        if (!lookupSettingKey) {
            setLookupError('ابتدا یکی از فیلدهای تنظیمات را انتخاب کنید.');
            return;
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedId)) {
            setLookupError('نام متغیر فقط می‌تواند شامل حروف انگلیسی، عدد و _ باشد.');
            return;
        }
        if (!table) {
            setLookupError('وزن‌ها را به‌شکل value=number و هر کدام را در یک خط وارد کنید.');
            return;
        }
        const duplicate = lookups.some((lookup) =>
            lookup.id === normalizedId && lookup.id !== editingLookupId
        );
        if (duplicate) {
            setLookupError('متغیری با این نام قبلاً تعریف شده است.');
            return;
        }
        const definition: FormulaLookupDefinition = {
            id: normalizedId,
            label: lookupLabel.trim() || normalizedId,
            source: 'setting',
            key: lookupSettingKey,
            table,
            fallback: Number.isFinite(lookupFallback) ? lookupFallback : 0,
        };
        const nextLookups = editingLookupId
            ? lookups.map((lookup) => lookup.id === editingLookupId ? definition : lookup)
            : [...lookups, definition];
        const nextText = editingLookupId && editingLookupId !== normalizedId
            ? value.split(`@lookup.${editingLookupId}`).join(`@lookup.${normalizedId}`)
            : value;
        syncLookups(nextLookups, nextText);
        setEditingLookupId(null);
        setLookupError('');
    };

    return (
        <div className={editorStyles.root}>
            <div className={editorStyles.editorSurface}>
                <div ref={highlightRef} className={editorStyles.highlightLayer} aria-hidden>
                    <HighlightedExpression value={value} />
                    {value.endsWith('\n') ? '\n' : null}
                </div>
                {activeQuery ? (
                    // کپی نامرئی متن تا «@» فعلی — فقط برای خواندن مختصات کرسر
                    <div className={`${editorStyles.highlightLayer} ${editorStyles.caretMirror}`} aria-hidden>
                        {value.slice(0, activeQuery.start)}
                        <span ref={caretMarkerRef}>@</span>
                    </div>
                ) : null}
                <textarea
                    ref={inputRef}
                    value={value}
                    className={`${editorStyles.input} ${error ? editorStyles.invalid : ''}`}
                    aria-label="Token estimator formula"
                    aria-invalid={Boolean(error)}
                    placeholder="@runtime.outputDurationSeconds * 0.05"
                    spellCheck={false}
                    onScroll={(event) => {
                        const target = event.currentTarget;
                        if (highlightRef.current) {
                            highlightRef.current.scrollTop = target.scrollTop;
                            highlightRef.current.scrollLeft = target.scrollLeft;
                        }
                        if (activeQuery) positionMenu();
                    }}
                    onBlur={() => setActiveQuery(null)}
                    onChange={(event) => updateText(event.target.value, event.target.selectionStart)}
                    onClick={(event) => {
                        const target = event.currentTarget;
                        setActiveQuery(referenceQuery(target.value, target.selectionStart));
                    }}
                    onKeyUp={(event) => {
                        if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
                            const target = event.currentTarget;
                            setActiveQuery(referenceQuery(target.value, target.selectionStart));
                        }
                    }}
                    onKeyDown={(event) => {
                        if (!activeQuery) return;
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setActiveQuery(null);
                        } else if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setSelectedIndex((current) => suggestions.length ? (current + 1) % suggestions.length : 0);
                        } else if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            setSelectedIndex((current) => suggestions.length
                                ? (current - 1 + suggestions.length) % suggestions.length
                                : 0);
                        } else if (event.key === 'Enter' && suggestions[selectedIndex]) {
                            event.preventDefault();
                            insertReference(suggestions[selectedIndex]);
                        }
                    }}
                />
            </div>
            <p className={editorStyles.help}>
                اعداد، پرانتز و عملگرهای + − × ÷ (یا * /) را تایپ کنید؛ با @ متغیرها را جست‌وجو کنید.
                برای حداقل/سقف مبلغ از <code>max(a, b)</code> و <code>min(a, b)</code> استفاده کنید.
            </p>
            <details className={editorStyles.lookupBuilder}>
                <summary>تعریف متغیر وزنی برای optionها</summary>
                <p className={editorStyles.lookupHint}>
                    برای مقادیری مثل low / medium / high وزن عددی تعیین کنید؛ سپس متغیر ساخته‌شده با @ در دسترس است.
                </p>
                {lookups.length ? (
                    <div className={editorStyles.lookupList}>
                        {lookups.map((lookup) => (
                            <div key={lookup.id} className={editorStyles.lookupItem}>
                                <button type="button" onClick={() => editLookup(lookup)}>
                                    <code>@lookup.{lookup.id}</code>
                                    <span>{lookup.label}</span>
                                </button>
                                <button
                                    type="button"
                                    className={editorStyles.lookupRemove}
                                    aria-label={`حذف ${lookup.label}`}
                                    onClick={() => syncLookups(lookups.filter((item) => item.id !== lookup.id))}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
                <div className={editorStyles.lookupGrid}>
                    <label>
                        فیلد تنظیمات
                        <select
                            value={lookupSettingKey}
                            className="form-control form-control-sm"
                            onChange={(event) => selectLookupSetting(event.target.value)}
                        >
                            <option value="">انتخاب فیلد</option>
                            {settings.filter((setting) => setting.options?.length).map((setting) => (
                                <option key={setting.key} value={setting.key}>{setting.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        نام متغیر
                        <div className={editorStyles.lookupName}>
                            <span>@lookup.</span>
                            <input
                                value={lookupId}
                                className="form-control form-control-sm"
                                onChange={(event) => setLookupId(event.target.value)}
                            />
                        </div>
                    </label>
                    <label>
                        عنوان
                        <input
                            value={lookupLabel}
                            className="form-control form-control-sm"
                            onChange={(event) => setLookupLabel(event.target.value)}
                        />
                    </label>
                    <label>
                        مقدار جایگزین
                        <input
                            type="number"
                            value={lookupFallback}
                            className="form-control form-control-sm"
                            onChange={(event) => setLookupFallback(Number(event.target.value) || 0)}
                        />
                    </label>
                </div>
                <label className={editorStyles.lookupValues}>
                    وزن optionها (هر خط value=number)
                    <textarea
                        value={lookupValuesText}
                        rows={4}
                        placeholder={'low=16\nmedium=48\nhigh=96'}
                        className="form-control form-control-sm"
                        onChange={(event) => setLookupValuesText(event.target.value)}
                    />
                </label>
                {lookupError ? <p className={editorStyles.error}>{lookupError}</p> : null}
                <button type="button" className={editorStyles.lookupSave} onClick={saveLookup}>
                    {editingLookupId ? 'به‌روزرسانی متغیر وزنی' : 'افزودن به لیست @'}
                </button>
            </details>
            {error ? <p className={editorStyles.error}>{error}</p> : null}
            {activeQuery && typeof document !== 'undefined' ? createPortal(
                <div
                    ref={menuRef}
                    className={editorStyles.menu}
                    role="listbox"
                    dir="ltr"
                    // کلیک روی منو (حتی اسکرول‌بارش) فوکوس textarea را نگیرد تا با blur بسته نشود
                    onMouseDown={(event) => event.preventDefault()}
                >
                    {suggestions.length ? GROUP_ORDER.map((group) => {
                        const items = suggestions
                            .map((item, index) => ({ item, index }))
                            .filter(({ item }) => item.group === group);
                        if (!items.length) return null;
                        return (
                            <React.Fragment key={group}>
                                <div className={editorStyles.groupLabel}>{GROUP_LABELS[group]}</div>
                                {items.map(({ item, index }) => (
                                    <button
                                        key={item.ref}
                                        type="button"
                                        role="option"
                                        aria-selected={index === selectedIndex}
                                        className={`${editorStyles.option} ${index === selectedIndex ? editorStyles.selected : ''}`}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => insertReference(item)}
                                    >
                                        <span className={editorStyles.optionLabel}>{item.label}</span>
                                        <code className={editorStyles.reference}>{item.ref}</code>
                                    </button>
                                ))}
                            </React.Fragment>
                        );
                    }) : <div className={editorStyles.empty}>No matching variables</div>}
                </div>,
                document.body,
            ) : null}
        </div>
    );
}
