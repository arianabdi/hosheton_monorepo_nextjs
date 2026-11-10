'use client';

// راه‌انداز پایش خطا — مستندات: ERROR_TRACKING.md در ریشه همین اپ
import { useEffect } from 'react';
import { etr, initErrorTracking } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';

export default function EtrInit() {
    const user = useAuthStore((s) => s.user);
    const username = useAppStore((s) => s.username);
    const email = useAppStore((s) => s.email);
    const fullname = useAppStore((s) => s.fullname);

    useEffect(() => {
        initErrorTracking({
            baseUrl: process.env.NEXT_PUBLIC_ETR_URL || process.env.NEXT_PUBLIC_API_URL,
            publicKey: process.env.NEXT_PUBLIC_ETR_KEY,
            environment: process.env.NODE_ENV,
            appName: process.env.NEXT_PUBLIC_ETR_APP_NAME || 'hosheton-studio-web',
        });
    }, []);

    // اطلاعات کاربر به همه رویدادهای بعدی ضمیمه می‌شود (ستون «کاربران متأثر» پنل)
    useEffect(() => {
        etr.setUser({
            id: user?.id,
            email: email || user?.email,
            username: fullname || username || user?.name,
        });
    }, [user, username, email, fullname]);

    return null;
}
