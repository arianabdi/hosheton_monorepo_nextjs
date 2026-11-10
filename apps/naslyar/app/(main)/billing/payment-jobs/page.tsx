'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import jobStyles from '@/app/(main)/(lingeeko)/dictionary/jobs/JobMonitor.module.scss';
import styles from '../Billing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ConvertDateToCalendarString, ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { Pagination, LoadingState } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { TbCreditCard } from 'react-icons/tb';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';

interface JobLogItem {
    _id: string;
    jobId: string;
    queueName: string;
    jobName: string;
    status: 'active' | 'completed' | 'failed' | 'stalled' | 'waiting';
    failedReason?: string;
    updatedAt: string;
}

interface JobStats {
    total?: number;
    completed?: number;
    failed?: number;
    active?: number;
    waiting?: number;
    stalled?: number;
}

export default function PaymentJobsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [jobs, setJobs] = useState<JobLogItem[]>([]);
    const [stats, setStats] = useState<JobStats>({});
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [pagination, setPagination] = useState({ itemPerPage: 10, currentPage: 1, totalItems: 0 });

    const fetchStats = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${baseUrl}/api/billing/payment-jobs/stats`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) setStats(res.data.data || {});
        } catch (e) {
            ErrorToaster(e);
        }
    }, [baseUrl, token]);

    const fetchJobs = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);
            const query = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(filterStatus && { status: filterStatus }),
            });
            const res = await axios.get(`${baseUrl}/api/billing/payment-jobs?${query}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data?.data) {
                setJobs(res.data.data.jobs || []);
                setPagination(prev => ({
                    ...prev,
                    totalItems: res.data.data.totalItems || 0,
                    currentPage: page,
                }));
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, filterStatus]);

    useEffect(() => {
        fetchStats();
        fetchJobs(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, filterStatus, fetchJobs, fetchStats]);

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'completed': return jobStyles.approved;
            case 'failed': return jobStyles.btnDelete;
            case 'active': return jobStyles.activeBadge;
            case 'stalled': return jobStyles.pending;
            default: return '';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'موفق';
            case 'failed': return 'خطا';
            case 'active': return 'در حال انجام';
            case 'stalled': return 'متوقف';
            case 'waiting': return 'در صف';
            default: return status;
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${jobStyles.header} ${jobStyles.rtl}`}>
                    <div>
                        <h1 className={jobStyles.mainTitle}>جاب‌های پرداخت (billingQueue)</h1>
                        <p className={jobStyles.subtitle}>
                            پردازش‌های پس‌زمینه تأیید پرداخت، شارژ کیف پول و callback درگاه‌ها.
                        </p>
                    </div>
                </div>

                <div className={`${styles.statsGrid} ${styles.rtl}`}>
                    <div className={styles.statCard}><strong>{toFarsiNumber(String(stats.total ?? 0))}</strong><span>کل</span></div>
                    <div className={`${styles.statCard} ${styles.statCompleted}`}><strong>{toFarsiNumber(String(stats.completed ?? 0))}</strong><span>موفق</span></div>
                    <div className={`${styles.statCard} ${styles.statFailed}`}><strong>{toFarsiNumber(String(stats.failed ?? 0))}</strong><span>خطا</span></div>
                    <div className={`${styles.statCard} ${styles.statActive}`}><strong>{toFarsiNumber(String(stats.active ?? 0))}</strong><span>در حال انجام</span></div>
                    <div className={`${styles.statCard} ${styles.statWaiting}`}><strong>{toFarsiNumber(String((stats.waiting ?? 0) + (stats.stalled ?? 0)))}</strong><span>صف / متوقف</span></div>
                </div>

                <div className={`${jobStyles.filterContainer} ${jobStyles.rtl}`} style={{ marginBottom: 20 }}>
                    <div className={jobStyles.filterGrid}>
                        <div className={jobStyles.filterItem}>
                            <label>وضعیت:</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={jobStyles.filterSelect}>
                                <option value="">همه</option>
                                <option value="active">در حال انجام</option>
                                <option value="completed">موفق</option>
                                <option value="failed">خطا</option>
                                <option value="waiting">در صف</option>
                                <option value="stalled">متوقف</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className={jobStyles.rtl}>
                    {loading ? (
                        <LoadingState />
                    ) : jobs.length === 0 ? (
                        <TableEmptyState
                            icon={<TbCreditCard size={32} />}
                            title={filterStatus ? 'جابی با این وضعیت یافت نشد' : 'هنوز جاب پرداختی ثبت نشده'}
                            description={
                                filterStatus
                                    ? 'فیلتر وضعیت را تغییر دهید یا همه جاب‌ها را ببینید.'
                                    : 'پس از اولین پرداخت یا تأیید تراکنش، جاب‌های billingQueue اینجا نمایش داده می‌شوند.'
                            }
                            secondaryLabel={filterStatus ? 'حذف فیلتر' : undefined}
                            {...(filterStatus ? { onSecondaryClick: () => setFilterStatus('') } : {})}
                        />
                    ) : (
                        <TableTheme>
                            <table className={jobStyles.customTable}>
                                <thead>
                                    <tr>
                                        <th>Job ID</th>
                                        <th>نام job</th>
                                        <th>وضعیت</th>
                                        <th>به‌روزرسانی</th>
                                        <th>خطا</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.map(job => (
                                        <tr key={job._id}>
                                            <td><span className={jobStyles.slugCode}>{toFarsiNumber(job.jobId)}</span></td>
                                            <td>{job.jobName}</td>
                                            <td>
                                                <span className={`${jobStyles.statusBadge} ${getStatusClass(job.status)}`}>
                                                    {getStatusText(job.status)}
                                                </span>
                                            </td>
                                            <td className={jobStyles.dateCell}>
                                                {toFarsiNumber(ConvertDateToCalendarString(job.updatedAt))}
                                            </td>
                                            <td style={{ color: '#ef4444', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={job.failedReason}>
                                                {job.failedReason || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}

                    {jobs.length > 0 && (
                        <div className={jobStyles.paginationSpace}>
                            <Pagination
                                itemPerPage={pagination.itemPerPage}
                                currentPage={pagination.currentPage}
                                totalItems={pagination.totalItems}
                                setRowsPerPage={num => setPagination(prev => ({ ...prev, itemPerPage: num, currentPage: 1 }))}
                                paginate={page => setPagination(prev => ({ ...prev, currentPage: page }))}
                                rtl
                            />
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
