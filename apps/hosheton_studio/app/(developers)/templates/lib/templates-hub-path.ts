/** Routes that show the templates hub shell (tabs + header). */
export function isTemplatesHubPath(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    if (pathname === '/templates/saved') return true;
    if (pathname === '/templates/analytics') return true;
    if (pathname === '/templates/review-requests') return true;
    return false;
}

export type TemplateTabId = 'mine' | 'saved' | 'reviews' | 'analytics' | 'messages';

export function getActiveTemplateTab(pathname: string | null | undefined): TemplateTabId {
    if (!pathname) return 'mine';
    if (pathname.startsWith('/templates/saved')) return 'saved';
    if (pathname.startsWith('/templates/review-requests')) return 'reviews';
    if (pathname.startsWith('/templates/analytics')) return 'analytics';
    if (pathname.startsWith('/templates/messages') || pathname.startsWith('/messages')) return 'messages';
    return 'mine';
}
