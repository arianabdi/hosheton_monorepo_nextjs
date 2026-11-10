import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { buildPublicFileUrl } from '@/app/(developers)/projects/[projectId]/lib/file-url';

export function publicFileUrl(file?: { key?: string; path?: string; url?: string; publicUrl?: string } | null): string {
    if (!file) return '';
    const path = String(file.path || file.publicUrl || file.url || '').trim();
    if (/^https?:\/\//i.test(path)) return path;
    const key = String(file.key || '').trim();
    return key ? buildPublicFileUrl(key) : path;
}

/** آپلود → رسانه (نوع از mimetype: تصویر/ویدیو/صوت) */
export function normalizeUploadPair(raw: unknown): (TemplatePreviewMedia & { type: 'image' | 'video' | 'audio' }) | null {
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
    const type = mime.startsWith('audio')
        ? 'audio'
        : mime.startsWith('video')
            ? 'video'
            : 'image';
    return {
        url,
        thumbnailUrl: thumbnailUrl || undefined,
        thumbnailUrlLarge: thumbnailUrlLarge || undefined,
        type,
        fileId: String(original?._id || ''),
        fileKey: String(original?.key || ''),
        label: String(original?.originalname || original?.name || ''),
    };
}

export function readMediaDimensions(file: File): Promise<{
    width?: number;
    height?: number;
    aspectRatio?: number;
    durationSeconds?: number;
}> {
    return new Promise((resolve) => {
        const finish = (width?: number, height?: number, durationSeconds?: number) => {
            resolve({
                width: width || undefined,
                height: height || undefined,
                aspectRatio: width && height ? Number((width / height).toFixed(4)) : undefined,
                durationSeconds: durationSeconds && Number.isFinite(durationSeconds) ? durationSeconds : undefined,
            });
        };

        if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.preload = 'metadata';
            audio.onloadedmetadata = () => {
                const durationSeconds = audio.duration;
                URL.revokeObjectURL(audio.src);
                finish(undefined, undefined, durationSeconds);
            };
            audio.onerror = () => {
                URL.revokeObjectURL(audio.src);
                resolve({});
            };
            audio.src = URL.createObjectURL(file);
            return;
        }

        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                const width = video.videoWidth;
                const height = video.videoHeight;
                const durationSeconds = video.duration;
                URL.revokeObjectURL(video.src);
                finish(width, height, durationSeconds);
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

export function removePreviewMedia(items: TemplatePreviewMedia[], target: TemplatePreviewMedia): TemplatePreviewMedia[] {
    const next = items.filter((item) => item !== target);
    if (target.isCover && next[0] && !next.some((item) => item.isCover)) {
        next[0] = { ...next[0], isCover: true };
    }
    return next;
}
