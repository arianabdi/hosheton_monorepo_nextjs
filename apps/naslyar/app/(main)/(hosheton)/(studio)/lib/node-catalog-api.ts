import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import type { NodeCatalogEntry, NodeCatalogListResponse, NodeSettingField } from '../types/node-catalog';
import { getHoshetonStudioApiBase } from './studio-api-base';

const BASE = '/api/studio/media/nodes';

export interface CreateNodeCatalogPayload {
    type: string;
    category: string;
    label: string;
    labelFa: string;
    description?: string;
    descriptionFa?: string;
    icon?: string;
    defaultData?: Record<string, unknown>;
    settingsFields?: NodeSettingField[];
    providerClass?: string;
    executable?: boolean;
    passthrough?: boolean;
    sortOrder?: number;
}

export type UpdateNodeCatalogPayload = Partial<CreateNodeCatalogPayload> & { isActive?: boolean };

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

export const nodeCatalogApi = {
    async list(params?: { search?: string; category?: string; activeOnly?: boolean }): Promise<NodeCatalogListResponse> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}`, { params, headers });
        return res.data.data;
    },

    async getById(id: string): Promise<NodeCatalogEntry> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/${id}`, { headers });
        return res.data.data;
    },

    async getByType(type: string): Promise<NodeCatalogEntry> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.get(`${baseUrl}${BASE}/type/${type}`, { headers });
        return res.data.data;
    },

    async create(payload: CreateNodeCatalogPayload): Promise<NodeCatalogEntry> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}`, payload, { headers });
        return res.data.data;
    },

    async update(id: string, payload: UpdateNodeCatalogPayload): Promise<NodeCatalogEntry> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.put(`${baseUrl}${BASE}/${id}`, payload, { headers });
        return res.data.data;
    },

    async remove(id: string): Promise<{ success: boolean }> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.delete(`${baseUrl}${BASE}/${id}`, { headers });
        return res.data.data;
    },

    async reseed(): Promise<{ success: boolean; count: number }> {
        const { baseUrl, headers } = getRequestConfig();
        const res = await axios.post(`${baseUrl}${BASE}/seed/reset`, {}, { headers });
        return res.data.data;
    },
};
