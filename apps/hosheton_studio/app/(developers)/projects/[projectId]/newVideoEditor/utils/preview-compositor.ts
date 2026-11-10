import type { Track } from '../types/timeline';
import {
    clipLocalTime,
    getVideoClipsForTransition,
    isTransitionActiveAt,
    isTransitionClip,
    isVisualClip,
    transitionBlendProgress,
    applyTransitionIntensity,
} from './transition-utils';
import { resolveClipKeyframeValues, type ResolvedKeyframeValues } from './keyframes';

export type PreviewLayer = {
    clip: import('../types/timeline').Clip;
    opacity: number;
    localTime: number;
    zIndex: number;
    /** Text tracks: the shared default style the clip may override. */
    trackStyle?: import('../types/timeline').TextClipStyle;
    /** Keyframed parameter values sampled at `localTime` (null = no keyframes). */
    resolved?: ResolvedKeyframeValues | null;
};

/** Attach keyframed values (sampled at the layer's local time) when the clip animates any channel. */
function attachResolved<T extends { clip: import('../types/timeline').Clip; localTime: number }>(layer: T): T {
    if (!layer.clip.keyframes) return layer;
    return { ...layer, resolved: resolveClipKeyframeValues(layer.clip, layer.localTime) };
}

/** Video tracks are ordered top → bottom; index 0 = highest display priority. */
export function getVideoTracksOrdered(tracks: Track[]): Track[] {
    return tracks.filter((t) => t.type === 'video' && !t.hidden);
}

export function computePreviewLayers(tracks: Track[], time: number): PreviewLayer[] {
    const videoTracks = getVideoTracksOrdered(tracks);
    const layers: PreviewLayer[] = [];

    for (let trackIndex = 0; trackIndex < videoTracks.length; trackIndex++) {
        const track = videoTracks[trackIndex];
        const trackBaseZ = (videoTracks.length - trackIndex) * 10;
        let transitionWasApplied = false;

        for (const clip of track.clips) {
            if (!isTransitionClip(clip)) continue;
            if (!isTransitionActiveAt(clip, time)) continue;

            const pair = getVideoClipsForTransition(tracks, clip);
            if (!pair) continue;

            const blend = applyTransitionIntensity(transitionBlendProgress(clip, time), clip);
            const localB = pair.to.startTime <= time
                ? clipLocalTime(pair.to, time)
                : (pair.to.trimStart ?? 0);

            layers.push(
                attachResolved({
                    clip: pair.from,
                    opacity: 1 - blend,
                    localTime: clipLocalTime(pair.from, time),
                    zIndex: trackBaseZ,
                }),
                attachResolved({
                    clip: pair.to,
                    opacity: blend,
                    localTime: Math.max(pair.to.trimStart ?? 0, localB),
                    zIndex: trackBaseZ + 1,
                }),
            );
            transitionWasApplied = true;
            break;
        }
        if (transitionWasApplied) continue;

        for (const clip of track.clips) {
            if (isTransitionClip(clip)) continue;
            if (time < clip.startTime || time >= clip.startTime + clip.duration) continue;
            if (!isVisualClip(clip)) continue;

            layers.push(attachResolved({
                clip,
                opacity: 1,
                localTime: clipLocalTime(clip, time),
                zIndex: trackBaseZ,
            }));
        }
    }

    // Text tracks always composite above every video layer (subtitle-style).
    const textTracks = tracks.filter((t) => t.type === 'text' && !t.hidden);
    textTracks.forEach((track, trackIndex) => {
        const textBaseZ = 1000 + trackIndex * 10;
        for (const clip of track.clips) {
            if (clip.type !== 'text') continue;
            if (time < clip.startTime || time >= clip.startTime + clip.duration) continue;
            layers.push(attachResolved({
                clip,
                opacity: 1,
                localTime: Math.max(0, time - clip.startTime),
                zIndex: textBaseZ,
                trackStyle: track.textStyle,
            }));
        }
    });

    return layers.sort((a, b) => a.zIndex - b.zIndex);
}
