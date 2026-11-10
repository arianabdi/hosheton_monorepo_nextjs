import axios from 'axios';
import {useAuthStore} from '@/app/zustand/store/authStore';
import {useAppStore} from '@/app/zustand/store/useAppStore';

function getRequestConfig() {
    const {token} = useAuthStore.getState();
    const {baseUrl} = useAppStore.getState();
    return {
        baseUrl: baseUrl || process.env.NEXT_PUBLIC_API_URL,
        headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    };
}

// ---------- types ----------

export interface FilkoshServer {
    _id: string;
    name: string;
    host: string;
    sshPort: number;
    sshUsername: string;
    /** فقط در GET تکی با withSecret=1 برگردانده می‌شود */
    sshPassword?: string;
    country: string;
    countryCode: string;
    city: string;
    flag: string;
    description?: string;
    capacity: number;
    tier: 'free' | 'premium';
    status: 'online' | 'offline' | 'maintenance' | 'unknown';
    ping: number | null;
    onlineUsers: number;
    specs: {cpu: string; ram: string; bandwidth: string};
    tags: string[];
    appScope: string;
    lastHealthCheckAt: string | null;
    lastHealthReport?: Record<string, unknown> | null;
    isAlive: boolean;
    createdAt: string;
}

export interface FilkoshInboundClient {
    userId: string;
    email: string;
    uuid?: string;
    password?: string;
    method?: string;
    flow?: string;
    revoked: boolean;
    createdAt: string;
}

export interface FilkoshInbound {
    _id: string;
    serverId: string;
    name: string;
    protocol: string;
    port: number;
    enabled: boolean;
    settings: Record<string, unknown>;
    clients: FilkoshInboundClient[];
    maxClients: number;
    isAlive: boolean;
}

// ---- core subscription system (libs/core/subscription) ----

export type BillingPeriod = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'yearly' | 'biyearly' | 'lifetime';

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
    monthly: 'ماهانه',
    bimonthly: 'دوماهه',
    quarterly: 'فصلی',
    semiannually: 'شش‌ماهه',
    yearly: 'سالانه',
    biyearly: 'دوساله',
    lifetime: 'مادام‌العمر',
};

export interface SubscriptionFeature {
    _id: string;
    name: string;
    code: string;
    description: string;
    /** boolean | quantity */
    type: string;
    unit: string;
    showInCard: boolean;
    group?: {title: string; slug: string};
}

/** مقدار یک فیچر روی پلن (جدول واسط planfeatures) */
export interface PlanFeatureValue {
    _id?: string;
    featureId: SubscriptionFeature | string;
    value: unknown;
}

export interface SubscriptionPlan {
    _id: string;
    name: string;
    description: string;
    status: 'active' | 'inactive';
    isMostPopular: boolean;
    order: number;
    features?: PlanFeatureValue[];
}

export interface PlanPrice {
    _id: string;
    planId: {_id: string; name: string} | string;
    billingPeriod: BillingPeriod;
    price: number;
    currency: 'USD' | 'IRT';
}

export interface SubscriptionRow {
    _id: string;
    userId: string | {_id: string};
    planId: {_id: string; name: string} | string;
    planPriceId: PlanPrice | string;
    status: 'active' | 'trialing' | 'canceled' | 'expired';
    startsAt: string;
    endsAt: string;
    /** attach شده توسط api/filkosh/subscription-admin */
    user?: {_id: string; mobile?: string; fullName?: string} | null;
}

export interface FilkoshUserRow {
    _id: string;
    username?: string;
    fullName?: string;
    mobile?: string;
    roles?: string[];
}

export interface FilkoshDnsProvider {
    _id: string;
    name: string;
    slug: string;
    protocol: string;
    endpoints: {url: string; ip: string}[];
    description: string;
    adsBlocking: boolean;
    malwareBlocking: boolean;
    familySafe: boolean;
    sortOrder: number;
    isActive: boolean;
}

export interface FilkoshDnsProfile {
    _id: string;
    name: string;
    slug: string;
    providerSlug: string;
    description: string;
    icon: string;
    blocklists: Record<string, boolean>;
    customRules: string[];
    sortOrder: number;
    isActive: boolean;
}

