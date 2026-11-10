export type ProbedMediaMetadata = {
    durationSeconds?: number;
    width?: number;
    height?: number;
};

export async function probeFileMetadata(
    file: File,
    assetType: string,
): Promise<ProbedMediaMetadata | undefined> {
    if (!['image', 'video', 'audio'].includes(assetType)) return undefined;
    const url = URL.createObjectURL(file);
    try {
        if (assetType === 'image') {
            return await new Promise((resolve) => {
                const image = new Image();
                image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
                image.onerror = () => resolve(undefined);
                image.src = url;
            });
        }
        return await new Promise((resolve) => {
            const media = document.createElement(assetType === 'video' ? 'video' : 'audio');
            media.preload = 'metadata';
            media.onloadedmetadata = () => resolve({
                durationSeconds: Number.isFinite(media.duration) ? media.duration : undefined,
                ...(media instanceof HTMLVideoElement
                    ? { width: media.videoWidth, height: media.videoHeight }
                    : {}),
            });
            media.onerror = () => resolve(undefined);
            media.src = url;
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}
