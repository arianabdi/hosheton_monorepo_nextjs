import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';

/**
 * Client of the shared subscription module (my-workspace-api/libs/core/src/subscription).
 * Works against whichever app API the admin is signed into (useAppStore.baseUrl) — every app that
 * imports SubscriptionModule serves the same routes.
 */

export const UNLIMITED = -1;

export type FeatureType = 'boolean' | 'quantity';
export type FeatureUsageMode = 'switch' | 'consumable' | 'counter' | 'cap';
export type FeatureResetInterval = 'monthly' | 'period' | 'never';
export type PlanValue = boolean | number | null;

export interface FeatureUsageRef {
    module: string;
    where: string;
    why: string;
}

export interface SubscriptionFeature {
    _id: string;
    code: string;
    name: string;
    description?: string;
    publicDescription?: string;
    type: FeatureType;
    usageMode?: FeatureUsageMode;
    resetInterval?: FeatureResetInterval | null;
    defaultValue?: PlanValue;
    order?: number;
    unit?: string;
    showInCard?: boolean;
    group?: { title: string; slug: string } | null;
    source?: 'code' | 'admin';
    usedIn?: FeatureUsageRef[];
    enforcement?: 'server' | 'client';
    syncedAt?: string;
}

export interface SubscriptionPlan {
    _id: string;
    name: string;
    slug?: string;
    description?: string;
    status: 'active' | 'inactive';
    isMostPopular?: boolean;
    isDefault?: boolean;
    order?: number;
    createdAt?: string;
}

export interface PlanDetail extends SubscriptionPlan {
    features: Array<{ featureId: string; value: PlanValue }>;
}

export interface PlanPrice {
    _id: string;
    planId: { _id: string; name: string } | string;
    billingPeriod: string;
    price: number;
    currency: string;
    isAlive?: boolean;
    createdAt?: string;
}

export interface AdminUser {
    _id: string;
    email: string;
    fullName: string;
    mobile: string;
    username: string;
}

export interface SubscriptionRow {
    _id: string;
    user: AdminUser;
    plan: { _id: string; name: string; slug: string } | null;
    price: { price: number; currency: string; billingPeriod: string } | null;
    status: string;
    effectiveStatus: 'active' | 'trialing' | 'expired' | 'canceled';
    isTest: boolean;
    startsAt: string;
    endsAt: string;
    createdAt: string;
}

export interface SubscriptionOverview {
    totals: { active: number; paying: number; expiringSoon: number; test: number; monthlyRevenue: number };
    byPlan: Array<{ planId: string; planName: string; active: number; paying: number }>;
    setup: {
        defaultPlan: { _id: string; name: string; active: boolean } | null;
        activePlans: number;
        featuresWithoutValues: string[];
        catalogApp: string | null;
        lastSync: CatalogSyncReport | null;
    };
}

export interface CatalogSyncReport {
    app: string;
    at: string;
    created: string[];
    updated: string[];
    typeMismatch: string[];
}

export interface Entitlement {
    code: string;
    name: string;
    unit: string;
    type: FeatureType;
    mode: FeatureUsageMode;
    allowed: boolean;
    limit: number | boolean;
    used: number;
    remaining: number;
    unlimited?: boolean;
    resetsAt?: string | null;
    fromDefault?: boolean;
    group?: { title: string; slug: string } | null;
}

export interface UserEntitlements {
    user: AdminUser | null;
    subscription: any;
    willGetDefaultPlan: string | null;
    entitlements: Entitlement[];
}

export interface UsageLogRow {
    _id: string;
    feature: { code: string; name: string; unit: string } | null;
    usedAmount: number;
    user: AdminUser | null;
    planName: string;
    subscriptionId: string | null;
    note: string;
    refId: string;
    createdAt: string;
}

export interface UsageSummaryRow {
    code: string;
    name: string;
    unit: string;
    total: number;
    events: number;
    users: number;
}

export interface MatrixData {
    plans: SubscriptionPlan[];
    features: Array<SubscriptionFeature & { inCode: boolean }>;
    values: Record<string, Record<string, PlanValue>>;
}

export interface CatalogFeature {
    code: string;
    name: string;
    type: FeatureType;
    mode: FeatureUsageMode;
    unit: string;
    group: { slug: string; title: string };
    description: string;
    resetInterval: FeatureResetInterval | null;
    enforcement: 'server' | 'client';
    defaultValue: PlanValue;
    usedIn: FeatureUsageRef[];
    hasCounter: boolean;
    inDb: boolean;
    plansWithValue: number;
}

export interface CatalogData {
    app: string | null;
    activePlans: number;
    lastSync: CatalogSyncReport | null;
    features: CatalogFeature[];
    panelOnly: Array<{ code: string; name: string; type: FeatureType; plansWithValue: number }>;
}

export interface TablePage<T> {
    rows: T[];
    totalItems: number;
    page: number;
    limit: number;
}

export type TableQuery = Record<string, string | number | undefined>;

