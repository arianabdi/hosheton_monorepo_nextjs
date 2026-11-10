import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { extractPermissionsFromNav, type PermissionCatalogItem } from '@/app/config/permission-catalog';
import { navItems } from '@/app/config/navigation';
import { filterNavItemsByApp } from '@/app/config/navigation-utils';

export type AccessRoleItem = {
    _id: string;
    name: string;
    description?: string;
    permissionKeys: string[];
    isActive?: boolean;
    createdAt?: string;
};

export type PermissionGroup = {
    groupKey: string;
    groupLabel: string;
    items: Array<{
        _id?: string;
        key: string;
        label: string;
        description?: string;
        routeHint?: string;
    }>;
};

function getAuthHeaders() {
    const { token } = useAuthStore.getState();
    const { baseUrl } = useAppStore.getState();
    return {
        baseUrl,
        headers: {
            authorization: `Bearer ${token}`,
        },
    };
}

export async function fetchMyPermissions(): Promise<{
    accessRoleId: string | null;
    accessRoleName: string | null;
    permissions: string[];
    isSuperAdmin: boolean;
}> {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.get(`${baseUrl}/api/access/me/permissions`, { headers });
    return res.data?.data ?? { accessRoleId: null, accessRoleName: null, permissions: [], isSuperAdmin: false };
}

export async function fetchPermissionCatalog(): Promise<{ items: PermissionGroup['items']; groups: PermissionGroup[] }> {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.get(`${baseUrl}/api/access/permissions`, { headers });
    return res.data?.data ?? { items: [], groups: [] };
}

export async function syncPermissionCatalog(items: PermissionCatalogItem[]) {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.post(`${baseUrl}/api/access/permissions/sync`, { items }, { headers });
    return res.data?.data;
}

/** Permission items of the menus this app actually shows (blogger ≠ studio). */
export function currentAppPermissionCatalog(): PermissionCatalogItem[] {
    const { appName, appVariant, baseUrl } = useAppStore.getState();
    return extractPermissionsFromNav(filterNavItemsByApp(navItems, appName, appVariant, baseUrl));
}

/**
 * Catalog of the connected API, synced from the menu first when it is empty or missing
 * keys — each app (studio, blogger, …) has its own DB, so a fresh app would otherwise
 * show an empty permission list in the role form.
 */
export async function ensurePermissionCatalog() {
    const catalog = await fetchPermissionCatalog();
    const known = new Set((catalog.items ?? []).map((item) => item.key));
    const expected = currentAppPermissionCatalog();
    if (expected.every((item) => known.has(item.key))) return catalog;
    await syncPermissionCatalog(expected);
    return fetchPermissionCatalog();
}

export async function fetchAccessRoles(): Promise<{ items: AccessRoleItem[]; totalItems: number }> {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.get(`${baseUrl}/api/access/roles`, { headers, params: { page: 1, limit: 200 } });
    const data = res.data?.data;
    return {
        items: (data?.items ?? []) as AccessRoleItem[],
        totalItems: data?.totalItems ?? 0,
    };
}

export async function fetchAccessRoleById(id: string): Promise<AccessRoleItem | null> {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.get(`${baseUrl}/api/access/roles/${id}`, { headers });
    return (res.data?.data ?? null) as AccessRoleItem | null;
}

export async function createAccessRole(body: {
    name: string;
    description?: string;
    permissionKeys?: string[];
}) {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.post(`${baseUrl}/api/access/roles`, body, { headers });
    return res.data?.data as AccessRoleItem;
}

export async function updateAccessRole(
    id: string,
    body: { name?: string; description?: string; permissionKeys?: string[]; isActive?: boolean },
) {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.put(`${baseUrl}/api/access/roles/${id}`, body, { headers });
    return res.data?.data as AccessRoleItem;
}

export async function deleteAccessRole(id: string) {
    const { baseUrl, headers } = getAuthHeaders();
    await axios.delete(`${baseUrl}/api/access/roles/${id}`, { headers });
}

export async function adminSetUserPassword(userId: string, password: string, repeatPassword: string) {
    const { baseUrl, headers } = getAuthHeaders();
    await axios.patch(`${baseUrl}/api/user/${userId}/password`, { password, repeatPassword }, { headers });
}

export async function updateUserProfile(
    userId: string,
    body: {
        fullName?: string;
        email?: string;
        mobile?: string;
        username?: string;
        accessRoleId?: string | null;
    },
) {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.put(`${baseUrl}/api/user/${userId}`, body, { headers });
    return res.data?.data;
}

export async function createAdminUser(body: {
    fullName: string;
    email: string;
    password: string;
    repeatPassword: string;
    mobile?: string;
    username?: string;
    accessRoleId?: string;
}) {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.post(`${baseUrl}/api/user/new-admin`, body, { headers });
    return res.data?.data;
}

export async function fetchUserProfile(userId: string) {
    const { baseUrl, headers } = getAuthHeaders();
    const res = await axios.get(`${baseUrl}/api/user/profile/${userId}`, { headers });
    return res.data?.data?.user ?? res.data?.data ?? null;
}
