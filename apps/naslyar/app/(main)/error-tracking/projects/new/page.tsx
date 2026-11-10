'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useErrorTracking } from '../../lib/ErrorTrackingProvider';
import ProjectForm, { EMPTY_PROJECT_FORM, parseOrigins, type ProjectFormState } from '../../components/ProjectForm';
import { createProject } from '../../error-tracking-api';
import parentStyles from '../../../marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../ErrorTracking.module.scss';

export default function NewErrorTrackingProjectPage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const { reloadProjects } = useErrorTracking();
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (form: ProjectFormState) => {
        if (!token) return;
        try {
            setSaving(true);
            await createProject(baseUrl, token, {
                name: form.name,
                slug: form.slug || undefined,
                description: form.description,
                platform: form.platform,
                environment: form.environment,
                sourceMapOrigins: parseOrigins(form.sourceMapOrigins),
            });
            SuccessToaster({ message: 'پروژه ساخته شد' });
            reloadProjects();
            router.push('/error-tracking/projects');
        } catch (err) {
            ErrorToaster(err);
            setSaving(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>افزودن پروژه پایش خطا</h1>
                    <p className={styles.subtitle}>یک اپ یا سرویس با کلید اتصال اختصاصی ثبت کنید</p>
                </div>
                <Link href="/error-tracking/projects" className={styles.secondaryBtn}>بازگشت به فهرست</Link>
            </header>

            <section className={hrStyles.formGuideCard}>
                <h2>قبل از ثبت</h2>
                <p>
                    برای هر اپ یک پروژه جدا بسازید تا مشکلات قاطی نشوند. بعد از ذخیره، کلید را از فهرست کپی کنید و طبق
                    {' '}<Link href="/error-tracking/integration">راهنمای اتصال</Link> در SDK بگذارید.
                </p>
            </section>

            <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                <ProjectForm
                    initial={EMPTY_PROJECT_FORM}
                    saving={saving}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push('/error-tracking/projects')}
                    submitLabel="ثبت پروژه"
                />
            </div>
        </div>
    );
}
