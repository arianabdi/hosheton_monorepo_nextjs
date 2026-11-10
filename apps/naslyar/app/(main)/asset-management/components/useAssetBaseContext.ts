'use client';

import React from 'react';
import { AdminUserListItem, fetchAdminUserList } from '@/app/(main)/users/user-list-api';
import { assetManagementApi, AssetCategory, AssetLocation } from '../asset-management-api';

export interface AssetBaseContext {
    loading: boolean;
    categories: AssetCategory[];
    locations: AssetLocation[];
    users: AdminUserListItem[];
    resolveUserName: (userId?: string | null) => string;
    resolveLocationName: (locationId?: string | null) => string;
    resolveCategoryName: (categoryId?: string | null) => string;
    reload: () => void;
}

/**
 * داده‌های پایه ماژول اموال: گروه‌ها، محل‌های استقرار و کاربران.
 * کاربران از ماژول user (API اصلی لاگین) گرفته می‌شوند و برای نمایش نام
 * تحویل‌گیرنده‌ها در جدول‌ها و Timeline به id ها نگاشت می‌شوند.
 */
export function useAssetBaseContext(): AssetBaseContext {
    const [loading, setLoading] = React.useState(true);
    const [categories, setCategories] = React.useState<AssetCategory[]>([]);
    const [locations, setLocations] = React.useState<AssetLocation[]>([]);
    const [users, setUsers] = React.useState<AdminUserListItem[]>([]);
    const [reloadKey, setReloadKey] = React.useState(0);

    React.useEffect(() => {
        let mounted = true;
        setLoading(true);
        Promise.all([
            assetManagementApi.listCategories().catch(() => ({ items: [] as AssetCategory[] })),
            assetManagementApi.listLocations().catch(() => ({ items: [] as AssetLocation[] })),
            fetchAdminUserList({ limit: 500, page: 1 }).catch(() => ({ users: [] as AdminUserListItem[] })),
        ])
            .then(([cats, locs, usersRes]) => {
                if (!mounted) return;
                setCategories(cats.items || []);
                setLocations(locs.items || []);
                setUsers(usersRes.users || []);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [reloadKey]);

    const userMap = React.useMemo(() => {
        const map = new Map<string, string>();
        for (const user of users) {
            const name =
                user.fullName?.trim()
                || [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
                || user.username?.trim()
                || '';
            if (user._id) map.set(user._id, name || user._id);
        }
        return map;
    }, [users]);

    const locationMap = React.useMemo(() => {
        const map = new Map<string, string>();
        for (const location of locations) map.set(location._id, location.title);
        return map;
    }, [locations]);

    const categoryMap = React.useMemo(() => {
        const map = new Map<string, string>();
        for (const category of categories) map.set(category._id, category.title);
        return map;
    }, [categories]);

    const resolveUserName = React.useCallback(
        (userId?: string | null) => {
            if (!userId) return '—';
            return userMap.get(String(userId)) || String(userId);
        },
        [userMap],
    );

    const resolveLocationName = React.useCallback(
        (locationId?: string | null) => {
            if (!locationId) return '—';
            return locationMap.get(String(locationId)) || String(locationId);
        },
        [locationMap],
    );

    const resolveCategoryName = React.useCallback(
        (categoryId?: string | null) => {
            if (!categoryId) return '—';
            return categoryMap.get(String(categoryId)) || String(categoryId);
        },
        [categoryMap],
    );

    return {
        loading,
        categories,
        locations,
        users,
        resolveUserName,
        resolveLocationName,
        resolveCategoryName,
        reload: () => setReloadKey((k) => k + 1),
    };
}
