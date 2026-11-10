import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { getHoshetonStudioApiBase } from './studio-api-base';

const BASE = '/api/studio/personas';

/** کاربر نمایشی استودیو — کاربر واقعی در users که فقط ادمین‌ها می‌دانند ساختگی است */
export interface PersonaOption {
    _id: string;
    fullName: string;
    username: string;
    avatar: string;
    gender: '' | 'male' | 'female' | string;
    /** حوزهٔ کاری: کلید تگ‌های «دسته‌بندی تگ‌ها» */
    tagKeys?: string[];
}

/** پاسخ انتخابگر: filtered = فقط هم‌حوزه‌ها، no_match = تگ داشت ولی کسی هم‌حوزه نبود (همه)، all = تگی نبود */
export interface PersonaOptionsResult {
    personas: PersonaOption[];
    mode: 'all' | 'filtered' | 'no_match';
    tags: string[];
    matchedCount?: number;
}

export interface PersonaRow extends PersonaOption {
    bio: string;
    instagram: string;
    note: string;
    tagKeys: string[];
    isActive: boolean;
    joinedAt: string | null;
    templateCount: number;
    publishedCount: number;
    conversationCount: number;
    createdAt: string | null;
}

export interface PersonaInput {
    fullName: string;
    username: string;
    gender: '' | 'male' | 'female';
    bio: string;
    instagram: string;
    avatar: string;
    note: string;
    tagKeys: string[];
    isActive?: boolean;
}

function config() {
    const { token } = useAuthStore.getState();
    return {
        baseUrl: getHoshetonStudioApiBase(),
        headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
}

export const personaApi = {
    async list(): Promise<PersonaRow[]> {
        const { baseUrl, headers } = config();
        const res = await axios.get(`${baseUrl}${BASE}`, { headers });
        return res.data.data.personas || [];
    },

    /**
     * فقط فعال‌ها — برای انتخابگر «منتشرکننده» قالب. با `tags` فقط هم‌حوزه‌های تگ‌های قالب
     * (خودش، والد یا زیرشاخه)؛ `include` = پرسونای فعلی قالب حتی اگر خارج از حوزه باشد.
     */
    async options(params?: { tags?: string[]; include?: string }): Promise<PersonaOptionsResult> {
        const { baseUrl, headers } = config();
        const res = await axios.get(`${baseUrl}${BASE}/options`, {
            headers,
            params: {
                ...(params?.tags?.length ? { tags: params.tags.join(',') } : {}),
                ...(params?.include ? { include: params.include } : {}),
            },
        });
        const data = res.data.data || {};
        return { personas: data.personas || [], mode: data.mode || 'all', tags: data.tags || [], matchedCount: data.matchedCount };
    },

    async create(body: PersonaInput): Promise<PersonaOption> {
        const { baseUrl, headers } = config();
        const res = await axios.post(`${baseUrl}${BASE}`, body, { headers });
        return res.data.data.persona;
    },

    async update(userId: string, body: Partial<PersonaInput>): Promise<PersonaOption> {
        const { baseUrl, headers } = config();
        const res = await axios.put(`${baseUrl}${BASE}/${userId}`, body, { headers });
        return res.data.data.persona;
    },

    async seedDefaults(): Promise<{ created: number; skipped: number }> {
        const { baseUrl, headers } = config();
        const res = await axios.post(`${baseUrl}${BASE}/seed-defaults`, {}, { headers });
        return res.data.data;
    },
};
