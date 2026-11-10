'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import PlacementForm from '../../components/PlacementForm';
import { createPlacement } from '../../banners-api';
import { EMPTY_PLACEMENT_FORM } from '../../banners.types';
import parentStyles from '../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../Banners.module.scss';

export default function NewPlacementPage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (form: typeof EMPTY_PLACEMENT_FORM) => {
        if (!token || !form.key.trim() || !form.name.trim()) return;
        try {
            setSaving(true);
            await createPlacement(baseUrl, token, { ...form, key: form.key.trim() });
            SuccessToaster({ message: 'جایگاه ایجاد شد' });
            router.push('/marketing/banners/placements');
        } catch (e) {
            ErrorToaster(e);
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>افزودن جایگاه جدید</h1>
                            <p className={parentStyles.subtitle}>
                                یک لوکیشن ثابت روی صفحات استودیو تعریف کنید؛ key باید با کد فرانت یکی باشد
                            </p>
                        </div>
                        <Link href="/marketing/banners/placements" className={parentStyles.secondaryBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>قبل از ثبت</h2>
                        <p>
                            key را با تیم فنی چک کنید یا از کلیدهای آماده مثل
                            {' '}<code>studio.sidebar.square</code> استفاده کنید. بعد از ساخت، key عوض نمی‌شود.
                            برای شروع سریع می‌توانید از «داده‌های نمونه استودیو» در
                            {' '}<Link href="/marketing/banners/placements">فهرست جایگاه‌ها</Link> استفاده کنید.
                        </p>
                    </section>

                    <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                        <PlacementForm
                            initial={EMPTY_PLACEMENT_FORM}
                            onSubmit={handleSubmit}
                            saving={saving}
                            submitLabel="ثبت جایگاه"
                            onCancel={() => router.push('/marketing/banners/placements')}
                        />
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
