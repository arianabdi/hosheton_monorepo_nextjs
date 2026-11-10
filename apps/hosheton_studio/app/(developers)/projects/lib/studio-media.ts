import type { Edge, Node } from '@xyflow/react';
import type { GalleryFileItem } from '@/app/(developers)/gallery/lib/gallery-types';
import type { TemplatePreviewMedia } from '../types/media-api';

export type StudioMediaType = 'image' | 'video' | 'audio';

export interface StudioMediaRef {
    id: string;
    type: StudioMediaType;
    label: string;
    fileId?: string;
    fileKey?: string;
    externalUrl?: string;
    url?: string;
    thumbnailUrl?: string;
    thumbnailUrlLarge?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
    durationSeconds?: number;
    projectId?: string;
    sourceNodeId?: string;
}

export interface StudioMediaMention {
    assetId: string;
    label: string;
    type: StudioMediaType;
    fileId?: string;
    fileKey?: string;
    url?: string;
    thumbnailUrl?: string;
    thumbnailUrlLarge?: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
    projectId?: string;
    sourceNodeId?: string;
}

export interface EdgeAssetSelection {
    mode: 'auto' | 'manual';
    assetIds?: string[];
}

export interface StudioEdgeData extends Record<string, unknown> {
    assetSelection?: EdgeAssetSelection;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif|svg)(?:$|\?)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv|avi)(?:$|\?)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|weba)(?:$|\?)/i;

