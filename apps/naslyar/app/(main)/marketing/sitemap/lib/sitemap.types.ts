/**
 * تایپ‌های ماژول سایت‌مپ — هم‌راستا با ماژول core در API
 * (my-workspace-api/libs/core/src/sitemap)
 */

/** مسیرهای ثابت عمومی روی دامنه سایت — همان SITEMAP_* در core و rewrites فرانت استودیو */
export const SITEMAP_INDEX_PATH = '/sitemap.xml';
export const SITEMAP_FILES_PREFIX = '/sitemaps/';
export const SITEMAP_ROBOTS_PATH = '/robots.txt';
export const SITEMAP_PROTOCOL_MAX_URLS = 50000;

export type SitemapSource =
    | 'static'
    | 'templates'
    | 'template_categories'
    | 'creators'
    | 'posts'
    | 'categories'
    | 'products'
    | 'docs'
    | 'changelog';

export type SitemapLastmodField = 'updatedAt' | 'createdAt' | 'publishedAt' | 'reviewedAt' | 'releaseDate';

export const SOURCE_LABELS: Record<SitemapSource, string> = {
    static: 'صفحات ثابت',
    templates: 'قالب‌های مارکت‌پلیس',
    template_categories: 'دسته‌های قالب (تگ‌ها)',
    creators: 'پروفایل سازنده‌ها',
    posts: 'مقالات وبلاگ',
    categories: 'دسته‌بندی‌ها',
    products: 'محصولات',
    docs: 'مستندات',
    changelog: 'گزارش تغییرات',
};

/** توضیح هر منبع + الگوی پیشنهادی URL + فیلدهای مجاز lastmod */
export const SOURCE_HINTS: Record<SitemapSource, { hint: string; suggestedPattern: string; lastmodFields: SitemapLastmodField[] }> = {
    static: { hint: 'مسیرهای ثابتی که در تب «تنظیمات» ثبت می‌شوند (Explore، قوانین و…).', suggestedPattern: '{path}', lastmodFields: ['updatedAt'] },
    templates: { hint: 'قالب‌های لیست‌شده مارکت‌پلیس استودیو — دقیقاً همان فیلتر صفحه Explore. قالب تگ‌دار زیر مسیر اولین تگش منتشر می‌شود.', suggestedPattern: '/explore/{categoryPath?}/{slug}', lastmodFields: ['reviewedAt', 'updatedAt', 'createdAt'] },
    template_categories: { hint: 'صفحهٔ فرود هر تگ قالب (زیرساخت › دسته‌بندی تگ‌ها) — تگ‌های noindex خودکار حذف می‌شوند.', suggestedPattern: '/explore/{categoryPath}', lastmodFields: ['updatedAt'] },
    creators: { hint: 'سازنده‌هایی که حداقل یک قالب عمومی تاییدشده دارند.', suggestedPattern: '/creators/{id}', lastmodFields: ['updatedAt', 'createdAt'] },
    posts: { hint: 'مقالات وبلاگ — فقط منتشرشده و مخفی‌نشده. آدرس هر مقاله زیر زنجیرهٔ کامل دسته‌اش است؛ مقالهٔ بی‌دسته آدرس ندارد و منتشر نمی‌شود.', suggestedPattern: '/blog/{categoryPath}/{slug}', lastmodFields: ['updatedAt', 'createdAt'] },
    categories: { hint: 'صفحه‌های فرود دسته‌ها — بخش (section) موردنظر را پایین‌تر انتخاب کنید. دسته‌های noindex خودکار حذف می‌شوند.', suggestedPattern: '/blog/{categoryPath}', lastmodFields: ['updatedAt', 'createdAt'] },
    products: { hint: 'محصولات منتشرشده با دسترسی عمومی.', suggestedPattern: '/product/{slug}', lastmodFields: ['publishedAt', 'updatedAt', 'createdAt'] },
    docs: { hint: 'صفحات مستندات و آموزش منتشرشده — قرارداد مشترک فرانت‌ها: /docs/<موضوع>/<صفحه>.', suggestedPattern: '/docs/{categorySlug}/{slug}', lastmodFields: ['updatedAt', 'createdAt'] },
    changelog: { hint: 'نسخه‌های منتشرشده گزارش تغییرات محصول.', suggestedPattern: '/changelog/{version}', lastmodFields: ['releaseDate', 'updatedAt'] },
};

/**
 * الگوهای آمادهٔ URL هر منبع — همان قرارداد مسیرهای مشترک فرانت اپ‌ها (AGENTS.md ریشه، «محتوا و دسته‌بندی سئو»).
 * برای منبع «دسته‌بندی‌ها» بر اساس section.
 */
