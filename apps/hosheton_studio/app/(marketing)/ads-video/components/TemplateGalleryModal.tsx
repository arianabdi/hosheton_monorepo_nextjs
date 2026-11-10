'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuLayoutTemplate, LuLoaderCircle, LuPlus, LuTrash2 } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { adsVideoApi, type AdsTemplate } from '../lib/ads-video-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import styles from '../AdsVideo.module.scss';

export interface TemplateGalleryModalProps {
    open: boolean;
    onClose(): void;
    onUseTemplate(template: AdsTemplate): void;
}

/**
 * گالری قالب‌کات‌های ads-video — کاملاً مستقل از قالب‌های workflow خود اپلیکیشن.
 */
export function TemplateGalleryModal({ open, onClose, onUseTemplate }: TemplateGalleryModalProps) {
    const { t } = useTranslation('adsVideo');
    const [templates, setTemplates] = useState<AdsTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adsVideoApi.listTemplates();
            setTemplates(res.templates || []);
        } catch {
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) void load();
    }, [open, load]);

    const handleDelete = async (template: AdsTemplate) => {
        if (!window.confirm(t('template_delete_confirm', { name: template.name }))) return;
        setDeletingId(template._id);
        try {
            await adsVideoApi.deleteTemplate(template._id);
            setTemplates((prev) => prev.filter((item) => item._id !== template._id));
        } catch (error) {
            window.alert(getApiErrorMessage(error, t('err_delete_template')));
        } finally {
            setDeletingId('');
        }
    };

    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            size="lg"
            sheetTitle={t('templates_title')}
            component={(
                <div className={styles.modalTheme}>
                    <div className={styles.modalHead}>
                        <h3>
                            <LuLayoutTemplate size={16} />
                            {t('templates_title')}
                        </h3>
                    </div>

                    <p className={styles.modalHint}>{t('templates_hint')}</p>

                    {loading ? (
                        <div className={styles.modalLoading}>
                            <LuLoaderCircle size={22} className={styles.spin} />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className={styles.modalEmpty}>{t('templates_empty')}</div>
                    ) : (
                        <div className={styles.templateGrid}>
                            {templates.map((template) => (
                                <div key={template._id} className={styles.templateCard}>
                                    <div className={styles.templateThumb}>
                                        {template.thumbnailUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={template.thumbnailUrl} alt={template.name} />
                                        ) : (
                                            <LuLayoutTemplate size={26} />
                                        )}
                                    </div>
                                    <div className={styles.templateMeta}>
                                        <strong>{template.name}</strong>
                                        <span>
                                            {t('seconds_short', { n: template.durationSeconds })} · {template.aspectRatio || '16:9'}
                                            {template.category ? ` · ${template.category}` : ''}
                                        </span>
                                        {template.description && <em>{template.description}</em>}
                                    </div>
                                    <div className={styles.templateActions}>
                                        <button type="button" className={styles.primaryBtn} onClick={() => onUseTemplate(template)}>
                                            <LuPlus size={13} />
                                            {t('template_use')}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.dangerGhostBtn}
                                            disabled={deletingId === template._id}
                                            onClick={() => void handleDelete(template)}
                                            aria-label={t('delete')}
                                        >
                                            {deletingId === template._id ? <LuLoaderCircle size={13} className={styles.spin} /> : <LuTrash2 size={13} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        />
    );
}

export default TemplateGalleryModal;
