'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import CreativeForm from '../../components/CreativeForm';
import { createCreative } from '../../banners-api';
import { EMPTY_CREATIVE_FORM, type BannerCreativeForm } from '../../banners.types';
import parentStyles from '../../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../Banners.module.scss';

export default function NewCreativePage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (form: BannerCreativeForm) => {
        if (!token) return;
        try {
            setSaving(true);
            await createCreative(baseUrl, token, form);
            SuccessToaster({ message: 'خلاقیت ایجاد شد' });
            router.push('/marketing/banners/creatives');
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
                            <h1 className={parentStyles.mainTitle}>افزودن خلاقیت جدید</h1>
                            <p className={parentStyles.subtitle}>
                                فایل بنر هر دستگاه را از مدیریت فایل انتخاب کنید؛ بعد در بخش بنرها به جایگاه وصل می‌شود
                            </p>
                        </div>
                        <Link href="/marketing/banners/creatives" className={parentStyles.secondaryBtn}>
                            بازگشت به فهرست
                        </Link>
                    </header>

                    <section className={hrStyles.formGuideCard}>
                        <h2>قبل از ثبت</h2>
                        <p>
                            نسبت تصویر را از
                            {' '}<Link href="/marketing/banners/placements">جایگاه‌ها</Link>
                            {' '}بردارید تا فایل برش نخورد. حداقل یک دستگاه کافی است. بعد از ذخیره، از
                            {' '}<Link href="/marketing/banners/list/new">بنر جدید</Link>
                            {' '}این خلاقیت را به صفحه استودیو وصل کنید.
                        </p>
                    </section>

                    <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                        <CreativeForm
                            initial={EMPTY_CREATIVE_FORM}
                            onSubmit={handleSubmit}
                            saving={saving}
                            submitLabel="ثبت خلاقیت"
                            onCancel={() => router.push('/marketing/banners/creatives')}
                        />
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
