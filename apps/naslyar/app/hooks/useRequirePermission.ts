'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { navItems } from '@/app/config/navigation';
import { getPermissionKeyForPath, hasPermission } from '@/app/config/permission-catalog';
import { useAuthStore } from '@/app/zustand/store/authStore';

export function useRequirePermission() {
    const pathname = usePathname();
    const router = useRouter();
    const permissions = useAuthStore((s) => s.permissions);
    const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
    const isLoading = useAuthStore((s) => s.isLoading);

    useEffect(() => {
        if (isLoading || !pathname || pathname === '/home') return;

        const requiredKey = getPermissionKeyForPath(navItems, pathname);
        if (!requiredKey) return;

        if (!hasPermission(requiredKey, permissions, isSuperAdmin)) {
            router.replace('/home');
        }
    }, [pathname, permissions, isSuperAdmin, isLoading, router]);
}
