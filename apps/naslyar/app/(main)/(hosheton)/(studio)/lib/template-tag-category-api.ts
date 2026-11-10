import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { getHoshetonStudioApiBase } from './studio-api-base';
import type { TemplatePreviewMedia } from './template-review-api';

const BASE = '/api/studio/marketplace';

/** فیلدهای سئو و درخت تگ — هر تگ صفحهٔ فرود /explore/<key-با-خط-تیره> در استودیو است */
export interface TemplateTagSeoFields {
    /** key تگ والد؛ null = تگ اصلی */
    parentKey?: string | null;
    /** نام فارسی صفحه؛ خالی = ترجمهٔ key */
    label?: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    content?: string;
    image?: string;
    noindex?: boolean;
}

export interface TemplateTagCategory extends TemplateTagSeoFields {
    _id: string;
    key: string;
    sortOrder?: number;
    isAlive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type TemplateTagCategoryInput = TemplateTagSeoFields & { key: string; sortOrder?: number };

/** slug آدرس تگ در اکسپلور — همان قاعدهٔ API (templateTagSlug) */
export function templateTagSlug(key: string): string {
    return String(key || '').replace(/_/g, '-');
}

export interface TemplateTagCategoryListResponse {
    items: TemplateTagCategory[];
    total: number;
    page: number;
    limit: number;
}

export interface TemplateTagPublicItem {
    key: string;
    sortOrder: number;
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

export const templateTagCategoryApi = {
    async listPublic(): Promise<{ tags: TemplateTagPublicItem[] }> {
        const { baseUrl } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/template-tags`);
        return res.data.data;
    },

    async list(params?: { page?: number; limit?: number }): Promise<TemplateTagCategoryListResponse> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/template-tags/admin`, { headers, params });
        return res.data.data;
    },

    async getById(id: string): Promise<TemplateTagCategory> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/template-tags/admin/${id}`, { headers });
        return res.data.data;
    },

    async create(body: TemplateTagCategoryInput): Promise<TemplateTagCategory> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/template-tags`, body, { headers });
        return res.data.data;
    },

    async update(id: string, body: Partial<TemplateTagCategoryInput>): Promise<TemplateTagCategory> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(`${baseUrl}${BASE}/template-tags/${id}`, body, { headers });
        return res.data.data;
    },

    async remove(id: string): Promise<{ ok: boolean }> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.delete(`${baseUrl}${BASE}/template-tags/${id}`, { headers });
        return res.data.data;
    },

    /** قالب‌های ویژهٔ صفحهٔ دستهٔ اصلی (id = _id رکورد تگ؛ فقط تگ بدون والد) */
    async getFeatured(id: string): Promise<TemplateTagFeaturedSelection> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/template-tags/admin/${id}/featured`, { headers });
        return res.data.data;
    },

    async saveFeatured(id: string, templateIds: string[]): Promise<TemplateTagFeaturedSelection> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(`${baseUrl}${BASE}/template-tags/${id}/featured`, { templateIds }, { headers });
        return res.data.data;
    },

    /** جستجوی قالب‌های منتشرشده (همان API عمومی اکسپلور؛ categoryPath = slugهای دسته) */
    async searchListed(params: { search?: string; categoryPath?: string; page?: number; limit?: number }): Promise<{
        templates: TemplateTagFeaturedItem[];
        total: number;
    }> {
        const { baseUrl } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/explore`, {
            params: {
                page: params.page || 1,
                limit: params.limit || 10,
                ...(params.search ? { search: params.search } : {}),
                ...(params.categoryPath ? { categoryPath: params.categoryPath } : {}),
            },
        });
        return res.data.data;
    },
};

/** حداقل فیلدهای قالب برای انتخاب قالب ویژه (هم سند ادمین، هم آیتم explore) */
export interface TemplateTagFeaturedItem {
    _id: string;
    title: string;
    previewMedia?: TemplatePreviewMedia[];
    creator?: { fullName?: string } | null;
}

export interface TemplateTagFeaturedSelection {
    tagId: string;
    key: string;
    templateIds: string[];
    templates: TemplateTagFeaturedItem[];
    max: number;
}
