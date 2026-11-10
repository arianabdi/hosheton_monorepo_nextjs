'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuBox, LuImage, LuRefreshCw, LuType, LuVideo } from 'react-icons/lu';
import axios from 'axios';
import styles from './apiUsage.module.scss';
import HomeStatsPanel from './components/HomeStatsPanel';
import { UsageHistoryPagination } from './components/UsageHistoryPagination';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useWalletStore } from '@/app/zustand/store/walletStore';
import { useWalletRealtime } from '@/app/hooks/useWalletRealtime';
import { notifyError } from '@/app/lib/errors';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import type { UsageHistoryTask, UsageSummaryResponse } from '@/app/(developers)/projects/types/media-api';
import { usePageLoading } from '@/app/components/PageTransition';
import { useTranslation } from 'react-i18next';
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';

type UsageTab = 'usage' | 'stats';

function formatUsd(amount?: number) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) return '$0.0000';
    return `$${n.toFixed(4)}`;
}

function formatModelName(model?: string) {
    const value = String(model || '').trim();
    if (!value || value === 'unknown') return '—';
    return value;
}

export default function UsagePage() {
    const { t, i18n } = useTranslation('usage');
    const { t: tc } = useTranslation('common');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = useAuthStore();

    const tabParam = searchParams.get('tab');
    const activeTab: UsageTab =
        tabParam === 'stats' || tabParam === 'overview' || tabParam === 'home' ? 'stats' : 'usage';

    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    usePageLoading(loading);
    const [summary, setSummary] = useState<UsageSummaryResponse | null>(null);
    const [history, setHistory] = useState<UsageHistoryTask[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPerPage, setHistoryPerPage] = useState(10);
    const [modelsPage, setModelsPage] = useState(1);
    const [modelsPerPage, setModelsPerPage] = useState(10);
    const [walletBalance, setWalletBalance] = useState(0);

    // Live balance from the shared studio socket (`wallet:updated`)
    useWalletRealtime();
    const liveBalance = useWalletStore((s) => s.balance);
    useEffect(() => {
        if (liveBalance != null) setWalletBalance(liveBalance);
    }, [liveBalance]);

    const setTab = (tab: UsageTab) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set('tab', tab);
        router.replace(`/usage?${next.toString()}`, { scroll: false });
    };

    const loadSummary = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const headers = { authorization: `Bearer ${token}` };
            const [summaryRes, balanceRes] = await Promise.all([
                mediaApi.getUsageSummary(),
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/wallet/balance`, { headers }),
            ]);

            setSummary(summaryRes);

            if (balanceRes.data?.statusCode === 200) {
                setWalletBalance(balanceRes.data.data.balance ?? 0);
                useWalletStore.getState().setFromApi(balanceRes.data.data);
            }
        } catch (error) {
            notifyError(error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const loadHistory = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        setHistoryLoading(true);
        try {
            const historyRes = await mediaApi.getUsageHistory({ page, limit });
            setHistory(historyRes.tasks ?? []);
            setHistoryTotal(historyRes.total ?? 0);
            setHistoryPage(historyRes.page ?? page);
        } catch (error) {
            notifyError(error);
        } finally {
            setHistoryLoading(false);
        }
    }, [token]);

    const load = useCallback(async () => {
        await Promise.all([
            loadSummary(),
            loadHistory(historyPage, historyPerPage),
        ]);
    }, [loadSummary, loadHistory, historyPage, historyPerPage]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        loadHistory(historyPage, historyPerPage);
    }, [loadHistory, historyPage, historyPerPage]);

    const handleHistoryPageChange = (page: number) => {
        setHistoryPage(page);
    };

    const handleHistoryPerPageChange = (limit: number) => {
        setHistoryPerPage(limit);
        setHistoryPage(1);
    };

    const handleModelsPageChange = (page: number) => {
        setModelsPage(page);
    };

    const handleModelsPerPageChange = (limit: number) => {
        setModelsPerPage(limit);
        setModelsPage(1);
    };

    const models = summary?.models || [];
    const modelsTotal = models.length;
    const modelsPageCount = Math.max(1, Math.ceil(modelsTotal / Math.max(modelsPerPage, 1)));
    const safeModelsPage = Math.min(modelsPage, modelsPageCount);
    const pagedModels = models.slice((safeModelsPage - 1) * modelsPerPage, safeModelsPage * modelsPerPage);

    const formatNodeType = (nodeType?: string) => {
        if (!nodeType) return '—';
        if (nodeType === 'textToImage' || nodeType === 'textToVideo' || nodeType === 'aiAvatar' || nodeType === 'musicSfx') {
            return t(nodeType);
        }
        return nodeType;
    };

    if (loading) {
        return (
            <div className={styles.loadingWrapper}>
                <p>{t('loading')}</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.mainTitle}>{t('title')}</h1>
                        <p className={styles.subtitle}>{t('subtitle')}</p>
                    </div>
                    <button type="button" className={styles.refreshBtn} onClick={load}>
                        <LuRefreshCw size={16} />
                        {tc('refresh')}
                    </button>
                </div>
            </header>

            <nav className={styles.tabs} aria-label={t('tabs')}>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'usage' ? styles.tabActive : ''}`}
                    onClick={() => setTab('usage')}
                >
                    {t('tab_usage')}
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'stats' ? styles.tabActive : ''}`}
                    onClick={() => setTab('stats')}
                >
                    {t('tab_stats')}
                </button>
            </nav>

            {activeTab === 'usage' && (
                <>
                    <div className={styles.topGrid}>
                        <div className={`${styles.card} ${styles.walletCard}`}>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardLabel}>{t('wallet_balance')}</span>
                                <span className={styles.badgeActive}>{t('payg')}</span>
                            </div>
                            <div className={styles.balanceValue}>{formatUsd(walletBalance)}</div>
                            <p className={styles.cardSub}>{t('wallet_sub')}</p>
                            <button type="button" className={styles.primaryBtn} onClick={() => router.push('/wallet')}>
                                {t('charge_wallet')}
                            </button>
                        </div>

                        <div className={styles.card}>
                            <span className={styles.cardLabel}>{t('total_usage_cost')}</span>
                            <div className={styles.statValue} dir="ltr" lang="en">{formatUsd(summary?.totalCost)}</div>
                            <span className={styles.cardSub}>
                                {t('billed', { count: summary?.billedCount ?? 0 })}
                                {summary?.runCount ? ` · ${t('runs', { count: summary.runCount })}` : ''}
                            </span>
                        </div>

                        <div className={styles.card}>
                            <span className={styles.cardLabel}>{t('image_est')}</span>
                            <div className={styles.statValue}>
                                {summary?.imageGeneration?.estimatedCount ?? 0}
                            </div>
                            <span className={styles.cardSub}>
                                {t('cost_colon', { amount: formatUsd(summary?.imageGeneration?.totalCost) })}
                            </span>
                        </div>
                    </div>

                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('by_model')}</h2>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>{t('col_model')}</th>
                                        <th>{t('col_type')}</th>
                                        <th>{t('col_runs')}</th>
                                        <th>{t('col_success_fail')}</th>
                                        <th>{t('col_cost')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modelsTotal === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={styles.emptyCell}>{t('no_usage')}</td>
                                        </tr>
                                    ) : (
                                        pagedModels.map((model, index) => (
                                            <tr key={`${model.model}-${model.class}-${model.nodeType ?? index}`}>
                                                <td className={styles.modelName}>{formatModelName(model.model)}</td>
                                                <td>
                                                    <span className={styles.typeBadge}>
                                                        {model.class === 'video' ? <LuVideo size={14} /> : model.class === 'text' ? <LuType size={14} /> : model.class === '3d' ? <LuBox size={14} /> : <LuImage size={14} />}
                                                        {model.class}
                                                    </span>
                                                </td>
                                                <td dir="ltr" lang="en">{model.count}</td>
                                                <td dir="ltr" lang="en">
                                                    {(model.succeeded ?? '—')} / {(model.failed ?? '—')}
                                                </td>
                                                <td className={styles.boldText} dir="ltr" lang="en">{formatUsd(model.totalCost)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <UsageHistoryPagination
                            itemPerPage={modelsPerPage}
                            currentPage={safeModelsPage}
                            totalItems={modelsTotal}
                            setRowsPerPage={handleModelsPerPageChange}
                            paginate={handleModelsPageChange}
                        />
                    </div>

                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('history_title')}</h2>
                        <p className={styles.sectionHint}>{t('history_hint')}</p>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>{t('col_type')}</th>
                                        <th>{t('col_model')}</th>
                                        <th>{t('col_time')}</th>
                                        <th>{t('col_cost')}</th>
                                        <th>{t('col_project')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLoading && history.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={styles.emptyCell}>{t('loading_history')}</td>
                                        </tr>
                                    ) : history.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={styles.emptyCell}>{t('no_charges')}</td>
                                        </tr>
                                    ) : (
                                        history.map((task) => (
                                            <tr key={task._id}>
                                                <td>{formatNodeType(task.nodeType)}</td>
                                                <td className={styles.modelName}>{formatModelName(task.model || task.cost?.breakdown?.model)}</td>
                                                <td>{formatAppDate(task.createdAt, i18n.language)}</td>
                                                <td className={styles.boldText} dir="ltr" lang="en">{formatUsd(task.cost?.amount)}</td>
                                                <td>
                                                    {task.projectTitle ? (
                                                        <span title={task.projectId}>{task.projectTitle}</span>
                                                    ) : (
                                                        <span className={styles.codeText}>{task.projectId || '—'}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <UsageHistoryPagination
                            itemPerPage={historyPerPage}
                            currentPage={historyPage}
                            totalItems={historyTotal}
                            setRowsPerPage={handleHistoryPerPageChange}
                            paginate={handleHistoryPageChange}
                        />
                    </div>
                </>
            )}

            {activeTab === 'stats' && <HomeStatsPanel embedded />}
        </div>
    );
}
