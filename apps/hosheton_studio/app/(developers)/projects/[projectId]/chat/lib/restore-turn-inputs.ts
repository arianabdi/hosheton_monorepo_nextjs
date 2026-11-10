import {
    previewMediaToMention,
    type StudioMediaMention,
} from '@/app/(developers)/projects/lib/studio-media';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { isSameChatMedia } from './chat-attachment-kind';

/** منشنی که فایلش پیوست نیست، به‌شکل پیوست (همان assetId تا توکن پرامپت به آن وصل بماند) */
export function mentionToAttachment(mention: StudioMediaMention): TemplatePreviewMedia {
    return {
        assetId: mention.assetId,
        type: mention.type,
        label: mention.label,
        url: mention.url || '',
        fileId: mention.fileId,
        fileKey: mention.fileKey,
        thumbnailUrl: mention.thumbnailUrl,
        thumbnailUrlLarge: mention.thumbnailUrlLarge,
        width: mention.width,
        height: mention.height,
        durationSeconds: mention.durationSeconds,
        source: 'generated',
    };
}

/** پیوست‌های فعلی + پیوست‌های تازه (بدون تکرار؛ فایل تکراری همان نسخه موجود می‌ماند) */
export function mergeChatAttachments(
    current: TemplatePreviewMedia[],
    additions: TemplatePreviewMedia[],
): TemplatePreviewMedia[] {
    const next = [...current];
    for (const item of additions) {
        if (!next.some((existing) => isSameChatMedia(existing, item))) next.push(item);
    }
    return next;
}

/**
 * هر منشن را به پیوستی که واقعاً در کادر هست وصل می‌کند: اگر همان فایل با شناسه دیگری
 * از قبل پیوست بوده، assetId منشن و توکن آن در پرامپت به شناسه همان پیوست عوض می‌شود.
 * بدون این، توکن‌های پرامپتِ دوباره‌استفاده‌شده به فایلی اشاره می‌کردند که در کادر نیست.
 */
export function relinkMentionsToAttachments(
    promptText: string,
    mentions: StudioMediaMention[],
    attachments: TemplatePreviewMedia[],
): { promptText: string; mentions: StudioMediaMention[] } {
    let text = promptText;
    const relinked = mentions.map((mention) => {
        const match = attachments.find((item) => isSameChatMedia(item, mentionToAttachment(mention)));
        if (!match) return mention;
        const assetId = previewMediaToMention(match).assetId;
        if (assetId === mention.assetId) return mention;
        text = text.split(`(asset:${mention.assetId})`).join(`(asset:${assetId})`);
        return { ...mention, assetId };
    });
    return { promptText: text, mentions: relinked };
}
