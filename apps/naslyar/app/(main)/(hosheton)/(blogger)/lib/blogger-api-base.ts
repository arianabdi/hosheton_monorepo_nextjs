import { useAppStore } from '@/app/zustand/store/useAppStore';

/**
 * Hosheton Blogger product API host. Used for (hosheton)/(blogger) admin routes.
 * Falls back to the active naslyar baseUrl (which already points at the
 * blogger API when the admin logs in with the «هوشتون · بلاگر» app variant).
 */
export function getHoshetonBloggerApiBase(): string {
    const dedicated = process.env.NEXT_PUBLIC_HOSHETON_BLOGGER_API_URL?.trim();
    if (dedicated) return dedicated.replace(/\/$/, '');
    return useAppStore.getState().baseUrl?.replace(/\/$/, '') || '';
}
