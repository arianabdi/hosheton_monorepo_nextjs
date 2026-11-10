/** مسیرها و تب‌های ماژول سایت‌مپ — تب‌ها در layout مشترک (sitemap/(tabs)/layout.tsx) جابه‌جا می‌شوند */

export const SITEMAP_BASE = '/marketing/sitemap';

export const SITEMAP_TABS = [
    { href: SITEMAP_BASE, label: 'نمای کلی' },
    { href: `${SITEMAP_BASE}/groups`, label: 'گروه‌ها' },
    { href: `${SITEMAP_BASE}/rules`, label: 'قوانین URL' },
    { href: `${SITEMAP_BASE}/generation`, label: 'تولید و فایل‌ها' },
    { href: `${SITEMAP_BASE}/validation`, label: 'اعتبارسنجی' },
    { href: `${SITEMAP_BASE}/indexnow`, label: 'IndexNow' },
    { href: `${SITEMAP_BASE}/robots`, label: 'Robots.txt' },
    { href: `${SITEMAP_BASE}/settings`, label: 'تنظیمات' },
    { href: `${SITEMAP_BASE}/guide`, label: 'آموزش' },
];

export const sitemapHref = {
    groups: `${SITEMAP_BASE}/groups`,
    newGroup: `${SITEMAP_BASE}/groups/new`,
    editGroup: (id: string) => `${SITEMAP_BASE}/groups/${id}/edit`,
    rules: `${SITEMAP_BASE}/rules`,
    generation: `${SITEMAP_BASE}/generation`,
    validation: `${SITEMAP_BASE}/validation`,
    indexnow: `${SITEMAP_BASE}/indexnow`,
    robots: `${SITEMAP_BASE}/robots`,
    settings: `${SITEMAP_BASE}/settings`,
    /** لینک مستقیم به یک موضوع در مستند آموزش */
    guide: (topic?: GuideTopicId) => `${SITEMAP_BASE}/guide${topic ? `#${topic}` : ''}`,
};

/** شناسه موضوعات آموزش — به‌عنوان anchor در صفحه آموزش و لینک «آموزش این بخش» در هر تب */
export type GuideTopicId =
    | 'basics'
    | 'quickstart'
    | 'groups'
    | 'rules'
    | 'generation'
    | 'validation'
    | 'robots'
    | 'search-engines'
    | 'indexnow'
    | 'settings'
    | 'best-practices'
    | 'troubleshooting'
    | 'glossary';

