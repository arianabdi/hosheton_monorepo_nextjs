import type { IconType } from 'react-icons';
import {
    LuLayoutDashboard,
    LuChartCandlestick,
    LuNewspaper,
    LuUsers,
    LuBookMarked,
    LuClapperboard,
    LuFolderOpen,
    LuLibrary,
    LuSparkles,
    LuWallet,
    LuHeadset,
    LuSettings,
    LuMegaphone,
    LuServer,
    LuCalendarDays,
    LuShoppingBag,
    LuCalculator,
    LuBoxes,
    LuDatabase,
} from 'react-icons/lu';
import { GrBug } from 'react-icons/gr';
import { TbBuildings, TbFileDots, TbRosetteDiscountCheck } from 'react-icons/tb';

export interface NavSubItem {
    title: string;
    href: string;
    allowedApps?: string[];
    allowedVariants?: string[];
    permissionKey?: string;
}

export interface NavItem {
    title: string;
    href: string;
    icon?: IconType;
    subItems?: NavSubItem[];
    allowedApps?: string[];
    /** Login option id (e.g. hosheton_studio). Empty = all variants of allowedApps. */
    allowedVariants?: string[];
    permissionKey?: string;
    /** خط جداکننده قبل از این آیتم در سایدبار */
    dividerBefore?: boolean;
    /** خط جداکننده بعد از این آیتم در سایدبار */
    dividerAfter?: boolean;
}

