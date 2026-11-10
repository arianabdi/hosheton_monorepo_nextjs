import { buildPublicFileUrl } from './file-url';
import { resolveUploadedFileRef, uploadFileInChunks } from './chunk-uploader';
import { probeFileMetadata, type ProbedMediaMetadata } from './asset-metadata';

export interface AssetRefUploadPatch {
    fileId: string;
    fileKey: string;
    externalUrl: string;
    fileName: string;
    assetType: string;
    assetUrl: undefined;
    mediaMetadata?: ProbedMediaMetadata;
    mediaThumbs?: Record<string, {
        width: number;
        height: number;
        aspectRatio: number;
    }>;
}

export async function uploadAssetRefFile(options: {
    file: File;
    token: string;
    assetType: string;
    onProgress?: (progress: number) => void;
    abortSignal?: AbortSignal;
    isPausedRef?: { current: boolean };
    noFileIdMessage: string;
}): Promise<AssetRefUploadPatch> {
    const { file, token, assetType, onProgress, abortSignal, isPausedRef, noFileIdMessage } = options;
    const mediaMetadata = await probeFileMetadata(file, assetType);
    const result = await uploadFileInChunks({
        file,
        token,
        isPausedRef,
        abortSignal,
        metadata: { source: 'media-studio', assetType, ...(mediaMetadata || {}) },
        onProgress,
    });
    const { fileId, fileKey } = resolveUploadedFileRef(result);
    if (!fileId) throw new Error(noFileIdMessage);

    const publicUrl = fileKey ? buildPublicFileUrl(fileKey) : '';
    const width = mediaMetadata?.width;
    const height = mediaMetadata?.height;

    return {
        fileId,
        fileKey,
        externalUrl: '',
        fileName: file.name,
        assetType,
        assetUrl: undefined,
        mediaMetadata,
        ...(publicUrl && width && height ? {
            mediaThumbs: {
                [publicUrl]: {
                    width,
                    height,
                    aspectRatio: Number((width / height).toFixed(4)),
                },
            },
        } : {}),
    };
}
