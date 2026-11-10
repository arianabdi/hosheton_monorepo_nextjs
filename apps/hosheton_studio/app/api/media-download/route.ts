import {NextRequest} from 'next/server';
import {isStorageMediaUrl} from '@/app/lib/media-storage-hosts';

export const dynamic = 'force-dynamic';

/** نام امن برای هدر — بدون کاراکترهای کنترلی و جداکننده مسیر */
function safeFileName(name: string | null): string {
    const cleaned = (name || '').replace(/[\u0000-\u001f\u007f"\\/:*?<>|]+/g, '_').trim().slice(0, 180);
    return cleaned || 'studio-media';
}

/** نسخه ASCII برای مرورگرهای قدیمی + filename* برای نام فارسی */
function contentDisposition(name: string): string {
    const ascii = name.replace(/[^\x20-\x7e]+/g, '_');
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * دانلود مستقیم رسانه — فایل استوریج cross-origin است و مرورگر download attr را برایش
 * نادیده می‌گیرد؛ اینجا با Content-Disposition: attachment پخش (stream) می‌شود تا مرورگر
 * همان لحظه آن را در دانلودها بگذارد، نه اینکه فایل را باز کند.
 */
export async function GET(request: NextRequest) {
    const source = request.nextUrl.searchParams.get('url') || '';
    if (!isStorageMediaUrl(source)) {
        return new Response('Unsupported media URL', {status: 400});
    }

    // redirect: 'error' — استوریج مجاز نباید ما را به میزبان دیگری (شبکه داخلی) بفرستد
    const upstream = await fetch(source, {cache: 'no-store', redirect: 'error'}).catch(() => null);
    if (!upstream?.ok || !upstream.body) {
        return new Response('Media not available', {status: 502});
    }

    const headers = new Headers({
        'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': contentDisposition(safeFileName(request.nextUrl.searchParams.get('name'))),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    const length = upstream.headers.get('content-length');
    if (length) headers.set('Content-Length', length);

    return new Response(upstream.body, {headers});
}