export interface FilkoshProvisionRun {
    _id: string;
    serverId: {_id: string; name: string; host: string} | string;
    action: string;
    status: 'running' | 'success' | 'failed';
    protocol: string;
    logs: {at: string; stream: string; line: string}[];
    result?: Record<string, unknown>;
    error: string;
    startedAt: string;
    finishedAt: string | null;
    createdAt: string;
}

export interface FilkoshAppRelease {
    _id: string;
    app: 'vpn' | 'dns';
    versionName: string;
    versionCode: number;
    minSupportedCode: number;
    downloadUrl: string;
    forceUpdate: boolean;
    changelog: string;
    isActive: boolean;
}

export interface FilkoshAnnouncement {
    _id: string;
    app: 'vpn' | 'dns' | 'both';
    title: string;
    body: string;
    type: string;
    isActive: boolean;
}

// ---- telegram MTProto proxy fleet ----

export interface FilkoshMtProxyPool {
    _id: string;
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
    /** راز مشترک به صورت ماسک‌شده برگردانده می‌شود */
    sharedSecret: string;
    defaultPort: number;
    fakeTlsDomain: string;
    installMethod: 'source' | 'docker';
    targetHealthy: number;
    maxFailStreak: number;
    autoReplace: boolean;
    sponsorChannel: string;
    autoRegisterSponsor: boolean;
    notifyChatId: string;
    counts?: Record<string, number>;
    createdAt: string;
}

export type MtProxyNodeStatus = 'pending' | 'provisioning' | 'active' | 'failed' | 'disabled' | 'retired';

// ---- نصب پس‌زمینه با مراحل و لاگ زنده ----

export type MtProxyProvisionState = 'running' | 'ok' | 'failed' | 'cancelled';
export type MtProxyProvisionStepState = 'pending' | 'running' | 'ok' | 'failed' | 'skipped';

export interface MtProxyProvisionStep {
    key: string;
    label: string;
    state: MtProxyProvisionStepState;
    detail: string;
}

export interface MtProxyProvisionLogLine {
    at: string;
    stream: string;
    line: string;
}

export interface MtProxyProvisionSnapshot {
    nodeId: string;
    nodeName: string;
    state: MtProxyProvisionState;
    method: 'source' | 'docker' | string;
    steps: MtProxyProvisionStep[];
    stepIndex: number;
    stepTotal: number;
    logs: MtProxyProvisionLogLine[];
    startedAt: string;
    finishedAt: string | null;
    error: string;
    cancelRequested: boolean;
    /** وقتی job زنده در حافظه نیست — آخرین وضعیت ذخیره‌شده روی نود */
    persisted?: {
        state: MtProxyProvisionState;
        method: string;
        stepKey: string;
        stepIndex: number;
        stepTotal: number;
        startedAt: string;
        finishedAt: string | null;
        error: string;
        logs: MtProxyProvisionLogLine[];
    } | null;
    running?: boolean;
}

export interface FilkoshMtProxyNode {
    _id: string;
    poolId: {_id: string; name: string; slug: string; sponsorChannel?: string; fakeTlsDomain?: string; defaultPort?: number; targetHealthy?: number; autoReplace?: boolean} | string;
    serverId: {_id: string; name: string; host: string} | string | null;
    name: string;
    host: string;
    sshPort: number;
    sshUsername: string;
    country: string;
    countryCode: string;
    port: number;
    clientSecret: string;
    fakeTlsDomain: string;
    installMethod: 'source' | 'docker';
    status: MtProxyNodeStatus;
    autoProvision: boolean;
    failStreak: number;
    lastCheckAt: string | null;
    lastOkAt: string | null;
    latencyMs: number | null;
    lastError: string;
    adTag: string;
    sponsorChannel: string;
    sponsorAppliedAt: string | null;
    replacementOfId: string | null;
    replacedById: string | null;
    replaceCount: number;
    note: string;
    provision?: MtProxyProvisionSnapshot['persisted'] | null;
    isAlive: boolean;
    createdAt: string;
}

