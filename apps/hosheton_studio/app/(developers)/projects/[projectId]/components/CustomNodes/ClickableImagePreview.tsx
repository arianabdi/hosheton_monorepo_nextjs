'use client';

import { useState } from 'react';
import { LuExpand } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import LightweightMediaPreview from '../LightweightMediaPreview/LightweightMediaPreview';
import { mediaOriginalSrc, resolveLightweightMedia, type MediaThumbMeta } from '../../../lib/lightweight-media';
import { ImageLightbox } from './ImageLightbox';
import styles from './ClickableImagePreview.module.scss';

export function ClickableImagePreview({
    src,
    alt,
    thumbs,
    cacheKey,
    className,
    thumbnailUrl,
}: {
    src: string;
    alt: string;
    thumbs?: Record<string, MediaThumbMeta>;
    cacheKey?: number;
    className?: string;
    /** Per-asset thumbnail (e.g. StudioMediaRef.thumbnailUrlLarge) — wins over the `thumbs` map. */
    thumbnailUrl?: string;
}) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const { t } = useTranslation('projects');
    const media = resolveLightweightMedia(src, thumbs, 'image');
    if (thumbnailUrl) media.thumbnailUrlLarge = thumbnailUrl;
    const original = mediaOriginalSrc(media);

    return (
        <>
            <div
                className={`${styles.previewButton} nodrag nopan${className ? ` ${className}` : ''}`}
                title={t('view_image')}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <LightweightMediaPreview
                    media={media}
                    alt={alt}
                    cacheKey={cacheKey}
                    onClick={() => setLightboxOpen(true)}
                />
                <span className={styles.hover} aria-hidden>
                    <span><LuExpand /></span>
                </span>
            </div>
            <ImageLightbox
                open={lightboxOpen}
                src={original}
                alt={alt}
                onClose={() => setLightboxOpen(false)}
            />
        </>
    );
}
