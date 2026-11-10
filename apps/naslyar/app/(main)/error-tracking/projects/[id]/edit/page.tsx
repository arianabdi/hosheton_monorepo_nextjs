'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useErrorTracking } from '../../../lib/ErrorTrackingProvider';
import ProjectForm, { parseOrigins, type ProjectFormState } from '../../../components/ProjectForm';
import { fetchProjects, updateProject } from '../../../error-tracking-api';
import type { EtrProject } from '../../../error-tracking.types';
import parentStyles from '../../../../marketing/Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '../../../ErrorTracking.module.scss';

export default function EditErrorTrackingProjectPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const projectId = params?.id;
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const { reloadProjects } = useErrorTracking();
    const [project, setProject] = useState<EtrProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!token || !projectId) return;
        try {
            setLoading(true);
            const data = await fetchProjects(baseUrl, token);
            setProject((data.projects || []).find((p) => p._id === projectId) || null);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, projectId]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSubmit = async (form: ProjectFormState) => {
        if (!token || !projectId) return;
        try {
            setSaving(true);
            await updateProject(baseUrl, token, projectId, {
                name: form.name,
                description: form.description,
                platform: form.platform,
                environment: form.environment,
                sourceMapOrigins: parseOrigins(form.sourceMapOrigins),
            });
            SuccessToaster({ message: 'پروژه به‌روزرسانی شد' });
            reloadProjects();
            router.push('/error-tracking/projects');
        } catch (err) {
            ErrorToaster(err);
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;
    if (!project) {
        return (
            <div className={`${styles.container} ${styles.rtl}`}>
                <p className={styles.hint}>پروژه یافت نشد.</p>
                <Link href="/error-tracking/projects">بازگشت به فهرست</Link>
            </div>
        );
    }

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>ویرایش پروژه</h1>
                    <p className={styles.subtitle}>{project.name}</p>
                </div>
                <Link href="/error-tracking/projects" className={styles.secondaryBtn}>بازگشت به فهرست</Link>
            </header>

            <section className={hrStyles.formGuideCard}>
                <h2>راهنمای ویرایش</h2>
                <p>
                    نام و محیط را می‌توانید عوض کنید؛ Slug و کلید قفل‌اند. برای کلید جدید از فهرست «چرخش کلید» استفاده کنید
                    و بعد SDK را به‌روز کنید.
                </p>
            </section>

            <div className={`${parentStyles.formCard} ${styles.formPageWrap}`}>
                <ProjectForm
                    initial={{
                        name: project.name,
                        slug: project.slug,
                        description: project.description || '',
                        platform: project.platform || 'node',
                        environment: project.environment || 'production',
                        sourceMapOrigins: (project.sourceMapOrigins || []).join('\n'),
                    }}
                    editMode
                    saving={saving}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push('/error-tracking/projects')}
                    submitLabel="ذخیره تغییرات"
                    sourceMapToken={project.sourceMapToken}
                />
            </div>
        </div>
    );
}
