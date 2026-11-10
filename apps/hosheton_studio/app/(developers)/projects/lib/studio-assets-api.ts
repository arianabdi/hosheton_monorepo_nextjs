import { createApiClient, unwrapApiData } from './api-client';

export type StudioAssetType = 'prompt' | 'image' | 'video' | 'audio';

export type StudioAssetPayload =
    | { promptText: string }
    | { url: string; fileKey?: string; fileName?: string };

export interface StudioAssetItem {
    _id: string;
    userId: string;
    type: StudioAssetType;
    name: string;
    payload: StudioAssetPayload;
    promptText?: string;
    mediaUrl?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface StudioStorageUsage {
    usedBytes: number;
    maxBytes: number;
    usedPercent: number;
    fileCount: number;
}

export const STUDIO_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;

const BASE = '/api/studio/assets';

export const STUDIO_ASSET_TYPE_LABELS: Record<StudioAssetType, string> = {
    prompt: 'prompt',
    image: 'image',
    video: 'video',
    audio: 'audio',
};

export const studioAssetsApi = {
    async list(type?: StudioAssetType): Promise<{ assets: StudioAssetItem[] }> {
        const res = await createApiClient().get(BASE, {
            params: type ? { type } : {},
        });
        return unwrapApiData(res);
    },

    async getStorageUsage(): Promise<StudioStorageUsage> {
        const res = await createApiClient().get(`${BASE}/storage`);
        return unwrapApiData(res);
    },

    async create(payload: {
        type: StudioAssetType;
        name: string;
        payload: StudioAssetPayload;
    }): Promise<{ asset: StudioAssetItem }> {
        const res = await createApiClient().post(BASE, payload);
        return unwrapApiData(res);
    },

    async update(
        id: string,
        payload: { name?: string; payload?: StudioAssetPayload },
    ): Promise<{ asset: StudioAssetItem }> {
        const res = await createApiClient().put(`${BASE}/${id}`, payload);
        return unwrapApiData(res);
    },

    async remove(id: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/${id}`);
        return unwrapApiData(res);
    },
};

export function getStudioAssetMediaUrl(item: StudioAssetItem): string {
    if (item.type === 'prompt') return '';
    const payload = item.payload as { url?: string };
    return item.mediaUrl || payload?.url || '';
}

export function getStudioAssetPromptText(item: StudioAssetItem): string {
    if (item.type !== 'prompt') return '';
    const payload = item.payload as { promptText?: string };
    return item.promptText || payload?.promptText || '';
}
