'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LuBox, LuGauge, LuType, LuVideo, LuImage, LuRefreshCw } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';

import styles from './usagePopup.module.scss';
import {mediaApi} from "@/app/(developers)/projects/lib/media-api";
import {UsageSummaryResponse, UsageHistoryTask} from "@/app/(developers)/projects/types/media-api";
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';

function formatCost(amount?: number) {
    if (!amount) return '$0.0000';
    return `$${amount.toFixed(4)}`;
}

type UsagePopupProps = {
    placement?: 'bottom' | 'top';
    trigger?: ReactNode;
    triggerClassName?: string;
};

export default function UsagePopup({ placement = 'bottom', trigger, triggerClassName }: UsagePopupProps) {
    const { t, i18n } = useTranslation('usage');
    const { t: tc } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);
    const [summary, setSummary] = useState<UsageSummaryResponse | null>(null);
    const [history, setHistory] = useState<UsageHistoryTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    const fetchUsage = async () => {
        setLoading(true);
        setError(null);
        try {
            const [summaryRes, historyRes] = await Promise.all([
                mediaApi.getUsageSummary(),
                mediaApi.getUsageHistory({ limit: 10, page: 1 }),
            ]);
            setSummary(summaryRes);
            setHistory(historyRes.tasks ?? []);
        } catch {
            setError(t('load_error'));
        } finally {
            setLoading(false);
        }
    };

    const toggleOpen = () => {
        setIsOpen((prev) => {
            const next = !prev;
            if (next) fetchUsage();
            return next;
        });
    };

    useLayoutEffect(() => {
        const media = window.matchMedia('(max-width: 768px)');
        const sync = () => setIsMobileViewport(media.matches);
        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
                return;
            }
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const portalHeaderMenu = isOpen && isMobileViewport && placement === 'bottom';
    const dropdown = isOpen ? (
                <div
                    ref={dropdownRef}
                    className={`${styles.dropdown} ${placement === 'top' ? styles.dropdownTop : ''} ${portalHeaderMenu ? styles.dropdownPortaled : ''}`}
                >
                    <div className={styles.header}>
                        <span>{t('title')}</span>
                        <button className={styles.refreshBtn} onClick={fetchUsage} title={tc('refresh')}>
                            <LuRefreshCw className={loading ? styles.spin : ''} />
                        </button>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    {loading && !summary ? (
                        <div className={styles.empty}>{tc('loading')}</div>
                    ) : summary ? (
                        <>
                            <div className={styles.totalCard}>
                                <span className={styles.totalLabel}>{t('total_cost')}</span>
                                <span className={styles.totalValue}>{formatCost(summary.totalCost)}</span>
                                <span className={styles.totalMeta}>{t('runs', { count: summary.runCount })}</span>
                            </div>

                            <div className={styles.divider} />

                            <div className={styles.modelsList}>
                                {summary.models.length === 0 ? (
                                    <div className={styles.empty}>{t('no_usage')}</div>
                                ) : (
                                    summary.models.map((m, index) => (
                                        <div key={`usage-model-${index}-${m.model}-${m.class}-${m.nodeType ?? 'none'}`} className={styles.modelRow}>
                                            <span className={styles.modelIcon}>
                                                {m.class === 'video' ? <LuVideo /> : m.class === 'text' ? <LuType /> : m.class === '3d' ? <LuBox /> : <LuImage />}
                                            </span>
                                            <div className={styles.modelInfo}>
                                                <span className={styles.modelName}>{m.model}</span>
                                                <span className={styles.modelMeta}>
                                                    {t('runs', { count: m.count })}
                                                    {typeof m.succeeded === 'number' ? ` · ${t('succeeded', { count: m.succeeded })}` : ''}
                                                    {typeof m.failed === 'number' && m.failed > 0 ? ` · ${t('failed', { count: m.failed })}` : ''}
                                                </span>
                                            </div>
                                            <span className={styles.modelCost}>{formatCost(m.totalCost)}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {history.length > 0 && (
                                <>
                                    <div className={styles.divider} />
                                    <div className={styles.historyLabel}>{t('recent')}</div>
                                    <div className={styles.historyList}>
                                        {history.map((task, index) => (
                                            <div key={task._id ?? `usage-history-${index}`} className={styles.historyRow}>
                                                <span className={styles.historyModel}>{task.model && task.model !== 'unknown' ? task.model : (task.cost?.breakdown?.model || '—')}</span>
                                                <span className={styles.historyTime}>{formatAppDate(task.createdAt, i18n.language)}</span>
                                                <span className={styles.historyCost}>{formatCost(task.cost?.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className={styles.empty}>{t('unavailable')}</div>
                    )}
                </div>
    ) : null;

    const backdrop = (
        <button
            type="button"
            className={styles.menuBackdrop}
            aria-label={t('title')}
            onClick={() => setIsOpen(false)}
        />
    );

    return (
        <div
            className={`${styles.usageContainer} ${placement === 'top' ? styles.usageContainerFlush : ''}`}
            ref={containerRef}
        >
            {isOpen && typeof document !== 'undefined'
                ? createPortal(
                    portalHeaderMenu ? (
                        <>
                            {backdrop}
                            {dropdown}
                        </>
                    ) : backdrop,
                    document.body,
                )
                : null}

            <button
                type="button"
                className={triggerClassName || (trigger ? styles.triggerFlush : styles.triggerIcon)}
                onClick={toggleOpen}
                aria-label={t('title')}
            >
                {trigger ?? <LuGauge size={24} color="var(--icon-color)" />}
            </button>

            {!portalHeaderMenu ? dropdown : null}
        </div>
    );
}
