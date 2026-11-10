import type { ClipAnimation, ClipAnimKind, ClipLoopKind } from '../types/timeline';

const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOutBack = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export interface ResolvedClipAnimation {
    /** Multiplied with the layer's own opacity (1 = untouched). */
    opacity: number;
    /** Extra transform (translate/rotate/scale) applied after frame rotation. */
    transform: string;
}

/**
 * Procedural, keyframe-less motion for a media clip at `localTime` seconds:
 * an entrance, an exit, and an optional continuous sinusoidal effect whose
 * travel distance (`amplitude`, 0–1) and oscillation speed (`speed`, Hz) act
 * as the two draggable "handles".
 */
export function resolveClipAnimation(
    animation: ClipAnimation | undefined,
    localTime: number,
    duration: number,
    scale = 1,
): ResolvedClipAnimation {
    const result: ResolvedClipAnimation = { opacity: 1, transform: '' };
    if (!animation) return result;

    const parts: string[] = [];

    // ── Entrance ────────────────────────────────────────────────────────────
    const enter = animation.enter;
    if (enter && enter.motion && enter.motion !== 'none') {
        const enterDuration = Math.max(0.05, enter.duration ?? 0.5);
        const progress = smooth(clamp01(localTime / enterDuration));
        applyMotion(result, parts, enter.motion, progress, scale, false);
    }

    // ── Exit (mirrored entrance during the last `duration` seconds) ────────
    const exit = animation.exit;
    if (exit && exit.motion && exit.motion !== 'none' && Number.isFinite(duration) && duration > 0) {
        const exitDuration = Math.max(0.05, exit.duration ?? 0.5);
        const remaining = duration - localTime;
        if (remaining < exitDuration) {
            const progress = smooth(clamp01(1 - remaining / exitDuration));
            applyMotion(result, parts, exit.motion, progress, scale, true);
        }
    }

    // ── Continuous sinusoidal effect ────────────────────────────────────────
    const loop = animation.loop;
    if (loop && loop.kind && loop.kind !== 'none') {
        const amplitude = Math.min(1, Math.max(0, loop.amplitude ?? 0.5));
        const speed = Math.min(8, Math.max(0.05, loop.speed ?? 0.6));
        const phase = localTime * speed * Math.PI * 2;
        const wave = Math.sin(phase);
        switch (loop.kind) {
            case 'float':
                parts.push(`translateY(${(-amplitude * 26 * scale * wave).toFixed(2)}px)`);
                break;
            case 'pulse':
                parts.push(`scale(${(1 + amplitude * 0.12 * (0.5 - 0.5 * Math.cos(phase))).toFixed(4)})`);
                break;
            case 'sway':
                parts.push(`rotate(${(amplitude * 6 * wave).toFixed(2)}deg)`);
                break;
            case 'shake':
                parts.push(`translateX(${(amplitude * 10 * scale * wave).toFixed(2)}px)`);
                break;
            default:
                break;
        }
    }

    result.transform = parts.join(' ').trim();
    return result;
}

function applyMotion(
    result: ResolvedClipAnimation,
    parts: string[],
    motion: ClipAnimKind,
    progress: number,
    scale: number,
    reversed: boolean,
) {
    // For exits `progress` runs 0→1 while the clip disappears; entrance math
    // is mirrored by inverting progress where needed.
    const p = reversed ? 1 - progress : progress;
    switch (motion) {
        case 'fadeIn':
            result.opacity = Math.min(result.opacity, reversed ? 1 - progress : progress);
            break;
        case 'slideUp':
            result.opacity = Math.min(result.opacity, reversed ? 1 - progress : progress);
            parts.push(`translateY(${((1 - p) * 30 * scale).toFixed(2)}px)`);
            break;
        case 'slideLeft': // slides in from the right edge / out to the left
            result.opacity = Math.min(result.opacity, reversed ? 1 - progress : progress);
            parts.push(`translateX(${((1 - p) * 46 * scale).toFixed(2)}px)`);
            break;
        case 'slideRight': // slides in from the left edge / out to the right
            result.opacity = Math.min(result.opacity, reversed ? 1 - progress : progress);
            parts.push(`translateX(${(-(1 - p) * 46 * scale).toFixed(2)}px)`);
            break;
        case 'zoomIn':
            result.opacity = Math.min(result.opacity, reversed ? 1 - progress : progress);
            parts.push(`scale(${(0.6 + 0.4 * p).toFixed(4)})`);
            break;
        case 'bounceIn':
            result.opacity = Math.min(result.opacity, reversed ? 1 - progress : progress);
            parts.push(`scale(${(0.55 + 0.45 * easeOutBack(clamp01(reversed ? 1 - progress : progress))).toFixed(4)})`);
            break;
        default:
            break;
    }
}

export const CLIP_ANIM_MOTION_LABEL_KEYS: Record<ClipAnimKind, string> = {
    none: 'anim_none',
    fadeIn: 'anim_fadeIn',
    slideUp: 'anim_slideUp',
    slideLeft: 'anim_slideLeft',
    slideRight: 'anim_slideRight',
    zoomIn: 'anim_zoomIn',
    bounceIn: 'anim_bounceIn',
};

export const CLIP_LOOP_LABEL_KEYS: Record<ClipLoopKind, string> = {
    none: 'loop_none',
    float: 'loop_float',
    pulse: 'loop_pulse',
    sway: 'loop_sway',
    shake: 'loop_shake',
};
