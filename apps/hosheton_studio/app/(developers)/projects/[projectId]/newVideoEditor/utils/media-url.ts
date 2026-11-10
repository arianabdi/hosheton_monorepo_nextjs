/** Resolve gallery/storage URLs for HTML media elements. */
export function resolveMediaUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
        return url;
    }
    if (url.startsWith('/')) {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}${url}`;
        }
        return url;
    }
    return url;
}

export function setVideoSource(video: HTMLVideoElement, sourceUrl: string) {
    const resolved = resolveMediaUrl(sourceUrl);
    if (video.dataset.sourceUrl !== sourceUrl) {
        video.dataset.sourceUrl = sourceUrl;
        video.src = resolved;
    }
}
