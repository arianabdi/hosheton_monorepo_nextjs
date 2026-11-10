'use client';

import { useMemo, useState } from 'react';
import { toFarsiNumber } from '@my-workspace/utils';
import type { CollectionSummary } from '../lib/database-api';
import { formatSize } from '../lib/format';
import styles from './Explorer.module.scss';

type SortBy = 'name' | 'count' | 'size';

export default function CollectionList({
    collections,
    active,
    onSelect,
    database,
    stats,
    open,
    onClose,
}: {
    collections: CollectionSummary[];
    active: string;
    onSelect: (name: string) => void;
    database: string;
    stats: { dataSize: number; storageSize: number; indexSize: number; objects: number } | null;
    open: boolean;
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('name');

    const list = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const rows = needle ? collections.filter((c) => c.name.toLowerCase().includes(needle)) : collections.slice();
        if (sortBy === 'count') rows.sort((a, b) => (b.count || 0) - (a.count || 0));
        if (sortBy === 'size') rows.sort((a, b) => (b.size || 0) - (a.size || 0));
        return rows;
    }, [collections, q, sortBy]);
    const maxSize = Math.max(1, ...collections.map((c) => c.size || 0));

    return (
        <>
            {open && <div className={styles.sideBackdrop} onClick={onClose} aria-hidden />}
            <aside className={`${styles.side} ${open ? styles.sideOpen : ''}`} aria-label="مجموعه‌ها">
                <div className={styles.sideHead}>
                    <div className={styles.sideTitle}>
                        مجموعه‌ها <span>{toFarsiNumber(collections.length)}</span>
                    </div>
                    <input className={`${styles.input} ${styles.ltr}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام…" aria-label="جستجوی مجموعه" />
                    <div className={styles.sortRow}>
                        مرتب‌سازی:
                        {(['name', 'count', 'size'] as SortBy[]).map((s) => (
                            <button key={s} type="button" className={sortBy === s ? styles.sortActive : ''} onClick={() => setSortBy(s)}>
                                {s === 'name' ? 'نام' : s === 'count' ? 'تعداد' : 'حجم'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={styles.colList}>
                    {list.map((c) => (
                        <button
                            key={c.name}
                            type="button"
                            className={`${styles.colItem} ${c.name === active ? styles.colActive : ''}`}
                            onClick={() => {
                                onSelect(c.name);
                                onClose();
                            }}
                            title={`${c.name} — ${c.count ?? '?'} docs, ${formatSize(c.size || 0)}, ${c.indexes ?? '?'} indexes`}
                        >
                            <span className={styles.colName} dir="ltr">
                                {c.name}
                            </span>
                            <span className={styles.colMeta}>{c.type === 'view' ? 'view' : toFarsiNumber((c.count ?? 0).toLocaleString('en-US'))}</span>
                            {sortBy === 'size' && <span className={styles.colBar} style={{ width: `${Math.max(2, ((c.size || 0) / maxSize) * 100)}%` }} />}
                        </button>
                    ))}
                    {!list.length && <p className={styles.sideFoot}>مجموعه‌ای با این نام نیست.</p>}
                </div>
                <div className={styles.sideFoot}>
                    <span dir="ltr">{database}</span>
                    {stats && (
                        <>
                            {' '}· {toFarsiNumber(stats.objects.toLocaleString('en-US'))} سند · داده {formatSize(stats.dataSize)} · ایندکس {formatSize(stats.indexSize)}
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}
