'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { exploreFiles, loadAuditLogs, loadFileMeta } from '../documents-api';
import { AUDIT_ACTION_LABELS } from '../documents.types';

const TABS = [
    { id: 'activity', label: 'لاگ فعالیت' },
    { id: 'expired', label: 'منقضی‌شده' },
    { id: 'storage', label: 'مصرف حجم' },
];

export default function AuditPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('activity');
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<Awaited<ReturnType<typeof loadAuditLogs>>['value']>([]);
    const [fileMeta, setFileMeta] = useState<Record<string, import('../documents.types').DocumentFileMeta>>({});
    const [files, setFiles] = useState<Awaited<ReturnType<typeof exploreFiles>>['files']>([]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [a, m, e] = await Promise.all([
                loadAuditLogs(baseUrl, token),
                loadFileMeta(baseUrl, token),
                exploreFiles(baseUrl, token, { limit: 200 }),
            ]);
            setLogs(a.value);
            setFileMeta(m.value);
            setFiles(e.files);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const expired = useMemo(() => {
        const now = Date.now();
        return Object.values(fileMeta).filter((m) => m.expiresAt && new Date(m.expiresAt).getTime() < now);
    }, [fileMeta]);

    const storageByExt = useMemo(() => {
        const map = new Map<string, number>();
        files.forEach((f) => {
            const ext = f.ext || f.mimetype?.split('/')[1] || 'unknown';
            map.set(ext, (map.get(ext) || 0) + (f.size || 0));
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [files]);

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>گزارش‌گیری و ثبت ردپا</h1>
                            <p className={parentStyles.subtitle}>لاگ امنیتی، اسناد منقضی و مصرف حجم</p>
                        </div>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    {tab === 'activity' && (
                        <div className={tabStyles.tableWrap}>
                            <table className={tabStyles.dataTable}>
                                <thead><tr><th>کاربر</th><th>عمل</th><th>فایل</th><th>جزئیات</th><th>زمان</th></tr></thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr><td colSpan={5} className={tabStyles.emptyCell} data-label="">لاگی نیست</td></tr>
                                    ) : logs.map((l) => (
                                        <tr key={l.id}>
                                            <td data-label="کاربر" className={tabStyles.cellPrimary}>{l.userName}</td>
                                            <td data-label="عمل">{AUDIT_ACTION_LABELS[l.action] || l.action}</td>
                                            <td data-label="فایل">{l.fileName || '—'}</td>
                                            <td data-label="جزئیات" className={tabStyles.cellMuted}>{l.detail || '—'}</td>
                                            <td data-label="زمان" className={tabStyles.cellMuted}>{new Date(l.createdAt).toLocaleString('fa-IR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {tab === 'expired' && (
                        <div className={tabStyles.tableWrap}>
                            <table className={tabStyles.dataTable}>
                                <thead><tr><th>عنوان</th><th>قرارداد</th><th>انقضا</th></tr></thead>
                                <tbody>
                                    {expired.length === 0 ? (
                                        <tr><td colSpan={3} className={tabStyles.emptyCell} data-label="">سند منقضی‌شده‌ای نیست</td></tr>
                                    ) : expired.map((m) => (
                                        <tr key={m.fileId}>
                                            <td data-label="عنوان" className={tabStyles.cellPrimary}>{m.title}</td>
                                            <td data-label="قرارداد">{m.contractNo || '—'}</td>
                                            <td data-label="انقضا" className={tabStyles.cellMuted}>{m.expiresAt ? new Date(m.expiresAt).toLocaleDateString('fa-IR') : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {tab === 'storage' && (
                        <div className={tabStyles.tableWrap}>
                            <table className={tabStyles.dataTable}>
                                <thead><tr><th>فرمت</th><th>حجم (KB)</th></tr></thead>
                                <tbody>
                                    {storageByExt.length === 0 ? (
                                        <tr><td colSpan={2} className={tabStyles.emptyCell} data-label="">داده‌ای نیست</td></tr>
                                    ) : storageByExt.map(([ext, bytes]) => (
                                        <tr key={ext}>
                                            <td data-label="فرمت" className={tabStyles.cellPrimary}>{ext}</td>
                                            <td data-label="حجم (KB)">{Math.round(bytes / 1024).toLocaleString('fa-IR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
