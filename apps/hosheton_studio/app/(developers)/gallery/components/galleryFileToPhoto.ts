import type { GalleryFileItem } from '../lib/gallery-types';
import type { GalleryMediaType, Photo } from './galleryUtils';

export function galleryItemKey(item: GalleryFileItem): string {
    return item.id || item.fileId || item.fileKey || `${item.nodeId}:${item.url}`;
}

function dateKeyFromIso(value?: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

/** Mongo ObjectId embeds a creation timestamp in the first 4 bytes. */
function dateKeyFromObjectId(id?: string): string | null {
    const clean = String(id || '').trim();
    if (!/^[a-fA-F0-9]{24}$/.test(clean)) return null;
    const ms = parseInt(clean.slice(0, 8), 16) * 1000;
    if (!Number.isFinite(ms)) return null;
    return new Date(ms).toISOString().slice(0, 10);
}

function resolveDateKey(item: GalleryFileItem): string {
    return (
        dateKeyFromIso(item.createdAt)
        || dateKeyFromObjectId(item.fileId)
        || dateKeyFromObjectId(item.id)
        || new Date().toISOString().slice(0, 10)
    );
}

function isHttpUrl(value?: string): boolean {
    const src = String(value || '').trim();
    return src.startsWith('https://') || src.startsWith('http://');
}

function httpOrEmpty(value?: string): string {
    const src = String(value || '').trim();
    return isHttpUrl(src) ? src : '';
}

function resolveDimensions(item: GalleryFileItem): { width: number; height: number } {
    if (item.width && item.height && item.width > 0 && item.height > 0) {
        return { width: item.width, height: item.height };
    }
    if (item.aspectRatio && item.aspectRatio > 0) {
        return { width: Math.round(item.aspectRatio * 1000), height: 1000 };
    }
    if (item.type === 'audio') return { width: 1, height: 1 };
    if (item.type === 'video') return { width: 16, height: 9 };
    return { width: 4, height: 3 };
}

/**
 * Grid source: prefer real compressed previews over the original.
 * Same priority as explore list chips — never load multi‑MB originals into the grid when a thumb exists.
 */
function resolveThumbSrc(item: GalleryFileItem): string {
    const original = httpOrEmpty(item.url);
    const small = httpOrEmpty(item.thumbnailUrl);
    const large = httpOrEmpty(item.thumbnailUrlLarge);

    if (small && small !== original) return small;
    if (large && large !== original) return large;
    if (item.type === 'image') return large || small || original;
    return large || small || '';
}

function resolveOriginalSrc(item: GalleryFileItem, thumbSrc: string): string {
    return httpOrEmpty(item.url) || thumbSrc;
}

function canInclude(item: GalleryFileItem): boolean {
    if (item.type === 'audio') return Boolean(httpOrEmpty(item.url));
    if (item.type === 'video') return Boolean(resolveThumbSrc(item) || httpOrEmpty(item.url));
    if (item.type === 'image') return Boolean(resolveThumbSrc(item));
    return false;
}

/** Map gallery API media items into justified date-grouped Photo models. */
export function galleryFilesToPhotos(files: GalleryFileItem[]): Photo[] {
    return files
        .filter(canInclude)
        .map((item) => {
            const { width, height } = resolveDimensions(item);
            const src = resolveThumbSrc(item);
            const type = item.type as GalleryMediaType;
            return {
                id: galleryItemKey(item),
                type,
                src,
                originalSrc: resolveOriginalSrc(item, src),
                alt: item.nodeLabel || item.label || item.nodeType || type,
                width,
                height,
                date: resolveDateKey(item),
                durationSeconds: Number(item.durationSeconds) > 0
                    ? Number(item.durationSeconds)
                    : undefined,
                sizeBytes: Number(item.sizeBytes) > 0 ? Number(item.sizeBytes) : undefined,
            };
        })
        .sort((a, b) => {
            const byDate = b.date.localeCompare(a.date);
            if (byDate !== 0) return byDate;
            return b.id.localeCompare(a.id);
        });
}
