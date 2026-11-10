import { createApiClient, unwrapApiData } from './api-client';
import type {
    AiAvatarListResponse,
    AiAvatarProfile,
    CreateAiAvatarPayload,
    StartVerificationResponse,
    SyncAvatarResponse,
    UpdateAiAvatarPayload,
    VerificationStatusResponse,
} from '../types/ai-avatar-api';

const BASE = '/api/studio/ai-avatar';

export const aiAvatarApi = {
    async updateAvatar(avatarId: string, payload: UpdateAiAvatarPayload): Promise<AiAvatarProfile> {
        const res = await createApiClient().put(`${BASE}/avatars/${avatarId}`, payload);
        return unwrapApiData(res);
    },

    async listAvatars(params?: { page?: number; limit?: number }): Promise<AiAvatarListResponse> {
        const res = await createApiClient().get(`${BASE}/avatars`, {
            params: {
                page: params?.page ?? 1,
                limit: params?.limit ?? 12,
            },
        });
        return unwrapApiData(res);
    },

    async listActiveAvatars(): Promise<AiAvatarListResponse> {
        const res = await createApiClient().get(`${BASE}/avatars/active`);
        return unwrapApiData(res);
    },

    async getAvatar(avatarId: string): Promise<AiAvatarProfile> {
        const res = await createApiClient().get(`${BASE}/avatars/${avatarId}`);
        return unwrapApiData(res);
    },

    async createAvatar(payload: CreateAiAvatarPayload): Promise<AiAvatarProfile> {
        const res = await createApiClient().post(`${BASE}/avatars`, payload);
        return unwrapApiData(res);
    },

    async deleteAvatar(avatarId: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/avatars/${avatarId}`);
        return unwrapApiData(res);
    },

    async startVerification(avatarId: string, callbackUrl?: string): Promise<StartVerificationResponse> {
        const res = await createApiClient().post(`${BASE}/avatars/${avatarId}/verification/start`, {
            callbackUrl,
        });
        return unwrapApiData(res);
    },

    async checkVerification(avatarId: string): Promise<VerificationStatusResponse> {
        const res = await createApiClient().get(`${BASE}/avatars/${avatarId}/verification/status`);
        return unwrapApiData(res);
    },

    async submitAssets(avatarId: string): Promise<{ avatarId: string; status: string; assets: unknown[] }> {
        const res = await createApiClient().post(`${BASE}/avatars/${avatarId}/assets/submit`, {});
        return unwrapApiData(res);
    },

    async syncAvatar(avatarId: string): Promise<SyncAvatarResponse> {
        const res = await createApiClient().post(`${BASE}/avatars/${avatarId}/sync`, {});
        return unwrapApiData(res);
    },
};
