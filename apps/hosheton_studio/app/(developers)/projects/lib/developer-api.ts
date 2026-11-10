import { createApiClient, unwrapApiData } from './api-client';
import type {
    AiProviderLog,
    CreateProviderLogPayload,
    DeveloperInterceptMode,
    UpdateProviderLogPayload,
    ProviderLogsPage,
} from '../types/developer-api';

const BASE = '/api/developer/provider-logs';
const SETTINGS_BASE = '/api/developer/settings';

const HISTORY_PAGE_SIZE = 10;

class DeveloperApi {
    async getInterceptMode(): Promise<DeveloperInterceptMode> {
        const res = await createApiClient().get(`${SETTINGS_BASE}/intercept-mode`);
        return unwrapApiData(res);
    }

    async setInterceptMode(enabled: boolean): Promise<DeveloperInterceptMode> {
        const res = await createApiClient().patch(`${SETTINGS_BASE}/intercept-mode`, { enabled });
        return unwrapApiData(res);
    }

    async getPendingProviderLogs(): Promise<AiProviderLog[]> {
        const res = await createApiClient().get(`${BASE}/pending`);
        const data = unwrapApiData<AiProviderLog[] | { logs?: AiProviderLog[] }>(res);
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.logs)) return data.logs;
        return [];
    }

    async getProviderLogs(options?: { limit?: number; skip?: number }): Promise<ProviderLogsPage> {
        const limit = options?.limit ?? HISTORY_PAGE_SIZE;
        const skip = options?.skip ?? 0;
        const res = await createApiClient().get(BASE, { params: { limit, skip } });
        const data = unwrapApiData<ProviderLogsPage | AiProviderLog[]>(res);

        if (Array.isArray(data)) {
            return {
                logs: data,
                total: data.length,
                hasMore: false,
                limit,
                skip,
            };
        }

        return {
            logs: Array.isArray(data?.logs) ? data.logs : [],
            total: Number(data?.total) || 0,
            hasMore: !!data?.hasMore,
            limit: Number(data?.limit) || limit,
            skip: Number(data?.skip) || skip,
        };
    }

    async getProviderLog(logId: string): Promise<AiProviderLog> {
        const res = await createApiClient().get(`${BASE}/${logId}`);
        return unwrapApiData<AiProviderLog>(res);
    }

    async createProviderLog(payload: CreateProviderLogPayload): Promise<AiProviderLog> {
        const res = await createApiClient().post(BASE, payload);
        return unwrapApiData(res);
    }

    async updateProviderLog(logId: string, payload: UpdateProviderLogPayload): Promise<AiProviderLog> {
        const res = await createApiClient().patch(`${BASE}/${logId}`, payload);
        return unwrapApiData(res);
    }

    async approveRequest(logId: string): Promise<AiProviderLog> {
        const res = await createApiClient().post(`${BASE}/${logId}/approve`, {});
        return unwrapApiData(res);
    }

    async rejectRequest(logId: string): Promise<AiProviderLog> {
        const res = await createApiClient().post(`${BASE}/${logId}/reject`, {});
        return unwrapApiData(res);
    }

    async getProviderModel(modelId: string): Promise<any> {
        const res = await createApiClient().get(`/api/provider-models/${modelId}`);
        return unwrapApiData(res);
    }
}

export const developerApi = new DeveloperApi();
