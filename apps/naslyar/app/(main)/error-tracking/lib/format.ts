import { toFarsiNumber } from '@my-workspace/utils';

/** 'latn' = ارقام انگلیسی (جدول مشکلات)، پیش‌فرض ارقام فارسی */
type Digits = 'fa' | 'latn';

const withDigits = (text: string, digits: Digits) => (digits === 'latn' ? text : toFarsiNumber(text));
const dateLocale = (digits: Digits) => (digits === 'latn' ? 'fa-IR-u-nu-latn' : 'fa-IR');

export function formatCount(value: number | null | undefined, digits: Digits = 'fa'): string {
    return withDigits(Number(value || 0).toLocaleString('en-US'), digits);
}

/** تاریخ و ساعت کامل شمسی — برای title کنار زمان نسبی */
export function fullDate(iso: string | null | undefined, digits: Digits = 'fa'): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(dateLocale(digits), { dateStyle: 'medium', timeStyle: 'short' });
}

/** «۵ دقیقه پیش» / «۳ ساعت پیش» / «۲ روز پیش»؛ قدیمی‌تر از ۳۰ روز = تاریخ شمسی */
export function relativeTime(iso: string | null | undefined, digits: Digits = 'fa'): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '—';
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'همین الان';
    if (minutes < 60) return `${withDigits(String(minutes), digits)} دقیقه پیش`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${withDigits(String(hours), digits)} ساعت پیش`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${withDigits(String(days), digits)} روز پیش`;
    return new Date(iso).toLocaleDateString(dateLocale(digits), { dateStyle: 'medium' });
}
