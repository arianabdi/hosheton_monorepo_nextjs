export type ClipType = 'video' | 'audio' | 'text' | 'effect' | 'transition';
export type MediaKind = 'video' | 'audio' | 'image';
export type TransitionType = 'crossDissolve';
export type TransitionCurve = 'linear' | 'smooth' | 'easeIn' | 'easeOut';

export const TRANSITION_CLIP_COLOR = '#ec4899';

/** Entry animations for text/caption layers. */
export type TextMotion = 'none' | 'fadeIn' | 'slideUp' | 'pop' | 'typewriter';
/** Exit animations — play reversed at the end of the clip. */
export type TextExitMotion = 'none' | 'fadeOut' | 'slideOutDown' | 'slideOutUp' | 'shrinkOut';
export type TextHAlign = 'left' | 'center' | 'right';

/**
 * Visual style of a text/caption layer. Font size is expressed in px on a
 * 720p-high reference canvas and scaled proportionally at render time.
 */
export interface TextClipStyle {
    fontFamily?: string;
    /** px on a canvas 720px tall. */
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: TextHAlign;
    /** Fill behind the text; '' means none. */
    backgroundColor?: string;
    /** 0–1 opacity for backgroundColor. */
    backgroundOpacity?: number;
    /** Outer glow — rgba/hex color + blur radius in reference px. */
    glowColor?: string;
    glowBlur?: number;
    /** Outline around glyphs. */
    strokeColor?: string;
    strokeWidth?: number;
    motion?: TextMotion;
    /** Seconds the motion animation takes. */
    motionDuration?: number;
    /** Exit animation, played during the last `exitMotionDuration` seconds. */
    exitMotion?: TextExitMotion;
    exitMotionDuration?: number;
    /** Line height multiplier (1 = tight). */
    lineHeight?: number;
}

export const DEFAULT_TEXT_STYLE: Required<Pick<TextClipStyle, 'fontFamily' | 'fontSize' | 'color' | 'align' | 'motion' | 'motionDuration' | 'lineHeight'>> & Pick<TextClipStyle, 'backgroundColor' | 'backgroundOpacity' | 'glowColor' | 'glowBlur' | 'strokeColor' | 'strokeWidth'> = {
    fontFamily: "'Vazirmatn', 'Segoe UI', Tahoma, sans-serif",
    fontSize: 46,
    color: '#ffffff',
    align: 'center',
    motion: 'fadeIn',
    motionDuration: 0.3,
    lineHeight: 1.25,
    backgroundColor: '',
    backgroundOpacity: 0.55,
    glowColor: '',
    glowBlur: 12,
    strokeColor: '#000000',
    strokeWidth: 3,
};

/** Default on-canvas placement for caption rows: lower third, centered. */
export const CAPTION_FRAME: ClipFrame = { x: 0.08, y: 0.74, width: 0.84, height: 0.18 };

export interface ClipFrame {
    /** Normalized position and size inside the preview canvas (0–1).
     *  Values may leave the 0–1 range so media can bleed past the canvas edge. */
    x: number;
    y: number;
    width: number;
    height: number;
    /** Clockwise rotation in degrees, applied around the frame center. */
    rotation?: number;
}

export const FRAME_MIN_SIZE = 0.05;
/** Hard bounds for frame fields (allows bleeding past the canvas). */
export const FRAME_POS_LIMIT = 1;
export const FRAME_SIZE_LIMIT = 2;

/** Easing applied on the segment that starts at a keyframe. `hold` keeps the
 *  keyframe's value constant until the next one (step). */
export type KeyframeEasing = 'linear' | 'smooth' | 'easeIn' | 'easeOut' | 'hold';

/** One value pinned at a moment of the clip. */
export interface ClipKeyframe {
    id: string;
    /** Seconds since clip start (0…duration), millisecond precision. */
    time: number;
    /** Number for value channels, `#rrggbb` for color channels. */
    value: number | string;
    /** Easing of the segment starting at this keyframe. */
    easing?: KeyframeEasing;
}

/** Keyframe channel id (see `utils/keyframe-channels.ts`) → keyframes sorted by time. */
export type ClipKeyframeMap = Record<string, ClipKeyframe[]>;

export interface Clip {
    id: string;
    trackId: string;
    title: string;
    startTime: number;
    duration: number;
    type: ClipType;
    color?: string;
    sourceUrl?: string;
    /** Lightweight ≤480p proxy of `sourceUrl` used for smooth preview playback.
     *  Export ignores it and reads the original source on the server. */
    previewUrl?: string;
    mediaType?: MediaKind;
    /** Workflow node that produced or owns this media. */
    nodeId?: string;
    nodeType?: string;
    transitionType?: TransitionType;
    reversed?: boolean;
    /** 0–1 blend strength for cross-dissolve preview/export */
    transitionIntensity?: number;
    /** Easing curve applied to the dissolve blend */
    transitionCurve?: TransitionCurve;
    /** Offset into the source file (seconds). */
    trimStart?: number;
    /** Full length of the source file (seconds). */
    sourceDuration?: number;
    /** Persistent placement inside the preview/export canvas. */
    frame?: ClipFrame;
    /** Text content — set on `text` clips only. */
    text?: string;
    /** Per-clip style overrides for `text` clips. Sparse on purpose: missing
     *  fields follow the track's shared default (`Track.textStyle`). */
    textStyle?: TextClipStyle;
    /** For auto captions: id of the video clip the caption row belongs to. */
    captionFor?: string;
    /** Procedural motion for media clips: entrance, exit and looping effects. */
    animation?: ClipAnimation;
    /** 0–1 audio volume for video/audio clips (used by export/preview mixing). */
    volume?: number;
    /** Per-parameter keyframe animation: channel id → keyframes sorted by time. */
    keyframes?: ClipKeyframeMap;
}

export interface Track {
    id: string;
    title: string;
    type: ClipType;
    muted: boolean;
    locked: boolean;
    hidden: boolean;
    clips: Clip[];
    /** Text tracks: shared default style. A clip with its own `textStyle`
     *  overrides stops following this default until it is reset. */
    textStyle?: TextClipStyle;
}

/** Entrance/exit motions for media clips (images, videos). */
export type ClipAnimKind = 'none' | 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'bounceIn';
/**
 * Continuous (looping) effects. `float`/`sway`/`shake` are sinusoidal: the
 * "handle" the user drags is `amplitude` (how far it moves) and `speed`
 * (how fast the wave oscillates).
 */
export type ClipLoopKind = 'none' | 'float' | 'pulse' | 'sway' | 'shake';

export interface ClipAnimation {
    enter?: { motion: ClipAnimKind; duration?: number };
    exit?: { motion: ClipAnimKind; duration?: number };
    loop?: { kind: ClipLoopKind; /** 0–1: effect strength / travel distance. */ amplitude?: number; /** cycles per second. */ speed?: number };
}

export type GalleryDragPayload = {
    url: string;
    type: MediaKind;
    label: string;
    nodeId?: string;
    nodeType?: string;
    fileId?: string;
    fileKey?: string;
};

export type TransitionDragPayload = {
    type: TransitionType;
    label: string;
    duration: number;
};

export const GALLERY_MIME = 'application/x-hosheton-media';
export const TRANSITION_MIME = 'application/x-hosheton-transition';
