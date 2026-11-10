'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import AlertRuleForm, { EMPTY_ALERT_FORM, alertFormToPayload, type AlertRuleFormState } from '../../components/AlertRuleForm';
import { createAlertRule, fetchProjects } from '../../error-tracking-api';
import type { EtrProject } from '../../error-tracking.types';
import parentStyles from '../../../marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../ErrorTracking.module.scss';

export default function NewAlertRulePage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [projects, setProjects] = useState<EtrProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await fetchProjects(baseUrl, token);
            setProjects(data.projects || []);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSubmit = async (form: AlertRuleFormState) => {
        if (!token) return;
        try {
            setSaving(true);
            await createAlertRule(baseUrl, token, alertFormToPayload(form));
            SuccessToaster({ message: 'قانون هشدار ساخته شد' });
            router.push('/error-tracking/alerts');
        } catch (err) {
            ErrorToaster(err);
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>افزودن قانون هشدار</h1>
                    <p className={styles.subtitle}>مشخص کنید چه خطایی، به کجا خبر داده شود</p>
                </div>
                <Link href="/error-tracking/alerts" className={styles.secondaryBtn}>بازگشت به فهرست</Link>
            </header>

            <section className={hrStyles.formGuideCard}>
                <h2>قبل از ثبت</h2>
                <p>
                    اگر پروژه‌ای ندارید اول از{' '}
                    <Link href="/error-tracking/projects/new">پروژه جدید</Link> بسازید. برای شروع، نوع «مشکل جدید»
                    و مقصد تلگرام یا Webhook کافی است.
                </p>
            </section>

            <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                <AlertRuleForm
                    initial={{ ...EMPTY_ALERT_FORM, projectId: projects[0]?._id || '' }}
                    projects={projects}
                    saving={saving}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push('/error-tracking/alerts')}
                    submitLabel="ثبت قانون"
                />
            </div>
        </div>
    );
}
