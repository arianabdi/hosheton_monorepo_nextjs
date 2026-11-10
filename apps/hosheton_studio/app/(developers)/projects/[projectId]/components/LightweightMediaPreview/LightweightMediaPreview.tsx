'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
    mediaAspectRatio,
    mediaOriginalSrc,
    mediaThumbLargeSrc,
    withPreviewCacheBust,
    type LightweightMedia,
} from '../../../lib/lightweight-media';
import styles from './LightweightMediaPreview.module.scss';

type Props = {
    media: LightweightMedia;
    alt?: string;
    cacheKey?: number;
    controls?: boolean;
    className?: string;
    onClick?: () => void;
};

export default function LightweightMediaPreview({
    media,
    alt = '',
    cacheKey,
    controls = false,
    className,
    onClick,
}: Props) {
    const [loaded, setLoaded] = useState(false);
    // فایل در دسترس نیست: قاب با نسبت درست خالی بماند — نه آیکون شکسته، نه اسپینر بی‌پایان
    const [failed, setFailed] = useState(false);
    const ratio = mediaAspectRatio(media);
    const displaySrc = withPreviewCacheBust(mediaThumbLargeSrc(media), cacheKey);
    const originalSrc = withPreviewCacheBust(mediaOriginalSrc(media), cacheKey);
    const isVideo = media.type === 'video';

    const imgRef = useRef<HTMLImageElement>(null);

    // عکسِ از قبل کش‌شده قبل از hydrate کامل می‌شود و onLoad نمی‌دهد — همان لحظه آماده حساب شود
    useLayoutEffect(() => {
        const img = imgRef.current;
        setLoaded(Boolean(img?.complete && img.naturalWidth > 0));
        setFailed(false);
    }, [displaySrc, originalSrc]);

    const body = isVideo ? (
        <video
            key={originalSrc}
            src={originalSrc}
            poster={media.thumbnailUrlLarge ? displaySrc : undefined}
            className={`${styles.media} ${loaded ? styles.mediaReady : ''}`}
            muted
            playsInline
            preload="metadata"
            controls={controls}
            // با preload="metadata" رویداد loadeddata اغلب هیچ‌وقت نمی‌رسد؛ متادیتا (یا خطا) کافی است
            // تا جای‌نگهدار برداشته شود — وگرنه اسپینر روی گره‌های ویدیویی تا ابد می‌ماند
            onLoadedMetadata={() => setLoaded(true)}
            onLoadedData={() => setLoaded(true)}
            onError={() => setFailed(true)}
        />
    ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            key={displaySrc}
            ref={imgRef}
            src={displaySrc}
            alt={alt}
            className={`${styles.media} ${loaded ? styles.mediaReady : ''}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
        />
    );

    const clip = (
        <div
            className={`${styles.clip} ${className || ''}`}
            style={{ ['--tile-ratio' as string]: String(ratio) }}
        >
            {!loaded && !failed && <div className={styles.ghost} aria-hidden="true" />}
            {failed ? null : body}
        </div>
    );

    if (!onClick) return clip;

    return (
        <button type="button" className={styles.clickable} onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}>
            {clip}
        </button>
    );
}
