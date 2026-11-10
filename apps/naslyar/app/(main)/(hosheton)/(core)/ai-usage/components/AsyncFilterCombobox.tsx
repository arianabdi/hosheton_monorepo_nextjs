'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { LuChevronDown, LuLoaderCircle, LuSearch, LuX } from 'react-icons/lu';
import styles from './AsyncFilterCombobox.module.scss';

export interface FilterOption {
    value: string;
    label: string;
    /** Second line: email, provider, … */
    hint?: string;
    /** Small trailing text: «۱۲ پردازش» */
    meta?: string;
}

interface AsyncFilterComboboxProps {
    /** Visible field label («کاربر»، «مدل») */
    label: string;
    placeholder: string;
    /** Selected option (null = no filter) */
    value: FilterOption | null;
    onChange: (option: FilterOption | null) => void;
    /** Loads options for the typed text; called debounced */
    loadOptions: (query: string) => Promise<FilterOption[]>;
    /** Minimum characters before searching (0 = show suggestions on open) */
    minChars?: number;
    /** Text shown before the user reaches minChars */
    minCharsHint?: string;
    emptyText?: string;
}

const DEBOUNCE_MS = 300;

/** Bolds the typed part inside the option label (case-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
    const q = query.trim();
    if (!q) return <>{text}</>;
    const index = text.toLowerCase().indexOf(q.toLowerCase());
    if (index < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, index)}
            <mark className={styles.mark}>{text.slice(index, index + q.length)}</mark>
            {text.slice(index + q.length)}
        </>
    );
}

/**
 * Type-ahead filter (WAI-ARIA combobox + listbox): the list is fetched for what
 * the admin types — nothing is listed up front unless `minChars` is 0. Arrow
 * keys move, Enter selects, Escape closes; a selected value shows as a chip with
 * a clear button.
 */
export default function AsyncFilterCombobox({
    label,
    placeholder,
    value,
    onChange,
    loadOptions,
    minChars = 2,
    minCharsHint,
    emptyText = 'نتیجه‌ای پیدا نشد',
}: AsyncFilterComboboxProps) {
    const baseId = useId();
    const listId = `${baseId}-list`;
    const inputRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef(0);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<FilterOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [active, setActive] = useState(-1);

    const tooShort = query.trim().length < minChars;

    useEffect(() => {
        if (!open || tooShort) {
            setOptions([]);
            setLoading(false);
            return;
        }
        const requestId = ++requestRef.current;
        setLoading(true);
        setFailed(false);
        const timer = window.setTimeout(() => {
            loadOptions(query.trim())
                .then((next) => {
                    if (requestId !== requestRef.current) return;
                    setOptions(next);
                    setActive(next.length ? 0 : -1);
                })
                .catch(() => {
                    if (requestId === requestRef.current) {
                        setOptions([]);
                        setFailed(true);
                    }
                })
                .finally(() => {
                    if (requestId === requestRef.current) setLoading(false);
                });
        }, DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [open, query, tooShort, loadOptions]);

    // Click outside closes the list
    useEffect(() => {
        if (!open) return;
        const onDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const select = useCallback((option: FilterOption) => {
        onChange(option);
        setOpen(false);
        setQuery('');
    }, [onChange]);

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) setOpen(true);
            setActive((index) => Math.min(options.length - 1, index + 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(0, index - 1));
        } else if (event.key === 'Enter') {
            if (open && active >= 0 && options[active]) {
                event.preventDefault();
                select(options[active]);
            }
        } else if (event.key === 'Escape') {
            setOpen(false);
        }
    };

    if (value) {
        return (
            <div className={styles.field}>
                <span className={styles.label}>{label}</span>
                <span className={styles.chip}>
                    <span className={styles.chipText} title={value.hint || value.label}>{value.label}</span>
                    <button
                        type="button"
                        className={styles.chipClear}
                        onClick={() => {
                            onChange(null);
                            window.setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        aria-label={`حذف فیلتر ${label}`}
                    >
                        <LuX size={13} />
                    </button>
                </span>
            </div>
        );
    }

    const showList = open && (!tooShort || minCharsHint);

    return (
        <div className={styles.field} ref={rootRef}>
            <label className={styles.label} htmlFor={`${baseId}-input`}>{label}</label>
            <div className={`${styles.control} ${open ? styles.controlOpen : ''}`}>
                <LuSearch size={14} className={styles.icon} aria-hidden />
                <input
                    ref={inputRef}
                    id={`${baseId}-input`}
                    role="combobox"
                    aria-expanded={Boolean(showList)}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={active >= 0 && options[active] ? `${baseId}-opt-${active}` : undefined}
                    autoComplete="off"
                    value={query}
                    placeholder={placeholder}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                />
                {loading
                    ? <LuLoaderCircle size={14} className={`${styles.icon} ${styles.spin}`} aria-label="در حال جستجو" />
                    : <LuChevronDown size={14} className={styles.icon} aria-hidden />}
            </div>

            {showList ? (
                <ul className={styles.list} id={listId} role="listbox" aria-label={label}>
                    {tooShort ? (
                        <li className={styles.state}>{minCharsHint}</li>
                    ) : loading && !options.length ? (
                        <li className={styles.state}>در حال جستجو…</li>
                    ) : failed ? (
                        <li className={styles.state}>جستجو انجام نشد؛ دوباره تلاش کنید.</li>
                    ) : !options.length ? (
                        <li className={styles.state}>{emptyText}</li>
                    ) : (
                        options.map((option, index) => (
                            <li
                                key={option.value}
                                id={`${baseId}-opt-${index}`}
                                role="option"
                                aria-selected={index === active}
                                className={`${styles.option} ${index === active ? styles.optionActive : ''}`}
                                onMouseEnter={() => setActive(index)}
                                onMouseDown={(event) => {
                                    // Keep focus in the input so the click is not lost to blur.
                                    event.preventDefault();
                                    select(option);
                                }}
                            >
                                <span className={styles.optionMain}>
                                    <span className={styles.optionLabel}><Highlight text={option.label} query={query} /></span>
                                    {option.hint ? (
                                        <span className={styles.optionHint}><Highlight text={option.hint} query={query} /></span>
                                    ) : null}
                                </span>
                                {option.meta ? <span className={styles.optionMeta}>{option.meta}</span> : null}
                            </li>
                        ))
                    )}
                </ul>
            ) : null}
        </div>
    );
}
