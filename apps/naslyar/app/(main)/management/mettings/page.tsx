'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import tabStyles from '../../marketing/automation/Automation.module.scss';
import parentStyles from '../../marketing/Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { loadMeetingsStore } from './meetings-api';

export default function MeetingsOverviewPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<Awaited<ReturnType<typeof loadMeetingsStore>> | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setStore(await loadMeetingsStore(baseUrl, token));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const stats = useMemo(() => {
        if (!store) return null;
        const upcoming = store.meetings.filter((m) => m.status === 'scheduled').length;
        const overdueActions = store.actionItems.filter((a) => a.status === 'overdue').length;
        const pendingMinutes = store.minutes.filter((m) => m.status === 'draft').length;
        return {
            upcoming,
            attachments: store.attachments.length,
            overdueActions,
            pendingMinutes,
        };
    }, [store]);

    if (loading || !stats) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>مدیریت جلسات</h1>
                            <p className={parentStyles.subtitle}>
                                یکپارچه با DMS — بدون ذخیره فایل مستقل؛ فقط dms_document_id و dms_folder_id
                            </p>
                        </div>
                        <Link href="/management/mettings/scheduling" className={parentStyles.primaryBtn}>
                            + جلسه جدید
                        </Link>
                    </header>
                    <div className={parentStyles.statsBar}>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{stats.upcoming}</div><div className={parentStyles.statLabel}>جلسات پیش‌رو</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{stats.attachments}</div><div className={parentStyles.statLabel}>پیوست DMS</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{stats.pendingMinutes}</div><div className={parentStyles.statLabel}>صورتجلسه پیش‌نویس</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{stats.overdueActions}</div><div className={parentStyles.statLabel}>مصوبات معوق</div></div>
                    </div>
                    <div className={parentStyles.overviewGrid}>
                        <div className={parentStyles.overviewCard}>
                            <h3>جریان DMS</h3>
                            <p>با ایجاد جلسه، پوشه‌ای در DMS ساخته می‌شود: Meetings / سال / عنوان. PDF صورتجلسه پس از تأیید به همان پوشه ارسال می‌شود.</p>
                            <Link href="/management/documents/explorer" className={parentStyles.secondaryBtn}>مخزن DMS</Link>
                        </div>
                        <div className={parentStyles.overviewCard}>
                            <h3>یادآوری SMS</h3>
                            <p>از ماژول SMS پلتفرم برای یادآوری پیش از جلسه و ارسال مصوبات استفاده می‌شود.</p>
                            <Link href="/management/mettings/notifications" className={parentStyles.secondaryBtn}>تنظیم پیامک</Link>
                        </div>
                    </div>
                    {store.meetings.length > 0 && (
                        <div className={tabStyles.tableWrap}>
                            <table className={tabStyles.dataTable}>
                                <thead><tr><th>عنوان</th><th>زمان</th><th>تکرار</th><th>پوشه DMS</th></tr></thead>
                                <tbody>
                                    {store.meetings.slice(0, 8).map((m) => (
                                        <tr key={m.id}>
                                            <td>{m.title}</td>
                                            <td>{new Date(m.startsAt).toLocaleString('fa-IR')}</td>
                                            <td>{m.recurrence}</td>
                                            <td dir="ltr">{m.dmsFolderPath || '—'}</td>
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
