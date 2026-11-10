'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import BannerForm, { bannerToForm } from '../../../components/BannerForm';
import { getBannerById, listCreatives, listPlacements, updateBanner } from '../../../banners-api';
import type {
    Banner,
    BannerCreative,
    BannerForm as BannerFormState,
    BannerPlacement,
} from '../../../banners.types';
import parentStyles from '../../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../../Banners.module.scss';

export default function EditBannerPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const bannerId = params?.id;
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [banner, setBanner] = useState<Banner | null>(null);
    const [creatives, setCreatives] = useState<BannerCreative[]>([]);
    const [placements, setPlacements] = useState<BannerPlacement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!token || !bannerId) return;
        try {
            setLoading(true);
            const [b, c, p] = await Promise.all([
                getBannerById(baseUrl, token, bannerId),
                listCreatives(baseUrl, token),
                listPlacements(baseUrl, token),
            ]);
            setBanner(b);
            setCreatives(c);
            setPlacements(p);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, bannerId]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSubmit = async (form: BannerFormState) => {
        if (!token || !bannerId) return;
        try {
            setSaving(true);
            await updateBanner(baseUrl, token, bannerId, form);
            SuccessToaster({ message: 'بنر به‌روز شد' });
            router.push('/marketing/banners/list');
        } catch (e) {
            ErrorToaster(e);
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;
    if (!banner) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                        <div className={styles.emptyState}>بنر یافت نشد.</div>
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
                            <h1 className={parentStyles.mainTitle}>ویرایش بنر</h1>
                            <p className={parentStyles.subtitle}>{banner.title}</p>
                        </div>
                        <Link href="/marketing/banners/list" className={parentStyles.secondaryBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>راهنمای ویرایش</h2>
                        <p>
                            تغییر خلاقیت یا جایگاه بلافاصله روی نمایش استودیو اثر می‌گذارد اگر وضعیت «فعال» باشد.
                            برای خاموش کردن موقت، وضعیت را «متوقف» کنید تا آمار و تنظیمات حفظ شود.
                        </p>
                    </section>

                    <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                        <BannerForm
                            initial={bannerToForm(banner)}
                            creatives={creatives}
                            placements={placements}
                            saving={saving}
                            onSubmit={handleSubmit}
                            onCancel={() => router.push('/marketing/banners/list')}
                            submitLabel="ذخیره تغییرات"
                        />
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
