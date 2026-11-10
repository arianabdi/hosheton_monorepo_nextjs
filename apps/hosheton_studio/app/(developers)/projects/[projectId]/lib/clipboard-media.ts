export type ClipboardMediaKind = 'image' | 'video' | 'audio';

export interface ClipboardMediaFile {
    file: File;
    assetType: ClipboardMediaKind;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv|avi)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|weba)$/i;

const MIME_EXT: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/webm': 'weba',
};

function inferAssetType(file: File, itemType?: string): ClipboardMediaKind | null {
    const type = (file.type || itemType || '').toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    const name = file.name || '';
    if (IMAGE_EXT.test(name)) return 'image';
    if (VIDEO_EXT.test(name)) return 'video';
    if (AUDIO_EXT.test(name)) return 'audio';
    return null;
}

function defaultMime(assetType: ClipboardMediaKind): string {
    if (assetType === 'video') return 'video/mp4';
    if (assetType === 'audio') return 'audio/mpeg';
    return 'image/png';
}

function defaultExt(assetType: ClipboardMediaKind): string {
    if (assetType === 'video') return 'mp4';
    if (assetType === 'audio') return 'mp3';
    return 'png';
}

function ensureMediaFileName(
    file: File,
    assetType: ClipboardMediaKind,
    stamp: number,
    index: number,
): File {
    const rawName = (file.name || '').trim();
    const hasRealName = rawName && rawName !== 'blob' && rawName !== 'image';
    if (hasRealName) return file;

    const ext = MIME_EXT[file.type] || defaultExt(assetType);
    const suffix = index > 0 ? `-${index}` : '';
    return new File([file], `paste-${stamp}${suffix}.${ext}`, {
        type: file.type || defaultMime(assetType),
        lastModified: file.lastModified || stamp,
    });
}

function rawFileKey(file: File): string {
    return `${file.size}:${file.type}:${file.lastModified}:${file.name || ''}`;
}

export function extractClipboardMediaFiles(data: DataTransfer | null | undefined): ClipboardMediaFile[] {
    if (!data) return [];

    const seen = new Set<string>();
    const out: ClipboardMediaFile[] = [];
    const stamp = Date.now();
    let pasteIndex = 0;

    const consider = (file: File | null, itemType?: string) => {
        if (!file) return;
        const assetType = inferAssetType(file, itemType);
        if (!assetType) return;
        const key = rawFileKey(file);
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
            file: ensureMediaFileName(file, assetType, stamp, pasteIndex),
            assetType,
        });
        pasteIndex += 1;
    };

    // Prefer `files` — walking `items` too duplicates the same clipboard blob after rename.
    if (data.files?.length) {
        for (const file of Array.from(data.files)) consider(file);
        return out;
    }

    if (data.items?.length) {
        for (const item of Array.from(data.items)) {
            if (item.kind !== 'file') continue;
            consider(item.getAsFile(), item.type);
        }
    }

    return out;
}

export function isEditablePasteTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function isAssetRefPasteTarget(target: EventTarget | null = document.activeElement): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('[data-asset-ref-upload="true"]'));
}

/** Replaces leftover OS image/video so a later Ctrl+V pastes workflow nodes instead. */
export function claimOsClipboardForNodeCopy(): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText('\u200b').catch(() => undefined);
}
