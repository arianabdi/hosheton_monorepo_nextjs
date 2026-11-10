'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useDirectMessagesStore } from '@/app/zustand/store/useDirectMessagesStore';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { acquireStudioSocket } from '../(developers)/projects/lib/createStudioSocket';

/**
 * شمارندهٔ پیام‌های خوانده‌نشده را زنده نگه می‌دارد:
 * - REST اولیه و دوباره با برگشت به تب؛
 * - رویداد `dm:unread` از سوکت مشترک استودیو (اتاق user:<id> در handshake join می‌شود).
 */
export function useDirectMessagesRealtime(enabled = true): void {
    const token = useAuthStore((s) => s.token);

    useEffect(() => {
        const { setUnreadTotal } = useDirectMessagesStore.getState();
        if (!token || !enabled) {
            if (!token) setUnreadTotal(0);
            return;
        }

        const refresh = () => {
            marketplaceApi.getMessageUnreadCount()
                .then((data) => setUnreadTotal(data.count ?? 0))
                .catch(() => undefined);
        };
        refresh();

        const handle = acquireStudioSocket(token);
        const onUnread = (payload: { count?: number }) => setUnreadTotal(payload?.count ?? 0);
        handle?.socket.on('dm:unread', onUnread);
        // بعد از قطع و وصل، رویدادهای از دست رفته را با یک REST جبران کن
        handle?.socket.io.on('reconnect', refresh);

        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            handle?.socket.off('dm:unread', onUnread);
            handle?.socket.io.off('reconnect', refresh);
            handle?.release();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [token, enabled]);
}
