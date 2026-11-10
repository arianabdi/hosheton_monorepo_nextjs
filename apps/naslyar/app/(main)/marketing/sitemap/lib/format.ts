/** قالب‌بندی‌های مشترک صفحات سایت‌مپ (اعداد و تاریخ فارسی) */

const numberFormat = new Intl.NumberFormat('fa-IR');
const dateFormat = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' });

export function formatNumber(value: number): string {
    return numberFormat.format(value);
}

export function formatDate(iso?: string | null, empty = '—'): string {
    if (!iso) return empty;
    const date = new Date(iso);
    return isNaN(date.getTime()) ? empty : dateFormat.format(date);
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${formatNumber(bytes)} بایت`;
    if (bytes < 1024 * 1024) return `${formatNumber(Math.round(bytes / 1024))} کیلوبایت`;
    return `${formatNumber(Number((bytes / (1024 * 1024)).toFixed(1)))} مگابایت`;
}

export function formatDuration(ms: number): string {
    return ms < 1000 ? `${formatNumber(ms)} میلی‌ثانیه` : `${formatNumber(Number((ms / 1000).toFixed(1)))} ثانیه`;
}

export function relativeTime(iso?: string | null): string {
    if (!iso) return 'هرگز';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60 * 60 * 1000) return `${formatNumber(Math.max(1, Math.round(diff / 60000)))} دقیقه پیش`;
    if (diff < 24 * 60 * 60 * 1000) return `${formatNumber(Math.round(diff / (60 * 60 * 1000)))} ساعت پیش`;
    return `${formatNumber(Math.round(diff / (24 * 60 * 60 * 1000)))} روز پیش`;
}

/** آدرس عمومی روی دامنه سایت (siteUrl ذخیره‌شده + مسیر ثابت) */
export function siteLink(siteUrl: string, path: string): string {
    return `${(siteUrl || '').replace(/\/+$/, '')}${path}`;
}