function hashString(value: string): string {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

export function createStudioMediaId(seed?: string): string {
    if (seed) return `media-${hashString(seed)}`;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `media-${crypto.randomUUID()}`;
    }
    return `media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function inferStudioMediaType(file: Pick<File, 'type' | 'name'>): StudioMediaType | null {
    const mime = String(file.type || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (IMAGE_EXT.test(file.name)) return 'image';
    if (VIDEO_EXT.test(file.name)) return 'video';
    if (AUDIO_EXT.test(file.name)) return 'audio';
    return null;
}

export function normalizeAssetRefData(data: Record<string, unknown>): StudioMediaRef[] {
    if (Array.isArray(data.assets)) {
        return data.assets.flatMap((raw, index) => {
            if (!raw || typeof raw !== 'object') return [];
            const item = raw as Partial<StudioMediaRef>;
            const type = String(item.type || '') as StudioMediaType;
            if (!['image', 'video', 'audio'].includes(type)) return [];
            const seed = String(item.fileId || item.fileKey || item.externalUrl || item.url || `${index}`);
            return [{
                ...item,
                id: String(item.id || createStudioMediaId(seed)),
                type,
                label: String(item.label || `Media ${index + 1}`),
            } as StudioMediaRef];
        });
    }

    const fileId = String(data.fileId || '').trim();
    const fileKey = String(data.fileKey || '').trim();
    const externalUrl = String(data.externalUrl || data.assetUrl || '').trim();
    if (!fileId && !fileKey && !externalUrl) return [];
    const type = ['image', 'video', 'audio'].includes(String(data.assetType))
        ? data.assetType as StudioMediaType
        : 'image';
    const metadata = (data.mediaMetadata || {}) as Record<string, unknown>;
    const url = externalUrl || String(data.assetUrl || '').trim();
    const thumbs = (data.mediaThumbs || {}) as Record<string, Record<string, unknown>>;
    const thumb = url ? thumbs[url] || {} : {};
    return [{
        id: createStudioMediaId(fileId || fileKey || externalUrl),
        type,
        label: String(data.fileName || data.label || type),
        fileId: fileId || undefined,
        fileKey: fileKey || undefined,
        externalUrl: externalUrl || undefined,
        url: url || undefined,
        thumbnailUrl: String(thumb.thumbnailUrl || '') || undefined,
        thumbnailUrlLarge: String(thumb.thumbnailUrlLarge || '') || undefined,
        width: Number(metadata.width || thumb.width) || undefined,
        height: Number(metadata.height || thumb.height) || undefined,
        aspectRatio: Number(thumb.aspectRatio) || undefined,
        durationSeconds: Number(metadata.durationSeconds) || undefined,
    }];
}

export function galleryItemToStudioMedia(item: GalleryFileItem): StudioMediaRef {
    const seed = item.id || item.fileId || item.fileKey || `${item.projectId}:${item.nodeId}:${item.url}`;
    return {
        id: item.id || createStudioMediaId(seed),
        type: item.type,
        label: item.label || item.nodeLabel || item.type,
        fileId: item.fileId,
        fileKey: item.fileKey,
        externalUrl: item.url,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        thumbnailUrlLarge: item.thumbnailUrlLarge,
        width: item.width,
        height: item.height,
        aspectRatio: item.aspectRatio,
        durationSeconds: item.durationSeconds,
        projectId: item.projectId,
        sourceNodeId: item.nodeId,
    };
}

export function galleryItemToPreviewMedia(item: GalleryFileItem): TemplatePreviewMedia {
    const ref = galleryItemToStudioMedia(item);
    return {
        id: ref.id,
        url: String(ref.url || ref.externalUrl || ''),
        type: ref.type,
        fileId: ref.fileId,
        fileKey: ref.fileKey,
        thumbnailUrl: ref.thumbnailUrl,
        thumbnailUrlLarge: ref.thumbnailUrlLarge,
        label: ref.label,
        width: ref.width,
        height: ref.height,
        aspectRatio: ref.aspectRatio,
        durationSeconds: ref.durationSeconds,
        source: 'gallery',
    };
}

export function previewMediaToMention(item: TemplatePreviewMedia): StudioMediaMention {
    const seed = item.assetId || item.id || item.fileId || item.fileKey || item.url;
    return {
        assetId: item.assetId || item.id || createStudioMediaId(seed),
        label: item.label || item.type,
        // فایل‌های متنی منشن نمی‌شوند؛ نوع رسانه‌ای برای اطمینان
        type: item.type === 'file' ? 'image' : item.type,
        fileId: item.fileId,
        fileKey: item.fileKey,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        thumbnailUrlLarge: item.thumbnailUrlLarge,
        width: item.width,
        height: item.height,
        durationSeconds: item.durationSeconds,
    };
}

export function mediaRefToMention(item: StudioMediaRef): StudioMediaMention {
    return {
        assetId: item.id,
        label: item.label,
        type: item.type,
        fileId: item.fileId,
        fileKey: item.fileKey,
        url: item.url || item.externalUrl,
        thumbnailUrl: item.thumbnailUrl,
        thumbnailUrlLarge: item.thumbnailUrlLarge,
        width: item.width,
        height: item.height,
        durationSeconds: item.durationSeconds,
        projectId: item.projectId,
        sourceNodeId: item.sourceNodeId,
    };
}

export function mentionToken(mention: Pick<StudioMediaMention, 'assetId' | 'label'>): string {
    const safeLabel = mention.label.replace(/[\[\]()]/g, '').trim() || 'media';
    return `@[${safeLabel}](asset:${mention.assetId})`;
}

/** Keep start + end of long filenames so mentions stay one line. */
export function midEllipsis(value: string, maxLength = 28): string {
    const text = String(value || '').trim();
    if (text.length <= maxLength) return text;
    const head = Math.max(6, Math.ceil((maxLength - 1) * 0.55));
    const tail = Math.max(4, maxLength - head - 1);
    return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

type MediaListIdentity = {
    id?: string;
    assetId?: string;
    fileId?: string;
    fileKey?: string;
    url?: string;
    projectId?: string;
    nodeId?: string;
    chatId?: string;
};

export function mediaListKey(item: MediaListIdentity, index: number): string {
    return [
        item.id,
        item.assetId,
        item.fileId,
        item.fileKey,
        item.projectId,
        item.nodeId,
        item.chatId,
        item.url,
        String(index),
    ].filter((part) => part != null && String(part).length > 0).join('|');
}

export function galleryMediaIdentity(item: GalleryFileItem): string {
    return String(item.fileId || item.fileKey || item.url || item.id || '').trim();
}

/** Same file can appear on many nodes/projects; the mention picker only needs one row. */
export function uniqueGalleryFiles(files: GalleryFileItem[]): GalleryFileItem[] {
    const seen = new Map<string, GalleryFileItem>();
    files.forEach((item, index) => {
        const identity = galleryMediaIdentity(item) || mediaListKey(item, index);
        const existing = seen.get(identity);
        if (!existing) {
            seen.set(identity, item);
            return;
        }
        const existingThumb = String(existing.thumbnailUrlLarge || '');
        const nextThumb = String(item.thumbnailUrlLarge || '');
        if (!existingThumb && nextThumb) seen.set(identity, item);
    });
    return [...seen.values()];
}

export function targetHandleMediaType(handle: unknown, targetType?: string): StudioMediaType | null {
    const value = String(handle || '').toLowerCase();
    // textToVideo's unified reference input accepts every file type.
    if (value === 'ref-in' && String(targetType || '').trim().toLowerCase() === 'texttovideo') return null;
    if (['img-ref', 'image-in', 'images-in', 'ref', 'ref-image', 'image-ref', 'ref-in'].includes(value)) {
        return 'image';
    }
    if (['vid-ref', 'video-in', 'video-ref'].includes(value)) return 'video';
    if (['audio-in', 'audio-ref'].includes(value)) return 'audio';
    return null;
}

export function selectedAssetsForEdge(
    source: Node | undefined,
    edge: Edge,
    targetType?: string,
): StudioMediaRef[] {
    if (!source || source.type !== 'assetRef') return [];
    const assets = normalizeAssetRefData((source.data || {}) as Record<string, unknown>);
    const wantedType = targetHandleMediaType(edge.targetHandle, targetType);
    const compatible = wantedType ? assets.filter((item) => item.type === wantedType) : assets;
    const selection = (edge.data as StudioEdgeData | undefined)?.assetSelection;
    if (selection?.mode !== 'manual') return compatible;
    const ids = new Set(selection.assetIds || []);
    return compatible.filter((item) => ids.has(item.id));
}
