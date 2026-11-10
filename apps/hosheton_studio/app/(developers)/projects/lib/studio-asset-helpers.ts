import type { StudioNodeData } from '../[projectId]/types/studio';
import { buildPublicFileUrl, sanitizeLegacyStorageUrl } from '../[projectId]/lib/file-url';
import type { StudioAssetType } from './studio-assets-api';
import { normalizeAssetRefData } from './studio-media';

export function resolveNodeMediaForAsset(
    nodeType: string,
    nodeData: StudioNodeData,
): { type: Exclude<StudioAssetType, 'prompt'>; url: string; fileKey?: string; fileName?: string } | null {
    if (nodeType === 'textToImage') {
        const url = sanitizeLegacyStorageUrl(
            String(nodeData.imageUrl || (Array.isArray(nodeData.images) ? nodeData.images[0] : '') || '').trim(),
        );
        if (url) {
            return { type: 'image', url, fileName: String(nodeData.label || nodeData.fileName || '') };
        }
    }

    if (nodeType === 'assetRef') {
        // اول خود فایل‌ها (assets) — نوع/آدرس سطح نود در نودهای چندفایلی ممکن است کهنه باشد
        const first = normalizeAssetRefData(nodeData)[0];
        const rawType = String(first?.type || nodeData.assetType || 'image');
        if (rawType !== 'image' && rawType !== 'video' && rawType !== 'audio') return null;
        const fileKey = String(first?.fileKey || nodeData.fileKey || '').trim();
        const url = sanitizeLegacyStorageUrl(
            String(first?.url || first?.externalUrl || '').trim()
            || String(nodeData.externalUrl || '').trim()
            || (fileKey ? buildPublicFileUrl(fileKey) : '')
            || String(nodeData.assetUrl || '').trim(),
        );
        if (url) {
            return {
                type: rawType,
                url,
                fileKey: fileKey || undefined,
                fileName: String(first?.label || nodeData.fileName || nodeData.label || ''),
            };
        }
    }

    if (nodeType === 'textToVideo' || nodeType === 'aiAvatar') {
        const url = sanitizeLegacyStorageUrl(String(nodeData.videoUrl || '').trim());
        if (url) {
            return { type: 'video', url, fileName: String(nodeData.label || '') };
        }
    }

    if (nodeType === 'musicSfx') {
        const url = sanitizeLegacyStorageUrl(String(nodeData.audioUrl || '').trim());
        if (url) {
            return { type: 'audio', url, fileName: String(nodeData.label || '') };
        }
    }

    return null;
}
