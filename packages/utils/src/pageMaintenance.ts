/**
 * حالت «در حال بروزرسانی» برای صفحه‌های جداگانه — مشترک بین پنل ادمین (naslyar) و همه‌ی اپ‌ها.
 *
 * داده در system-setting با کلید PAGE_MAINTENANCE_KEY ذخیره می‌شود (هر اپ دیتابیس خودش را دارد)،
 * پس فهرست صفحه‌ها برای هر اپ جداگانه از پنل اضافه/حذف می‌شود و هیچ صفحه‌ای در کد ثابت نیست.
 * اپ‌ها مقدار را از GET /api/system-setting/public/website (فیلد pageMaintenance) می‌خوانند و
 * با findPageMaintenanceRule مسیر فعلی را با قوانین فعال تطبیق می‌دهند.
 */

export const PAGE_MAINTENANCE_KEY = 'website.page_maintenance';

export interface PageMaintenanceRule {
    id: string;
    /** نام داخلی برای ادمین (مثلاً «اکسپلور») — به کاربر نشان داده نمی‌شود */
    label: string;
    /**
     * الگوهای مسیر. هر الگو خودش و زیرمسیرهایش را می‌گیرد:
     *   /explore               → /explore و /explore/...
     *   /projects/{*}/workflow → «*» یعنی یک بخش دلخواه (مثلاً شناسه‌ی پروژه)
     *   «**» یعنی هر تعداد بخش
     * (در الگوی بالا {*} همان * است؛ آکولاد فقط برای اینکه کامنت بسته نشود)
     */
    paths: string[];
    enabled: boolean;
    /** عنوان سفارشی — خالی یعنی عنوان پیش‌فرض (ترجمه‌شده در خود اپ) */
    title?: string;
    /** متن سفارشی — خالی یعنی متن پیش‌فرض */
    content?: string;
}

function normalizePath(path: string): string {
    const clean = path.trim().split(/[?#]/)[0].replace(/\/+$/, '');
    if (!clean) return '/';
    return clean.startsWith('/') ? clean : `/${clean}`;
}

function patternToRegExp(pattern: string): RegExp {
    const normalized = normalizePath(pattern);
    if (normalized === '/') return /^\/$/;
    const source = normalized
        .split('/')
        .map((segment) => {
            if (segment === '**') return '.*';
            return segment
                .split('*')
                .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
                .join('[^/]*');
        })
        .join('/');
    return new RegExp(`^${source}(?:/.*)?$`, 'i');
}

export function matchesPagePath(pathname: string, pattern: string): boolean {
    if (!pattern?.trim()) return false;
    return patternToRegExp(pattern).test(normalizePath(pathname));
}

/** اولین قانون فعالی که مسیر فعلی را پوشش می‌دهد (یا null) */
export function findPageMaintenanceRule(
    pathname: string | null | undefined,
    rules: PageMaintenanceRule[] | null | undefined,
): PageMaintenanceRule | null {
    if (!pathname || !Array.isArray(rules)) return null;
    return rules.find((rule) => rule?.enabled && (rule.paths || []).some((p) => matchesPagePath(pathname, p))) || null;
}

/** پاک‌سازی ورودی خام (از دیتابیس یا فرم) به شکل استاندارد */
export function normalizePageMaintenanceRules(value: unknown): PageMaintenanceRule[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((row): row is Partial<PageMaintenanceRule> => Boolean(row) && typeof row === 'object')
        .map((row, index) => ({
            id: String(row.id || `page-${index + 1}`),
            label: String(row.label || ''),
            paths: (Array.isArray(row.paths) ? row.paths : [])
                .map((p) => String(p || '').trim())
                .filter(Boolean),
            enabled: Boolean(row.enabled),
            title: String(row.title || ''),
            content: String(row.content || ''),
        }));
}
