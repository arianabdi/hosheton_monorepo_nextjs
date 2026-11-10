'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuPencil, LuPlus, LuPower, LuSparkles, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import BannerSectionNav from '../components/BannerSectionNav';
import RowActionsMenu from '../components/RowActionsMenu';
import CreativeGuide from '../components/CreativeGuide';
import { deleteCreative, listCreatives, updateCreative } from '../banners-api';
import { seedStudioBannerSamples } from '../banners-sample';
import {
    CREATIVE_DEVICE_LABELS,
    type BannerCreative,
} from '../banners.types';
import parentStyles from '../../Marketing.module.scss';
import styles from '../Banners.module.scss';

export default function BannerCreativesPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [creatives, setCreatives] = useState<BannerCreative[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setCreatives(await listCreatives(baseUrl, token));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleToggleActive = async (creative: BannerCreative) => {
        try {
            await updateCreative(baseUrl, token!, creative._id, { isActive: !creative.isActive });
            SuccessToaster({ message: creative.isActive ? 'خلاقیت غیرفعال شد' : 'خلاقیت فعال شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const handleDelete = async (creative: BannerCreative) => {
        if (!confirm(`خلاقیت «${creative.title}» حذف شود؟`)) return;
        try {
            await deleteCreative(baseUrl, token!, creative._id);
            SuccessToaster({ message: 'خلاقیت حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

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

    if (loading && creatives.length === 0) return <LoadingState />;

    const mainThumb = (creative: BannerCreative) =>
        creative.assets?.find((a) => a.device === 'desktop')?.imageUrl ||
        creative.assets?.[0]?.imageUrl ||
        '';

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>کتابخانه خلاقیت‌ها (Creative)</h1>
                            <p className={parentStyles.subtitle}>
                                هر خلاقیت یک بنر مستقل است: تصویر برای هر دستگاه (انتخاب از ماژول مدیریت فایل)، متن و
                                لینک CTA، متن جایگزین برای سئو، تگ و زبان. خلاقیت‌ها توسط بنرها به جایگاه‌ها متصل
                                می‌شوند.
                            </p>
                        </div>
                        <div className={styles.toolbarActions}>
                            <button type="button" className={parentStyles.secondaryBtn} disabled={seeding} onClick={handleSeed}>
                                <LuSparkles /> {seeding ? 'در حال افزودن...' : 'داده‌های نمونه استودیو'}
                            </button>
                            <Link href="/marketing/banners/creatives/new" className={parentStyles.primaryBtn} style={{ textDecoration: 'none' }}>
                                <LuPlus /> خلاقیت جدید
                            </Link>
                        </div>
                    </header>

                    <BannerSectionNav />

                    <CreativeGuide />

                    {creatives.length === 0 ? (
                        <div className={styles.emptyState}>
                            هنوز خلاقیتی ساخته نشده —
                            {' '}<Link href="/marketing/banners/creatives/new">اولین مورد را اضافه کنید</Link>
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>پیش‌نمایش</th>
                                        <th>عنوان</th>
                                        <th>CTA</th>
                                        <th>نسخه‌ها</th>
                                        <th>تگ‌ها</th>
                                        <th>زبان</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {creatives.map((creative) => (
                                        <tr key={creative._id}>
                                            <td data-label="پیش‌نمایش">
                                                {mainThumb(creative) ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={mainThumb(creative)}
                                                        alt={creative.alt || creative.title}
                                                        className={styles.bannerThumb}
                                                    />
                                                ) : (
                                                    <div className={styles.thumbFallback}>—</div>
                                                )}
                                            </td>
                                            <td data-label="عنوان" style={{ fontWeight: 600 }}>{creative.title}</td>
                                            <td data-label="CTA">
                                                {creative.ctaText ? (
                                                    <>
                                                        {creative.ctaText}
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.6, direction: 'ltr', textAlign: 'left' }}>
                                                            {creative.ctaUrl}
                                                        </div>
                                                    </>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td data-label="نسخه‌ها">
                                                <div className={styles.tagRow}>
                                                    {(creative.assets || []).map((a) => (
                                                        <span key={a.device} className={styles.tag}>
                                                            {CREATIVE_DEVICE_LABELS[a.device]}
                                                            {a.width > 0 ? ` ${a.width}×${a.height}` : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td data-label="تگ‌ها">
                                                <div className={styles.tagRow}>
                                                    {(creative.tags || []).map((t) => (
                                                        <span key={t} className={styles.tag}>
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td data-label="زبان" className={styles.muted}>{creative.language}</td>
                                            <td data-label="وضعیت">
                                                <span
                                                    className={`${styles.statusBadge} ${creative.isActive ? styles.active : styles.inactive}`}
                                                >
                                                    {creative.isActive ? 'فعال' : 'غیرفعال'}
                                                </span>
                                            </td>
                                            <td data-label="عملیات">
                                                <RowActionsMenu
                                                    items={[
                                                        {
                                                            label: 'ویرایش',
                                                            icon: <LuPencil size={13} />,
                                                            onClick: () => {
                                                                window.location.href = `/marketing/banners/creatives/${creative._id}/edit`;
                                                            },
                                                        },
                                                        {
                                                            label: creative.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی',
                                                            icon: <LuPower size={13} />,
                                                            onClick: () => handleToggleActive(creative),
                                                        },
                                                        {
                                                            label: 'حذف',
                                                            icon: <LuTrash2 size={13} />,
                                                            onClick: () => handleDelete(creative),
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
