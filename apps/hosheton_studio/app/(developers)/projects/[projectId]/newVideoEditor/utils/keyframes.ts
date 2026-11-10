import type {
    Clip,
    ClipKeyframe,
    ClipKeyframeMap,
    KeyframeEasing,
    TextClipStyle,
} from '../types/timeline';

/** Keyframe times are stored with millisecond precision so two keyframes
 *  edited at "the same" playhead position always merge into one. */
export const KEYFRAME_TIME_DECIMALS = 3;

export function roundKeyframeTime(time: number): number {
    const factor = 10 ** KEYFRAME_TIME_DECIMALS;
    return Math.round(time * factor) / factor;
}

export type ResolvedKeyframeValues = Record<string, number | string>;

// ─── Easing ──────────────────────────────────────────────────────────────────

export const KEYFRAME_EASINGS: KeyframeEasing[] = ['linear', 'smooth', 'easeIn', 'easeOut', 'hold'];

export function applyEasing(t: number, easing: KeyframeEasing | undefined): number {
    const x = Math.min(1, Math.max(0, t));
    switch (easing) {
        case 'smooth':
            return x * x * (3 - 2 * x);
        case 'easeIn':
            return x * x;
        case 'easeOut':
            return 1 - (1 - x) * (1 - x);
        case 'hold':
            return 0;
        case 'linear':
        default:
            return x;
    }
}

// ─── Value interpolation ─────────────────────────────────────────────────────

/** Parse `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` → [r, g, b]; null otherwise. */
export function parseHexColor(color: unknown): [number, number, number] | null {
    if (typeof color !== 'string') return null;
    const hex = color.trim().replace(/^#/, '');
    if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) return null;
    if (hex.length === 3 || hex.length === 4) {
        return [
            parseInt(hex[0] + hex[0], 16),
            parseInt(hex[1] + hex[1], 16),
            parseInt(hex[2] + hex[2], 16),
        ];
    }
    if (hex.length === 6 || hex.length === 8) {
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16),
        ];
    }
    return null;
}

const toHex2 = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');

export function isHexColor(value: unknown): value is string {
    return typeof value === 'string' && parseHexColor(value) !== null;
}

function lerpKeyframeValue(a: number | string, b: number | string, p: number): number | string {
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * p;
    const ca = parseHexColor(a);
    const cb = parseHexColor(b);
    if (ca && cb) {
        return `#${toHex2(ca[0] + (cb[0] - ca[0]) * p)}${toHex2(ca[1] + (cb[1] - ca[1]) * p)}${toHex2(ca[2] + (cb[2] - ca[2]) * p)}`;
    }
    // Non-interpolatable values switch at the segment midpoint.
    return p < 0.5 ? a : b;
}

/**
 * Value of a keyframe track at `time` (seconds since clip start). Before the
 * first / after the last keyframe the edge value is held. The easing stored on
 * a keyframe shapes the segment that starts at it.
 */
export function sampleKeyframeChannel(kfs: ClipKeyframe[], time: number): number | string | null {
    if (!kfs.length) return null;
    if (time <= kfs[0].time) return kfs[0].value;
    const last = kfs[kfs.length - 1];
    if (time >= last.time) return last.value;

    let index = 0;
    while (index < kfs.length - 2 && kfs[index + 1].time <= time) index++;
    const a = kfs[index];
    const b = kfs[index + 1];
    if (!b) return a.value;

    const span = b.time - a.time;
    const raw = span > 0 ? (time - a.time) / span : 1;
    return lerpKeyframeValue(a.value, b.value, applyEasing(raw, a.easing));
}

/** Keyframe of a channel sitting exactly at `time` (millisecond precision). */
export function getKeyframeAtTime(kfs: ClipKeyframe[] | undefined, time: number): ClipKeyframe | null {
    if (!kfs?.length) return null;
    const t = roundKeyframeTime(time);
    return kfs.find((kf) => roundKeyframeTime(kf.time) === t) ?? null;
}

