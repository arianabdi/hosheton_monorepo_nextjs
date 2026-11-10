import type { Clip, Track, TransitionType } from '../types/timeline';
import { TRANSITION_CLIP_COLOR as PINK } from '../types/timeline';
import { isVisualMediaKind, resolveClipMediaKind } from './timeline-math';
import { sanitizeClipKeyframes } from './keyframes';

export const MIN_TRANSITION_DURATION = 0.15;
const ADJACENT_GAP = 0.15;

export function isTransitionClip(clip: Clip): boolean {
    return clip.type === 'transition';
}

export function isVisualClip(clip: Clip): boolean {
    return isVisualMediaKind(resolveClipMediaKind(clip));
}

export function clipLocalTime(clip: Clip, time: number): number {
    return (clip.trimStart ?? 0) + (time - clip.startTime);
}

export function isTransitionActiveAt(clip: Clip, time: number): boolean {
    return time >= clip.startTime && time < clip.startTime + clip.duration;
}

export function transitionBlendProgress(clip: Clip, time: number): number {
    const raw = (time - clip.startTime) / clip.duration;
    const t = Math.min(1, Math.max(0, raw));
    const curve = clip.transitionCurve ?? 'smooth';

    switch (curve) {
        case 'linear':
            return t;
        case 'easeIn':
            return t * t;
        case 'easeOut':
            return 1 - (1 - t) * (1 - t);
        case 'smooth':
        default:
            return t * t * (3 - 2 * t);
    }
}

export function applyTransitionIntensity(blend: number, clip: Clip): number {
    const intensity = clip.transitionIntensity ?? 1;
    return Math.min(1, Math.max(0, blend * intensity));
}

/** Find two visual clips on the same video track for a transition clip. */
export function getVideoClipsForTransition(
    tracks: Track[],
    transitionClip: Clip,
): { from: Clip; to: Clip } | null {
    const sourceTrack = tracks.find(
        (t) => t.id === transitionClip.trackId && t.type === 'video' && !t.hidden,
    );
    if (!sourceTrack) return null;

    const visual = sourceTrack.clips
        .filter((clip) => isVisualClip(clip))
        .sort((a, b) => a.startTime - b.startTime);

    const t0 = transitionClip.startTime;
    const t1 = transitionClip.startTime + transitionClip.duration;

    for (let i = 0; i < visual.length - 1; i++) {
        const fromClip = visual[i];
        const toClip = visual[i + 1];
        const boundary = fromClip.startTime + fromClip.duration;
        if (toClip.startTime - boundary > ADJACENT_GAP) continue;
        if (boundary >= t0 && boundary <= t1) {
            return transitionClip.reversed
                ? { from: toClip, to: fromClip }
                : { from: fromClip, to: toClip };
        }
    }

    const overlapping = visual.filter(
        (clip) => clip.startTime < t1 && clip.startTime + clip.duration > t0,
    );
    if (overlapping.length >= 2) {
        const from = overlapping[0];
        const to = overlapping[1];
        return transitionClip.reversed ? { from: to, to: from } : { from, to };
    }

    return null;
}

/** Snap a new transition onto the nearest cut between two clips on a video track. */
export function snapTransitionToTrackCut(
    track: Track,
    dropTime: number,
    duration: number,
): { startTime: number; duration: number } {
    const visual = track.clips
        .filter((clip) => isVisualClip(clip))
        .sort((a, b) => a.startTime - b.startTime);

    let bestBoundary: number | null = null;
    let bestDistance = Infinity;

    for (let i = 0; i < visual.length - 1; i++) {
        const boundary = visual[i].startTime + visual[i].duration;
        const gap = visual[i + 1].startTime - boundary;
        if (gap > ADJACENT_GAP) continue;
        const distance = Math.abs(dropTime - boundary);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestBoundary = boundary;
        }
    }

    if (bestBoundary !== null && bestDistance <= 2) {
        return {
            startTime: Math.max(0, bestBoundary - duration),
            duration,
        };
    }

    return {
        startTime: Math.max(0, dropTime - duration / 2),
        duration,
    };
}

