'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import BannerForm from '../../components/BannerForm';
import { createBanner, listCreatives, listPlacements } from '../../banners-api';
import {
    EMPTY_BANNER_FORM,
    type BannerCreative,
    type BannerForm as BannerFormState,
    type BannerPlacement,
} from '../../banners.types';
import parentStyles from '../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../Banners.module.scss';

export default function NewBannerPage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [creatives, setCreatives] = useState<BannerCreative[]>([]);
    const [placements, setPlacements] = useState<BannerPlacement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [c, p] = await Promise.all([listCreatives(baseUrl, token), listPlacements(baseUrl, token)]);
            setCreatives(c);
            setPlacements(p);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSubmit = async (form: BannerFormState) => {
        if (!token) return;
        try {
            setSaving(true);
            await createBanner(baseUrl, token, form);
            SuccessToaster({ message: 'بنر ایجاد شد' });
            router.push('/marketing/banners/list');
        } catch (e) {
            ErrorToaster(e);
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>افزودن بنر جدید</h1>
                            <p className={parentStyles.subtitle}>
                                یک خلاقیت را به جایگاه‌های استودیو وصل کنید و قوانین نمایش را تعیین کنید
                            </p>
                        </div>
                        <Link href="/marketing/banners/list" className={parentStyles.secondaryBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>قبل از ثبت</h2>
                        <p>
                            اگر خلاقیت یا جایگاه ندارید، اول آن‌ها را در
                            {' '}<Link href="/marketing/banners/creatives">کتابخانه خلاقیت‌ها</Link>
                            {' '}و{' '}
                            <Link href="/marketing/banners/placements">جایگاه‌ها</Link> بسازید.
                            فقط وضعیت «فعال» روی سایت دیده می‌شود؛ برای تست می‌توانید پیش‌نویس ذخیره کنید.
                        </p>
                    </section>

                    <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                        <BannerForm
                            initial={EMPTY_BANNER_FORM}
                            creatives={creatives}
                            placements={placements}
                            saving={saving}
                            onSubmit={handleSubmit}
                            onCancel={() => router.push('/marketing/banners/list')}
                            submitLabel="ثبت بنر"
                        />
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