export const URL_PATTERN_PRESETS: Partial<Record<SitemapSource, Array<{ label: string; pattern: string }>>> = {
    templates: [
        { label: 'زیر تگ اصلی قالب (پیشنهادی)', pattern: '/explore/{categoryPath?}/{slug}' },
        { label: 'بدون تگ', pattern: '/explore/{slug}' },
    ],
    template_categories: [{ label: 'صفحهٔ تگ (پیشنهادی)', pattern: '/explore/{categoryPath}' }],
    posts: [
        { label: 'زیر زنجیرهٔ دسته (پیشنهادی)', pattern: '/blog/{categoryPath}/{slug}' },
        { label: 'فقط آخرین دسته', pattern: '/blog/{categorySlug}/{slug}' },
    ],
    docs: [{ label: 'موضوع/صفحه (پیشنهادی)', pattern: '/docs/{categorySlug}/{slug}' }],
    creators: [{ label: 'پروفایل سازنده', pattern: '/creators/{id}' }],
};

export const CATEGORY_SECTION_PRESETS: Array<{ section: string; label: string; pattern: string }> = [
    { section: 'post', label: 'دسته‌های بلاگ', pattern: '/blog/{categoryPath}' },

    { section: 'docs', label: 'موضوع‌های مستندات', pattern: '/docs/{slug}' },
    { section: 'product', label: 'دسته‌های محصول', pattern: '/category/{categoryPath}' },
];

/** توکن‌های قابل درج در الگو با توضیح — {categoryPath?} یعنی بخش دسته اختیاری است */
export const URL_PATTERN_TOKENS: Array<{ token: string; hint: string; sources?: SitemapSource[] }> = [
    { token: '{slug}', hint: 'شناسهٔ آدرس سند' },
    { token: '{id}', hint: 'شناسهٔ دیتابیس' },
    { token: '{categoryPath}', hint: 'زنجیرهٔ کامل دسته‌ها (a/b/c) — سند بی‌دسته منتشر نمی‌شود', sources: ['posts', 'docs', 'categories', 'templates', 'template_categories'] },
    { token: '{categoryPath?}', hint: 'مثل بالا ولی اختیاری — سند بی‌دسته بدون این بخش منتشر می‌شود', sources: ['posts', 'docs', 'templates'] },
    { token: '{categorySlug}', hint: 'فقط slug آخرین دسته', sources: ['posts', 'docs', 'categories', 'templates', 'template_categories'] },
    { token: '{version}', hint: 'شمارهٔ نسخه', sources: ['changelog'] },
    { token: '{path}', hint: 'مسیر صفحهٔ ثابت', sources: ['static'] },
];

/** نمونهٔ آدرس نهایی برای پیش‌نمایش الگو */
export function previewUrlPattern(pattern: string, siteUrl?: string): string {
    const path = pattern
        .split('{categoryPath?}').join('image-generation/portrait')
        .split('{categoryPath}').join('image-generation/portrait')
        .split('{categorySlug?}').join('portrait')
        .split('{categorySlug}').join('portrait')
        .split('{slug}').join('sample-slug')
        .split('{id}').join('6650f1c2a9e1')
        .split('{version}').join('1.4.0')
        .split('{path}').join('/explore')
        .replace(/\/{2,}/g, '/');
    return `${(siteUrl || '').replace(/\/+$/, '')}${path}`;
}

export const LASTMOD_FIELD_LABELS: Record<SitemapLastmodField, string> = {
    updatedAt: 'آخرین به‌روزرسانی (updatedAt)',
    createdAt: 'تاریخ ایجاد (createdAt)',
    publishedAt: 'تاریخ انتشار (publishedAt)',
    reviewedAt: 'تاریخ تایید انتشار (reviewedAt)',
    releaseDate: 'تاریخ انتشار نسخه (releaseDate)',
};

export const CHANGEFREQ_OPTIONS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'] as const;

export interface SitemapUrlRules {
    forceHttps: boolean;
    stripQueryString: boolean;
    stripTrailingSlash: boolean;
    lowercasePaths: boolean;
    excludePatterns: string[];
}

export interface SitemapRobotsConfig {
    enabled: boolean;
    sitemapDirective: boolean;
    disallowPaths: string[];
    crawlDelay: number | null;
}

export interface SitemapIndexNowConfig {
    enabled: boolean;
    automatic: boolean;
    batchSize: number;
    /** فقط‌خواندنی — سرور می‌سازد */
    key: string;
    lastSubmittedAt: string | null;
    lastResult: string | null;
}

export interface SitemapConfig {
    _id?: string;
    enabled: boolean;
    siteUrl: string;
    maxUrlsPerFile: number;
    staticPages: string[];
    urlRules: SitemapUrlRules;
    lastmod: { staleDays: number };
    advanced: { changefreq: boolean; priority: boolean };
    robots: SitemapRobotsConfig;
    indexnow: SitemapIndexNowConfig;
    generation: { mode: 'automatic' | 'manual'; cacheTtlSeconds: number };
    monitoring: { alertOnGenerationFailure: boolean; alertOnUrlDropPercent: number };
}

