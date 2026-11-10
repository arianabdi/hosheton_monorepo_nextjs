import axios from 'axios';
import type {
    Banner,
    BannerForm,
    BannerStat,
    BannerCreative,
    BannerCreativeForm,
    BannerPlacement,
    BannerPlacementForm,
    BannerRenderResult,
} from './banners.types';

/**
 * کلاینت API بنرها — endpoints سمت core (api/marketing/banners):
 * CRUD placements / creatives / banners (admin)
 * GET  banners/render/:placementKey   رندرر عمومی (فرانت hosheton_studio)
 * POST banners/track                  ثبت impression / click
 * GET  banners/analytics              خلاصه آمار بنرها
 */

const authHeader = (token: string) => ({ authorization: `Bearer ${token}` });

function unwrap<T>(res: { data?: { statusCode?: number; message?: string; data?: T } }, fallbackError: string): T {
    if (res?.data?.statusCode !== 200) {
        throw new Error(res?.data?.message || fallbackError);
    }
    return res.data.data as T;
}

// ─── Placements ───
export async function listPlacements(baseUrl: string, token: string): Promise<BannerPlacement[]> {
    const res = await axios.get(`${baseUrl}/api/marketing/banners/placements`, {
        params: { page: 1, limit: 200 },
        headers: authHeader(token),
    });
    return unwrap<{ items: BannerPlacement[] }>(res, 'دریافت جایگاه‌ها ناموفق بود').items || [];
}

export async function getPlacementById(baseUrl: string, token: string, id: string): Promise<BannerPlacement> {
    const res = await axios.get(`${baseUrl}/api/marketing/banners/placements/${id}`, { headers: authHeader(token) });
    return unwrap<BannerPlacement>(res, 'دریافت جایگاه ناموفق بود');
}

export async function createPlacement(baseUrl: string, token: string, payload: BannerPlacementForm) {
    const res = await axios.post(`${baseUrl}/api/marketing/banners/placements`, payload, { headers: authHeader(token) });
    return unwrap(res, 'ایجاد جایگاه ناموفق بود');
}

export async function updatePlacement(baseUrl: string, token: string, id: string, payload: Partial<BannerPlacement>) {
    const res = await axios.put(`${baseUrl}/api/marketing/banners/placements/${id}`, payload, {
        headers: authHeader(token),
    });
    return unwrap(res, 'به‌روزرسانی جایگاه ناموفق بود');
}

export async function deletePlacement(baseUrl: string, token: string, id: string) {
    const res = await axios.delete(`${baseUrl}/api/marketing/banners/placements/${id}`, { headers: authHeader(token) });
    return unwrap(res, 'حذف جایگاه ناموفق بود');
}

// ─── Creatives ───
export async function listCreatives(baseUrl: string, token: string): Promise<BannerCreative[]> {
    const res = await axios.get(`${baseUrl}/api/marketing/banners/creatives`, {
        params: { page: 1, limit: 500 },
        headers: authHeader(token),
    });
    return unwrap<{ items: BannerCreative[] }>(res, 'دریافت خلاقیت‌ها ناموفق بود').items || [];
}

export async function getCreativeById(baseUrl: string, token: string, id: string): Promise<BannerCreative> {
    const res = await axios.get(`${baseUrl}/api/marketing/banners/creatives/${id}`, { headers: authHeader(token) });
    return unwrap<BannerCreative>(res, 'دریافت خلاقیت ناموفق بود');
}

export async function createCreative(baseUrl: string, token: string, payload: BannerCreativeForm) {
    const res = await axios.post(`${baseUrl}/api/marketing/banners/creatives`, payload, { headers: authHeader(token) });
    return unwrap(res, 'ایجاد خلاقیت ناموفق بود');
}

export async function updateCreative(baseUrl: string, token: string, id: string, payload: Partial<BannerCreative>) {
    const res = await axios.put(`${baseUrl}/api/marketing/banners/creatives/${id}`, payload, {
        headers: authHeader(token),
    });
    return unwrap(res, 'به‌روزرسانی خلاقیت ناموفق بود');
}

export async function deleteCreative(baseUrl: string, token: string, id: string) {
    const res = await axios.delete(`${baseUrl}/api/marketing/banners/creatives/${id}`, { headers: authHeader(token) });
    return unwrap(res, 'حذف خلاقیت ناموفق بود');
}

// ─── Banners ───
export async function listBanners(baseUrl: string, token: string): Promise<Banner[]> {
    const res = await axios.get(`${baseUrl}/api/marketing/banners`, {
        params: { page: 1, limit: 500 },
        headers: authHeader(token),
    });
    return unwrap<{ items: Banner[] }>(res, 'دریافت بنرها ناموفق بود').items || [];
}

export async function getBannerById(baseUrl: string, token: string, id: string): Promise<Banner> {
    const res = await axios.get(`${baseUrl}/api/marketing/banners/${id}`, { headers: authHeader(token) });
    return unwrap<Banner>(res, 'دریافت بنر ناموفق بود');
}

export async function createBanner(baseUrl: string, token: string, payload: BannerForm) {
    const res = await axios.post(`${baseUrl}/api/marketing/banners`, payload, { headers: authHeader(token) });
    return unwrap(res, 'ایجاد بنر ناموفق بود');
}

export async function updateBanner(baseUrl: string, token: string, id: string, payload: Partial<Banner>) {
    const res = await axios.put(`${baseUrl}/api/marketing/banners/${id}`, payload, {
        headers: authHeader(token),
    });
    return unwrap(res, 'به‌روزرسانی بنر ناموفق بود');
}

export async function deleteBanner(baseUrl: string, token: string, id: string) {
    const res = await axios.delete(`${baseUrl}/api/marketing/banners/${id}`, { headers: authHeader(token) });
    return unwrap(res, 'حذف بنر ناموفق بود');
}

// ─── Analytics & Renderer ───
export async function getBannerAnalytics(baseUrl: string, token: string): Promise<BannerStat[]> {
    const res = await axios.get(`${baseUrl}/api/marketing/banners/analytics`, { headers: authHeader(token) });
    return unwrap<{ items: BannerStat[] }>(res, 'دریافت آمار ناموفق بود').items || [];
}

export async function renderPlacementPreview(
    baseUrl: string,
    token: string,
    placementKey: string,
): Promise<BannerRenderResult> {
    const res = await axios.get(
        `${baseUrl}/api/marketing/banners/render/${encodeURIComponent(placementKey)}`,
        { headers: authHeader(token) },
    );
    return unwrap<BannerRenderResult>(res, 'رندر جایگاه ناموفق بود');
}
