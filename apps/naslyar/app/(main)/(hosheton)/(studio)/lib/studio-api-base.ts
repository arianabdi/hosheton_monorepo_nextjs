import { useAppStore } from '@/app/zustand/store/useAppStore';

/**
 * Studio product API host. Used for (hosheton)/(studio) admin routes.
 * Falls back to the active naslyar baseUrl when the dedicated env is unset.
 */
export function getHoshetonStudioApiBase(): string {
    const dedicated = process.env.NEXT_PUBLIC_HOSHETON_STUDIO_API_URL?.trim();
    if (dedicated) return dedicated.replace(/\/$/, '');
    return useAppStore.getState().baseUrl;
}
