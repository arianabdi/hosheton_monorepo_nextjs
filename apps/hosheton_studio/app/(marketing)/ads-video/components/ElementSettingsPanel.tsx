'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuLoaderCircle, LuMousePointerClick, LuMove, LuRotateCcw, LuSave } from 'react-icons/lu';
import { adsVideoApi, type AdsCutFull } from '../lib/ads-video-api';
import {
    applyElementOverride,
    highlightElement,
    type AdsElementHandle,
    type ElementOverrideValue,
} from '../lib/cut-runtime';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import styles from '../AdsVideo.module.scss';

export interface ElementSettingsPanelProps {
    cut: AdsCutFull | null;
    /** getter خواندن المان‌ها از iframe فعال پخش‌کننده */
    getElements(): AdsElementHandle[];
    /** نسخه/سند کات عوض شد → المان‌ها دوباره خوانده شوند */
    readKey: string;
    /** تغییر overrideها از جای دیگر (جابه‌جایی با drag / ویرایش درجای متن) — دوباره خواندن */
    overridesVersion?: number;
    /** المانی که با کلیک داخل پیش‌نمایش انتخاب شده — پنل همان را هایلایت و باز می‌کند */
    focusElementId?: string | null;
    onSaved(cut: AdsCutFull): void;
    onError(message: string): void;
}

type ElementDraft = { id: string; label: string; type: AdsElementHandle['type']; value: string };
type Position = { x?: number; y?: number };

function parseOverridePosition(override: unknown): Position {
    if (override && typeof override === 'object' && !Array.isArray(override)) {
        const obj = override as { x?: unknown; y?: unknown };
        return {
            x: typeof obj.x === 'number' ? obj.x : undefined,
            y: typeof obj.y === 'number' ? obj.y : undefined,
        };
    }
    return {};
}

/**
 * تب «المان‌ها» — تک‌تک المان‌های قابل‌ویرایش کات که خودِ موشن‌گرافیک از طریق
 * window.__adsElements معرفی می‌کند. هر تغییر بلافاصله داخل iframe اعمال می‌شود؛
 * فوکوس هر ویرایشگر، المان را داخل پیش‌نمایش هایلایت می‌کند و هر المان با
 * کنترل‌های X/Y در صحنه جابه‌جا می‌شود.
 */