/** Sample every animated channel of a clip; null when the clip has none. */
export function resolveClipKeyframeValues(
    clip: Pick<Clip, 'keyframes'>,
    localTime: number,
): ResolvedKeyframeValues | null {
    const map = clip.keyframes;
    if (!map) return null;
    let resolved: ResolvedKeyframeValues | null = null;
    for (const [channel, kfs] of Object.entries(map)) {
        if (!kfs?.length) continue;
        const value = sampleKeyframeChannel(kfs, localTime);
        if (value === null) continue;
        (resolved ??= {})[channel] = value;
    }
    return resolved;
}

/** All keyframe times present on any channel, sorted, duplicates merged. */
export function unionKeyframeTimes(map: ClipKeyframeMap | undefined): number[] {
    if (!map) return [];
    const times = new Set<number>();
    for (const kfs of Object.values(map)) {
        kfs?.forEach((kf) => times.add(roundKeyframeTime(kf.time)));
    }
    return [...times].sort((a, b) => a - b);
}

export function countClipKeyframes(map: ClipKeyframeMap | undefined): number {
    if (!map) return 0;
    let count = 0;
    for (const kfs of Object.values(map)) count += kfs?.length ?? 0;
    return count;
}

/** Drop empty channels; undefined when nothing remains. */
export function compactKeyframeMap(map: ClipKeyframeMap | undefined): ClipKeyframeMap | undefined {
    if (!map) return undefined;
    const next: ClipKeyframeMap = {};
    for (const [channel, kfs] of Object.entries(map)) {
        if (kfs?.length) next[channel] = kfs;
    }
    return Object.keys(next).length ? next : undefined;
}

const NUMBER_MAX = 1e6;

/**
 * Defensive cleanup for data coming from storage / snapshots: keeps only
 * well-formed keyframes, sorts by time, clamps times into [0, duration].
 */
export function sanitizeClipKeyframes(
    map: unknown,
    clipDuration: number,
): ClipKeyframeMap | undefined {
    if (!map || typeof map !== 'object') return undefined;
    const maxTime = Math.max(0, Number.isFinite(clipDuration) ? clipDuration : NUMBER_MAX);
    const next: ClipKeyframeMap = {};

    for (const [channel, rawList] of Object.entries(map as Record<string, unknown>)) {
        if (!channel || !Array.isArray(rawList)) continue;
        const cleaned: ClipKeyframe[] = [];
        for (const raw of rawList) {
            if (!raw || typeof raw !== 'object') continue;
            const candidate = raw as Partial<ClipKeyframe>;
            const time = Number(candidate.time);
            if (!Number.isFinite(time)) continue;
            const value = candidate.value;
            const validValue = typeof value === 'number'
                ? Number.isFinite(value)
                : typeof value === 'string';
            if (!validValue) continue;
            cleaned.push({
                id: typeof candidate.id === 'string' && candidate.id
                    ? candidate.id
                    : `kf-${Math.random().toString(36).slice(2, 10)}`,
                time: Math.min(maxTime, Math.max(0, roundKeyframeTime(time))),
                value: value as number | string,
                ...(KEYFRAME_EASINGS.includes(candidate.easing as KeyframeEasing)
                    ? { easing: candidate.easing as KeyframeEasing }
                    : {}),
            });
        }
        if (!cleaned.length) continue;
        cleaned.sort((a, b) => a.time - b.time);
        next[channel] = cleaned;
    }

    return Object.keys(next).length ? next : undefined;
}

// ─── Edit helpers (split / trim keep keyframes glued to the media) ──────────