export type SitemapConfigPatch = Partial<Omit<SitemapConfig, '_id'>>;

export interface SitemapGroupConditions {
    requirePublished: boolean;
    requirePublicVisibility: boolean;
    requireAlive: boolean;
    requireSlug: boolean;
}

export interface SitemapGroup {
    _id: string;
    name: string;
    title: string;
    enabled: boolean;
    source: SitemapSource;
    urlPattern: string;
    lastmodField: SitemapLastmodField;
    conditions: SitemapGroupConditions | null;
    sourceOptions: { categorySection?: string } | null;
    changefreq: string | null;
    priority: number | null;
    shardSize: number | null;
    cacheTtlSeconds: number;
    sort: number;
    note: string;
}

export type SitemapGroupForm = Omit<SitemapGroup, '_id'>;

export const DEFAULT_CONDITIONS: SitemapGroupConditions = {
    requirePublished: true,
    requirePublicVisibility: true,
    requireAlive: true,
    requireSlug: true,
};

export const EMPTY_GROUP_FORM: SitemapGroupForm = {
    name: '',
    title: '',
    enabled: true,
    source: 'posts',
    urlPattern: SOURCE_HINTS.posts.suggestedPattern,
    lastmodField: 'updatedAt',
    conditions: { ...DEFAULT_CONDITIONS },
    sourceOptions: null,
    changefreq: null,
    priority: null,
    shardSize: null,
    cacheTtlSeconds: 0,
    sort: 100,
    note: '',
};

export type GroupHealth = 'healthy' | 'warning' | 'error' | 'disabled';

export const HEALTH_LABELS: Record<GroupHealth, string> = {
    healthy: 'سالم',
    warning: 'هشدار',
    error: 'خطا',
    disabled: 'غیرفعال',
};

export interface GroupStat extends SitemapGroup {
    urlsCount: number;
    fileCount: number;
    health: GroupHealth;
    issueCount: number;
}

export interface SitemapFileMeta {
    name: string;
    /** آدرس عمومی فایل روی دامنه سایت */
    url: string;
    groupName: string;
    groupTitle: string;
    shardIndex: number;
    urlsCount: number;
    sizeBytes: number;
    /** جدیدترین lastmod محتوای فایل */
    lastmod: string | null;
    generatedAt: string;
}

export type RunType = 'full' | 'group' | 'audit' | 'indexnow';

export interface SitemapRun {
    _id: string;
    type: RunType;
    status: 'success' | 'failed';
    groupName: string | null;
    urlsCount: number;
    fileCount: number;
    durationMs: number;
    triggeredBy: 'admin' | 'cron' | 'request';
    message: string;
    createdAt: string;
}

export const RUN_TYPE_LABELS: Record<RunType, string> = {
    full: 'تولید کامل',
    group: 'تولید گروه',
    audit: 'ممیزی',
    indexnow: 'ارسال IndexNow',
};

export const TRIGGER_LABELS: Record<SitemapRun['triggeredBy'], string> = {
    admin: 'ادمین',
    cron: 'خودکار',
    request: 'درخواست',
};

export type IssueSeverity = 'critical' | 'error' | 'warning' | 'info';

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
    critical: 'بحرانی',
    error: 'خطا',
    warning: 'هشدار',
    info: 'اطلاع',
};

export interface SitemapIssue {
    _id: string;
    severity: IssueSeverity;
    code: string;
    groupName: string | null;
    url: string | null;
    message: string;
    resolved: boolean;
    createdAt: string;
}

export interface OverviewResponse {
    config: SitemapConfig;
    groups: GroupStat[];
    totals: {
        urls: number;
        files: number;
        addedToday: number;
        updatedToday: number;
        warnings: number;
        errors: number;
        info: number;
    };
    lastRuns: SitemapRun[];
    lastGeneration: SitemapRun | null;
    files: SitemapFileMeta[];
}

export interface AuditSummary {
    summary: Record<IssueSeverity, number>;
    checkedGroups: number;
    totalUrls: number;
    durationMs: number;
}

export interface IndexNowStatus {
    key: string;
    keyFileUrl: string;
    lastSubmittedAt: string | null;
    lastResult: string | null;
}

export interface IndexNowSubmitResult {
    submitted: number;
    skipped: number;
    ok: boolean;
    detail: string;
}

export interface InspectResult {
    input: string;
    normalizedPath: string;
    absoluteUrl: string;
    excluded: boolean;
    inSitemap: boolean;
    groups: Array<{ groupName: string; groupTitle: string; file: string; fileUrl: string; generatedAt: string }>;
}

export interface GenerateResult {
    urlsCount: number;
    fileCount: number;
    durationMs: number;
    failed?: Array<{ group: string; error: string }>;
}
