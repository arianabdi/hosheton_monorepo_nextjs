'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import styles from './Automation.module.scss';
import parentStyles from '../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { loadAutomationStore } from './automation-api';

export default function AutomationOverviewPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [smsCount, setSmsCount] = useState<number | null>(null);
    const [smsAvailable, setSmsAvailable] = useState(true);
    const [stats, setStats] = useState({ triggers: 0, patterns: 0, workflows: 0, logs: 0 });

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const store = await loadAutomationStore(baseUrl, token);
            setStats({
                triggers: store.triggers.filter((t) => t.isActive).length,
                patterns: store.patterns.filter((p) => p.status === 'active').length,
                workflows: store.workflows.filter((w) => w.isActive).length,
                logs: store.dispatchLogs.length,
            });
            try {
                const res = await axios.get(`${baseUrl}/api/sms/providers`, {
                    headers: { authorization: `Bearer ${token}` },
                });
                setSmsCount((res.data?.data || []).length);
                setSmsAvailable(true);
            } catch {
                setSmsCount(null);
                setSmsAvailable(false);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const cards = useMemo(
        () => [
            { title: 'تریگرهای فعال', value: stats.triggers, href: '/marketing/automation/triggers' },
            { title: 'پترن‌های فعال', value: stats.patterns, href: '/marketing/automation/patterns' },
            { title: 'سناریوهای فعال', value: stats.workflows, href: '/marketing/automation/workflows' },
            { title: 'رکورد لاگ', value: stats.logs, href: '/marketing/automation/logs' },
        ],
        [stats],
    );

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>اتوماسیون بازاریابی</h1>
                            <p className={parentStyles.subtitle}>
                                موتور ارسال پیامک خودکار بر اساس رویداد، رفتار کاربر و زمان‌بندی — پیکربندی پنل SMS از
                                تنظیمات عمومی انجام می‌شود.
                            </p>
                        </div>
                    </header>


                    {!smsAvailable && (
                        <div className={styles.alertBox}>
                            API پیامک در پروژه فعلی فعال نیست. تنظیمات provider فقط برای اپ‌های دارای SmsModule (مثل
                            Hosheton Studio) در دسترس است.
                        </div>
                    )}

                    <div className={parentStyles.statsBar}>
                        {cards.map((c) => (
                            <Link key={c.href} href={c.href} className={parentStyles.statCard} style={{ textDecoration: 'none' }}>
                                <div className={parentStyles.statValue}>{c.value}</div>
                                <div className={parentStyles.statLabel}>{c.title}</div>
                            </Link>
                        ))}
                    </div>

                    <div className={parentStyles.overviewGrid}>
                        <div className={parentStyles.overviewCard}>
                            <h3>تنظیمات SMS</h3>
                            <p>
                                پنل‌های پیامک، مسیریابی OTP و رویدادهای تراکنشی از بخش تنظیمات مدیریت می‌شوند.
                                {smsAvailable && smsCount !== null && (
                                    <> ({smsCount} پنل ثبت‌شده)</>
                                )}
                            </p>
                            <Link href="/settings/sms" className={`${parentStyles.secondaryBtn} ${parentStyles.overviewLink}`}>
                                تنظیمات پیامک
                            </Link>
                        </div>
                        <div className={parentStyles.overviewCard}>
                            <h3>گزارشات عملکرد</h3>
                            <p>آمار ارسال، تحویل، هزینه و تست A/B را در بخش گزارشات مشاهده کنید.</p>
                            <Link
                                href="/marketing/automation/analytics"
                                className={`${parentStyles.secondaryBtn} ${parentStyles.overviewLink}`}
                            >
                                گزارشات
                            </Link>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
