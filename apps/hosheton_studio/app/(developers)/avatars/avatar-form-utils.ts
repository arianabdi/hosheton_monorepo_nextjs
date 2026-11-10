import type { AiAvatarAssetEntry, AiAvatarProfile } from '@/app/(developers)/projects/types/ai-avatar-api';
import { buildPublicFileUrl } from '@/app/(developers)/projects/[projectId]/lib/file-url';
import type { CharacterSheetImage } from './components/CharacterSheetUpload';

function normalizeUrl(url: string): string {
    return url.trim().replace(/\/+$/, '').split('?')[0];
}

export function isProviderAssetApproved(entry?: AiAvatarAssetEntry): boolean {
    if (!entry) return false;
    if (entry.assetUri?.trim()) return true;
    const status = String(entry.status || '').toLowerCase();
    return (
        status === 'active' ||
        status === 'ready' ||
        status === 'succeeded' ||
        status === 'success' ||
        status === 'approved'
    );
}

function findAssetForUrl(assets: AiAvatarAssetEntry[] | undefined, url: string): AiAvatarAssetEntry | undefined {
    if (!assets?.length) return undefined;
    const target = normalizeUrl(url);
    return assets.find((a) => normalizeUrl(a.sourceUrl) === target);
}

export function sheetImagesToSourcePayload(images: CharacterSheetImage[]): {
    sourceFileKeys: string[];
    sourceImageUrls: string[];
} {
    const editable = images.filter((img) => !img.readOnly);
    const sourceFileKeys = editable.map((img) => img.fileKey).filter(Boolean);
    const sourceImageUrls = editable
        .filter((img) => !img.fileKey)
        .map((img) => img.externalUrl || img.previewUrl)
        .filter(Boolean) as string[];

    return { sourceFileKeys, sourceImageUrls };
}

export type PortraitPayloadOptions = {
    /** Do not send portrait fields (keep existing on server) */
    omitWhenEmpty?: boolean;
    /** Explicitly clear portrait on server */
    clearWhenEmpty?: boolean;
};

export function portraitToPayload(
    portrait: CharacterSheetImage | null,
    options?: PortraitPayloadOptions,
): { previewFileKey?: string; previewImageUrl?: string } {
    if (!portrait) {
        if (options?.clearWhenEmpty) {
            return { previewImageUrl: '', previewFileKey: '' };
        }
        if (options?.omitWhenEmpty) {
            return {};
        }
        return { previewImageUrl: '' };
    }

    const previewImageUrl = (portrait.previewUrl || portrait.externalUrl || '').trim();
    if (portrait.fileKey) {
        return {
            previewFileKey: portrait.fileKey,
            ...(previewImageUrl ? { previewImageUrl } : {}),
        };
    }
    return { previewImageUrl: previewImageUrl || '' };
}

export function avatarToAssetImages(avatar: AiAvatarProfile): CharacterSheetImage[] {
    const urls = avatar.sourceImageUrls ?? [];
    const seen = new Set<string>();

    const fromSources = urls.map((url) => {
        seen.add(normalizeUrl(url));
        const asset = findAssetForUrl(avatar.assets, url);
        const approved = isProviderAssetApproved(asset);
        return {
            fileId: url,
            fileKey: '',
            previewUrl: url,
            externalUrl: url,
            providerVerified: approved,
            providerStatus: asset?.status,
        };
    });

    const fromProviderOnly = (avatar.assets ?? [])
        .filter((a) => a.sourceUrl?.trim() && !seen.has(normalizeUrl(a.sourceUrl)))
        .map((a) => ({
            fileId: a.sourceUrl,
            fileKey: '',
            previewUrl: a.sourceUrl,
            externalUrl: a.sourceUrl,
            providerVerified: isProviderAssetApproved(a),
            providerStatus: a.status,
            readOnly: true,
        }));

    return [...fromSources, ...fromProviderOnly];
}

export function avatarToCardPortrait(avatar: AiAvatarProfile): CharacterSheetImage | null {
    const key = avatar.previewFileKey?.trim() || '';
    const url =
        avatar.previewImageUrl?.trim() ||
        (key ? buildPublicFileUrl(key) : '');
    if (!url) return null;
    return {
        fileId: url,
        fileKey: key,
        previewUrl: url,
        externalUrl: key ? undefined : url,
    };
}

/** @deprecated use avatarToAssetImages */
export function avatarToSheetImages(sourceImageUrls: string[] = []): CharacterSheetImage[] {
    return sourceImageUrls.map((url) => ({
        fileId: url,
        fileKey: '',
        previewUrl: url,
        externalUrl: url,
    }));
}

export function portraitPreviewUrl(portrait: CharacterSheetImage | null): string | undefined {
    if (!portrait) return undefined;
    return portrait.previewUrl || portrait.externalUrl;
}
