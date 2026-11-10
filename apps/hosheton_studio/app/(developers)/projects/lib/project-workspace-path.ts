/** Routes that use the fullscreen editor shell (no developer sidebar). */
export function isProjectWorkspacePath(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    if (pathname === '/projects' || pathname === '/projects/new' || pathname === '/projects/nodes') return false;
    if (/^\/projects\/[^/]+\/settings(\/|$)/.test(pathname)) return false;
    if (/^\/projects\/[^/]+/.test(pathname)) return true;
    if (pathname === '/studio/media' || pathname === '/studio/media/nodes') return false;
    if (/^\/studio\/media\/[^/]+\/settings(\/|$)/.test(pathname)) return false;
    if (/^\/studio\/media\/[^/]+/.test(pathname)) return true;
    return false;
}

/** Routes that use the fullscreen shell (no developer sidebar). */
export function isFullscreenShellPath(pathname: string | null | undefined): boolean {
    return isProjectWorkspacePath(pathname);
}