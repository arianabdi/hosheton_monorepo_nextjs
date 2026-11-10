'use client';

import { useCallback, useEffect, useState } from 'react';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import StorageTransferPanel from './StorageTransferPanel';
import StorageBackupPanel from './StorageBackupPanel';
import StorageJobsList from './StorageJobsList';
import { listStorageJobs, type StorageJob, type StorageSettingsView } from './storage-api';

const POLL_MS = 3_000;

/** انتقال امن، بک‌آپ/بازگردانی و فهرست کارهای استوریج — زیر تنظیمات اتصال */
export default function StorageMaintenance({ view }: { view: StorageSettingsView }) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [jobs, setJobs] = useState<StorageJob[]>([]);

    const reload = useCallback(async () => {
        if (!token) return;
        try {
            setJobs(await listStorageJobs(baseUrl, token));
        } catch {
            // فهرست کارها کمکی است؛ خطایش بقیهٔ صفحه را نمی‌بندد
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void reload();
    }, [reload]);

    // تا وقتی کاری در جریان است پیشرفت را تازه کن
    const live = jobs.some((job) => job.status === 'running' || job.status === 'queued');
    useEffect(() => {
        if (!live) return;
        const timer = setInterval(() => void reload(), POLL_MS);
        return () => clearInterval(timer);
    }, [live, reload]);

    if (!token) return null;

    return (
        <>
            <StorageTransferPanel view={view} baseUrl={baseUrl} token={token} onJobStarted={() => void reload()} />
            <StorageBackupPanel view={view} baseUrl={baseUrl} token={token} onJobStarted={() => void reload()} />
            <div className={parentStyles.formCard}>
                <h3 className={parentStyles.formSectionTitle}>کارهای استوریج</h3>
                <p className={hrStyles.fieldHint}>
                    انتقال، بک‌آپ و بازگردانی پشت صحنه اجرا می‌شوند؛ با بستن صفحه یا ری‌استارت سرور متوقف نمی‌شوند و از همان‌جا ادامه
                    می‌دهند. هر بار فقط یک کار از هر نوع اجرا می‌شود.
                </p>
                <StorageJobsList jobs={jobs} baseUrl={baseUrl} token={token} onChanged={() => void reload()} />
            </div>
        </>
    );
}
