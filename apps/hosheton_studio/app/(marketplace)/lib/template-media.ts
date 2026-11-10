type ThumbMedia = {
    url?: string;
    thumbnailUrl?: string;
    thumbnailUrlLarge?: string;
    type?: string;
};

/** Rewrite legacy wrong bucket prefix (lingeeko/hosheton → hosheton/hosheton). */
export function fixHoshetonMediaUrl(url: string): string {
    if (!url) return '';
    return url.replace(/:lingeeko\/hosheton\//i, ':hosheton/hosheton/');
}

/** Thumbnail source for list thumbnails — falls back to the original url. */
export function mediaThumbSrc(media: ThumbMedia | undefined | null): string {
    if (!media) return '';
    return fixHoshetonMediaUrl(media.thumbnailUrl || media.url || '');
}

/** Explore-card thumbnail. Prefers the project JPEG; never falls back to the original image. */
export function mediaThumbLargeSrc(media: ThumbMedia | undefined | null): string {
    if (!media) return '';
    if (media.thumbnailUrlLarge) return fixHoshetonMediaUrl(media.thumbnailUrlLarge);
    if (media.thumbnailUrl) return fixHoshetonMediaUrl(media.thumbnailUrl);
    return fixHoshetonMediaUrl(media.url || '');
}

const VIDEO_FILE_RE = /\.(mp4|webm|mov|m4v|mkv|avi)(?:[?#]|$)/i;

/** Poster image of a video preview — never the video file itself ('' when none exists yet). */
export function videoPosterSrc(media: ThumbMedia | undefined | null): string {
    if (!media) return '';
    const original = fixHoshetonMediaUrl(media.url || '');
    for (const candidate of [media.thumbnailUrlLarge, media.thumbnailUrl]) {
        const src = fixHoshetonMediaUrl(candidate || '');
        if (src && src !== original && !VIDEO_FILE_RE.test(src)) return src;
    }
    return '';
}

/**
 * Explore <img> source for any preview: images use their thumb, videos only their poster —
 * an .mp4 inside <img> renders nothing.
 */
export function previewImageSrc(media: ThumbMedia | undefined | null, size: 'small' | 'large' = 'small'): string {
    if (!media) return '';
    if (media.type === 'video') return videoPosterSrc(media);
    return size === 'large' ? mediaThumbLargeSrc(media) : mediaThumbSrc(media);
}

/**
 * Tiny list chips (history, pickers): prefer compact thumbs, never the bare original
 * when a dedicated thumb field exists. If `url` itself is only a thumb fallback
 * (no separate original), still return that thumb field so UI is not blank.
 */
export function mediaOptimizedListThumbSrc(media: ThumbMedia | undefined | null): string {
    if (!media) return '';
    const original = fixHoshetonMediaUrl(media.url || '');
    const small = fixHoshetonMediaUrl(media.thumbnailUrl || '');
    const large = fixHoshetonMediaUrl(media.thumbnailUrlLarge || '');
    if (small && small !== original) return small;
    if (large && large !== original) return large;
    if (small) return small;
    if (large) return large;
    return '';
}

/**
 * Ultra-tiny thumbnails for mention chips: ONLY use the smallest thumbnail.
 * Never fall back to larger sizes to ensure minimal bandwidth usage.
 */
export function mediaTinyThumbSrc(media: ThumbMedia | undefined | null): string {
    if (!media) return '';
    const small = fixHoshetonMediaUrl(media.thumbnailUrl || '');
    // Only return the tiny thumbnail, no fallbacks to ensure smallest possible size
    return small;
}

/** Original (full resolution) source used inside the detail modal. */
export function mediaOriginalSrc(media: ThumbMedia | undefined | null): string {
    if (!media) return '';
    return fixHoshetonMediaUrl(media.url || '');
}

export function mediaAspectRatio(media: { aspectRatio?: number; width?: number; height?: number } | undefined | null): number {
    if (!media) return 0.75;
    if (media.aspectRatio && media.aspectRatio > 0) return media.aspectRatio;
    if (media.width && media.height) return media.width / media.height;
    return 0.75;
}
