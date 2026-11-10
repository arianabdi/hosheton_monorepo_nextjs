'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheck } from 'react-icons/lu';
import styles from './TemplateGallery.module.scss';

export type FilterMultiOption = {
    value: string;
    label: string;
};

export function FilterMultiSelect({
    values,
    options,
    onChange,
    placeholder,
    searchable = false,
    emptyLabel,
}: {
    values: string[];
    options: FilterMultiOption[];
    onChange: (next: string[]) => void;
    placeholder: string;
    searchable?: boolean;
    emptyLabel?: string;
}) {
    const { t: tc } = useTranslation('common');
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const fieldRef = useRef<HTMLDivElement>(null);
    const selected = useMemo(() => new Set(values), [values]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!fieldRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const visibleOptions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((item) => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q));
    }, [options, query]);

    const toggle = (value: string) => {
        if (selected.has(value)) {
            onChange(values.filter((item) => item !== value));
            return;
        }
        onChange([...values, value]);
        setQuery('');
    };

    const labelByValue = useMemo(() => {
        const map = new Map(options.map((item) => [item.value, item.label]));
        return map;
    }, [options]);

    return (
        <div>
            <div className={styles.tagField} ref={fieldRef}>
                {searchable ? (
                    <input
                        className={styles.filterInput}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            const first = visibleOptions[0];
                            if (first) toggle(first.value);
                        }}
                        placeholder={placeholder}
                    />
                ) : (
                    <button
                        type="button"
                        className={`${styles.filterInput} ${styles.multiSelectTrigger}`}
                        onClick={() => setOpen((current) => !current)}
                    >
                        {values.length ? values.map((value) => labelByValue.get(value) || value).join('، ') : placeholder}
                    </button>
                )}
                {open ? (
                    <div className={styles.tagMenu} role="listbox" aria-multiselectable>
                        {visibleOptions.length === 0 ? (
                            <div className={styles.tagMenuEmpty}>{emptyLabel || placeholder}</div>
                        ) : (
                            visibleOptions.map((item) => {
                                const active = selected.has(item.value);
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        className={`${styles.tagOption} ${active ? styles.tagOptionSelected : ''}`}
                                        onClick={() => toggle(item.value)}
                                    >
                                        <span>{item.label}</span>
                                        {active ? <LuCheck size={14} /> : null}
                                    </button>
                                );
                            })
                        )}
                    </div>
                ) : null}
            </div>
            {values.length > 0 ? (
                <div className={styles.tagChipRow}>
                    {values.map((value) => (
                        <span key={value} className={styles.filterChip}>
                            {labelByValue.get(value) || value}
                            <button type="button" onClick={() => toggle(value)} aria-label={tc('delete')}>×</button>
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
