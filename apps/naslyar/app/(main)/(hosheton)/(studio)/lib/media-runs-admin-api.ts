import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { getHoshetonStudioApiBase } from './studio-api-base';

const BASE = '/api/studio/media';

function authHeaders() {
    const token = useAuthStore.getState().token;
    return { authorization: `Bearer ${token}` };
}

export interface MediaRunListItem {
    _id: string;
    projectId: string;
    projectTitle?: string | null;
    userId: string;
    jobId: string;
    status: string;
    usage?: { totalCost?: number; currency?: string };
    totalCost?: number;
    currency?: string;
    providerId?: string | null;
    modelId?: string | null;
    errorMessage?: string;
    createdAt?: string;
    updatedAt?: string;
    executionOrder?: string[];
}

export interface MediaRunCostEntry {
    nodeId: string;
    nodeType?: string | null;
    label?: string | null;
    model?: string | null;
    cost: {
        amount?: number;
        currency?: string;
        unit?: string;
        vendorCostUsd?: number;
        markupPercent?: number;
        chargedUsd?: number;
        profitUsd?: number;
        breakdown?: Record<string, unknown>;
    };
    formula: string;
}

export interface MediaRunDetailResponse {
    run: MediaRunListItem & {
        nodeResults?: Record<string, unknown>;
        finalOutput?: Record<string, unknown>;
        executionOrder?: string[];
    };
    costEntries: MediaRunCostEntry[];
}

export const mediaRunsAdminApi = {
    async list(params?: {
        page?: number;
        limit?: number;
        status?: string;
        projectId?: string;
        userId?: string;
        jobId?: string;
        from?: string;
        to?: string;
    }): Promise<{ runs: MediaRunListItem[]; totalItems: number; page: number; limit: number }> {
        const baseUrl = getHoshetonStudioApiBase();
        const res = await axios.get(`${baseUrl}${BASE}/admin/runs`, {
            headers: authHeaders(),
            params,
        });
        return res.data?.data ?? { runs: [], totalItems: 0, page: 1, limit: 20 };
    },

    async getById(runId: string): Promise<MediaRunDetailResponse> {
        const baseUrl = getHoshetonStudioApiBase();
        const res = await axios.get(`${baseUrl}${BASE}/admin/runs/${encodeURIComponent(runId)}`, {
            headers: authHeaders(),
        });
        return res.data?.data;
    },
};
