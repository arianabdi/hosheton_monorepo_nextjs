import type { Clip, ClipFrame, TextClipStyle } from '../types/timeline';
import { DEFAULT_TEXT_STYLE } from '../types/timeline';
import { resolveClipMediaKind } from './timeline-math';

/**
 * Keyframe channels. A channel is one animatable parameter of a clip
 * (`frame.x`, `opacity`, `text.fontSize`, …). The registry drives both the
 * settings-panel rows and the animation itself, so adding a new animatable
 * parameter only means adding an entry here.
 */
export type KeyframeChannelId =
    | 'frame.x'
    | 'frame.y'
    | 'frame.width'
    | 'frame.height'
    | 'frame.rotation'
    | 'opacity'
    | 'volume'
    | 'text.fontSize'
    | 'text.lineHeight'
    | 'text.backgroundOpacity'
    | 'text.glowBlur'
    | 'text.strokeWidth'
    | 'text.color'
    | 'text.strokeColor'
    | 'text.glowColor'
    | 'text.backgroundColor';

export type KeyframeChannelGroup = 'transform' | 'appearance' | 'text' | 'audio';

export interface KeyframeChannelDef {
    id: KeyframeChannelId;
    /** i18n key (videoEditor namespace) for the row label. */
    labelKey: string;
    group: KeyframeChannelGroup;
    kind: 'number' | 'color';
    /** Bounds in displayed units (see displayScale). */
    min: number;
    max: number;
    step: number;
    /** stored × displayScale = displayed (percent channels use 100). */
    displayScale: number;
    unit?: string;
    /** Used when a color channel is enabled on a clip without a base color. */
    fallbackColor?: string;
    /** Whether this channel can animate the given clip. */
    appliesTo: (clip: Clip) => boolean;
    /** Static value the clip holds when the channel is not keyframed. */
    readBase: (clip: Clip, textStyle?: TextClipStyle) => number | string | undefined;
}

const FRAME_CHANNEL_FIELD_MAP = {
    'frame.x': 'x',
    'frame.y': 'y',
    'frame.width': 'width',
    'frame.height': 'height',
    'frame.rotation': 'rotation',
} as const;

/** Keyframe channels that map onto ClipFrame fields. */
export type FrameKeyframeChannelId = keyof typeof FRAME_CHANNEL_FIELD_MAP;

export const FRAME_CHANNEL_FIELDS: Record<FrameKeyframeChannelId, keyof ClipFrame> = FRAME_CHANNEL_FIELD_MAP;

export const FRAME_CHANNEL_IDS = Object.keys(FRAME_CHANNEL_FIELD_MAP) as FrameKeyframeChannelId[];

/** Channel id → the matching TextClipStyle key (`text.fontSize` → `fontSize`). */
export const TEXT_CHANNEL_STYLE_KEYS: Record<string, keyof TextClipStyle> = {
    'text.fontSize': 'fontSize',
    'text.lineHeight': 'lineHeight',
    'text.backgroundOpacity': 'backgroundOpacity',
    'text.glowBlur': 'glowBlur',
    'text.strokeWidth': 'strokeWidth',
    'text.color': 'color',
    'text.strokeColor': 'strokeColor',
    'text.glowColor': 'glowColor',
    'text.backgroundColor': 'backgroundColor',
};

export function isVisualKeyframeClip(clip: Clip): boolean {
    if (clip.type === 'text') return true;
    return clip.type === 'video' && resolveClipMediaKind(clip) !== 'audio';
}

export function isAudioKeyframeClip(clip: Clip): boolean {
    return clip.type === 'audio' || (clip.type === 'video' && resolveClipMediaKind(clip) === 'audio');
}

const DEFAULT_CLIP_FRAME: ClipFrame = { x: 0, y: 0, width: 1, height: 1 };

export function readFrameBase(clip: Clip, field: keyof ClipFrame): number {
    const frame = clip.frame ?? DEFAULT_CLIP_FRAME;
    return (frame[field] as number | undefined) ?? (DEFAULT_CLIP_FRAME[field] as number);
}

