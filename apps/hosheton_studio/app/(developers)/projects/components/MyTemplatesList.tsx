'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trans, useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../lib/api-client';
import { mediaApi } from '../lib/media-api';
import type { MediaWorkflowTemplate } from '../types/media-api';
import { TemplateItem } from './TemplateItem';
import styles from './MyTemplatesList.module.scss';
import pageStyles from '../ProjectsPage.module.scss';
import { usePageLoading } from '@/app/components/PageTransition';

export function MyTemplatesList() {
    const { t } = useTranslation('projects');
    const router = useRouter();
    const [templates, setTemplates] = useState<MediaWorkflowTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { templates: fetched } = await mediaApi.listMyTemplates();
            setTemplates(fetched ?? []);
        } catch (err) {
            setError(getApiErrorMessage(err, t('load_templates_error')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleSubmitReview = async (template: MediaWorkflowTemplate) => {
        setBusyId(template._id);
        setError(null);
        try {
            const updated = await mediaApi.submitTemplateForReview(template._id);
            setTemplates((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        } catch (err) {
            setError(getApiErrorMessage(err, t('review_error')));
        } finally {
            setBusyId(null);
        }
    };

    const handleUseTemplate = async (template: MediaWorkflowTemplate) => {
        setBusyId(template._id);
        setError(null);
        try {
            const project = await mediaApi.createProject({
                title: t('copy_suffix', { title: template.title }),
                description: template.description,
                templateId: template._id,
            });
            router.push(`/projects/${project._id}`);
        } catch (err) {
            setError(getApiErrorMessage(err, t('from_template_error')));
            setBusyId(null);
        }
    };

    const handleDelete = async (template: MediaWorkflowTemplate) => {
        if (!confirm(t('delete_template_confirm', { title: template.title }))) return;
        setBusyId(template._id);
        setError(null);
        try {
            await mediaApi.deleteTemplate(template._id);
            setTemplates((prev) => prev.filter((item) => item._id !== template._id));
        } catch (err) {
            setError(getApiErrorMessage(err, t('delete_template_error')));
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return <p className={pageStyles.emptyState}>{t('loading_templates')}</p>;
    }

    return (
        <div>
            {error && <div className={styles.errorBox}>{error}</div>}

            {templates.length === 0 ? (
                <div className={styles.emptyBox}>
                    <p>{t('empty_templates')}</p>
                    <span className={styles.emptyHint}>
                        <Trans
                            i18nKey="empty_templates_hint"
                            ns="projects"
                            components={{ new: <Link href="/templates/new" /> }}
                        />
                    </span>
                </div>
            ) : (
                <div className={styles.templateListView}>
                    <div className={styles.listHeader}>
                        <span>{t('col_template')}</span>
                        <span>{t('col_desc')}</span>
                        <span>{t('col_workflow')}</span>
                        <span>{t('col_visibility')}</span>
                        <span>{t('col_usage')}</span>
                        <span>{t('col_dates')}</span>
                        <span>{t('col_actions')}</span>
                    </div>
                    <div className={styles.templateList}>
                        {templates.map((template) => (
                            <TemplateItem
                                key={template._id}
                                template={template}
                                busy={busyId === template._id}
                                onSubmitReview={() => handleSubmitReview(template)}
                                onUse={() => handleUseTemplate(template)}
                                onDelete={() => handleDelete(template)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
