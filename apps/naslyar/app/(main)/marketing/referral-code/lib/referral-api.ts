import axios, { type AxiosRequestConfig } from 'axios';
import type {
    Paged,
    ReferralAdminOverview,
    ReferralAdminReferral,
    ReferralAdminReward,
    ReferralAuditLog,
    ReferralCampaign,
    ReferralCampaignForm,
    ReferralCampaignStatus,
    ReferralRule,
    ReferralRuleForm,
    RewardReviewAction,
} from './referral.types';

export interface ListFilter {
    status?: string;
    campaignId?: string;
    page?: number;
    limit?: number;
}

/**
 * کلاینت API ادمین کد معرف — api/marketing/referral/admin.
 * یک‌بار با baseUrl و توکن ساخته می‌شود (ReferralAdminProvider) تا صفحات آن‌ها را تکرار نکنند.
 */
export function createReferralAdminApi(baseUrl: string, token: string) {
    const root = `${baseUrl}/api/marketing/referral/admin`;

    async function request<T>(config: AxiosRequestConfig, fallbackError: string): Promise<T> {
        const res = await axios.request<{ statusCode?: number; message?: string; data?: T }>({
            ...config,
            url: `${root}${config.url}`,
            headers: { authorization: `Bearer ${token}` },
        });
        if (res.data?.statusCode !== 200) throw new Error(res.data?.message || fallbackError);
        return res.data.data as T;
    }

    const listParams = (filter: ListFilter) => ({
        status: filter.status || 'all',
        campaignId: filter.campaignId || 'all',
        page: filter.page || 1,
        limit: filter.limit || 25,
    });

    return {
        getOverview: () => request<ReferralAdminOverview>({ url: '/overview' }, 'دریافت آمار کد معرف ناموفق بود'),
        listAuditLogs: (limit = 200) =>
            request<{ items: ReferralAuditLog[] }>({ url: '/audit-logs', params: { limit } }, 'دریافت گزارش تغییرات ناموفق بود').then(
                (data) => data.items || [],
            ),

        listCampaigns: () =>
            request<{ items: ReferralCampaign[] }>({ url: '/campaigns' }, 'دریافت کمپین‌ها ناموفق بود').then((data) => data.items || []),
        getCampaign: (id: string) =>
            request<ReferralCampaign & { rules: ReferralRule[] }>({ url: `/campaigns/${id}` }, 'دریافت کمپین ناموفق بود'),
        createCampaign: (payload: ReferralCampaignForm) =>
            request<ReferralCampaign>({ method: 'POST', url: '/campaigns', data: payload }, 'ایجاد کمپین ناموفق بود'),
        updateCampaign: (id: string, payload: Partial<ReferralCampaignForm>) =>
            request<ReferralCampaign>({ method: 'PATCH', url: `/campaigns/${id}`, data: payload }, 'به‌روزرسانی کمپین ناموفق بود'),
        setCampaignStatus: (id: string, status: ReferralCampaignStatus) =>
            request<ReferralCampaign>({ method: 'POST', url: `/campaigns/${id}/status`, data: { status } }, 'تغییر وضعیت کمپین ناموفق بود'),

        createRule: (campaignId: string, payload: ReferralRuleForm) =>
            request<ReferralRule>({ method: 'POST', url: `/campaigns/${campaignId}/rules`, data: payload }, 'ایجاد قانون پاداش ناموفق بود'),
        updateRule: (id: string, payload: ReferralRuleForm) =>
            request<ReferralRule>({ method: 'PATCH', url: `/rules/${id}`, data: payload }, 'به‌روزرسانی قانون ناموفق بود'),
        deleteRule: (id: string) => request<void>({ method: 'DELETE', url: `/rules/${id}` }, 'حذف قانون ناموفق بود'),

        listReferrals: (filter: ListFilter) =>
            request<Paged<ReferralAdminReferral>>({ url: '/referrals', params: listParams(filter) }, 'دریافت دعوت‌شدگان ناموفق بود'),
        listRewards: (filter: ListFilter) =>
            request<Paged<ReferralAdminReward>>({ url: '/rewards', params: listParams(filter) }, 'دریافت پاداش‌ها ناموفق بود'),
        reviewReward: (id: string, action: RewardReviewAction, reason = '') =>
            request<ReferralAdminReward>(
                { method: 'POST', url: `/rewards/${id}/review`, data: { action, reason } },
                'ثبت تصمیم روی پاداش ناموفق بود',
            ),
    };
}

export type ReferralAdminApi = ReturnType<typeof createReferralAdminApi>;
