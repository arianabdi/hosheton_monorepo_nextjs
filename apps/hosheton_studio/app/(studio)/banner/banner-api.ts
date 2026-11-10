import axios from 'axios';

/**
 * کلاینت Renderer API بنرها — endpoint عمومی سمت core:
 * GET  /api/marketing/banners/render/:placementKey
 * POST /api/marketing/banners/track (impression / click)
 * خطاها عمداً بی‌صدا مدیریت می‌شوند — بنر نباید هرگز صفحه را بشکند.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface RenderedBannerCreative {
    _id: string;
    title: string;
    alt?: string;
    ctaText?: string;
    ctaUrl?: string;
    openMode?: 'same_tab' | 'new_tab';
    assets: Array<{
        device: 'desktop' | 'tablet' | 'mobile';
        imageUrl: string;
        width: number;
        height: number;
    }>;
}

export interface RenderedBanner {
    placement: {
        key: string;
        name: string;
        allowedWidth: number;
        allowedHeight: number;
    };
    banner: { _id: string; title: string } | null;
    creative: RenderedBannerCreative | null;
    tracking: { impression: string; click: string } | null;
}

/** شناسه جلسه برای امتیازدهی impression (per browser tab session) */
export function getBannerSessionId(): string {
    if (typeof window === 'undefined') return '';
    try {
        let id = window.sessionStorage.getItem('banner-session-id');
        if (!id) {
            id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
            window.sessionStorage.setItem('banner-session-id', id);
        }
        return id;
    } catch {
        return '';
    }
}

export async function fetchRenderedBanner(
    placementKey: string,
    device: 'desktop' | 'tablet' | 'mobile' = 'desktop',
): Promise<RenderedBanner | null> {
    if (!API_URL) return null;
    try {
        const res = await axios.get(
            `${API_URL}/api/marketing/banners/render/${encodeURIComponent(placementKey)}`,
            { params: { device }, timeout: 8000 },
        );
        if (res.data?.statusCode === 200) {
            return (res.data.data as RenderedBanner) || null;
        }
    } catch {
        // بنر اختیاری است — خطا نادیده گرفته می‌شود
    }
    return null;
}

/** ثبت رویداد (fire-and-forget) — tracking URL از خروجی Renderer می‌آید */
export function trackBannerEvent(trackingPath: string, device: string): void {
    if (!API_URL || !trackingPath) return;
    axios
        .post(
            `${API_URL}${trackingPath}`,
            { sessionId: getBannerSessionId(), device },
            { timeout: 5000 },
        )
        .catch(() => undefined);
}

/** انتخاب asset متناسب با دستگاه (fallback: دسکتاپ، بعد اولین asset) */
export function pickCreativeAsset(
    creative: RenderedBannerCreative | null | undefined,
    device: 'desktop' | 'tablet' | 'mobile',
): RenderedBannerCreative['assets'][number] | null {
    if (!creative?.assets?.length) return null;
    return (
        creative.assets.find((a) => a.device === device) ||
        creative.assets.find((a) => a.device === 'desktop') ||
        creative.assets[0]
    );
}
