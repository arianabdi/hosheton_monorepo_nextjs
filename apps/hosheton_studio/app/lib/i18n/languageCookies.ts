import {DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage} from './config';

export const APP_STORAGE_KEY = 'app-storage';
export const CHOSEN_LANG_COOKIE = 'hosheton-lang';
export const GEO_LANG_COOKIE = 'hosheton-geo-lang';
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function languageFromCookies(get: (name: string) => string | undefined): AppLanguage {
    const chosen = get(CHOSEN_LANG_COOKIE);
    if (chosen && isAppLanguage(chosen)) return chosen;
    // زبان پیش‌فرض پلتفرم همیشه فارسی است؛ تشخیص جغرافیایی زبان حذف شده است.
    return DEFAULT_LANGUAGE;
}

export function readBrowserCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const escaped = name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
}

export function writeBrowserCookie(name: string, value: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function persistChosenLanguageCookie(lang: AppLanguage) {
    writeBrowserCookie(CHOSEN_LANG_COOKIE, lang);
}

export function persistGeoLanguageCookie(lang: AppLanguage) {
    writeBrowserCookie(GEO_LANG_COOKIE, lang);
}
