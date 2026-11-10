import axios, { type AxiosRequestConfig } from 'axios';
import type {
    AuditSummary,
    GenerateResult,
    IndexNowStatus,
    IndexNowSubmitResult,
    InspectResult,
    OverviewResponse,
    SitemapConfig,
    SitemapConfigPatch,
    SitemapFileMeta,
    SitemapGroup,
    SitemapGroupForm,
    SitemapIssue,
    SitemapRun,
} from './sitemap.types';

/**
 * کلاینت API ماژول سایت‌مپ — endpointهای ادمین در api/marketing/sitemap/admin.
 * یک‌بار با baseUrl و توکن ساخته می‌شود (در SitemapProvider) تا صفحات آن‌ها را تکرار نکنند.
 */
export function createSitemapApi(baseUrl: string, token: string) {
    const root = `${baseUrl}/api/marketing/sitemap`;
    const admin = `${root}/admin`;

    async function request<T>(config: AxiosRequestConfig, fallbackError: string): Promise<T> {
        const res = await axios.request<{ statusCode?: number; message?: string; data?: T }>({
            ...config,
            url: `${admin}${config.url}`,
            headers: { authorization: `Bearer ${token}` },
        });
        if (res.data?.statusCode !== 200) throw new Error(res.data?.message || fallbackError);
        return res.data.data as T;
    }

    const items = <T>(promise: Promise<{ items?: T[] }>) => promise.then((data) => data.items || []);

    return {
        /** پیش‌نمایش مستقیم فایل‌ها از API (حتی وقتی دامنه سایت هنوز deploy نشده) */
        publicPreviewUrl: (file: 'index' | string) => (file === 'index' ? `${root}/index.xml` : `${root}/files/${file}`),

        getOverview: () => request<OverviewResponse>({ url: '/overview' }, 'دریافت نمای کلی سایت‌مپ ناموفق بود'),

        getConfig: () => request<SitemapConfig>({ url: '/config' }, 'دریافت تنظیمات سایت‌مپ ناموفق بود'),
        updateConfig: (patch: SitemapConfigPatch) =>
            request<SitemapConfig>({ method: 'PATCH', url: '/config', data: patch }, 'ذخیره تنظیمات سایت‌مپ ناموفق بود'),
        getRobotsPreview: () =>
            request<{ content: string }>({ url: '/robots/preview' }, 'ساخت پیش‌نمایش robots.txt ناموفق بود').then((d) => d.content),

        listGroups: () => items(request<{ items: SitemapGroup[] }>({ url: '/groups' }, 'دریافت گروه‌های سایت‌مپ ناموفق بود')),
        getGroup: (id: string) => request<SitemapGroup>({ url: `/groups/${id}` }, 'دریافت گروه سایت‌مپ ناموفق بود'),
        createGroup: (payload: SitemapGroupForm) =>
            request<SitemapGroup>({ method: 'POST', url: '/groups', data: payload }, 'ایجاد گروه سایت‌مپ ناموفق بود'),
        updateGroup: (id: string, payload: SitemapGroupForm) =>
            request<SitemapGroup>({ method: 'PUT', url: `/groups/${id}`, data: payload }, 'به‌روزرسانی گروه سایت‌مپ ناموفق بود'),
        deleteGroup: (id: string) => request<void>({ method: 'DELETE', url: `/groups/${id}` }, 'حذف گروه سایت‌مپ ناموفق بود'),

        regenerateAll: () => request<GenerateResult>({ method: 'POST', url: '/regenerate' }, 'تولید مجدد سایت‌مپ ناموفق بود'),
        regenerateGroup: (id: string) =>
            request<GenerateResult>({ method: 'POST', url: `/groups/${id}/regenerate` }, 'تولید مجدد گروه ناموفق بود'),
        listFiles: () => items(request<{ items: SitemapFileMeta[] }>({ url: '/files' }, 'دریافت فایل‌های سایت‌مپ ناموفق بود')),
        listRuns: (limit = 50) =>
            items(request<{ items: SitemapRun[] }>({ url: '/runs', params: { limit } }, 'دریافت تاریخچه اجراها ناموفق بود')),

        runAudit: () => request<AuditSummary>({ method: 'POST', url: '/audit' }, 'اجرای ممیزی سایت‌مپ ناموفق بود'),
        listOpenIssues: () =>
            items(request<{ items: SitemapIssue[] }>({ url: '/issues', params: { resolved: 'false', limit: 500 } }, 'دریافت یافته‌ها ناموفق بود')),
        resolveIssue: (id: string) => request<void>({ method: 'POST', url: `/issues/${id}/resolve` }, 'بستن یافته ناموفق بود'),
        inspectUrl: (url: string) => request<InspectResult>({ method: 'POST', url: '/inspect', data: { url } }, 'بازرسی URL ناموفق بود'),

        getIndexNowStatus: () => request<IndexNowStatus>({ url: '/indexnow' }, 'دریافت وضعیت IndexNow ناموفق بود'),
        submitIndexNow: (payload: { urls?: string[]; group?: string }) =>
            request<IndexNowSubmitResult>({ method: 'POST', url: '/indexnow/submit', data: payload }, 'ارسال IndexNow ناموفق بود'),
    };
}

export type SitemapApi = ReturnType<typeof createSitemapApi>;
