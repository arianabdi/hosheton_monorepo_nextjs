/**
 * پروکسی فایل‌های SEO از ماژول سایت‌مپ API (کنترل کامل از پنل naslyar → مارکتینگ → سایت‌مپ).
 * مسیرهای عمومی با rewrites در next.config.ts به route handlerهای همین پوشه می‌رسند:
 *   /sitemap.xml      → /seo-files/index
 *   /sitemaps/:name   → /seo-files/files/:name
 *   /robots.txt       → /seo-files/rules
 *   /:key.txt         → /seo-files/indexnow/:key   (فایل تایید کلید IndexNow)
 */

const SITEMAP_API = `${(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '')}/api/marketing/sitemap`;
const UPSTREAM_TIMEOUT_MS = 10_000;

export function getSiteUrl(): string {
    return (process.env.NEXT_PUBLIC_URL || 'http://localhost:3001').replace(/\/+$/, '');
}

/** نتیجه درخواست به API: پاسخ موفق، 404 واقعی (غیرفعال/ناموجود) یا قطعی موقت */
export type UpstreamResult = { kind: 'ok'; res: Response } | { kind: 'not-found' } | { kind: 'unavailable' };

export async function fetchUpstream(path: string): Promise<UpstreamResult> {
    if (!process.env.NEXT_PUBLIC_API_URL) return { kind: 'unavailable' };
    try {
        const res = await fetch(`${SITEMAP_API}${path}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        if (res.ok) return { kind: 'ok', res };
        return res.status === 404 ? { kind: 'not-found' } : { kind: 'unavailable' };
    } catch {
        return { kind: 'unavailable' };
    }
}

/** کش CDN/مرورگر — همان TTL پیش‌فرض کش API (یک ساعت) */
export const XML_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600';

export function xmlResponse(body: string, lastModified?: string | null): Response {
    const headers: Record<string, string> = {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': XML_CACHE_CONTROL,
        // خود فایل‌های سایت‌مپ نباید در نتایج جستجو بیایند
        'X-Robots-Tag': 'noindex',
    };
    if (lastModified) headers['Last-Modified'] = lastModified;
    return new Response(body, { status: 200, headers });
}

export function notFound(): Response {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

/**
 * قطعی موقت API: 503 + Retry-After تا کرولر بعداً دوباره بیاید —
 * سرو یک سایت‌مپ ناقص جایگزین، سیگنال اشتباه «حذف صفحات» می‌دهد.
 */
export function unavailable(): Response {
    return new Response('Sitemap temporarily unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600', 'Cache-Control': 'no-store' },
    });
}
