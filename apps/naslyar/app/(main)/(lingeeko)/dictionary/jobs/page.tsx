'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import styles from './JobMonitor.module.scss';
import { Container, Wrapper } from "@/app/(main)/layout";
import { ConvertDateToCalendarString, ErrorToaster, toFarsiNumber } from "@my-workspace/utils";
import { Pagination } from "@my-workspace/components";
import TableTheme from "@my-workspace/components/src/TableTheme/TableTheme";
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useAuthStore } from "@/app/zustand/store/authStore";

interface JobLogItem {
    _id: string;
    jobId: string;
    queueName: string;
    jobName: string;
    status: 'active' | 'completed' | 'failed' | 'stalled' | 'waiting';
    failedReason?: string;
    result?: { skipped?: boolean; reason?: string; success?: boolean }; // اضافه کردن این خط
    updatedAt: string;
}

const JobMonitor: React.FC = () => {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [jobs, setJobs] = useState<JobLogItem[]>([]);
    const [loading, setLoading] = useState(true);

    // استیت فیلترها طبق استانداردی که خودت استفاده می‌کنی
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterQueue, setFilterQueue] = useState<string>('');

    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0
    });

    const fetchJobs = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(filterStatus && { status: filterStatus }),
                ...(filterQueue && { queueName: filterQueue }),
            });

            const res = await axios.get(`${baseUrl}/api/job-log?${queryParams.toString()}`, {
                headers: { "authorization": `Bearer ${token}` },
            });

            if (res.data?.data) {
                setJobs(res.data.data.jobs || []);
                setPagination(prev => ({
                    ...prev,
                    totalItems: res.data.data.totalItems || 0,
                    currentPage: page,
                }));
            }
            setLoading(false);
        } catch (err: any) {
            setLoading(false);
            ErrorToaster(err);
        }
    }, [baseUrl, token, filterStatus, filterQueue]);

    useEffect(() => {
        fetchJobs(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, filterStatus, filterQueue, fetchJobs]);

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'completed': return styles.approved;
            case 'failed': return styles.btnDelete; // استفاده از رنگ قرمز استایل خودت
            case 'active': return styles.activeBadge;
            case 'stalled': return styles.pending;
            default: return '';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'موفقیت‌آمیز';
            case 'failed': return 'ناموفق (Failed)';
            case 'active': return 'در حال پردازش';
            case 'stalled': return 'قفل شده (Stalled)';
            case 'waiting': return 'در انتظار صف';
            default: return status;
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>کنسول مانیتورینگ پردازش‌های پس‌زمینه (Bull Jobs)</h1>
                        <p className={styles.subtitle}>
                            وضیعت تسک‌های تولید ویدیو، هوش مصنوعی ترجمه، تحلیل گرامر و تولید تریلرها را به صورت زنده رصد کنید.
                        </p>
                    </div>
                </div>

                {/* فیلترها */}
                <div className={`${styles.filterContainer} ${styles.rtl}`} style={{marginBottom: '20px'}}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterItem}>
                            <label>تفکیک بر اساس صف:</label>
                            <select value={filterQueue} onChange={(e) => setFilterQueue(e.target.value)} className={styles.filterSelect}>
                                <option value="">همه صف‌ها</option>
                                <option value="translationQueue">ترجمه دیکشنری</option>
                                <option value="grammarQueue">تحلیل گرامر</option>
                                <option value="phrasesQueue">اصطلاحات</option>
                                <option value="thumbnailQueue">پردازش مدیا</option>
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label>وضعیت جاب:</label>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>
                                <option value="">همه وضعیت‌ها</option>
                                <option value="active">در حال پردازش (Active)</option>
                                <option value="completed">تکمیل شده (Completed)</option>
                                <option value="failed">خطا خورده (Failed)</option>
                                <option value="stalled">متوقف شده (Stalled)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* جدول لاگ‌ها */}
                <div className={styles.rtl}>
                    {loading ? (
                        <p className={styles.emptyState}>در حال فرخوانی وضعیت پردازش‌ها...</p>
                    ) : jobs.length === 0 ? (
                        <p className={styles.emptyState}>هیچ پردازشی در این بخش ثبت نشده است.</p>
                    ) : (
                        <TableTheme>
                            <table className={styles.customTable}>
                                <thead>
                                <tr>
                                    <th>Job ID</th>
                                    <th>نام صف</th>
                                    <th>عملیات / تسک</th>
                                    <th>وضعیت فعلی</th>
                                    <th>آخرین به‌روزرسانی</th>
                                    <th>جزئیات خطا</th>
                                </tr>
                                </thead>
                                <tbody>
                                {jobs.map(job => {
                                    // بررسی اینکه آیا جاب با موفقیت به پایان رسیده اما اصطلاحاً Skip شده یا خیر
                                    const isSkipped = job.status === 'completed' && job.result?.skipped;

                                    return (
                                        <tr key={job._id}>
                                            <td><span className={styles.slugCode}>{toFarsiNumber(job.jobId)}</span></td>
                                            <td className={styles.wordTextMain}>{job.queueName}</td>
                                            <td>{job.jobName}</td>
                                            <td>
                                                {/* اگر اسکیپ شده بود لیبل خاکستری متمایز نشان بده، در غیر این صورت استاتوس‌های قبلی */}
                                                {isSkipped ? (
                                                    <span className={`${styles.statusBadge} ${styles.skipped}`} >
                                                     پرش شده (Skipped)
                                                </span>
                                                ) : (
                                                    <span className={`${styles.statusBadge} ${getStatusClass(job.status)}`}>
                                                        {getStatusText(job.status)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={styles.dateCell}>
                                                {toFarsiNumber(ConvertDateToCalendarString(job.updatedAt))}
                                            </td>
                                            {/* در ستون آخر، اگر خطا داشت قرمز نشان بده، اگر اسکیپ شده بود پیام دلیل پرش را نشان بده */}
                                            <td
                                                style={{
                                                    color: isSkipped ? '#64748b' : '#ef4444',
                                                    fontSize: '12px',
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title={job.failedReason || job.result?.reason}
                                            >
                                                {job.failedReason ? job.failedReason : (job.result?.reason ? job.result.reason : '-')}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}

                    {jobs.length > 0 && (
                        <div className={styles.paginationSpace}>
                            <Pagination
                                itemPerPage={pagination.itemPerPage}
                                currentPage={pagination.currentPage}
                                totalItems={pagination.totalItems}
                                setRowsPerPage={(num) => setPagination(prev => ({...prev, itemPerPage: num, currentPage: 1}))}
                                paginate={(page) => setPagination(prev => ({...prev, currentPage: page}))}
                                rtl={true}
                            />
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
};

export default JobMonitor;