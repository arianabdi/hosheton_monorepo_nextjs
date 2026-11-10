import type { MediaKind } from '../types/timeline';
import { DEFAULT_IMAGE_DURATION, DEFAULT_MEDIA_DURATION } from './timeline-math';

export function probeMediaDuration(url: string, type: MediaKind): Promise<number> {
    if (type === 'image') {
        return Promise.resolve(DEFAULT_IMAGE_DURATION);
    }

    return new Promise((resolve) => {
        const element = document.createElement(type === 'audio' ? 'audio' : 'video');
        element.preload = 'metadata';
        element.src = url;

        const cleanup = () => {
            element.removeAttribute('src');
            element.load();
        };

        element.onloadedmetadata = () => {
            const duration = Number.isFinite(element.duration) && element.duration > 0
                ? element.duration
                : DEFAULT_MEDIA_DURATION;
            cleanup();
            resolve(duration);
        };

        element.onerror = () => {
            cleanup();
            resolve(DEFAULT_MEDIA_DURATION);
        };
    });
}
