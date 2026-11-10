'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../Automation.module.scss';
import parentStyles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { createAutomationId, loadDispatchLogs, saveDispatchLogs } from '../automation-api';
import type { DispatchLog, DispatchStatus } from '../automation.types';
import { DISPATCH_STATUS_LABELS } from '../automation.types';

const TABS = [
    { id: 'all', label: 'همه' },
    { id: 'delivered', label: 'تحویل‌شده' },
    { id: 'failed', label: 'خطا' },
    { id: 'queued', label: 'صف' },
];

export default function LogsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<DispatchLog[]>([]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { value } = await loadDispatchLogs(baseUrl, token);
            setLogs(value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = useMemo(() => {
        if (tab === 'all') return logs;
        return logs.filter((l) => l.status === tab);
    }, [logs, tab]);

    const handleRetry = async (id: string) => {
        if (!token) return;
        try {
            const now = new Date().toISOString();
            const next = logs.map((l) =>
                l.id === id ? { ...l, status: 'queued' as DispatchStatus, errorMessage: undefined, updatedAt: now } : l,
            );
            await saveDispatchLogs(baseUrl, token, next);
            setLogs(next);
            SuccessToaster({ message: 'به صف ارسال مجدد اضافه شد' });
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const addSample = async () => {
        if (!token) return;
        const now = new Date().toISOString();
        const sample: DispatchLog = {
            id: createAutomationId('log'),
            phone: '09121234567',
            patternName: 'یادآوری سبد',
            status: 'failed',
            errorMessage: 'بلک‌لیست',
            sentAt: now,
            updatedAt: now,
        };
        const next = [sample, ...logs];
        await saveDispatchLogs(baseUrl, token, next);
        setLogs(next);
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>لاگ و وضعیت ارسال‌ها</h1>
                            <p className={parentStyles.subtitle}>گزارش لحظه‌ای، خطاها و صف پردازش</p>
                        </div>
                        <button type="button" className={parentStyles.secondaryBtn} onClick={() => void addSample()}>
                            + نمونه تست
                        </button>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    <div className={styles.tabContent}>
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>موبایل</th>
                                        <th>پترن</th>
                                        <th>وضعیت</th>
                                        <th>خطا</th>
                                        <th>زمان</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', opacity: 0.7 }}>لاگی ثبت نشده</td></tr>
                                    ) : (
                                        filtered.map((l) => (
                                            <tr key={l.id}>
                                                <td dir="ltr">{l.phone}</td>
                                                <td>{l.patternName || '—'}</td>
                                                <td>{DISPATCH_STATUS_LABELS[l.status]}</td>
                                                <td>{l.errorMessage || '—'}</td>
                                                <td>{new Date(l.sentAt).toLocaleString('fa-IR')}</td>
                                                <td>
                                                    {l.status === 'failed' && (
                                                        <button type="button" className={styles.smallBtn} onClick={() => handleRetry(l.id)}>
                                                            ارسال مجدد
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
