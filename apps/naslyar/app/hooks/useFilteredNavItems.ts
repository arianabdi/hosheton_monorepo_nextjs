'use client';

import { useMemo } from 'react';
import { navItems } from '@/app/config/navigation';
import { filterNavByPermissions } from '@/app/config/permission-catalog';
import { filterNavItemsByApp } from '@/app/config/navigation-utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';

export function useFilteredNavItems() {
    const { appName, appVariant, baseUrl } = useAppStore();
    const permissions = useAuthStore((s) => s.permissions);
    const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);

    return useMemo(() => {
        const appFiltered = filterNavItemsByApp(navItems, appName, appVariant, baseUrl);
        return filterNavByPermissions(appFiltered, permissions, isSuperAdmin);
    }, [appName, appVariant, baseUrl, permissions, isSuperAdmin]);
}
