import { createApiClient, unwrapApiData } from './api-client';
import type { NodeCatalogEntry, NodeCatalogListResponse } from '../types/node-catalog';
import type { NodeSettingField } from '../types/node-catalog';

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

export const nodeCatalogApi = {
    async list(params?: { search?: string; category?: string; activeOnly?: boolean }): Promise<NodeCatalogListResponse> {
        const res = await createApiClient().get(BASE, { params });
        return unwrapApiData(res);
    },

    async getByType(type: string): Promise<NodeCatalogEntry> {
        const res = await createApiClient().get(`${BASE}/type/${type}`);
        return unwrapApiData(res);
    },

    async create(payload: CreateNodeCatalogPayload): Promise<NodeCatalogEntry> {
        const res = await createApiClient().post(BASE, payload);
        return unwrapApiData(res);
    },

    async update(id: string, payload: UpdateNodeCatalogPayload): Promise<NodeCatalogEntry> {
        const res = await createApiClient().put(`${BASE}/${id}`, payload);
        return unwrapApiData(res);
    },

    async remove(id: string): Promise<{ success: boolean }> {
        const res = await createApiClient().delete(`${BASE}/${id}`);
        return unwrapApiData(res);
    },

    async reseed(): Promise<{ success: boolean; count: number }> {
        const res = await createApiClient().post(`${BASE}/seed/reset`);
        return unwrapApiData(res);
    },
};
