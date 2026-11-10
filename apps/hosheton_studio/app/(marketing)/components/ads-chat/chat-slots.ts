'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * جایگاه‌های بالای سایدبار چت (layout) — صفحه‌ی ads-2video نوار پروژه و کارت
 * برند کیت را با createPortal همین‌جا رندر می‌کند تا ستون اصلی فقط روی
 * پیش‌نمایش و کات‌ها متمرکز بماند، در حالی که state پروژه در خود صفحه می‌ماند.
 */
export const ADS_CHAT_HEADER_SLOT_ID = 'ads2-chat-header-slot';
export const ADS_CHAT_TOP_SLOT_ID = 'ads2-chat-top-slot';

/** المان یک جایگاه — تا وقتی سایدبار mount نشده null است و بعد خودش پیدا می‌شود */
export function useDomSlot(id: string): HTMLElement | null {
    const subscribe = useCallback((notify: () => void) => {
        const observer = new MutationObserver(notify);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);
    return useSyncExternalStore(
        subscribe,
        () => document.getElementById(id),
        () => null,
    );
}
