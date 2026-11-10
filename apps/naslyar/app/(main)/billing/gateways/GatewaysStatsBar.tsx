'use client';

import React from 'react';
import styles from './GatewaysStatsBar.module.scss';
import { toFarsiNumber } from '@my-workspace/utils';

export interface GatewaysStats {
    total: number;
    active: number;
    checkout: number;
    card2card: number;
}

interface GatewaysStatsBarProps {
    stats: GatewaysStats;
    /** وقتی آمار فعال/checkout فقط از صفحه جاری است */
    pageScoped?: boolean;
}

const ITEMS: { key: keyof GatewaysStats; label: string; pageHint?: boolean }[] = [
    { key: 'total', label: 'کل درگاه‌ها' },
    { key: 'active', label: 'فعال', pageHint: true },
    { key: 'checkout', label: 'checkout', pageHint: true },
    { key: 'card2card', label: 'کارت‌به‌کارت', pageHint: true },
];

export default function GatewaysStatsBar({ stats, pageScoped = true }: GatewaysStatsBarProps) {
    return (
        <div className={styles.bar} role="group" aria-label="آمار درگاه‌های پرداخت">
            {ITEMS.map((item, index) => (
                <React.Fragment key={item.key}>
                    {index > 0 && <span className={styles.divider} aria-hidden />}
                    <div className={styles.item}>
                        <span className={styles.value}>{toFarsiNumber(stats[item.key])}</span>
                        <span className={styles.label}>
                            {item.label}
                            {pageScoped && item.pageHint && (
                                <span className={styles.hint}> · صفحه</span>
                            )}
                        </span>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}
