'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import CreativeForm, { creativeToForm } from '../../../components/CreativeForm';
import { getCreativeById, updateCreative } from '../../../banners-api';
import type { BannerCreative, BannerCreativeForm } from '../../../banners.types';
import parentStyles from '../../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../../Banners.module.scss';

export default function EditCreativePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const creativeId = params?.id;
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [creative, setCreative] = useState<BannerCreative | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!token || !creativeId) return;
        try {
            setLoading(true);
            setCreative(await getCreativeById(baseUrl, token, creativeId));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, creativeId]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSubmit = async (form: BannerCreativeForm) => {
        if (!token || !creativeId) return;
        try {
            setSaving(true);
            await updateCreative(baseUrl, token, creativeId, form);
            SuccessToaster({ message: 'خلاقیت به‌روز شد' });
            router.push('/marketing/banners/creatives');
        } catch (e) {
            ErrorToaster(e);
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;
    if (!creative) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                        <div className={styles.emptyState}>خلاقیت یافت نشد.</div>
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
                            <h1 className={parentStyles.mainTitle}>ویرایش خلاقیت</h1>
                            <p className={parentStyles.subtitle}>{creative.title}</p>
                        </div>
                        <Link href="/marketing/banners/creatives" className={parentStyles.secondaryBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>راهنمای ویرایش</h2>
                        <p>
                            عوض کردن تصویر روی همه بنرهایی که به این خلاقیت وصل‌اند اثر می‌گذارد. اگر موقتاً نباید دیده
                            شود، تیک «فعال» را بردارید تا بدون حذف بنرها از سایت برداشته شود.
                        </p>
                    </section>

                    <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                        <CreativeForm
                            initial={creativeToForm(creative)}
                            editMode
                            saving={saving}
                            onSubmit={handleSubmit}
                            onCancel={() => router.push('/marketing/banners/creatives')}
                            submitLabel="ذخیره تغییرات"
                        />
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
