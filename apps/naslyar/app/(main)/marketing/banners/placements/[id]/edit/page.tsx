'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import PlacementForm from '../../../components/PlacementForm';
import { getPlacementById, updatePlacement } from '../../../banners-api';
import type { BannerPlacement, BannerPlacementForm } from '../../../banners.types';
import parentStyles from '../../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../../Banners.module.scss';

export default function EditPlacementPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const placementId = params?.id;
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [placement, setPlacement] = useState<BannerPlacement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!token || !placementId) return;
        try {
            setLoading(true);
            setPlacement(await getPlacementById(baseUrl, token, placementId));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, placementId]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSubmit = async (form: BannerPlacementForm) => {
        if (!token || !placementId) return;
        try {
            setSaving(true);
            await updatePlacement(baseUrl, token, placementId, form);
            SuccessToaster({ message: 'جایگاه به‌روز شد' });
            router.push('/marketing/banners/placements');
        } catch (e) {
            ErrorToaster(e);
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;
    if (!placement) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                        <div className={styles.emptyState}>جایگاه یافت نشد.</div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>ویرایش جایگاه</h1>
                            <p className={parentStyles.subtitle}>
                                {placement.name} — <span className={styles.keyBadge}>{placement.key}</span>
                            </p>
                        </div>
                        <Link href="/marketing/banners/placements" className={parentStyles.secondaryBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>راهنمای ویرایش</h2>
                        <p>
                            نام، ابعاد و فرمت را می‌توانید عوض کنید؛ key قفل است. قفل نسبت کمک می‌کند عرض و ارتفاع
                            هم‌نسبت بمانند. تغییر ابعاد روی بنرهای متصل اثر نمی‌گذارد مگر اینکه فایل خلاقیت را هم عوض کنید.
                        </p>
                    </section>

                    <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                        <PlacementForm
                            initial={{
                                key: placement.key,
                                name: placement.name,
                                description: placement.description || '',
                                pageType: placement.pageType,
                                allowedWidth: placement.allowedWidth,
                                allowedHeight: placement.allowedHeight,
                                aspectRatio: placement.aspectRatio || '',
                                formats: placement.formats?.length ? placement.formats : ['jpg', 'png', 'webp'],
                                supportsMultiple: placement.supportsMultiple,
                                fallbackCreativeId: placement.fallbackCreativeId || '',
                            }}
                            editMode
                            saving={saving}
                            onSubmit={handleSubmit}
                            onCancel={() => router.push('/marketing/banners/placements')}
                            submitLabel="ذخیره تغییرات"
                        />
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
