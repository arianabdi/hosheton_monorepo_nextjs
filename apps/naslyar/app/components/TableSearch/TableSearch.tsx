'use client';

import { useEffect, useRef, useState } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import styles from './TableSearch.module.scss';

interface TableSearchProps {
    /** مقدار اعمال‌شده (معمولاً از useUrlTableState) */
    value: string;
    onSearch: (value: string) => void;
    placeholder?: string;
    /** تأخیر اعمال خودکار بعد از تایپ (ms) — Enter فوراً اعمال می‌کند */
    debounceMs?: number;
    dir?: 'rtl' | 'ltr' | 'auto';
    className?: string;
}

/** جستجوی جدول: تایپ → بعد از مکث اعمال، Enter → فوری، ✕ → پاک */
export default function TableSearch({ value, onSearch, placeholder = 'جستجو…', debounceMs = 450, dir = 'auto', className }: TableSearchProps) {
    const [draft, setDraft] = useState(value);
    const [synced, setSynced] = useState(value);
    if (value !== synced) {
        // مقدار بیرونی عوض شد (پاک‌کردن فیلترها، بازگشت مرورگر)
        setSynced(value);
        setDraft(value);
    }

    const onSearchRef = useRef(onSearch);
    useEffect(() => {
        onSearchRef.current = onSearch;
    }, [onSearch]);

    useEffect(() => {
        if (draft.trim() === value.trim()) return;
        const timer = setTimeout(() => onSearchRef.current(draft), debounceMs);
        return () => clearTimeout(timer);
    }, [draft, value, debounceMs]);

    return (
        <div className={`${styles.search} ${className || ''}`}>
            <LuSearch className={styles.icon} aria-hidden />
            <input
                type="search"
                value={draft}
                dir={dir}
                placeholder={placeholder}
                aria-label={placeholder}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onSearch(draft);
                }}
            />
            {draft ? (
                <button
                    type="button"
                    className={styles.clear}
                    aria-label="پاک کردن جستجو"
                    onClick={() => {
                        setDraft('');
                        onSearch('');
                    }}
                >
                    <LuX />
                </button>
            ) : null}
        </div>
    );
}
