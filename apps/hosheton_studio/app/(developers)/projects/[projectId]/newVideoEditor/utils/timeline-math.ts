import type { Clip, Track, ClipType, MediaKind } from '../types/timeline';

export const MIN_CLIP_DURATION = 0.25;
export const DEFAULT_IMAGE_DURATION = 3;
export const DEFAULT_MEDIA_DURATION = 5;
export const TIMELINE_PADDING = 10;

export function computeTotalDuration(tracks: Track[], minDuration = 30): number {
    let maxEnd = 0;
    tracks.forEach((track) => {
        track.clips.forEach((clip) => {
            maxEnd = Math.max(maxEnd, clip.startTime + clip.duration);
        });
    });
    return Math.max(minDuration, Math.ceil(maxEnd + TIMELINE_PADDING));
}

/** `contentLeft` is the scrolled content's live `getBoundingClientRect().left`,
 *  which already moves with the scroll position — adding `scrollLeft` again
 *  pushed the time past the pointer by the scroll distance. */
export function timeFromPointer(
    clientX: number,
    contentLeft: number,
    zoomLevel: number,
): number {
    const x = clientX - contentLeft;
    return Math.max(0, x / zoomLevel);
}

export function findClipAtTime(tracks: Track[], time: number, type: 'video' | 'audio' = 'video'): Clip | null {
    const typedTracks = tracks.filter((t) => t.type === type && !t.hidden);
    for (const track of typedTracks) {
        for (const clip of track.clips) {
            if (time >= clip.startTime && time < clip.startTime + clip.duration) {
                return clip;
            }
        }
    }
    return null;
}

export function clipColors(mediaType?: string): string {
    if (mediaType === 'audio') return '#059669';
    if (mediaType === 'image') return '#8b5cf6';
    return '#6366f1';
}

export function trackAcceptsMedia(trackType: ClipType, mediaType: string): boolean {
    if (trackType === 'audio') return mediaType === 'audio';
    if (trackType === 'video') return mediaType === 'video' || mediaType === 'image';
    return false;
}

export function trackAcceptsTransition(track: Track): boolean {
    return track.type === 'video' && !track.locked;
}

export function clipTypeFromMedia(mediaType: string): 'video' | 'audio' {
    return mediaType === 'audio' ? 'audio' : 'video';
}

/** Infer media kind when older clips only have `type` set. */
export function resolveClipMediaKind(clip: Clip): MediaKind | null {
    if (clip.mediaType) return clip.mediaType;
    if (clip.type === 'audio') return 'audio';
    if (clip.type === 'video') return 'video';
    return null;
}

export function isVisualMediaKind(kind: MediaKind | null): kind is 'video' | 'image' {
    return kind === 'video' || kind === 'image';
}

export function canClipMoveToTrack(clip: Clip, track: Track): boolean {
    if (track.locked) return false;
    if (clip.type === 'transition') return track.type === 'video';
    if (track.type !== 'video' && track.type !== 'audio') return false;
    const mediaType = clip.mediaType || (clip.type === 'audio' ? 'audio' : 'video');
    return trackAcceptsMedia(track.type, mediaType);
}

export function resolveTrackIdFromPoint(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY);
    const row = el?.closest('[data-track-id]') as HTMLElement | null;
    return row?.dataset.trackId ?? null;
}
