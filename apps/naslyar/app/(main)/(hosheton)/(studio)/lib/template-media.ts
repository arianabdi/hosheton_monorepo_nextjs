import type { TemplatePreviewMedia } from './template-review-api';

export function getHoshetonS3PublicBase(): string {
    return (
        process.env.NEXT_PUBLIC_HOSHETON_S3_PUBLIC_BASE
        || process.env.NEXT_PUBLIC_S3_PUBLIC_BASE
        || ''
    ).replace(/\/+$/, '');
}

/** Rewrite legacy wrong bucket prefix (lingeeko/hosheton → hosheton/hosheton). */
export function fixHoshetonMediaUrl(url: string): string {
    if (!url) return '';
    return url.replace(/:lingeeko\/hosheton\//i, ':hosheton/hosheton/');
}

export function publicFileUrl(file?: { key?: string; path?: string; url?: string; publicUrl?: string } | null): string {
    if (!file) return '';
    const path = String(file.path || file.publicUrl || file.url || '').trim();
    if (/^https?:\/\//i.test(path)) return fixHoshetonMediaUrl(path);
    const key = String(file.key || '').trim().replace(/^\/+/, '');
    const base = getHoshetonS3PublicBase();
    if (key && base) return fixHoshetonMediaUrl(`${base}/${key}`);
    return fixHoshetonMediaUrl(path);
}

export function normalizeUploadPair(raw: unknown): TemplatePreviewMedia | null {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Record<string, unknown>;
    const original = (data.original || data.fileInfo || data) as Record<string, unknown>;
    const thumbnail = (data.thumbnail || null) as Record<string, unknown> | null;
    const thumbnailLarge = (data.thumbnailLarge || null) as Record<string, unknown> | null;
    const originalUrl = publicFileUrl(original);
    const thumbnailUrl = publicFileUrl(thumbnail);
    const thumbnailUrlLarge = publicFileUrl(thumbnailLarge);
    const url = originalUrl || thumbnailUrlLarge || thumbnailUrl;
    if (!url) return null;
    const mime = String(original?.mimetype || thumbnail?.mimetype || '').toLowerCase();
    return {
        url,
        thumbnailUrl: thumbnailUrl || undefined,
        thumbnailUrlLarge: thumbnailUrlLarge || undefined,
        type: mime.startsWith('video') ? 'video' : 'image',
        fileId: String(original?._id || ''),
        fileKey: String(original?.key || ''),
        label: String(original?.originalname || original?.name || ''),
    };
}

export function readMediaDimensions(file: File): Promise<{ width?: number; height?: number; aspectRatio?: number }> {
    return new Promise((resolve) => {
        const finish = (width?: number, height?: number) => {
            resolve({
                width: width || undefined,
                height: height || undefined,
                aspectRatio: width && height ? Number((width / height).toFixed(4)) : undefined,
            });
        };

        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                const width = video.videoWidth;
                const height = video.videoHeight;
                URL.revokeObjectURL(video.src);
                finish(width, height);
            };
            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                resolve({});
            };
            video.src = URL.createObjectURL(file);
            return;
        }

        const image = new Image();
        image.onload = () => {
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            URL.revokeObjectURL(image.src);
            finish(width, height);
        };
        image.onerror = () => {
            URL.revokeObjectURL(image.src);
            resolve({});
        };
        image.src = URL.createObjectURL(file);
    });
}

export function setCoverMedia(items: TemplatePreviewMedia[], cover: TemplatePreviewMedia): TemplatePreviewMedia[] {
    return items.map((item) => ({
        ...item,
        isCover: item === cover,
    }));
}

export function dropPreviewMedia(items: TemplatePreviewMedia[], media: TemplatePreviewMedia): TemplatePreviewMedia[] {
    const next = items.filter((item) => item !== media);
    if (!next.length) return next;
    if (next.some((item) => item.isCover)) return next;
    return [{ ...next[0], isCover: true }, ...next.slice(1)];
}

export function mediaThumbSrc(media: TemplatePreviewMedia) {
    return fixHoshetonMediaUrl(media.thumbnailUrl || media.url);
}

/** Explore-card thumbnail. Prefers the project JPEG; never falls back to the original image. */
export function mediaThumbLargeSrc(media: TemplatePreviewMedia) {
    if (media.thumbnailUrlLarge) return fixHoshetonMediaUrl(media.thumbnailUrlLarge);
    return fixHoshetonMediaUrl(media.thumbnailUrl || (media.type === 'video' ? media.url : ''));
}

export function mediaOriginalSrc(media: TemplatePreviewMedia) {
    return fixHoshetonMediaUrl(media.url);
}

export function getCoverMedia(items?: TemplatePreviewMedia[] | null): TemplatePreviewMedia | null {
    if (!items?.length) return null;
    return items.find((item) => item.isCover) || items[0] || null;
}
