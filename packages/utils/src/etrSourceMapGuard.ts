/**
 * محافظ فایل‌های source map برای پایش خطا (ETR) — در proxy.ts هر اپ Next:
 *
 *   import { etrSourceMapGuard } from '@my-workspace/utils/src/etrSourceMapGuard';
 *   export function proxy(request: NextRequest) {
 *       const sourceMap = etrSourceMapGuard(request);
 *       if (sourceMap) return sourceMap;
 *       …
 *   }
 *   export const config = { matcher: ['/_next/static/:path*.map', …] };  // literal — Next matcher را ایستا می‌خواند
 *
 * و در next.config: `productionBrowserSourceMaps: true`.
 *
 * سرور پایش خطا فایل .map را با هدر x-etr-sourcemap-token (توکن پروژه در پنل) می‌خواند و Stack Trace
 * مرورگر را به فایل/خط اصلی برمی‌گرداند؛ هیچ‌کس دیگری به سورس دسترسی ندارد.
 * - ETR_SOURCEMAP_TOKEN (env سرور اپ، نه NEXT_PUBLIC) = همان توکن پروژه.
 * - production بدون توکن: همهٔ .map ها بسته‌اند. dev: باز (رفتار عادی Next).
 *
 * عمداً بدون import از next/react — در runtime پروکسی سبک بماند.
 */

/** matcher پروکسی فقط برای فایل‌های .map در _next/static (بقیهٔ فایل‌های static از پروکسی رد نمی‌شوند) */
export const ETR_SOURCEMAP_MATCHER = '/_next/static/:path*.map';

export const ETR_SOURCEMAP_HEADER = 'x-etr-sourcemap-token';

/** null = به این درخواست کاری ندارد (ادامهٔ پروکسی)؛ Response = همین را برگردان */
export function etrSourceMapGuard(request: { nextUrl?: { pathname: string }; url: string; headers: Headers }): Response | null {
    const pathname = request.nextUrl?.pathname ?? new URL(request.url).pathname;
    if (!pathname.endsWith('.map')) return null;

    const expected = process.env.ETR_SOURCEMAP_TOKEN || '';
    if (!expected) {
        // dev: source map باز است؛ production بدون توکن: بسته
        return process.env.NODE_ENV === 'production' ? notFound() : null;
    }
    return safeEqual(request.headers.get(ETR_SOURCEMAP_HEADER) || '', expected) ? null : notFound();
}

function notFound(): Response {
    return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
}

/** مقایسه با زمان ثابت (بدون نشت طول/پیشوند توکن از راه زمان پاسخ) */
function safeEqual(a: string, b: string): boolean {
    let diff = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return diff === 0;
}
