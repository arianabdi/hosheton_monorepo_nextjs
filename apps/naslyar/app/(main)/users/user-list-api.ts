import axios from 'axios';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';

export interface AdminUserListItem {
    _id: string;
    username: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    mobile?: string;
    role?: string;
    accessRoleId?: string;
    accessRoleName?: string;
    createdAt?: string;
}

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

export async function fetchAdminUserList(query: {
    page?: number;
    limit?: number;
    email?: string;
    username?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
}): Promise<{ users: AdminUserListItem[]; totalItems: number }> {
    const { baseUrl, headers } = getAuthHeaders();
    const params: Record<string, string | number> = {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        sortBy: query.sortBy ?? 'createdAt',
        sortOrder: query.sortOrder ?? 'desc',
    };
    if (query.email?.trim()) params.email = query.email.trim();
    if (query.username?.trim()) params.username = query.username.trim();
    if (query.role?.trim()) params.role = query.role.trim();

    const res = await axios.get(`${baseUrl}/api/user/list`, { headers, params });
    const data = res.data?.data;
    const users = (data?.users || data || []) as AdminUserListItem[];
    const totalItems = data?.totalItems ?? users.length;
    return { users, totalItems };
}

/** جستجو در ماژول user با فیلتر email؛ تطابق دقیق ایمیل اولویت دارد. */
export async function findUsersByEmail(email: string): Promise<{
    exact: AdminUserListItem | null;
    matches: AdminUserListItem[];
}> {
    const trimmed = email.trim();
    if (!trimmed) {
        return { exact: null, matches: [] };
    }
    const { users } = await fetchAdminUserList({ email: trimmed, limit: 30, page: 1 });
    const normalized = trimmed.toLowerCase();
    const exact = users.find(u => (u.email || '').toLowerCase() === normalized) ?? null;
    return { exact, matches: users };
}

export function formatAdminUserLabel(user: AdminUserListItem): string {
    const { name, email } = getAdminUserDisplayParts(user);
    return email ? `${name} (${email})` : name;
}

export function getAdminUserDisplayParts(user?: AdminUserListItem | null): {
    name: string;
    email: string;
    mobile: string;
} {
    if (!user) {
        return { name: '—', email: '', mobile: '' };
    }
    const name =
        user.fullName?.trim()
        || [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
        || user.username?.trim()
        || '—';
    return {
        name,
        email: user.email?.trim() || '',
        mobile: user.mobile?.trim() || '',
    };
}

function mongoIdToString(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        const v = value as { toString?: () => string };
        if (typeof v.toString === 'function') {
            const s = v.toString();
            if (s && s !== '[object Object]') return s;
        }
    }
    return String(value);
}

function normalizeAdminUser(raw: unknown): AdminUserListItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const inner = (obj.user ?? obj) as Record<string, unknown>;
    const id = mongoIdToString(inner._id);
    if (!id) return null;
    return {
        _id: id,
        username: String(inner.username ?? ''),
        email: typeof inner.email === 'string' ? inner.email : undefined,
        firstName: typeof inner.firstName === 'string' ? inner.firstName : undefined,
        lastName: typeof inner.lastName === 'string' ? inner.lastName : undefined,
        fullName: typeof inner.fullName === 'string' ? inner.fullName : undefined,
        mobile: typeof inner.mobile === 'string' ? inner.mobile : undefined,
        role: typeof inner.role === 'string' ? inner.role : undefined,
    };
}

export async function fetchAdminUserById(userId: string): Promise<AdminUserListItem | null> {
    const id = userId?.trim();
    if (!id) return null;
    const { baseUrl, headers } = getAuthHeaders();
    const urls = [`${baseUrl}/api/user/profile/${id}`, `${baseUrl}/api/user/${id}`];
    for (const url of urls) {
        try {
            const res = await axios.get(url, { headers });
            const user = normalizeAdminUser(res.data?.data);
            if (user) return user;
        } catch {
            /* try next */
        }
    }
    return null;
}
