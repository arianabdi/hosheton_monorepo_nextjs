import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import {
    applyPrimaryInputMetrics,
    EMPTY_RUNTIME_METRICS,
    gptImageInputTokens,
    imagePatchTokens,
    type StudioRuntimeMetrics,
} from '@/app/(developers)/projects/lib/connected-input-metrics';

export type ChatAttachmentKind = 'image' | 'video' | 'audio';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif|svg)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv|avi)(\?|$)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|weba)(\?|$)/i;

export function classifyChatAttachmentKind(item: {
    type?: string;
    url?: string;
    label?: string;
    mime?: string;
} | null | undefined): ChatAttachmentKind {
    const mime = String(item?.mime || '').toLowerCase();
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('image/')) return 'image';

    const declared = String(item?.type || '').toLowerCase();
    if (declared === 'audio' || item?.label === 'audio') return 'audio';
    if (declared === 'video') return 'video';
    if (declared === 'image') return 'image';

    const name = `${item?.url || ''} ${item?.label || ''}`;
    if (AUDIO_EXT.test(name)) return 'audio';
    if (VIDEO_EXT.test(name)) return 'video';
    if (IMAGE_EXT.test(name)) return 'image';
    return 'image';
}

export function classifyChatFileKind(file: File): ChatAttachmentKind {
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('image/')) return 'image';
    const name = file.name || '';
    if (AUDIO_EXT.test(name)) return 'audio';
    if (VIDEO_EXT.test(name)) return 'video';
    return 'image';
}

/** سند/کد/جدول پیوست چت متنی — رسانه نیست و در شمارش/اعتبارسنجی ورودی‌های رسانه‌ای مدل نمی‌آید */
export function isChatFileAttachment(item: { type?: string } | null | undefined): boolean {
    return String(item?.type || '').toLowerCase() === 'file';
}

export function chatAttachmentsRuntimeMetrics(
    attachments: TemplatePreviewMedia[],
): StudioRuntimeMetrics {
    const result = { ...EMPTY_RUNTIME_METRICS };
    let firstImage: [number, number] | null = null;
    let firstVideo: [number, number] | null = null;
    for (const item of attachments) {
        if (isChatFileAttachment(item)) continue;
        const kind = classifyChatAttachmentKind(item);
        const width = Number(item.width) || 0;
        const height = Number(item.height) || 0;
        const duration = Number(item.durationSeconds) || 0;
        if (kind === 'video') {
            firstVideo ??= [width, height];
            result.inputVideoCount += 1;
            result.inputVideoDurationSeconds += duration;
            result.inputVideoWholeSeconds += Math.floor(duration);
            result.totalInputVideoPixels += width * height;
            result.maxInputVideoWidth = Math.max(result.maxInputVideoWidth, width);
            result.maxInputVideoHeight = Math.max(result.maxInputVideoHeight, height);
        } else if (kind === 'audio') {
            result.inputAudioCount += 1;
            result.inputAudioDurationSeconds += duration;
        } else {
            firstImage ??= [width, height];
            result.inputImageCount += 1;
            result.totalInputImagePixels += width * height;
            result.inputImagePatchTokens += imagePatchTokens(width, height);
            result.inputImageGptTokens += gptImageInputTokens(width, height);
            result.maxInputImageWidth = Math.max(result.maxInputImageWidth, width);
            result.maxInputImageHeight = Math.max(result.maxInputImageHeight, height);
        }
    }
    result.hasImageInput = result.inputImageCount > 0;
    result.hasVideoInput = result.inputVideoCount > 0;
    result.hasAudioInput = result.inputAudioCount > 0;
    applyPrimaryInputMetrics(result, firstVideo, firstImage);
    return result;
}

export function isSameChatMedia(a: TemplatePreviewMedia, b: TemplatePreviewMedia) {
    if (a.fileId && b.fileId) return a.fileId === b.fileId;
    if (a.fileKey && b.fileKey) return a.fileKey === b.fileKey;
    return Boolean(a.url && b.url && a.url === b.url);
}
