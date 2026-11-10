'use client';

import type { ReactNode } from 'react';
import { LuArrowDown, LuArrowUp, LuArrowUpDown } from 'react-icons/lu';
import styles from './SortHeader.module.scss';

interface SortHeaderProps {
    label: ReactNode;
    field: string;
    sort: string;
    dir: 'asc' | 'desc';
    onSort: (field: string) => void;
    /** راهنمای کوتاه ستون (title) — این ستون چه چیزی را می‌شمارد */
    hint?: string;
    className?: string;
}

/** سرستون قابل مرتب‌سازی با aria-sort — همراه useUrlTableState (app/hooks) */
export default function SortHeader({ label, field, sort, dir, onSort, hint, className }: SortHeaderProps) {
    const active = sort === field;
    const Icon = !active ? LuArrowUpDown : dir === 'asc' ? LuArrowUp : LuArrowDown;
    return (
        <th className={className} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} title={hint}>
            <button type="button" className={`${styles.sortBtn} ${active ? styles.sortActive : ''}`} onClick={() => onSort(field)}>
                {label}
                <Icon size={12} aria-hidden />
            </button>
        </th>
    );
}