export interface FilkoshMtProxyEvent {
    _id: string;
    poolId: {_id: string; name: string; slug: string} | string | null;
    nodeId: {_id: string; name: string; host: string} | string | null;
    type: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    meta: Record<string, unknown>;
    createdAt: string;
}

export interface FilkoshMtProxyOverview {
    pools: number;
    nodes: Record<string, number>;
    totalNodes: number;
    sponsor: {activeNodes: number; withAdTag: number; withoutAdTag: number};
    recentEvents: FilkoshMtProxyEvent[];
}

export interface FilkoshMtProxySponsorStatus {
    autoRegisterReady: boolean;
    apiId: boolean;
    apiHash: boolean;
    session: boolean;
    botToken: boolean;
    adminChatId: boolean;
}

export interface FilkoshOverview {
    totalServers: number;
    onlineServers: number;
    onlineUsers: number;
    activeSubscriptions: number;
    totalUsers: number;
    totalInbounds: number;
    trafficToday: {download: number; upload: number; sessions: number};
    trafficWeek: {_id: string; download: number; upload: number; sessions: number}[];
    topServers: {_id: string; sessions: number; traffic: number}[];
    recentRuns: FilkoshProvisionRun[];
}

// ---------- helpers ----------

function unwrap<T>(res: {data?: {statusCode?: number; data?: T; message?: string}}): T {
    if (res.data?.statusCode === 200) return res.data.data as T;
    throw new Error(res.data?.message || 'خطای ناشناخته API');
}

