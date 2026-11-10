import { createApiClient, unwrapApiData } from './api-client';

export interface ChatImageVariant {
    applied: boolean;
    reason?: string;
    reused?: boolean;
    fileId?: string;
    url?: string;
    key?: string;
    width?: number;
    height?: number;
    size?: number;
}

/** available: ادمین (naslyar → تنظیمات) فعالش کرده؛ enabled: برای همین کاربر روشن است */
export interface ChatImageOptimizePreference {
    available: boolean;
    enabled: boolean;
    maxEdgePx: number;
}

export async function getChatImageOptimizePreference(): Promise<ChatImageOptimizePreference> {
    const res = await createApiClient().get('/api/studio/media/image-optimize/preference');
    return unwrapApiData<ChatImageOptimizePreference>(res);
}

export async function setChatImageOptimizePreference(enabled: boolean): Promise<ChatImageOptimizePreference> {
    const res = await createApiClient().put('/api/studio/media/image-optimize/preference', { enabled });
    return unwrapApiData<ChatImageOptimizePreference>(res);
}

/** Asks the image-optimize service for a smaller sibling. Failures keep the original upload. */
export async function requestChatImageVariant(fileId: string): Promise<ChatImageVariant | null> {
    if (!fileId) return null;
    try {
        const res = await createApiClient().post('/api/studio/media/image-optimize/variant', { fileId });
        return unwrapApiData<ChatImageVariant>(res);
    } catch {
        return null;
    }
}
