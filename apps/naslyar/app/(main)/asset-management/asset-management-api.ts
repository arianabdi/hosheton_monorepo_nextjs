'use client';

/**
 * کلاینت API ماژول مدیریت اموال
 * ------------------------------------------------------------------------------
 * API اختصاصی نسل‌یار (اپ neslar) — همان سروری که حسابداری روی آن است.
 * آدرس با NEXT_PUBLIC_ASSET_MANAGEMENT_API_URL تنظیم می‌شود و در نبود آن به
 * NEXT_PUBLIC_ACCOUNTING_API_URL و سپس API اصلی برمی‌گردد.
 */

import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import type { AssetStatus, AssetLocationType } from './asset-management.utils';

export interface AssetEnvelope<T> {
    data: T;
    statusCode: number;
    message?: string;
}

export interface AssetCategory {
    _id: string;
    title: string;
    code?: string | null;
    description?: string | null;
    parentId?: string | null;
    isActive?: boolean;
    createdAt?: string;
}

export interface AssetLocation {
    _id: string;
    title: string;
    type: AssetLocationType;
    address?: string | null;
    parentId?: string | null;
    isActive?: boolean;
    createdAt?: string;
}

export interface AssetItem {
    _id: string;
    assetCode: string;
    title: string;
    model?: string | null;
    brand?: string | null;
    serialNumber?: string | null;
    categoryId?: string | null;
    locationId?: string | null;
    unit?: string | null;
    custodianUserId?: string | null;
    status: AssetStatus;
    invoiceNumber?: string | null;
    contractNumber?: string | null;
    supplier?: string | null;
    purchaseDate?: string | null;
    commissioningDate?: string | null;
    purchasePrice: number;
    warrantyCompany?: string | null;
    warrantyContractNumber?: string | null;
    warrantyStartDate?: string | null;
    warrantyEndDate?: string | null;
    warrantyTerms?: string | null;
    photoFileIds: string[];
    documentFileIds: string[];
    description?: string | null;
    decommissionedAt?: string | null;
    decommissionNote?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface AssetAssignment {
    _id: string;
    assetId: string;
    type: 'issue' | 'return' | 'transfer' | 'location_change';
    fromUserId?: string | null;
    toUserId?: string | null;
    toName?: string | null;
    locationId?: string | null;
    date: string;
    notes?: string | null;
    attachmentFileIds: string[];
    createdBy: string;
    createdAt?: string;
}

export interface AssetAuditChange {
    from: unknown;
    to: unknown;
}

export interface AssetAuditLog {
    _id: string;
    assetId: string;
    action: string;
    actorUserId: string;
    changes?: Record<string, AssetAuditChange> | null;
    detail?: string | null;
    createdAt?: string;
}

export interface TimelineEvent extends AssetAssignment {
    kind: 'assignment';
    date: string;
}

export interface TimelineAuditEvent extends AssetAuditLog {
    kind: 'audit';
}

export type AssetTimelineEvent = (TimelineEvent | TimelineAuditEvent) & { date: string };

export interface AssetDashboard {
    totalAssets: number;
    totalValue: number;
    byStatus: { status: AssetStatus; label: string; count: number }[];
    byCategory: { _id: string; count: number; totalValue: number }[];
    byLocation: { _id: string; count: number; totalValue: number }[];
    warrantyExpiringSoon: number;
}

export interface ListResult<T> {
    items: T[];
    totalItems: number;
    page?: number;
    limit?: number;
}

function getRequestConfig() {
    const { token } = useAuthStore.getState();
    const { baseUrl } = useAppStore.getState();
    const apiBase =
        process.env.NEXT_PUBLIC_ASSET_MANAGEMENT_API_URL ||
        process.env.NEXT_PUBLIC_ACCOUNTING_API_URL ||
        baseUrl ||
        process.env.NEXT_PUBLIC_API_URL ||
        '';
    return {
        apiBase,
        headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
}

async function request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    options: { params?: Record<string, unknown>; body?: unknown } = {},
): Promise<T> {
    const { apiBase, headers } = getRequestConfig();
    const res = await axios.request<AssetEnvelope<T>>({
        method,
        url: `${apiBase}${path}`,
        headers,
        params: options.params,
        data: options.body,
    });
    if (res.data.statusCode !== 200) {
        throw new Error(res.data.message || 'خطا در ارتباط با سرور مدیریت اموال');
    }
    return res.data.data;
}

export const assetManagementApi = {
    // ---------------------------------------------------------------- dashboard
    getDashboard: () => request<AssetDashboard>('get', '/api/asset-management/dashboard'),

    // ---------------------------------------------------------------- categories
    listCategories: () =>
        request<ListResult<AssetCategory>>('get', '/api/asset-management/categories', {
            params: { limit: 1000 },
        }),
    createCategory: (body: Record<string, unknown>) =>
        request<AssetCategory>('post', '/api/asset-management/categories', { body }),
    updateCategory: (id: string, body: Record<string, unknown>) =>
        request<AssetCategory>('put', `/api/asset-management/categories/${id}`, { body }),
    deleteCategory: (id: string) =>
        request<{ success: boolean }>('delete', `/api/asset-management/categories/${id}`),

    // ---------------------------------------------------------------- locations
    listLocations: () =>
        request<ListResult<AssetLocation>>('get', '/api/asset-management/locations', {
            params: { limit: 1000 },
        }),
    createLocation: (body: Record<string, unknown>) =>
        request<AssetLocation>('post', '/api/asset-management/locations', { body }),
    updateLocation: (id: string, body: Record<string, unknown>) =>
        request<AssetLocation>('put', `/api/asset-management/locations/${id}`, { body }),
    deleteLocation: (id: string) =>
        request<{ success: boolean }>('delete', `/api/asset-management/locations/${id}`),

    // ------------------------------------------------------------------- assets
    listAssets: (params: {
        status?: string;
        categoryId?: string;
        locationId?: string;
        custodianUserId?: string;
        warrantyExpiring?: string;
        q?: string;
        page?: number;
        limit?: number;
    }) => request<ListResult<AssetItem>>('get', '/api/asset-management/assets', { params }),
    getAsset: (id: string) => request<AssetItem>('get', `/api/asset-management/assets/${id}`),
    createAsset: (body: Record<string, unknown>) =>
        request<AssetItem>('post', '/api/asset-management/assets', { body }),
    updateAsset: (id: string, body: Record<string, unknown>) =>
        request<AssetItem>('put', `/api/asset-management/assets/${id}`, { body }),
    deleteAsset: (id: string) =>
        request<{ success: boolean }>('delete', `/api/asset-management/assets/${id}`),

    // ------------------------------------------------------- چرخه تحویل و جابه‌جایی
    assignAsset: (id: string, body: { toUserId: string; date?: string; notes?: string }) =>
        request<{ asset: AssetItem; assignment: AssetAssignment }>(
            'post',
            `/api/asset-management/assets/${id}/assign`,
            { body },
        ),
    returnAsset: (id: string, body: { date?: string; notes?: string }) =>
        request<{ asset: AssetItem; assignment: AssetAssignment }>(
            'post',
            `/api/asset-management/assets/${id}/return`,
            { body },
        ),
    transferAsset: (
        id: string,
        body: { toUserId?: string; locationId?: string; unit?: string; date?: string; notes?: string },
    ) =>
        request<{ asset: AssetItem; assignment: AssetAssignment }>(
            'post',
            `/api/asset-management/assets/${id}/transfer`,
            { body },
        ),
    changeAssetStatus: (id: string, body: { status: AssetStatus; notes?: string }) =>
        request<AssetItem>('post', `/api/asset-management/assets/${id}/status`, { body }),

    // ---------------------------------------------------------------- timeline
    getAssetTimeline: (id: string) =>
        request<{ asset: AssetItem; events: AssetTimelineEvent[] }>(
            'get',
            `/api/asset-management/assets/${id}/timeline`,
        ),
    getAssetQr: (id: string) =>
        request<{ assetCode: string; title: string; dataUrl: string }>(
            'get',
            `/api/asset-management/assets/${id}/qr`,
        ),

    // ------------------------------------------------------------------- audit
    listAuditLogs: (assetId?: string) =>
        request<ListResult<AssetAuditLog>>('get', '/api/asset-management/audit-logs', {
            params: { assetId: assetId || '' },
        }),
};
