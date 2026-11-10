import axios from 'axios';
import type {
    CampaignFlow,
    CampaignFlowForm,
    CampaignRun,
    CampaignRunsSummaryItem,
} from './campaigns.types';

/**
 * کلاینت API کمپین‌ها — endpoints سمت core (api/campaign):
 * CRUD flows + trigger (دستی / رویداد پلتفرم) + runs + summary
 */

const authHeader = (token: string) => ({ authorization: `Bearer ${token}` });

function unwrap<T>(res: { data?: { statusCode?: number; message?: string; data?: T } }, fallbackError: string): T {
    if (res?.data?.statusCode !== 200) {
        throw new Error(res?.data?.message || fallbackError);
    }
    return res.data.data as T;
}

export async function listFlows(baseUrl: string, token: string): Promise<CampaignFlow[]> {
    const res = await axios.get(`${baseUrl}/api/campaign/flows`, {
        params: { page: 1, limit: 200 },
        headers: authHeader(token),
    });
    return unwrap<{ items: CampaignFlow[] }>(res, 'دریافت کمپین‌ها ناموفق بود').items || [];
}

export async function getFlow(baseUrl: string, token: string, id: string): Promise<CampaignFlow> {
    const res = await axios.get(`${baseUrl}/api/campaign/flows/${id}`, { headers: authHeader(token) });
    return unwrap<CampaignFlow>(res, 'دریافت کمپین ناموفق بود');
}

export async function createFlow(baseUrl: string, token: string, payload: CampaignFlowForm) {
    const res = await axios.post(`${baseUrl}/api/campaign/flows`, payload, { headers: authHeader(token) });
    return unwrap(res, 'ایجاد کمپین ناموفق بود');
}

export async function updateFlow(baseUrl: string, token: string, id: string, payload: Partial<CampaignFlow>) {
    const res = await axios.put(`${baseUrl}/api/campaign/flows/${id}`, payload, { headers: authHeader(token) });
    return unwrap(res, 'به‌روزرسانی کمپین ناموفق بود');
}

export async function deleteFlow(baseUrl: string, token: string, id: string) {
    const res = await axios.delete(`${baseUrl}/api/campaign/flows/${id}`, { headers: authHeader(token) });
    return unwrap(res, 'حذف کمپین ناموفق بود');
}

/** اجرای دستی فلو برای یک کاربر */
export async function triggerFlow(baseUrl: string, token: string, id: string, userId: string, context: Record<string, unknown> = {}) {
    const res = await axios.post(
        `${baseUrl}/api/campaign/flows/${id}/trigger`,
        { userId, context },
        { headers: authHeader(token) },
    );
    return unwrap(res, 'اجرای کمپین ناموفق بود');
}

export async function listRuns(
    baseUrl: string,
    token: string,
    filter: { flowId?: string; status?: string } = {},
): Promise<CampaignRun[]> {
    const res = await axios.get(`${baseUrl}/api/campaign/runs`, {
        params: { page: 1, limit: 100, ...filter },
        headers: authHeader(token),
    });
    return unwrap<{ items: CampaignRun[] }>(res, 'دریافت اجراها ناموفق بود').items || [];
}

export async function getRunsSummary(baseUrl: string, token: string): Promise<CampaignRunsSummaryItem[]> {
    const res = await axios.get(`${baseUrl}/api/campaign/runs-summary`, { headers: authHeader(token) });
    return unwrap<{ items: CampaignRunsSummaryItem[] }>(res, 'دریافت آمار اجراها ناموفق بود').items || [];
}

export async function cancelRun(baseUrl: string, token: string, id: string) {
    const res = await axios.post(`${baseUrl}/api/campaign/runs/${id}/cancel`, {}, { headers: authHeader(token) });
    return unwrap(res, 'لغو اجرا ناموفق بود');
}
