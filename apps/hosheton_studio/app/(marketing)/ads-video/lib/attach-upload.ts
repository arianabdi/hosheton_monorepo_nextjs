import { useAuthStore } from '@/app/zustand/store/authStore';
import {
    uploadFileInChunks,
    resolveUploadedFileRef,
} from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import { buildPublicFileUrl } from '@/app/(developers)/projects/[projectId]/lib/file-url';
import type { AdsAttachment } from './ads-video-api';

const MAX_SIZES: Record<string, number> = {
    image: 20 * 1024 * 1024,
    video: 300 * 1024 * 1024,
    audio: 60 * 1024 * 1024,
};

export function kindOfFile(file: File): 'image' | 'video' | 'audio' | null {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return null;
}

export function attachmentSizeError(file: File): string | null {
    const kind = kindOfFile(file);
    if (!kind) return 'kind';
    if (file.size > MAX_SIZES[kind]) return 'size';
    return null;
}

/**
 * آپلود یک فایل به‌عنوان پیوست تولید (آپلود chunked روی همان S3 چت) —
 * هم برای دکمه‌ی «پیوست» و هم برای Ctrl+V در کامپوزر استفاده می‌شود.
 */
export async function uploadAdsAttachment(file: File): Promise<AdsAttachment | null> {
    const token = useAuthStore.getState().token || '';
    const kind = kindOfFile(file);
    if (!kind) return null;
    if (file.size > MAX_SIZES[kind]) return null;
    try {
        const result = await uploadFileInChunks({ file, token });
        const { fileId, fileKey } = resolveUploadedFileRef(result);
        if (!fileKey) return null;
        return {
            fileId,
            fileKey,
            url: buildPublicFileUrl(fileKey),
            type: kind,
            label: file.name,
            assetId: fileId,
        };
    } catch {
        return null;
    }
}

/** آپلود چند فایل — موارد ناموفق بی‌صدا حذف می‌شوند و خطا در خروجی برمی‌گردد */
export async function uploadAdsAttachments(
    files: File[],
): Promise<{ attachments: AdsAttachment[]; failures: number }> {
    const attachments: AdsAttachment[] = [];
    let failures = 0;
    for (const file of files) {
        const uploaded = await uploadAdsAttachment(file);
        if (uploaded) attachments.push(uploaded);
        else failures += 1;
    }
    return { attachments, failures };
}
