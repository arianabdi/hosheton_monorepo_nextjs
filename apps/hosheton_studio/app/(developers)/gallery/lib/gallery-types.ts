export type GalleryScope = 'project' | 'all' | 'personal';
export type GalleryTab = 'image' | 'video' | 'audio';
export type GalleryMode = 'view' | 'select' | 'multi-select';
export type GalleryPersonalFilter = 'this' | 'all';

export interface GalleryFileItem {
    id?: string;
    url: string;
    type: 'image' | 'video' | 'audio';
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    projectId: string;
    projectTitle: string;
    chatId?: string;
    source: 'upload' | 'generated';
    label?: string;
    fileId?: string;
    fileKey?: string;
    thumbnailUrl?: string;
    thumbnailUrlLarge?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
    durationSeconds?: number;
    /** ISO timestamp for date grouping (Google Photos-style galleries). */
    createdAt?: string;
    sizeBytes?: number;
}
