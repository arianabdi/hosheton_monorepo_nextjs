'use client';

import { create } from 'zustand';

interface DirectMessagesState {
    /** مجموع پیام‌های خوانده‌نشدهٔ همهٔ گفتگوها */
    unreadTotal: number;
    setUnreadTotal: (count: number) => void;
}

/**
 * شمارندهٔ پیام‌های خوانده‌نشده — از `useDirectMessagesRealtime` (REST اولیه + رویداد `dm:unread`)
 * پر می‌شود؛ نقطهٔ قرمز آواتار، نشان «پیام‌ها» در منوی پروفایل و صفحهٔ پیام‌ها از همین می‌خوانند.
 */
export const useDirectMessagesStore = create<DirectMessagesState>()((set) => ({
    unreadTotal: 0,
    setUnreadTotal: (count) => set({ unreadTotal: Math.max(0, Number(count) || 0) }),
}));
