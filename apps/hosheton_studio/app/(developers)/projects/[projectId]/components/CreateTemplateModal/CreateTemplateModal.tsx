'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuX } from 'react-icons/lu';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { useAuthStore } from '@/app/zustand/store/authStore';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { uploadFileInChunks } from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import { TemplatePreviewMediaStrip } from '@/app/(developers)/templates/components/TemplatePreviewMediaStrip';
import { normalizeUploadPair, readMediaDimensions, removePreviewMedia, setCoverMedia } from '@/app/(developers)/templates/lib/preview-media';
import styles from '../../../components/TemplatesModal.module.scss';

interface CreateTemplateModalProps {
    open: boolean;
    submitting: boolean;
    canCreate: boolean;
    blockReason?: string | null;
    nextVersion?: number | null;
    existingVersions?: number[];
    onClose: () => void;
    onSubmit: (payload: {
        title: string;
        description?: string;
        previewMedia?: TemplatePreviewMedia[];
    }) => Promise<void> | void;
}

export function CreateTemplateModal({
    open,
    submitting,
    canCreate,
    blockReason,
    nextVersion,
    existingVersions = [],
    onClose,
    onSubmit,
}: CreateTemplateModalProps) {
    const { t, i18n } = useTranslation('templates');
    const { t: tp } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const { token } = useAuthStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [previewMedia, setPreviewMedia] = useState<TemplatePreviewMedia[]>([]);
    const [uploadingPreview, setUploadingPreview] = useState(false);

    if (!open) return null;

    const handlePreviewUpload = async (fileList: FileList | null) => {
        const files = Array.from(fileList || []);
        if (!token || !files.length) return;
        const remaining = 8 - previewMedia.length;
        if (remaining <= 0) return;
        setUploadingPreview(true);
        try {
            for (const file of files.slice(0, remaining)) {
                const result = await uploadFileInChunks({ file, token });
                const media = normalizeUploadPair(result);
                if (!media) continue;
                const dimensions = await readMediaDimensions(file);
                setPreviewMedia((prev) => {
                    if (prev.length >= 8) return prev;
                    return [...prev, { ...media, ...dimensions, isCover: prev.length === 0 }];
                });
            }
        } finally {
            setUploadingPreview(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPreviewMedia([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || submitting || !canCreate) return;
        await onSubmit({
            title: title.trim(),
            description: description.trim() || undefined,
            previewMedia,
        });
        resetForm();
    };

    const versionLabel = formatAppNumber(nextVersion ?? 1, i18n.language);
    const versionsLabel = existingVersions.map((v) => formatAppNumber(v, i18n.language)).join(', ');

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ width: 'min(640px, 100%)' }}>
                <div className={styles.modalHeader}>
                    <h2>{tp('create_template_from')}</h2>
                    <button type="button" onClick={onClose} aria-label={tc('close')}><LuX /></button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
                    {!canCreate ? (
                        <p style={{ fontSize: '0.82rem', margin: 0, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, #ef4444 10%, transparent)' }}>
                            {blockReason === 'MEDIA_TEMPLATE_PROJECT_CLONED_FROM_TEMPLATE'
                                ? tp('cloned_no_template')
                                : tp('cannot_create_template')}
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, #8b5cf6 8%, transparent)' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                                {t('next_version', { version: versionLabel })}
                            </span>
                            {existingVersions.length > 0 && (
                                <span style={{ fontSize: '0.74rem', opacity: 0.75 }}>
                                    {t('existing_versions', { versions: versionsLabel })}
                                </span>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.78rem', opacity: 0.7 }}>{tp('title_label')}</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            disabled={!canCreate}
                            placeholder={tp('title_ph')}
                            style={{
                                border: '1px solid var(--input-border-color)', background: 'var(--body-background)',
                                color: 'var(--body-text-color)', borderRadius: 10, padding: '8px 10px', fontSize: '0.85rem', outline: 'none',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.78rem', opacity: 0.7 }}>{tp('desc_optional')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            disabled={!canCreate}
                            placeholder={t('desc_what')}
                            style={{
                                border: '1px solid var(--input-border-color)', background: 'var(--body-background)',
                                color: 'var(--body-text-color)', borderRadius: 10, padding: '8px 10px', fontSize: '0.85rem', outline: 'none', resize: 'vertical',
                            }}
                        />
                    </div>
                    {canCreate && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.78rem', opacity: 0.7 }}>{t('preview_media')}</label>
                            <p style={{ fontSize: '0.72rem', opacity: 0.55, margin: 0 }}>{t('cover_hint')}</p>
                            <TemplatePreviewMediaStrip
                                items={previewMedia}
                                uploading={uploadingPreview}
                                onSelectFiles={(files) => void handlePreviewUpload(files)}
                                onSetCover={(media) => setPreviewMedia((prev) => setCoverMedia(prev, media))}
                                onRemove={(media) => setPreviewMedia((prev) => removePreviewMedia(prev, media))}
                            />
                        </div>
                    )}
                    <p style={{ fontSize: '0.72rem', opacity: 0.55, margin: 0 }}>
                        {tp('draft_note')}
                    </p>
                    <button
                        type="submit"
                        disabled={submitting || uploadingPreview || !title.trim() || !canCreate}
                        style={{
                            background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 12,
                            padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                            opacity: !canCreate ? 0.5 : 1,
                        }}
                    >
                        {submitting ? t('creating') : t('create_version', { version: versionLabel })}
                    </button>
                </form>
            </div>
        </div>
    );
}
