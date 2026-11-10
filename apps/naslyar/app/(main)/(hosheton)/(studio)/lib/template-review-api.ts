import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { getHoshetonStudioApiBase } from './studio-api-base';

const BASE = '/api/studio/media/workflow-templates';

export type MediaTemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type MediaTemplateKind = 'workflow' | 'prompt';

export interface TemplatePreviewMedia {
    url: string;
    type: 'image' | 'video';
    fileId?: string;
    fileKey?: string;
    thumbnailUrl?: string;
    thumbnailUrlLarge?: string;
    label?: string;
    isCover?: boolean;
    width?: number;
    height?: number;
    aspectRatio?: number;
}

export interface MediaWorkflowTemplate {
    _id: string;
    ownerUserId: string;
    /** سازندهٔ واقعی وقتی قالب به نام کاربر نمایشی منتشر شده (null = خود ownerUserId) */
    authorUserId?: string | null;
    sourceProjectId?: string;
    version?: number;
    title: string;
    description?: string;
    kind?: MediaTemplateKind;
    aiModels?: string[];
    promptText?: string;
    tags?: string[];
    categoryIds?: string[];
    previewMedia?: TemplatePreviewMedia[];
    /** Public URL key for /explore/<slug> — auto-generated from title when empty. */
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    isForSale?: boolean;
    price?: number;
    nodes?: unknown[];
    edges?: unknown[];
    status: MediaTemplateStatus;
    visibility?: string;
    reviewNote?: string;
    submittedAt?: string;
    reviewedAt?: string;
    usageCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

/** Mirror of the API slug normalizer (template-slug.util.ts) — keep both in sync. */
export function normalizeTemplateSlugInput(raw: string): string {
    return String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[\s\u200b-\u200f\u202a-\u202e]+/g, '-')
        .replace(/[^\p{L}\p{N}-]+/gu, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/g, '');
}

export interface TemplateReviewListResponse {
    templates: MediaWorkflowTemplate[];
    total: number;
    page: number;
    limit: number;
}

export interface TemplateReviewChecklistItem {
    _id: string;
    label: string;
    sortOrder?: number;
}

export interface TemplateReviewChecklistResponse {
    items: TemplateReviewChecklistItem[];
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

export const templateReviewApi = {
    async listReviewQueue(params?: {
        status?: 'pending' | 'approved' | 'rejected' | 'draft' | 'all';
        page?: number;
        limit?: number;
    }): Promise<TemplateReviewListResponse> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/admin/review-queue`, { headers, params });
        return res.data.data;
    },

    async getById(id: string): Promise<MediaWorkflowTemplate> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/admin/${id}`, { headers });
        return res.data.data;
    },

    async review(id: string, body: { status: 'approved' | 'rejected'; reviewNote?: string }): Promise<MediaWorkflowTemplate> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(`${baseUrl}${BASE}/${id}/review`, body, { headers });
        return res.data.data;
    },

    async adminCreate(body: {
        title: string;
        description?: string;
        kind?: MediaTemplateKind;
        promptText?: string;
        aiModels?: string[];
        tags?: string[];
        categoryIds?: string[];
        previewMedia?: TemplatePreviewMedia[];
        slug?: string;
        metaTitle?: string;
        metaDescription?: string;
        isForSale?: boolean;
        price?: number;
        /** انتشار به نام کاربر نمایشی */
        publishAsUserId?: string;
    }): Promise<MediaWorkflowTemplate> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/admin`, body, { headers });
        return res.data.data;
    },

    async adminUpdate(id: string, body: {
        title: string;
        description?: string;
        kind?: MediaTemplateKind;
        promptText?: string;
        aiModels?: string[];
        tags?: string[];
        categoryIds?: string[];
        previewMedia?: TemplatePreviewMedia[];
        slug?: string;
        metaTitle?: string;
        metaDescription?: string;
        isForSale?: boolean;
        price?: number;
        /** منتشرکننده: شناسهٔ کاربر نمایشی، '' = برگشت به سازندهٔ واقعی */
        publishAsUserId?: string;
    }): Promise<MediaWorkflowTemplate> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(`${baseUrl}${BASE}/admin/${id}`, body, { headers });
        return res.data.data;
    },

    async adminRemove(id: string): Promise<{ success: boolean }> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.delete(`${baseUrl}${BASE}/admin/${id}`, { headers });
        return res.data.data;
    },

    async adminRemovePreviewMedia(id: string, media: TemplatePreviewMedia): Promise<MediaWorkflowTemplate> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/admin/${id}/preview-media/delete`, media, { headers });
        return res.data.data;
    },

    async purgePreviewMedia(media: TemplatePreviewMedia): Promise<{ success: boolean }> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/admin/preview-media/purge`, media, { headers });
        return res.data.data;
    },

    async listReviewChecklistItems(): Promise<TemplateReviewChecklistResponse> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/admin/review-checklist-items`, { headers });
        return res.data.data;
    },

    async createReviewChecklistItem(label: string): Promise<TemplateReviewChecklistItem> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/admin/review-checklist-items`, { label }, { headers });
        return res.data.data;
    },

    async deleteReviewChecklistItem(itemId: string): Promise<{ success: boolean }> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.delete(`${baseUrl}${BASE}/admin/review-checklist-items/${itemId}`, { headers });
        return res.data.data;
    },

    async getChatFeatured(): Promise<{ templateIds: string[]; templates: MediaWorkflowTemplate[]; max: number }> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/studio/marketplace/chat-featured`, { headers });
        return res.data.data;
    },

    async saveChatFeatured(templateIds: string[]): Promise<{ templateIds: string[]; templates: MediaWorkflowTemplate[]; max: number }> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/studio/marketplace/chat-featured`, { templateIds }, { headers });
        return res.data.data;
    },
};
