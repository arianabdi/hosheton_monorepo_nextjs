import axios from 'axios';
import type { BannerForm, BannerPlacementForm, BannerCreativeForm, CreativeAsset, CreativeDeviceType } from './banners.types';

/**
 * داده‌های نمونه برای درک بهتر معماری بنر در پروژه hosheton_studio:
 * ۴ جایگاه واقعی استودیو + خلاقیت‌های نمونه + بنر فعال برای هر جایگاه.
 * اجرای seed idempotent است — موارد موجود (بر اساس key/title) دوباره ساخته نمی‌شوند.
 */

const authHeader = (token: string) => ({ authorization: `Bearer ${token}` });

/** ساخت تصویر SVG نمونه به‌صورت data URI (بدون وابستگی به فایل یا دامنه) */
function svgDataUri(width: number, height: number, label: string, color: string): string {
    const fontSize = Math.max(14, Math.round(Math.min(width, height) / 7));
    const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>` +
        `<rect width='100%' height='100%' fill='${color}'/>` +
        `<rect x='6' y='6' width='${width - 12}' height='${height - 12}' fill='none' stroke='rgba(255,255,255,0.45)' stroke-width='2' stroke-dasharray='8 6' rx='10'/>` +
        `<text x='50%' y='46%' fill='#ffffff' font-size='${fontSize}' font-weight='bold' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif'>${label}</text>` +
        `<text x='50%' y='62%' fill='rgba(255,255,255,0.75)' font-size='${Math.round(fontSize * 0.5)}' text-anchor='middle' dominant-baseline='middle' font-family='sans-serif'>بنر نمونه hosheton_studio</text>` +
        `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function asset(device: CreativeDeviceType, width: number, height: number, label: string, color: string): CreativeAsset {
    return {
        device,
        imageUrl: svgDataUri(width, height, label, color),
        width,
        height,
        fileSize: 0,
        mime: 'image/svg+xml',
    };
}

// ─── جایگاه‌های نمونه استودیو ───
export const STUDIO_SAMPLE_PLACEMENTS: BannerPlacementForm[] = [
    {
        key: 'studio.sidebar.square',
        name: 'مربع پایین سایدبار',
        description: 'باکس مربعی در انتهای منوی کناری استودیو — زیر آیتم‌های ناوبری و بالای فوتر پروفایل.',
        pageType: 'other',
        allowedWidth: 240,
        allowedHeight: 240,
        aspectRatio: '1:1',
        formats: ['jpg', 'png', 'webp'],
        supportsMultiple: false,
        fallbackCreativeId: '',
    },
    {
        key: 'studio.chat.input.below',
        name: 'زیر چت‌باکس (صفحه چت)',
        description: 'باکس افقی هم‌عرض چت‌باکس، درست زیر آن — فقط در صفحه چت، نه اکسپلور.',
        pageType: 'other',
        allowedWidth: 960,
        allowedHeight: 120,
        aspectRatio: '8:1',
        formats: ['jpg', 'png', 'webp'],
        supportsMultiple: false,
        fallbackCreativeId: '',
    },
    {
        key: 'studio.wallet.balance',
        name: 'صفحه کیف پول',
        description: 'باکس افقی در صفحه کیف پول — بین کارت «موجودی فعلی» و نوار نرخ دلار.',
        pageType: 'other',
        allowedWidth: 720,
        allowedHeight: 160,
        aspectRatio: '4.5:1',
        formats: ['jpg', 'png', 'webp'],
        supportsMultiple: false,
        fallbackCreativeId: '',
    },
    {
        key: 'studio.explore.top',
        name: 'اولین کارت اکسپلور',
        description: 'مانند یک کارت پروژه در لیست اکسپلور، اما در بالاترین سطح (اولین آیتم).',
        pageType: 'home',
        allowedWidth: 800,
        allowedHeight: 1000,
        aspectRatio: '0.8:1',
        formats: ['jpg', 'png', 'webp'],
        supportsMultiple: false,
        fallbackCreativeId: '',
    },
];

// ─── خلاقیت‌های نمونه ───
export const STUDIO_SAMPLE_CREATIVES: BannerCreativeForm[] = [
    {
        title: 'نمونه — پیشنهاد ویژه استودیو',
        alt: 'پیشنهاد ویژه استودیو هوشتون',
        ctaText: 'مشاهده پیشنهاد',
        ctaUrl: 'https://studio.hosheton.com',
        openMode: 'new_tab',
        tags: ['نمونه', 'استودیو'],
        language: 'fa',
        assets: [
            asset('desktop', 800, 1000, 'پیشنهاد ویژه', '#7b64cf'),
            asset('mobile', 800, 1000, 'پیشنهاد ویژه', '#7b64cf'),
        ],
        isActive: true,
    },
    {
        title: 'نمونه — ارتقای حساب حرفه‌ای',
        alt: 'ارتقای حساب حرفه‌ای استودیو',
        ctaText: 'ارتقا بده',
        ctaUrl: 'https://studio.hosheton.com/pricing',
        openMode: 'same_tab',
        tags: ['نمونه', 'ارتقا'],
        language: 'fa',
        assets: [
            asset('desktop', 960, 120, 'ارتقای حساب حرفه‌ای', '#5b8def'),
            asset('mobile', 1080, 270, 'ارتقای حساب حرفه‌ای', '#5b8def'),
        ],
        isActive: true,
    },
    {
        title: 'نمونه — شارژ هدیه کیف پول',
        alt: 'شارژ هدیه کیف پول',
        ctaText: 'شارژ کیف پول',
        ctaUrl: 'https://studio.hosheton.com/wallet',
        openMode: 'same_tab',
        tags: ['نمونه', 'کیف پول'],
        language: 'fa',
        assets: [
            asset('desktop', 720, 160, 'شارژ هدیه کیف پول', '#3fae7a'),
            asset('mobile', 720, 320, 'شارژ هدیه کیف پول', '#3fae7a'),
        ],
        isActive: true,
    },
    {
        title: 'نمونه — دسترسی سریع ابزارها',
        alt: 'دسترسی سریع به ابزارهای استودیو',
        ctaText: 'شروع کن',
        ctaUrl: 'https://studio.hosheton.com/projects',
        openMode: 'new_tab',
        tags: ['نمونه', 'ابزارها'],
        language: 'fa',
        assets: [asset('desktop', 240, 240, 'ابزارهای سریع', '#e0a13f')],
        isActive: true,
    },
];

/** بنر نمونه — اتصال خلاقیت به جایگاه (creativeId بعد از seed خلاقیت‌ها پر می‌شود) */
const STUDIO_SAMPLE_BANNERS: Array<{ title: string; creativeTitle: string; placementKey: string; description: string }> = [
    {
        title: 'نمونه — سایدبار: ابزارهای سریع',
        creativeTitle: 'نمونه — دسترسی سریع ابزارها',
        placementKey: 'studio.sidebar.square',
        description: 'باکس مربعی پایین سایدبار استودیو',
    },
    {
        title: 'نمونه — چت: ارتقای حساب',
        creativeTitle: 'نمونه — ارتقای حساب حرفه‌ای',
        placementKey: 'studio.chat.input.below',
        description: 'زیر چت‌باکس در صفحه چت',
    },
    {
        title: 'نمونه — کیف پول: شارژ هدیه',
        creativeTitle: 'نمونه — شارژ هدیه کیف پول',
        placementKey: 'studio.wallet.balance',
        description: 'بین موجودی و نرخ دلار در صفحه کیف پول',
    },
    {
        title: 'نمونه — اکسپلور: پیشنهاد ویژه',
        creativeTitle: 'نمونه — پیشنهاد ویژه استودیو',
        placementKey: 'studio.explore.top',
        description: 'اولین کارت لیست اکسپلور',
    },
];

async function unwrap<T = unknown>(res: { data?: { statusCode?: number; message?: string; data?: T } }, fallback: string): Promise<T> {
    if (res?.data?.statusCode !== 200) throw new Error(res?.data?.message || fallback);
    return res.data.data as T;
}

async function post(baseUrl: string, token: string, path: string, body: unknown) {
    const url = path ? `${baseUrl}/api/marketing/banners/${path}` : `${baseUrl}/api/marketing/banners`;
    const res = await axios.post(url, body, { headers: authHeader(token) });
    return unwrap<{ _id?: string }>(res, `ایجاد ${path || 'banner'} ناموفق بود`);
}

export interface SeedResult {
    placements: number;
    creatives: number;
    banners: number;
}

/**
 * درج داده‌های نمونه استودیو (idempotent):
 * جایگاه‌ها بر اساس key، خلاقیت‌ها و بنرها بر اساس title چک می‌شوند.
 */
export async function seedStudioBannerSamples(baseUrl: string, token: string): Promise<SeedResult> {
    const result: SeedResult = { placements: 0, creatives: 0, banners: 0 };

    // ۱) جایگاه‌ها
    const listRes = await axios.get(`${baseUrl}/api/marketing/banners/placements`, {
        params: { page: 1, limit: 200 },
        headers: authHeader(token),
    });
    const existingPlacements = (await unwrap<{ items?: Array<{ key: string }> }>(listRes, 'دریافت جایگاه‌ها ناموفق بود'))?.items || [];
    const existingKeys = new Set(existingPlacements.map((p) => p.key));
    for (const sample of STUDIO_SAMPLE_PLACEMENTS) {
        if (!existingKeys.has(sample.key)) {
            await post(baseUrl, token, 'placements', sample);
            result.placements += 1;
        }
    }

    // ۲) خلاقیت‌ها
    const creativeRes = await axios.get(`${baseUrl}/api/marketing/banners/creatives`, {
        params: { page: 1, limit: 500 },
        headers: authHeader(token),
    });
    const existingCreatives = (await unwrap<{ items?: Array<{ title: string; _id: string }> }>(creativeRes, 'دریافت خلاقیت‌ها ناموفق بود'))?.items || [];
    const existingCreativeTitles = new Set(existingCreatives.map((c) => c.title));
    const creativeIdByTitle = new Map<string, string>(existingCreatives.map((c) => [c.title, c._id]));
    for (const sample of STUDIO_SAMPLE_CREATIVES) {
        if (!existingCreativeTitles.has(sample.title)) {
            const created = await post(baseUrl, token, 'creatives', sample);
            if (created?._id) creativeIdByTitle.set(sample.title, created._id);
            result.creatives += 1;
        }
    }

    // ۳) بنرها (اتصال خلاقیت به جایگاه)
    const bannerRes = await axios.get(`${baseUrl}/api/marketing/banners`, {
        params: { page: 1, limit: 500 },
        headers: authHeader(token),
    });
    const existingBanners = (await unwrap<{ items?: Array<{ title: string }> }>(bannerRes, 'دریافت بنرها ناموفق بود'))?.items || [];
    const existingBannerTitles = new Set(existingBanners.map((b) => b.title));
    for (const sample of STUDIO_SAMPLE_BANNERS) {
        if (existingBannerTitles.has(sample.title)) continue;
        const creativeId = creativeIdByTitle.get(sample.creativeTitle);
        if (!creativeId) continue;
        const payload: BannerForm = {
            title: sample.title,
            description: sample.description,
            status: 'active',
            creativeId,
            placementKeys: [sample.placementKey],
            priority: 10,
            weight: 50,
            startAt: null,
            endAt: null,
            dailyStartHour: 0,
            dailyEndHour: 24,
            frequencyCap: {},
            rules: { and: [] },
        };
        await post(baseUrl, token, '', payload);
        result.banners += 1;
    }

    return result;
}