export function ElementSettingsPanel({ cut, getElements, readKey, overridesVersion, focusElementId, onSaved, onError }: ElementSettingsPanelProps) {
    const { t } = useTranslation('adsVideo');
    const [elements, setElements] = useState<ElementDraft[]>([]);
    const [positions, setPositions] = useState<Record<string, Position>>({});
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const valuesRef = useRef<Record<string, string>>({});
    const positionsRef = useRef<Record<string, Position>>({});
    const handlesRef = useRef<AdsElementHandle[]>([]);
    const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const highlightedRef = useRef<string | null>(null);

    const readElements = useCallback(() => {
        const handles = getElements();
        handlesRef.current = handles;
        if (!handles.length) {
            setElements([]);
            setNotFound(true);
            return;
        }
        setNotFound(false);
        const overrides = (cut?.elementOverrides || {}) as Record<string, ElementOverrideValue>;
        setElements(handles.map((handle) => {
            const hasOverride = Object.prototype.hasOwnProperty.call(overrides, handle.id);
            const raw = hasOverride ? overrides[handle.id] : handle.value;
            return {
                id: handle.id,
                label: handle.label,
                type: handle.type,
                value: raw == null ? '' : String(typeof raw === 'object' && raw !== null ? (raw as { value?: unknown }).value : raw),
            };
        }));
        const nextPositions: Record<string, Position> = {};
        handles.forEach((handle) => {
            if (Object.prototype.hasOwnProperty.call(overrides, handle.id)) {
                const pos = parseOverridePosition(overrides[handle.id]);
                if (pos.x !== undefined || pos.y !== undefined) nextPositions[handle.id] = pos;
            }
        });
        setPositions(nextPositions);
        positionsRef.current = nextPositions;
        setDirty(false);
    }, [cut, getElements]);

    /** هایلایت یک المان داخل پیش‌نمایش و خاموش کردن بقیه */
    const showHighlight = useCallback((id?: string | null) => {
        if (highlightedRef.current === id) return;
        handlesRef.current.forEach((handle) => {
            highlightElement(handle, handle.id === id);
        });
        highlightedRef.current = id ?? null;
    }, []);

    // وقتی تب/کات/نسخه عوض می‌شود چند بار تلاش کن — iframe ممکن است هنوز لود نشده باشد
    useEffect(() => {
        if (!cut) return;
        let tries = 0;
        const timer = setInterval(() => {
            tries += 1;
            const handles = getElements();
            if (handles.length) {
                clearInterval(timer);
                handlesRef.current = handles;
                const overrides = (cut.elementOverrides || {}) as Record<string, ElementOverrideValue>;
                valuesRef.current = {};
                const drafts = handles.map((handle) => {
                    const hasOverride = Object.prototype.hasOwnProperty.call(overrides, handle.id);
                    const raw = hasOverride ? overrides[handle.id] : handle.value;
                    const value = raw == null ? '' : String(typeof raw === 'object' && raw !== null ? (raw as { value?: unknown }).value : raw);
                    valuesRef.current[handle.id] = value;
                    return { id: handle.id, label: handle.label, type: handle.type, value };
                });
                const nextPositions: Record<string, Position> = {};
                handles.forEach((handle) => {
                    if (Object.prototype.hasOwnProperty.call(overrides, handle.id)) {
                        const pos = parseOverridePosition(overrides[handle.id]);
                        if (pos.x !== undefined || pos.y !== undefined) nextPositions[handle.id] = pos;
                    }
                });
                setPositions(nextPositions);
                positionsRef.current = nextPositions;
                setElements(drafts);
                setDirty(false);
            } else if (tries >= 20) {
                clearInterval(timer);
                setNotFound(true);
            }
        }, 250);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cut?._id, cut?.currentVersion, readKey]);

    // المان انتخاب‌شده از داخل پیش‌نمایش — اسکرول به ویرایشگرش + هایلایت
    useEffect(() => {
        if (!focusElementId) return;
        showHighlight(focusElementId);
        rowRefs.current[focusElementId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [focusElementId, elements, showHighlight]);
    const focusedId = hoverId ?? focusElementId;

    // جابه‌جایی/متنِ درجا در preview (drag/دابل‌کلیک) overrideها را عوض کرده —
    // تا کاربر ویرایش ذخیره‌نشده‌ای نداشته باشد، position/مقدار تازه خوانده شود
    useEffect(() => {
        if (!overridesVersion || dirty) return;
        const raf = requestAnimationFrame(() => readElements());
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [overridesVersion]);

    const patchValue = (id: string, value: string) => {
        valuesRef.current[id] = value;
        setElements((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
        setDirty(true);
        // اعمال زنده روی سند در حال پخش
        handlesRef.current.forEach((handle) => {
            if (handle.id === id) {
                try {
                    handle.apply(value);
                } catch {
                    /* ignore */
                }
            }
        });
    };

    const patchPosition = (id: string, axis: 'x' | 'y', raw: number) => {
        const value = Number.isFinite(raw) ? Math.round(raw) : 0;
        const next = { ...positionsRef.current[id], [axis]: value };
        positionsRef.current[id] = next;
        setPositions((prev) => ({ ...prev, [id]: next }));
        setDirty(true);
        // اعمال زنده روی سند — آفست relative تا انیمیشن‌های transform خراب نشوند
        handlesRef.current.forEach((handle) => {
            if (handle.id === id && handle.el) {
                handle.el.style.position = 'relative';
                if (next.x != null) handle.el.style.left = `${next.x}px`;
                if (next.y != null) handle.el.style.top = `${next.y}px`;
            }
        });
    };

    const save = async () => {
        if (!cut || !dirty) return;
        setSaving(true);
        try {
            const overrides: Record<string, ElementOverrideValue> = {};
            handlesRef.current.forEach((handle) => {
                const value = valuesRef.current[handle.id];
                const pos = positionsRef.current[handle.id];
                const hasValue = value !== undefined;
                const hasPos = pos && (pos.x != null || pos.y != null);
                if (hasValue && hasPos) overrides[handle.id] = { value, x: pos.x, y: pos.y };
                else if (hasPos && pos) overrides[handle.id] = { x: pos.x, y: pos.y };
                else if (hasValue) overrides[handle.id] = value;
            });
            await adsVideoApi.updateCut(cut._id, { elementOverrides: overrides });
            const fresh = await adsVideoApi.getCut(cut._id);
            onSaved(fresh.cut);
            setDirty(false);
        } catch (error) {
            onError(getApiErrorMessage(error, t('err_save_elements')));
        } finally {
            setSaving(false);
        }
    };

    const reset = async () => {
        if (!cut) return;
        setSaving(true);
        try {
            await adsVideoApi.updateCut(cut._id, { elementOverrides: {} });
            const fresh = await adsVideoApi.getCut(cut._id);
            onSaved(fresh.cut);
            valuesRef.current = {};
            positionsRef.current = {};
            // بازگرداندن جابه‌جایی زنده
            handlesRef.current.forEach((handle) => {
                applyElementOverride(handle, '');
            });
            handlesRef.current.forEach((handle) => {
                if (handle.el) {
                    handle.el.style.left = '';
                    handle.el.style.top = '';
                    if (handle.el.style.position === 'relative') handle.el.style.position = '';
                }
            });
            setPositions({});
            readElements();
        } catch (error) {
            onError(getApiErrorMessage(error, t('err_save_elements')));
        } finally {
            setSaving(false);
        }
    };

    const hasOverrides = useMemo(() => Boolean(cut && Object.keys(cut.elementOverrides || {}).length), [cut]);

    if (!cut) {
        return <div className={styles.panelEmpty}>{t('elements_select_first')}</div>;
    }

    return (
        <div className={styles.elementsPanel}>
            <div className={styles.elementsHead}>
                <span className={styles.elementsHint}>
                    <LuMousePointerClick size={12} />
                    {t('elements_hint')}
                </span>
                <div className={styles.elementsActions}>
                    {hasOverrides && (
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            disabled={saving}
                            title={t('elements_reset')}
                            onClick={() => void reset()}
                        >
                            <LuRotateCcw size={12} />
                            {t('elements_reset')}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={saving || !dirty}
                        onClick={() => void save()}
                    >
                        {saving ? <LuLoaderCircle size={12} className={styles.spin} /> : <LuSave size={12} />}
                        {t('elements_save')}
                    </button>
                </div>
            </div>

            {notFound && elements.length === 0 && (
                <div className={styles.panelEmpty}>
                    {t('elements_none')}
                    <button type="button" className={styles.ghostBtn} onClick={readElements}>
                        {t('elements_retry')}
                    </button>
                </div>
            )}

            {!notFound && elements.length === 0 && (
                <div className={styles.panelEmpty}>{t('elements_loading')}</div>
            )}

            {elements.map((element) => {
                const pos = positions[element.id] || {};
                const isFocused = focusedId === element.id;
                return (
                    <div
                        key={element.id}
                        ref={(el) => { rowRefs.current[element.id] = el; }}
                        className={`${styles.elementRow} ${isFocused ? styles.elementRowFocused : ''}`}
                        onMouseEnter={() => showHighlight(element.id)}
                        onMouseLeave={() => showHighlight(focusedId)}
                    >
                        <span className={styles.elementLabel}>{element.label}</span>
                        {element.type === 'color' && (
                            <span className={styles.elementColor}>
                                <input
                                    type="color"
                                    value={/^#[0-9a-fA-F]{6}$/.test(element.value) ? element.value : '#000000'}
                                    onFocus={() => { setHoverId(element.id); showHighlight(element.id); }}
                                    onBlur={() => { setHoverId(null); showHighlight(focusElementId); }}
                                    onChange={(e) => patchValue(element.id, e.target.value)}
                                />
                                <input
                                    type="text"
                                    dir="ltr"
                                    value={element.value}
                                    onFocus={() => { setHoverId(element.id); showHighlight(element.id); }}
                                    onBlur={() => { setHoverId(null); showHighlight(focusElementId); }}
                                    onChange={(e) => patchValue(element.id, e.target.value)}
                                />
                            </span>
                        )}
                        {element.type === 'number' && (
                            <input
                                type="number"
                                dir="ltr"
                                value={element.value}
                                onFocus={() => { setHoverId(element.id); showHighlight(element.id); }}
                                onBlur={() => { setHoverId(null); showHighlight(focusElementId); }}
                                onChange={(e) => patchValue(element.id, e.target.value)}
                            />
                        )}
                        {element.type === 'image' && (
                            <span className={styles.elementImage}>
                                {element.value && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={element.value} alt="" />
                                )}
                                <input
                                    type="text"
                                    dir="ltr"
                                    placeholder="https://…"
                                    value={element.value}
                                    onFocus={() => { setHoverId(element.id); showHighlight(element.id); }}
                                    onBlur={() => { setHoverId(null); showHighlight(focusElementId); }}
                                    onChange={(e) => patchValue(element.id, e.target.value)}
                                />
                            </span>
                        )}
                        {(element.type === 'text' || !element.type) && (
                            <textarea
                                rows={element.value.length > 60 ? 3 : 1}
                                value={element.value}
                                onFocus={() => { setHoverId(element.id); showHighlight(element.id); }}
                                onBlur={() => { setHoverId(null); showHighlight(focusElementId); }}
                                onChange={(e) => patchValue(element.id, e.target.value)}
                            />
                        )}
                        {/* جابه‌جایی المان در صحنه */}
                        <span className={styles.elementMove}>
                            <LuMove size={11} />
                            <label>
                                X
                                <input
                                    type="number"
                                    dir="ltr"
                                    value={pos.x ?? 0}
                                    onFocus={() => { setHoverId(element.id); showHighlight(element.id); }}
                                    onBlur={() => { setHoverId(null); showHighlight(focusElementId); }}
                                    onChange={(e) => patchPosition(element.id, 'x', Number(e.target.value))}
                                />
                            </label>
                            <label>
                                Y
                                <input
                                    type="number"
                                    dir="ltr"
                                    value={pos.y ?? 0}
                                    onFocus={() => { setHoverId(element.id); showHighlight(element.id); }}
                                    onBlur={() => { setHoverId(null); showHighlight(focusElementId); }}
                                    onChange={(e) => patchPosition(element.id, 'y', Number(e.target.value))}
                                />
                            </label>
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default ElementSettingsPanel;
