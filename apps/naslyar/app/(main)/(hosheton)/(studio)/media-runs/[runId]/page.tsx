'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LuArrowRight, LuRefreshCw } from 'react-icons/lu';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import {
    mediaRunsAdminApi,
    type MediaRunCostEntry,
    type MediaRunDetailResponse,
} from '../../lib/media-runs-admin-api';
import styles from '../../projects/nodes/Providers.module.scss';

function formatUsd(n: number | undefined) {
    return `$${Number(n || 0).toFixed(6)}`;
}

function formatDate(value?: string) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('fa-IR');
    } catch {
        return value;
    }
}

export default function MediaRunDetailPage() {
    const params = useParams();
    const runId = String(params?.runId || '');
    const [data, setData] = useState<MediaRunDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!runId) return;
        try {
            setLoading(true);
            const res = await mediaRunsAdminApi.getById(runId);
            setData(res);
        } catch (error) {
            setData(null);
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [runId]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) {
        return (
            <div className={`${styles.container} ${styles.rtl}`}>
                <LoadingState />
            </div>
        );
    }

    if (!data?.run) {
        return (
            <div className={`${styles.container} ${styles.rtl}`}>
                <div className={styles.emptyStateBox}>پردازش یافت نشد.</div>
                <Link href="/media-runs" className={styles.secondaryBtn}>بازگشت</Link>
            </div>
        );
    }

    const { run, costEntries } = data;

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <Link href="/media-runs" className={styles.secondaryBtn} style={{ marginBottom: 12 }}>
                        <LuArrowRight size={16} />
                        بازگشت به پردازش‌ها
                    </Link>
                    <h1 className={styles.mainTitle}>جزئیات پردازش</h1>
                    <p className={styles.subtitle}>
                        {run.projectTitle || 'بدون عنوان پروژه'} — <code>{run.jobId}</code>
                    </p>
                </div>
                <button type="button" className={styles.secondaryBtn} onClick={() => void load()}>
                    <LuRefreshCw size={16} />
                    بروزرسانی
                </button>
            </header>

            <div className={styles.topGrid}>
                <div className={styles.card}>
                    <div className={styles.cardLabel}>وضعیت</div>
                    <div className={styles.balanceValue}>
                        <span className={styles.badgeActive}>{run.status}</span>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardLabel}>هزینه کل (charged)</div>
                    <div className={styles.balanceValue}>
                        {formatUsd(run.totalCost ?? Number(run.usage?.totalCost || 0))}
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardLabel}>تاریخ</div>
                    <div className={styles.balanceValue} style={{ fontSize: '1rem' }}>
                        {formatDate(run.createdAt)}
                    </div>
                </div>
            </div>

            <div className={styles.card} style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>اطلاعات پایه</h3>
                <div className={styles.tableWrapper} style={{ marginBottom: 0 }}>
                    <table className={styles.table}>
                        <tbody>
                            <tr>
                                <th>Run ID</th>
                                <td><code>{run._id}</code></td>
                            </tr>
                            <tr>
                                <th>Project ID</th>
                                <td><code>{String(run.projectId)}</code></td>
                            </tr>
                            <tr>
                                <th>User ID</th>
                                <td><code>{String(run.userId)}</code></td>
                            </tr>
                            <tr>
                                <th>Provider / Model</th>
                                <td>
                                    <code>{String(run.providerId || '—')}</code>
                                    {' / '}
                                    <code>{String(run.modelId || '—')}</code>
                                </td>
                            </tr>
                            {run.errorMessage ? (
                                <tr>
                                    <th>خطا</th>
                                    <td style={{ color: '#b91c1c' }}>{run.errorMessage}</td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.card} style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>محاسبه قیمت (فرمول دقیق هر نود)</h3>
                {!costEntries?.length ? (
                    <div className={styles.emptyStateBox}>هزینه‌ای برای نودهای این پردازش ثبت نشده است.</div>
                ) : (
                    costEntries.map((entry: MediaRunCostEntry) => (
                        <div
                            key={entry.nodeId}
                            style={{
                                border: '1px solid var(--plan-card-border-color)',
                                borderRadius: 8,
                                padding: '1rem',
                                marginBottom: '0.85rem',
                                background: 'var(--input-background-color)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                <div>
                                    <strong>{entry.label || entry.nodeId}</strong>
                                    <div className={styles.subtitle} style={{ margin: 0, fontSize: 12 }}>
                                        {entry.nodeType || 'node'}
                                        {entry.model ? ` · ${entry.model}` : ''}
                                        {' · '}
                                        <code>{entry.nodeId}</code>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div>charged: <strong>{formatUsd(entry.cost.chargedUsd ?? entry.cost.amount)}</strong></div>
                                    <div className={styles.subtitle} style={{ margin: 0, fontSize: 12 }}>
                                        vendor: {formatUsd(entry.cost.vendorCostUsd)}
                                        {' · '}
                                        markup: {Number(entry.cost.markupPercent || 0)}%
                                        {' · '}
                                        profit: {formatUsd(entry.cost.profitUsd)}
                                    </div>
                                </div>
                            </div>

                            <pre
                                style={{
                                    marginTop: 12,
                                    marginBottom: 0,
                                    padding: '0.85rem 1rem',
                                    borderRadius: 8,
                                    background: 'color-mix(in srgb, var(--brand-color) 8%, transparent)',
                                    border: '1px dashed color-mix(in srgb, var(--brand-color) 35%, transparent)',
                                    whiteSpace: 'pre-wrap',
                                    direction: 'ltr',
                                    textAlign: 'left',
                                    fontSize: 13,
                                    lineHeight: 1.55,
                                    overflowX: 'auto',
                                }}
                            >
                                {entry.formula || '—'}
                            </pre>

                            {entry.cost.breakdown ? (
                                <details style={{ marginTop: 10 }}>
                                    <summary style={{ cursor: 'pointer', fontSize: 13 }}>breakdown خام</summary>
                                    <pre
                                        style={{
                                            marginTop: 8,
                                            padding: '0.75rem',
                                            borderRadius: 8,
                                            background: 'var(--plan-card-background-color)',
                                            border: '1px solid var(--plan-card-border-color)',
                                            whiteSpace: 'pre-wrap',
                                            direction: 'ltr',
                                            textAlign: 'left',
                                            fontSize: 12,
                                            overflowX: 'auto',
                                        }}
                                    >
                                        {JSON.stringify(entry.cost.breakdown, null, 2)}
                                    </pre>
                                </details>
                            ) : null}
                        </div>
                    ))
                )}
            </div>

            <div className={styles.card}>
                <h3 style={{ marginTop: 0 }}>nodeResults</h3>
                <pre
                    style={{
                        margin: 0,
                        padding: '0.85rem 1rem',
                        borderRadius: 8,
                        background: 'var(--input-background-color)',
                        border: '1px solid var(--plan-card-border-color)',
                        whiteSpace: 'pre-wrap',
                        direction: 'ltr',
                        textAlign: 'left',
                        fontSize: 12,
                        maxHeight: 420,
                        overflow: 'auto',
                    }}
                >
                    {JSON.stringify(run.nodeResults || {}, null, 2)}
                </pre>
            </div>
        </div>
    );
}
