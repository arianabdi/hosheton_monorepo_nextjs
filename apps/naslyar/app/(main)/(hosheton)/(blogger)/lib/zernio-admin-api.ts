import axios from 'axios';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { getHoshetonBloggerApiBase } from './blogger-api-base';

/** One account allocated to a slot of a pool key. */
export interface ZernioAllocatedAccount {
    _id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
    platform: string;
}

export interface ZernioPoolKey {
    _id: string;
    label: string;
    last4: string;
    profileId: string;
    webhookId: string;
    hasWebhook: boolean;
    allocatedAccounts: ZernioAllocatedAccount[];
    allocationCount: number;
    maxAccounts: number;
    isActive: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    /** only on GET /admin/keys/:id */
    receiveUrl?: string;
    /** only after create/edit: what happened to the key's webhook in Zernio */
    webhookAction?: 'exists' | 'updated' | 'created' | 'skipped';
    webhookError?: string;
}

export interface ZernioSummary {
    totalCapacity: number;
    usedSlots: number;
    freeSlots: number;
    keyCount: number;
    fullKeys: number;
    keysWithoutWebhook: number;
    customerCount: number;
    disconnectedAccounts: number;
    platforms: Array<{ platform: string; count: number }>;
}

export interface ZernioOwner {
    ownerId: string;
    name: string;
    email: string;
    mobile: string;
}

export interface ZernioConnectionRow {
    accountId: string;
    platform: string;
    displayName: string;
    username: string;
    avatarUrl: string;
    isConnected: boolean;
    connectedAt: string | null;
    owner: ZernioOwner;
    key: { keyId: string; label: string; last4: string };
}

export interface ZernioCustomerRow extends ZernioOwner {
    accountCount: number;
    disconnectedCount: number;
    lastConnectedAt: string | null;
    platforms: Record<string, number>;
    accounts: Array<{
        accountId: string;
        platform: string;
        displayName: string;
        username: string;
        isConnected: boolean;
        keyLabel: string;
        keyLast4: string;
    }>;
}

export interface TablePage<T> {
    rows: T[];
    totalItems: number;
    page: number;
    limit: number;
}

/** Platform-wide pool settings (OAuth callback, webhook base, Zernio API base). */
export interface ZernioPoolSettings {
    frontendBaseUrl: string;
    frontendCallbackPath: string;
    frontendCallbackUrl: string;
    publicApiBaseUrl: string;
    webhookPath: string;
    webhookExampleUrl: string;
    backendFallbackCallbackUrl: string;
    zernioApiBaseUrl: string;
    isSaved?: boolean;
}

export interface ZernioWebhookResult {
    keyId: string;
    webhookId: string;
    hasWebhook: boolean;
    action: 'exists' | 'updated' | 'created' | 'skipped';
    receiveUrl: string;
    message: string;
}

export type TableQuery = Record<string, string | number | undefined>;

/** Platforms that use the shared pool (telegram / bale / rubika connect directly). */
export const ZERNIO_PLATFORM_LABELS: Record<string, string> = {
    instagram: 'اینستاگرام',
    youtube: 'یوتیوب',
    tiktok: 'تیک‌تاک',
    twitter: 'ایکس (توییتر)',
    linkedin: 'لینکدین',
};

export function platformLabel(platform: string) {
    return ZERNIO_PLATFORM_LABELS[platform] || platform || '—';
}

function authHeaders() {
    const token = useAuthStore.getState().token;
    return { authorization: `Bearer ${token}` };
}

async function request<T>(method: 'get' | 'post' | 'put' | 'delete', path: string, body?: unknown, params?: TableQuery): Promise<T> {
    const base = getHoshetonBloggerApiBase();
    const { data } = await axios.request({
        method,
        url: `${base}${path}`,
        data: body,
        params,
        headers: authHeaders(),
        timeout: 45000,
    });
    return (data?.data ?? data) as T;
}

export const zernioAdminApi = {
    summary: () => request<ZernioSummary>('get', '/api/zernio/admin/summary'),
    connections: (query: TableQuery) =>
        request<TablePage<ZernioConnectionRow>>('get', '/api/zernio/admin/connections', undefined, query),
    customers: (query: TableQuery) =>
        request<TablePage<ZernioCustomerRow>>('get', '/api/zernio/admin/customers', undefined, query),
    keysTable: (query: TableQuery) =>
        request<TablePage<ZernioPoolKey>>('get', '/api/zernio/admin/keys', undefined, query),
    listKeys: () => request<{ keys: ZernioPoolKey[] }>('get', '/api/zernio/admin/keys'),
    getKey: (id: string) => request<ZernioPoolKey>('get', `/api/zernio/admin/keys/${id}`),
    createKey: (payload: { apiKey: string; label?: string; maxAccounts?: number }) =>
        request<ZernioPoolKey>('post', '/api/zernio/admin/keys', payload),
    updateKey: (id: string, payload: { maxAccounts?: number; label?: string; apiKey?: string }) =>
        request<ZernioPoolKey>('put', `/api/zernio/admin/keys/${id}`, payload),
    deleteKey: (id: string) => request<{ success: boolean }>('delete', `/api/zernio/admin/keys/${id}`),
    reregisterWebhook: (id: string) =>
        request<ZernioWebhookResult>('post', `/api/zernio/admin/keys/${id}/reregister-webhook`),
    getSettings: () => request<ZernioPoolSettings>('get', '/api/zernio/admin/settings'),
    updateSettings: (payload: {
        frontendBaseUrl?: string;
        frontendCallbackPath?: string;
        publicApiBaseUrl?: string;
        webhookPath?: string;
        zernioApiBaseUrl?: string;
    }) => request<ZernioPoolSettings>('put', '/api/zernio/admin/settings', payload),
};

/** Human message for the webhook outcome after create/edit. */
export function webhookOutcome(key: Pick<ZernioPoolKey, 'webhookAction' | 'webhookError'>): { ok: boolean; text: string } | null {
    switch (key.webhookAction) {
        case 'created':
            return { ok: true, text: 'webhook این کلید در Zernio ساخته شد.' };
        case 'updated':
            return { ok: true, text: 'webhook موجود در Zernio (مثلاً دستی‌ساخته) با آدرس درست اصلاح شد.' };
        case 'exists':
            return { ok: true, text: 'webhook این کلید از قبل درست بود.' };
        case 'skipped':
            return { ok: false, text: `webhook ثبت نشد${key.webhookError ? `: ${key.webhookError}` : ''} — بعد از اصلاح «تنظیمات اتصال» دکمهٔ «ثبت webhook» را بزنید.` };
        default:
            return null;
    }
}
