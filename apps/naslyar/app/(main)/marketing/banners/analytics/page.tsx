'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuMousePointerClick, LuRefreshCw, LuEye } from 'react-icons/lu';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import BannerSectionNav from '../components/BannerSectionNav';
import AnalyticsGuide from '../components/AnalyticsGuide';
import { getBannerAnalytics, listBanners } from '../banners-api';
import type { Banner, BannerStat } from '../banners.types';
import parentStyles from '../../Marketing.module.scss';
import styles from '../Banners.module.scss';

export default function BannerAnalyticsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<BannerStat[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [s, b] = await Promise.all([getBannerAnalytics(baseUrl, token), listBanners(baseUrl, token)]);
            setStats(s);
            setBanners(b);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const totals = useMemo(
        () =>
            stats.reduce(
                (acc, s) => ({ impressions: acc.impressions + s.impressions, clicks: acc.clicks + s.clicks }),
                { impressions: 0, clicks: 0 },
            ),
        [stats],
    );

    const bannerName = (id: string) => banners.find((b) => b._id === id)?.title || 'بنر حذف‌شده';

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>آمار بنرها (Impression / Click / CTR)</h1>
                            <p className={parentStyles.subtitle}>
                                رویدادهای هر بنر از طریق <span className={styles.keyBadge}>POST /api/marketing/banners/track</span>{' '}
                                ثبت می‌شود؛ فرانت‌اند پروژه این URLها را در خروجی Renderer به‌صورت{' '}
                                <span className={styles.keyBadge}>tracking.impression</span> و{' '}
                                <span className={styles.keyBadge}>tracking.click</span> دریافت می‌کند.
                            </p>
                        </div>
                        <button type="button" className={parentStyles.secondaryBtn} onClick={() => void load()}>
                            <LuRefreshCw /> به‌روزرسانی
                        </button>
                    </header>

                    <BannerSectionNav />

                    <AnalyticsGuide />

                    <div className={parentStyles.statsBar}>
                        <div className={parentStyles.statCard}>
                            <span>
                                <LuEye /> Impression
                            </span>
                            <div className={parentStyles.statValue}>{totals.impressions.toLocaleString('fa-IR')}</div>
                        </div>
                        <div className={parentStyles.statCard}>
                            <span>
                                <LuMousePointerClick /> Click
                            </span>
                            <div className={parentStyles.statValue}>{totals.clicks.toLocaleString('fa-IR')}</div>
                        </div>
                        <div className={parentStyles.statCard}>
                            <span>CTR کل</span>
                            <div className={parentStyles.statValue}>
                                {totals.impressions > 0
                                    ? `${((totals.clicks / totals.impressions) * 100).toFixed(2)}%`
                                    : '—'}
                            </div>
                        </div>
                    </div>

                    {stats.length === 0 ? (
                        <div className={styles.emptyState}>
                            هنوز رویدادی ثبت نشده — وقتی فرانت‌اند پروژه بنرها را نمایش دهد، آمار اینجا جمع می‌شود.
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>بنر</th>
                                        <th>Impression</th>
                                        <th>Click</th>
                                        <th>CTR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map((s) => (
                                        <tr key={s.bannerId}>
                                            <td data-label="بنر" style={{ fontWeight: 600 }}>{bannerName(s.bannerId)}</td>
                                            <td data-label="Impression">{s.impressions.toLocaleString('fa-IR')}</td>
                                            <td data-label="Click">{s.clicks.toLocaleString('fa-IR')}</td>
                                            <td data-label="CTR">
                                                <span className={styles.tag}>{s.ctr}%</span>
                                            </td>
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
