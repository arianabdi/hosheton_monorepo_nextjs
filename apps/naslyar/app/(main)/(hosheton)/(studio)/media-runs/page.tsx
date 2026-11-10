'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuRefreshCw, LuSearch } from 'react-icons/lu';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { mediaRunsAdminApi, type MediaRunListItem } from '../lib/media-runs-admin-api';
import styles from '../projects/nodes/Providers.module.scss';

const STATUS_OPTIONS = [
    { label: 'همه وضعیت‌ها', value: '' },
    { label: 'PENDING', value: 'PENDING' },
    { label: 'RUNNING', value: 'RUNNING' },
    { label: 'COMPLETED', value: 'COMPLETED' },
    { label: 'FAILED', value: 'FAILED' },
    { label: 'CANCELLED', value: 'CANCELLED' },
];

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

export default function MediaRunsPage() {
    const [runs, setRuns] = useState<MediaRunListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [jobId, setJobId] = useState('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        itemPerPage: 20,
        totalItems: 0,
    });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await mediaRunsAdminApi.list({
                page: pagination.currentPage,
                limit: pagination.itemPerPage,
                status: status || undefined,
                jobId: jobId.trim() || undefined,
            });
            setRuns(res.runs ?? []);
            setPagination((prev) => ({ ...prev, totalItems: res.totalItems ?? 0 }));
        } catch (error) {
            setRuns([]);
            setPagination((prev) => ({ ...prev, totalItems: 0 }));
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.itemPerPage, status, jobId]);

    useEffect(() => {
        const timer = setTimeout(load, 250);
        return () => clearTimeout(timer);
    }, [load]);

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>پردازش‌ها</h1>
                    <p className={styles.subtitle}>
                        لیست اجراهای media_runs — جزئیات و فرمول دقیق محاسبه هزینه در صفحه هر پردازش.
                    </p>
                </div>
                <button type="button" className={styles.secondaryBtn} onClick={() => void load()} disabled={loading}>
                    <LuRefreshCw size={16} />
                    بروزرسانی
                </button>
            </header>

            <div className={styles.tableToolbar}>
                <div className={styles.searchBar}>
                    <LuSearch size={16} />
                    <input
                        value={jobId}
                        onChange={(e) => {
                            setJobId(e.target.value);
                            setPagination((p) => ({ ...p, currentPage: 1 }));
                        }}
                        placeholder="جستجوی jobId…"
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value);
                        setPagination((p) => ({ ...p, currentPage: 1 }));
                    }}
                    style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: 8,
                        border: '1px solid var(--input-border-color)',
                        background: 'var(--input-background-color)',
                        color: 'var(--body-text-color)',
                    }}
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <LoadingState />
            ) : runs.length === 0 ? (
                <div className={styles.emptyStateBox}>پردازشی یافت نشد.</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>وضعیت</th>
                                <th>پروژه</th>
                                <th>Job ID</th>
                                <th>هزینه</th>
                                <th>کاربر</th>
                                <th>تاریخ</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((run) => (
                                <tr key={run._id}>
                                    <td>
                                        <span className={styles.badgeActive}>{run.status}</span>
                                    </td>
                                    <td>
                                        <div>{run.projectTitle || '—'}</div>
                                        <div className={styles.subtitle} style={{ margin: 0, fontSize: 12 }}>
                                            {String(run.projectId)}
                                        </div>
                                    </td>
                                    <td><code>{run.jobId}</code></td>
                                    <td>{formatUsd(run.totalCost ?? Number(run.usage?.totalCost || 0))}</td>
                                    <td>
                                        <div className={styles.subtitle} style={{ margin: 0, fontSize: 12 }}>
                                            {String(run.userId)}
                                        </div>
                                    </td>
                                    <td>{formatDate(run.createdAt)}</td>
                                    <td>
                                        <Link href={`/media-runs/${run._id}`} className={styles.secondaryBtn}>
                                            جزئیات / فرمول
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className={styles.subtitle} style={{ margin: 0 }}>
                    {toFarsiNumber(pagination.totalItems)} پردازش
                </p>
                <Pagination
                    itemPerPage={pagination.itemPerPage}
                    currentPage={pagination.currentPage}
                    totalItems={pagination.totalItems}
                    rtl
                    paginate={(pageNumber) => setPagination((prev) => ({ ...prev, currentPage: pageNumber }))}
                    setRowsPerPage={(rows) =>
                        setPagination((prev) => ({ ...prev, itemPerPage: rows, currentPage: 1 }))
                    }
                />
            </div>
        </div>
    );
}
