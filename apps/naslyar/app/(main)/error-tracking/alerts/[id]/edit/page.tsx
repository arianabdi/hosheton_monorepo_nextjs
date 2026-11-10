'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import AlertRuleForm, { alertFormToPayload, type AlertRuleFormState } from '../../../components/AlertRuleForm';
import { fetchAlertRules, fetchProjects, updateAlertRule } from '../../../error-tracking-api';
import type { EtrAlertRule, EtrProject } from '../../../error-tracking.types';
import parentStyles from '../../../../marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../../ErrorTracking.module.scss';

export default function EditAlertRulePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const ruleId = params?.id;
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [rule, setRule] = useState<EtrAlertRule | null>(null);
    const [projects, setProjects] = useState<EtrProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!token || !ruleId) return;
        try {
            setLoading(true);
            const [rulesData, projectsData] = await Promise.all([
                fetchAlertRules(baseUrl, token),
                fetchProjects(baseUrl, token),
            ]);
            setRule((rulesData.rules || []).find((r) => r._id === ruleId) || null);
            setProjects(projectsData.projects || []);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, ruleId]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSubmit = async (form: AlertRuleFormState) => {
        if (!token || !ruleId) return;
        try {
            setSaving(true);
            await updateAlertRule(baseUrl, token, ruleId, alertFormToPayload(form));
            SuccessToaster({ message: 'قانون به‌روزرسانی شد' });
            router.push('/error-tracking/alerts');
        } catch (err) {
            ErrorToaster(err);
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;
    if (!rule) {
        return (
            <div className={`${styles.container} ${styles.rtl}`}>
                <p className={styles.hint}>قانون یافت نشد.</p>
                <Link href="/error-tracking/alerts">بازگشت به فهرست</Link>
            </div>
        );
    }

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>ویرایش قانون هشدار</h1>
                    <p className={styles.subtitle}>{rule.name}</p>
                </div>
                <Link href="/error-tracking/alerts" className={styles.secondaryBtn}>بازگشت به فهرست</Link>
            </header>

            <section className={hrStyles.formGuideCard}>
                <h2>راهنمای ویرایش</h2>
                <p>
                    عوض کردن مقصد یا cooldown از پیام بعدی اعمال می‌شود. برای خاموش کردن موقت، تیک فعال را بردارید تا
                    تاریخچه حفظ شود.
                </p>
            </section>

            <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                <AlertRuleForm
                    initial={{
                        projectId: rule.projectId,
                        name: rule.name,
                        type: rule.type,
                        spikeThreshold: String(rule.config?.spikeThreshold ?? 50),
                        windowMinutes: String(rule.config?.windowMinutes ?? 5),
                        levels: rule.config?.levels || [],
                        destinationType: rule.destination?.type || 'webhook',
                        url: rule.destination?.url || '',
                        botToken: rule.destination?.botToken || '',
                        chatId: rule.destination?.chatId || '',
                        cooldownMinutes: String(rule.cooldownMinutes ?? 30),
                        isEnabled: rule.isEnabled,
                    }}
                    projects={projects}
                    editMode
                    saving={saving}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push('/error-tracking/alerts')}
                    submitLabel="ذخیره تغییرات"
                />
            </div>
        </div>
    );
}
