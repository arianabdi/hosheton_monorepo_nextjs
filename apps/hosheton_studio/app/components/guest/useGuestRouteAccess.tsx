'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { isGuestBrowsablePath, isGuestCreatePath, promptGuestLogin } from './guestAccess';

/**
 * وضعیت دسترسی صفحه‌ی فعلی: در حال بررسی نشست، مهمان، یا مسدود برای مهمان
 * (جای محتوا پنل ورود می‌آید — دیگر redirect به explore نیست).
 */
export function useGuestRouteAccess(pathname: string | null) {
    const { token, isLoading, isVerifying } = useAuthStore();
    const checking = isLoading || isVerifying;
    const isGuest = !checking && !token;
    const blocked = isGuest && !isGuestBrowsablePath(pathname);

    // مهمان مستقیم وارد صفحه‌ی ساختن شد (مثلاً دکمه‌ی «پروژه جدید»): پنجره‌ی ورود هم باز شود
    useEffect(() => {
        if (isGuest && isGuestCreatePath(pathname)) promptGuestLogin(pathname || undefined);
    }, [isGuest, pathname]);

    // لینک مسیرهای ساختن برای مهمان: به‌جای رفتن به صفحه، همین‌جا پنجره‌ی ورود
    useEffect(() => {
        if (!isGuest) return;
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
            const anchor = (event.target as Element | null)?.closest?.('a[href]');
            if (!anchor) return;
            const href = anchor.getAttribute('href') || '';
            if (!href.startsWith('/') || !isGuestCreatePath(href)) return;
            event.preventDefault();
            event.stopPropagation();
            promptGuestLogin(href);
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, [isGuest]);

    return { checking, isGuest, blocked };
}

/** همان لودر قبلی ProtectedRoute تا نشست بررسی شود */
export function AuthCheckingScreen() {
    const { t } = useTranslation('common');
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">{t('checking_auth')}</p>
            </div>
        </div>
    );
}
