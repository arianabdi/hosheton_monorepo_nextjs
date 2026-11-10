import type { AnalyticsPlatformType } from './marketing.types';

export type PlatformConfigFieldType = 'text' | 'textarea' | 'url';

export interface PlatformConfigField {
    key: string;
    label: string;
    type: PlatformConfigFieldType;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
}

/** راهنمای آماده‌سازی، جدا برای تیم توسعه و تیم مارکتینگ */
export interface PlatformSetupGuide {
    developerTitle: string;
    developerSteps: string[];
    marketingTitle: string;
    marketingSteps: string[];
}

export interface AnalyticsPlatformDefinition {
    platform: AnalyticsPlatformType;
    label: string;
    shortLabel: string;
    description: string;
    /** آیا در نسخه فعلی قابل اتصال است یا رزرو برای آینده */
    available: boolean;
    availabilityNote?: string;
    docUrl?: string;
    fields: PlatformConfigField[];
    setupGuide: PlatformSetupGuide;
}

const EMBED_URL_FIELD: PlatformConfigField = {
    key: 'embedUrl',
    label: 'لینک جاسازی (Embed URL) داشبورد',
    type: 'url',
    required: true,
    placeholder: 'https://lookerstudio.google.com/embed/reporting/REPORT_ID/page/PAGE_ID',
    helpText:
        'در Looker Studio از مسیر File → Embed report → Enable embedding → Embed code کپی کنید و فقط مقدار URL را اینجا قرار دهید.',
};

const GA4_PROPERTY_NAME_FIELD: PlatformConfigField = {
    key: 'propertyName',
    label: 'نام پراپرتی GA4',
    type: 'text',
    placeholder: 'مثلاً وبسایت فارسی',
    helpText: 'نامی که در Google Analytics > Admin دیده می‌شود؛ فقط برای شناسایی بهتر.',
};

const GA4_PROPERTY_ID_FIELD: PlatformConfigField = {
    key: 'propertyId',
    label: 'شناسه پراپرتی GA4',
    type: 'text',
    placeholder: 'مثلاً 123456789',
    helpText: 'شناسه عددی پراپرتی از Admin > Property settings (برای رفع اشکال مفید است).',
};

export const ANALYTICS_PLATFORM_DEFINITIONS: Record<AnalyticsPlatformType, AnalyticsPlatformDefinition> = {
    ga4: {
        platform: 'ga4',
        label: 'Google Analytics 4',
        shortLabel: 'GA4',
        description:
            'داشبورد بومی Looker Studio روی داده GA4 پروژه، داخل پنل جاسازی می‌شود — بدون ساخت گزارش از صفر و بدون نیاز به لاگین گوگل برای مشاهده.',
        available: true,
        docUrl: 'https://support.google.com/analytics/answer/9304153',
        fields: [
            {
                key: 'title',
                label: 'عنوان اتصال',
                type: 'text',
                required: true,
                placeholder: 'مثلاً GA4 — وبسایت اصلی',
            },
            GA4_PROPERTY_NAME_FIELD,
            GA4_PROPERTY_ID_FIELD,
            EMBED_URL_FIELD,
            {
                key: 'notes',
                label: 'یادداشت',
                type: 'textarea',
                placeholder: 'مثلاً تاریخ ساخت گزارش، مالک تگ، محدودیت‌های دسترسی…',
            },
        ],
        setupGuide: {
            developerTitle: 'تیم توسعه — تگ و داشبورد',
            developerSteps: [
                'تگ GA4 را در سایت/اپلیکیشن نصب کنید (Google Tag یا gtag.js) و رویدادهای کلیدی را تعریف کنید.',
                'API/داده‌ها را به GA4 متصل کنید (در صورت نیاز، مدیریت از طریق Admin > Data streams).',
                'دسترسی ویرایش‌گر به GA4 و Looker Studio را برای همکار مارکتینگ که داشبورد می‌سازد فراهم کنید.',
                'اطمینان حاصل کنید که داشبورد Looker Studio «Embed» شده و با «Anyone with the link» عمومی است.',
            ],
            marketingTitle: 'تیم مارکتینگ — ثبت و مشاهده',
            marketingSteps: [
                'از Looker Studio گزارش دلخواه را روی داده GA4 همان پروژه بسازید یا از قالب آماده استفاده کنید.',
                'File → Embed report → Enable embedding را بزنید و لینک Embed را کپی کنید.',
                'در این بخش «اتصال جدید» بسازید و لینک Embed را در فیلد Embed URL قرار دهید.',
                'از منوی «داشبوردها» اتصال را انتخاب کنید؛ بدون لاگین گوگل قابل مشاهده است.',
            ],
        },
    },
    'search-console': {
        platform: 'search-console',
        label: 'Google Search Console',
        shortLabel: 'GSC',
        description: 'عملکرد جستجوی ارگانیک و سئو — به‌زودی.',
        available: false,
        availabilityNote: 'در نسخه آینده فعال می‌شود.',
        docUrl: 'https://search.google.com/search-console/about',
        fields: [EMBED_URL_FIELD],
        setupGuide: {
            developerTitle: 'راهنمای توسعه',
            developerSteps: ['به‌زودی'],
            marketingTitle: 'راهنمای مارکتینگ',
            marketingSteps: ['به‌زودی'],
        },
    },
    mixpanel: {
        platform: 'mixpanel',
        label: 'Mixpanel',
        shortLabel: 'Mixpanel',
        description: 'تحلیل محصول و رویدادهای محصول — به‌زودی.',
        available: false,
        availabilityNote: 'در نسخه آینده فعال می‌شود.',
        docUrl: 'https://mixpanel.com/',
        fields: [EMBED_URL_FIELD],
        setupGuide: {
            developerTitle: 'راهنمای توسعه',
            developerSteps: ['به‌زودی'],
            marketingTitle: 'راهنمای مارکتینگ',
            marketingSteps: ['به‌زودی'],
        },
    },
    hotjar: {
        platform: 'hotjar',
        label: 'Hotjar',
        shortLabel: 'Hotjar',
        description: 'هیت‌مپ و رفتار کاربر — به‌زودی.',
        available: false,
        availabilityNote: 'در نسخه آینده فعال می‌شود.',
        docUrl: 'https://www.hotjar.com/',
        fields: [EMBED_URL_FIELD],
        setupGuide: {
            developerTitle: 'راهنمای توسعه',
            developerSteps: ['به‌زودی'],
            marketingTitle: 'راهنمای مارکتینگ',
            marketingSteps: ['به‌زودی'],
        },
    },
};

export const PLATFORM_OPTIONS = Object.values(ANALYTICS_PLATFORM_DEFINITIONS).map((def) => ({
    value: def.platform,
    label: def.label,
    available: def.available,
}));

export function getPlatformDefinition(platform: string): AnalyticsPlatformDefinition {
    return (
        ANALYTICS_PLATFORM_DEFINITIONS[platform as AnalyticsPlatformType] ||
        ANALYTICS_PLATFORM_DEFINITIONS.ga4
    );
}

/** اعتبارسنجی ساده URL جاسازی Looker Studio */
export function isValidEmbedUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    try {
        const parsed = new URL(trimmed);
        return (
            (parsed.hostname === 'lookerstudio.google.com' ||
                parsed.hostname === 'datastudio.google.com') &&
            parsed.pathname.startsWith('/embed/reporting/')
        );
    } catch {
        return false;
    }
}
