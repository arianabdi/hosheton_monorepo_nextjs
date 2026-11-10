'use client';

import React, { useMemo } from 'react';
import styles from './UploadQueueSidebar.module.scss';
import { useUploadQueueStore } from '@/app/zustand/store/useUploadQueueStore';
import { toFarsiNumber } from '@my-workspace/utils';
import type { UploadJob, UploadJobStatus } from '@/app/utils/uploadQueue/types';

const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`;
};

const statusLabels: Record<UploadJobStatus, string> = {
    pending: 'در صف',
    uploading: 'در حال آپلود',
    paused: 'متوقف',
    completed: 'تکمیل شد',
    failed: 'خطا',
};

const UploadQueueSidebar = () => {
    const jobs = useUploadQueueStore((state) => state.jobs);
    const isSidebarOpen = useUploadQueueStore((state) => state.isSidebarOpen);
    const toggleSidebar = useUploadQueueStore((state) => state.toggleSidebar);
    const pauseAll = useUploadQueueStore((state) => state.pauseAll);
    const resumeAll = useUploadQueueStore((state) => state.resumeAll);
    const pauseJob = useUploadQueueStore((state) => state.pauseJob);
    const resumeJob = useUploadQueueStore((state) => state.resumeJob);
    const retryJob = useUploadQueueStore((state) => state.retryJob);
    const removeJob = useUploadQueueStore((state) => state.removeJob);
    const clearCompleted = useUploadQueueStore((state) => state.clearCompleted);

    const stats = useMemo(() => {
        return jobs.reduce(
            (acc, job) => {
                acc[job.status] += 1;
                return acc;
            },
            {
                pending: 0,
                uploading: 0,
                paused: 0,
                completed: 0,
                failed: 0,
            } as Record<UploadJobStatus, number>
        );
    }, [jobs]);

    const activeCount = stats.pending + stats.uploading + stats.paused + stats.failed;
    const hasJobs = jobs.length > 0;

    if (!hasJobs && !isSidebarOpen) {
        return null;
    }

    const getJobTitle = (job: UploadJob) => {
        if (job.episodeTitle) {
            return `${job.filmName || 'محتوا'} / ${job.episodeTitle}`;
        }
        return job.filmName || 'محتوا';
    };

    return (
        <>
            <button
                type="button"
                className={`${styles.toggleButton} ${isSidebarOpen ? styles.toggleOpen : ''}`}
                onClick={toggleSidebar}
                aria-label="مدیریت صف آپلود"
            >
                <span>📤</span>
                {activeCount > 0 && <span className={styles.badge}>{toFarsiNumber(activeCount)}</span>}
            </button>

            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <div>
                        <h3>صف آپلود ویدیو</h3>
                        <p>فایل‌ها در مرورگر ذخیره می‌شوند و بعد از reload هم ادامه پیدا می‌کنند.</p>
                    </div>
                    <button type="button" className={styles.closeBtn} onClick={toggleSidebar}>
                        ✕
                    </button>
                </div>

                <div className={styles.summary}>
                    <span>کل: {toFarsiNumber(jobs.length)}</span>
                    <span>در حال انجام: {toFarsiNumber(stats.uploading + stats.pending)}</span>
                    <span>تکمیل: {toFarsiNumber(stats.completed)}</span>
                    <span>خطا: {toFarsiNumber(stats.failed)}</span>
                </div>

                <div className={styles.actions}>
                    <button type="button" onClick={() => void pauseAll()} className={styles.actionBtn}>
                        توقف همه
                    </button>
                    <button type="button" onClick={() => void resumeAll()} className={`${styles.actionBtn} ${styles.primary}`}>
                        ادامه همه
                    </button>
                    <button type="button" onClick={() => void clearCompleted()} className={styles.actionBtn}>
                        پاک کردن تکمیل‌شده‌ها
                    </button>
                </div>

                <div className={styles.list}>
                    {jobs.length === 0 ? (
                        <div className={styles.emptyState}>هنوز فایلی به صف اضافه نشده است.</div>
                    ) : (
                        jobs.map((job) => (
                            <div key={job.id} className={`${styles.jobCard} ${styles[job.status]}`}>
                                <div className={styles.jobHeader}>
                                    <div className={styles.jobTitle}>
                                        <strong>{job.resolution}</strong>
                                        <span>{getJobTitle(job)}</span>
                                    </div>
                                    <span className={styles.statusBadge}>{statusLabels[job.status]}</span>
                                </div>

                                <div className={styles.fileName} title={job.fileName}>
                                    {job.fileName} ({formatSize(job.fileSize)})
                                </div>

                                <div className={styles.progressTrack}>
                                    <div className={styles.progressFill} style={{ width: `${job.progress}%` }} />
                                </div>
                                <div className={styles.progressMeta}>
                                    <span>{toFarsiNumber(job.progress)}%</span>
                                </div>

                                {job.error && <div className={styles.errorText}>{job.error}</div>}

                                <div className={styles.jobActions}>
                                    {(job.status === 'pending' || job.status === 'uploading') && (
                                        <button type="button" onClick={() => void pauseJob(job.id)}>توقف</button>
                                    )}
                                    {(job.status === 'paused' || job.status === 'pending' || job.status === 'failed') && (
                                        <button type="button" onClick={() => void resumeJob(job.id)}>ادامه</button>
                                    )}
                                    {job.status === 'failed' && (
                                        <button type="button" onClick={() => void retryJob(job.id)}>تلاش مجدد</button>
                                    )}
                                    {job.status !== 'uploading' && (
                                        <button type="button" onClick={() => void removeJob(job.id)} className={styles.danger}>
                                            حذف
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {isSidebarOpen && <div className={styles.overlay} onClick={toggleSidebar} />}
        </>
    );
};

export default UploadQueueSidebar;
