'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuUpload, LuLink, LuLoader, LuX, LuCircleCheck } from 'react-icons/lu';
import { useAuthStore } from '@/app/zustand/store/authStore';
import {
    resolveUploadedFileRef,
    uploadFileInChunks,
} from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import { buildPublicFileUrl } from '@/app/(developers)/projects/[projectId]/lib/file-url';
import uploadStyles from '@/app/(developers)/projects/[projectId]/components/AssetRefUpload.module.scss';
import styles from './CharacterSheetUpload.module.scss';
import { getHoshetonErrorMessage } from '@/app/lib/errors';

export interface CharacterSheetImage {
    fileId: string;
    fileKey: string;
    fileName?: string;
    externalUrl?: string;
    previewUrl: string;
    /** Provider (BytePlus) approved this source URL */
    providerVerified?: boolean;
    providerStatus?: string;
    /** Synced from provider only — not editable in form */
    readOnly?: boolean;
}

interface CharacterSheetUploadProps {
    images: CharacterSheetImage[];
    onChange: (images: CharacterSheetImage[]) => void;
    onUploadingChange?: (uploading: boolean) => void;
    multiple?: boolean;
    maxImages?: number;
    dropzoneLabel?: string;
    showProviderBadge?: boolean;
}

export function CharacterSheetUpload({
    images,
    onChange,
    onUploadingChange,
    multiple = true,
    maxImages,
    dropzoneLabel,
    showProviderBadge = false,
}: CharacterSheetUploadProps) {
    const { t } = useTranslation('avatars');
    const { t: tc } = useTranslation('common');
    const token = useAuthStore((s) => s.token);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isPausedRef = useRef(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [urlDraft, setUrlDraft] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleUpload = useCallback(async (file: File) => {
        if (!token) {
            setError(t('login_first'));
            return;
        }
        if (!multiple && images.length >= 1) {
            onChange([]);
        }
        if (maxImages !== undefined && images.length >= maxImages) {
            setError(t('max_images', { max: maxImages }));
            return;
        }
        setError(null);
        setUploading(true);
        setUploadProgress(0);
        onUploadingChange?.(true);
        try {
            const result = await uploadFileInChunks({
                file,
                token,
                isPausedRef,
                metadata: { source: 'ai-avatar', assetType: 'image' },
                onProgress: setUploadProgress,
            });
            const { fileId, fileKey } = resolveUploadedFileRef(result);
            if (!fileKey) throw new Error(t('no_file_id'));
            // The API's URL is on the storage the file was really uploaded to (admin storage setting);
            // the env base used by buildPublicFileUrl goes stale after a storage switch.
            const uploadedPath = String((result?.fileInfo || result?.original)?.path || '').trim();

            onChange([
                ...(multiple ? images : []),
                {
                    fileId,
                    fileKey,
                    fileName: file.name,
                    previewUrl: /^https?:\/\//i.test(uploadedPath) ? uploadedPath : buildPublicFileUrl(fileKey),
                },
            ]);
        } catch (err) {
            setError(getHoshetonErrorMessage(err, { fallback: t('upload_error') }));
        } finally {
            setUploading(false);
            setUploadProgress(0);
            onUploadingChange?.(false);
        }
    }, [token, images, onChange, onUploadingChange, multiple, maxImages, t]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) void handleUpload(file);
        e.target.value = '';
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) void handleUpload(file);
    };

    const applyUrl = () => {
        const trimmed = urlDraft.trim();
        if (!trimmed) return;
        if (!multiple && images.length >= 1) {
            onChange([]);
        }
        if (maxImages !== undefined && images.length >= maxImages) {
            setError(t('max_images', { max: maxImages }));
            return;
        }
        onChange([
            ...(multiple ? images : []),
            {
                fileId: '',
                fileKey: '',
                externalUrl: trimmed,
                previewUrl: trimmed,
            },
        ]);
        setUrlDraft('');
    };

    const canAddMore = maxImages === undefined || images.length < maxImages;

    const removeImage = (index: number) => {
        onChange(images.filter((_, i) => i !== index));
    };

    return (
        <div className={uploadStyles.wrapper}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={uploadStyles.hiddenInput}
                disabled={uploading}
                onChange={onFileChange}
            />

            <div
                className={uploadStyles.dropzone}
                onClick={() => {
                    if (uploading || !canAddMore) return;
                    fileInputRef.current?.click();
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={canAddMore ? onDrop : undefined}
                style={!canAddMore ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
            >
                {uploading ? <LuLoader className={uploadStyles.spin} /> : <LuUpload />}
                <span>
                    {uploading
                        ? tc('upload_progress', { progress: uploadProgress })
                        : dropzoneLabel ||
                          (multiple
                              ? t('upload_sheet')
                              : t('upload_portrait'))}
                </span>
            </div>

            {uploading && (
                <div className={uploadStyles.progressTrack}>
                    <div
                        className={uploadStyles.progressBar}
                        style={{ width: `${uploadProgress}%` }}
                    />
                </div>
            )}

            <div className={uploadStyles.urlRow}>
                <LuLink />
                <input
                    type="url"
                    className={uploadStyles.urlInput}
                    placeholder={t('external_url')}
                    value={urlDraft}
                    disabled={uploading}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onBlur={applyUrl}
                    onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
                />
            </div>

            {images.length > 0 && (
                <div className={styles.grid}>
                    {images.map((img, index) => (
                        <div key={`${img.fileKey || img.externalUrl}-${index}`} className={styles.card}>
                            {!img.readOnly && (
                                <button
                                    type="button"
                                    className={styles.removeBtn}
                                    onClick={() => removeImage(index)}
                                    title={tc('delete')}
                                >
                                    <LuX />
                                </button>
                            )}
                            {showProviderBadge && img.providerVerified && (
                                <span className={styles.verifiedBadge} title={t('platform_verified')}>
                                    <LuCircleCheck />
                                </span>
                            )}
                            <img src={img.previewUrl} alt={img.fileName || t('image_n', { index: index + 1 })} className={styles.thumb} />
                            {img.fileName && (
                                <span className={styles.fileName}>{img.fileName}</span>
                            )}
                            {showProviderBadge && (
                                <span className={styles.providerMeta}>
                                    {img.providerVerified
                                        ? t('platform_verify')
                                        : img.providerStatus
                                          ? t('status_colon', { status: img.providerStatus })
                                          : t('pending_send')}
                                </span>
                            )}
                            {img.readOnly && (
                                <span className={styles.urlBadge}>Provider</span>
                            )}
                            {img.fileId && (
                                <span className={styles.fileIdMeta}>
                                    <code>{img.fileId.slice(-8)}</code>
                                </span>
                            )}
                            {img.externalUrl && !img.fileKey && (
                                <span className={styles.urlBadge}>URL</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {error && <p className={uploadStyles.error}>{error}</p>}
        </div>
    );
}
