'use client';

import { LuExternalLink, LuFilm, LuImage, LuMusic, LuStar, LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { OptimizedThumbImage } from '@/app/(developers)/projects/components/OptimizedThumbImage';
import {
    mediaOptimizedListThumbSrc,
    mediaOriginalSrc,
    mediaThumbLargeSrc,
    mediaThumbSrc,
} from '@/app/(marketplace)/lib/template-media';
import styles from './TemplateForm.module.scss';

type Props = {
    media: TemplatePreviewMedia;
    isCover?: boolean;
    removing?: boolean;
    onRemove?: () => void | Promise<void>;
    onSetCover?: () => void;
    /** Chat reference chips: same optimized thumb + ghost as chat history (no full video/original). */
    preferOptimizedThumb?: boolean;
    /** Fails model constraints: red ring + X badge with hover tooltip. */
    invalid?: boolean;
    /** Per-file violation messages shown in the hover tooltip. */
    errorMessages?: string[];
};

export default function TemplatePreviewThumb({
    media,
    isCover,
    removing,
    onRemove,
    onSetCover,
    preferOptimizedThumb = false,
    invalid = false,
    errorMessages,
}: Props) {
    const { t } = useTranslation('templates');
    const thumbSrc = mediaThumbSrc(media);
    const largeSrc = mediaThumbLargeSrc(media);
    const originalSrc = mediaOriginalSrc(media);
    const optimizedSrc = mediaOptimizedListThumbSrc(media);
    // Prefer optimized thumbs; avoid loading full original in the 64px chip when a thumb exists.
    const displaySrc = preferOptimizedThumb
        ? optimizedSrc
        : ((thumbSrc && thumbSrc !== originalSrc)
            ? thumbSrc
            : (largeSrc && largeSrc !== originalSrc ? largeSrc : (thumbSrc || largeSrc || originalSrc)));
    const canOpenThumb = Boolean(
        (preferOptimizedThumb ? optimizedSrc : displaySrc)
        && (preferOptimizedThumb ? optimizedSrc : displaySrc) !== originalSrc,
    );
    const canOpenOriginal = Boolean(originalSrc);

    const openInNewTab = (url: string) => {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const thumbPreview = preferOptimizedThumb ? (
        optimizedSrc ? (
            <OptimizedThumbImage src={optimizedSrc} alt={media.label || ''} />
        ) : media.type === 'audio' ? (
            <div className={styles.thumbAudio} aria-hidden>
                <LuMusic size={22} />
            </div>
        ) : media.type === 'video' && originalSrc ? (
            // ویدیوی آپلودی تامبنیل جدا ندارد — فریم اول خود ویدیو (فقط متادیتا بارگذاری می‌شود)
            <video src={`${originalSrc}#t=0.1`} muted playsInline preload="metadata" aria-hidden />
        ) : (
            <div className={styles.thumbPlaceholder} aria-hidden>
                {media.type === 'video' ? <LuFilm size={22} /> : <LuImage size={22} />}
            </div>
        )
    ) : media.type === 'audio' && !displaySrc ? (
        <div className={styles.thumbAudio} aria-hidden>
            <LuMusic size={22} />
        </div>
    ) : media.type === 'video' && !displaySrc ? (
        <video src={originalSrc} muted playsInline />
    ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displaySrc} alt={media.label || ''} loading="lazy" />
    );

    return (
        <div
            className={`${styles.thumb} ${isCover ? styles.thumbCover : ''} ${removing ? styles.thumbRemoving : ''} ${invalid ? styles.thumbInvalid : ''}`}
        >
            {thumbPreview}

            {invalid && errorMessages?.length ? (
                <div
                    className={styles.thumbErrorTooltip}
                    role="status"
                >
                    {errorMessages.map((message, index) => (
                        <span key={index}>{message}</span>
                    ))}
                </div>
            ) : null}

            {invalid ? (
                <span className={styles.thumbErrorBadge} aria-hidden>
                    <LuX size={14} />
                </span>
            ) : null}

            <div className={styles.thumbActions}>
                {onSetCover && (
                    <button
                        type="button"
                        className={`${styles.thumbActionBtn} ${isCover ? styles.thumbCoverBtn : ''}`}
                        onClick={onSetCover}
                        title={isCover ? t('is_cover') : t('set_cover')}
                        aria-label={isCover ? t('is_cover') : t('set_cover')}
                    >
                        <LuStar size={12} />
                    </button>
                )}
                {canOpenThumb && (
                    <button
                        type="button"
                        className={styles.thumbActionBtn}
                        onClick={() => openInNewTab(preferOptimizedThumb ? (optimizedSrc || displaySrc) : displaySrc)}
                        title={t('open_thumb')}
                        aria-label={t('open_thumb')}
                    >
                        <LuImage size={12} />
                    </button>
                )}
                {canOpenOriginal && (
                    <button
                        type="button"
                        className={styles.thumbActionBtn}
                        onClick={() => openInNewTab(originalSrc)}
                        title={t('open_original')}
                        aria-label={t('open_original')}
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
                    aria-label={t('remove_media')}
                    aria-busy={removing}
                >
                    ×
                </button>
            )}
        </div>
    );
}
