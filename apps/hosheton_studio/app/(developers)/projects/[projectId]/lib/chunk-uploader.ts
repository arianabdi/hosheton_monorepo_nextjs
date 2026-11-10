import axios from 'axios';

export interface ChunkUploadOptions {
    file: File;
    token: string;
    metadata?: Record<string, unknown>;
    onProgress?: (progress: number) => void;
    abortSignal?: AbortSignal;
    isPausedRef?: { current: boolean };
}

export interface ChunkUploadResult {
    fileInfo?: { _id?: string; path?: string; key?: string; originalname?: string };
    original?: { _id?: string; path?: string };
    msg?: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024;

function getApiBase() {
    return process.env.NEXT_PUBLIC_API_URL || '';
}

export function resolveUploadedFileRef(result: ChunkUploadResult | null): { fileId: string; fileKey: string } {
    const info = result?.fileInfo || result?.original;
    return {
        fileId: String(info?._id || ''),
        fileKey: String((info as any)?.key || info?.path || ''),
    };
}

/** @deprecated Use resolveUploadedFileRef and buildPublicFileUrl instead */
export function resolveUploadedFileUrl(result: ChunkUploadResult | null): string {
    const { fileKey } = resolveUploadedFileRef(result);
    return fileKey;
}

export async function uploadFileInChunks({
    file,
    token,
    metadata = {},
    onProgress,
    abortSignal,
    isPausedRef = { current: false },
}: ChunkUploadOptions): Promise<ChunkUploadResult | null> {
    const storageKey = `media_upload_${file.name}_${file.size}`;
    try {
        return await uploadOnce({ file, token, metadata, onProgress, abortSignal, isPausedRef }, storageKey);
    } catch (error) {
        // The resumed session belonged to another storage (admin switched storage) or expired:
        // forget it and upload from scratch once, to the storage that is active now.
        if (!isStaleUploadSession(error)) throw error;
        localStorage.removeItem(storageKey);
        return uploadOnce({ file, token, metadata, onProgress, abortSignal, isPausedRef }, storageKey);
    }
}

/** Resumable sessions older than this are dropped (storages expire unfinished multipart uploads). */
const UPLOAD_SESSION_MAX_AGE_MS = 12 * 3600_000;

interface CachedUploadSession {
    uploadId?: string;
    fileKey?: string;
    /** active storage when the session started (server `storageId`) */
    storageId?: string;
    startedAt?: number;
    completedParts?: { ETag: string; PartNumber: number }[];
}

function isStaleUploadSession(error: unknown): boolean {
    const err = error as { response?: { status?: number; data?: unknown } };
    const body = typeof err?.response?.data === 'string' ? err.response.data : JSON.stringify(err?.response?.data || '');
    return (err?.response?.status === 409 && /UPLOAD_STORAGE_CHANGED/.test(body))
        || /NoSuchUpload/i.test(body)
        || (err?.response?.status === 404 && /uploadId|NoSuch/i.test(body));
}

async function uploadOnce(
    { file, token, metadata = {}, onProgress, abortSignal, isPausedRef = { current: false } }: ChunkUploadOptions,
    storageKey: string,
): Promise<ChunkUploadResult | null> {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    let cacheData: CachedUploadSession = {};
    try {
        cacheData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
        cacheData = {};
    }
    // A session without storage stamp (older client) or too old cannot be trusted to still exist.
    if (!cacheData.storageId || !cacheData.startedAt || Date.now() - cacheData.startedAt > UPLOAD_SESSION_MAX_AGE_MS) {
        cacheData = {};
    }

    let { uploadId, fileKey, storageId } = cacheData;
    const startedAt = cacheData.startedAt || Date.now();
    let completedParts: { ETag: string; PartNumber: number }[] = cacheData.completedParts || [];
    const remember = () => localStorage.setItem(
        storageKey,
        JSON.stringify({ uploadId, fileKey, storageId, startedAt, completedParts } satisfies CachedUploadSession),
    );

    if (!uploadId || !fileKey) {
        const initRes = await axios.post(
            `${getApiBase()}/api/file/s3/init-upload`,
            { originalname: file.name, mimetype: file.type || 'application/octet-stream' },
            config,
        );
        uploadId = initRes.data.data.uploadId;
        fileKey = initRes.data.data.fileKey;
        storageId = initRes.data.data.storageId;
        completedParts = [];
        remember();
    }

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const partNumber = chunkIndex + 1;
        if (isPausedRef.current) break;

        if (completedParts.some((part) => part.PartNumber === partNumber)) {
            onProgress?.(Math.round((partNumber / totalChunks) * 100));
            continue;
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const urlRes = await axios.post(
            `${getApiBase()}/api/file/s3/get-chunk-url`,
            { fileKey, uploadId, storageId, chunkIndex: partNumber },
            config,
        );
        const presignedUrl = urlRes.data.data.url;

        const s3PutRes = await axios.put(presignedUrl, chunkBlob, {
            signal: abortSignal,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total && onProgress) {
                    const chunkProg = progressEvent.loaded / progressEvent.total;
                    onProgress(Math.min(Math.round(((chunkIndex + chunkProg) / totalChunks) * 100), 99));
                }
            },
        });

        const etag = s3PutRes.headers.etag || s3PutRes.headers.ETag;
        if (!etag) throw new Error('Server did not return an ETag');

        completedParts.push({
            ETag: String(etag).replace(/"/g, ''),
            PartNumber: partNumber,
        });

        remember();
    }

    if (isPausedRef.current) return null;

    const completeRes = await axios.post(
        `${getApiBase()}/api/file/s3/complete-upload`,
        {
            uploadId,
            fileKey,
            storageId,
            originalname: file.name,
            parts: completedParts,
            metadata: {
                ...metadata,
                mimetype: file.type || 'application/octet-stream',
                size: file.size,
            },
        },
        config,
    );

    localStorage.removeItem(storageKey);
    onProgress?.(100);

    return completeRes.data.data as ChunkUploadResult;
}

export function getAcceptForAssetType(assetType: string): string {
    if (assetType === 'video') return 'video/*';
    if (assetType === 'audio') return 'audio/*';
    return 'image/*';
}

export function getAssetTypeLabel(assetType: string): string {
    if (assetType === 'video') return 'video';
    if (assetType === 'audio') return 'audio';
    return 'image';
}
