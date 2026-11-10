'use client';

import { LuExternalLink, LuImage, LuStar } from 'react-icons/lu';
import type { TemplatePreviewMedia } from '../lib/template-review-api';
import { fixHoshetonMediaUrl, mediaOriginalSrc, mediaThumbSrc } from '../lib/template-media';
import styles from '../projects/templates/review/TemplateForm.module.scss';

type Props = {
    media: TemplatePreviewMedia;
    isCover?: boolean;
    removing?: boolean;
    onRemove?: () => void | Promise<void>;
    onSetCover?: () => void;
};

export default function TemplatePreviewThumb({ media, isCover, removing, onRemove, onSetCover }: Props) {
    const thumbSrc = mediaThumbSrc(media);
    const originalSrc = mediaOriginalSrc(media);
    const canOpenThumb = Boolean(media.thumbnailUrl && media.thumbnailUrl !== media.url);
    const canOpenOriginal = Boolean(originalSrc);

    const openInNewTab = (url: string) => {
        if (!url) return;
        window.open(fixHoshetonMediaUrl(url), '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={`${styles.thumb} ${isCover ? styles.thumbCover : ''} ${removing ? styles.thumbRemoving : ''}`}>
            {media.type === 'video' && !media.thumbnailUrl ? (
                <video src={originalSrc} muted playsInline />
            ) : (
                <img src={thumbSrc} alt={media.label || ''} />
            )}

            <div className={styles.thumbActions}>
                {onSetCover && (
                    <button
                        type="button"
                        className={`${styles.thumbActionBtn} ${isCover ? styles.thumbCoverBtn : ''}`}
                        onClick={onSetCover}
                        title={isCover ? 'پوشش اصلی' : 'انتخاب به‌عنوان پوشش اصلی'}
                        aria-label={isCover ? 'پوشش اصلی' : 'انتخاب به‌عنوان پوشش اصلی'}
                    >
                        <LuStar size={12} />
                    </button>
                )}
                {canOpenThumb && (
                    <button
                        type="button"
                        className={styles.thumbActionBtn}
                        onClick={() => openInNewTab(media.thumbnailUrl!)}
                        title="باز کردن thumbnail در تب جدید"
                        aria-label="باز کردن thumbnail"
                    >
                        <LuImage size={12} />
                    </button>
                )}
                {canOpenOriginal && (
                    <button
                        type="button"
                        className={styles.thumbActionBtn}
                        onClick={() => openInNewTab(originalSrc)}
                        title="باز کردن تصویر اصلی در تب جدید"
                        aria-label="باز کردن تصویر اصلی"
                    >
                        <LuExternalLink size={12} />
                    </button>
                )}
            </div>

            {onRemove && (
                <button
                    type="button"
                    className={styles.thumbRemove}
                    onClick={() => void onRemove()}
                    disabled={removing}
                    aria-label="حذف مدیا"
                    aria-busy={removing}
                >
                    ×
                </button>
            )}
        </div>
    );
}
