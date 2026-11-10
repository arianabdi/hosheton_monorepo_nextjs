export function normalizeRoles(roles?: unknown): string[] {
    if (!Array.isArray(roles)) return [];
    return roles.map((role) => String(role).toLowerCase());
}

export function hasRole(roles: string[] | undefined, role: string): boolean {
    return normalizeRoles(roles).includes(role.toLowerCase());
}

export function canUseDeveloperTools(roles?: string[]): boolean {
    return hasRole(roles, 'super-admin') || hasRole(roles, 'admin');
}

export function mapApiUserToProfile(apiUser: Record<string, unknown>) {
    const picture = apiUser.picture as { path?: string } | undefined;

    return {
        userId: String(apiUser._id || ''),
        email: String(apiUser.email || ''),
        fullname: String(apiUser.fullName || ''),
        username: String(apiUser.username || ''),
        avatar: String(apiUser.avatar || picture?.path || ''),
        roles: normalizeRoles(apiUser.roles),
    };
}
