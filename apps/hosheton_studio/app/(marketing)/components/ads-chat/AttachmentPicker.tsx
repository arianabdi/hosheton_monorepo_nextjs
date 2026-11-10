'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuImagePlus, LuLoaderCircle, LuX } from 'react-icons/lu';
import { attachmentSizeError, uploadAdsAttachments } from '@/app/(marketing)/ads-video/lib/attach-upload';
import type { AdsAttachment } from '@/app/(marketing)/ads-video/lib/ads-video-api';
import styles from './ads-chat.module.scss';

export interface AttachmentPickerProps {
    attachments: AdsAttachment[];
    onChange(next: AdsAttachment[]): void;
    disabled?: boolean;
    /** حالت فشرده — فقط دکمه‌ی آیکنی برای ردیف ابزار کامپوزر؛ چیپ‌ها همان‌جا wrap می‌شوند */
    compact?: boolean;
}

/** پیوست تصویر/ویدیو/صدا به‌عنوان ورودی تولید موشن (آپلود chunked روی همان S3 چت) */
export function AttachmentPicker({ attachments, onChange, disabled, compact = false }: AttachmentPickerProps) {
    const { t } = useTranslation('adsVideo');
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFiles = async (files: FileList | File[] | null) => {
        const list = files ? Array.from(files) : [];
        if (!list.length || disabled) return;
        setError('');
        setUploading(true);
        try {
            for (const file of list) {
                const issue = attachmentSizeError(file);
                if (issue === 'kind') {
                    setError(t('attachment_err_kind'));
                } else if (issue === 'size') {
                    setError(t('attachment_err_size', { name: file.name }));
                }
            }
            const { attachments: uploaded, failures } = await uploadAdsAttachments(list);
            if (failures && !uploaded.length) {
                setError(t('attachment_err_upload', { name: list[0]?.name || '' }));
            }
            if (uploaded.length) onChange([...attachments, ...uploaded]);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const addTitle = t('attachment_add');

    return (
        <div className={styles.attachmentPicker}>
            <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                hidden
                onChange={(e) => void handleFiles(e.target.files)}
            />
            {compact ? (
                <button
                    type="button"
                    className={styles.attachmentAddIcon}
                    disabled={disabled || uploading}
                    onClick={() => inputRef.current?.click()}
                    aria-label={addTitle}
                    title={addTitle}
                >
                    {uploading ? <LuLoaderCircle size={14} className={styles.spin} /> : <LuImagePlus size={14} />}
                </button>
            ) : (
                <button
                    type="button"
                    className={styles.attachmentAdd}
                    disabled={disabled || uploading}
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading ? <LuLoaderCircle size={14} className={styles.spin} /> : <LuImagePlus size={14} />}
                    <span>{addTitle}</span>
                </button>
            )}

            {error && <div className={styles.attachmentError}>{error}</div>}

            {attachments.length > 0 && (
                <div className={styles.attachmentChips}>
                    {attachments.map((item, index) => (
                        <span key={`${item.fileKey}-${index}`} className={styles.attachmentChip}>
                            {item.type === 'image' && item.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.url} alt={item.label || ''} />
                            ) : (
                                <em>{item.type === 'video' ? '🎬' : '🎵'}</em>
                            )}
                            <span title={item.label}>{item.label || item.type}</span>
                            <button
                                type="button"
                                onClick={() => onChange(attachments.filter((_, i) => i !== index))}
                                aria-label={t('attachment_remove')}
                            >
                                <LuX size={11} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AttachmentPicker;