const newKeyframeId = () => `kf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Split a keyframe map at `at` (seconds into the clip). The sampled value at
 * the cut becomes a boundary keyframe on both halves, so the animation stays
 * visually identical before and after the split.
 */
export function splitClipKeyframes(
    map: ClipKeyframeMap | undefined,
    at: number,
): { first?: ClipKeyframeMap; second?: ClipKeyframeMap } {
    if (!map) return {};
    const cut = Math.min(Math.max(0, at), NUMBER_MAX);
    const first: ClipKeyframeMap = {};
    const second: ClipKeyframeMap = {};

    for (const [channel, list] of Object.entries(map)) {
        if (!list?.length) continue;
        const before = list.filter((kf) => kf.time < cut);
        const after = list.filter((kf) => kf.time > cut);
        const boundaryValue = sampleKeyframeChannel(list, cut);
        if (boundaryValue === null) continue;
        // The boundary keyframe pins the held value on the side that has no
        // keyframes of its own, keeping both halves visually identical.
        first[channel] = [...before, { id: newKeyframeId(), time: roundKeyframeTime(cut), value: boundaryValue }];
        second[channel] = [
            { id: newKeyframeId(), time: 0, value: boundaryValue },
            ...after.map((kf) => ({ ...kf, time: roundKeyframeTime(kf.time - cut) })),
        ];
    }

    return {
        first: Object.keys(first).length ? first : undefined,
        second: Object.keys(second).length ? second : undefined,
    };
}

/**
 * Trim-left by `trimDelta` seconds: shift keyframes with the media, drop the
 * ones that fell off the head, and pin the entry value so the animation
 * continues seamlessly from the new start.
 */
export function shiftClipKeyframesForTrimLeft(
    map: ClipKeyframeMap | undefined,
    trimDelta: number,
    duration: number,
): ClipKeyframeMap | undefined {
    if (!map || trimDelta <= 0) return map;
    const next: ClipKeyframeMap = {};

    for (const [channel, list] of Object.entries(map)) {
        if (!list?.length) continue;
        const entryValue = sampleKeyframeChannel(list, trimDelta);
        const shifted = list
            .map((kf) => ({ ...kf, time: roundKeyframeTime(kf.time - trimDelta) }))
            .filter((kf) => kf.time > 0 && kf.time <= duration);
        if (entryValue !== null) {
            shifted.unshift({ id: newKeyframeId(), time: 0, value: entryValue });
        }
        if (shifted.length) next[channel] = shifted;
    }

    return Object.keys(next).length ? next : undefined;
}

/** Drop keyframes past the (shortened) clip end. */
export function clampClipKeyframesToDuration(
    map: ClipKeyframeMap | undefined,
    duration: number,
): ClipKeyframeMap | undefined {
    if (!map) return map;
    const next: ClipKeyframeMap = {};
    for (const [channel, list] of Object.entries(map)) {
        const kept = (list ?? []).filter((kf) => kf.time <= duration);
        if (kept.length) next[channel] = kept;
    }
    return Object.keys(next).length ? next : undefined;
}

// ─── Preview helpers ─────────────────────────────────────────────────────────

export function resolvedNumber(
    resolved: ResolvedKeyframeValues | null | undefined,
    channel: string,
    fallback: number,
): number {
    const value = resolved?.[channel];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Map sampled keyframe values onto text-style overrides (highest precedence). */
export function textStyleOverridesFromResolved(
    resolved: ResolvedKeyframeValues | null | undefined,
): Partial<TextClipStyle> | undefined {
    if (!resolved) return undefined;
    const overrides: Partial<TextClipStyle> = {};
    const textChannels: Array<[string, keyof TextClipStyle]> = [
        ['text.fontSize', 'fontSize'],
        ['text.lineHeight', 'lineHeight'],
        ['text.backgroundOpacity', 'backgroundOpacity'],
        ['text.glowBlur', 'glowBlur'],
        ['text.strokeWidth', 'strokeWidth'],
        ['text.color', 'color'],
        ['text.strokeColor', 'strokeColor'],
        ['text.glowColor', 'glowColor'],
        ['text.backgroundColor', 'backgroundColor'],
    ];
    for (const [channel, key] of textChannels) {
        const value = resolved[channel];
        if (value === undefined) continue;
        (overrides as Record<string, unknown>)[key] = value;
    }
    return Object.keys(overrides).length ? overrides : undefined;
}