function client() {
    const baseUrl = (useAppStore.getState().baseUrl || '').replace(/\/$/, '');
    const token = useAuthStore.getState().token;
    return { baseUrl, headers: { authorization: `Bearer ${token}` } };
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const { baseUrl, headers } = client();
    const res = await axios.get(`${baseUrl}${path}`, { headers, params });
    return res.data?.data as T;
}

async function send<T>(method: 'post' | 'put' | 'delete', path: string, body?: unknown): Promise<T> {
    const { baseUrl, headers } = client();
    const res = method === 'delete'
        ? await axios.delete(`${baseUrl}${path}`, { headers })
        : await axios[method](`${baseUrl}${path}`, body ?? {}, { headers });
    return res.data?.data as T;
}

const clean = (query: TableQuery) => Object.fromEntries(Object.entries(query).filter(([, v]) => v !== '' && v !== undefined));

export const subscriptionApi = {
    // overview + subscriptions
    overview: () => get<SubscriptionOverview>('/api/subscription/admin/overview'),
    subscriptionsTable: (query: TableQuery) => get<TablePage<SubscriptionRow>>('/api/subscription/admin/subscriptions', clean(query)),
    grant: (body: { email?: string; userId?: string; planPriceId: string; days?: number }) => send('post', '/api/subscription/admin/subscriptions/grant', body),
    extend: (id: string, days: number) => send('post', `/api/subscription/admin/subscriptions/${id}/extend`, { days }),
    cancel: (id: string) => send('post', `/api/subscription/admin/subscriptions/${id}/cancel`),
    userEntitlements: (userId: string) => get<UserEntitlements>(`/api/subscription/admin/users/${userId}/entitlements`),

    // usage
    usageTable: (query: TableQuery) => get<TablePage<UsageLogRow>>('/api/subscription/admin/usage-logs', clean(query)),
    usageSummary: (days = 30) => get<UsageSummaryRow[]>('/api/subscription/admin/usage-summary', { days }),

    // matrix + catalog
    matrix: () => get<MatrixData>('/api/subscription/admin/matrix'),
    saveMatrix: (changes: Array<{ planId: string; featureId: string; value: PlanValue }>) => send<{ updated: number }>('put', '/api/subscription/admin/matrix', { changes }),
    catalog: () => get<CatalogData>('/api/subscription/admin/catalog'),

    // features
    features: () => get<SubscriptionFeature[]>('/api/subscription/features'),
    feature: (id: string) => get<SubscriptionFeature>(`/api/subscription/features/${id}`),
    createFeature: (body: Partial<SubscriptionFeature>) => send<SubscriptionFeature>('post', '/api/subscription/features', body),
    updateFeature: (id: string, body: Partial<SubscriptionFeature>) => send<SubscriptionFeature>('put', `/api/subscription/features/${id}`, body),
    deleteFeature: (id: string) => send('delete', `/api/subscription/features/${id}`),

    // plans
    plans: () => get<SubscriptionPlan[]>('/api/subscription/plans'),
    plan: (id: string) => get<PlanDetail>(`/api/subscription/plans/${id}`),
    createPlan: (body: Partial<PlanDetail>) => send<SubscriptionPlan>('post', '/api/subscription/plans', body),
    updatePlan: (id: string, body: Partial<PlanDetail>) => send<SubscriptionPlan>('put', `/api/subscription/plans/${id}`, body),
    deletePlan: (id: string) => send('delete', `/api/subscription/plans/${id}`),

    // prices
    prices: () => get<PlanPrice[]>('/api/subscription/plan-prices'),
    createPrice: (body: { planId: string; billingPeriod: string; price: number; currency: string }) => send<PlanPrice>('post', '/api/subscription/plan-prices', body),
    updatePrice: (id: string, body: { price?: number; currency?: string; billingPeriod?: string }) => send<PlanPrice>('put', `/api/subscription/plan-prices/${id}`, body),
    deletePrice: (id: string) => send('delete', `/api/subscription/plan-prices/${id}`),
    price: async (id: string): Promise<PlanPrice | null> => {
        const { baseUrl } = client();
        const res = await axios.get(`${baseUrl}/api/subscription/plan-prices/${id}`);
        return (res.data?.data ?? res.data) || null;
    },

    // renewals (commerce)
    schedules: () => get<{ schedules: any[]; totalItems: number }>('/api/subscription/commerce/schedules'),
    renewalOrders: (query: TableQuery) => get<{ renewalOrders: any[]; totalItems: number }>('/api/subscription/commerce/renewal-orders', clean(query)),
    toggleSchedule: (id: string, paused: boolean) => send('post', `/api/subscription/commerce/schedules/${id}/${paused ? 'resume' : 'pause'}`),
    runRenewals: () => send<{ createdCount: number }>('post', '/api/subscription/commerce/renewal-orders/run'),
    renewalAction: (id: string, action: 'pay' | 'retry' | 'cancel') => send('post', `/api/subscription/commerce/renewal-orders/${id}/${action}`),
};
