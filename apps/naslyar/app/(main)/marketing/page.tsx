'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { loadConnections } from './marketing-api';
import { ANALYTICS_PLATFORM_DEFINITIONS } from './platform.definitions';
import type { AnalyticsConnection } from './marketing.types';

export default function MarketingOverviewPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [connections, setConnections] = useState<AnalyticsConnection[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { connections: data } = await loadConnections(baseUrl, token);
            setConnections(data);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        load();
    }, [load]);

    const summary = useMemo(
        () => ({
            total: connections.length,
            active: connections.filter((c) => c.isActive).length,
            ga4: connections.filter((c) => c.platform === 'ga4').length,
        }),
        [connections],
    );

    const ga4Def = ANALYTICS_PLATFORM_DEFINITIONS.ga4;

    if (loading) {
        return <LoadingState />;
    }

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>مارکتینگ</h1>
                            <p className={styles.subtitle}>
                                اتصال آنالیتیکس به پروژه فعلی و مشاهده داشبورد بومی هر پلتفرم — بدون ساخت گزارش از صفر و
                                بدون نیاز به لاگین مجدد. تیم توسعه تگ و داده را آماده می‌کند، تیم مارکتینگ داشبورد را ثبت
                                و مشاهده می‌کند.
                            </p>
                        </div>
                        <Link href="/marketing/connections/add" className={styles.primaryBtn}>
                            + اتصال جدید
                        </Link>
                    </header>

                    <div className={styles.statsBar}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{summary.total}</div>
                            <div className={styles.statLabel}>کل اتصال‌ها</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{summary.active}</div>
                            <div className={styles.statLabel}>اتصال‌های فعال</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{summary.ga4}</div>
                            <div className={styles.statLabel}>GA4</div>
                        </div>
                    </div>

                    <div className={styles.guideContainer}>
                        <div className={styles.guideHeader}>
                            <div className={styles.guideTitleGroup}>
                                <span className={styles.guideIcon}>📊</span>
                                <h2 className={styles.guideTitle}>چطور کار می‌کند؟</h2>
                            </div>
                            <span className={styles.guideBadge}>GA4 · Looker Studio</span>
                        </div>
                        <div className={styles.guideGrid}>
                            <div className={styles.guideCard}>
                                <h3>{ga4Def.setupGuide.developerTitle}</h3>
                                <ol>
                                    {ga4Def.setupGuide.developerSteps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                            <div className={styles.guideCard}>
                                <h3>{ga4Def.setupGuide.marketingTitle}</h3>
                                <ol>
                                    {ga4Def.setupGuide.marketingSteps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div className={styles.overviewGrid}>
                        <div className={styles.overviewCard}>
                            <h3>اتوماسیون</h3>
                            <p>تریگر، پترن پیامک، سناریوهای چندمرحله‌ای و لاگ ارسال — متصل به تنظیمات SMS.</p>
                            <Link href="/marketing/automation" className={`${styles.secondaryBtn} ${styles.overviewLink}`}>
                                اتوماسیون بازاریابی
                            </Link>
                        </div>
                        <div className={styles.overviewCard}>
                            <h3>همکاری</h3>
                            <p>مدیریت پارتنرها، پورسانت، تسویه حساب و کمپین‌های اختصاصی B2B.</p>
                            <Link href="/marketing/partnership" className={`${styles.secondaryBtn} ${styles.overviewLink}`}>
                                سیستم همکاری
                            </Link>
                        </div>
                        <div className={styles.overviewCard}>
                            <h3>بنرها</h3>
                            <p>
                                سیستم سه‌لایه نمایش بنر: جایگاه‌های صفحات (Placement)، کتابخانه خلاقیت‌ها (Creative) و
                                بنرها با زمان‌بندی، اولویت، چرخش وزنی و آمار CTR.
                            </p>
                            <Link href="/marketing/banners" className={`${styles.secondaryBtn} ${styles.overviewLink}`}>
                                مدیریت بنر
                            </Link>
                        </div>
                        <div className={styles.overviewCard}>
                            <h3>سایت‌مپ (SEO)</h3>
                            <p>
                                زیرساخت سایت‌مپ و ایندکس‌شدن در گوگل: گروه‌بندی محتوا، قوانین URL، تولید چندفایلی،
                                ممیزی، پایش سلامت، robots.txt و اطلاع‌رسانی فوری با IndexNow.
                            </p>
                            <Link href="/marketing/sitemap" className={`${styles.secondaryBtn} ${styles.overviewLink}`}>
                                مدیریت سایت‌مپ
                            </Link>
                        </div>
                        <div className={styles.overviewCard}>
                            <h3>اتصال‌ها</h3>
                            <p>
                                پلتفرم‌های آنالیتیکس متصل به این پروژه را مدیریت کنید: ساخت اتصال جدید، ویرایش لینک Embed،
                                فعال/غیرفعال‌کردن و حذف.
                            </p>
                            <Link href="/marketing/connections" className={`${styles.secondaryBtn} ${styles.overviewLink}`}>
                                مدیریت اتصال‌ها
                            </Link>
                        </div>
                        <div className={styles.overviewCard}>
                            <h3>داشبوردها</h3>
                            <p>
                                داشبورد بومی هر اتصال فعال را در یک صفحه نمایش دهید. رابط گوگل است و بدون لاگین گوگل قابل
                                مشاهده است.
                            </p>
                            <Link href="/marketing/dashboards" className={`${styles.secondaryBtn} ${styles.overviewLink}`}>
                                مشاهده داشبوردها
                            </Link>
                        </div>
                    </div>

                    <div className={styles.overviewGrid} style={{ marginTop: '1.25rem' }}>
                        {Object.values(ANALYTICS_PLATFORM_DEFINITIONS).map((def) => (
                            <div key={def.platform} className={`${styles.overviewCard} ${def.available ? '' : styles.comingSoon}`}>
                                <h3>
                                    {def.label}
                                    {!def.available && <span className={styles.availableNote}>{def.availabilityNote}</span>}
                                </h3>
                                <p>{def.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
