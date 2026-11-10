import { sanitizeLegacyStorageUrl } from '../[projectId]/lib/file-url';

export type MediaThumbMeta = {
    thumbnailUrlLarge?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
};

export type LightweightMedia = MediaThumbMeta & {
    url: string;
    type?: 'image' | 'video';
};

export function mediaThumbLargeSrc(media: LightweightMedia | undefined | null): string {
    if (!media) return '';
    if (media.type === 'video') return sanitizeLegacyStorageUrl(media.url || '');
    if (media.thumbnailUrlLarge) return sanitizeLegacyStorageUrl(media.thumbnailUrlLarge);
    return sanitizeLegacyStorageUrl(media.url || '');
}

export function mediaOriginalSrc(media: LightweightMedia | undefined | null): string {
    if (!media) return '';
    return sanitizeLegacyStorageUrl(media.url || '');
}

export function mediaAspectRatio(media: MediaThumbMeta | undefined | null): number {
    if (!media) return 0.75;
    if (media.aspectRatio && media.aspectRatio > 0) return media.aspectRatio;
    if (media.width && media.height) return media.width / media.height;
    return 0.75;
}

export function withPreviewCacheBust(url: string, cacheKey?: number): string {
    if (!url || !cacheKey) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${cacheKey}`;
}

export function resolveLightweightMedia(
    url: string,
    thumbs?: Record<string, MediaThumbMeta>,
    type: 'image' | 'video' = 'image',
): LightweightMedia {
    const clean = sanitizeLegacyStorageUrl(url);
    const thumb = thumbs?.[clean] || thumbs?.[url] || {};
    return {
        url: clean,
        type,
        thumbnailUrlLarge: thumb.thumbnailUrlLarge,
        width: thumb.width,
        height: thumb.height,
        aspectRatio: thumb.aspectRatio,
    };
}
