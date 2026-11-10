import axios from 'axios';

interface ChunkUploadOptions {
    file: File;
    token: string;
    baseUrl: string;
    metadata?: Record<string, any>;
    storageKey?: string;
    onProgress?: (progress: number) => void;
    abortSignal?: AbortSignal;
    isPausedRef: { current: boolean };
}

const CHUNK_SIZE = 5 * 1024 * 1024;

const isUploadPaused = (isPausedRef: { current: boolean }) => Boolean(isPausedRef.current);

export const uploadFileInChunks = async ({
    file,
    token,
    baseUrl,
    metadata = {},
    storageKey: customStorageKey,
    onProgress,
    abortSignal,
    isPausedRef,
}: ChunkUploadOptions) => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const storageKey = customStorageKey || `upload_cache_${file.name}_${file.size}`;

    let cacheData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    let uploadId = cacheData.uploadId;
    let fileKey = cacheData.fileKey;
    let completedParts: { ETag: string; PartNumber: number }[] = cacheData.completedParts || [];

    if (!uploadId) {
        const initRes = await axios.post(
            `${baseUrl}/api/file/s3/init-upload`,
            { originalname: file.name, mimetype: file.type },
            config
        );
        uploadId = initRes.data.data.uploadId;
        fileKey = initRes.data.data.fileKey;
        completedParts = [];

        localStorage.setItem(storageKey, JSON.stringify({ uploadId, fileKey, completedParts }));
    }

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        try {
            const partNumber = chunkIndex + 1;

            if (isUploadPaused(isPausedRef)) break;

            const isAlreadyUploaded = completedParts.some((part) => part.PartNumber === partNumber);
            if (isAlreadyUploaded) {
                onProgress?.(Math.round((partNumber / totalChunks) * 100));
                continue;
            }

            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunkBlob = file.slice(start, end);

            const urlRes = await axios.post(
                `${baseUrl}/api/file/s3/get-chunk-url`,
                { fileKey, uploadId, chunkIndex: partNumber },
                config
            );
            const presignedUrl = urlRes.data.data.url;

            const s3PutRes = await axios.put(presignedUrl, chunkBlob, {
                signal: abortSignal,
                headers: { 'Content-Type': file.type },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total && onProgress) {
                        const chunkProg = progressEvent.loaded / progressEvent.total;
                        const currentTotalProg = Math.min(
                            Math.round(((chunkIndex + chunkProg) / totalChunks) * 100),
                            99
                        );
                        onProgress(currentTotalProg);
                    }
                },
            });

            const etag = s3PutRes.headers['etag'] || s3PutRes.headers['ETag'];
            if (!etag) throw new Error('S3 did not return an ETag');

            completedParts.push({
                ETag: etag.replace(/"/g, ''),
                PartNumber: partNumber,
            });

            localStorage.setItem(storageKey, JSON.stringify({ uploadId, fileKey, completedParts }));
        } catch (error) {
            if (axios.isCancel(error)) {
                return null;
            }
            throw error;
        }
    }

    if (isUploadPaused(isPausedRef)) return null;

    const completeRes = await axios.post(
        `${baseUrl}/api/file/s3/complete-upload`,
        {
            uploadId,
            fileKey,
            originalname: file.name,
            parts: completedParts,
            metadata: {
                ...metadata,
                mimetype: file.type,
            },
        },
        config
    );

    localStorage.removeItem(storageKey);
    onProgress?.(100);

    return completeRes.data.data;
};
