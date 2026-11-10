import { createApiClient, unwrapApiData } from '@/app/(developers)/projects/lib/api-client';
import type { GalleryFileItem } from './gallery-types';

const BASE = '/api/studio/media';

export const mediaGalleryApi = {
    /** All media referenced by a single project's nodes (navbar gallery — current workflow). */
    async getProjectFiles(projectId: string): Promise<{ files: GalleryFileItem[] }> {
        const res = await createApiClient().get(`${BASE}/projects/${projectId}/files`);
        return unwrapApiData(res);
    },

    /** All media across every project owned by/shared with the user. */
    async getAllFiles(): Promise<{ files: GalleryFileItem[] }> {
        const res = await createApiClient().get(`${BASE}/files`);
        return unwrapApiData(res);
    },

    /**
     * Media attached to chats (uploads + generated attachments).
     * With `projectId`: personal chats + that project's chats only (no other projects).
     */
    async getPersonalChatFiles(chatId?: string, projectId?: string): Promise<{ files: GalleryFileItem[] }> {
        const validChatId = /^[a-fA-F0-9]{24}$/.test(String(chatId || '').trim())
            ? String(chatId).trim()
            : undefined;
        const res = await createApiClient().get(`${BASE}/chats/files`, {
            params: {
                ...(validChatId ? { chatId: validChatId } : {}),
                ...(projectId ? { projectId } : {}),
            },
        });
        return unwrapApiData(res);
    },
};
