'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';

export default function SettingsToCreatorRedirect({ tab }: { tab: string }) {
    const router = useRouter();
    const { token, user } = useAuthStore();
    const userId = useAppStore((state) => state.userId) || user?.id || '';

    useEffect(() => {
        if (!token) {
            router.replace('/login');
            return;
        }
        if (!userId) return;
        router.replace(`/creators/${userId}?tab=${tab}`);
    }, [token, userId, router, tab]);

    return null;
}
