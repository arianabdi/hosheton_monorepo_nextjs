export function getSelectedIdFromPath(pathname: string): string | null {
    if (pathname === '/avatars') return null;
    const match = pathname.match(/^\/avatars\/([^/]+)$/);
    if (!match || match[1] === 'new') return null;
    return match[1];
}

export function isAvatarSplitRoute(pathname: string): boolean {
    if (pathname === '/avatars') return true;
    return getSelectedIdFromPath(pathname) !== null;
}

export function syncAvatarWorkspaceUrl(avatarId: string | null) {
    if (typeof window === 'undefined') return;
    const nextPath = avatarId ? `/avatars/${avatarId}` : '/avatars';
    if (window.location.pathname !== nextPath) {
        window.history.replaceState(window.history.state, '', nextPath);
    }
}
