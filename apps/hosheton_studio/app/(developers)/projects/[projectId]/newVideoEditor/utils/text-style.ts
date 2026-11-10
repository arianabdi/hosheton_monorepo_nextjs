import type { CSSProperties } from 'react';
import type { Clip, TextClipStyle } from '../types/timeline';
import { DEFAULT_TEXT_STYLE } from '../types/timeline';

/** Font sizes are authored against a 720px-high reference canvas. */
export const REFERENCE_TEXT_HEIGHT = 720;

const EASE_OUT_BACK = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

/**
 * CSS for a text layer at `localTime` (seconds into the clip). Entrance and
 * exit motions are resolved here instead of CSS animations so scrubbing and
 * seeking always show the correct frame of the animation. When both entrance
 * and exit are running (very short clip), their effects combine.
 */
export function resolveTextStyle(
    clip: Clip,
    localTime: number,
    scale: number,
    clipDuration?: number,
    trackStyle?: TextClipStyle,
): { style: CSSProperties; content: string } {
    const style = resolveEffectiveTextStyle(trackStyle, clip.textStyle);
    const motionDuration = Math.max(0.05, style.motionDuration ?? DEFAULT_TEXT_STYLE.motionDuration);
    const inProgress = Math.min(1, Math.max(0, localTime / motionDuration));

    // Exit window: the last `exitMotionDuration` seconds of the clip.
    const exitDuration = Math.max(0.05, style.exitMotionDuration ?? motionDuration);
    const remaining = clipDuration != null ? clipDuration - localTime : Number.POSITIVE_INFINITY;
    const outProgress = remaining < exitDuration
        ? Math.min(1, Math.max(0, 1 - remaining / exitDuration))
        : 0;

    const content = style.motion === 'typewriter' && clip.text
        ? clip.text.slice(0, Math.max(1, Math.ceil(clip.text.length * inProgress)))
        : (clip.text || '');

    const css: CSSProperties = {
        fontFamily: style.fontFamily,
        fontSize: `${Math.max(8, (style.fontSize ?? DEFAULT_TEXT_STYLE.fontSize) * scale)}px`,
        color: style.color,
        fontWeight: style.bold ? 700 : 500,
        fontStyle: style.italic ? 'italic' : 'normal',
        textDecoration: style.underline ? 'underline' : 'none',
        textAlign: style.align ?? 'center',
        lineHeight: style.lineHeight ?? DEFAULT_TEXT_STYLE.lineHeight,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    };

    let translate = 0;
    let scaleFx = 1;
    let opacity = 1;

    // Entrance.
    switch (style.motion) {
        case 'fadeIn':
            opacity = Math.min(opacity, inProgress);
            break;
        case 'slideUp':
            opacity = Math.min(opacity, inProgress);
            translate += (1 - inProgress) * 26 * scale;
            break;
        case 'pop':
            opacity = Math.min(opacity, inProgress);
            scaleFx *= 0.55 + 0.45 * EASE_OUT_BACK(inProgress);
            break;
        default:
            break;
    }

    // Exit (entrance+exit overlap is possible on very short rows).
    switch (style.exitMotion) {
        case 'fadeOut':
            opacity = Math.min(opacity, 1 - outProgress);
            break;
        case 'slideOutDown':
            opacity = Math.min(opacity, 1 - outProgress);
            translate += outProgress * 26 * scale;
            break;
        case 'slideOutUp':
            opacity = Math.min(opacity, 1 - outProgress);
            translate -= outProgress * 26 * scale;
            break;
        case 'shrinkOut':
            opacity = Math.min(opacity, 1 - outProgress);
            scaleFx *= 1 - 0.45 * outProgress;
            break;
        default:
            break;
    }

    if (opacity < 1) css.opacity = opacity;
    const transform = `${translate ? `translateY(${translate}px)` : ''} ${scaleFx !== 1 ? `scale(${scaleFx})` : ''}`.trim();
    if (transform) css.transform = transform;

    const shadows: string[] = [];
    if (style.glowColor && style.glowBlur) {
        shadows.push(`0 0 ${style.glowBlur * scale}px ${style.glowColor}`);
        shadows.push(`0 0 ${style.glowBlur * 2.2 * scale}px ${style.glowColor}`);
    }
    if (shadows.length) css.textShadow = shadows.join(', ');
    if (style.strokeColor && style.strokeWidth) {
        (css as CSSProperties & { WebkitTextStroke?: string }).WebkitTextStroke = `${style.strokeWidth * scale}px ${style.strokeColor}`;
        (css as CSSProperties & { paintOrder?: string }).paintOrder = 'stroke fill';
    }
    return { style: css, content };
}

/** Merge a clip's saved style over the defaults. */
export function mergeTextStyle(saved?: TextClipStyle): TextClipStyle {
    return { ...DEFAULT_TEXT_STYLE, ...(saved ?? {}) };
}

/**
 * Effective text style: engine defaults → track shared default → clip
 * overrides → sampled keyframe values. Track and clip styles are sparse;
 * missing fields keep falling through to the layer above them.
 */
export function resolveEffectiveTextStyle(
    trackStyle?: TextClipStyle,
    clipOverrides?: TextClipStyle,
    keyframeOverrides?: Partial<TextClipStyle>,
): TextClipStyle {
    return {
        ...DEFAULT_TEXT_STYLE,
        ...(trackStyle ?? {}),
        ...(clipOverrides ?? {}),
        ...(keyframeOverrides ?? {}),
    };
}

/** True when a clip carries its own overrides (stopped following the track). */
export function hasTextOverrides(clipStyle?: TextClipStyle): boolean {
    return !!clipStyle && Object.keys(clipStyle).length > 0;
}

/** Background pill style (color + opacity) for the caption/text background. */
export function textBackgroundStyle(style: TextClipStyle): CSSProperties {
    if (!style.backgroundColor) return {};
    const opacity = Math.round((style.backgroundOpacity ?? 0.55) * 100);
    return {
        background: `color-mix(in srgb, ${style.backgroundColor} ${opacity}%, transparent)`,
        padding: `${0.18}em ${0.45}em`,
        borderRadius: `${0.16}em`,
    };
}
