'use client';

import { useLoginModalStore } from '@/app/zustand/store/useLoginModalStore';

/**
 * دسترسی مهمان (کاربر واردنشده) به بخش‌های استودیو.
 *
 * - صفحه‌های «قابل گشت‌وگذار» برای مهمان همان صفحه‌ی واقعی را نشان می‌دهند (بدون فراخوانی API حساب).
 * - بقیه‌ی صفحه‌ها (حساب کاربری، صفحه‌های سازنده/creator) داخل همان قاب برنامه یک پنل «ورود» نشان می‌دهند
 *   و دیگر به explore پرتاب نمی‌شوند.
 * - ساختن هر چیز (لینک مسیرهای ساخت، یا هر درخواست نوشتنی API) پنجره‌ی ورود را باز می‌کند.
 */
const GUEST_BROWSABLE_PATHS = new Set([
    '/starter',
    '/projects',
    '/assets',
    '/ai-model-pricing',
    // چت کامل دیده می‌شود و فقط «ارسال» پنجره‌ی ورود را باز می‌کند
    '/chat',
    '/templates',
    '/support',
]);

/** مسیرهای «ساختن» — کلیک مهمان روی لینکشان به‌جای رفتن، پنجره‌ی ورود را باز می‌کند */
const GUEST_CREATE_PATHS = [/^\/projects\/new(\/|$)/, /^\/templates\/new(\/|$)/, /^\/avatars\/new(\/|$)/, /^\/support\/tickets\/new(\/|$)/];

function normalizePath(pathname: string | null | undefined) {
    const path = String(pathname || '').split(/[?#]/)[0].replace(/\/+$/, '');
    return path || '/';
}

export function isGuestBrowsablePath(pathname: string | null | undefined) {
    return GUEST_BROWSABLE_PATHS.has(normalizePath(pathname));
}

export function isGuestCreatePath(pathname: string | null | undefined) {
    const path = normalizePath(pathname);
    return GUEST_CREATE_PATHS.some((pattern) => pattern.test(path));
}

/** خطای «مهمان خواست چیزی بسازد» — پنجره‌ی ورود باز شده و هیچ toast خطایی لازم نیست */
export class GuestActionBlockedError extends Error {
    readonly guestBlocked = true;

    constructor() {
        super('guest_action_blocked');
        this.name = 'GuestActionBlockedError';
    }
}

export function isGuestActionBlocked(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && (error as { guestBlocked?: boolean }).guestBlocked);
}

/** مهمان کاری نوشتنی خواست: پنجره‌ی ورود با بازگشت به همین صفحه */
export function promptGuestLogin(returnTo?: string) {
    const fallback = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : undefined;
    useLoginModalStore.getState().openLoginModal(returnTo || fallback);
}
