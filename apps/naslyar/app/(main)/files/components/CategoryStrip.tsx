'use client';

import { formatFileSize } from '@my-workspace/utils';
import type { FileCategory } from '../files.types';
import styles from '../Files.module.scss';

export interface CategoryStripItem {
    id: FileCategory;
    label: string;
    color: string;
    count: number;
    totalSize: number;
}

export default function CategoryStrip({
    items,
    active,
    onSelect,
}: {
    items: CategoryStripItem[];
    active: FileCategory;
    onSelect: (id: FileCategory) => void;
}) {
    const totalSize = items.filter((item) => item.id !== 'all').reduce((sum, item) => sum + item.totalSize, 0);

    return (
        <section className={styles.categoryStrip}>
            <div className={styles.categoryStripHead}>
                <h3>دسته بندی ها</h3>
            </div>
            <div className={styles.storageBar}>
                {items
                    .filter((item) => item.id !== 'all' && item.totalSize > 0)
                    .map((item) => (
                        <div
                            key={item.id}
                            className={styles.segment}
                            style={{
                                width: `${Math.max(3, (item.totalSize / (totalSize || 1)) * 100)}%`,
                                background: item.color,
                            }}
                        />
                    ))}
            </div>
            <div className={styles.categoryLegend}>
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`${styles.legendItem} ${active === item.id ? styles.active : ''}`}
                        onClick={() => onSelect(item.id)}
                    >
                        <span className={styles.legendMark} style={{ background: item.color }} />
                        <span className={styles.legendLabel}>{item.label}</span>
                        <span className={styles.legendSize}>{formatFileSize(item.totalSize)}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}
