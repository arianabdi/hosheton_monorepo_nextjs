/**
 * چت باز هر محدوده (شخصی / هر پروژه) — تا بعد از رفرش همان چت دوباره باز شود.
 * سرور فقط «پیش‌نویس باز یا آخرین چت» را می‌دهد؛ این کلید انتخاب کاربر را نگه می‌دارد.
 */

const STORAGE_PREFIX = 'studio_last_chat:';

function storageKey(scopeId: string) {
    return `${STORAGE_PREFIX}${scopeId}`;
}

export function readLastOpenChat(scopeId: string): string {
    if (typeof window === 'undefined' || !scopeId) return '';
    try {
        return window.localStorage.getItem(storageKey(scopeId)) || '';
    } catch {
        return '';
    }
}

export function writeLastOpenChat(scopeId: string, chatId: string) {
    if (typeof window === 'undefined' || !scopeId) return;
    try {
        if (chatId) window.localStorage.setItem(storageKey(scopeId), chatId);
        else window.localStorage.removeItem(storageKey(scopeId));
    } catch {
        /* storage unavailable */
    }
}
