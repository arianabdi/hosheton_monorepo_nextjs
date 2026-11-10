'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuPencil, LuPlus, LuSparkles, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import BannerSectionNav from '../components/BannerSectionNav';
import PlacementsGuide from '../components/PlacementsGuide';
import RowActionsMenu from '../components/RowActionsMenu';
import { deletePlacement, listPlacements } from '../banners-api';
import { seedStudioBannerSamples } from '../banners-sample';
import {
    BANNER_PAGE_TYPE_LABELS,
    type BannerPlacement,
} from '../banners.types';
import parentStyles from '../../Marketing.module.scss';
import styles from '../Banners.module.scss';

export default function BannerPlacementsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [placements, setPlacements] = useState<BannerPlacement[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setPlacements(await listPlacements(baseUrl, token));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleDelete = async (placement: BannerPlacement) => {
        if (!confirm(`جایگاه «${placement.key}» حذف شود؟`)) return;
        try {
            await deletePlacement(baseUrl, token!, placement._id);
            SuccessToaster({ message: 'جایگاه حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    /** درج ۴ جایگاه + خلاقیت‌ها + بنرهای نمونه hosheton_studio */
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

    if (loading && placements.length === 0) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>جایگاه‌های بنر (Placement)</h1>
                            <p className={parentStyles.subtitle}>
                                رجیستری جایگاه‌های مجاز صفحات — هر جایگاه یک key یکتا (مثل{' '}
                                <span className={styles.keyBadge}>home.hero</span>)، ابعاد و فرمت‌های مجاز دارد. تیم فنی
                                پروژه (hosheton_studio) بر اساس همین key باکس نمایش را در صفحات قرار می‌دهد.
                            </p>
                        </div>
                        <div className={styles.toolbarActions}>
                            <button type="button" className={parentStyles.secondaryBtn} disabled={seeding} onClick={handleSeed}>
                                <LuSparkles /> {seeding ? 'در حال افزودن...' : 'داده‌های نمونه استودیو'}
                            </button>
                            <Link href="/marketing/banners/placements/new" className={parentStyles.primaryBtn} style={{ textDecoration: 'none' }}>
                                <LuPlus /> جایگاه جدید
                            </Link>
                        </div>
                    </header>

                    <BannerSectionNav />

                    <PlacementsGuide />

                    {placements.length === 0 ? (
                        <div className={styles.emptyState}>
                            جایگاهی ثبت نشده —
                            {' '}<Link href="/marketing/banners/placements/new">اولین مورد را اضافه کنید</Link>
                            {' '}یا از «داده‌های نمونه استودیو» استفاده کنید.
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>Key</th>
                                        <th>نام</th>
                                        <th>نوع صفحه</th>
                                        <th>ابعاد مجاز</th>
                                        <th>فرمت‌ها</th>
                                        <th>چندتایی</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {placements.map((p) => (
                                        <tr key={p._id}>
                                            <td data-label="Key">
                                                <span className={styles.keyBadge}>{p.key}</span>
                                                {p.description && (
                                                    <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: '0.3rem' }}>
                                                        {p.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td data-label="نام" style={{ fontWeight: 600 }}>{p.name}</td>
                                            <td data-label="نوع صفحه">{BANNER_PAGE_TYPE_LABELS[p.pageType]}</td>
                                            <td data-label="ابعاد مجاز" className={styles.muted} style={{ direction: 'ltr' }}>
                                                {p.allowedWidth > 0 ? `${p.allowedWidth}×${p.allowedHeight}` : '—'}
                                                {p.aspectRatio ? ` (${p.aspectRatio})` : ''}
                                            </td>
                                            <td data-label="فرمت‌ها">
                                                <span className={styles.formatList}>
                                                    {(p.formats || []).map((f) => (
                                                        <span key={f} className={styles.formatItem}>
                                                            <span className={styles.formatDot} />
                                                            {f}
                                                        </span>
                                                    ))}
                                                </span>
                                            </td>
                                            <td data-label="چندتایی" className={styles.muted}>{p.supportsMultiple ? 'بله' : 'خیر'}</td>
                                            <td data-label="عملیات">
                                                <RowActionsMenu
                                                    items={[
                                                        {
                                                            label: 'ویرایش',
                                                            icon: <LuPencil size={13} />,
                                                            onClick: () => {
                                                                window.location.href = `/marketing/banners/placements/${p._id}/edit`;
                                                            },
                                                        },
                                                        {
                                                            label: 'حذف',
                                                            icon: <LuTrash2 size={13} />,
                                                            onClick: () => handleDelete(p),
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