export const navItems: NavItem[] = [
    {
        title: 'پیشخوان',
        href: '/home',
        icon: LuLayoutDashboard,
        allowedApps: [],
    },
    {
        title: 'OpenForex',
        href: '/publications/review',
        icon: LuChartCandlestick,
        subItems: [
            {title: 'بررسی انتشار ربات', href: '/publications/review'},
            {title: 'بررسی نظرات', href: '/marketplace/comments'},
            {title: 'لاگ خریدها', href: '/marketplace/purchases'},
        ],
        allowedApps: ['openforex'],
    },
    {
        title: 'محتوا',
        href: '/blog',
        icon: LuNewspaper,
        permissionKey: 'content',
        subItems: [
            { title: 'مقاله ها', href: '/blog', permissionKey: 'content.blog' },
            { title: 'تولید با AI', href: '/blog/ai', permissionKey: 'content.blog.ai' },
            { title: 'جاب‌ها', href: '/blog/jobs', permissionKey: 'content.blog.jobs' },
            { title: 'دسته‌بندی‌ها', href: '/blog/categories', permissionKey: 'content.blog.categories' },
            { title: 'پرامپت‌ ها', href: '/blog/prompts', permissionKey: 'content.blog.prompts' },
            { title: 'سری ها', href: '/blog/series', permissionKey: 'content.blog.series' },
            { title: 'مستندات و آموزش‌ها', href: '/docs', permissionKey: 'content.docs' },
            { title: 'موضوع‌های آموزش', href: '/docs/categories', permissionKey: 'content.docs.categories' },
        ],
        allowedApps: ['taskvision', 'hosheton', 'lingeeko', 'openforex'],
    },
    {
        title: 'کاربران',
        href: '/users',
        icon: LuUsers,
        permissionKey: 'users',
        subItems: [
            { title: 'همه کاربران', href: '/users', permissionKey: 'users.list' },
            { title: 'نقش‌ها و دسترسی‌ها', href: '/users/access-roles', permissionKey: 'access.roles.manage' },
            { title: 'احراز هویت', href: '/verification', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
        ],
        allowedApps: [],
    },
    {
        title: 'دیکشنری',
        href: '/dictionary',
        icon: LuBookMarked,
        subItems: [
            { title: 'واژگان اصلی', href: '/dictionary/word' },
            { title: 'ترجمه ها', href: '/dictionary/translation' },
            { title: 'گرامرها', href: '/dictionary/grammar' },
            { title: 'جاب ها', href: '/dictionary/jobs' },
        ],
        allowedApps: ['lingeeko'],
    },
    {
        title: 'فیلم ها',
        href: '/films',
        icon: LuClapperboard,
        subItems: [
            { title: 'فیلم ها', href: '/films' },
            { title: 'بازیگران', href: '/actors' },
            { title: 'کارگردانان', href: '/directors' },
            { title: 'واژگان فیلم‌ها', href: '/films/vocabulary' },
            { title: 'جستجوی واژه', href: '/films/vocabulary/search' },
            { title: 'واژگان ناقص', href: '/films/vocabulary/missing' },
            { title: 'ایندکس‌گذاری', href: '/films/vocabulary/index' },
        ],
        allowedApps: ['lingeeko'],
    },
    {
        title: 'کتاب ها',
        href: '/films',
        icon: LuLibrary,
        allowedApps: ['lingeeko'],
    },
    {
        title: 'زیرساخت',
        href: '/projects/nodes',
        icon: LuServer,
        subItems: [
            // filkosh (vpn/dns platform)
            { title: 'داشبورد', href: '/dashboard', allowedApps: ['filkosh'] },
            { title: 'سرورها', href: '/servers', allowedApps: ['filkosh'] },
            { title: 'پروکسی تلگرام', href: '/mtproxy', allowedApps: ['filkosh'] },
            { title: 'استخرهای پروکسی', href: '/mtproxy/pools', allowedApps: ['filkosh'] },
            { title: 'اسپانسری پروکسی', href: '/mtproxy/sponsors', allowedApps: ['filkosh'] },
            { title: 'رویدادهای پروکسی', href: '/mtproxy/events', allowedApps: ['filkosh'] },
            { title: 'اشتراک‌ها', href: '/subscriptions', allowedApps: ['filkosh'] },
            { title: 'DNS', href: '/dns', allowedApps: ['filkosh'] },
            { title: 'اپلیکیشن‌ها', href: '/apps', allowedApps: ['filkosh'] },
            { title: 'لاگ‌ها', href: '/logs', allowedApps: ['filkosh'] },
            { title: 'سازنده بات تلگرام', href: '/telegram-bots', allowedApps: ['filkosh'] },
            // hosheton studio
            { title: 'نودها', href: '/projects/nodes', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
            { title: 'قالب‌ها', href: '/projects/templates/review', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
            { title: 'قالب‌های منتخب چت', href: '/projects/templates/review/featured', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
            { title: 'کاربران نمایشی', href: '/projects/personas', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
            { title: 'آواتارها', href: '/avatars', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
            { title: 'دسته‌بندی موضوعی', href: '/projects/marketplace/categories', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
            { title: 'دسته‌بندی تگ‌ها', href: '/projects/marketplace/tag-categories', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
            { title: 'قالب‌های ویژهٔ دسته‌ها', href: '/projects/marketplace/tag-categories/featured', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
            // hosheton blogger — shared Zernio key pool for social account connections
            { title: 'اکانت‌ها', href: '/capacity', allowedApps: ['hosheton'], allowedVariants: ['hosheton_blogger'], permissionKey: 'infrastructure.connection-capacity' },
            { title: 'ظرفیت‌ها', href: '/zernio-keys', allowedApps: ['hosheton'], allowedVariants: ['hosheton_blogger'], permissionKey: 'infrastructure.zernio-keys' },
            // taskvision
            { title: 'آموزش‌های ویدیویی', href: '/video-tutorials', allowedApps: ['taskvision'] },
            { title: 'پس‌زمینه‌های بورد', href: '/backgrounds', allowedApps: ['taskvision'] },
            { title: 'تنظیمات Agent Chat', href: '/agent-chat/settings', allowedApps: ['taskvision'] },
        ],
        allowedApps: ['filkosh', 'hosheton', 'taskvision'],
    },
    {
        title: 'هوش مصنوعی',
        href: '/providers',
        icon: LuSparkles,
        subItems: [
            { title: 'ارائه‌دهنده ها', href: '/providers' },
            { title: 'مدل ها', href: '/models' },
            { title: 'حساب ها', href: '/accounts' },
            { title: 'مودها', href: '/ai-modes' },
            { title: 'گزارش‌ها', href: '/ai-usage', allowedVariants: ['hosheton_studio'] },
            { title: 'قیمت‌ها', href: '/models/pricing' },
            { title: 'تنظیمات', href: '/ai-settings', allowedVariants: ['hosheton_chat', 'hosheton_bot', 'hosheton_studio'] },
        ],
        allowedApps: ['hosheton'],
    },
    {
        title: 'مالی ',
        href: '/billing',
        icon: LuWallet,
        permissionKey: 'billing',
        subItems: [
            { title: 'داشبورد', href: '/billing', permissionKey: 'billing.dashboard' },
            { title: 'درگاه‌ها', href: '/billing/gateways', permissionKey: 'billing.gateways' },
            { title: 'واریز کارت‌به‌کارت', href: '/billing/manual-payments', permissionKey: 'billing.manual-payments' },
            { title: 'کد تخفیف', href: '/billing/discount-codes', permissionKey: 'billing.discount-codes' },
            { title: 'فاکتورها', href: '/billing/invoices', permissionKey: 'billing.invoices' },
            { title: 'شارژ کیف پول', href: '/billing/invoices/credit', permissionKey: 'billing.invoices' },
            { title: 'جاب ‌ها', href: '/billing/payment-jobs', permissionKey: 'billing.payment-jobs' },
            { title: 'تنظیمات', href: '/billing/settings', permissionKey: 'billing.settings' },
        ],
        allowedApps: [],
    },
    {
        title: 'ای‌کامرس',
        href: '/e-commerce',
        icon: LuShoppingBag,
        permissionKey: 'e-commerce',
        subItems: [
            { title: 'داشبورد', href: '/e-commerce', permissionKey: 'e-commerce.dashboard' },
            { title: 'محصولات', href: '/e-commerce/products', permissionKey: 'e-commerce.products' },
            { title: 'دسته‌بندی‌ها', href: '/e-commerce/categories', permissionKey: 'e-commerce.categories' },
            { title: 'برندها', href: '/e-commerce/brands', permissionKey: 'e-commerce.brands' },
            { title: 'انبار و موجودی', href: '/e-commerce/inventory', permissionKey: 'e-commerce.inventory' },
            { title: 'شرکت‌های حمل‌ونقل', href: '/e-commerce/carriers', permissionKey: 'e-commerce.carriers' },
            { title: 'سفارشات', href: '/e-commerce/orders', permissionKey: 'e-commerce.orders' },
            { title: 'مشتریان', href: '/e-commerce/customers', permissionKey: 'e-commerce.customers' },
            { title: 'کوپن‌ها', href: '/e-commerce/coupons', permissionKey: 'e-commerce.coupons' },
            { title: 'گیفت کارت', href: '/e-commerce/gift-cards', permissionKey: 'e-commerce.gift-cards' },
            { title: 'ارسال', href: '/e-commerce/shipping', permissionKey: 'e-commerce.shipping' },
            { title: 'دیدگاه‌ها', href: '/e-commerce/reviews', permissionKey: 'e-commerce.reviews' },
            { title: 'علاقه‌مندی‌ها', href: '/e-commerce/wishlist', permissionKey: 'e-commerce.wishlist' },
            { title: 'امتیاز وفاداری', href: '/e-commerce/loyalty', permissionKey: 'e-commerce.loyalty' },
            { title: 'مرجوعی‌ها', href: '/e-commerce/returns', permissionKey: 'e-commerce.returns' },
            { title: 'سازمان‌های B2B', href: '/e-commerce/b2b', permissionKey: 'e-commerce.b2b' },
            { title: 'گزارش‌ها', href: '/e-commerce/reports', permissionKey: 'e-commerce.reports' },
            { title: 'گزارش فروش', href: '/e-commerce/analytics', permissionKey: 'e-commerce.analytics' },
            { title: 'تنظیمات', href: '/e-commerce/settings', permissionKey: 'e-commerce.settings' },
        ],
        allowedApps: [],
    },
    {
        title: 'مارکتینگ',
        href: '/marketing',
        icon: LuMegaphone,
        permissionKey: 'marketing',
        subItems: [
            { title: 'نمای کلی', href: '/marketing', permissionKey: 'marketing.overview' },
            { title: 'اتوماسیون', href: '/marketing/automation', permissionKey: 'marketing.automation' },
            { title: 'بنرها', href: '/marketing/banners', permissionKey: 'marketing.banners' },
            { title: 'کد معرف', href: '/marketing/referral-code', permissionKey: 'marketing.referral-code' },
            { title: 'کمپین‌ها', href: '/campaigns', permissionKey: 'marketing.campaigns' },
            { title: 'سایت‌مپ', href: '/marketing/sitemap', permissionKey: 'marketing.sitemap' },
            { title: 'همکاری', href: '/marketing/partnership', permissionKey: 'marketing.partnership' },
            { title: 'اتصال‌ها', href: '/marketing/connections', permissionKey: 'marketing.connections' },
            { title: 'داشبوردها', href: '/marketing/dashboards', permissionKey: 'marketing.dashboards' },
        ],
        allowedApps: [],
    },
    {
        title: 'فایل‌ها',
        href: '/files',
        icon: LuFolderOpen,
        permissionKey: 'files',
        subItems: [
            { title: 'مدیریت فایل', href: '/files', permissionKey: 'files.manage' },
            { title: 'تنظیمات', href: '/files/settings', permissionKey: 'files.manage' },
            { title: 'راهنمای استوریج', href: '/files/storage-docs', permissionKey: 'files.manage' },
        ],
        allowedApps: [],
    },
    {
        title: 'مدیریت اسناد',
        href: '/management/documents',
        icon: TbFileDots,
        dividerBefore: true,
        permissionKey: 'documents',
        subItems: [
            { title: 'نمای کلی', href: '/management/documents', permissionKey: 'documents.overview' },
            { title: 'مخزن اسناد', href: '/management/documents/explorer', permissionKey: 'documents.explorer' },
            { title: 'کارتابل', href: '/management/documents/workflows', permissionKey: 'documents.workflows' },
            { title: 'اشتراک‌گذاری', href: '/management/documents/sharing', permissionKey: 'documents.sharing' },
            { title: 'گزارش‌ها', href: '/management/documents/audit', permissionKey: 'documents.audit' },
            { title: 'آرشیو', href: '/management/documents/archive', permissionKey: 'documents.archive' },
            { title: 'تنظیمات', href: '/management/documents/settings', permissionKey: 'documents.settings' },
        ],
        allowedApps: [],
    },
    {
        title: 'منابع انسانی',
        href: '/management/hr',
        icon: TbBuildings,
        permissionKey: 'hr',
        subItems: [
            { title: 'نمای کلی', href: '/management/hr', permissionKey: 'hr.overview' },
            { title: 'کارمندان', href: '/management/hr/employees', permissionKey: 'hr.employees' },
            { title: 'واحدها', href: '/management/hr/departments', permissionKey: 'hr.departments' },
            { title: 'سمت‌ها', href: '/management/hr/roles', permissionKey: 'hr.job-roles' },
        ],
        allowedApps: [],
    },
    {
        title: 'جلسات',
        href: '/management/mettings',
        icon: LuCalendarDays,
        permissionKey: 'meetings',
        subItems: [
            { title: 'نمای کلی', href: '/management/mettings', permissionKey: 'meetings.overview' },
            { title: 'زمان‌بندی', href: '/management/mettings/scheduling', permissionKey: 'meetings.scheduling' },
            { title: 'پیامک', href: '/management/mettings/notifications', permissionKey: 'meetings.notifications' },
            { title: 'صورتجلسات', href: '/management/mettings/minutes', permissionKey: 'meetings.minutes' },
            { title: 'اسناد DMS', href: '/management/mettings/documents', permissionKey: 'meetings.documents' },
            { title: 'مصوبات', href: '/management/mettings/action-items', permissionKey: 'meetings.action-items' },
        ],
        allowedApps: [],
    },
    {
        title: 'حسابداری',
        href: '/accounting',
        icon: LuCalculator,
        subItems: [
            { title: 'داشبورد', href: '/accounting' },
            { title: 'شرکت‌ها', href: '/accounting/companies' },
            { title: 'سال‌های مالی', href: '/accounting/fiscal-years' },
            { title: 'کدینگ حساب‌ها', href: '/accounting/accounts' },
            { title: 'اسناد حسابداری', href: '/accounting/vouchers' },
            { title: 'دفتر روزنامه', href: '/accounting/journal' },
            { title: 'دفتر کل', href: '/accounting/ledger' },
            { title: 'تراز آزمایشی', href: '/accounting/trial-balance' },
        ],
        allowedApps: [],
    },
    {
        title: 'مدیریت اموال',
        href: '/asset-management',
        icon: LuBoxes,
        dividerAfter: true,
        permissionKey: 'asset-management',
        subItems: [
            { title: 'داشبورد', href: '/asset-management', permissionKey: 'asset-management.dashboard' },
            { title: 'دارایی‌ها', href: '/asset-management/assets', permissionKey: 'asset-management.assets' },
            { title: 'گروه‌های دارایی', href: '/asset-management/categories', permissionKey: 'asset-management.categories' },
            { title: 'محل‌های استقرار', href: '/asset-management/locations', permissionKey: 'asset-management.locations' },
        ],
        allowedApps: [],
    },
    {
        title: 'پشتیبانی',
        href: '/support',
        icon: LuHeadset,
        permissionKey: 'support',
        subItems: [
            { title: 'تیکت ها', href: '/support', permissionKey: 'support.tickets' },
            { title: 'دسته‌بندی‌ها', href: '/support/categories', permissionKey: 'support.categories' },
            { title: 'درخواست‌ها', href: '/support/requests', permissionKey: 'support.requests', allowedApps: ['hosheton'], allowedVariants: ['hosheton_studio'] },
        ],
        allowedApps: [],
    },
    {
        title: 'اشتراک',
        href: '/subscription',
        icon: TbRosetteDiscountCheck,
        permissionKey: 'subscription',
        subItems: [
            { title: 'اشتراک‌های کاربران', href: '/subscription', permissionKey: 'subscription' },
            { title: 'پلن‌ها', href: '/subscription/plans', permissionKey: 'subscription' },
            { title: 'مقادیر پلن‌ها', href: '/subscription/matrix', permissionKey: 'subscription' },
            { title: 'ویژگی‌ها', href: '/subscription/features', permissionKey: 'subscription' },
            { title: 'قیمت‌ها', href: '/subscription/prices', permissionKey: 'subscription' },
            { title: 'مصرف', href: '/subscription/usage', permissionKey: 'subscription' },
            { title: 'نقشه استفاده در کد', href: '/subscription/usage-map', permissionKey: 'subscription' },
            { title: 'تمدید خودکار', href: '/subscription/renewals', permissionKey: 'subscription' },
            { title: 'مستندات', href: '/subscription/docs', permissionKey: 'subscription' },
        ],
        allowedApps: [],
    },
    {
        title: 'پایش خطا',
        href: '/error-tracking',
        icon: GrBug,
        permissionKey: 'error-tracking',
        subItems: [
            { title: 'داشبورد', href: '/error-tracking', permissionKey: 'error-tracking.dashboard' },
            { title: 'مشکلات', href: '/error-tracking/issues', permissionKey: 'error-tracking.issues' },
            { title: 'پوشش رصد', href: '/error-tracking/coverage', permissionKey: 'error-tracking' },
            { title: 'پروژه‌ها', href: '/error-tracking/projects', permissionKey: 'error-tracking.projects' },
            { title: 'نسخه‌ها', href: '/error-tracking/releases', permissionKey: 'error-tracking.releases' },
            { title: 'هشدارها', href: '/error-tracking/alerts', permissionKey: 'error-tracking.alerts' },
            { title: 'راهنمای اتصال', href: '/error-tracking/integration', permissionKey: 'error-tracking' },
            { title: 'مستندات', href: '/error-tracking/docs', permissionKey: 'error-tracking' },
        ],
        allowedApps: [],
    },
    {
        // routes stay under /settings/database; the permission key is kept so existing roles keep access
        title: 'دیتابیس',
        href: '/settings/database',
        icon: LuDatabase,
        permissionKey: 'settings.database',
        subItems: [
            { title: 'داده‌ها', href: '/settings/database', permissionKey: 'settings.database' },
            { title: 'بک‌آپ', href: '/settings/database/backups', permissionKey: 'settings.database' },
            { title: 'لاگ‌ها', href: '/settings/database/jobs', permissionKey: 'settings.database' },
            { title: 'مستندات', href: '/settings/database/docs', permissionKey: 'settings.database' },
        ],
        allowedApps: [],
    },
    {
        title: 'تنظیمات',
        href: '/settings/website',
        icon: LuSettings,
        permissionKey: 'settings',
        subItems: [
            { title: 'وبسایت', href: '/settings/website', permissionKey: 'settings.website' },
            { title: 'پیامک', href: '/settings/sms', permissionKey: 'settings.sms' },
            { title: 'گزارش تغییرات', href: '/settings/changelog', permissionKey: 'settings.changelog' },
        ],
        allowedApps: [],
    },
];

const PAGE_TITLE_OVERRIDES: Record<string, string> = {
    '/models/pricing': 'قیمت‌ها',
    '/capacity': 'اکانت‌ها',
    '/zernio-keys': 'ظرفیت‌ها',
    '/zernio-keys/new': 'کلید جدید',
    '/zernio-keys/settings': 'تنظیمات اتصال',
    '/dashboard': 'فیلکوش — داشبورد',
    '/servers': 'فیلکوش — سرورها',
    '/servers/add': 'افزودن سرور فیلکوش',
    '/subscriptions': 'فیلکوش — اشتراک‌ها',
    '/dns': 'فیلکوش — DNS',
    '/apps': 'فیلکوش — اپلیکیشن‌ها',
    '/logs': 'فیلکوش — لاگ‌ها',
    '/dashboard': 'زیرساخت — داشبورد فیلکوش',
    '/servers': 'زیرساخت — سرورهای فیلکوش',
    '/servers/add': 'زیرساخت — افزودن سرور فیلکوش',
    '/mtproxy': 'زیرساخت — پروکسی تلگرام',
    '/mtproxy/add': 'زیرساخت — افزودن نود پروکسی',
    '/mtproxy/pools': 'زیرساخت — استخرهای پروکسی',
    '/mtproxy/sponsors': 'زیرساخت — اسپانسری پروکسی',
    '/mtproxy/events': 'زیرساخت — رویدادهای پروکسی',
    '/subscriptions': 'زیرساخت — اشتراک‌های فیلکوش',
    '/dns': 'زیرساخت — DNS فیلکوش',
    '/apps': 'زیرساخت — اپلیکیشن‌های فیلکوش',
    '/logs': 'زیرساخت — لاگ‌های فیلکوش',
    '/projects/nodes/new': 'ایجاد گره Canvas',
    '/projects/templates/review/new': 'افزودن قالب',
    '/projects/templates/review/featured': 'قالب‌های منتخب چت',
    '/projects/templates/review/[id]/edit': 'ویرایش قالب',
    '/projects/personas/new': 'افزودن کاربر نمایشی',
    '/projects/marketplace/tag-categories/new': 'افزودن دسته‌بندی تگ',
    '/projects/marketplace/tag-categories/featured': 'قالب‌های ویژهٔ دسته‌ها',
    '/blog/categories/new': 'دسته مقالات جدید',
    '/settings/changelog/new': 'نسخه جدید',
    '/settings/database': 'دیتابیس — داده‌ها',
    '/settings/database/backups': 'دیتابیس — بک‌آپ',
    '/settings/database/jobs': 'دیتابیس — لاگ‌ها',
    '/settings/database/docs': 'راهنمای دیتابیس و بک‌آپ',
    '/docs/new': 'صفحه مستندات و آموزش جدید',
    '/docs/categories/new': 'موضوع آموزش جدید',
    '/billing/discount-codes/add': 'افزودن کد تخفیف',
    '/billing/invoices/add': 'صدور فاکتور جدید',
    '/billing/invoices/credit': 'شارژ کیف پول',
    '/billing/manual-payments': 'واریز کارت‌به‌کارت',
    '/accounting/companies': 'شرکت‌ها',
    '/asset-management/assets': 'دارایی‌ها',
    '/asset-management/assets/[id]': 'شناسنامه دارایی',
    '/asset-management/categories': 'گروه‌های دارایی',
    '/asset-management/locations': 'محل‌های استقرار',
    '/accounting/fiscal-years': 'سال‌های مالی',
    '/accounting/accounts': 'کدینگ حساب‌ها',
    '/accounting/vouchers': 'اسناد حسابداری',
    '/accounting/vouchers/new': 'ثبت سند جدید',
    '/accounting/journal': 'دفتر روزنامه',
    '/accounting/ledger': 'دفتر کل',
    '/accounting/trial-balance': 'تراز آزمایشی',
    '/agent-chat/settings': 'تنظیمات Agent Chat',
    '/backgrounds': 'پس‌زمینه‌های بورد',
    '/backgrounds/new': 'افزودن والپیپر',
    '/video-tutorials': 'آموزش‌های ویدیویی',
    '/marketing/connections/add': 'اتصال جدید آنالیتیکس',
    '/e-commerce/products/add': 'افزودن محصول',
    '/subscription': 'اشتراک‌های کاربران',
    '/subscription/plans': 'پلن‌های اشتراک',
    '/subscription/matrix': 'مقادیر پلن‌ها',
    '/subscription/features': 'ویژگی‌های اشتراک',
    '/subscription/prices': 'قیمت‌های اشتراک',
    '/subscription/usage': 'مصرف اشتراک‌ها',
    '/subscription/usage-map': 'نقشه استفاده اشتراک در کد',
    '/subscription/renewals': 'تمدید خودکار اشتراک‌ها',
    '/subscription/plans/new': 'افزودن پلن اشتراک',
    '/subscription/features/new': 'افزودن ویژگی اشتراک',
    '/subscription/prices/new': 'افزودن قیمت اشتراک',
    '/subscription/docs': 'مستندات اشتراک',
    '/telegram-bots': 'سازنده بات تلگرام',
    '/marketing/automation/triggers': 'رویدادها و تریگرها',
    '/marketing/automation/patterns': 'پترن‌های پیامک',
    '/marketing/automation/workflows': 'سناریوها',
    '/marketing/automation/logs': 'لاگ ارسال‌ها',
    '/marketing/automation/analytics': 'گزارشات اتوماسیون',
    '/marketing/banners': 'مدیریت بنر',
    '/marketing/referral-code': 'کد معرف (دعوت دوستان)',
    '/marketing/referral-code/campaigns': 'کمپین‌های کد معرف',
    '/marketing/referral-code/campaigns/new': 'کمپین دعوت جدید',
    '/marketing/referral-code/campaigns/[id]/edit': 'ویرایش کمپین دعوت',
    '/marketing/referral-code/referrals': 'دعوت‌شدگان',
    '/marketing/referral-code/rewards': 'پاداش‌های دعوت',
    '/marketing/referral-code/audit-log': 'گزارش تغییرات کد معرف',
    '/marketing/banners/placements': 'جایگاه‌های بنر',
    '/marketing/banners/placements/new': 'جایگاه جدید بنر',
    '/marketing/banners/creatives': 'خلاقیت‌های بنر',
    '/marketing/banners/list': 'لیست بنرها',
    '/marketing/banners/analytics': 'آمار بنرها',
    '/marketing/sitemap': 'سایت‌مپ (SEO)',
    '/marketing/sitemap/groups': 'گروه‌های سایت‌مپ',
    '/marketing/sitemap/groups/new': 'گروه جدید سایت‌مپ',
    '/marketing/sitemap/groups/[id]/edit': 'ویرایش گروه سایت‌مپ',
    '/marketing/sitemap/rules': 'قوانین URL سایت‌مپ',
    '/marketing/sitemap/generation': 'تولید و فایل‌های سایت‌مپ',
    '/marketing/sitemap/validation': 'اعتبارسنجی سایت‌مپ',
    '/marketing/sitemap/indexnow': 'IndexNow',
    '/marketing/sitemap/robots': 'Robots.txt',
    '/marketing/sitemap/settings': 'تنظیمات سایت‌مپ',
    '/marketing/sitemap/guide': 'آموزش سایت‌مپ',
    '/campaigns': 'کمپین‌ها',
    '/campaigns/runs': 'اجراهای کمپین',
    '/files': 'مدیریت فایل',
    '/files/settings': 'تنظیمات فایل',
    '/files/storage-docs': 'راهنمای استوریج',
    '/marketing/partnership/payouts': 'تسویه حساب همکاران',
    '/marketing/partnership/partners': 'مدیریت همکاران',
    '/marketing/partnership/deals': 'کمپین‌ها و درخواست‌ها',
    '/marketing/partnership/settings': 'تنظیمات پورسانت',
    '/marketing/partnership/tracking': 'ردیابی و گزارشات',
    '/management/documents/explorer': 'مخزن اسناد',
    '/management/documents/workflows': 'کارتابل اسناد',
    '/management/documents/sharing': 'اشتراک‌گذاری اسناد',
    '/management/documents/audit': 'گزارش‌های اسناد',
    '/management/documents/archive': 'آرشیو و سطل زباله',
    '/management/documents/settings': 'تنظیمات اسناد',
    '/management/hr/employees': 'کارمندان',
    '/users/new-admin': 'افزودن کاربر',
    '/users/access-roles': 'نقش‌ها و دسترسی‌ها',
    '/users/access-roles/new': 'ایجاد نقش',
    '/verification': 'احراز هویت کاربران',
    '/verification/settings': 'تنظیمات پلتفرم احراز هویت',
    '/management/hr/departments': 'واحدهای سازمانی',
    '/management/hr/roles': 'سمت‌های سازمانی',
    '/management/mettings/scheduling': 'زمان‌بندی جلسات',
    '/management/mettings/notifications': 'پیامک جلسات',
    '/management/mettings/minutes': 'صورتجلسات',
    '/management/mettings/documents': 'اسناد جلسه',
    '/management/mettings/action-items': 'پیگیری مصوبات',
    '/support/requests': 'درخواست‌ها',
    '/support/categories': 'دسته‌بندی تیکت‌ها',
    '/support/categories/new': 'دسته‌بندی جدید',
    '/ai-settings': 'تنظیمات هوش مصنوعی',
};

const DYNAMIC_ROUTE_TITLES: Array<{ pattern: RegExp; title: string }> = [
    { pattern: /^\/zernio-keys\/(?!new$|settings$)[^/]+$/, title: 'ویرایش کلید' },
    { pattern: /^\/support\/categories\/(?!new$)[^/]+$/, title: 'ویرایش دسته‌بندی تیکت' },
    { pattern: /^\/asset-management\/assets\/[^/]+$/, title: 'شناسنامه دارایی' },
    { pattern: /^\/projects\/nodes\/(?!new$)[^/]+$/, title: 'ویرایش گره Canvas' },
    { pattern: /^\/projects\/templates\/review\/checklist$/, title: 'چک‌لیست بررسی قالب' },
    { pattern: /^\/projects\/templates\/review\/(?!new$|featured$|checklist$)[^/]+$/, title: 'بررسی قالب استودیو' },
    { pattern: /^\/projects\/marketplace\/categories\/[^/]+$/, title: 'ویرایش دسته' },
    { pattern: /^\/projects\/personas\/(?!new$)[^/]+$/, title: 'ویرایش کاربر نمایشی' },
    { pattern: /^\/projects\/marketplace\/tag-categories\/(?!new$|featured$)[^/]+$/, title: 'ویرایش دسته‌بندی تگ' },

    { pattern: /^\/settings\/changelog\/[^/]+$/, title: 'ویرایش نسخه' },
    { pattern: /^\/dictionary\/word\/[^/]+$/, title: 'ویرایش واژه' },
    { pattern: /^\/dictionary\/translation\/[^/]+$/, title: 'ویرایش ترجمه' },
    { pattern: /^\/blog\/[^/]+$/, title: 'ویرایش مقاله' },
    { pattern: /^\/docs\/[^/]+$/, title: 'ویرایش مستندات' },
    { pattern: /^\/docs\/categories\/[^/]+$/, title: 'ویرایش موضوع آموزش' },
    { pattern: /^\/users\/profile\/[^/]+$/, title: 'ویرایش پروفایل کاربر' },
    { pattern: /^\/verification\/[^/]+$/, title: 'جزئیات احراز هویت' },
    { pattern: /^\/accounting\/vouchers\/[^/]+$/, title: 'جزئیات سند' },
    { pattern: /^\/users\/access-roles\/(?!new$)[^/]+$/, title: 'ویرایش نقش' },
    { pattern: /^\/billing\/invoices\/[^/]+$/, title: 'جزئیات فاکتور' },
    { pattern: /^\/marketing\/connections\/[^/]+$/, title: 'ویرایش اتصال آنالیتیکس' },
    { pattern: /^\/marketing\/sitemap\/groups\/(?!new$)[^/]+\/edit$/, title: 'ویرایش گروه سایت‌مپ' },
    { pattern: /^\/error-tracking\/issues\/[^/]+$/, title: 'جزئیات مشکل' },
    { pattern: /^\/error-tracking\/integration$/, title: 'راهنمای اتصال' },
    { pattern: /^\/error-tracking\/docs(\/[^/]+)?$/, title: 'مستندات پایش خطا' },
    { pattern: /^\/subscription\/plans\/(?!new$)[^/]+$/, title: 'ویرایش پلن اشتراک' },
    { pattern: /^\/subscription\/features\/(?!new$)[^/]+$/, title: 'ویرایش ویژگی اشتراک' },
    { pattern: /^\/subscription\/prices\/(?!new$)[^/]+$/, title: 'ویرایش قیمت اشتراک' },
    { pattern: /^\/subscription\/docs\/[^/]+$/, title: 'مستندات اشتراک' },
    { pattern: /^\/e-commerce\/products\/(?!add$)[^/]+$/, title: 'ویرایش محصول' },
    { pattern: /^\/e-commerce\/orders\/[^/]+$/, title: 'جزئیات سفارش' },
];

function collectNavPaths(): Array<{ href: string; title: string }> {
    const paths: Array<{ href: string; title: string }> = [];

    navItems.forEach((item) => {
        paths.push({ href: item.href, title: item.title });
        item.subItems?.forEach((subItem) => {
            paths.push({ href: subItem.href, title: subItem.title });
        });
    });

    return paths.sort((a, b) => b.href.length - a.href.length);
}

const NAV_PATHS = collectNavPaths();

export function getPageTitleFromPath(pathname: string): string {
    if (!pathname || pathname === '/') {
        return 'پنل مدیریت';
    }

    if (PAGE_TITLE_OVERRIDES[pathname]) {
        return PAGE_TITLE_OVERRIDES[pathname];
    }

    const exactMatch = NAV_PATHS.find((entry) => entry.href === pathname);
    if (exactMatch) {
        return exactMatch.title;
    }

    for (const route of DYNAMIC_ROUTE_TITLES) {
        if (route.pattern.test(pathname)) {
            return route.title;
        }
    }

    const prefixMatch = NAV_PATHS.find((entry) => pathname.startsWith(`${entry.href}/`));
    if (prefixMatch) {
        return prefixMatch.title;
    }

    return 'پنل مدیریت';
}
