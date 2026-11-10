import { createApiClient, unwrapApiData } from './api-client';
import { buildPublicFileUrl } from '../[projectId]/lib/file-url';
import { mediaApi } from './media-api';

export interface FileMeta {
    _id: string;
    key?: string;
    originalname?: string;
    mimetype?: string;
    size?: number;
    publicUrl?: string;
}

export async function fetchFileMeta(fileId: string): Promise<FileMeta | null> {
    if (!fileId) return null;
    try {
        const client = createApiClient();
        const data = unwrapApiData<{ file: FileMeta }>(await client.get(`/api/file/${fileId}`));
        return data.file ?? null;
    } catch {
        return null;
    }
}

export async function resolveFilePublicUrl(fileId: string, fileKey?: string): Promise<string> {
    if (fileKey) return buildPublicFileUrl(fileKey);
    if (!fileId) return '';
    const meta = await fetchFileMeta(fileId);
    if (!meta) return '';
    return meta.publicUrl || buildPublicFileUrl(meta.key || '');
}

export async function deleteOwnedFile(fileId: string): Promise<boolean> {
    if (!fileId) return false;
    try {
        await mediaApi.deleteOwnedFile(fileId);
        return true;
    } catch {
        return false;
    }
}
