'use client';

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import jobStyles from './JobMonitor.module.scss';
import styles from '../Blog.module.scss';
import { ConvertDateToCalendarString, ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, ModalHelper, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import BlogSectionGuide from '../components/BlogSectionGuide';
import { TbRobot } from 'react-icons/tb';

interface JobLogItem {
    _id: string;
    jobId: string;
    queueName: string;
    jobName: string;
    status: 'active' | 'completed' | 'failed' | 'stalled' | 'waiting';
    failedReason?: string;
    data?: { blogId?: string; title?: string };
    result?: { skipped?: boolean; reason?: string; success?: boolean; blogId?: string };
    updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
    completed: 'موفقیت‌آمیز',
    failed: 'ناموفق',
    active: 'در حال پردازش',
    stalled: 'قفل شده',
    waiting: 'در انتظار صف',
};

export default function BlogJobsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [jobs, setJobs] = useState<JobLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedJob, setSelectedJob] = useState<JobLogItem | null>(null);
    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0,
    });

    const fetchJobs = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                queueName: 'blogQueue',
                ...(filterStatus && { status: filterStatus }),
            });

            const res = await axios.get(`${baseUrl}/api/job-log?${queryParams.toString()}`, {
                headers: { authorization: `Bearer ${token}` },
            });

            if (res.data?.data) {
                setJobs(res.data.data.jobs || []);
                setPagination((prev) => ({
                    ...prev,
                    totalItems: res.data.data.totalItems || 0,
                    currentPage: page,
                }));
            }
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, filterStatus]);

    useEffect(() => {
        fetchJobs(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, filterStatus, fetchJobs]);

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'completed': return jobStyles.approved;
            case 'failed': return jobStyles.btnDelete;
            case 'active': return jobStyles.activeBadge;
            case 'stalled': return jobStyles.pending;
            case 'waiting': return jobStyles.pending;
            default: return '';
        }
    };

    const getDetailText = (job: JobLogItem) => {
        if (job.failedReason) return job.failedReason;
        if (job.result?.reason) return job.result.reason;
        return '';
    };

    const openDetailModal = (job: JobLogItem) => {
        const detail = getDetailText(job);
        if (!detail && job.status !== 'failed' && !job.result?.reason) return;
        setSelectedJob(job);
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>جاب‌های تولید مقاله (Bull)</h1>
                    <p className={styles.subtitle}>
                        وضعیت صف تولید خودکار مقالات با AI را رصد کنید. در صورت خطا، جزئیات کامل را در modal مشاهده کنید.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/blog/ai" className={styles.secondaryBtn}>تولید با AI</Link>
                    <Link href="/blog" className={styles.secondaryBtn}>بازگشت به بلاگ</Link>
                </div>
            </header>

            <BlogSectionGuide guideKey="ai" compact />

            <div className={`${jobStyles.filterContainer} ${jobStyles.rtl}`} style={{ marginBottom: '20px' }}>
                <div className={jobStyles.filterGrid}>
                    <div className={jobStyles.filterItem}>
                        <label>وضعیت جاب:</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={jobStyles.filterSelect}
                        >
                            <option value="">همه وضعیت‌ها</option>
                            <option value="waiting">در انتظار صف</option>
                            <option value="active">در حال پردازش</option>
                            <option value="completed">تکمیل شده</option>
                            <option value="failed">خطا خورده</option>
                            <option value="stalled">متوقف شده</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <LoadingState />
            ) : jobs.length === 0 ? (
                <TableEmptyState
                    icon={<TbRobot size={32} />}
                    title={filterStatus ? 'جابی با این وضعیت یافت نشد' : 'هنوز جابی ثبت نشده'}
                    description={
                        filterStatus
                            ? 'فیلتر وضعیت را تغییر دهید یا همه جاب‌ها را ببینید.'
                            : 'پس از اولین تولید مقاله با AI، وضعیت جاب‌ها اینجا نمایش داده می‌شود.'
                    }
                    primaryLabel={filterStatus ? undefined : 'رفتن به تولید AI'}
                    primaryHref={filterStatus ? undefined : '/blog/ai'}
                    secondaryLabel={filterStatus ? 'حذف فیلتر' : 'بازگشت به بلاگ'}
                    {...(filterStatus
                        ? { onSecondaryClick: () => setFilterStatus('') }
                        : { secondaryHref: '/blog' })}
                />
            ) : (
                <TableTheme>
                    <table className={jobStyles.customTable}>
                        <thead>
                            <tr>
                                <th>Job ID</th>
                                <th>مقاله</th>
                                <th>وضعیت</th>
                                <th>آخرین به‌روزرسانی</th>
                                <th>جزئیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job) => {
                                const detail = getDetailText(job);
                                const hasDetail = Boolean(detail) || job.status === 'failed';

                                return (
                                    <tr key={job._id}>
                                        <td><span className={jobStyles.slugCode}>{toFarsiNumber(job.jobId)}</span></td>
                                        <td className={jobStyles.wordTextMain}>
                                            {job.data?.title || job.data?.blogId || '—'}
                                        </td>
                                        <td>
                                            <span className={`${jobStyles.statusBadge} ${getStatusClass(job.status)}`}>
                                                {STATUS_LABELS[job.status] || job.status}
                                            </span>
                                        </td>
                                        <td className={jobStyles.dateCell}>
                                            {toFarsiNumber(ConvertDateToCalendarString(job.updatedAt))}
                                        </td>
                                        <td>
                                            {hasDetail ? (
                                                <button
                                                    type="button"
                                                    className={jobStyles.btnDelete}
                                                    style={{ border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem' }}
                                                    onClick={() => openDetailModal(job)}
                                                >
                                                    مشاهده خطا
                                                </button>
                                            ) : (
                                                <span style={{ opacity: 0.5, fontSize: '12px' }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </TableTheme>
            )}

            {!loading && jobs.length > 0 && (
                <div className={jobStyles.paginationSpace}>
                    <Pagination
                        itemPerPage={pagination.itemPerPage}
                        currentPage={pagination.currentPage}
                        totalItems={pagination.totalItems}
                        setRowsPerPage={(num) => setPagination((prev) => ({ ...prev, itemPerPage: num, currentPage: 1 }))}
                        paginate={(page) => setPagination((prev) => ({ ...prev, currentPage: page }))}
                        rtl
                    />
                </div>
            )}

            <ModalHelper
                open={Boolean(selectedJob)}
                onClose={() => setSelectedJob(null)}
                size="lg"
                component={
                    selectedJob ? (
                        <div style={{ padding: '1rem', direction: 'rtl', textAlign: 'right' }}>
                            <h3 style={{ marginTop: 0 }}>جزئیات جاب</h3>
                            <p><strong>Job ID:</strong> {toFarsiNumber(selectedJob.jobId)}</p>
                            <p><strong>وضعیت:</strong> {STATUS_LABELS[selectedJob.status] || selectedJob.status}</p>
                            {selectedJob.data?.title && (
                                <p><strong>مقاله:</strong> {selectedJob.data.title}</p>
                            )}
                            {selectedJob.data?.blogId && (
                                <p><strong>Blog ID:</strong> {selectedJob.data.blogId}</p>
                            )}
                            <div style={{ marginTop: '1rem' }}>
                                <strong>پیام / خطا:</strong>
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    background: 'var(--input-background-color, #f5f5f5)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.7,
                                }}>
                                    {getDetailText(selectedJob) || 'خطای ثبت‌شده‌ای یافت نشد.'}
                                </pre>
                            </div>
                            {selectedJob.data?.blogId && (
                                <Link href={`/blog/${selectedJob.data.blogId}`} className={styles.primaryBtn} style={{ display: 'inline-block', marginTop: '1rem' }}>
                                    ویرایش مقاله
                                </Link>
                            )}
                        </div>
                    ) : null
                }
            />
        </div>
    );
}
