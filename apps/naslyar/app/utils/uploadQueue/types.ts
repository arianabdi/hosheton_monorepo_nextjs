export type UploadJobStatus =
    | 'pending'
    | 'uploading'
    | 'paused'
    | 'completed'
    | 'failed';

export interface StoredUploadFile {
    id: string;
    blob: Blob;
    name: string;
    size: number;
    type: string;
    lastModified: number;
}

export interface UploadJob {
    id: string;
    fileId: string;
    fileName: string;
    fileSize: number;
    filmId: string;
    filmName?: string;
    seasonId?: string | null;
    episodeId?: string | null;
    episodeTitle?: string;
    resolution: string;
    contentType: 'MOVIE' | 'SERIES';
    status: UploadJobStatus;
    progress: number;
    error?: string;
    storageKey: string;
    createdAt: number;
    updatedAt: number;
}

export interface AddUploadJobInput {
    file: File;
    filmId: string;
    filmName?: string;
    seasonId?: string | null;
    episodeId?: string | null;
    episodeTitle?: string;
    resolution: string;
    contentType?: 'MOVIE' | 'SERIES';
}
