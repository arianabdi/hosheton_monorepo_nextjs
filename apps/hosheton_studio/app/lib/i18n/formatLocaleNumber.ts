import { toFarsiNumber } from '@my-workspace/utils';
import { isRtlLanguage, type AppLanguage } from './config';

export function formatAppNumber(value: unknown, lang: string): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return isRtlLanguage(lang) ? String(toFarsiNumber(text)) : text;
}

export function formatAppDate(value: string | number | Date | undefined, lang: string): string {
    if (!value) return '—';
    try {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        const locale = isRtlLanguage(lang) ? (lang === 'ar' ? 'ar' : 'fa-IR') : lang;
        return date.toLocaleString(locale);
    } catch {
        return String(value);
    }
}

export function appNumberLocale(lang: AppLanguage | string): string {
    return isRtlLanguage(lang) ? (lang === 'ar' ? 'ar' : 'fa') : 'en';
}

/** عدد با جداکننده هزارگان بر اساس زبان (۱٬۲۳۴٬۵۶۷ در فارسی، 1,234,567 در بقیه) */
export function formatAppAmount(value: unknown, lang: string): string {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    try {
        return new Intl.NumberFormat(appNumberLocale(lang)).format(num);
    } catch {
        return String(num);
    }
}
