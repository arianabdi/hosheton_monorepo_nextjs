'use client';

import { useTranslation } from 'react-i18next';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { mediaThumbSrc } from '@/app/(marketplace)/lib/template-media';
import styles from '../TemplatesHub.module.scss';

interface TemplatePreviewMediaStripProps {
    items: TemplatePreviewMedia[];
    max?: number;
    uploading?: boolean;
    onSelectFiles: (files: FileList | null) => void;
    onSetCover: (media: TemplatePreviewMedia) => void;
    onRemove: (media: TemplatePreviewMedia) => void;
}

export function TemplatePreviewMediaStrip({
    items,
    max = 8,
    uploading,
    onSelectFiles,
    onSetCover,
    onRemove,
}: TemplatePreviewMediaStripProps) {
    const { t } = useTranslation('templates');

    return (
        <div className={styles.mediaStrip}>
            {items.map((media, index) => (
                <div
                    key={`${media.fileId || media.url}-${index}`}
                    className={`${styles.mediaThumb} ${media.isCover ? styles.mediaThumbCover : ''}`}
                >
                    {media.type === 'video' ? (
                        <video src={mediaThumbSrc(media) || media.url} muted playsInline />
                    ) : (
                        <img src={mediaThumbSrc(media) || media.url} alt={media.label || ''} />
                    )}
                    <div className={styles.mediaThumbActions}>
                        <button
                            type="button"
                            className={media.isCover ? styles.mediaCoverBtnActive : undefined}
                            onClick={() => onSetCover(media)}
                        >
                            {t('cover')}
                        </button>
                        <button type="button" className={styles.mediaRemoveBtn} onClick={() => onRemove(media)}>
                            {t('remove_media')}
                        </button>
                    </div>
                </div>
            ))}
            {items.length < max && (
                <label className={styles.mediaAdd}>
                    <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        disabled={uploading}
                        onChange={(e) => {
                            onSelectFiles(e.target.files);
                            e.currentTarget.value = '';
                        }}
                    />
                    <span>+</span>
                </label>
            )}
        </div>
    );
}
