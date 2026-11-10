'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuPause, LuPencil, LuPlay, LuPlus, LuSparkles, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { isoToJalaliString } from '@/app/(main)/accounting/jalali.client';
import BannerSectionNav from '../components/BannerSectionNav';
import BannersGuide from '../components/BannersGuide';
import RowActionsMenu from '../components/RowActionsMenu';
import { deleteBanner, listBanners, listCreatives, updateBanner } from '../banners-api';
import { seedStudioBannerSamples } from '../banners-sample';
import {
    BANNER_STATUS_LABELS,
    type Banner,
    type BannerStatusType,
    type BannerCreative,
} from '../banners.types';
import parentStyles from '../../Marketing.module.scss';
import styles from '../Banners.module.scss';

const STATUS_TABS = [
    { id: 'all', label: 'همه' },
    ...(Object.keys(BANNER_STATUS_LABELS) as BannerStatusType[]).map((s) => ({
        id: s,
        label: BANNER_STATUS_LABELS[s],
    })),
];

export default function BannerListPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [banners, setBanners] = useState<Banner[]>([]);
    const [creatives, setCreatives] = useState<BannerCreative[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [seeding, setSeeding] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [b, c] = await Promise.all([listBanners(baseUrl, token), listCreatives(baseUrl, token)]);
            setBanners(b);
            setCreatives(c);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = (tab === 'all' ? banners : banners.filter((b) => b.status === tab)).slice();

    const creativeTitle = (id: string) => creatives.find((c) => c._id === id)?.title || '—';

    const handleSetStatus = async (banner: Banner, status: BannerStatusType) => {
        try {
            await updateBanner(baseUrl, token!, banner._id, { status });
            SuccessToaster({ message: 'وضعیت بنر تغییر کرد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const handleDelete = async (banner: Banner) => {
        if (!confirm(`بنر «${banner.title}» حذف شود؟`)) return;
        try {
            await deleteBanner(baseUrl, token!, banner._id);
            SuccessToaster({ message: 'بنر حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    /** درج جایگاه‌ها + خلاقیت‌ها + بنرهای نمونه hosheton_studio */
    const handleSeed = async () => {
        if (!confirm('داده‌های نمونه استودیو (۴ جایگاه + خلاقیت‌ها + بنرهای فعال) اضافه شود؟ موارد موجود تکرار نمی‌شوند.')) return;
        try {
            setSeeding(true);
            const res = await seedStudioBannerSamples(baseUrl, token!);
            SuccessToaster({
                message: `نمونه‌ها اضافه شد — ${res.placements} جایگاه، ${res.creatives} خلاقیت، ${res.banners} بنر`,
            });
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSeeding(false);
        }
    };

    if (loading && banners.length === 0) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>بنرها</h1>
                            <p className={parentStyles.subtitle}>
                                هر بنر یک خلاقیت را به یک یا چند جایگاه متصل می‌کند: زمان‌بندی، بازه ساعتی، اولویت در
                                تداخل، چرخش وزنی، سقف نمایش و قوانین هدف‌گیری. فقط بنرهای «فعال» در Renderer نمایش داده
                                می‌شوند.
                            </p>
                        </div>
                        <div className={styles.toolbarActions}>
                            <button type="button" className={parentStyles.secondaryBtn} disabled={seeding} onClick={handleSeed}>
                                <LuSparkles /> {seeding ? 'در حال افزودن...' : 'داده‌های نمونه استودیو'}
                            </button>
                            <Link href="/marketing/banners/list/new" className={parentStyles.primaryBtn} style={{ textDecoration: 'none' }}>
                                <LuPlus /> بنر جدید
                            </Link>
                        </div>
                    </header>

                    <BannerSectionNav />

                    <BannersGuide />

                    <SimpleLineTabs tabs={STATUS_TABS} activeTab={tab} onChange={setTab} />

                    {filtered.length === 0 ? (
                        <div className={styles.emptyState}>
                            {tab === 'all' ? (
                                <>
                                    هنوز بنری ساخته نشده —
                                    {' '}<Link href="/marketing/banners/list/new">اولین مورد را اضافه کنید</Link>
                                </>
                            ) : (
                                'بنری در این وضعیت نیست.'
                            )}
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>عنوان</th>
                                        <th>خلاقیت</th>
                                        <th>جایگاه‌ها</th>
                                        <th>زمان‌بندی</th>
                                        <th>اولویت / وزن</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered
                                        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
                                        .map((banner) => (
                                            <tr key={banner._id}>
                                                <td data-label="عنوان" style={{ fontWeight: 600 }}>
                                                    {banner.title}
                                                    {banner.description && (
                                                        <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                                                            {banner.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td data-label="خلاقیت">{creativeTitle(banner.creativeId)}</td>
                                                <td data-label="جایگاه‌ها">
                                                    <div className={styles.tagRow}>
                                                        {(banner.placementKeys || []).map((k) => (
                                                            <span key={k} className={styles.keyBadge}>
                                                                {k}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td data-label="زمان‌بندی" className={styles.muted}>
                                                    {banner.startAt || banner.endAt ? (
                                                        <>
                                                            {banner.startAt ? isoToJalaliString(banner.startAt) : '...'}
                                                            {' تا '}
                                                            {banner.endAt ? isoToJalaliString(banner.endAt) : '...'}
                                                            {(banner.dailyStartHour ?? 0) > 0 ||
                                                            (banner.dailyEndHour ?? 24) < 24
                                                                ? ` — ساعات ${banner.dailyStartHour} تا ${banner.dailyEndHour}`
                                                                : ''}
                                                        </>
                                                    ) : (
                                                        'همیشه'
                                                    )}
                                                </td>
                                                <td data-label="اولویت / وزن" className={styles.muted}>
                                                    P{banner.priority} / W{banner.weight}
                                                    {banner.frequencyCap?.perDay ? ` — ${banner.frequencyCap.perDay}×در روز` : ''}
                                                </td>
                                                <td data-label="وضعیت">
                                                    <span
                                                        className={`${styles.statusBadge} ${banner.status === 'active' ? styles.active : styles.inactive}`}
                                                    >
                                                        {BANNER_STATUS_LABELS[banner.status]}
                                                    </span>
                                                </td>
                                                <td data-label="عملیات">
                                                    <RowActionsMenu
                                                        items={[
                                                            {
                                                                label: 'ویرایش',
                                                                icon: <LuPencil size={13} />,
                                                                onClick: () => {
                                                                    window.location.href = `/marketing/banners/list/${banner._id}/edit`;
                                                                },
                                                            },
                                                            banner.status === 'active'
                                                                ? {
                                                                      label: 'توقف نمایش',
                                                                      icon: <LuPause size={13} />,
                                                                      onClick: () => handleSetStatus(banner, 'paused'),
                                                                  }
                                                                : {
                                                                      label: 'فعال‌سازی',
                                                                      icon: <LuPlay size={13} />,
                                                                      onClick: () => handleSetStatus(banner, 'active'),
                                                                  },
                                                            {
                                                                label: 'حذف',
                                                                icon: <LuTrash2 size={13} />,
                                                                onClick: () => handleDelete(banner),
                                                                danger: true,
                                                            },
                                                        ]}
                                                    />
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
