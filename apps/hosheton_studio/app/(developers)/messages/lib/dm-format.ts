import { isRtlLanguage } from '@/app/lib/i18n/config';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** fa-IR تقویم شمسی و ارقام فارسی می‌دهد؛ عربی با ar */
export function dateLocale(lang: string): string {
    if (isRtlLanguage(lang)) return lang === 'ar' ? 'ar' : 'fa-IR';
    return lang;
}

function toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysAgo(date: Date): number {
    return Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
}

export function formatClock(value: string | Date | null | undefined, lang: string): string {
    const date = toDate(value);
    if (!date) return '';
    return new Intl.DateTimeFormat(dateLocale(lang), { hour: '2-digit', minute: '2-digit' }).format(date);
}

/** زمان کوتاه ردیف فهرست: امروز ساعت، دیروز، این هفته نام روز، قدیمی‌تر تاریخ */
export function formatListTime(value: string | Date | null | undefined, lang: string, t: Translate): string {
    const date = toDate(value);
    if (!date) return '';
    const diff = daysAgo(date);
    if (diff <= 0) return formatClock(date, lang);
    if (diff === 1) return t('yesterday');
    if (diff < 7) return new Intl.DateTimeFormat(dateLocale(lang), { weekday: 'short' }).format(date);
    return new Intl.DateTimeFormat(dateLocale(lang), { month: 'short', day: 'numeric' }).format(date);
}

/** برچسب جداکنندهٔ روز داخل گفتگو */
export function formatDayLabel(value: string | Date, lang: string, t: Translate): string {
    const date = toDate(value);
    if (!date) return '';
    const diff = daysAgo(date);
    if (diff <= 0) return t('today');
    if (diff === 1) return t('yesterday');
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return new Intl.DateTimeFormat(dateLocale(lang), {
        weekday: diff < 7 ? 'long' : undefined,
        month: 'long',
        day: 'numeric',
        year: sameYear ? undefined : 'numeric',
    }).format(date);
}

/** «آخرین بازدید»: امروز → ساعت، بقیه → روز + ساعت */
export function formatLastSeen(value: string | null | undefined, lang: string, t: Translate): string {
    const date = toDate(value);
    if (!date) return '';
    const diff = daysAgo(date);
    const clock = formatClock(date, lang);
    if (diff <= 0) return clock;
    return `${formatListTime(date, lang, t)} ${clock}`;
}

export function dayKey(value: string | Date): string {
    const date = toDate(value);
    return date ? String(startOfDay(date)) : '';
}

/** حجم فایل: ۸۵۰ KB، ۱٫۲ MB */
export function formatBytes(bytes: number, lang: string): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    const number = new Intl.NumberFormat(dateLocale(lang), { maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0 }).format(value);
    return `${number} ${units[unit]}`;
}

/** پسوند فایل برای نشان کنار نام (PDF، ZIP) */
export function fileExtension(name: string): string {
    const match = /\.([a-z0-9]{1,6})$/i.exec(name || '');
    return match ? match[1].toUpperCase() : '';
}

const URL_PATTERN =/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"»])/gi;

/** متن پیام را به تکه‌های متن/لینک می‌شکند (لینک‌ها در حباب قابل کلیک باشند) */
export function splitLinks(text: string): Array<{ type: 'text' | 'link'; value: string }> {
    const parts: Array<{ type: 'text' | 'link'; value: string }> = [];
    let last = 0;
    for (const match of text.matchAll(URL_PATTERN)) {
        const index = match.index ?? 0;
        if (index > last) parts.push({ type: 'text', value: text.slice(last, index) });
        parts.push({ type: 'link', value: match[0] });
        last = index + match[0].length;
    }
    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
    return parts;
}
