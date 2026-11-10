'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LuBan, LuRefreshCw } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { isoToJalaliString } from '@/app/(main)/accounting/jalali.client';
import {
    CAMPAIGN_NODE_TYPE_LABELS,
    CAMPAIGN_RUN_STATUS_LABELS,
    type CampaignFlow,
    type CampaignRun,
    type CampaignRunStatusType,
    type CampaignRunsSummaryItem,
} from '../campaigns.types';
import { cancelRun, listFlows, listRuns, getRunsSummary } from '../campaigns-api';
import CampaignSectionNav from '../components/CampaignSectionNav';
import RunsGuide from '../components/RunsGuide';
import parentStyles from '../../marketing/Marketing.module.scss';
import styles from '../Campaigns.module.scss';

const STATUS_TABS: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'همه' },
    ...(Object.keys(CAMPAIGN_RUN_STATUS_LABELS) as CampaignRunStatusType[]).map((s) => ({
        id: s,
        label: CAMPAIGN_RUN_STATUS_LABELS[s],
    })),
];

const RUN_STATUS_BADGE: Record<CampaignRunStatusType, string> = {
    running: styles.running,
    waiting: styles.waiting,
    completed: styles.completed,
    failed: styles.failed,
    cancelled: styles.cancelled,
};

export default function CampaignRunsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const searchParams = useSearchParams();

    const [runs, setRuns] = useState<CampaignRun[]>([]);
    const [flows, setFlows] = useState<CampaignFlow[]>([]);
    const [summary, setSummary] = useState<CampaignRunsSummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [flowFilter, setFlowFilter] = useState(searchParams.get('flowId') || '');
    const [expandedRun, setExpandedRun] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [r, f, s] = await Promise.all([
                listRuns(baseUrl, token, {
                    flowId: flowFilter || undefined,
                    status: tab === 'all' ? undefined : tab,
                }),
                listFlows(baseUrl, token),
                getRunsSummary(baseUrl, token),
            ]);
            setRuns(r);
            setFlows(f);
            setSummary(s);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, tab, flowFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    const flowName = (id: string) => flows.find((f) => f._id === id)?.name || '—';

    const handleCancel = async (run: CampaignRun) => {
        if (!confirm('این اجرا لغو شود؟')) return;
        try {
            await cancelRun(baseUrl, token!, run._id);
            SuccessToaster({ message: 'اجرا لغو شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    if (loading && runs.length === 0) return <LoadingState />;

    const totals = summary.reduce(
        (acc, s) => ({
            total: acc.total + s.total,
            completed: acc.completed + s.completed,
            waiting: acc.waiting + s.waiting,
        }),
        { total: 0, completed: 0, waiting: 0 },
    );

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>اجراهای کمپین</h1>
                            <p className={parentStyles.subtitle}>
                                مسیر هر کاربر در فلو: تاریخچه نودها، وضعیت فعلی و خطاها
                            </p>
                        </div>
                        <div className={styles.toolbarActions}>
                            <select
                                className={styles.filterSelect}
                                value={flowFilter}
                                onChange={(e) => setFlowFilter(e.target.value)}
                            >
                                <option value="">همه کمپین‌ها</option>
                                {flows.map((f) => (
                                    <option key={f._id} value={f._id}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>
                            <button type="button" className={parentStyles.secondaryBtn} onClick={() => void load()}>
                                <LuRefreshCw /> به‌روزرسانی
                            </button>
                        </div>
                    </header>

                    <CampaignSectionNav />

                    <RunsGuide />

                    <div className={parentStyles.statsBar}>
                        <div className={parentStyles.statCard}>
                            <span>کل اجراها</span>
                            <div className={parentStyles.statValue}>{totals.total.toLocaleString('fa-IR')}</div>
                        </div>
                        <div className={parentStyles.statCard}>
                            <span>تکمیل شده</span>
                            <div className={parentStyles.statValue}>{totals.completed.toLocaleString('fa-IR')}</div>
                        </div>
                        <div className={parentStyles.statCard}>
                            <span>در انتظار تاخیر</span>
                            <div className={parentStyles.statValue}>{totals.waiting.toLocaleString('fa-IR')}</div>
                        </div>
                    </div>

                    {/* تب وضعیت */}
                    <div className={parentStyles.statsBar} style={{ marginBottom: '1rem' }}>
                        {STATUS_TABS.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                className={parentStyles.statCard}
                                style={{
                                    cursor: 'pointer',
                                    borderColor: tab === s.id ? 'var(--brand-color)' : undefined,
                                    background: tab === s.id ? 'color-mix(in srgb, var(--brand-color) 8%, transparent)' : undefined,
                                }}
                                onClick={() => setTab(s.id)}
                            >
                                <span>{s.label}</span>
                            </button>
                        ))}
                    </div>

                    {runs.length === 0 ? (
                        <div className={styles.emptyState}>
                            اجرایی ثبت نشده — کمپین را زنده کنید یا از{' '}
                            <Link href="/campaigns">فهرست کمپین‌ها</Link> یک فلو بسازید.
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>کمپین</th>
                                        <th>کاربر</th>
                                        <th>وضعیت</th>
                                        <th>نود فعلی</th>
                                        <th>گام‌ها</th>
                                        <th>شروع</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {runs.map((run) => (
                                        <tr key={run._id}>
                                            <td data-label="کمپین" style={{ fontWeight: 600 }}>{run.flowName || flowName(run.flowId)}</td>
                                            <td data-label="کاربر">
                                                {run.userName || '—'}
                                                <div style={{ fontSize: '0.7rem', opacity: 0.6, direction: 'ltr' }}>
                                                    {run.phone || run.userId}
                                                </div>
                                            </td>
                                            <td data-label="وضعیت">
                                                <span className={`${styles.statusBadge} ${RUN_STATUS_BADGE[run.status]}`}>
                                                    {CAMPAIGN_RUN_STATUS_LABELS[run.status]}
                                                </span>
                                                {run.error && (
                                                    <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>{run.error}</div>
                                                )}
                                            </td>
                                            <td data-label="نود فعلی" className={styles.muted}>
                                                {run.currentNodeId
                                                    ? (run.history?.length || 0) + 1
                                                    : '—'}
                                            </td>
                                            <td data-label="گام‌ها">{run.history?.length || 0}</td>
                                            <td data-label="شروع" className={styles.muted}>{isoToJalaliString(run.createdAt)}</td>
                                            <td data-label="عملیات">
                                                <div className={styles.inlineActions}>
                                                    <button
                                                        type="button"
                                                        className={styles.smallBtn}
                                                        onClick={() =>
                                                            setExpandedRun(expandedRun === run._id ? null : run._id)
                                                        }
                                                    >
                                                        تاریخچه
                                                    </button>
                                                    {(run.status === 'running' || run.status === 'waiting') && (
                                                        <button
                                                            type="button"
                                                            className={styles.smallBtn}
                                                            onClick={() => handleCancel(run)}
                                                        >
                                                            <LuBan /> لغو
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* تاریخچه اجرای انتخاب‌شده */}
                    {expandedRun && (
                        <div className={styles.historyBox}>
                            {(() => {
                                const run = runs.find((r) => r._id === expandedRun);
                                if (!run) return null;
                                const flow = flows.find((f) => f._id === run.flowId);
                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <strong>
                                                تاریخچه «{run.flowName || flowName(run.flowId)}» —{' '}
                                                {run.userName || run.userId}
                                            </strong>
                                            <Link href={`/campaigns/${run.flowId}/edit`} style={{ fontSize: '0.75rem' }}>
                                                مشاهده فلو
                                            </Link>
                                        </div>
                                        {(run.history || []).length === 0 ? (
                                            <div style={{ opacity: 0.6 }}>گامی ثبت نشده</div>
                                        ) : (
                                            (run.history || []).map((h, i) => {
                                                const node = flow?.nodes?.find((n) => n.id === h.nodeId);
                                                return (
                                                    <div key={`${h.nodeId}-${i}`} className={styles.historyItem}>
                                                        <span className={styles.historyAt}>{isoToJalaliString(h.at)}</span>
                                                        <strong>{CAMPAIGN_NODE_TYPE_LABELS[h.nodeType]}</strong>
                                                        <span style={{ flex: 1 }}>
                                                            {h.detail} {node?.isEnabled === false ? '(غیرفعال)' : ''}
                                                        </span>
                                                        <span className={styles.muted}>{h.status}</span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
