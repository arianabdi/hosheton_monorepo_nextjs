import { isStorageMediaUrl } from '@/app/lib/media-storage-hosts';

/** نام فایل: برچسب رسانه (با پسوند آدرس) یا نام فایل خود آدرس */
function downloadFileName(url: string, label?: string): string {
    let urlName = '';
    try {
        urlName = decodeURIComponent(new URL(url, window.location.href).pathname.split('/').pop() || '');
    } catch {
        urlName = '';
    }
    const ext = urlName.match(/\.[a-z0-9]{2,5}$/i)?.[0] || '';
    const base = (label || '').trim();
    if (!base) return urlName || 'studio-media';
    return /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base}${ext}`;
}

function clickDownloadLink(href: string, filename: string) {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

/** آدرسی که download attr رویش کار می‌کند: هم‌دامنه، blob: یا data: */
function isDirectlyDownloadable(url: string): boolean {
    try {
        const parsed = new URL(url, window.location.href);
        return parsed.origin === window.location.origin || parsed.protocol === 'blob:' || parsed.protocol === 'data:';
    } catch {
        return false;
    }
}

/** میزبان ناشناخته: اگر CORS باز است blob بگیر؛ وگرنه آخرین راه باز کردن فایل در تب تازه */
async function downloadViaBlob(url: string, filename: string) {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blobUrl = URL.createObjectURL(await response.blob());
        clickDownloadLink(blobUrl, filename);
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

/**
 * دانلود رسانه در سایز اصلی — مستقیم در دانلودهای مرورگر، بدون باز کردن فایل.
 * فایل‌های استوریج cross-origin هستند و مرورگر download attr را برایشان نادیده می‌گیرد،
 * پس از route هم‌دامنه /api/media-download (با Content-Disposition: attachment) گرفته می‌شوند.
 */
export function downloadOriginalMedia(url: string, filename?: string) {
    if (!url) return;
    const name = downloadFileName(url, filename);
    if (isStorageMediaUrl(url)) {
        clickDownloadLink(`/api/media-download?${new URLSearchParams({ url, name })}`, name);
        return;
    }
    if (isDirectlyDownloadable(url)) {
        clickDownloadLink(url, name);
        return;
    }
    void downloadViaBlob(url, name);
}