export const filkoshApi = {
    // ---- overview ----
    async overview(): Promise<FilkoshOverview> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/stats/overview`, {headers});
        return unwrap(res);
    },

    // ---- servers ----
    async listServers(params?: {search?: string; tier?: string; status?: string; appScope?: string; inScope?: 'vpn' | 'dns'}): Promise<FilkoshServer[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/servers`, {headers, params});
        return res.data?.data?.servers || [];
    },
    async getServer(id: string, withSecret = false): Promise<FilkoshServer> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/servers/${id}`, {headers, params: withSecret ? {withSecret: 1} : undefined});
        return unwrap(res);
    },
    async createServer(body: Record<string, unknown>): Promise<FilkoshServer> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/servers`, body, {headers});
        return unwrap(res);
    },
    async updateServer(id: string, body: Record<string, unknown>): Promise<FilkoshServer> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/filkosh/servers/${id}`, body, {headers});
        return unwrap(res);
    },
    async deleteServer(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.delete(`${baseUrl}/api/filkosh/servers/${id}`, {headers});
    },
    async testSsh(id: string): Promise<{ok: boolean; osRelease?: string; arch?: string; error?: string}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/servers/${id}/test-ssh`, {}, {headers, timeout: 60000});
        return unwrap(res);
    },

    // ---- inbounds ----
    async listInbounds(serverId: string): Promise<FilkoshInbound[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/inbounds`, {headers, params: {serverId}});
        return res.data?.data || [];
    },
    async createInbound(body: Record<string, unknown>): Promise<FilkoshInbound> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/inbounds`, body, {headers});
        return unwrap(res);
    },
    async updateInbound(id: string, body: Record<string, unknown>): Promise<FilkoshInbound> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/filkosh/inbounds/${id}`, body, {headers});
        return unwrap(res);
    },
    async deleteInbound(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.delete(`${baseUrl}/api/filkosh/inbounds/${id}`, {headers});
    },

    // ---- provision ----
    async provision(action: 'prepare' | 'install-xray' | 'install-singbox' | 'install-wireguard' | 'sync' | 'health' | 'uninstall', serverId: string, engine?: string): Promise<Record<string, unknown>> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(
            `${baseUrl}/api/filkosh/provision/${action}`,
            engine ? {serverId, engine} : {serverId},
            {headers, timeout: 15 * 60 * 1000},
        );
        return unwrap(res);
    },
    async listRuns(serverId?: string, limit = 50): Promise<FilkoshProvisionRun[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/provision/runs`, {
            headers,
            params: {limit, ...(serverId ? {serverId} : {})},
        });
        return res.data?.data || [];
    },
    async getRun(id: string): Promise<FilkoshProvisionRun> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/provision/runs/${id}`, {headers});
        return unwrap(res);
    },

    // ---- core subscription: features ----
    async listFeatures(): Promise<SubscriptionFeature[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/subscription/features`, {headers});
        return res.data?.data || [];
    },
    async createFeature(body: Partial<SubscriptionFeature>): Promise<SubscriptionFeature> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/subscription/features`, body, {headers});
        return unwrap(res);
    },
    async updateFeature(id: string, body: Partial<SubscriptionFeature>): Promise<SubscriptionFeature> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/subscription/features/${id}`, body, {headers});
        return unwrap(res);
    },
    async deleteFeature(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.delete(`${baseUrl}/api/subscription/features/${id}`, {headers});
    },

    // ---- core subscription: plans (features values ride on the plan payload) ----
    async listPlans(status?: string): Promise<SubscriptionPlan[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/subscription/plans`, {headers, params: status ? {status} : {}});
        return res.data?.data || [];
    },
    async getPlan(id: string): Promise<SubscriptionPlan & {features: PlanFeatureValue[]}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/subscription/plans/${id}`, {headers});
        return unwrap(res);
    },
    async createPlan(body: Record<string, unknown>): Promise<SubscriptionPlan> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/subscription/plans`, body, {headers});
        return unwrap(res);
    },
    async updatePlan(id: string, body: Record<string, unknown>): Promise<SubscriptionPlan> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/subscription/plans/${id}`, body, {headers});
        return unwrap(res);
    },
    async deletePlan(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.delete(`${baseUrl}/api/subscription/plans/${id}`, {headers});
    },

    // ---- core subscription: plan prices ----
    async listPlanPrices(planId?: string): Promise<PlanPrice[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/subscription/plan-prices`, {headers, params: planId ? {planId} : {}});
        // مسیر planId دار در هسته مستقیم آرایه برمی‌گرداند (بدون پاکت)
        return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
    async createPlanPrice(body: {planId: string; billingPeriod: BillingPeriod; price: number; currency?: string}): Promise<PlanPrice> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/subscription/plan-prices`, body, {headers});
        return unwrap(res);
    },
    async updatePlanPrice(id: string, body: {price?: number; currency?: string; billingPeriod?: BillingPeriod}): Promise<PlanPrice> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/subscription/plan-prices/${id}`, body, {headers});
        return res.data;
    },
    async deletePlanPrice(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.delete(`${baseUrl}/api/subscription/plan-prices/${id}`, {headers});
    },

    // ---- core subscription: user subscriptions (filkosh admin layer) ----
    async listSubscriptions(): Promise<SubscriptionRow[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/subscription-admin/subscriptions`, {headers});
        return res.data?.data || [];
    },
    async grantSubscription(body: {userId: string; planId: string; planPriceId: string; note?: string}): Promise<SubscriptionRow> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/subscription-admin/grant`, body, {headers});
        return unwrap(res);
    },
    async revokeSubscription(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.put(`${baseUrl}/api/subscription/subscriptions/${id}/status`, {status: 'canceled'}, {headers});
    },

    // ---- users (همان بخش کاربران خوده — انتخاب کاربر برای تخصیص اشتراک) ----
    async listUsers(params?: {page?: number; limit?: number; mobile?: string}): Promise<{users: FilkoshUserRow[]; totalItems: number}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/user/list`, {
            headers,
            params: {page: params?.page || 1, limit: params?.limit || 20, ...(params?.mobile ? {mobile: params.mobile} : {})},
        });
        const payload = res.data?.data;
        const users = Array.isArray(payload) ? payload : payload?.users || payload?.items || [];
        return {users, totalItems: payload?.totalItems ?? users.length};
    },

    // ---- dns ----
    async listDnsProviders(): Promise<FilkoshDnsProvider[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/dns/providers`, {headers});
        return res.data?.data || [];
    },
    async createDnsProvider(body: Record<string, unknown>): Promise<FilkoshDnsProvider> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/dns/providers`, body, {headers});
        return unwrap(res);
    },
    async updateDnsProvider(id: string, body: Record<string, unknown>): Promise<FilkoshDnsProvider> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/filkosh/dns/providers/${id}`, body, {headers});
        return unwrap(res);
    },
    async deleteDnsProvider(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.delete(`${baseUrl}/api/filkosh/dns/providers/${id}`, {headers});
    },
    async listDnsProfiles(): Promise<FilkoshDnsProfile[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/dns/profiles`, {headers});
        return res.data?.data || [];
    },
    async createDnsProfile(body: Record<string, unknown>): Promise<FilkoshDnsProfile> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/dns/profiles`, body, {headers});
        return unwrap(res);
    },
    async updateDnsProfile(id: string, body: Record<string, unknown>): Promise<FilkoshDnsProfile> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/filkosh/dns/profiles/${id}`, body, {headers});
        return unwrap(res);
    },
    async deleteDnsProfile(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.delete(`${baseUrl}/api/filkosh/dns/profiles/${id}`, {headers});
    },

    // ---- apps (releases / announcements) ----
    async listReleases(app?: string): Promise<FilkoshAppRelease[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/apps/releases`, {headers, params: app ? {app} : {}});
        return res.data?.data || [];
    },
    async createRelease(body: Record<string, unknown>): Promise<FilkoshAppRelease> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/apps/releases`, body, {headers});
        return unwrap(res);
    },
    async updateRelease(id: string, body: Record<string, unknown>): Promise<FilkoshAppRelease> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/filkosh/apps/releases/${id}`, body, {headers});
        return unwrap(res);
    },
    async listAnnouncements(): Promise<FilkoshAnnouncement[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/apps/announcements`, {headers});
        return res.data?.data || [];
    },
    async createAnnouncement(body: Record<string, unknown>): Promise<FilkoshAnnouncement> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/apps/announcements`, body, {headers});
        return unwrap(res);
    },
    async updateAnnouncement(id: string, body: Record<string, unknown>): Promise<FilkoshAnnouncement> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/filkosh/apps/announcements/${id}`, body, {headers});
        return unwrap(res);
    },

    // ---- telegram MTProto proxy fleet ----
    async mtProxyOverview(): Promise<FilkoshMtProxyOverview> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/mtproxy/overview`, {headers});
        return unwrap(res);
    },
    async listMtProxyPools(): Promise<FilkoshMtProxyPool[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/mtproxy/pools`, {headers});
        return res.data?.data || [];
    },
    async createMtProxyPool(body: Record<string, unknown>): Promise<FilkoshMtProxyPool> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/pools`, body, {headers});
        return unwrap(res);
    },
    async updateMtProxyPool(id: string, body: Record<string, unknown>): Promise<FilkoshMtProxyPool> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/filkosh/mtproxy/pools/${id}`, body, {headers});
        return unwrap(res);
    },
    async deleteMtProxyPool(id: string): Promise<void> {
        const {baseUrl, headers} = getRequestConfig();
        await axios.delete(`${baseUrl}/api/filkosh/mtproxy/pools/${id}`, {headers});
    },
    async rotateMtProxyPoolSecret(id: string): Promise<{rotated: number; total: number}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/pools/${id}/rotate-secret`, {}, {headers, timeout: 15 * 60 * 1000});
        return unwrap(res);
    },
    async reconcileMtProxyPool(id: string): Promise<{healthy: number; target: number; promoted: string[]; sufficient: boolean}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/pools/${id}/reconcile`, {}, {headers, timeout: 15 * 60 * 1000});
        return unwrap(res);
    },
    async provisionMtProxyPending(poolId: string, concurrency = 3): Promise<{ok: number; failed: number; total: number}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(
            `${baseUrl}/api/filkosh/mtproxy/pools/${poolId}/provision-pending`,
            {concurrency},
            {headers, timeout: 60 * 60 * 1000},
        );
        return unwrap(res);
    },
    async listMtProxyNodes(params?: {poolId?: string; status?: string; search?: string}): Promise<FilkoshMtProxyNode[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/mtproxy/nodes`, {headers, params});
        return res.data?.data || [];
    },
    async getMtProxyNode(id: string): Promise<FilkoshMtProxyNode> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}`, {headers});
        return unwrap(res);
    },
    async createMtProxyNode(body: Record<string, unknown>): Promise<FilkoshMtProxyNode> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes`, body, {headers, timeout: 60000});
        return unwrap(res);
    },
    async updateMtProxyNode(id: string, body: Record<string, unknown>): Promise<FilkoshMtProxyNode> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.put(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}`, body, {headers, timeout: 15 * 60 * 1000});
        return unwrap(res);
    },
    async deleteMtProxyNode(id: string): Promise<{deleted: boolean; serverCleaned: boolean; cleanupErrors: string[]}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.delete(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}`, {headers, timeout: 6 * 60 * 1000});
        return unwrap(res);
    },
    /** شروع نصب پس‌زمینه — فوری snapshot برمی‌گرداند؛ پیشرفت با getMtProxyProvisionStatus */
    async provisionMtProxyNode(id: string): Promise<MtProxyProvisionSnapshot> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}/provision`, {}, {headers, timeout: 60000});
        return unwrap(res);
    },
    async getMtProxyProvisionStatus(id: string): Promise<MtProxyProvisionSnapshot> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}/provision-status`, {headers, timeout: 30000});
        return unwrap(res);
    },
    async cancelMtProxyProvision(id: string): Promise<MtProxyProvisionSnapshot> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}/provision/cancel`, {}, {headers, timeout: 60000});
        return unwrap(res);
    },
    async checkMtProxyNode(id: string): Promise<{ok: boolean; latencyMs: number | null; error: string; failStreak?: number}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}/check`, {}, {headers});
        return unwrap(res);
    },
    async replaceMtProxyNode(id: string): Promise<{replaced: boolean; reason?: string; replacementId?: string}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}/replace`, {}, {headers, timeout: 20 * 60 * 1000});
        return unwrap(res);
    },
    async retireMtProxyNode(id: string): Promise<FilkoshMtProxyNode> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes/${id}/retire`, {}, {headers, timeout: 120000});
        return unwrap(res);
    },
    async mtProxyBulkImport(body: {poolId: string; text: string; provisionNow?: boolean}): Promise<{imported: number; skipped: number; errors: string[]}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes/bulk-import`, body, {headers, timeout: 60 * 60 * 1000});
        return unwrap(res);
    },
    async listMtProxyEvents(params?: {poolId?: string; nodeId?: string; type?: string; level?: string; limit?: number}): Promise<FilkoshMtProxyEvent[]> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/mtproxy/events`, {headers, params});
        return res.data?.data || [];
    },
    async mtProxySponsorStatus(): Promise<FilkoshMtProxySponsorStatus> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.get(`${baseUrl}/api/filkosh/mtproxy/sponsor/status`, {headers});
        return unwrap(res);
    },
    async setMtProxyAdTag(nodeId: string, adTag: string): Promise<FilkoshMtProxyNode> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes/${nodeId}/ad-tag`, {adTag}, {headers, timeout: 20 * 60 * 1000});
        return unwrap(res);
    },
    async registerMtProxySponsor(nodeId: string): Promise<{adTag: string; reply: string; node: FilkoshMtProxyNode}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/nodes/${nodeId}/sponsor/register`, {}, {headers, timeout: 5 * 60 * 1000});
        return unwrap(res);
    },
    async registerPoolMtProxySponsor(poolId: string): Promise<{ok: number; failed: number; total: number; errors: string[]}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/pools/${poolId}/sponsor/register`, {}, {headers, timeout: 60 * 60 * 1000});
        return unwrap(res);
    },
    async applyPoolMtProxySponsor(poolId: string): Promise<{applied: number; total: number}> {
        const {baseUrl, headers} = getRequestConfig();
        const res = await axios.post(`${baseUrl}/api/filkosh/mtproxy/pools/${poolId}/sponsor/apply`, {}, {headers, timeout: 60 * 60 * 1000});
        return unwrap(res);
    },
};
