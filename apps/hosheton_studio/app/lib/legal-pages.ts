/**
 * صفحه‌های حقوقی (قوانین، حریم خصوصی) = پست‌های قفل‌شدهٔ بلاگ با کلید ثابت
 * (naslyar > محتوا > بلاگ؛ حذف نمی‌شوند). صفحه: `app/(blog)/legal/[key]`.
 * آدرس‌های قدیمی `/terms` و `/privacy` در next.config به این‌ها ریدایرکت دائمی می‌شوند.
 */
export const LEGAL_BASE_PATH = '/legal';
export const LEGAL_KEYS = ['terms', 'privacy'] as const;
export type LegalKey = (typeof LEGAL_KEYS)[number];

export function legalHref(key: LegalKey): string {
    return `${LEGAL_BASE_PATH}/${key}`;
}

/** لینک‌های صفحه‌های auth در تب جدید باز می‌شوند تا فرم ورود از دست نرود */
export function openLegalPageInNewTab(key: LegalKey) {
    window.open(legalHref(key), '_blank', 'noopener,noreferrer');
}
