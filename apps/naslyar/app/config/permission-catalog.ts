import type { NavItem } from './navigation';

export type PermissionCatalogItem = {
    key: string;
    label: string;
    description?: string;
    groupKey: string;
    groupLabel: string;
    sortOrder: number;
    routeHint?: string;
};

export function hasPermission(
    permissionKey: string | undefined,
    userPermissions: string[],
    isSuperAdmin = false,
): boolean {
    if (!permissionKey) return true;
    if (isSuperAdmin || userPermissions.includes('*')) return true;
    return userPermissions.includes(permissionKey);
}

export function extractPermissionsFromNav(items: NavItem[]): PermissionCatalogItem[] {
    const map = new Map<string, PermissionCatalogItem>();
    let order = 0;

    const upsert = (
        key: string | undefined,
        label: string,
        groupKey: string,
        groupLabel: string,
        routeHint?: string,
    ) => {
        if (!key || map.has(key)) return;
        map.set(key, {
            key,
            label,
            groupKey,
            groupLabel,
            sortOrder: order++,
            routeHint,
        });
    };

    items.forEach((item) => {
        const groupKey = item.permissionKey || item.href.replace(/^\//, '').split('/')[0] || 'general';
        const groupLabel = item.title;

        upsert(item.permissionKey, item.title, groupKey, groupLabel, item.href);

        item.subItems?.forEach((sub) => {
            upsert(sub.permissionKey, sub.title, groupKey, groupLabel, sub.href);
        });
    });

    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function filterNavByPermissions(
    items: NavItem[],
    userPermissions: string[],
    isSuperAdmin = false,
): NavItem[] {
    return items
        .map((item) => {
            const filteredSubItems = item.subItems?.filter((sub) =>
                hasPermission(sub.permissionKey, userPermissions, isSuperAdmin),
            );

            const itemAllowed = hasPermission(item.permissionKey, userPermissions, isSuperAdmin);
            const hasVisibleSubs = (filteredSubItems?.length ?? 0) > 0;

            if (item.subItems?.length) {
                if (!hasVisibleSubs) return null;
                return { ...item, subItems: filteredSubItems };
            }

            if (!itemAllowed) return null;
            return item;
        })
        .filter(Boolean) as NavItem[];
}

export function getPermissionKeyForPath(items: NavItem[], pathname: string): string | undefined {
    for (const item of items) {
        if (item.subItems?.length) {
            const exactSub = item.subItems.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
            if (exactSub?.permissionKey) return exactSub.permissionKey;
        }
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
            return item.permissionKey;
        }
    }
    return undefined;
}
