import { uploadFileInChunks } from '@/app/(developers)/projects/[projectId]/lib/chunk-uploader';
import { buildPublicFileUrl } from '@/app/(developers)/projects/[projectId]/lib/file-url';

export interface UserPicture {
    large?: string;
    medium?: string;
    thumbnail?: string;
}

const mapChunkUploadResult = (upload: any) => {
    if (upload?.original && upload?.thumbnail) {
        return upload;
    }

    const original = upload?.original || upload?.fileInfo || upload;
    return {
        original,
        thumbnail: upload?.thumbnail || original,
    };
};

const resolveFileUrl = (file?: { path?: string; key?: string }) => {
    if (file?.path) {
        if (file.path.startsWith('http://') || file.path.startsWith('https://') || file.path.startsWith('blob:')) {
            return file.path;
        }
        return buildPublicFileUrl(file.path);
    }

    if (file?.key) {
        return buildPublicFileUrl(file.key);
    }

    return '';
};

const resolveStoredPictureValue = (value?: string): string => {
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) {
        return value;
    }
    return buildPublicFileUrl(value);
};

export const resolvePictureUrl = (picture?: UserPicture): string => {
    if (!picture) return '';
    const candidate = picture.medium || picture.large || picture.thumbnail || '';
    return resolveStoredPictureValue(candidate);
};

export const buildPictureFromUpload = (upload: any): UserPicture => {
    const mapped = mapChunkUploadResult(upload);
    const originalPath = resolveFileUrl(mapped.original);
    const thumbPath = resolveFileUrl(mapped.thumbnail) || originalPath;

    return {
        large: originalPath,
        medium: originalPath,
        thumbnail: thumbPath,
    };
};

export const uploadProfileImageInChunks = async (
    file: File,
    token: string,
    onProgress?: (progress: number) => void,
): Promise<UserPicture> => {
    const upload = await uploadFileInChunks({
        file,
        token,
        isPausedRef: { current: false },
        onProgress,
        metadata: {
            mimetype: file.type || 'image/jpeg',
            size: file.size,
            type: 'PROFILE_AVATAR',
        },
    });

    if (!upload) {
        throw new Error('UPLOAD_ABORTED');
    }

    return buildPictureFromUpload(upload);
};
