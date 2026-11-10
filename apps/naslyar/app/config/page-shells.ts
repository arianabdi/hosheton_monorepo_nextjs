/**
 * ماژول‌هایی که تب‌هایشان (هر تب یک مسیر) داخل outlet یک layout مشترک عوض می‌شوند.
 * PageTransition کل زیرشاخه هر کدام را یک کلید انیمیشن می‌داند تا با جابه‌جایی تب،
 * layout (هدر، تب‌ها، داده مشترک) ری‌مانت نشود و فقط محتوای تب عوض شود.
 */
export const PERSISTENT_SHELL_BASES = ['/marketing/sitemap', '/marketing/referral-code', '/error-tracking', '/subscription', '/settings/database'];

export function pageTransitionKey(pathname: string): string {
    return PERSISTENT_SHELL_BASES.find((base) => pathname === base || pathname.startsWith(`${base}/`)) ?? pathname;
}
