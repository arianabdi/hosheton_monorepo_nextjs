'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CostHoverBadge.module.scss';
import {
    mergeNodeCostHistory,
    sumNodeCostHistory,
    type NodeCostHistoryEntry,
} from '../../../lib/node-cost-history';
import { formatAppDate, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { useAppStore } from '@/app/zustand/store/useAppStore';

export type { NodeCostHistoryEntry as NodeCostEntry };

interface CostHoverBadgeProps {
    totalCost?: number;
    currentCost?: number;
    costHistory?: NodeCostHistoryEntry[];
    currency?: string;
    /** overlay: روی عکس/ویدیو — یک قرص تیره‌ی نیمه‌شفاف (بدون کادر دوم) */
    variant?: 'default' | 'overlay';
}

function formatUsd(amount: number): string {
    if (!Number.isFinite(amount)) return '$0';
    if (amount >= 1) return `$${amount.toFixed(2)}`;
    if (amount >= 0.01) return `$${amount.toFixed(4)}`;
    return `$${amount.toFixed(6)}`;
}

export function CostHoverBadge({ totalCost, currentCost, costHistory, currency = 'USD', variant = 'default' }: CostHoverBadgeProps) {
    const [hovered, setHovered] = useState(false);
    const { t } = useTranslation('projects');
    const lang = useAppStore((s) => s.lang);
    const history = mergeNodeCostHistory(
        costHistory,
        Number(currentCost) > 0 && (!Array.isArray(costHistory) || costHistory.length === 0)
            ? [{ amount: Number(currentCost), currency }]
            : undefined,
    );
    const total = typeof totalCost === 'number' && totalCost > 0
        ? totalCost
        : history.length
            ? sumNodeCostHistory(history)
            : Number(currentCost || 0);

    if (!(total > 0) && history.length === 0) return null;

    return (
        <div
            className={styles.badge}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => e.stopPropagation()}
        >
            <span className={`${styles.total} ${variant === 'overlay' ? styles.totalOverlay : ''}`} style={{ direction: 'ltr' }}>{formatUsd(total)}</span>
            {hovered && (
                <div className={styles.popup}>
                    <div className={styles.popupHeader}>
                        <span>{t('cost_history')}</span>
                        <strong style={{ direction: 'ltr' }}>{formatUsd(total)} {currency}</strong>
                    </div>
                    {history.length === 0 ? (
                        <p className={styles.empty}>{t('no_runs_yet')}</p>
                    ) : (
                        <ul className={styles.list}>
                            {[...history].reverse().map((entry, index) => (
                                <li key={`${entry.runId || 'run'}-${entry.at || index}`}>
                                    <div className={styles.rowMain}>
                                        <span>{t('run_n', { index: formatAppNumber(history.length - index, lang) })}</span>
                                        <strong style={{ direction: 'ltr' }}>{formatUsd(Number(entry.amount || 0))}</strong>
                                    </div>
                                    <div className={styles.rowMeta}>
                                        {entry.model && <span>{entry.model}</span>}
                                        {entry.at && (
                                            <span>{formatAppDate(entry.at, lang)}</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className={styles.popupFooter}>
                        {t('total_runs', { count: formatAppNumber(history.length, lang) })}
                    </div>
                </div>
            )}
        </div>
    );
}
