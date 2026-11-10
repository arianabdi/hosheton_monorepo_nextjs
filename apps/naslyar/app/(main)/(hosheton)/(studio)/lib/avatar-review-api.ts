import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { getHoshetonStudioApiBase } from './studio-api-base';

const BASE = '/api/studio/ai-avatar';

export type AiAvatarAdminReviewStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type AiAvatarStatus =
    | 'draft'
    | 'admin_pending'
    | 'verification_pending'
    | 'verification_failed'
    | 'asset_uploading'
    | 'asset_review'
    | 'active'
    | 'rejected'
    | 'error';

export interface AvatarReviewOwner {
    _id: string;
    fullName?: string;
    email?: string;
    username?: string;
    mobile?: string;
}

export interface AvatarReviewItem {
    _id: string;
    userId: string;
    name: string;
    description?: string;
    status: AiAvatarStatus;
    adminReviewStatus: AiAvatarAdminReviewStatus;
    previewImageUrl?: string;
    sourceImageUrls?: string[];
    lastByteplusError?: string;
    failureReason?: string;
    reviewNote?: string;
    submittedForAdminAt?: string;
    reviewedAt?: string;
    providerAccountId?: string;
    owner?: AvatarReviewOwner | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface AvatarReviewListResponse {
    avatars: AvatarReviewItem[];
    total: number;
    page: number;
    limit: number;
}

export interface AvatarReviewDetail extends AvatarReviewItem {
    verificationUrl?: string;
    bytedToken?: string;
    byteplusGroupId?: string;
    byteplusAssetUri?: string;
    byteplusApiKeyPreview?: string;
    byteplusApiKeyIdPreview?: string;
    savedAccessKeyId?: string;
    hasSavedSecret?: boolean;
    hasSavedAccessKey?: boolean;
    providerAccount?: {
        _id: string;
        name?: string;
        apiKey?: string;
        isActive?: boolean;
    } | null;
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

export const avatarReviewApi = {
    async listReviewQueue(params?: {
        status?: 'pending' | 'approved' | 'rejected' | 'all';
        page?: number;
        limit?: number;
    }): Promise<AvatarReviewListResponse> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/avatars/admin/review-queue`, { headers, params });
        return res.data.data;
    },

    async getById(avatarId: string): Promise<AvatarReviewDetail> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/avatars/admin/${avatarId}`, { headers });
        return res.data.data;
    },

    async review(
        avatarId: string,
        body: {
            status: 'approved' | 'rejected';
            reviewNote?: string;
            apiKey?: string;
            apiKeyId?: string;
            accessKeyId?: string;
            secretAccessKey?: string;
        },
    ): Promise<AvatarReviewDetail> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(`${baseUrl}${BASE}/avatars/admin/${avatarId}/review`, body, { headers });
        return res.data.data;
    },

    async retryByteplus(
        avatarId: string,
        body?: {
            apiKey?: string;
            apiKeyId?: string;
            accessKeyId?: string;
            secretAccessKey?: string;
            callbackUrl?: string;
        },
    ): Promise<AvatarReviewDetail> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/avatars/admin/${avatarId}/retry-byteplus`, body || {}, {
            headers,
        });
        return res.data.data;
    },
};
