'use client';

import { useMemo, useState } from 'react';
import { toFarsiNumber } from '@my-workspace/utils';
import styles from '../Database.module.scss';

/** انتخاب چندتایی مجموعه‌ها با جستجو */
export default function CollectionPicker({
    options,
    value,
    onChange,
    counts,
    emptyText = 'هنوز چیزی انتخاب نشده',
}: {
    options: string[];
    value: string[];
    onChange: (next: string[]) => void;
    /** تعداد سند هر مجموعه (اختیاری، از فایل بک‌آپ) */
    counts?: Record<string, number>;
    emptyText?: string;
}) {
    const [q, setQ] = useState('');
    const shown = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options;
    }, [options, q]);
    const selected = new Set(value);

    const toggle = (name: string) => {
        const next = new Set(selected);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        onChange(options.filter((o) => next.has(o)));
    };

    return (
        <div>
            <div className={styles.pickerHead}>
                <input className={styles.pickerSearch} value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی مجموعه…" aria-label="جستجوی مجموعه" />
                <span className={styles.hint}>
                    {value.length ? `${toFarsiNumber(value.length)} از ${toFarsiNumber(options.length)} انتخاب شده` : emptyText}
                </span>
                <button type="button" className={styles.linkBtn} onClick={() => onChange(options.slice())} disabled={value.length === options.length}>
                    انتخاب همه
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => onChange([])} disabled={!value.length}>
                    هیچ‌کدام
                </button>
            </div>
            <div className={styles.chips}>
                {shown.map((name) => (
                    <button
                        key={name}
                        type="button"
                        className={`${styles.chip} ${selected.has(name) ? styles.chipOn : ''}`}
                        aria-pressed={selected.has(name)}
                        onClick={() => toggle(name)}
                    >
                        {name}
                        {counts && counts[name] !== undefined && <small>{toFarsiNumber(counts[name].toLocaleString('en-US'))}</small>}
                    </button>
                ))}
                {!shown.length && <span className={styles.hint}>مجموعه‌ای با این نام نیست.</span>}
            </div>
        </div>
    );
}