function legacyTransitionToClip(
    trackId: string,
    item: {
        id: string;
        type: TransitionType;
        startTime: number;
        duration: number;
        reversed?: boolean;
    },
): Clip {
    return {
        id: item.id,
        trackId,
        title: 'Cross Dissolve',
        startTime: item.startTime,
        duration: item.duration,
        type: 'transition',
        transitionType: item.type,
        reversed: item.reversed,
        transitionIntensity: 1,
        color: PINK,
    };
}

/** Migrate legacy data; transition clips always live on video tracks. */
export function normalizeTracks(tracks: Track[]): Track[] {
    const orphanedTransitionClips: Clip[] = [];

    let normalized = tracks.map((track) => {
        const legacyTransitions = (track as Track & {
            transitions?: Array<{
                id: string;
                type: TransitionType;
                startTime: number;
                duration: number;
                reversed?: boolean;
            }>;
        }).transitions ?? [];

        for (const transition of legacyTransitions) {
            orphanedTransitionClips.push(legacyTransitionToClip(track.id, transition));
        }

        const clips = track.clips
            .filter((clip): clip is Clip => !!clip && typeof clip === 'object')
            .map((clip) => {
                const legacy = (clip as Clip & {
                    outTransition?: { type: TransitionType; duration: number; nextClipId: string };
                }).outTransition;
                const withMediaType: Clip = clip.mediaType
                    ? clip
                    : (clip.type === 'video' || clip.type === 'audio'
                        ? { ...clip, mediaType: clip.type as 'video' | 'audio' }
                        : clip);

                // Storage hardening: drop malformed keyframes and clamp times.
                if (withMediaType.keyframes) {
                    withMediaType.keyframes = sanitizeClipKeyframes(
                        withMediaType.keyframes,
                        withMediaType.duration,
                    );
                }
                if (withMediaType.volume != null) {
                    withMediaType.volume = Math.min(1, Math.max(0, Number(withMediaType.volume) || 0));
                }

                if (!legacy) return withMediaType;

                const nextClip = track.clips.find((c) => c.id === legacy.nextClipId);
                if (nextClip) {
                    const boundary = clip.startTime + clip.duration;
                    orphanedTransitionClips.push(legacyTransitionToClip(track.id, {
                        id: `tr-migrated-${clip.id}-${legacy.nextClipId}`,
                        type: legacy.type,
                        startTime: Math.max(0, boundary - legacy.duration),
                        duration: legacy.duration,
                    }));
                }

                const { outTransition: _removed, ...rest } = withMediaType as Clip & { outTransition?: unknown };
                return rest;
            });

        const { transitions: _removed, ...restTrack } = track as Track & { transitions?: unknown[] };
        return { ...restTrack, clips };
    });

    normalized = normalized.filter((track) => {
        if (track.type === 'transition') {
            orphanedTransitionClips.push(...track.clips.map((c) => ({
                ...c,
                type: 'transition' as const,
                color: c.color ?? PINK,
                transitionIntensity: c.transitionIntensity ?? 1,
            })));
            return false;
        }
        return true;
    });

    if (orphanedTransitionClips.length === 0) return normalized;

    const videoTracks = normalized.filter((t) => t.type === 'video');
    const firstVideoId = videoTracks[0]?.id;
    if (!firstVideoId) return normalized;

    const videoTrackIds = new Set(videoTracks.map((t) => t.id));
    const assignments = new Map<string, Clip[]>();

    for (const clip of orphanedTransitionClips) {
        const targetId = videoTrackIds.has(clip.trackId) ? clip.trackId : firstVideoId;
        const list = assignments.get(targetId) ?? [];
        list.push({ ...clip, trackId: targetId });
        assignments.set(targetId, list);
    }

    return normalized.map((track) => {
        const additions = assignments.get(track.id);
        if (!additions?.length) return track;
        return { ...track, clips: [...track.clips, ...additions] };
    });
}
