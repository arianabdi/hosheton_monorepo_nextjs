'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuLayers, LuMegaphone, LuSquareStack, LuTarget } from 'react-icons/lu';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import BannerSectionNav from './components/BannerSectionNav';
import OverviewGuide from './components/OverviewGuide';
import { listBanners, listCreatives, listPlacements } from './banners-api';
import type { Banner, BannerCreative, BannerPlacement } from './banners.types';
import parentStyles from '../Marketing.module.scss';
import styles from './Banners.module.scss';

/**
 * نمای کلی مدیریت بنر — معماری سه‌لایه:
 * Placement (جایگاه) ← Creative (خلاقیت) ← Banner (نمایش)
 */
export default function BannersOverviewPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [placements, setPlacements] = useState<BannerPlacement[]>([]);
    const [creatives, setCreatives] = useState<BannerCreative[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [liveCount, setLiveCount] = useState(0);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [p, c, b] = await Promise.all([
                listPlacements(baseUrl, token),
                listCreatives(baseUrl, token),
                listBanners(baseUrl, token),
            ]);
            setPlacements(p);
            setCreatives(c);
            setBanners(b);
            const now = Date.now();
            setLiveCount(
                b.filter(
                    (x) =>
                        x.status === 'active' &&
                        (!x.startAt || new Date(x.startAt).getTime() <= now) &&
                        (!x.endAt || new Date(x.endAt).getTime() >= now),
                ).length,
            );
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) return <LoadingState />;

    const stats = [
        { label: 'جایگاه‌ها', value: placements.length, icon: <LuLayers /> },
        { label: 'خلاقیت‌ها', value: creatives.length, icon: <LuSquareStack /> },
        { label: 'بنرها', value: banners.length, icon: <LuTarget /> },
        { label: 'در حال نمایش', value: liveCount, icon: <LuMegaphone /> },
    ];

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>مدیریت بنر</h1>
                            <p className={parentStyles.subtitle}>
                                سیستم سه‌لایه نمایش بنر: جایگاه‌های صفحه (Placement)، کتابخانه خلاقیت‌ها (Creative) و
                                بنرها با زمان‌بندی، اولویت، چرخش وزنی و آمار. فرانت‌اند پروژه از Renderer API محتوای هر
                                جایگاه را می‌گیرد.
                            </p>
                        </div>
                        <Link href="/marketing/banners/list" className={parentStyles.primaryBtn}>
                            + بنر جدید
                        </Link>
                    </header>

                    <BannerSectionNav />

                    <OverviewGuide />

                    <div className={parentStyles.statsBar}>
                        {stats.map((s) => (
                            <div key={s.label} className={parentStyles.statCard}>
                                <span>
                                    {s.icon} {s.label}
                                </span>
                                <div className={parentStyles.statValue}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className={parentStyles.overviewGrid}>
                        <div className={styles.overviewCardBox}>
                            <h3>۱. جایگاه‌ها (Placement)</h3>
                            <p>
                                لوکیشن‌های ثابت صفحات مثل <span className={styles.keyBadge}>home.hero</span> یا{' '}
                                <span className={styles.keyBadge}>category.top</span> با ابعاد مجاز، فرمت‌ها و بنر
                                fallback. توسط تیم فنی تعریف می‌شود.
                            </p>
                            <Link href="/marketing/banners/placements" className={`${parentStyles.secondaryBtn} ${parentStyles.overviewLink}`}>
                                مدیریت جایگاه‌ها
                            </Link>
                        </div>
                        <div className={styles.overviewCardBox}>
                            <h3>۲. خلاقیت‌ها (Creative)</h3>
                            <p>
                                کتابخانه بنرها: تصویر برای دسکتاپ/تبلت/موبایل (انتخاب از ماژول مدیریت فایل)، متن و لینک
                                CTA، Alt، تگ و زبان. یک بار آپلود، استفاده در چند بنر.
                            </p>
                            <Link href="/marketing/banners/creatives" className={`${parentStyles.secondaryBtn} ${parentStyles.overviewLink}`}>
                                کتابخانه خلاقیت‌ها
                            </Link>
                        </div>
                        <div className={styles.overviewCardBox}>
                            <h3>۳. بنرها (نمایش)</h3>
                            <p>
                                کدام خلاقیت در کدام جایگاه، با چه زمان‌بندی، اولویت، چرخش وزنی، سقف نمایش و قوانین
                                هدف‌گیری (دستگاه، ورود کاربر و زبان) نمایش داده شود.
                            </p>
                            <Link href="/marketing/banners/list" className={`${parentStyles.secondaryBtn} ${parentStyles.overviewLink}`}>
                                مدیریت بنرها
                            </Link>
                        </div>
                        <div className={styles.overviewCardBox}>
                            <h3>۴. آمار</h3>
                            <p>
                                Impression و Click هر بنر از طریق tracking endpoint ثبت و به‌صورت CTR گزارش می‌شود.
                            </p>
                            <Link href="/marketing/banners/analytics" className={`${parentStyles.secondaryBtn} ${parentStyles.overviewLink}`}>
                                مشاهده آمار
                            </Link>
                        </div>
                    </div>

                    {placements.length === 0 && (
                        <div className={styles.emptyState} style={{ marginTop: '1.5rem' }}>
                            هنوز جایگاهی تعریف نشده — برای شروع{' '}
                            <Link href="/marketing/banners/placements">یک جایگاه (مثل home.hero)</Link> بسازید.
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
