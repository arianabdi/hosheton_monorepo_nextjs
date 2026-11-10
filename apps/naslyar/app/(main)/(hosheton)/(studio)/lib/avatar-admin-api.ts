import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { getHoshetonStudioApiBase } from './studio-api-base';

const BASE = '/api/studio/ai-avatar';

export interface ApprovedAvatarOwner {
    _id: string;
    fullName?: string;
    email?: string;
    username?: string;
}

export interface ApprovedAvatarAsset {
    assetId?: string;
    assetUri?: string;
    sourceUrl?: string;
    name?: string;
    status?: string;
    failureReason?: string;
}

export interface ApprovedAvatar {
    _id: string;
    name: string;
    description?: string;
    status: string;
    previewImageUrl?: string;
    byteplusAssetUri?: string;
    byteplusAssetId?: string;
    byteplusGroupId?: string;
    byteplusStatus?: string;
    userId: string;
    owner?: ApprovedAvatarOwner | null;
    updatedAt?: string;
    assets?: ApprovedAvatarAsset[];
    sourceImageUrls?: string[];
}

export interface ApprovedAvatarDetail extends ApprovedAvatar {
    assets: ApprovedAvatarAsset[];
    sourceImageUrls?: string[];
}

export interface BytePlusRemoteAsset {
    assetId: string;
    groupId?: string;
    name?: string;
    status: string;
    url?: string;
    assetUri?: string;
}

export interface BytePlusRemoteGroup {
    groupId: string;
    name?: string;
    title?: string;
    groupType?: string;
}

function getRequestConfig() {
    const { token } = useAuthStore.getState();
    const baseUrl = getHoshetonStudioApiBase();
    return {
        baseUrl,
        headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
}

export const avatarAdminApi = {
    async listApproved(params?: { search?: string; page?: number; limit?: number }) {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/avatars/admin/approved`, { headers, params });
        return res.data.data as { avatars: ApprovedAvatar[]; total: number; page: number; limit: number };
    },

    async listBytePlusAssets() {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/avatars/admin/byteplus-assets`, { headers });
        return res.data.data as {
            groups: BytePlusRemoteGroup[];
            assets: BytePlusRemoteAsset[];
            totalAssets: number;
            totalGroups: number;
        };
    },

    async syncFromBytePlus() {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/avatars/admin/sync-byteplus`, {}, { headers });
        return res.data.data as { imported: number; updated: number; skipped: number; remoteTotal: number };
    },

    async importAsset(body: {
        assetId: string;
        groupId?: string;
        name?: string;
        userId?: string;
        previewImageUrl?: string;
    }) {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/avatars/admin/import`, body, { headers });
        return res.data.data as ApprovedAvatar;
    },

    async createForUser(body: {
        userId: string;
        name: string;
        description?: string;
        sourceImageUrls?: string[];
        sourceFileKeys?: string[];
        byteplusAssetId?: string;
        byteplusGroupId?: string;
    }) {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/avatars/admin/create-for-user`, body, { headers });
        return res.data.data as ApprovedAvatar;
    },

    async assignUser(avatarId: string, userId: string) {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(
            `${baseUrl}${BASE}/avatars/admin/${avatarId}/assign-user`,
            { userId },
            { headers },
        );
        return res.data.data as ApprovedAvatar;
    },

    async getById(avatarId: string) {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/avatars/admin/${avatarId}`, { headers });
        return res.data.data as ApprovedAvatarDetail;
    },

    async updatePreview(avatarId: string, body: { previewImageUrl?: string; previewFileKey?: string }) {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(
            `${baseUrl}${BASE}/avatars/admin/${avatarId}/preview`,
            body,
            { headers },
        );
        return res.data.data as ApprovedAvatar;
    },

    async searchUsers(search: string) {
        const { token } = useAuthStore.getState();
        const { baseUrl } = useAppStore.getState();
        const headers = {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
        const q = search.trim();
        const params: Record<string, string | number> = { limit: 20, page: 1 };
        if (q.includes('@')) params.email = q;
        else params.username = q;

        const res = await axios.get(`${baseUrl}/api/user/list`, { headers, params });
        const data = res.data.data;
        return (data?.users || data?.items || []) as Array<{
            _id: string;
            fullName?: string;
            email?: string;
            username?: string;
        }>;
    },
};
