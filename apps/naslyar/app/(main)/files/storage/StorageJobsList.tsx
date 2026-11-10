'use client';

import { useState } from 'react';
import { ErrorToaster } from '@my-workspace/utils';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from './StorageSettings.module.scss';
import { formatBytes } from './storage-format';
import { getStorageJob, storageJobAction, type StorageJob } from './storage-api';

const KIND_LABEL: Record<StorageJob['kind'], string> = {
    transfer: 'انتقال به استوریج فعال',
    backup: 'بک‌آپ',
    restore: 'بازگردانی از بک‌آپ',
};

const STATUS_LABEL: Record<StorageJob['status'], string> = {
    queued: 'در صف',
    running: 'در حال اجرا',
    paused: 'متوقف',
    completed: 'تمام شد',
    failed: 'شکست خورد',
    cancelled: 'لغو شد',
};

interface Props {
    jobs: StorageJob[];
    baseUrl: string;
    token: string;
    onChanged: () => void;
}

/** کارهای نگهداری استوریج با پیشرفت زنده؛ مکث/ادامه/لغو و فهرست فایل‌های ناموفق */
export default function StorageJobsList({ jobs, baseUrl, token, onChanged }: Props) {
    const [openId, setOpenId] = useState('');
    const [detail, setDetail] = useState<StorageJob | null>(null);

    const act = async (job: StorageJob, action: 'pause' | 'resume' | 'cancel') => {
        try {
            await storageJobAction(baseUrl, token, job._id, action);
            onChanged();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const toggleFailures = async (job: StorageJob) => {
        if (openId === job._id) {
            setOpenId('');
            return;
        }
        try {
            setDetail(await getStorageJob(baseUrl, token, job._id));
            setOpenId(job._id);
        } catch (error) {
            ErrorToaster(error);
        }
    };

    if (!jobs.length) {
        return <p className={hrStyles.fieldHint}>هنوز کاری اجرا نشده است.</p>;
    }

    return (
        <ul className={styles.jobList}>
            {jobs.map((job) => {
                const done = job.processed;
                const percent = job.total > 0 ? Math.min(100, Math.round((done / job.total) * 100)) : null;
                const active = job.status === 'running' || job.status === 'queued';
                return (
                    <li key={job._id}>
                        <div className={styles.jobHead}>
                            <strong>{KIND_LABEL[job.kind]}</strong>
                            <span className={`${styles.jobStatus} ${styles[`job_${job.status}`] || ''}`}>{STATUS_LABEL[job.status]}</span>
                            <span className={styles.ltrText}>{job.label}</span>
                        </div>
                        <div className={styles.progressTrack} aria-hidden>
                            <span
                                className={`${styles.progressFill} ${percent === null && active ? styles.progressIndeterminate : ''}`}
                                style={{ width: `${percent ?? (job.status === 'completed' ? 100 : 30)}%` }}
                            />
                        </div>
                        <div className={styles.jobStats}>
                            <span>بررسی‌شده: {done.toLocaleString('fa-IR')}{job.total ? ` از ${job.total.toLocaleString('fa-IR')}` : ''}</span>
                            <span>کپی: {job.copied.toLocaleString('fa-IR')}</span>
                            <span title="قبلاً با همین محتوا در مقصد بود">تکراری: {job.skipped.toLocaleString('fa-IR')}</span>
                            {job.kind !== 'backup' && <span title="رکوردهایی که آدرسشان به مقصد تغییر کرد">آدرس جدید: {job.relinked.toLocaleString('fa-IR')}</span>}
                            <span className={job.failed ? styles.failText : ''}>ناموفق: {job.failed.toLocaleString('fa-IR')}</span>
                            <span dir="ltr">{formatBytes(job.bytes)}</span>
                        </div>
                        {job.error && <p className={styles.fieldWarn} dir="ltr">{job.error}</p>}
                        <div className={styles.inlineActions}>
                            {active && (
                                <button type="button" className={parentStyles.secondaryBtn} onClick={() => void act(job, 'pause')}>مکث</button>
                            )}
                            {job.status === 'paused' && (
                                <button type="button" className={parentStyles.secondaryBtn} onClick={() => void act(job, 'resume')}>ادامه</button>
                            )}
                            {(active || job.status === 'paused') && (
                                <button type="button" className={parentStyles.secondaryBtn} onClick={() => void act(job, 'cancel')}>لغو</button>
                            )}
                            {job.failed > 0 && (
                                <button type="button" className={parentStyles.secondaryBtn} onClick={() => void toggleFailures(job)}>
                                    {openId === job._id ? 'بستن فهرست خطاها' : 'فایل‌های ناموفق'}
                                </button>
                            )}
                        </div>
                        {openId === job._id && detail?.failures?.length ? (
                            <ul className={styles.failureList}>
                                {detail.failures.map((failure) => (
                                    <li key={`${failure.key}:${failure.at}`}>
                                        <code dir="ltr">{failure.code}</code>
                                        <span dir="ltr" className={styles.ltrText}>{failure.key}</span>
                                        <span className={hrStyles.fieldHint} dir="ltr">{failure.message}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}
