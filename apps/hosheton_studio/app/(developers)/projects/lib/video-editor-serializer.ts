import type { Track } from '../[projectId]/newVideoEditor/types/timeline';
import { normalizeTracks } from '../[projectId]/newVideoEditor/utils/transition-utils';

export const VIDEO_EDITOR_STATE_VERSION = 1 as const;

export interface VideoEditorCanvasSettings {
    width: number;
    height: number;
    /** Target project duration in seconds — the timeline never scrolls past it. */
    duration?: number;
}

export const DEFAULT_VIDEO_EDITOR_CANVAS: VideoEditorCanvasSettings = {
    width: 1280,
    height: 720,
    duration: 30,
};

export const MIN_PROJECT_DURATION = 5;
export const MAX_PROJECT_DURATION = 3600;

export function clampProjectDuration(value: unknown, fallback = DEFAULT_VIDEO_EDITOR_CANVAS.duration!): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(MAX_PROJECT_DURATION, Math.max(MIN_PROJECT_DURATION, Math.round(parsed)));
}

export interface VideoEditorPersistedState {
    version: typeof VIDEO_EDITOR_STATE_VERSION;
    tracks: Track[];
    canvas?: VideoEditorCanvasSettings;
}

export function serializeVideoEditor(
    tracks: Track[],
    canvas: VideoEditorCanvasSettings = DEFAULT_VIDEO_EDITOR_CANVAS,
): VideoEditorPersistedState {
    return {
        version: VIDEO_EDITOR_STATE_VERSION,
        tracks,
        canvas,
    };
}

export function serializeVideoEditorSignature(
    tracks: Track[],
    canvas: VideoEditorCanvasSettings = DEFAULT_VIDEO_EDITOR_CANVAS,
) {
    return { version: VIDEO_EDITOR_STATE_VERSION, tracks, canvas };
}

export function deserializeVideoEditor(data: unknown): Track[] | null {
    if (Array.isArray(data)) {
        return normalizeTracks(data as Track[]);
    }
    if (!data || typeof data !== 'object') return null;

    const parsed = data as Partial<VideoEditorPersistedState>;
    if (!Array.isArray(parsed.tracks)) return null;

    // Accept the original unversioned shape as well as the current format.
    return normalizeTracks(parsed.tracks as Track[]);
}

export function deserializeVideoEditorCanvas(data: unknown): VideoEditorCanvasSettings {
    if (!data || typeof data !== 'object') return DEFAULT_VIDEO_EDITOR_CANVAS;
    const canvas = (data as Partial<VideoEditorPersistedState>).canvas;
    const width = Number(canvas?.width);
    const height = Number(canvas?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) {
        return DEFAULT_VIDEO_EDITOR_CANVAS;
    }
    return {
        width: Math.round(width / 2) * 2,
        height: Math.round(height / 2) * 2,
        duration: clampProjectDuration(canvas?.duration),
    };
}
