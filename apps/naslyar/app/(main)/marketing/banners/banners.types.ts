// انواع داده ماژول مدیریت بنر// معماری سه‌لایه: Placement (جایگاه) → Creative (خلاقیت) → Banner (نمایش)

// ─── Placement ───
export type BannerPageType = 'home' | 'category' | 'product' | 'checkout' | 'profile' | 'other';

export interface BannerPlacement {
    _id: string;
    /** شناسه یکتا مثل home.hero */
    key: string;
    name: string;
    description?: string;
    pageType: BannerPageType;
    allowedWidth: number;
    allowedHeight: number;
    /** مثل 2.74:1 */
    aspectRatio?: string;
    /** فرمت‌های مجاز مثل jpg, png, webp, mp4 */
    formats: string[];
    /** آیا جایگاه چند بنر همزمان (carousel) می‌پذیرد */
    supportsMultiple: boolean;
    /** Creative پیش‌فرض در نبود بنر فعال */
    fallbackCreativeId?: string;
    isAlive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type BannerPlacementForm = Omit<BannerPlacement, '_id' | 'isAlive' | 'createdAt' | 'updatedAt'>;

export const BANNER_PAGE_TYPE_LABELS: Record<BannerPageType, string> = {
    home: 'صفحه اصلی',
    category: 'صفحه دسته‌بندی',
    product: 'صفحه محصول',
    checkout: 'تسویه حساب',
    profile: 'داشبورد کاربر',
    other: 'سایر',
};

export const EMPTY_PLACEMENT_FORM: BannerPlacementForm = {
    key: '',
    name: '',
    description: '',
    pageType: 'home',
    allowedWidth: 1920,
    allowedHeight: 700,
    aspectRatio: '',
    formats: ['jpg', 'png', 'webp'],
    supportsMultiple: false,
    fallbackCreativeId: '',
};

// ─── Creative ───
export type CreativeDeviceType = 'desktop' | 'tablet' | 'mobile';
export type CtaOpenModeType = 'same_tab' | 'new_tab';

export interface CreativeAsset {
    device: CreativeDeviceType;
    imageUrl: string;
    width: number;
    height: number;
    fileSize: number;
    mime: string;
}

export interface BannerCreative {
    _id: string;
    title: string;
    alt?: string;
    ctaText?: string;
    ctaUrl?: string;
    openMode: CtaOpenModeType;
    tags: string[];
    language: string;
    assets: CreativeAsset[];
    isActive: boolean;
    isAlive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type BannerCreativeForm = Omit<BannerCreative, '_id' | 'isAlive' | 'createdAt' | 'updatedAt'>;

export const CREATIVE_DEVICE_LABELS: Record<CreativeDeviceType, string> = {
    desktop: 'دسکتاپ',
    tablet: 'تبلت',
    mobile: 'موبایل',
};

export const CTA_OPEN_MODE_LABELS: Record<CtaOpenModeType, string> = {
    same_tab: 'همان تب',
    new_tab: 'تب جدید',
};

export const EMPTY_CREATIVE_FORM: BannerCreativeForm = {
    title: '',
    alt: '',
    ctaText: '',
    ctaUrl: '',
    openMode: 'same_tab',
    tags: [],
    language: 'fa',
    assets: [],
    isActive: true,
};

// ─── Banner (اتصال خلاقیت به جایگاه + قوانین نمایش) ───
export type BannerStatusType = 'draft' | 'active' | 'paused' | 'archived';

export interface FrequencyCap {
    perSession?: number;
    perDay?: number;
    perWeek?: number;
    perUserLifetime?: number;
}

export interface Banner {
    _id: string;
    title: string;
    description?: string;
    status: BannerStatusType;
    creativeId: string;
    placementKeys: string[];
    /** 1 تا 100 — اولویت بالاتر برنده تداخل */
    priority: number;
    /** 0 تا 100 — rotation بین هم‌اولویت‌ها */
    weight: number;
    startAt?: string | null;
    endAt?: string | null;
    /** بازه ساعتی نمایش 0..24 */
    dailyStartHour: number;
    dailyEndHour: number;
    frequencyCap: FrequencyCap;
    /** { and: [{ device: 'mobile' }, ...] } */
    rules: { and: Array<Record<string, unknown>> };
    isAlive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type BannerForm = Omit<Banner, '_id' | 'isAlive' | 'createdAt' | 'updatedAt'>;

export const BANNER_STATUS_LABELS: Record<BannerStatusType, string> = {
    draft: 'پیش‌نویس',
    active: 'فعال',
    paused: 'متوقف',
    archived: 'بایگانی',
};

export const EMPTY_BANNER_FORM: BannerForm = {
    title: '',
    description: '',
    status: 'draft',
    creativeId: '',
    placementKeys: [],
    priority: 10,
    weight: 50,
    startAt: null,
    endAt: null,
    dailyStartHour: 0,
    dailyEndHour: 24,
    frequencyCap: {},
    rules: { and: [] },
};

// ─── Analytics ───
export interface BannerStat {
    bannerId: string;
    impressions: number;
    clicks: number;
    ctr: number;
}

// ─── Renderer (پیش‌نمایش) ───
export interface BannerRenderResult {
    placement: BannerPlacement;
    banner: { _id: string; title: string } | null;
    creative: {
        _id: string;
        title: string;
        alt?: string;
        ctaText?: string;
        ctaUrl?: string;
        openMode: CtaOpenModeType;
        assets: CreativeAsset[];
    } | null;
    tracking: { impression: string; click: string } | null;
}