export const KEYFRAME_CHANNELS: KeyframeChannelDef[] = [
    {
        id: 'frame.x',
        labelKey: 'transform_x',
        group: 'transform',
        kind: 'number',
        min: -100,
        max: 100,
        step: 0.5,
        displayScale: 100,
        unit: '%',
        appliesTo: isVisualKeyframeClip,
        readBase: (clip) => readFrameBase(clip, 'x'),
    },
    {
        id: 'frame.y',
        labelKey: 'transform_y',
        group: 'transform',
        kind: 'number',
        min: -100,
        max: 100,
        step: 0.5,
        displayScale: 100,
        unit: '%',
        appliesTo: isVisualKeyframeClip,
        readBase: (clip) => readFrameBase(clip, 'y'),
    },
    {
        id: 'frame.width',
        labelKey: 'transform_width',
        group: 'transform',
        kind: 'number',
        min: 5,
        max: 200,
        step: 0.5,
        displayScale: 100,
        unit: '%',
        appliesTo: isVisualKeyframeClip,
        readBase: (clip) => readFrameBase(clip, 'width'),
    },
    {
        id: 'frame.height',
        labelKey: 'transform_height',
        group: 'transform',
        kind: 'number',
        min: 5,
        max: 200,
        step: 0.5,
        displayScale: 100,
        unit: '%',
        appliesTo: isVisualKeyframeClip,
        readBase: (clip) => readFrameBase(clip, 'height'),
    },
    {
        id: 'frame.rotation',
        labelKey: 'transform_rotate',
        group: 'transform',
        kind: 'number',
        min: -180,
        max: 180,
        step: 1,
        displayScale: 1,
        unit: '°',
        appliesTo: isVisualKeyframeClip,
        readBase: (clip) => readFrameBase(clip, 'rotation'),
    },
    {
        id: 'opacity',
        labelKey: 'kf_channel_opacity',
        group: 'appearance',
        kind: 'number',
        min: 0,
        max: 100,
        step: 1,
        displayScale: 100,
        unit: '%',
        appliesTo: isVisualKeyframeClip,
        readBase: () => 1,
    },
    {
        id: 'volume',
        labelKey: 'kf_channel_volume',
        group: 'audio',
        kind: 'number',
        min: 0,
        max: 100,
        step: 1,
        displayScale: 100,
        unit: '%',
        appliesTo: (clip) => isAudioKeyframeClip(clip),
        readBase: (clip) => (Number.isFinite(clip.volume) ? Number(clip.volume) : 1),
    },
    {
        id: 'text.fontSize',
        labelKey: 'kf_channel_fontSize',
        group: 'text',
        kind: 'number',
        min: 8,
        max: 300,
        step: 1,
        displayScale: 1,
        unit: 'px',
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => style?.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
    },
    {
        id: 'text.lineHeight',
        labelKey: 'kf_channel_lineHeight',
        group: 'text',
        kind: 'number',
        min: 0.8,
        max: 3,
        step: 0.05,
        displayScale: 1,
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => style?.lineHeight ?? DEFAULT_TEXT_STYLE.lineHeight,
    },
    {
        id: 'text.color',
        labelKey: 'kf_channel_color',
        group: 'text',
        kind: 'color',
        min: 0,
        max: 0,
        step: 1,
        displayScale: 1,
        fallbackColor: '#ffffff',
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => style?.color ?? DEFAULT_TEXT_STYLE.color,
    },
    {
        id: 'text.backgroundOpacity',
        labelKey: 'kf_channel_bgOpacity',
        group: 'text',
        kind: 'number',
        min: 0,
        max: 100,
        step: 1,
        displayScale: 100,
        unit: '%',
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => style?.backgroundOpacity ?? DEFAULT_TEXT_STYLE.backgroundOpacity,
    },
    {
        id: 'text.backgroundColor',
        labelKey: 'kf_channel_bgColor',
        group: 'text',
        kind: 'color',
        min: 0,
        max: 0,
        step: 1,
        displayScale: 1,
        fallbackColor: '#000000',
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => {
            const base = style?.backgroundColor ?? DEFAULT_TEXT_STYLE.backgroundColor;
            return base || undefined;
        },
    },
    {
        id: 'text.glowBlur',
        labelKey: 'kf_channel_glowBlur',
        group: 'text',
        kind: 'number',
        min: 0,
        max: 80,
        step: 1,
        displayScale: 1,
        unit: 'px',
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => style?.glowBlur ?? DEFAULT_TEXT_STYLE.glowBlur,
    },
    {
        id: 'text.glowColor',
        labelKey: 'kf_channel_glowColor',
        group: 'text',
        kind: 'color',
        min: 0,
        max: 0,
        step: 1,
        displayScale: 1,
        fallbackColor: '#7dd3fc',
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => {
            const base = style?.glowColor ?? DEFAULT_TEXT_STYLE.glowColor;
            return base || undefined;
        },
    },
    {
        id: 'text.strokeWidth',
        labelKey: 'kf_channel_strokeWidth',
        group: 'text',
        kind: 'number',
        min: 0,
        max: 30,
        step: 0.5,
        displayScale: 1,
        unit: 'px',
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => style?.strokeWidth ?? DEFAULT_TEXT_STYLE.strokeWidth,
    },
    {
        id: 'text.strokeColor',
        labelKey: 'kf_channel_strokeColor',
        group: 'text',
        kind: 'color',
        min: 0,
        max: 0,
        step: 1,
        displayScale: 1,
        fallbackColor: '#000000',
        appliesTo: (clip) => clip.type === 'text',
        readBase: (_clip, style) => style?.strokeColor ?? DEFAULT_TEXT_STYLE.strokeColor,
    },
];

/** Channels this clip can animate, ordered by group. */
export function getKeyframeChannelsForClip(clip: Clip): KeyframeChannelDef[] {
    return KEYFRAME_CHANNELS.filter((channel) => channel.appliesTo(clip));
}

export function getKeyframeChannel(id: string): KeyframeChannelDef | null {
    return KEYFRAME_CHANNELS.find((channel) => channel.id === id) ?? null;
}

export const KEYFRAME_GROUP_ORDER: KeyframeChannelGroup[] = ['transform', 'appearance', 'text', 'audio'];

export function groupLabelKey(group: KeyframeChannelGroup): string {
    switch (group) {
        case 'transform':
            return 'transform_title';
        case 'appearance':
            return 'kf_group_appearance';
        case 'text':
            return 'kf_group_text';
        case 'audio':
            return 'kf_group_audio';
    }
}
