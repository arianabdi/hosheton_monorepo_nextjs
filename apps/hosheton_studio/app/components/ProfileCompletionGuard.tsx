'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { needsProfileCompletion } from '@/app/(auth)/lib/needs-profile-completion';

export function ProfileCompletionGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const token = useAuthStore((state) => state.token);
    const { fullname, email } = useAppStore();

    useEffect(() => {
        if (!token) return;
        if (pathname === '/complete-profile') return;

        if (needsProfileCompletion({ fullname, email })) {
            router.replace('/complete-profile');
        }
    }, [token, fullname, email, pathname, router]);

    return <>{children}</>;
}
