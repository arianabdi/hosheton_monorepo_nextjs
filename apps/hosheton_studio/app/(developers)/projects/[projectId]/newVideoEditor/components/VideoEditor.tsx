'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';
import {
    LuMoon, LuSun, LuPlay, LuPause, LuScissors, LuTrash2,
    LuUndo2, LuRedo2, LuCopy, LuClipboardPaste, LuZoomIn, LuZoomOut, LuPlus, LuArrowLeftRight,
    LuBot, LuClapperboard, LuGalleryVerticalEnd, LuSettings2, LuMonitorPlay,
    LuScrollText, LuCircleFadingArrowUp, LuSquare, LuSkipBack, LuSkipForward,
    LuType, LuCaptions, LuBaseline, LuChevronDown, LuFilm, LuMusic, LuRatio,
    LuUpload, LuMaximize2, LuImagePlus,
} from 'react-icons/lu';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useTranslation } from 'react-i18next';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import { useMediaStudioSocket } from '@/app/(developers)/projects/hooks/useMediaStudioSocket';
import type { MediaJobLog } from '@/app/(developers)/projects/types/media-api';
import { Clip, ClipFrame, ClipType, GalleryDragPayload, GALLERY_MIME, Track, TRANSITION_MIME, TRANSITION_CLIP_COLOR, TransitionDragPayload, FRAME_POS_LIMIT, FRAME_SIZE_LIMIT, TextClipStyle, CAPTION_FRAME, ClipAnimation } from '../types/timeline';
import { AudioWaveform } from './Timeline/AudioWaveform';
import styles from './Timeline/Timeline.module.scss';
import MediaSidebar from '@/app/(developers)/projects/[projectId]/newVideoEditor/components/MediaSidebar/MediaSidebar';
import { NodeSettingsPanel } from '@/app/(developers)/projects/components/NodeSettingsPanel';
import { TransitionSettingsPanel } from '@/app/(developers)/projects/[projectId]/newVideoEditor/components/TransitionSettingsPanel';
import { VideoEditorExportPanel } from '@/app/(developers)/projects/[projectId]/newVideoEditor/components/VideoEditorExportPanel';
import { ProcessLogPanel } from '@/app/(developers)/projects/[projectId]/components/ProcessLogPanel/ProcessLogPanel';
import { NavbarSaveButton } from '@/app/(developers)/projects/[projectId]/components/NavbarSaveButton/NavbarSaveButton';
import {
    MobileEditorScreen,
    MobileField,
    MobileSegmented,
    MobileToolBar,
    MobileDoneButton,
    MobileToolButton,
    mobileEditorStyles as mStyles,
} from './MobileEditor/MobileEditor';
import PreviewPlayer, { PLAYER_SEEK_STEP_S } from './PreviewPlayer/PreviewPlayer';
import { useTimelineHistory } from '../hooks/useTimelineHistory';
import TextStyleControls from './TextStyleControls/TextStyleControls';
import CaptionStudioModal, { type CaptionSegmentDraft } from './CaptionStudio/CaptionStudioModal';
import {
    useEditorLayout,
    type DockTabId,
    type SingletonPanelId,
} from '../hooks/useEditorLayout';
import { contentFromKey } from '../utils/dock-layout';
import DockLayout from './DockLayout/DockLayout';
import FloatingPanel from './FloatingPanel/FloatingPanel';
import PanelLayoutMenu from './PanelLayoutMenu/PanelLayoutMenu';
import EditorChatPanel from './EditorChat/EditorChatPanel';
import ClipTransformControls from './ClipTransformControls/ClipTransformControls';
import type {
    AgentClipAnimationSpec,
    AgentCommand,
    AgentCommandResult,
    AgentEditorSnapshot,
    AgentFramePatch,
} from '../utils/editor-agent-commands';
import { createClipSnapper, calculateSnap } from '../utils/snapping';
import { probeMediaDuration } from '../utils/media-duration';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { isModLetter } from '@/app/(developers)/projects/lib/keyboard-shortcut';
import { nodeCatalogApi } from '@/app/(developers)/projects/lib/node-catalog-api';
import { deserializeWorkflow } from '@/app/(developers)/projects/lib/workflow-serializer';
import {
    DEFAULT_VIDEO_EDITOR_CANVAS,
    clampProjectDuration,
    deserializeVideoEditorCanvas,
    deserializeVideoEditor,
    serializeVideoEditor,
    serializeVideoEditorSignature,
    type VideoEditorCanvasSettings,
} from '@/app/(developers)/projects/lib/video-editor-serializer';
import { createVideoEditorSnapshot, getVideoEditorSnapshot } from '../utils/editor-agent-api';
import { useAutoSaveVideoEditor } from '@/app/(developers)/projects/hooks/useAutoSaveVideoEditor';
import { useMediaStudio } from '@/app/(developers)/projects/context/MediaStudioContext';
import { useStudioExploreStore } from '@/app/zustand/store/useStudioExploreStore';
import type { NodeCatalogEntry } from '@/app/(developers)/projects/types/node-catalog';
import type { StudioNodeData } from '@/app/(developers)/projects/[projectId]/types/studio';
import {
    MIN_CLIP_DURATION,
    DEFAULT_IMAGE_DURATION,
    DEFAULT_MEDIA_DURATION,
    canClipMoveToTrack,
    clipColors,
    clipTypeFromMedia,
    computeTotalDuration,
    resolveTrackIdFromPoint,
    timeFromPointer,
    trackAcceptsMedia,
    trackAcceptsTransition,
} from '../utils/timeline-math';
import { isTransitionClip, MIN_TRANSITION_DURATION, snapTransitionToTrackCut } from '../utils/transition-utils';
import { hasTextOverrides, resolveEffectiveTextStyle, resolveTextStyle, textBackgroundStyle } from '../utils/text-style';
import { resolveClipAnimation } from '../utils/clip-animation';
import ClipAnimationControls from './ClipAnimationControls/ClipAnimationControls';
import ClipKeyframeControls from './ClipKeyframeControls/ClipKeyframeControls';
import {
    clampClipKeyframesToDuration,
    compactKeyframeMap,
    isHexColor,
    resolveClipKeyframeValues,
    resolvedNumber,
    roundKeyframeTime,
    shiftClipKeyframesForTrimLeft,
    splitClipKeyframes,
    textStyleOverridesFromResolved,
    unionKeyframeTimes,
} from '../utils/keyframes';
import type { ClipKeyframeMap, KeyframeEasing } from '../types/timeline';
import {
    FRAME_CHANNEL_FIELDS,
    FRAME_CHANNEL_IDS,
    TEXT_CHANNEL_STYLE_KEYS,
    getKeyframeChannelsForClip,
    type FrameKeyframeChannelId,
    type KeyframeChannelDef,
    type KeyframeChannelId,
} from '../utils/keyframe-channels';
import { setVideoSource, resolveMediaUrl } from '../utils/media-url';
import { computePreviewLayers, type PreviewLayer } from '../utils/preview-compositor';
import { resolveClipMediaKind } from '../utils/timeline-math';

function createInitialTracks(t: (key: string, options?: Record<string, unknown>) => string): Track[] {
    return [
        {
            id: 't-v1',
            title: t('video_n', { index: 1 }),
            type: 'video',
            muted: false,
            locked: false,
            hidden: false,
            clips: [],
        },
        {
            id: 't-a1',
            title: t('audio_n', { index: 1 }),
            type: 'audio',
            muted: false,
            locked: false,
            hidden: false,
            clips: [],
        },
    ];
}

type VideoEditorProps = {
    projectId: string;
};

const DEFAULT_CLIP_FRAME: ClipFrame = { x: 0, y: 0, width: 1, height: 1 };
const MIN_FRAME_SIZE = 0.08;

const CANVAS_PRESETS: Array<VideoEditorCanvasSettings & { label: string }> = [
    { label: '16:9', width: 1280, height: 720 },
    { label: '9:16', width: 720, height: 1280 },
    { label: '1:1', width: 1080, height: 1080 },
    { label: '4:3', width: 1280, height: 960 },
];

function getClipFrame(clip: Clip): ClipFrame {
    return clip.frame ?? DEFAULT_CLIP_FRAME;
}

/** Frame as shown at `localTime`: keyframed channels override the base values. */
function displayFrameAt(clip: Clip, localTime: number): ClipFrame {
    const base = getClipFrame(clip);
    const resolved = resolveClipKeyframeValues(clip, localTime);
    if (!resolved) return base;
    return {
        x: resolvedNumber(resolved, 'frame.x', base.x),
        y: resolvedNumber(resolved, 'frame.y', base.y),
        width: resolvedNumber(resolved, 'frame.width', base.width),
        height: resolvedNumber(resolved, 'frame.height', base.height),
        rotation: resolvedNumber(resolved, 'frame.rotation', base.rotation ?? 0),
    };
}

/** Clamp an agent-supplied frame patch onto a base frame (same bounds as setClipFrame). */
function resolveAgentFrame(patch: AgentFramePatch, base: ClipFrame): ClipFrame {
    const width = Math.min(FRAME_SIZE_LIMIT, Math.max(MIN_FRAME_SIZE, Number(patch.width) || base.width));
    const height = Math.min(FRAME_SIZE_LIMIT, Math.max(MIN_FRAME_SIZE, Number(patch.height) || base.height));
    const frame: ClipFrame = {
        x: Math.min(FRAME_POS_LIMIT, Math.max(-FRAME_POS_LIMIT, Number(patch.x) || base.x)),
        y: Math.min(FRAME_POS_LIMIT, Math.max(-FRAME_POS_LIMIT, Number(patch.y) || base.y)),
        width,
        height,
    };
    const rotation = Number(patch.rotation);
    if (Number.isFinite(rotation) && rotation !== 0) frame.rotation = rotation;
    return frame;
}

/** Normalize an inline animation spec from an add command into a ClipAnimation. */
function resolveAgentAnimation(spec: AgentClipAnimationSpec): ClipAnimation {
    const animation: ClipAnimation = {};
    if (spec.enter) {
        animation.enter = {
            motion: spec.enter.motion,
            ...(spec.enter.duration != null ? { duration: Number(spec.enter.duration) } : {}),
        };
    }
    if (spec.exit) {
        animation.exit = {
            motion: spec.exit.motion,
            ...(spec.exit.duration != null ? { duration: Number(spec.exit.duration) } : {}),
        };
    }
    if (spec.loop) {
        animation.loop = {
            kind: spec.loop.kind,
            ...(spec.loop.amplitude != null ? { amplitude: Number(spec.loop.amplitude) } : {}),
            ...(spec.loop.speed != null ? { speed: Number(spec.loop.speed) } : {}),
        };
    }
    return animation;
}

function previewLayerStyle(layer: PreviewLayer): React.CSSProperties {
    const frame = displayFrameOf(layer);
    return {
        inset: 'auto',
        left: `${frame.x * 100}%`,
        top: `${frame.y * 100}%`,
        width: `${frame.width * 100}%`,
        height: `${frame.height * 100}%`,
        transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined,
        opacity: layer.opacity * resolvedNumber(layer.resolved, 'opacity', 1),
        zIndex: layer.zIndex,
        margin: 0,
    };
}

/** Frame a layer renders with at its local time — keyframed channels override
 *  the base frame. The selection box uses this too so it rides along with
 *  keyframed motion instead of lagging on the static frame. */
function displayFrameOf(layer: PreviewLayer): ClipFrame {
    const base = getClipFrame(layer.clip);
    const resolved = layer.resolved;
    if (!resolved) return base;
    return {
        x: resolvedNumber(resolved, 'frame.x', base.x),
        y: resolvedNumber(resolved, 'frame.y', base.y),
        width: resolvedNumber(resolved, 'frame.width', base.width),
        height: resolvedNumber(resolved, 'frame.height', base.height),
        rotation: resolvedNumber(resolved, 'frame.rotation', base.rotation ?? 0),
    };
}

/**
 * Composited media-layer style at its local time: keyframed frame + procedural
 * (enter/exit/loop) motion. Shared by the React render path and the rAF
 * transport paint so both stay pixel-identical.
 */
function composeMediaLayerStyle(layer: PreviewLayer, motionScale: number): React.CSSProperties {
    const base = previewLayerStyle(layer);
    const animation = resolveClipAnimation(layer.clip.animation, layer.localTime, layer.clip.duration, motionScale);
    const transform = [base.transform, animation.transform].filter(Boolean).join(' ');
    return {
        ...base,
        opacity: (typeof base.opacity === 'number' ? base.opacity : 1) * animation.opacity,
        ...(transform ? { transform } : {}),
    };
}

/** Inline style keys the rAF transport repaints every frame. */
const TRANSPORT_STYLE_KEYS = ['left', 'top', 'width', 'height', 'transform', 'opacity'] as const;

function paintElementStyles(el: HTMLElement, style: React.CSSProperties) {
    for (const key of TRANSPORT_STYLE_KEYS) {
        const value = style[key];
        if (value !== undefined) {
            (el.style as unknown as Record<string, string | number>)[key] = value;
        }
    }
}

/**
 * Throttled media seeking. A native `currentTime` write forces the decoder to
 * the nearest keyframe, so firing one per pointermove/heartbeat is what made
 * scrubbing stutter. Seeks are capped at one per interval, with a trailing
 * seek that lands exactly on the latest requested position.
 */
function createMediaSeeker(minIntervalMs = 45) {
    const lastSeekAt = new WeakMap<HTMLVideoElement, number>();
    const pendingTimers = new Map<HTMLVideoElement, ReturnType<typeof setTimeout>>();
    const pendingTarget = new Map<HTMLVideoElement, number>();

    return (video: HTMLVideoElement, time: number, immediate = false) => {
        if (video.readyState < 1) return;
        if (Number.isFinite(video.duration) && video.duration > 0) {
            time = Math.min(Math.max(0, time), video.duration - 0.01);
        }

        const apply = (target: number) => {
            lastSeekAt.set(video, performance.now());
            try {
                video.currentTime = target;
            } catch {
                /* element detached between schedule and run — ignored */
            }
        };

        const now = performance.now();
        const elapsed = now - (lastSeekAt.get(video) ?? -Infinity);
        const scheduled = pendingTimers.get(video);
        if (immediate || elapsed >= minIntervalMs) {
            if (scheduled !== undefined) {
                clearTimeout(scheduled);
                pendingTimers.delete(video);
                pendingTarget.delete(video);
            }
            apply(time);
            return;
        }
        pendingTarget.set(video, time);
        if (scheduled === undefined) {
            pendingTimers.set(video, setTimeout(() => {
                pendingTimers.delete(video);
                const target = pendingTarget.get(video);
                pendingTarget.delete(video);
                if (target !== undefined) apply(target);
            }, minIntervalMs - elapsed));
        }
    };
}

/** React commits during playback/scrub are throttled to this heartbeat; the
 *  rAF transport paints everything else straight to the DOM at display rate. */
const TRANSPORT_HEARTBEAT_MS = 120;
/** Drift beyond this while playing forces a resync of the video element. */
const PLAYBACK_DRIFT_LIMIT_S = 0.15;
/** Paused-frame matching tolerance (≈ one 30fps frame). */
const PAUSED_SYNC_EPSILON_S = 1 / 30;

function formatTimecode(value: number) {
    const total = Math.max(0, value);
    const minutes = Math.floor(total / 60);
    const seconds = total - minutes * 60;
    return minutes > 0
        ? `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`
        : seconds.toFixed(1);
}

function PreviewMediaLayer({
    layer,
    motionScale,
    onSelect,
    registerVideoEl,
    onMediaReady,
}: {
    layer: PreviewLayer;
    /** Preview stage height ÷ canvas height — scales motion distances. */
    motionScale: number;
    onSelect: (clipId: string) => void;
    /** Hands the <video> element to the rAF transport (play/pause/seek owner). */
    registerVideoEl: (clipId: string, el: HTMLVideoElement | null) => void;
    /** Repaint the current frame once the element can show its first frame. */
    onMediaReady: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { t } = useTranslation('videoEditor');
    const mediaKind = resolveClipMediaKind(layer.clip);
    // Lightweight proxy (≤480p) transcoded once by the API keeps preview decode
    // cheap; export always reads the original `sourceUrl` on the server.
    const previewSource = layer.clip.previewUrl || layer.clip.sourceUrl;

    useEffect(() => {
        const video = videoRef.current;
        if (!video || mediaKind !== 'video' || !previewSource) return;

        registerVideoEl(layer.clip.id, video);
        video.addEventListener('loadeddata', onMediaReady);
        return () => {
            video.removeEventListener('loadeddata', onMediaReady);
            registerVideoEl(layer.clip.id, null);
        };
    }, [layer.clip.id, mediaKind, onMediaReady, previewSource, registerVideoEl]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || mediaKind !== 'video' || !previewSource) return;

        setVideoSource(video, previewSource);
        // Keyframed/static volume — the preview element stays muted (existing
        // behavior), the value is honored by the export pipeline.
        video.volume = Math.min(1, Math.max(0, resolvedNumber(layer.resolved, 'volume', layer.clip.volume ?? 1)));
    }, [layer.clip.volume, layer.resolved, mediaKind, previewSource]);

    if (!previewSource) return null;
    // Composited style (keyframed frame + procedural motion) — identical to
    // what the transport paints per frame, so drags/heartbeats never jump.
    const gestureProps = {
        'data-clip-id': layer.clip.id,
        style: composeMediaLayerStyle(layer, motionScale),
        pointerEvents: 'auto' as const,
        cursor: 'pointer' as const,
        onPointerDown: (event: React.PointerEvent) => {
            event.stopPropagation();
            onSelect(layer.clip.id);
        },
    };
    if (mediaKind === 'image') {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={resolveMediaUrl(previewSource)}
                alt={layer.clip.title || t('preview')}
                className={styles.previewLayer}
                {...gestureProps}
            />
        );
    }
    if (mediaKind !== 'video') return null;

    return (
        <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            className={styles.previewLayer}
            {...gestureProps}
        />
    );
}

const REFERENCE_TEXT_HEIGHT = 720;

function PreviewTextLayer({
    layer,
    canvasHeightPx,
    selected,
    onSelect,
    onDrag,
}: {
    layer: PreviewLayer;
    canvasHeightPx: number;
    selected: boolean;
    onSelect: (clipId: string) => void;
    /** Drag the text body directly once it is already selected. */
    onDrag: (event: React.PointerEvent) => void;
}) {
    const scale = Math.max(0.15, canvasHeightPx / REFERENCE_TEXT_HEIGHT);
    const { style, content } = resolveTextStyle(layer.clip, layer.localTime, scale, layer.clip.duration, layer.trackStyle);
    // Keyframed text parameters (fontSize, colors, …) sit above every static style.
    const textStyle = resolveEffectiveTextStyle(
        layer.trackStyle,
        layer.clip.textStyle,
        textStyleOverridesFromResolved(layer.resolved),
    );
    const justify = textStyle.align === 'left' ? 'flex-start' : textStyle.align === 'right' ? 'flex-end' : 'center';

    return (
        <div
            data-clip-id={layer.clip.id}
            className={styles.previewTextLayer}
            style={{
                ...previewLayerStyle(layer),
                display: 'flex',
                alignItems: 'center',
                justifyContent: justify,
                pointerEvents: 'auto',
                cursor: selected ? 'move' : 'pointer',
            }}
            onPointerDown={(event) => {
                event.stopPropagation();
                if (selected) {
                    onDrag(event);
                } else {
                    onSelect(layer.clip.id);
                }
            }}
        >
            <span style={{ ...style, ...textBackgroundStyle(textStyle) }}>
                {content || layer.clip.title}
            </span>
        </div>
    );
}

type DragMode =
    | { kind: 'move'; clipId: string; trackId: string; startX: number; originalStart: number; duration: number }
    | { kind: 'trim-left'; clipId: string; trackId: string; startX: number; originalStart: number; originalDuration: number; originalTrimStart: number; sourceDuration: number }
    | { kind: 'trim-right'; clipId: string; trackId: string; startX: number; originalDuration: number; trimStart: number; sourceDuration: number }
    | { kind: 'scrub'; startX: number; originTime: number };

/** Desktop dock tabs that open as full-screen pages on mobile. */
type MobileScreen = 'media' | 'settings' | 'export' | 'logs' | 'chat';

/** Phone split between preview and timeline (px). */
const MOBILE_TIMELINE_MIN = 120;
const MOBILE_PREVIEW_MIN = 140;
const MOBILE_TIMELINE_HEIGHT_KEY = 'hosheton.videoEditor.mobileTimelineHeight';

function readStoredTimelineHeight(): number | null {
    if (typeof window === 'undefined') return null;
    try {
        const value = Number(window.localStorage.getItem(MOBILE_TIMELINE_HEIGHT_KEY));
        return Number.isFinite(value) && value >= MOBILE_TIMELINE_MIN ? value : null;
    } catch {
        return null;
    }
}

function storeTimelineHeight(height: number) {
    try {
        window.localStorage.setItem(MOBILE_TIMELINE_HEIGHT_KEY, String(Math.round(height)));
    } catch {
        /* storage blocked — the split just resets next visit */
    }
}

/** Largest canvas-ratio box inside the preview container (12px inset). */
function fitPreviewSize(rect: { width: number; height: number }, canvasWidth: number, canvasHeight: number) {
    const availableWidth = Math.max(1, rect.width - 24);
    const availableHeight = Math.max(1, rect.height - 24);
    const ratio = canvasWidth / canvasHeight;
    const width = Math.min(availableWidth, availableHeight * ratio);
    return { width, height: width / ratio };
}

export default function VideoEditor({ projectId }: VideoEditorProps) {
    const { t, i18n } = useTranslation('videoEditor');
    const { t: tp } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const theme = useAppStore((state) => state.theme);
    const setTheme = useAppStore((state) => state.setTheme);
    const { setSelectedNodeId, registerNodePatcher } = useMediaStudio();

    const initialTracks = useMemo(() => createInitialTracks(t), [t]);

    const {
        tracks,
        setTracks,
        setTracksSilent,
        beginHistoryGesture,
        resetTracks,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useTimelineHistory(initialTracks);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [catalog, setCatalog] = useState<NodeCatalogEntry[]>([]);

    const catalogByType = useMemo(() => {
        const map = new Map<string, NodeCatalogEntry>();
        catalog.forEach((entry) => map.set(entry.type, entry));
        return map;
    }, [catalog]);

    const {
        finishHydration,
        scheduleSave,
        saveNow,
        saveStatus,
        saveError,
    } = useAutoSaveVideoEditor(projectId);

    const [currentTime, setCurrentTime] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(40);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
    const [activeSnapLine, setActiveSnapLine] = useState<number | null>(null);
    const [dropTrackId, setDropTrackId] = useState<string | null>(null);
    const [liveLogs, setLiveLogs] = useState<MediaJobLog[]>([]);
    const [focusExportRunId, setFocusExportRunId] = useState<string | null>(null);
    const [canvas, setCanvas] = useState<VideoEditorCanvasSettings>(DEFAULT_VIDEO_EDITOR_CANVAS);
    const [previewCanvasSize, setPreviewCanvasSize] = useState({ width: 0, height: 0 });
    /** Extra timeline seconds revealed by scrolling past the content end. */
    const [extraDuration, setExtraDuration] = useState(0);
    const [captionStudioOpen, setCaptionStudioOpen] = useState(false);
    /** "Deck line": dashed guide showing where the active text sits (default on). */
    const [showTextDeckLine, setShowTextDeckLine] = useState(true);
    /** Phones get the stacked preview/timeline/tool-bar layout instead of the dock. */
    const isMobile = useMobileViewport();
    const [mobileScreen, setMobileScreen] = useState<MobileScreen | null>(null);
    /** Full-screen preview player (phone and desktop). */
    const [playerOpen, setPlayerOpen] = useState(false);
    /** Phone split: timeline height in px (null = the default CSS height). */
    const [mobileTimelineHeight, setMobileTimelineHeight] = useState<number | null>(readStoredTimelineHeight);
    const mobilePreviewSlotRef = useRef<HTMLDivElement>(null);
    const mobileTimelineSlotRef = useRef<HTMLDivElement>(null);
    /** While the split handle is dragged the stage is CSS-scaled; its real
     *  size (a full editor re-render) commits once on release. */
    const splitDraggingRef = useRef(false);
    /** Layer the media picker's next item goes to (the timeline's add tile). */
    const [mediaTargetTrackId, setMediaTargetTrackId] = useState<string | null>(null);
    const uiDir: 'rtl' | 'ltr' = isRtlLanguage(i18n.language) ? 'rtl' : 'ltr';
    /** The preview container element is state so the ResizeObserver below
     *  re-attaches when the panel is docked/floated/hidden (fresh DOM node). */
    const [previewContainerNode, setPreviewContainerNode] = useState<HTMLDivElement | null>(null);

    const clipboardClipRef = useRef<Clip | null>(null);
    const tracksRef = useRef(tracks);
    const canvasRef = useRef(canvas);

    const {
        layout,
        dockPanel,
        moveTab,
        activateTab,
        resizeSplit,
        floatPanelActive,
        dockKey,
        hideKey,
        hidePanel,
        dockContent,
        floatContent,
        hideContent,
        showTab,
        hideTab,
        isTabVisible,
        isPanelVisible,
        setFloatingRect,
        focusFloating,
        resetLayout,
    } = useEditorLayout(projectId, useAuthStore((state) => state.user?.id));

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const tracksContentRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const previewStageRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragMode | null>(null);
    const clipSnapperRef = useRef<ReturnType<typeof createClipSnapper> | null>(null);
    // Live frame of an in-progress preview transform; committed once on release.
    const dragFrameRef = useRef<ClipFrame | null>(null);
    const pointerDragCleanupRef = useRef<(() => void) | null>(null);
    const playStartRef = useRef(0);
    const playOriginRef = useRef(0);

    /** Project target duration (persisted in canvas settings). */
    const projectDuration = clampProjectDuration(canvas.duration);
    const totalDuration = useMemo(
        () => computeTotalDuration(tracks, projectDuration),
        [tracks, projectDuration],
    );
    const contentDuration = Math.max(projectDuration, totalDuration);
    /** Everything the timeline shows: content, project target and scroll room. */
    const displayDuration = Math.max(contentDuration, extraDuration);
    const timelineWidth = displayDuration * zoomLevel;
    const previewLayers = useMemo(
        () => computePreviewLayers(tracks, currentTime),
        [tracks, currentTime],
    );

    useEffect(() => {
        tracksRef.current = tracks;
    }, [tracks]);

    const currentTimeRef = useRef(currentTime);
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    // ── Transport ────────────────────────────────────────────────────────────
    // One rAF clock owns playback and scrubbing. Every frame it writes the
    // playhead, preview layers, selection box and <video> elements straight to
    // the DOM; React state (`currentTime`) is only a throttled mirror for
    // panels. The previous design called setCurrentTime per frame, re-rendering
    // the whole editor at display rate — that main-thread saturation was the
    // playback stutter and the laggy red line.

    const playingRef = useRef(false);
    const zoomRef = useRef(zoomLevel);
    const totalDurationRef = useRef(totalDuration);
    const selectedClipIdRef = useRef<string | null>(null);
    const motionScaleRef = useRef(1);
    const playheadRef = useRef<HTMLDivElement | null>(null);
    const videoElsRef = useRef(new Map<string, HTMLVideoElement>());
    const mediaSeekerRef = useRef<ReturnType<typeof createMediaSeeker> | null>(null);
    if (mediaSeekerRef.current == null) mediaSeekerRef.current = createMediaSeeker();

    const registerVideoEl = useCallback((clipId: string, el: HTMLVideoElement | null) => {
        if (el) videoElsRef.current.set(clipId, el);
        else videoElsRef.current.delete(clipId);
    }, []);

    const syncPlaybackMedia = useCallback((layers: PreviewLayer[], playing: boolean) => {
        const seeker = mediaSeekerRef.current!;
        const active = new Set<string>();
        for (const layer of layers) {
            if (resolveClipMediaKind(layer.clip) !== 'video') continue;
            const video = videoElsRef.current.get(layer.clip.id);
            if (!video) continue;
            active.add(layer.clip.id);
            if (playing && layer.opacity > 0.01) {
                if (video.paused) void video.play().catch(() => undefined);
                // Native playback keeps itself in sync; only real drift resyncs.
                if (Math.abs(video.currentTime - layer.localTime) > PLAYBACK_DRIFT_LIMIT_S) {
                    seeker(video, layer.localTime, true);
                }
            } else {
                if (!video.paused) video.pause();
                if (Math.abs(video.currentTime - layer.localTime) > PAUSED_SYNC_EPSILON_S) {
                    seeker(video, layer.localTime);
                }
            }
        }
        for (const [clipId, video] of videoElsRef.current) {
            if (!active.has(clipId) && !video.paused) video.pause();
        }
    }, []);

    /** Paint `time` straight to the DOM: playhead, timecodes, preview stage. */
    const paintAt = useCallback((time: number) => {
        const zoom = zoomRef.current;
        if (playheadRef.current) {
            playheadRef.current.style.left = `${time * zoom}px`;
        }
        const timecode = `${formatTimecode(time)} / ${formatTimecode(totalDurationRef.current)}`;
        document.querySelectorAll<HTMLElement>('[data-live-timecode]').forEach((el) => {
            el.textContent = timecode;
        });
        const progress = totalDurationRef.current > 0 ? Math.min(1, time / totalDurationRef.current) : 0;
        document.querySelectorAll<HTMLElement>('[data-live-progress]').forEach((el) => {
            el.style.setProperty('--progress', String(progress));
        });

        const stage = previewStageRef.current;
        if (!stage) return;

        const layers = computePreviewLayers(tracksRef.current, time);
        const visibleIds = new Set<string>();
        let selectedLayer: PreviewLayer | null = null;
        let activeTextLayer: PreviewLayer | null = null;

        for (const layer of layers) {
            visibleIds.add(layer.clip.id);
            const el = stage.querySelector<HTMLElement>(`[data-clip-id="${CSS.escape(layer.clip.id)}"]`);
            if (el) {
                paintElementStyles(
                    el,
                    layer.clip.type === 'text'
                        ? previewLayerStyle(layer)
                        : composeMediaLayerStyle(layer, motionScaleRef.current),
                );
                el.style.visibility = 'visible';
            }
            if (layer.clip.id === selectedClipIdRef.current) selectedLayer = layer;
            if (!activeTextLayer && layer.clip.type === 'text') activeTextLayer = layer;
        }

        // Clips that just left the playhead hide immediately; React unmounts
        // them at the next heartbeat, never visibly.
        stage.querySelectorAll<HTMLElement>('[data-clip-id]').forEach((el) => {
            if (!visibleIds.has(el.dataset.clipId ?? '')) el.style.visibility = 'hidden';
        });

        const selectionEl = stage.querySelector<HTMLElement>('[data-preview-selection]');
        if (selectionEl) {
            if (selectedLayer) {
                const frame = displayFrameOf(selectedLayer);
                paintElementStyles(selectionEl, {
                    left: `${frame.x * 100}%`,
                    top: `${frame.y * 100}%`,
                    width: `${frame.width * 100}%`,
                    height: `${frame.height * 100}%`,
                    transform: frame.rotation ? `rotate(${frame.rotation}deg)` : '',
                });
                selectionEl.style.visibility = 'visible';
            } else {
                selectionEl.style.visibility = 'hidden';
            }
        }

        const deckEl = stage.querySelector<HTMLElement>('[data-preview-deck-line]');
        if (deckEl) {
            const selectedClip = tracksRef.current
                .flatMap((item) => item.clips)
                .find((item) => item.id === selectedClipIdRef.current);
            const deckFrame = activeTextLayer
                ? displayFrameOf(activeTextLayer)
                : (selectedClip?.type === 'text' ? getClipFrame(selectedClip) : null);
            if (deckFrame) {
                deckEl.style.top = `${(deckFrame.y + deckFrame.height / 2) * 100}%`;
                deckEl.style.visibility = 'visible';
            } else {
                deckEl.style.visibility = 'hidden';
            }
        }

        syncPlaybackMedia(layers, playingRef.current);
    }, [syncPlaybackMedia]);

    // After every commit, repaint from the authoritative ref — React's own
    // inline styles can be one heartbeat stale; this runs before the browser
    // paints, so stale values never reach the screen.
    useLayoutEffect(() => {
        zoomRef.current = zoomLevel;
        motionScaleRef.current = canvas.height > 0 ? previewCanvasSize.height / canvas.height : 1;
        paintAt(currentTimeRef.current);
    });

    /** A freshly mounted <video> got its first decodable frame — show it. */
    const handleMediaReady = useCallback(() => {
        paintAt(currentTimeRef.current);
    }, [paintAt]);

    const seekTo = useCallback((time: number) => {
        const clamped = Math.max(0, time);
        currentTimeRef.current = clamped;
        paintAt(clamped);
        setCurrentTime(clamped);
    }, [paintAt]);

    const pausePlayback = useCallback(() => {
        playingRef.current = false;
        setIsPlaying(false);
        setCurrentTime(currentTimeRef.current);
        paintAt(currentTimeRef.current);
    }, [paintAt]);

    const startPlayback = useCallback(() => {
        // Restart from 0 when the playhead sits at (or past) the end.
        if (totalDurationRef.current > 0 && currentTimeRef.current >= totalDurationRef.current - 1e-3) {
            currentTimeRef.current = 0;
            setCurrentTime(0);
        }
        playingRef.current = true;
        setIsPlaying(true);
    }, []);

    const togglePlayback = useCallback(() => {
        if (playingRef.current) pausePlayback();
        else startPlayback();
    }, [pausePlayback, startPlayback]);

    const seekBy = useCallback((delta: number) => {
        seekTo(Math.min(Math.max(0, currentTimeRef.current + delta), totalDurationRef.current));
    }, [seekTo]);

    // Player progress-bar scrub: DOM-first like the timeline scrub; React only
    // commits when a clip enters/leaves the frame (so its layer mounts).
    const playerScrubRef = useRef<{ wasPlaying: boolean; layerKey: string } | null>(null);
    const layerKeyAt = useCallback((time: number) => (
        computePreviewLayers(tracksRef.current, time).map((layer) => layer.clip.id).join('|')
    ), []);
    const handlePlayerScrubStart = useCallback(() => {
        playerScrubRef.current = { wasPlaying: playingRef.current, layerKey: layerKeyAt(currentTimeRef.current) };
        if (playingRef.current) pausePlayback();
    }, [layerKeyAt, pausePlayback]);
    const handlePlayerScrub = useCallback((time: number) => {
        const clamped = Math.min(Math.max(0, time), totalDurationRef.current);
        currentTimeRef.current = clamped;
        paintAt(clamped);
        const scrub = playerScrubRef.current;
        const layerKey = layerKeyAt(clamped);
        if (scrub && layerKey !== scrub.layerKey) {
            scrub.layerKey = layerKey;
            setCurrentTime(clamped);
        }
    }, [layerKeyAt, paintAt]);
    const handlePlayerScrubEnd = useCallback(() => {
        const scrub = playerScrubRef.current;
        playerScrubRef.current = null;
        setCurrentTime(currentTimeRef.current);
        if (scrub?.wasPlaying) startPlayback();
    }, [startPlayback]);

    useEffect(() => {
        playingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        totalDurationRef.current = totalDuration;
    }, [totalDuration]);

    useEffect(() => {
        selectedClipIdRef.current = selectedClipId;
    }, [selectedClipId]);

    // ── Lightweight preview proxies ──────────────────────────────────────────
    // The API transcodes each source video to a ≤480p H.264 proxy exactly once;
    // preview plays the proxy while export keeps reading the original. The URL
    // persists on the clip, so this is a no-op for already-proxied timelines.

    const proxyInFlightRef = useRef(new Map<string, Promise<string | null>>());

    const ensureClipPreviewProxy = useCallback((clipId: string, sourceUrl?: string) => {
        if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return;
        let inFlight = proxyInFlightRef.current.get(sourceUrl);
        if (!inFlight) {
            inFlight = mediaApi.createVideoProxy(projectId, sourceUrl)
                .then((res) => res?.proxyUrl ?? null)
                .catch(() => null);
            proxyInFlightRef.current.set(sourceUrl, inFlight);
        }
        void inFlight.then((proxyUrl) => {
            if (!proxyUrl) return;
            proxyInFlightRef.current.delete(sourceUrl);
            setTracksSilent((prev) => prev.map((track) => ({
                ...track,
                clips: track.clips.map((clip) => (
                    clip.id === clipId && !clip.previewUrl ? { ...clip, previewUrl: proxyUrl } : clip
                )),
            })));
        });
    }, [projectId, setTracksSilent]);

    // Backfill proxies for clips hydrated from storage without one.
    useEffect(() => {
        for (const clip of tracks.flatMap((track) => track.clips)) {
            if (clip.mediaType === 'video' && clip.sourceUrl && !clip.previewUrl) {
                ensureClipPreviewProxy(clip.id, clip.sourceUrl);
            }
        }
    }, [tracks, ensureClipPreviewProxy]);

    useEffect(() => {
        canvasRef.current = canvas;
    }, [canvas]);

    useEffect(() => () => {
        pointerDragCleanupRef.current?.();
        pointerDragCleanupRef.current = null;
    }, []);

    useEffect(() => {
        const container = previewContainerNode;
        if (!container) return;

        const updateSize = () => {
            if (splitDraggingRef.current) return;
            setPreviewCanvasSize(fitPreviewSize(container.getBoundingClientRect(), canvas.width, canvas.height));
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);
        return () => observer.disconnect();
    }, [canvas.height, canvas.width, previewContainerNode]);

    const applyZoom = useCallback((next: number | ((prev: number) => number)) => {
        const prevZoom = zoomLevel;
        const requested = typeof next === 'function' ? next(prevZoom) : next;
        const zoom = Math.min(200, Math.max(8, Math.round(requested)));
        if (zoom === prevZoom) return;
        const area = scrollAreaRef.current;
        if (area) {
            // Keep the time under the viewport center anchored while zooming.
            const anchorTime = (area.scrollLeft + area.clientWidth / 2) / prevZoom;
            requestAnimationFrame(() => {
                area.scrollLeft = Math.max(0, anchorTime * zoom - area.clientWidth / 2);
            });
        }
        setZoomLevel(zoom);
    }, [zoomLevel]);

    const [durationDraft, setDurationDraft] = useState<string | null>(null);

    const commitProjectDuration = () => {
        if (durationDraft == null) return;
        const duration = clampProjectDuration(durationDraft);
        setDurationDraft(null);
        setCanvas((prev) => (clampProjectDuration(prev.duration) === duration
            ? prev
            : { ...prev, duration }));
    };

    // Ctrl/⌘ + wheel over the timeline scales it horizontally around the cursor.
    const [scrollAreaNode, setScrollAreaNode] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!scrollAreaNode) return;
        const onWheel = (event: WheelEvent) => {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            applyZoom((prev) => prev + (event.deltaY > 0 ? -8 : 8));
        };
        scrollAreaNode.addEventListener('wheel', onWheel, { passive: false });
        return () => scrollAreaNode.removeEventListener('wheel', onWheel);
    }, [scrollAreaNode, applyZoom]);

    // Two-finger pinch on the timeline zooms it on touch screens (the mobile
    // layout has no zoom slider). Refs keep the gesture alive across re-renders.
    const applyZoomRef = useRef(applyZoom);
    const zoomLevelRef = useRef(zoomLevel);
    useEffect(() => {
        applyZoomRef.current = applyZoom;
        zoomLevelRef.current = zoomLevel;
    }, [applyZoom, zoomLevel]);
    useEffect(() => {
        if (!scrollAreaNode) return;
        let pinch: { distance: number; zoom: number } | null = null;
        const distanceOf = (touches: TouchList) => Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY,
        );
        const onTouchStart = (event: TouchEvent) => {
            if (event.touches.length !== 2) return;
            pinch = { distance: Math.max(1, distanceOf(event.touches)), zoom: zoomLevelRef.current };
        };
        const onTouchMove = (event: TouchEvent) => {
            if (!pinch || event.touches.length !== 2) return;
            event.preventDefault();
            applyZoomRef.current(pinch.zoom * (distanceOf(event.touches) / pinch.distance));
        };
        const onTouchEnd = (event: TouchEvent) => {
            if (event.touches.length < 2) pinch = null;
        };
        scrollAreaNode.addEventListener('touchstart', onTouchStart, { passive: true });
        scrollAreaNode.addEventListener('touchmove', onTouchMove, { passive: false });
        scrollAreaNode.addEventListener('touchend', onTouchEnd);
        scrollAreaNode.addEventListener('touchcancel', onTouchEnd);
        return () => {
            scrollAreaNode.removeEventListener('touchstart', onTouchStart);
            scrollAreaNode.removeEventListener('touchmove', onTouchMove);
            scrollAreaNode.removeEventListener('touchend', onTouchEnd);
            scrollAreaNode.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [scrollAreaNode]);

    const bindPointerDrag = useCallback((
        pointerId: number,
        handlers: {
            onMove: (event: PointerEvent) => void;
            onEnd: () => void;
        },
    ) => {
        pointerDragCleanupRef.current?.();

        const onMove = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;
            handlers.onMove(event);
        };

        const onEnd = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
            pointerDragCleanupRef.current = null;
            handlers.onEnd();
        };

        pointerDragCleanupRef.current = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadProject() {
            try {
                const [{ project }, catalogRes] = await Promise.all([
                    mediaApi.getProject(projectId),
                    nodeCatalogApi.list(),
                ]);
                if (cancelled) return;

                setCatalog(catalogRes.nodes ?? []);

                const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(
                    project.nodes ?? [],
                    project.edges ?? [],
                );
                setNodes(loadedNodes);
                setEdges(loadedEdges);

                const loadedTracks = deserializeVideoEditor(project.videoEditor);
                const serverCanvas = deserializeVideoEditorCanvas(project.videoEditor);
                const initialSignature = JSON.stringify(
                    serializeVideoEditorSignature(initialTracks, DEFAULT_VIDEO_EDITOR_CANVAS),
                );
                const currentSignature = JSON.stringify(
                    serializeVideoEditorSignature(tracksRef.current, canvasRef.current),
                );
                const hasLocalHydrationEdits = currentSignature !== initialSignature;
                const serverTracks = loadedTracks?.length ? loadedTracks : initialTracks;

                // Never let a slow initial GET erase edits made while it was in flight.
                if (!hasLocalHydrationEdits) {
                    resetTracks(serverTracks);
                    setCanvas(serverCanvas);
                }

                requestAnimationFrame(() => {
                    if (hasLocalHydrationEdits) {
                        const currentTracks = tracksRef.current;
                        const currentCanvas = canvasRef.current;
                        finishHydration();
                        scheduleSave(currentTracks, currentCanvas);
                    } else {
                        finishHydration(serverTracks, serverCanvas);
                    }
                });
            } catch {
                if (!cancelled) {
                    requestAnimationFrame(() => {
                        const currentTracks = tracksRef.current;
                        const currentCanvas = canvasRef.current;
                        finishHydration();
                        scheduleSave(currentTracks, currentCanvas);
                    });
                }
            }
        }

        loadProject();
        return () => { cancelled = true; };
    }, [projectId, finishHydration, resetTracks, scheduleSave, initialTracks]);

    useEffect(() => {
        scheduleSave(tracks, canvas);
    }, [tracks, canvas, scheduleSave]);

    const updateNodeData = useCallback((nodeId: string, data: Partial<StudioNodeData>) => {
        setNodes((prev) => prev.map((node) => (
            node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )));
    }, []);

    useEffect(() => {
        registerNodePatcher(updateNodeData);
        return () => registerNodePatcher(null);
    }, [registerNodePatcher, updateNodeData]);

    useMediaStudioSocket(projectId, setNodes, {
        onJobLog: (log) => setLiveLogs((prev) => [...prev, log]),
    });

    const getSnapPoints = useCallback((excludeClipId?: string): number[] => {
        const points: number[] = [currentTime, 0];
        tracks.forEach((track) => {
            track.clips.forEach((clip) => {
                if (clip.id !== excludeClipId) {
                    points.push(clip.startTime);
                    points.push(clip.startTime + clip.duration);
                }
            });
        });
        return points;
    }, [tracks, currentTime]);

    const resolveDropTime = useCallback((clientX: number) => {
        const content = tracksContentRef.current;
        if (!content) return currentTime;
        return timeFromPointer(clientX, content.getBoundingClientRect().left, zoomLevel);
    }, [currentTime, zoomLevel]);

    const updateClipDurationFromSource = useCallback((clipId: string, sourceDuration: number) => {
        setTracksSilent((prev) => prev.map((track) => ({
            ...track,
            clips: track.clips.map((clip) => {
                if (clip.id !== clipId) return clip;
                return {
                    ...clip,
                    sourceDuration,
                    duration: Math.min(clip.duration, sourceDuration - (clip.trimStart ?? 0)),
                };
            }),
        })));
    }, [setTracksSilent]);

    const findClipById = useCallback((clipId: string | null) => {
        if (!clipId) return null;
        for (const track of tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) return clip;
        }
        return null;
    }, [tracks]);

    const selectedClip = useMemo(() => findClipById(selectedClipId), [findClipById, selectedClipId]);
    const selectedTransitionClip = useMemo(() => {
        const clip = selectedClip;
        return clip && isTransitionClip(clip) ? clip : null;
    }, [selectedClip]);

    const selectedWorkflowNode = useMemo(() => {
        if (!selectedClip?.nodeId) return null;
        return nodes.find((node) => node.id === selectedClip.nodeId) ?? null;
    }, [selectedClip, nodes]);

    const selectedCatalogEntry = useMemo(() => {
        if (!selectedWorkflowNode) return null;
        return catalogByType.get(String(selectedWorkflowNode.type)) ?? null;
    }, [selectedWorkflowNode, catalogByType]);

    useEffect(() => {
        if (selectedTransitionClip) {
            setSelectedNodeId(null);
            return;
        }
        if (selectedClip?.nodeId) {
            setSelectedNodeId(selectedClip.nodeId);
            return;
        }
        if (selectedClipId) {
            setSelectedNodeId(null);
        }
    }, [selectedClip, selectedClipId, selectedTransitionClip, setSelectedNodeId]);

    const updateClipById = useCallback((clipId: string, patch: Partial<Clip>) => {
        setTracks((prev) => prev.map((track) => ({
            ...track,
            clips: track.clips.map((clip) => (
                clip.id === clipId ? { ...clip, ...patch } : clip
            )),
        })));
    }, [setTracks]);

    // ── Keyframes ────────────────────────────────────────────────────────────
    // Times are seconds relative to the clip start; every write goes through
    // setTracks so undo/redo and autosave cover keyframe edits like any other.

    const clipLocalTimeAt = useCallback((clip: Clip, time: number) => (
        Math.min(clip.duration, Math.max(0, time - clip.startTime))
    ), []);

    const updateClipKeyframeMap = useCallback((clipId: string, updater: (map: ClipKeyframeMap | undefined) => ClipKeyframeMap | undefined) => {
        setTracks((prev) => prev.map((track) => ({
            ...track,
            clips: track.clips.map((clip) => (
                clip.id === clipId ? { ...clip, keyframes: compactKeyframeMap(updater(clip.keyframes)) } : clip
            )),
        })));
    }, [setTracks]);

    const upsertClipKeyframe = useCallback((clipId: string, channelId: KeyframeChannelId, time: number, value: number | string) => {
        updateClipKeyframeMap(clipId, (map) => {
            const list = [...(map?.[channelId] ?? [])];
            const t = roundKeyframeTime(time);
            const index = list.findIndex((kf) => roundKeyframeTime(kf.time) === t);
            if (index >= 0) list[index] = { ...list[index], value };
            else list.push({ id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: t, value });
            list.sort((a, b) => a.time - b.time);
            return { ...(map ?? {}), [channelId]: list };
        });
    }, [updateClipKeyframeMap]);

    const removeClipKeyframeAt = useCallback((clipId: string, channelId: KeyframeChannelId, time: number) => {
        updateClipKeyframeMap(clipId, (map) => {
            if (!map?.[channelId]) return map;
            const t = roundKeyframeTime(time);
            return { ...map, [channelId]: map[channelId].filter((kf) => roundKeyframeTime(kf.time) !== t) };
        });
    }, [updateClipKeyframeMap]);

    /** Remove the keyframes of every channel sitting at one moment (Alt+click on a diamond). */
    const removeClipKeyframesAtTime = useCallback((clipId: string, time: number) => {
        const t = roundKeyframeTime(time);
        updateClipKeyframeMap(clipId, (map) => {
            if (!map) return map;
            const next: ClipKeyframeMap = {};
            for (const [channel, list] of Object.entries(map)) {
                const kept = (list ?? []).filter((kf) => roundKeyframeTime(kf.time) !== t);
                if (kept.length) next[channel] = kept;
            }
            return next;
        });
    }, [updateClipKeyframeMap]);

    /** Move all keyframes (any channel) sitting at `fromTime` to `toTime`. */
    const moveClipKeyframes = useCallback((clipId: string, fromTime: number, toTime: number, duration: number) => {
        const from = roundKeyframeTime(fromTime);
        const to = Math.min(duration, Math.max(0, roundKeyframeTime(toTime)));
        updateClipKeyframeMap(clipId, (map) => {
            if (!map) return map;
            const next: ClipKeyframeMap = {};
            for (const [channel, list] of Object.entries(map)) {
                if (!list?.length) continue;
                next[channel] = list
                    .map((kf) => (roundKeyframeTime(kf.time) === from ? { ...kf, time: to } : kf))
                    .sort((a, b) => a.time - b.time);
            }
            return next;
        });
    }, [updateClipKeyframeMap]);

    const toggleKeyframeChannel = useCallback((clip: Clip, channel: KeyframeChannelDef, textStyle?: TextClipStyle) => {
        if (clip.keyframes?.[channel.id]?.length) {
            updateClipKeyframeMap(clip.id, (map) => ({ ...(map ?? {}), [channel.id]: [] }));
            return;
        }
        // Enabling the stopwatch pins the current value at the playhead.
        const base = channel.readBase(clip, textStyle);
        const value = channel.kind === 'color'
            ? (typeof base === 'string' && isHexColor(base) ? base : (channel.fallbackColor ?? '#000000'))
            : (typeof base === 'number' && Number.isFinite(base) ? base : 0);
        upsertClipKeyframe(clip.id, channel.id, clipLocalTimeAt(clip, currentTimeRef.current), value);
    }, [clipLocalTimeAt, updateClipKeyframeMap, upsertClipKeyframe]);

    /** Easing of the keyframe at the playhead, or of the whole channel when the playhead is between keys. */
    const setKeyframeChannelEasing = useCallback((clipId: string, channelId: KeyframeChannelId, easing: KeyframeEasing) => {
        const clip = tracksRef.current.flatMap((track) => track.clips).find((item) => item.id === clipId);
        if (!clip) return;
        const playhead = roundKeyframeTime(clipLocalTimeAt(clip, currentTimeRef.current));
        updateClipKeyframeMap(clipId, (map) => {
            const list = map?.[channelId];
            if (!list?.length) return map;
            const hasAtPlayhead = list.some((kf) => roundKeyframeTime(kf.time) === playhead);
            return {
                ...map,
                [channelId]: list.map((kf) => (
                    !hasAtPlayhead || roundKeyframeTime(kf.time) === playhead ? { ...kf, easing } : kf
                )),
            };
        });
    }, [clipLocalTimeAt, updateClipKeyframeMap]);

    /**
     * Commit a frame edit. Fields whose channels are keyframed are written as
     * keyframes at the playhead (Premiere behavior); untouched/static fields
     * update the base frame. `fields` limits the edit to explicit keys
     * (number inputs); undefined means "everything changed" (preview drag).
     */
    const commitFrameEdit = useCallback((clipId: string, frame: ClipFrame, fields?: Array<keyof ClipFrame>) => {
        const clip = tracksRef.current.flatMap((track) => track.clips).find((item) => item.id === clipId);
        if (!clip) return;
        const touched = fields ?? FRAME_CHANNEL_IDS.map((id) => FRAME_CHANNEL_FIELDS[id]);
        const animatedFields = touched.filter((field) => (
            FRAME_CHANNEL_IDS.some((id) => FRAME_CHANNEL_FIELDS[id] === field && clip.keyframes?.[id]?.length)
        ));
        const staticFields = touched.filter((field) => !animatedFields.includes(field));

        if (animatedFields.length) {
            const local = clipLocalTimeAt(clip, currentTimeRef.current);
            for (const field of animatedFields) {
                const channelId = FRAME_CHANNEL_IDS.find((id) => FRAME_CHANNEL_FIELDS[id] === field);
                if (!channelId) continue;
                const value = frame[field];
                if (typeof value === 'number') upsertClipKeyframe(clipId, channelId, local, value);
            }
        }
        if (staticFields.length) {
            const basePatch: Partial<ClipFrame> = {};
            for (const field of staticFields) {
                (basePatch as Record<string, unknown>)[field] = frame[field];
            }
            updateClipById(clipId, { frame: { ...getClipFrame(clip), ...basePatch } });
        }
    }, [clipLocalTimeAt, updateClipById, upsertClipKeyframe]);

    /** Route a text-style edit: keyframed channels → keyframe at the playhead, rest → base overrides. */
    const commitTextStyleEdit = useCallback((clip: Clip, patch: Partial<TextClipStyle>) => {
        const animatedChannels = (Object.keys(TEXT_CHANNEL_STYLE_KEYS) as KeyframeChannelId[]).filter((channelId) => (
            !!clip.keyframes?.[channelId]?.length && patch[TEXT_CHANNEL_STYLE_KEYS[channelId]] !== undefined
        ));
        const rest = animatedChannels.length
            ? Object.fromEntries(Object.entries(patch).filter(
                ([key]) => !animatedChannels.some((channelId) => TEXT_CHANNEL_STYLE_KEYS[channelId] === key),
            ))
            : patch;

        if (animatedChannels.length) {
            const local = clipLocalTimeAt(clip, currentTimeRef.current);
            for (const channelId of animatedChannels) {
                const value = patch[TEXT_CHANNEL_STYLE_KEYS[channelId]];
                if (value !== undefined) upsertClipKeyframe(clip.id, channelId, local, value as number | string);
            }
        }
        if (Object.keys(rest).length) {
            updateClipById(clip.id, { textStyle: { ...(clip.textStyle ?? {}), ...(rest as Partial<TextClipStyle>) } });
        }
    }, [clipLocalTimeAt, updateClipById, upsertClipKeyframe]);

    /** Panel edit of a static (non-animated) channel value. */
    const handleKeyframeBaseEdit = useCallback((clip: Clip, channelId: KeyframeChannelId, value: number | string) => {
        if (channelId.startsWith('frame.')) {
            const field = FRAME_CHANNEL_FIELDS[channelId as FrameKeyframeChannelId];
            if (!field) return;
            updateClipById(clip.id, { frame: { ...getClipFrame(clip), [field]: value } });
            return;
        }
        if (channelId === 'volume') {
            updateClipById(clip.id, { volume: Math.min(1, Math.max(0, Number(value) || 0)) });
            return;
        }
        const styleKey = TEXT_CHANNEL_STYLE_KEYS[channelId];
        if (styleKey) {
            updateClipById(clip.id, { textStyle: { ...(clip.textStyle ?? {}), [styleKey]: value } });
        }
    }, [updateClipById]);

    /** Diamond on a clip: click = seek, drag = move, Alt+click = delete. */
    const handleKeyframeDiamondPointerDown = (event: React.PointerEvent, clip: Clip, time: number) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        setSelectedClipId(clip.id);
        setSelectedTrackId(null);

        if (event.altKey) {
            removeClipKeyframesAtTime(clip.id, time);
            return;
        }

        const startX = event.clientX;
        let moved = false;
        bindPointerDrag(event.pointerId, {
            onMove: (moveEvent) => {
                const delta = (moveEvent.clientX - startX) / zoomLevel;
                if (!moved && Math.abs(delta) * zoomLevel > 3) {
                    moved = true;
                    beginHistoryGesture();
                }
                if (moved) {
                    moveClipKeyframes(clip.id, time, time + delta, clip.duration);
                }
            },
            onEnd: () => {
                if (!moved) {
                    pausePlayback();
                    seekTo(clip.startTime + time);
                }
            },
        });
    };

    const selectedPreviewLayer = useMemo(
        () => previewLayers.find((layer) => layer.clip.id === selectedClipId) ?? null,
        [previewLayers, selectedClipId],
    );

    const beginPreviewTransform = useCallback((
        event: React.PointerEvent,
        mode: 'move' | 'rotate' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se',
    ) => {
        if (!selectedPreviewLayer || !previewStageRef.current) return;
        event.preventDefault();
        event.stopPropagation();

        const clipId = selectedPreviewLayer.clip.id;
        // Drag starts from the frame the user actually SEES at the playhead
        // (keyframed values included) — otherwise a keyframed element jumps
        // back to its base frame the moment a handle is grabbed.
        const original = displayFrameOf(selectedPreviewLayer);
        const stageRect = previewStageRef.current.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;

        // Gesture contract: pointermove updates the layer + selection box DOM
        // nodes directly (no React renders, no state churn → no lag); the new
        // frame is committed once on release as a single undoable edit.
        const stage = previewStageRef.current;
        const layerEl = stage.querySelector<HTMLElement>(`[data-clip-id="${clipId}"]`);
        const selectionEl = stage.querySelector<HTMLElement>('[data-preview-selection]');
        const applyFrame = (frame: ClipFrame) => {
            const style = {
                left: `${frame.x * 100}%`,
                top: `${frame.y * 100}%`,
                width: `${frame.width * 100}%`,
                height: `${frame.height * 100}%`,
                transform: frame.rotation ? `rotate(${frame.rotation}deg)` : '',
            };
            if (layerEl) Object.assign(layerEl.style, style);
            if (selectionEl) Object.assign(selectionEl.style, style);
        };

        const rotation = original.rotation ?? 0;
        // Screen-space center of the frame — rotation pivot.
        const centerX = stageRect.left + (original.x + original.width / 2) * stageRect.width;
        const centerY = stageRect.top + (original.y + original.height / 2) * stageRect.height;
        const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);

        const commit = (frame: ClipFrame) => {
            // Keyframed frame channels receive a keyframe at the playhead.
            commitFrameEdit(clipId, frame);
        };

        bindPointerDrag(event.pointerId, {
            onMove: (moveEvent) => {
                const dx = (moveEvent.clientX - startX) / Math.max(1, stageRect.width);
                const dy = (moveEvent.clientY - startY) / Math.max(1, stageRect.height);
                let next = { ...original };

                if (mode === 'move') {
                    // Bleed allowed: the frame may sit partly outside the canvas.
                    next.x = Math.min(FRAME_POS_LIMIT, Math.max(-FRAME_POS_LIMIT, original.x + dx));
                    next.y = Math.min(FRAME_POS_LIMIT, Math.max(-FRAME_POS_LIMIT, original.y + dy));
                } else if (mode === 'rotate') {
                    const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
                    let nextRotation = rotation + (angle - startAngle);
                    if (!moveEvent.shiftKey) {
                        // Magnetic 15° steps; snap exactly onto multiples near the pointer.
                        const step = Math.round(nextRotation / 15) * 15;
                        if (Math.abs(nextRotation - step) <= 4) nextRotation = step;
                    }
                    nextRotation = ((nextRotation % 360) + 360) % 360;
                    next.rotation = nextRotation;
                } else if (mode.length === 2) {
                    const east = mode.includes('e');
                    const south = mode.includes('s');
                    if (moveEvent.shiftKey) {
                        // Free stretch along the dragged axes.
                        if (east) next.width = Math.max(MIN_FRAME_SIZE, original.width + dx);
                        if (south) next.height = Math.max(MIN_FRAME_SIZE, original.height + dy);
                        if (mode.includes('w')) {
                            const nextX = original.x + dx;
                            next.x = nextX;
                            next.width = original.width + (original.x - nextX);
                        }
                        if (mode.includes('n')) {
                            const nextY = original.y + dy;
                            next.y = nextY;
                            next.height = original.height + (original.y - nextY);
                        }
                    } else if (rotation) {
                        // Rotated: scale uniformly around the frame center.
                        const startDist = Math.max(8, Math.hypot(startX - centerX, startY - centerY));
                        const dist = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
                        const factor = Math.max(0.02, dist / startDist);
                        next.width = original.width * factor;
                        next.height = original.height * factor;
                    } else {
                        const sx = (original.width + (east ? dx : -dx)) / Math.max(MIN_FRAME_SIZE, original.width);
                        const sy = (original.height + (south ? dy : -dy)) / Math.max(MIN_FRAME_SIZE, original.height);
                        const factor = Math.max(0.02, Math.max(sx, sy));
                        const width = Math.max(MIN_FRAME_SIZE, original.width * factor);
                        const height = Math.max(MIN_FRAME_SIZE, original.height * factor);
                        next.width = width;
                        next.height = height;
                        next.x = east
                            ? original.x
                            : original.x + original.width - width;
                        next.y = south
                            ? original.y
                            : original.y + original.height - height;
                    }
                } else {
                    // Edge handles: free resize along one axis.
                    if (mode.includes('e')) {
                        next.width = Math.max(MIN_FRAME_SIZE, original.width + dx);
                    }
                    if (mode.includes('s')) {
                        next.height = Math.max(MIN_FRAME_SIZE, original.height + dy);
                    }
                    if (mode.includes('w')) {
                        const nextX = original.x + dx;
                        next.x = nextX;
                        next.width = original.width + (original.x - nextX);
                    }
                    if (mode.includes('n')) {
                        const nextY = original.y + dy;
                        next.y = nextY;
                        next.height = original.height + (original.y - nextY);
                    }
                }

                if (mode !== 'rotate') {
                    next.width = Math.min(FRAME_SIZE_LIMIT, Math.max(MIN_FRAME_SIZE, next.width));
                    next.height = Math.min(FRAME_SIZE_LIMIT, Math.max(MIN_FRAME_SIZE, next.height));
                    next.x = Math.min(FRAME_POS_LIMIT, Math.max(-FRAME_POS_LIMIT, next.x));
                    next.y = Math.min(FRAME_POS_LIMIT, Math.max(-FRAME_POS_LIMIT, next.y));
                }

                applyFrame(next);
                dragFrameRef.current = next;
            },
            onEnd: () => {
                const frame = dragFrameRef.current;
                dragFrameRef.current = null;
                if (frame) commit(frame);
            },
        });
    }, [bindPointerDrag, commitFrameEdit, selectedPreviewLayer]);

    const handleCopyClip = useCallback(() => {
        const clip = findClipById(selectedClipId);
        if (clip) clipboardClipRef.current = { ...clip };
    }, [findClipById, selectedClipId]);

    const handlePasteClip = useCallback(() => {
        const source = clipboardClipRef.current;
        if (!source) return;

        let targetTrack: Track | undefined;
        if (source.type === 'text') {
            targetTrack = tracks.find((t) => t.id === source.trackId)
                ?? tracks.find((t) => t.type === 'text' && !t.locked);
        } else {
            targetTrack = tracks.find((t) => t.id === source.trackId && trackAcceptsMedia(
                t.type as 'video' | 'audio',
                source.mediaType || (source.type === 'audio' ? 'audio' : 'video'),
            )) ?? tracks.find((t) => (
                t.type === source.type
                && trackAcceptsMedia(t.type as 'video' | 'audio', source.mediaType || source.type)
            ));
        }

        if (!targetTrack) return;

        const newId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const pasted: Clip = {
            ...source,
            id: newId,
            trackId: targetTrack.id,
            startTime: currentTime,
            title: t('copy_suffix', { title: source.title }),
        };

        setTracks((prev) => prev.map((t) => (
            t.id === targetTrack.id ? { ...t, clips: [...t.clips, pasted] } : t
        )));
        setSelectedClipId(newId);
        setSelectedTrackId(null);
    }, [tracks, currentTime, setTracks, t]);

    /** Find the (single) text layer track, creating it when missing. */
    const ensureTextTrack = useCallback((current: Track[]): { tracks: Track[]; trackId: string } => {
        const existing = current.find((track) => track.type === 'text' && !track.locked);
        if (existing) return { tracks: current, trackId: existing.id };
        const textTrack: Track = {
            id: `t-text-${Date.now()}`,
            title: t('text'),
            type: 'text',
            muted: false,
            locked: false,
            hidden: false,
            clips: [],
        };
        return { tracks: [...current, textTrack], trackId: textTrack.id };
    }, [t]);

    /** Add a text/caption clip on the text track at the playhead. */
    const addTextClip = useCallback((options?: {
        text?: string;
        title?: string;
        style?: Partial<TextClipStyle>;
        startTime?: number;
        duration?: number;
        frame?: ClipFrame;
    }) => {
        const clipId = `c-text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setTracks((prev) => {
            const ensured = ensureTextTrack(prev);
            const clip: Clip = {
                id: clipId,
                trackId: ensured.trackId,
                title: options?.title || t('text'),
                startTime: Math.max(0, options?.startTime ?? currentTime),
                duration: Math.max(MIN_CLIP_DURATION, options?.duration ?? 4),
                type: 'text',
                color: '#06b6d4',
                text: options?.text ?? t('text_default'),
                // Sparse overrides only — otherwise the clip follows the
                // track's shared default style.
                ...(options?.style ? { textStyle: { ...options.style } } : {}),
                frame: options?.frame ?? { x: 0.06, y: 0.4, width: 0.88, height: 0.2 },
            };
            return ensured.tracks.map((track) => (
                track.id === ensured.trackId ? { ...track, clips: [...track.clips, clip] } : track
            ));
        });
        setSelectedClipId(clipId);
        setSelectedTrackId(null);
    }, [currentTime, ensureTextTrack, setTracks, t]);

    /**
     * Replace/append caption rows (from the caption studio) as text clips that
     * overlay the given video clip. One undoable gesture.
     */
    const applyCaptions = useCallback((payload: {
        sourceClipId: string;
        segments: CaptionSegmentDraft[];
        style: Partial<TextClipStyle>;
        replaceExisting: boolean;
    }) => {
        const { sourceClipId, segments, style, replaceExisting } = payload;
        const source = findClipById(sourceClipId);
        if (!source || !segments.length) return;

        beginHistoryGesture();
        const stamp = Date.now();
        setTracks((prev) => {
            const ensured = ensureTextTrack(prev);
            let nextTracks = ensured.tracks;
            // The caption studio's shared style becomes the track default:
            // every row follows it until it carries its own overrides.
            nextTracks = nextTracks.map((track) => (
                track.id === ensured.trackId
                    ? { ...track, textStyle: { ...(track.textStyle ?? {}), ...style } }
                    : track
            ));
            if (replaceExisting) {
                nextTracks = nextTracks.map((track) => (
                    track.type === 'text'
                        ? { ...track, clips: track.clips.filter((clip) => clip.captionFor !== sourceClipId) }
                        : track
                ));
            }
            // Transcription times are relative to the source file; shift by
            // where the clip starts inside the timeline.
            const offset = source.startTime - (source.trimStart ?? 0);
            const newClips: Clip[] = segments.map((segment, index) => ({
                id: `c-cap-${stamp}-${index}`,
                trackId: ensured.trackId,
                title: (segment.text || ' ').slice(0, 42),
                startTime: Math.max(0, offset + segment.start),
                duration: Math.max(MIN_CLIP_DURATION, segment.end - segment.start),
                type: 'text',
                color: '#06b6d4',
                text: segment.text,
                // Only per-row overrides live on the clip; everything else
                // follows the track default.
                ...(segment.style && Object.keys(segment.style).length
                    ? { textStyle: { ...segment.style } }
                    : {}),
                frame: { ...CAPTION_FRAME },
                captionFor: sourceClipId,
            }));
            return nextTracks.map((track) => (
                track.id === ensured.trackId ? { ...track, clips: [...track.clips, ...newClips] } : track
            ));
        });
    }, [beginHistoryGesture, ensureTextTrack, findClipById, setTracks]);

    const addMediaToTimeline = useCallback((
        payload: GalleryDragPayload,
        trackId?: string,
        atTime?: number,
    ) => {
        const clipKind = clipTypeFromMedia(payload.type);
        const targetTrack = trackId
            ? tracks.find((t) => t.id === trackId)
            : tracks.find((t) => t.type === clipKind && trackAcceptsMedia(t.type, payload.type));

        if (!targetTrack || !trackAcceptsMedia(targetTrack.type, payload.type)) {
            return;
        }

        const startTime = atTime ?? currentTime;
        const clipId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const defaultDuration = payload.type === 'image' ? 3 : 5;

        const newClip: Clip = {
            id: clipId,
            trackId: targetTrack.id,
            title: payload.label,
            startTime: Math.max(0, startTime),
            duration: defaultDuration,
            type: clipKind,
            color: clipColors(payload.type),
            sourceUrl: payload.url,
            mediaType: payload.type,
            nodeId: payload.nodeId,
            nodeType: payload.nodeType,
            trimStart: 0,
            sourceDuration: defaultDuration,
        };

        setTracks((prev) => prev.map((track) => (
            track.id === targetTrack.id
                ? { ...track, clips: [...track.clips, newClip] }
                : track
        )));
        setSelectedClipId(clipId);
        setSelectedTrackId(null);

        if (payload.type === 'video') ensureClipPreviewProxy(clipId, payload.url);

        void probeMediaDuration(payload.url, payload.type).then((duration) => {
            updateClipDurationFromSource(clipId, duration);
        });
    }, [tracks, currentTime, updateClipDurationFromSource, ensureClipPreviewProxy]);

    /** Media picker → timeline. After the timeline's "add media" tile the item
     *  lands right after that layer's last clip; otherwise at the playhead. */
    const addMediaFromPicker = useCallback((payload: GalleryDragPayload) => {
        setMediaTargetTrackId(null);
        const track = mediaTargetTrackId ? tracks.find((item) => item.id === mediaTargetTrackId) : undefined;
        if (track && trackAcceptsMedia(track.type, payload.type)) {
            const end = track.clips.reduce((max, clip) => Math.max(max, clip.startTime + clip.duration), 0);
            addMediaToTimeline(payload, track.id, end);
            seekTo(end);
            return;
        }
        addMediaToTimeline(payload);
    }, [tracks, mediaTargetTrackId, addMediaToTimeline, seekTo]);

    const pendingCanvasInsert = useStudioExploreStore((s) => s.pendingCanvasInsert);
    const clearCanvasInsert = useStudioExploreStore((s) => s.clearCanvasInsert);

    useEffect(() => {
        if (!pendingCanvasInsert) return;
        const insert = pendingCanvasInsert;
        clearCanvasInsert();

        if (insert.kind === 'prompt') {
            const text = insert.promptText.trim();
            if (!text) return;
            setTracks((prev) => {
                const existing = prev.find((track) => track.type === 'text' && !track.locked);
                const textTrack = existing ?? {
                    id: `t-text-${Date.now()}`,
                    title: t('text'),
                    type: 'text' as const,
                    muted: false,
                    locked: false,
                    hidden: false,
                    clips: [],
                };
                const clip: Clip = {
                    id: `c-${Date.now()}`,
                    trackId: textTrack.id,
                    title: text.length > 48 ? `${text.slice(0, 48)}…` : text,
                    startTime: currentTime,
                    duration: 4,
                    type: 'text',
                    color: '#06b6d4',
                };
                const next = existing ? prev : [...prev, textTrack];
                return next.map((track) => (
                    track.id === textTrack.id ? { ...track, clips: [...track.clips, clip] } : track
                ));
            });
            return;
        }

        if (insert.kind === 'assetRefs') {
            for (const item of insert.items) {
                const url = item.url || item.externalUrl;
                if (url) addMediaToTimeline({ url, type: item.type, label: item.label || item.type });
            }
            return;
        }

        const media = insert.media;
        const mediaType = String(media.type) === 'video'
            ? 'video'
            : String(media.type) === 'audio'
                ? 'audio'
                : 'image';
        addMediaToTimeline({
            url: media.url,
            type: mediaType,
            label: media.label || mediaType,
        });
    }, [pendingCanvasInsert, clearCanvasInsert, addMediaToTimeline, currentTime, t, setTracks]);

    const handleSplitClip = useCallback(() => {
        if (!selectedClipId) return;

        setTracks((prev) => prev.map((track) => {
            const clipIndex = track.clips.findIndex((c) => c.id === selectedClipId);
            if (clipIndex < 0) return track;

            const clip = track.clips[clipIndex];
            if (clip.type === 'transition') return track;
            if (currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) {
                return track;
            }

            const firstDuration = currentTime - clip.startTime;
            const secondDuration = clip.duration - firstDuration;
            const trimStart = clip.trimStart ?? 0;
            const { first: keyframesA, second: keyframesB } = splitClipKeyframes(clip.keyframes, firstDuration);

            const clipA: Clip = { ...clip, duration: firstDuration, keyframes: keyframesA };
            const clipB: Clip = {
                ...clip,
                id: `c-${Date.now()}`,
                startTime: currentTime,
                duration: secondDuration,
                trimStart: trimStart + firstDuration,
                keyframes: keyframesB,
                title: t('copy_n', { title: clip.title, n: 2 }),
            };

            const updated = [...track.clips];
            updated.splice(clipIndex, 1, clipA, clipB);
            return { ...track, clips: updated };
        }));
    }, [selectedClipId, currentTime, t]);

    const handleDeleteSelected = useCallback(() => {
        if (!selectedClipId) return;
        setTracks((prev) => prev.map((t) => ({
            ...t,
            clips: t.clips.filter((c) => c.id !== selectedClipId),
        })));
        setSelectedClipId(null);
    }, [selectedClipId, setTracks]);

    const agentTrackTitle = useCallback((type: 'video' | 'audio') => {
        const count = tracksRef.current.filter((t) => t.type === type).length;
        return type === 'video'
            ? t('video_n', { index: count + 1 })
            : t('audio_n', { index: count + 1 });
    }, [t]);

    /** Applies a batch of agent commands as a single undoable edit. */
    const applyAgentCommands = useCallback((commands: AgentCommand[]): AgentCommandResult[] => {
        const results: AgentCommandResult[] = [];
        if (!Array.isArray(commands) || !commands.length) return results;
        beginHistoryGesture();

        const findClip = (clipId: string) => {
            for (const track of tracksRef.current) {
                const clip = track.clips.find((c) => c.id === clipId);
                if (clip) return { track, clip };
            }
            return null;
        };

        const runCommand = (command: AgentCommand): AgentCommandResult => {
            switch (command.type) {
                case 'addMedia': {
                    const url = String(command.url || '').trim();
                    const kind = command.mediaType;
                    if (!url || !['video', 'image', 'audio'].includes(kind)) {
                        return { type: command.type, ok: false, detail: 'invalid media' };
                    }
                    const wantedType = kind === 'audio' ? 'audio' : 'video';
                    const targetTrack = (command.trackId
                        ? tracksRef.current.find((tr) => tr.id === command.trackId)
                        : null)
                        ?? tracksRef.current.find((tr) => tr.type === wantedType && !tr.locked);
                    if (!targetTrack) {
                        return { type: command.type, ok: false, detail: 'no suitable track' };
                    }
                    const clipId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                    const explicitDuration = Number(command.duration);
                    const duration = Number.isFinite(explicitDuration) && explicitDuration > 0
                        ? Math.max(MIN_CLIP_DURATION, explicitDuration)
                        : (kind === 'image' ? DEFAULT_IMAGE_DURATION : DEFAULT_MEDIA_DURATION);
                    const newClip: Clip = {
                        id: clipId,
                        trackId: targetTrack.id,
                        title: String(command.title || kind),
                        startTime: Math.max(0, Number(command.startTime) || 0),
                        duration,
                        type: wantedType,
                        color: clipColors(kind),
                        sourceUrl: url,
                        mediaType: kind,
                        trimStart: 0,
                        sourceDuration: duration,
                        ...(command.frame ? { frame: resolveAgentFrame(command.frame, DEFAULT_CLIP_FRAME) } : {}),
                        ...(command.animation ? { animation: resolveAgentAnimation(command.animation) } : {}),
                    };
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === targetTrack.id ? { ...tr, clips: [...tr.clips, newClip] } : tr
                    )));
                    if (kind === 'video') ensureClipPreviewProxy(clipId, url);
                    if (!Number.isFinite(explicitDuration) || explicitDuration <= 0) {
                        void probeMediaDuration(url, kind).then((probed) => updateClipDurationFromSource(clipId, probed));
                    }
                    setSelectedClipId(clipId);
                    setSelectedTrackId(null);
                    return { type: command.type, ok: true, detail: clipId };
                }
                case 'moveClip': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    const nextStart = Math.max(0, Number(command.startTime) || 0);
                    let destTrackId = found.track.id;
                    if (command.trackId && command.trackId !== found.track.id) {
                        const dest = tracksRef.current.find((tr) => tr.id === command.trackId);
                        if (dest && canClipMoveToTrack(found.clip, dest)) destTrackId = dest.id;
                    }
                    setTracksSilent((prev) => prev.map((tr) => {
                        if (tr.id === found.track.id && destTrackId === found.track.id) {
                            return { ...tr, clips: tr.clips.map((c) => (c.id === command.clipId ? { ...c, startTime: nextStart } : c)) };
                        }
                        if (tr.id === found.track.id) return { ...tr, clips: tr.clips.filter((c) => c.id !== command.clipId) };
                        if (tr.id === destTrackId) {
                            return { ...tr, clips: [...tr.clips, { ...found.clip, startTime: nextStart, trackId: destTrackId }] };
                        }
                        return tr;
                    }));
                    return { type: command.type, ok: true };
                }
                case 'nudgeClip': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    const nextStart = Math.max(0, found.clip.startTime + (Number(command.delta) || 0));
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id
                            ? { ...tr, clips: tr.clips.map((c) => (c.id === command.clipId ? { ...c, startTime: nextStart } : c)) }
                            : tr
                    )));
                    return { type: command.type, ok: true, detail: `start=${nextStart.toFixed(2)}` };
                }
                case 'trimClip': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    if (isTransitionClip(found.clip)) return { type: command.type, ok: false, detail: 'transition clip' };
                    const clip = found.clip;
                    const trimStart = command.trimStart != null
                        ? Math.max(0, Number(command.trimStart))
                        : (clip.trimStart ?? 0);
                    const sourceDuration = clip.sourceDuration ?? (clip.duration + (clip.trimStart ?? 0));
                    let duration = command.duration != null
                        ? Number(command.duration)
                        : clip.duration;
                    duration = Math.max(MIN_CLIP_DURATION, Math.min(duration, sourceDuration - trimStart));
                    if (!Number.isFinite(duration)) return { type: command.type, ok: false, detail: 'invalid duration' };
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id
                            ? { ...tr, clips: tr.clips.map((c) => (c.id === command.clipId ? { ...c, trimStart, duration } : c)) }
                            : tr
                    )));
                    return { type: command.type, ok: true };
                }
                case 'deleteClip': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    setTracksSilent((prev) => prev.map((tr) => ({
                        ...tr,
                        clips: tr.clips.filter((c) => c.id !== command.clipId),
                    })));
                    if (selectedClipId === command.clipId) setSelectedClipId(null);
                    return { type: command.type, ok: true };
                }
                case 'splitClip': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    const clip = found.clip;
                    if (isTransitionClip(clip)) return { type: command.type, ok: false, detail: 'transition clip' };
                    const at = Number(command.atTime);
                    if (!(at > clip.startTime) || !(at < clip.startTime + clip.duration)) {
                        return { type: command.type, ok: false, detail: 'atTime outside clip' };
                    }
                    const firstDuration = at - clip.startTime;
                    const trimStart = clip.trimStart ?? 0;
                    const { first: keyframesA, second: keyframesB } = splitClipKeyframes(clip.keyframes, firstDuration);
                    const clipB: Clip = {
                        ...clip,
                        id: `c-${Date.now()}-b`,
                        startTime: at,
                        duration: clip.duration - firstDuration,
                        trimStart: trimStart + firstDuration,
                        keyframes: keyframesB,
                    };
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id
                            ? {
                                ...tr,
                                clips: tr.clips.flatMap((c) => (
                                    c.id === clip.id
                                        ? [{ ...c, duration: firstDuration, keyframes: keyframesA }, clipB]
                                        : [c]
                                )),
                            }
                            : tr
                    )));
                    return { type: command.type, ok: true };
                }
                case 'setClipFrame': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    const current = found.clip.frame ?? DEFAULT_CLIP_FRAME;
                    const next = {
                        x: command.x != null ? Number(command.x) : current.x,
                        y: command.y != null ? Number(command.y) : current.y,
                        width: command.width != null ? Number(command.width) : current.width,
                        height: command.height != null ? Number(command.height) : current.height,
                    };
                    // Frames may bleed past the canvas — clamp to generous bounds.
                    next.width = Math.min(FRAME_SIZE_LIMIT, Math.max(MIN_FRAME_SIZE, next.width));
                    next.height = Math.min(FRAME_SIZE_LIMIT, Math.max(MIN_FRAME_SIZE, next.height));
                    next.x = Math.min(FRAME_POS_LIMIT, Math.max(-FRAME_POS_LIMIT, next.x));
                    next.y = Math.min(FRAME_POS_LIMIT, Math.max(-FRAME_POS_LIMIT, next.y));
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id
                            ? { ...tr, clips: tr.clips.map((c) => (c.id === command.clipId ? { ...c, frame: next } : c)) }
                            : tr
                    )));
                    return { type: command.type, ok: true };
                }
                case 'scaleClip': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    const scale = Number(command.scale);
                    if (!Number.isFinite(scale) || scale <= 0 || scale > 20) {
                        return { type: command.type, ok: false, detail: 'invalid scale' };
                    }
                    const current = found.clip.frame ?? DEFAULT_CLIP_FRAME;
                    const centerX = current.x + current.width / 2;
                    const centerY = current.y + current.height / 2;
                    const width = Math.min(FRAME_SIZE_LIMIT, Math.max(MIN_FRAME_SIZE, current.width * scale));
                    const height = Math.min(FRAME_SIZE_LIMIT, Math.max(MIN_FRAME_SIZE, current.height * scale));
                    const next = {
                        width,
                        height,
                        x: Math.min(FRAME_POS_LIMIT - width, Math.max(-FRAME_POS_LIMIT, centerX - width / 2)),
                        y: Math.min(FRAME_POS_LIMIT - height, Math.max(-FRAME_POS_LIMIT, centerY - height / 2)),
                    };
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id
                            ? { ...tr, clips: tr.clips.map((c) => (c.id === command.clipId ? { ...c, frame: next } : c)) }
                            : tr
                    )));
                    return { type: command.type, ok: true };
                }
                case 'resetClipFrame': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id
                            ? { ...tr, clips: tr.clips.map((c) => (c.id === command.clipId ? { ...c, frame: { ...DEFAULT_CLIP_FRAME } } : c)) }
                            : tr
                    )));
                    return { type: command.type, ok: true };
                }
                case 'addTextClip': {
                    const text = String(command.text ?? '').trim().slice(0, 500);
                    if (!text) return { type: command.type, ok: false, detail: 'empty text' };
                    const start = Math.max(0, Number(command.startTime) || currentTimeRef.current);
                    const duration = Math.max(MIN_CLIP_DURATION, Number(command.duration) || 4);
                    const style = (command.style && typeof command.style === 'object'
                        ? command.style as Partial<TextClipStyle>
                        : undefined);
                    const clipId = `c-text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                    const agentFrame = command.frame
                        ? resolveAgentFrame(command.frame, { x: 0.06, y: 0.4, width: 0.88, height: 0.2 })
                        : { x: 0.06, y: 0.4, width: 0.88, height: 0.2 };
                    setTracksSilent((prev) => {
                        const existing = prev.find((tr) => tr.type === 'text' && !tr.locked);
                        const trackId = existing?.id ?? `t-text-${Date.now()}`;
                        const clip: Clip = {
                            id: clipId,
                            trackId,
                            title: String(command.title || (text.length > 42 ? `${text.slice(0, 42)}…` : text)),
                            startTime: start,
                            duration,
                            type: 'text',
                            color: '#06b6d4',
                            text,
                            // Sparse overrides only — follow the track default.
                            ...(style && Object.keys(style).length ? { textStyle: style } : {}),
                            frame: agentFrame,
                        };
                        if (existing) {
                            return prev.map((tr) => (
                                tr.id === trackId ? { ...tr, clips: [...tr.clips, clip] } : tr
                            ));
                        }
                        return [...prev, {
                            id: trackId,
                            title: t('text'),
                            type: 'text' as const,
                            muted: false,
                            locked: false,
                            hidden: false,
                            clips: [clip],
                        }];
                    });
                    setSelectedClipId(clipId);
                    setSelectedTrackId(null);
                    return { type: command.type, ok: true, detail: clipId };
                }
                case 'setTextStyle': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    if (found.clip.type !== 'text') return { type: command.type, ok: false, detail: 'not a text clip' };
                    const nextText = command.text != null
                        ? String(command.text).slice(0, 500)
                        : undefined;
                    const stylePatch = (command.style && typeof command.style === 'object'
                        ? command.style as Partial<TextClipStyle>
                        : {});
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id
                            ? {
                                ...tr,
                                clips: tr.clips.map((c) => (c.id === command.clipId
                                    ? {
                                        ...c,
                                        ...(nextText != null ? { text: nextText } : {}),
                                        // Overrides stay sparse on top of the track default.
                                        textStyle: { ...(c.textStyle ?? {}), ...stylePatch },
                                    }
                                    : c)),
                            }
                            : tr
                    )));
                    return { type: command.type, ok: true };
                }
                case 'setClipAnimation': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    if (isTransitionClip(found.clip)) return { type: command.type, ok: false, detail: 'transition clip' };
                    const current = found.clip.animation ?? {};
                    const next: ClipAnimation = { ...current };
                    if (command.enter !== undefined) {
                        next.enter = command.enter
                            ? { motion: command.enter.motion, ...(command.enter.duration != null ? { duration: Number(command.enter.duration) } : {}) }
                            : undefined;
                    }
                    if (command.exit !== undefined) {
                        next.exit = command.exit
                            ? { motion: command.exit.motion, ...(command.exit.duration != null ? { duration: Number(command.exit.duration) } : {}) }
                            : undefined;
                    }
                    if (command.loop !== undefined) {
                        next.loop = command.loop
                            ? {
                                kind: command.loop.kind,
                                ...(command.loop.amplitude != null ? { amplitude: Number(command.loop.amplitude) } : {}),
                                ...(command.loop.speed != null ? { speed: Number(command.loop.speed) } : {}),
                            }
                            : undefined;
                    }
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id
                            ? { ...tr, clips: tr.clips.map((c) => (c.id === command.clipId ? { ...c, animation: next } : c)) }
                            : tr
                    )));
                    return { type: command.type, ok: true };
                }
                case 'addTransition': {
                    const found = findClip(command.afterClipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    if (!trackAcceptsTransition(found.track)) return { type: command.type, ok: false, detail: 'not a video track' };
                    if (isTransitionClip(found.clip)) return { type: command.type, ok: false, detail: 'transition clip' };
                    const duration = Math.max(
                        MIN_TRANSITION_DURATION,
                        Math.min(Number(command.duration) || 0.5, found.clip.duration * 0.9),
                    );
                    const clipId = `c-tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                    const snapped = snapTransitionToTrackCut(
                        found.track,
                        found.clip.startTime + found.clip.duration,
                        duration,
                    );
                    const intensity = Number(command.intensity);
                    const newClip: Clip = {
                        id: clipId,
                        trackId: found.track.id,
                        title: 'Cross dissolve',
                        startTime: snapped.startTime,
                        duration: snapped.duration,
                        type: 'transition',
                        transitionType: 'crossDissolve',
                        transitionIntensity: Number.isFinite(intensity)
                            ? Math.min(1, Math.max(0, intensity))
                            : 1,
                        transitionCurve: command.curve || 'smooth',
                        color: TRANSITION_CLIP_COLOR,
                    };
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === found.track.id ? { ...tr, clips: [...tr.clips, newClip] } : tr
                    )));
                    return { type: command.type, ok: true, detail: clipId };
                }
                case 'setCanvas': {
                    const preset = command.preset
                        ? CANVAS_PRESETS.find((item) => item.label === command.preset)
                        : undefined;
                    const requestedWidth = preset?.width ?? (Number(command.width) || canvasRef.current.width);
                    const requestedHeight = preset?.height ?? (Number(command.height) || canvasRef.current.height);
                    const width = Math.max(2, Math.round(requestedWidth / 2) * 2);
                    const height = Math.max(2, Math.round(requestedHeight / 2) * 2);
                    setCanvas((prev) => ({ ...prev, width, height }));
                    return { type: command.type, ok: true, detail: `${width}x${height}` };
                }
                case 'addTrack': {
                    const trackType = command.trackType === 'audio' ? 'audio' : 'video';
                    const newTrack: Track = {
                        id: `t-${trackType}-${Date.now()}`,
                        title: agentTrackTitle(trackType),
                        type: trackType,
                        muted: false,
                        locked: false,
                        hidden: false,
                        clips: [],
                    };
                    setTracksSilent((prev) => (trackType === 'video' ? [newTrack, ...prev] : [...prev, newTrack]));
                    return { type: command.type, ok: true, detail: newTrack.id };
                }
                case 'deleteTrack': {
                    const track = tracksRef.current.find((tr) => tr.id === command.trackId);
                    if (!track) return { type: command.type, ok: false, detail: 'track not found' };
                    setTracksSilent((prev) => prev.filter((tr) => tr.id !== command.trackId));
                    return { type: command.type, ok: true };
                }
                case 'updateTrack': {
                    const track = tracksRef.current.find((tr) => tr.id === command.trackId);
                    if (!track) return { type: command.type, ok: false, detail: 'track not found' };
                    setTracksSilent((prev) => prev.map((tr) => (
                        tr.id === command.trackId
                            ? {
                                ...tr,
                                muted: command.muted != null ? Boolean(command.muted) : tr.muted,
                                hidden: command.hidden != null ? Boolean(command.hidden) : tr.hidden,
                                locked: command.locked != null ? Boolean(command.locked) : tr.locked,
                            }
                            : tr
                    )));
                    return { type: command.type, ok: true };
                }
                case 'seek': {
                    const time = Math.max(0, Number(command.time) || 0);
                    pausePlayback();
                    seekTo(time);
                    return { type: command.type, ok: true };
                }
                case 'play': {
                    if (totalDuration <= 0) return { type: command.type, ok: false, detail: 'empty timeline' };
                    startPlayback();
                    return { type: command.type, ok: true };
                }
                case 'pause': {
                    pausePlayback();
                    return { type: command.type, ok: true };
                }
                case 'selectClip': {
                    const found = findClip(command.clipId);
                    if (!found) return { type: command.type, ok: false, detail: 'clip not found' };
                    setSelectedClipId(command.clipId);
                    setSelectedTrackId(null);
                    return { type: command.type, ok: true };
                }
                default:
                    return { type: String((command as { type?: string }).type || 'unknown'), ok: false, detail: 'unknown command' };
            }
        };

        for (const command of commands) {
            try {
                results.push(runCommand(command));
            } catch (error) {
                results.push({ type: String((command as { type?: string })?.type || 'unknown'), ok: false, detail: String(error) });
            }
        }
        return results;
    }, [agentTrackTitle, beginHistoryGesture, selectedClipId, setTracksSilent, totalDuration, updateClipDurationFromSource, pausePlayback, startPlayback, seekTo, ensureClipPreviewProxy]);

    const getAgentSnapshot = useCallback((): AgentEditorSnapshot => ({
        canvas: { ...canvasRef.current },
        currentTime,
        totalDuration,
        isPlaying,
        selectedClipId,
        tracks: tracksRef.current.map((track) => ({
            id: track.id,
            title: track.title,
            type: track.type,
            muted: track.muted,
            hidden: track.hidden,
            locked: track.locked,
            clips: track.clips.map((clip) => ({
                id: clip.id,
                title: clip.title,
                type: clip.type,
                mediaType: clip.mediaType,
                startTime: Math.round(clip.startTime * 1000) / 1000,
                duration: Math.round(clip.duration * 1000) / 1000,
                trimStart: Math.round((clip.trimStart ?? 0) * 1000) / 1000,
                sourceDuration: clip.sourceDuration,
                hasSource: Boolean(clip.sourceUrl),
                frame: clip.frame,
                ...(clip.type === 'text' ? { text: clip.text } : {}),
            })),
        })),
    }), [currentTime, totalDuration, isPlaying, selectedClipId]);

    /** Durable restore point for one AI-chat turn — the current editor state,
     *  persisted BEFORE the plan's commands touch the timeline. */
    const createChatSnapshot = useCallback(async (label: string): Promise<{ _id: string } | null> => {
        const state = serializeVideoEditor(tracksRef.current, canvasRef.current);
        const snapshot = await createVideoEditorSnapshot(projectId, {
            label: String(label || '').slice(0, 300),
            state,
        });
        return snapshot?._id ? { _id: snapshot._id } : null;
    }, [projectId]);

    /** Roll the whole editor back to a chat restore point and persist it. */
    const restoreChatSnapshot = useCallback(async (snapshotId: string): Promise<boolean> => {
        try {
            const snapshot = await getVideoEditorSnapshot(projectId, snapshotId);
            const restoredTracks = deserializeVideoEditor(snapshot?.state);
            // An empty tracks array is a valid restore target (fresh project) —
            // only null means the snapshot state itself was unreadable.
            if (!restoredTracks) return false;
            const restoredCanvas = deserializeVideoEditorCanvas(snapshot?.state);
            resetTracks(restoredTracks);
            setCanvas(restoredCanvas);
            // Baseline autosave at the restored state, then write it through —
            // otherwise the debounced save would push the pre-restore state back.
            finishHydration(restoredTracks, restoredCanvas);
            await mediaApi.updateVideoEditor(projectId, {
                videoEditor: serializeVideoEditor(restoredTracks, restoredCanvas),
            });
            setSelectedClipId(null);
            setSelectedTrackId(null);
            setIsPlaying(false);
            return true;
        } catch {
            return false;
        }
    }, [projectId, resetTracks, finishHydration]);

    /** Global times worth snapping the playhead onto: every clip edge plus
     *  every keyframe (keyframe times are clip-local; convert to timeline). */
    const collectScrubSnapPoints = useCallback((): number[] => {
        const points = new Set<number>([0]);
        for (const track of tracksRef.current) {
            for (const clip of track.clips) {
                if (isTransitionClip(clip)) continue;
                points.add(roundKeyframeTime(clip.startTime));
                points.add(roundKeyframeTime(clip.startTime + clip.duration));
                for (const kfTime of unionKeyframeTimes(clip.keyframes)) {
                    points.add(roundKeyframeTime(clip.startTime + kfTime));
                }
            }
        }
        return [...points];
    }, []);

    const beginScrub = useCallback((clientX: number, pointerId: number, pointerType: string) => {
        pausePlayback();

        const snapPoints = collectScrubSnapPoints();
        dragRef.current = { kind: 'scrub', startX: clientX, originTime: currentTimeRef.current };
        let lastHeartbeat = 0;
        // Touch scrubs commit React state only when a clip enters/leaves the
        // playhead (so its preview layer mounts); a full editor re-render on
        // every heartbeat is what made the line stutter on phones.
        const isTouch = pointerType === 'touch';
        const layerKeyAt = (time: number) => computePreviewLayers(tracksRef.current, time)
            .map((layer) => layer.clip.id)
            .join('|');
        let lastLayerKey = isTouch ? layerKeyAt(currentTimeRef.current) : '';
        // Coalesce moves into one paint per frame.
        let pendingX: number | null = null;
        let frame = 0;

        const applyX = (x: number) => {
            const content = tracksContentRef.current;
            if (!content) return;
            const raw = timeFromPointer(x, content.getBoundingClientRect().left, zoomLevel);
            // Magnetic snap onto keyframes / clip edges (8px at this zoom).
            const snapResult = calculateSnap(raw, snapPoints, zoomLevel);
            setActiveSnapLine(snapResult.isSnapped ? snapResult.snapPoint ?? null : null);
            currentTimeRef.current = snapResult.snappedTime;
            paintAt(snapResult.snappedTime);
            if (isTouch) {
                const layerKey = layerKeyAt(snapResult.snappedTime);
                if (layerKey !== lastLayerKey) {
                    lastLayerKey = layerKey;
                    setCurrentTime(snapResult.snappedTime);
                }
                return;
            }
            const now = performance.now();
            if (now - lastHeartbeat >= TRANSPORT_HEARTBEAT_MS) {
                lastHeartbeat = now;
                setCurrentTime(snapResult.snappedTime);
            }
        };

        bindPointerDrag(pointerId, {
            onMove: (event) => {
                pendingX = event.clientX;
                if (frame) return;
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    if (pendingX === null) return;
                    const x = pendingX;
                    pendingX = null;
                    applyX(x);
                });
            },
            onEnd: () => {
                if (frame) cancelAnimationFrame(frame);
                frame = 0;
                if (pendingX !== null) applyX(pendingX);
                pendingX = null;
                dragRef.current = null;
                setActiveSnapLine(null);
                setCurrentTime(currentTimeRef.current);
            },
        });
    }, [pausePlayback, collectScrubSnapPoints, zoomLevel, paintAt, bindPointerDrag]);

    const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const raw = resolveDropTime(e.clientX);
        // A single click also lands exactly on the nearest keyframe/clip edge.
        seekTo(calculateSnap(raw, collectScrubSnapPoints(), zoomLevel).snappedTime);
        beginScrub(e.clientX, e.pointerId, e.pointerType);
    };

    const handleClipMoveStart = (e: React.PointerEvent, trackId: string, clip: Clip) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setSelectedClipId(clip.id);
        setSelectedTrackId(null);
        if (
            resolveClipMediaKind(clip) !== 'audio'
            && (currentTime < clip.startTime || currentTime >= clip.startTime + clip.duration)
        ) {
            seekTo(clip.startTime + Math.min(0.05, clip.duration / 2));
        }
        beginHistoryGesture();

        dragRef.current = {
            kind: 'move',
            clipId: clip.id,
            trackId,
            startX: e.clientX,
            originalStart: clip.startTime,
            duration: clip.duration,
        };

        const snapPoints = getSnapPoints(clip.id);
        const snapper = createClipSnapper(snapPoints, zoomLevel);
        clipSnapperRef.current = snapper;

        bindPointerDrag(e.pointerId, {
            onMove: (moveEvent) => {
                const drag = dragRef.current;
                if (!drag || drag.kind !== 'move') return;

                const deltaX = moveEvent.clientX - drag.startX;
                const rawStart = Math.max(0, drag.originalStart + deltaX / zoomLevel);
                const snapResult = snapper.snap(rawStart, drag.duration);
                const finalStart = snapResult.start;
                setActiveSnapLine(snapResult.snapPoint);

                const hoveredTrackId = resolveTrackIdFromPoint(moveEvent.clientX, moveEvent.clientY);
                const prevTracks = tracksRef.current;
                const sourceTrack = prevTracks.find((t) => t.id === drag.trackId);
                const movingClip = sourceTrack?.clips.find((c) => c.id === drag.clipId);
                if (!movingClip) return;

                let destTrackId = drag.trackId;
                if (hoveredTrackId) {
                    const hoveredTrack = prevTracks.find((t) => t.id === hoveredTrackId);
                    if (hoveredTrack && canClipMoveToTrack(movingClip, hoveredTrack)) {
                        destTrackId = hoveredTrack.id;
                        setDropTrackId(destTrackId);
                    } else {
                        setDropTrackId(null);
                    }
                } else {
                    setDropTrackId(null);
                }

                const updatedClip: Clip = {
                    ...movingClip,
                    startTime: finalStart,
                    trackId: destTrackId,
                };

                setTracksSilent((prev) => {
                    if (destTrackId === drag.trackId) {
                        return prev.map((t) => (
                            t.id === drag.trackId
                                ? { ...t, clips: t.clips.map((c) => (c.id === drag.clipId ? updatedClip : c)) }
                                : t
                        ));
                    }

                    return prev.map((t) => {
                        if (t.id === drag.trackId) {
                            return { ...t, clips: t.clips.filter((c) => c.id !== drag.clipId) };
                        }
                        if (t.id === destTrackId) {
                            const without = t.clips.filter((c) => c.id !== drag.clipId);
                            return { ...t, clips: [...without, updatedClip] };
                        }
                        return t;
                    });
                });

                if (destTrackId !== drag.trackId) {
                    dragRef.current = { ...drag, trackId: destTrackId };
                }
            },
            onEnd: () => {
                dragRef.current = null;
                clipSnapperRef.current = null;
                setActiveSnapLine(null);
                setDropTrackId(null);
            },
        });
    };

    const handleTrimStart = (
        e: React.PointerEvent,
        trackId: string,
        clip: Clip,
        edge: 'left' | 'right',
    ) => {
        e.stopPropagation();
        setSelectedClipId(clip.id);
        setSelectedTrackId(null);
        beginHistoryGesture();

        const sourceDuration = clip.sourceDuration ?? clip.duration;
        const trimStart = clip.trimStart ?? 0;
        const clipStartTime = clip.startTime;
        // Keyframes are recomputed from the pre-trim state every tick (same
        // contract as the duration/trimStart math below).
        const originalKeyframes = clip.keyframes;
        const trimSnapper = createClipSnapper(getSnapPoints(clip.id), zoomLevel);
        const trimEdge: 'start' | 'end' = edge === 'left' ? 'start' : 'end';

        dragRef.current = edge === 'left'
            ? {
                kind: 'trim-left',
                clipId: clip.id,
                trackId,
                startX: e.clientX,
                originalStart: clip.startTime,
                originalDuration: clip.duration,
                originalTrimStart: trimStart,
                sourceDuration,
            }
            : {
                kind: 'trim-right',
                clipId: clip.id,
                trackId,
                startX: e.clientX,
                originalDuration: clip.duration,
                trimStart,
                sourceDuration,
            };

        bindPointerDrag(e.pointerId, {
            onMove: (moveEvent) => {
                const drag = dragRef.current;
                if (!drag || drag.kind === 'scrub' || drag.kind === 'move') return;
                if (drag.clipId !== clip.id) return;

                const delta = (moveEvent.clientX - drag.startX) / zoomLevel;

                setTracksSilent((prev) => prev.map((t) => {
                    if (t.id !== trackId) return t;
                    return {
                        ...t,
                        clips: t.clips.map((c) => {
                            if (c.id !== clip.id) return c;

                            if (isTransitionClip(c)) {
                                if (drag.kind === 'trim-left') {
                                    const maxDelta = drag.originalDuration - MIN_TRANSITION_DURATION;
                                    const clamped = Math.max(-drag.originalStart, Math.min(maxDelta, delta));
                                    return {
                                        ...c,
                                        startTime: drag.originalStart + clamped,
                                        duration: drag.originalDuration - clamped,
                                    };
                                }
                                return {
                                    ...c,
                                    duration: Math.max(
                                        MIN_TRANSITION_DURATION,
                                        drag.originalDuration + delta,
                                    ),
                                };
                            }

                            if (drag.kind === 'trim-left') {
                                const maxDelta = drag.originalDuration - MIN_CLIP_DURATION;
                                const clamped = Math.max(-drag.originalStart, Math.min(maxDelta, delta));
                                const candidateStart = drag.originalStart + clamped;
                                const candidateDuration = drag.originalDuration - clamped;
                                const snapped = trimSnapper.snap(candidateStart, candidateDuration, [trimEdge]);
                                const snappedStart = Math.min(
                                    drag.originalStart + maxDelta,
                                    Math.max(0, snapped.start),
                                );
                                const newTrimStart = Math.min(
                                    drag.sourceDuration - MIN_CLIP_DURATION,
                                    drag.originalTrimStart + (snappedStart - drag.originalStart),
                                );
                                const trimDelta = newTrimStart - drag.originalTrimStart;
                                return {
                                    ...c,
                                    startTime: drag.originalStart + trimDelta,
                                    trimStart: newTrimStart,
                                    duration: drag.originalDuration - trimDelta,
                                    // Keyframes ride with the media; the entry
                                    // value is pinned at the new start.
                                    keyframes: shiftClipKeyframesForTrimLeft(
                                        originalKeyframes,
                                        trimDelta,
                                        drag.originalDuration - trimDelta,
                                    ),
                                };
                            }

                            const maxDuration = drag.sourceDuration - drag.trimStart;
                            const candidateDuration = Math.max(
                                MIN_CLIP_DURATION,
                                Math.min(maxDuration, drag.originalDuration + delta),
                            );
                            const snappedRight = trimSnapper.snap(clipStartTime, candidateDuration, [trimEdge]);
                            const snappedDuration = snappedRight.snapPoint !== null
                                ? Math.max(MIN_CLIP_DURATION, snappedRight.snapPoint - clipStartTime)
                                : candidateDuration;
                            const newDuration = Math.max(
                                MIN_CLIP_DURATION,
                                Math.min(maxDuration, snappedDuration),
                            );
                            return {
                                ...c,
                                duration: newDuration,
                                keyframes: clampClipKeyframesToDuration(originalKeyframes, newDuration),
                            };
                        }),
                    };
                }));
            },
            onEnd: () => {
                dragRef.current = null;
                setActiveSnapLine(null);
            },
        });
    };

    const addTransitionAtDrop = useCallback((
        preferredTrackId: string | null,
        dropTime: number,
        payload: TransitionDragPayload,
    ) => {
        const clipId = `c-tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const videoTracks = tracks.filter((t) => t.type === 'video' && !t.locked);
        const targetTrack = (preferredTrackId
            ? videoTracks.find((t) => t.id === preferredTrackId)
            : null) ?? videoTracks[0];

        if (!targetTrack) return;

        const snapped = snapTransitionToTrackCut(targetTrack, dropTime, payload.duration);
        const newClip: Clip = {
            id: clipId,
            trackId: targetTrack.id,
            title: payload.label,
            startTime: snapped.startTime,
            duration: snapped.duration,
            type: 'transition',
            transitionType: payload.type,
            transitionIntensity: 1,
            transitionCurve: 'smooth',
            color: TRANSITION_CLIP_COLOR,
        };

        setTracks((prev) => prev.map((t) => (
            t.id === targetTrack.id ? { ...t, clips: [...t.clips, newClip] } : t
        )));
        setSelectedClipId(clipId);
        setSelectedTrackId(null);
    }, [tracks, setTracks]);

    const handleFlipTransition = useCallback((clipId?: string) => {
        const targetId = clipId ?? selectedClipId;
        if (!targetId) return;
        setTracks((prev) => prev.map((t) => ({
            ...t,
            clips: t.clips.map((c) => (
                c.id === targetId && isTransitionClip(c)
                    ? { ...c, reversed: !c.reversed }
                    : c
            )),
        })));
        if (clipId) setSelectedClipId(clipId);
    }, [selectedClipId, setTracks]);

    const handleTrackDragOver = (e: React.DragEvent, trackId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDropTrackId(trackId);
    };

    const handleTrackDrop = (e: React.DragEvent, trackId: string) => {
        e.preventDefault();
        setDropTrackId(null);

        const transitionRaw = e.dataTransfer.getData(TRANSITION_MIME);
        if (transitionRaw) {
            try {
                const payload = JSON.parse(transitionRaw) as TransitionDragPayload;
                const track = tracks.find((t) => t.id === trackId);
                const targetTrackId = track && trackAcceptsTransition(track) ? trackId : null;
                addTransitionAtDrop(targetTrackId, resolveDropTime(e.clientX), payload);
            } catch {
                /* ignore invalid payload */
            }
            return;
        }

        const raw = e.dataTransfer.getData(GALLERY_MIME);
        if (!raw) return;

        try {
            const payload = JSON.parse(raw) as GalleryDragPayload;
            const track = tracks.find((t) => t.id === trackId);
            if (!track || !trackAcceptsMedia(track.type, payload.type)) return;
            addMediaToTimeline(payload, trackId, resolveDropTime(e.clientX));
        } catch {
            /* ignore invalid payload */
        }
    };

    const handleAddTrack = (type: ClipType) => {
        if (type === 'transition') return;
        const sameType = tracks.filter((t) => t.type === type);
        const newTrack: Track = {
            id: `t-${type}-${Date.now()}`,
            title: type === 'video'
                ? t('video_n', { index: sameType.length + 1 })
                : t('audio_n', { index: sameType.length + 1 }),
            type,
            muted: false,
            locked: false,
            hidden: false,
            clips: [],
        };
        setTracks((prev) => (type === 'video' ? [newTrack, ...prev] : [...prev, newTrack]));
    };

    const handleDeleteTrack = (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (!track) return;

        const clipCount = track.clips.length;
        const message = clipCount > 0
            ? t('delete_layer_with_clips', { title: track.title, count: clipCount })
            : t('delete_layer', { title: track.title });

        if (!window.confirm(message)) return;

        setTracks((prev) => prev.filter((t) => t.id !== trackId));
        if (selectedTrackId === trackId) setSelectedTrackId(null);
        if (selectedClipId && track.clips.some((c) => c.id === selectedClipId)) {
            setSelectedClipId(null);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest('[contenteditable="true"]'))) return;

            // The full-screen player only watches: play/pause, ±5s, close.
            if (playerOpen) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    if (!e.repeat) togglePlayback();
                } else if (e.key === 'Escape') {
                    setPlayerOpen(false);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    seekBy(e.key === 'ArrowRight' ? PLAYER_SEEK_STEP_S : -PLAYER_SEEK_STEP_S);
                }
                return;
            }

            if (isModLetter(e, 'z') && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            if (isModLetter(e, 'y') || (isModLetter(e, 'z') && e.shiftKey)) {
                e.preventDefault();
                redo();
                return;
            }
            if (isModLetter(e, 'c')) {
                e.preventDefault();
                handleCopyClip();
                return;
            }
            if (isModLetter(e, 'v')) {
                e.preventDefault();
                handlePasteClip();
                return;
            }

            // Space = play/pause ( Premiere-style ); held key must not retrigger.
            if (e.code === 'Space') {
                e.preventDefault();
                if (!e.repeat) togglePlayback();
                return;
            }

            if (e.code === 'Delete' || e.code === 'Backspace') handleDeleteSelected();
            if (e.code === 'KeyS' && !(e.ctrlKey || e.metaKey)) handleSplitClip();
            if (isModLetter(e, 'r') && selectedTransitionClip) {
                e.preventDefault();
                handleFlipTransition();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleDeleteSelected, handleSplitClip, undo, redo, handleCopyClip, handlePasteClip, handleFlipTransition, selectedTransitionClip, togglePlayback, playerOpen, seekBy]);

    useEffect(() => {
        if (!isPlaying) return;

        playStartRef.current = performance.now();
        playOriginRef.current = currentTimeRef.current;
        let lastHeartbeat = 0;
        let raf = 0;

        const tick = (now: number) => {
            const next = playOriginRef.current + (now - playStartRef.current) / 1000;
            if (next >= totalDuration) {
                currentTimeRef.current = totalDuration;
                playingRef.current = false;
                paintAt(totalDuration);
                setCurrentTime(totalDuration);
                setIsPlaying(false);
                return;
            }
            currentTimeRef.current = next;
            paintAt(next);
            // Low-frequency React mirror for panels (timecodes, keyframe
            // diamonds, transform controls); motion itself is DOM-painted.
            if (now - lastHeartbeat >= TRANSPORT_HEARTBEAT_MS) {
                lastHeartbeat = now;
                setCurrentTime(next);
            }
            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [isPlaying, totalDuration, paintAt]);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }, [theme]);

    const videoTracks = tracks.filter((t) => t.type === 'video');
    const audioTracks = tracks.filter((t) => t.type === 'audio');

    const renderClip = (trackId: string, clip: Clip, trackType: ClipType) => {
        const isTransition = isTransitionClip(clip);
        const isVideo = trackType === 'video' && !isTransition;
        const isAudio = trackType === 'audio';
        const width = clip.duration * zoomLevel;
        const selected = selectedClipId === clip.id;
        // Keyframe diamonds — one per unique time across all channels.
        const kfTimes = isTransition ? [] : unionKeyframeTimes(clip.keyframes);
        const playheadInside = currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration;
        const activeLocal = playheadInside ? clipLocalTimeAt(clip, currentTime) : -1;

        return (
            <div
                key={clip.id}
                className={`${styles.clip} ${isVideo ? styles.videoClip : ''} ${isTransition ? styles.transitionClip : ''} ${selected ? styles.selected : ''} ${clip.reversed ? styles.reversed : ''}`}
                style={{
                    left: `${clip.startTime * zoomLevel}px`,
                    width: `${width}px`,
                    backgroundColor: isTransition ? TRANSITION_CLIP_COLOR : clip.color,
                }}
                onPointerDown={(e) => handleClipMoveStart(e, trackId, clip)}
                onDoubleClick={(e) => {
                    if (!isTransition) return;
                    e.stopPropagation();
                    handleFlipTransition(clip.id);
                }}
                title={isTransition ? t('reverse_hint') : undefined}
            >
                <div
                    className={`${styles.handle} ${styles.left}`}
                    onPointerDown={(e) => handleTrimStart(e, trackId, clip, 'left')}
                />
                <span className={styles.clipTitle}>
                    {isTransition && <LuArrowLeftRight style={{ marginInlineEnd: 4, verticalAlign: -2 }} />}
                    {clip.title}
                </span>
                {isAudio && <AudioWaveform width={width} height={44} />}
                {kfTimes.length > 0 && (
                    <div className={styles.kfLane}>
                        {kfTimes.map((time) => (
                            <span
                                key={time}
                                className={`${styles.kfDiamond} ${time === activeLocal ? styles.kfDiamondActive : ''}`}
                                style={{ left: `${time * zoomLevel}px` }}
                                title={t('keyframe_diamond_hint', { time: time.toFixed(2) })}
                                onPointerDown={(event) => handleKeyframeDiamondPointerDown(event, clip, time)}
                            />
                        ))}
                    </div>
                )}
                <div
                    className={`${styles.handle} ${styles.right}`}
                    onPointerDown={(e) => handleTrimStart(e, trackId, clip, 'right')}
                />
            </div>
        );
    };

    const mediaContent = (
        <MediaSidebar
            projectId={projectId}
            onAddToTimeline={addMediaFromPicker}
            onAddText={(preset) => addTextClip({ title: preset.title, style: preset.style })}
        />
    );

    const handleStopPlayback = useCallback(() => {
        playingRef.current = false;
        setIsPlaying(false);
        currentTimeRef.current = 0;
        setCurrentTime(0);
    }, []);

    // The deck line anchors to the text layer at the playhead, or to the
    // selected text clip when the playhead is elsewhere on the timeline.
    const deckLineFrame = useMemo(() => {
        const activeTextLayer = previewLayers.find((layer) => layer.clip.type === 'text');
        if (activeTextLayer) return getClipFrame(activeTextLayer.clip);
        if (selectedClip?.type === 'text') return getClipFrame(selectedClip);
        return null;
    }, [previewLayers, selectedClip]);

    const previewCanvasControls = (
        <div className={styles.previewCanvasControls}>
            {CANVAS_PRESETS.map((preset) => {
                const active = preset.width === canvas.width && preset.height === canvas.height;
                return (
                    <button
                        key={preset.label}
                        type="button"
                        className={active ? styles.previewCanvasControlActive : ''}
                        onClick={() => setCanvas((prev) => ({ ...prev, width: preset.width, height: preset.height }))}
                        title={`${preset.width} × ${preset.height}`}
                    >
                        {preset.label}
                    </button>
                );
            })}
            <span>{canvas.width}×{canvas.height}</span>
        </div>
    );

    const previewStage = (
        <div
            className={styles.previewStage}
            ref={previewStageRef}
            style={{
                width: `${previewCanvasSize.width}px`,
                height: `${previewCanvasSize.height}px`,
            }}
            onPointerDown={() => setSelectedClipId(null)}
        >
            {previewLayers.map((layer) => (
                layer.clip.type === 'text' ? (
                    <PreviewTextLayer
                        key={`${layer.clip.id}-${layer.zIndex}`}
                        layer={layer}
                        canvasHeightPx={previewCanvasSize.height}
                        selected={selectedClipId === layer.clip.id}
                        onSelect={setSelectedClipId}
                        onDrag={(event) => beginPreviewTransform(event, 'move')}
                    />
                ) : (
                    <PreviewMediaLayer
                        key={`${layer.clip.id}-${layer.zIndex}`}
                        layer={layer}
                        motionScale={canvas.height > 0 ? previewCanvasSize.height / canvas.height : 1}
                        onSelect={setSelectedClipId}
                        registerVideoEl={registerVideoEl}
                        onMediaReady={handleMediaReady}
                    />
                )
            ))}

            {showTextDeckLine && deckLineFrame && (
                <div
                    data-preview-deck-line
                    className={styles.previewDeckLine}
                    style={{ top: `${(deckLineFrame.y + deckLineFrame.height / 2) * 100}%` }}
                >
                    <span>{t('text_deck_line')}</span>
                </div>
            )}

            {selectedPreviewLayer && (() => {
                // Display frame at the playhead — keyframed channels move the
                // box with the element instead of lagging on the base frame.
                const frame = displayFrameOf(selectedPreviewLayer);
                return (
                    <div
                        data-preview-selection
                        className={styles.previewSelection}
                        style={{
                            left: `${frame.x * 100}%`,
                            top: `${frame.y * 100}%`,
                            width: `${frame.width * 100}%`,
                            height: `${frame.height * 100}%`,
                            transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined,
                        }}
                        onPointerDown={(event) => beginPreviewTransform(event, 'move')}
                    >
                        <span className={styles.previewSelectionLabel}>
                            {selectedPreviewLayer.clip.title}
                        </span>
                        <span
                            className={styles.previewRotateHandle}
                            title={t('transform_rotate')}
                            onPointerDown={(event) => beginPreviewTransform(event, 'rotate')}
                        />
                        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                            <span
                                key={corner}
                                aria-label={t('resize_corner', { corner })}
                                className={`${styles.previewResizeHandle} ${styles[corner]}`}
                                onPointerDown={(event) => beginPreviewTransform(event, corner)}
                            />
                        ))}
                        <button
                            type="button"
                            className={styles.previewResetButton}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                updateClipById(selectedPreviewLayer.clip.id, {
                                    frame: { ...DEFAULT_CLIP_FRAME },
                                });
                            }}
                        >
                            {t('reset')}
                        </button>
                    </div>
                );
            })()}
        </div>
    );

    const previewContent = (
        <>
            {previewCanvasControls}
            {previewStage}

            <div className={styles.previewControls}>
                <button
                    type="button"
                    className={styles.previewControlBtn}
                    onClick={handleStopPlayback}
                    title={t('stop')}
                    aria-label={t('stop')}
                >
                    <LuSquare />
                </button>
                <button
                    type="button"
                    className={styles.previewControlBtn}
                    onClick={() => seekTo(Math.max(0, currentTimeRef.current - 1))}
                    title={t('skip_back_1s')}
                    aria-label={t('skip_back_1s')}
                >
                    <LuSkipBack />
                </button>
                <button
                    type="button"
                    className={`${styles.previewControlBtn} ${styles.previewPlayBtn}`}
                    onClick={togglePlayback}
                    title={isPlaying ? t('pause') : t('play')}
                    aria-label={isPlaying ? t('pause') : t('play')}
                >
                    {isPlaying ? <LuPause /> : <LuPlay />}
                </button>
                <button
                    type="button"
                    className={`${styles.previewControlBtn} ${showTextDeckLine ? styles.previewControlActive : ''}`}
                    onClick={() => setShowTextDeckLine((current) => !current)}
                    title={t('text_deck_line')}
                    aria-label={t('text_deck_line')}
                    aria-pressed={showTextDeckLine}
                >
                    <LuBaseline />
                </button>
                <button
                    type="button"
                    className={styles.previewControlBtn}
                    onClick={() => seekTo(Math.min(totalDuration, currentTimeRef.current + 1))}
                    title={t('skip_forward_1s')}
                    aria-label={t('skip_forward_1s')}
                >
                    <LuSkipForward />
                </button>
                <button
                    type="button"
                    className={styles.previewControlBtn}
                    onClick={() => setPlayerOpen(true)}
                    title={t('player_open')}
                    aria-label={t('player_open')}
                >
                    <LuMaximize2 />
                </button>
                <span data-live-timecode className={styles.previewTimecode}>
                    {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
                </span>
            </div>
        </>
    );

    const selectedClipIsVisual = !!selectedClip
        && (resolveClipMediaKind(selectedClip) === 'video' || resolveClipMediaKind(selectedClip) === 'image');

    const logsContent = (
        <ProcessLogPanel
            projectId={projectId}
            focusNodeId={null}
            focusRunId={focusExportRunId}
            liveLogs={liveLogs}
        />
    );

    const selectedClipIsText = !!selectedClip && selectedClip.type === 'text';
    /** The text track whose shared default style is being edited. */
    const selectedTextTrack = useMemo(() => (
        selectedTrackId
            ? tracks.find((track) => track.id === selectedTrackId && track.type === 'text') ?? null
            : null
    ), [selectedTrackId, tracks]);

    const updateTrackDefaultStyle = useCallback((patch: Partial<TextClipStyle>) => {
        if (!selectedTextTrack) return;
        setTracks((prev) => prev.map((track) => (
            track.id === selectedTextTrack.id
                ? { ...track, textStyle: { ...(track.textStyle ?? {}), ...patch } }
                : track
        )));
    }, [selectedTextTrack, setTracks]);

    /** Playhead position inside the selected clip (drives the keyframe UI). */
    const selectedClipLocalTime = selectedClip ? clipLocalTimeAt(selectedClip, currentTime) : 0;
    const selectedClipTextStyle = selectedClip?.type === 'text'
        ? resolveEffectiveTextStyle(
            tracks.find((track) => track.id === selectedClip.trackId)?.textStyle,
            selectedClip.textStyle,
        )
        : undefined;
    /** Frame as displayed at the playhead (keyframed channels override the base). */
    const selectedClipDisplayFrame = useMemo(() => {
        if (!selectedClip) return DEFAULT_CLIP_FRAME;
        return displayFrameAt(selectedClip, selectedClipLocalTime);
    }, [selectedClip, selectedClipLocalTime]);

    const settingsContent = (
        <>
            {selectedClipIsVisual && selectedClip && (
                <ClipTransformControls
                    frame={selectedClipDisplayFrame}
                    onChange={(patch) => commitFrameEdit(
                        selectedClip.id,
                        { ...getClipFrame(selectedClip), ...patch },
                        Object.keys(patch) as Array<keyof ClipFrame>,
                    )}
                    onReset={() => updateClipById(selectedClip.id, {
                        frame: { ...DEFAULT_CLIP_FRAME },
                    })}
                />
            )}
            {selectedClipIsVisual && selectedClip && (
                <ClipAnimationControls
                    animation={selectedClip.animation}
                    onChange={(animation) => updateClipById(selectedClip.id, { animation })}
                />
            )}
            {selectedTextTrack && !selectedClip && (
                <TextStyleControls
                    hideText
                    text=""
                    style={resolveEffectiveTextStyle(selectedTextTrack.textStyle)}
                    onChangeText={() => undefined}
                    onChangeStyle={updateTrackDefaultStyle}
                />
            )}
            {selectedClipIsText && selectedClip && (
                <>
                    <p className={styles.settingsHint}>
                        {hasTextOverrides(selectedClip.textStyle)
                            ? t('text_clip_custom_hint')
                            : t('text_clip_follow_hint')}
                    </p>
                    <TextStyleControls
                        text={selectedClip.text || ''}
                        style={resolveEffectiveTextStyle(
                            tracks.find((track) => track.id === selectedClip.trackId)?.textStyle,
                            selectedClip.textStyle,
                            textStyleOverridesFromResolved(
                                resolveClipKeyframeValues(selectedClip, selectedClipLocalTime),
                            ),
                        )}
                        onChangeText={(text) => updateClipById(selectedClip.id, { text })}
                        onChangeStyle={(patch) => commitTextStyleEdit(selectedClip, patch)}
                        hasOverrides={hasTextOverrides(selectedClip.textStyle)}
                        onResetOverrides={() => updateClipById(selectedClip.id, { textStyle: undefined })}
                    />
                </>
            )}
            {selectedClip && getKeyframeChannelsForClip(selectedClip).length > 0 && (
                <ClipKeyframeControls
                    clip={selectedClip}
                    localTime={selectedClipLocalTime}
                    textStyle={selectedClipTextStyle}
                    onToggleChannel={(channel) => toggleKeyframeChannel(selectedClip, channel, selectedClipTextStyle)}
                    onUpsertKeyframe={(channelId, time, value) => upsertClipKeyframe(selectedClip.id, channelId, time, value)}
                    onRemoveKeyframeAt={(channelId, time) => removeClipKeyframeAt(selectedClip.id, channelId, time)}
                    onSetEasing={(channelId, easing) => setKeyframeChannelEasing(selectedClip.id, channelId, easing)}
                    onSeekLocalTime={(time) => {
                        pausePlayback();
                        seekTo(selectedClip.startTime + time);
                    }}
                    onEditBase={(channelId, value) => handleKeyframeBaseEdit(selectedClip, channelId, value)}
                    onClearAll={() => updateClipById(selectedClip.id, { keyframes: undefined })}
                />
            )}
            {selectedTransitionClip ? (
                <TransitionSettingsPanel
                    clip={selectedTransitionClip}
                    tracks={tracks}
                    onUpdate={updateClipById}
                    onFlip={() => handleFlipTransition(selectedTransitionClip.id)}
                />
            ) : (
                <NodeSettingsPanel
                    selectedNode={selectedWorkflowNode}
                    catalogEntry={selectedCatalogEntry}
                    nodes={nodes}
                    edges={edges}
                    onUpdateNode={updateNodeData}
                    onUpdateEdge={(edgeId, data) => setEdges((current) => current.map((edge) => (
                        edge.id === edgeId
                            ? { ...edge, data: { ...(edge.data || {}), ...data } }
                            : edge
                    )))}
                />
            )}
        </>
    );

    const exportContent = (
        <VideoEditorExportPanel
            projectId={projectId}
            onBeforeExport={saveNow}
            liveLogs={liveLogs}
            onExportStarted={setFocusExportRunId}
        />
    );

    const chatContent = (
        <EditorChatPanel
            projectId={projectId}
            getSnapshot={getAgentSnapshot}
            onApplyCommands={applyAgentCommands}
            onCreateSnapshot={createChatSnapshot}
            onRestoreSnapshot={restoreChatSnapshot}
        />
    );

    const textTracks = tracks.filter((t) => t.type === 'text');

    const renderTrackHeader = (track: Track) => (
        <div
            key={track.id}
            className={`${styles.headerItem} ${selectedTrackId === track.id ? styles.headerSelected : ''}`}
            onClick={() => {
                setSelectedTrackId(track.id);
                setSelectedClipId(null);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedTrackId(track.id);
                    setSelectedClipId(null);
                }
            }}
            role="button"
            tabIndex={0}
        >
            <span>{track.title}</span>
            <div className={styles.controls}>
                <button
                    type="button"
                    className={styles.deleteBtn}
                    title={t('delete_layer_btn')}
                    aria-label={t('delete_layer_btn')}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrack(track.id);
                    }}
                >
                    <LuTrash2 />
                </button>
            </div>
        </div>
    );

    const mainVideoTrackId = videoTracks[0]?.id;

    /** Open the media picker (phone window / desktop media panel). With a
     *  track id the picked item is appended to that layer. */
    const openMediaPicker = (trackId?: string) => {
        setMediaTargetTrackId(trackId ?? null);
        if (isMobile) {
            setMobileScreen('media');
        } else if (!isPanelVisible('media')) {
            dockContent({ kind: 'panel', panel: 'media' });
        }
    };

    const renderTrackRow = (track: Track, trackType: 'video' | 'audio' | 'text') => (
        <div
            key={track.id}
            data-track-id={track.id}
            className={`${styles.trackRow} ${dropTrackId === track.id ? styles.dropTarget : ''}`}
            onDragOver={(e) => handleTrackDragOver(e, track.id)}
            onDragLeave={() => setDropTrackId(null)}
            onDrop={(e) => handleTrackDrop(e, track.id)}
            onPointerDown={(e) => {
                if (e.button !== 0) return;
                // On touch an empty-track swipe scrolls the timeline; only the
                // ruler and the playhead move time.
                if (e.pointerType === 'touch') return;
                if (e.target === e.currentTarget) beginScrub(e.clientX, e.pointerId, e.pointerType);
            }}
            onClick={(e) => {
                if (!isMobile || e.target !== e.currentTarget) return;
                setSelectedClipId(null);
                setSelectedTrackId(null);
            }}
        >
            {[...track.clips]
                .sort((a, b) => {
                    const aT = isTransitionClip(a) ? 1 : 0;
                    const bT = isTransitionClip(b) ? 1 : 0;
                    if (aT !== bT) return aT - bT;
                    return a.startTime - b.startTime;
                })
                .map((clip) => renderClip(track.id, clip, trackType))}
            {track.id === mainVideoTrackId && (() => {
                const trackEnd = track.clips.reduce((max, clip) => Math.max(max, clip.startTime + clip.duration), 0);
                return (
                    <button
                        type="button"
                        className={styles.addMediaTile}
                        style={{ left: `${trackEnd * zoomLevel + 4}px` }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => openMediaPicker(track.id)}
                        title={t('add_media')}
                        aria-label={t('add_media')}
                    >
                        <LuPlus aria-hidden />
                    </button>
                );
            })()}
        </div>
    );

    // Adaptive ruler: fewer markers when zoomed out, per-second when zoomed in.
    const rulerStep = zoomLevel >= 80 ? 1 : zoomLevel >= 40 ? 2 : zoomLevel >= 20 ? 5 : zoomLevel >= 12 ? 10 : 30;
    const rulerMarkers = Array.from(
        { length: Math.floor(displayDuration / rulerStep) + 2 },
        (_, i) => i * rulerStep,
    );

    const timelineContent = (
        <div className={styles.timelinePanel}>
            <div className={styles.viewport}>
                <div className={styles.trackHeaders} ref={headerRef}>
                    <div className={styles.headerSpacer} />

                    <div className={styles.groupLabel}>
                        <span className={styles.groupLabelIcon} title={t('video_layers')}><LuFilm /></span>
                        <span className={styles.groupLabelText}>{t('video_layers')}</span>
                        <div className={styles.groupLabelActions}>
                            <button
                                type="button"
                                className={`${styles.addTrackBtn} ${styles.desktopOnly}`}
                                title={t('add_text')}
                                aria-label={t('add_text')}
                                onClick={() => addTextClip()}
                            >
                                <LuType />
                            </button>
                            <button
                                type="button"
                                className={styles.addTrackBtn}
                                title={t('add_video_layer')}
                                aria-label={t('add_video_layer')}
                                onClick={() => handleAddTrack('video')}
                            >
                                <LuPlus />
                            </button>
                        </div>
                    </div>
                    {videoTracks.map((track) => renderTrackHeader(track))}

                    <div className={styles.groupLabel}>
                        <span className={styles.groupLabelIcon} title={t('text_layers')}><LuType /></span>
                        <span className={styles.groupLabelText}>{t('text_layers')}</span>
                        <div className={styles.groupLabelActions}>
                            <button
                                type="button"
                                className={styles.addTrackBtn}
                                title={t('add_text')}
                                aria-label={t('add_text')}
                                onClick={() => addTextClip()}
                            >
                                <LuPlus />
                            </button>
                        </div>
                    </div>
                    {textTracks.map((track) => renderTrackHeader(track))}

                    <div className={styles.groupLabel}>
                        <span className={styles.groupLabelIcon} title={t('audio_layers')}><LuMusic /></span>
                        <span className={styles.groupLabelText}>{t('audio_layers')}</span>
                        <button
                            type="button"
                            className={styles.addTrackBtn}
                            title={t('add_audio_layer')}
                            aria-label={t('add_audio_layer')}
                            onClick={() => handleAddTrack('audio')}
                        >
                            <LuPlus />
                        </button>
                    </div>
                    {audioTracks.map((track) => renderTrackHeader(track))}
                </div>

                <div
                    className={styles.scrollArea}
                    ref={(node) => {
                        scrollAreaRef.current = node;
                        setScrollAreaNode(node);
                    }}
                    onScroll={(e) => {
                        if (headerRef.current) headerRef.current.scrollTop = e.currentTarget.scrollTop;
                        // Endless timeline: reveal more room before the user
                        // ever reaches the end of the scrollable content.
                        const area = e.currentTarget;
                        if (timelineWidth < 400_000 && area.scrollLeft + area.clientWidth >= timelineWidth - 320) {
                            setExtraDuration((current) => current + 60);
                        }
                    }}
                >
                    <div
                        ref={tracksContentRef}
                        className={styles.tracksContent}
                        style={{ width: `${timelineWidth}px` }}
                        onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            if (e.target === e.currentTarget) {
                                setSelectedClipId(null);
                                setSelectedTrackId(null);
                                if (e.pointerType !== 'touch') beginScrub(e.clientX, e.pointerId, e.pointerType);
                            }
                        }}
                    >
                        <div
                            ref={playheadRef}
                            className={styles.playhead}
                            style={{ left: `${currentTime * zoomLevel}px` }}
                            onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                e.stopPropagation();
                                beginScrub(e.clientX, e.pointerId, e.pointerType);
                            }}
                        >
                            <div className={styles.head} />
                        </div>

                        {activeSnapLine !== null && (
                            <div className={styles.snapGuide} style={{ left: `${activeSnapLine * zoomLevel}px` }} />
                        )}

                        <div
                            className={styles.ruler}
                            onPointerDown={handleRulerPointerDown}
                        >
                            {rulerMarkers.map((time) => (
                                <div
                                    key={time}
                                    className={styles.marker}
                                    style={{ left: `${time * zoomLevel}px` }}
                                >
                                    {time >= 60 ? `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}` : `${time}s`}
                                </div>
                            ))}
                        </div>

                        <div className={styles.groupLabelSpacer} />
                        {videoTracks.map((track) => renderTrackRow(track, 'video'))}

                        <div className={styles.groupLabelSpacer} />
                        {textTracks.map((track) => renderTrackRow(track, 'text'))}

                        <div className={styles.groupLabelSpacer} />
                        {audioTracks.map((track) => renderTrackRow(track, 'audio'))}
                    </div>
                </div>
            </div>

            <div className={styles.timelineFooter}>
                <div className={styles.footerGroup}>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={undo}
                        disabled={!canUndo}
                        title={tp('undo_ctrl')}
                        aria-label={tp('undo')}
                    >
                        <LuUndo2 />
                    </button>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={redo}
                        disabled={!canRedo}
                        title={tp('redo_ctrl')}
                        aria-label={tp('redo')}
                    >
                        <LuRedo2 />
                    </button>
                    <span className={styles.footerDivider} aria-hidden />
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={handleCopyClip}
                        disabled={!selectedClipId}
                        title={tp('copy_hint')}
                        aria-label={tc('copy')}
                    >
                        <LuCopy />
                    </button>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={handlePasteClip}
                        title={tp('paste_hint')}
                        aria-label={tc('paste')}
                    >
                        <LuClipboardPaste />
                    </button>
                    <span className={styles.footerDivider} aria-hidden />
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.splitBtn}`}
                        onClick={handleSplitClip}
                        disabled={!selectedClipId || !!selectedTransitionClip}
                        title={t('cut')}
                        aria-label={t('cut')}
                    >
                        <LuScissors />
                    </button>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.deleteClipBtn}`}
                        onClick={handleDeleteSelected}
                        disabled={!selectedClipId}
                        title={tc('delete')}
                        aria-label={tc('delete')}
                    >
                        <LuTrash2 />
                    </button>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => handleFlipTransition()}
                        disabled={!selectedTransitionClip}
                        title={t('reverse_transition')}
                        aria-label={t('reverse_transition')}
                    >
                        <LuArrowLeftRight />
                    </button>
                    <span className={styles.timeCode}>{t('seconds_short', { value: currentTime.toFixed(2) })}</span>
                </div>

                <div className={styles.footerGroup}>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.captionBtn}`}
                        onClick={() => setCaptionStudioOpen(true)}
                        title={t('caption_studio')}
                        aria-label={t('caption_studio')}
                    >
                        <LuCaptions />
                    </button>
                    <label className={styles.durationInput} title={t('project_duration_hint')}>
                        <span>{t('project_duration')}</span>
                        <input
                            type="number"
                            min={5}
                            max={3600}
                            step={1}
                            value={durationDraft ?? String(projectDuration)}
                            onChange={(e) => setDurationDraft(e.target.value)}
                            onBlur={() => commitProjectDuration()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                }
                            }}
                        />
                        <span>{t('seconds_unit')}</span>
                    </label>
                    <span className={styles.footerDivider} aria-hidden />
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => applyZoom((prev) => prev - 5)}
                        title={t('zoom_out')}
                        aria-label={t('zoom_out')}
                    >
                        <LuZoomOut />
                    </button>
                    <input
                        type="range"
                        className={styles.zoomSlider}
                        min={8}
                        max={200}
                        step={2}
                        value={zoomLevel}
                        onChange={(e) => applyZoom(Number(e.target.value))}
                        title={`${t('zoom_scale')} ${zoomLevel}px/s`}
                        aria-label={t('zoom_scale')}
                    />
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => applyZoom((prev) => prev + 5)}
                        title={t('zoom_in')}
                        aria-label={t('zoom_in')}
                    >
                        <LuZoomIn />
                    </button>
                </div>
            </div>
        </div>
    );

    const transcribableClips = useMemo(() => (
        tracks
            .filter((track) => track.type === 'video')
            .flatMap((track) => track.clips)
            .filter((clip) => !isTransitionClip(clip) && !!clip.sourceUrl)
            .sort((a, b) => a.startTime - b.startTime)
    ), [tracks]);

    /** Existing auto-caption groups (video clip id → row count/shared style). */
    const captionGroups = useMemo(() => {
        const groups = new Map<string, { count: number; style?: TextClipStyle }>();
        tracks.forEach((track) => {
            track.clips.forEach((clip) => {
                if (clip.type !== 'text' || !clip.captionFor) return;
                const entry = groups.get(clip.captionFor);
                groups.set(clip.captionFor, {
                    count: (entry?.count ?? 0) + 1,
                    // The track default is the shared caption style; a fully
                    // customized row falls back to its own stored style.
                    style: track.textStyle ?? clip.textStyle,
                });
            });
        });
        return groups;
    }, [tracks]);

    const describeKey = useCallback((key: string): { title: string; icon: React.ReactNode } => {
        const content = contentFromKey(key);
        if (!content) return { title: key, icon: null };
        if (content.kind === 'panel') {
            const map: Record<SingletonPanelId, { title: string; icon: React.ReactNode }> = {
                media: { title: t('panel_media'), icon: <LuGalleryVerticalEnd /> },
                preview: { title: t('panel_preview'), icon: <LuMonitorPlay /> },
                timeline: { title: t('panel_timeline'), icon: <LuClapperboard /> },
                chat: { title: t('panel_chat'), icon: <LuBot /> },
            };
            return map[content.panel];
        }
        const tabMeta: Record<DockTabId, { title: string; icon: React.ReactNode }> = {
            logs: { title: t('panel_logs'), icon: <LuScrollText /> },
            settings: { title: t('panel_settings'), icon: <LuSettings2 /> },
            export: { title: t('panel_export'), icon: <LuCircleFadingArrowUp /> },
        };
        return tabMeta[content.tab];
    }, [t]);

    const renderKeyContent = useCallback((key: string) => {
        const content = contentFromKey(key);
        if (!content) return null;
        if (content.kind === 'panel') {
            switch (content.panel) {
                case 'media':
                    return mediaContent;
                case 'preview':
                    // The stage moves into the full-screen player while it is open.
                    return playerOpen ? (
                        <div className={styles.previewContainer} />
                    ) : (
                        <div className={styles.previewContainer} ref={setPreviewContainerNode}>
                            {previewContent}
                        </div>
                    );
                case 'timeline':
                    return timelineContent;
                case 'chat':
                    return chatContent;
            }
        }
        switch (content.tab) {
            case 'logs':
                return logsContent;
            case 'export':
                return exportContent;
            default:
                return settingsContent;
        }
    }, [mediaContent, previewContent, timelineContent, chatContent, logsContent, exportContent, settingsContent, playerOpen]);

    const chatVisible = isPanelVisible('chat');

    const toggleChat = () => {
        if (chatVisible) {
            hideContent({ kind: 'panel', panel: 'chat' });
        } else {
            floatContent({ kind: 'panel', panel: 'chat' }, { x: 40, y: 110, width: 330, height: 440 });
        }
    };

    const captionStudio = captionStudioOpen && (
        <CaptionStudioModal
            projectId={projectId}
            clips={transcribableClips}
            captionGroups={captionGroups}
            selectedClipId={selectedClipId}
            onClose={() => setCaptionStudioOpen(false)}
            onApply={(payload) => {
                applyCaptions(payload);
                setCaptionStudioOpen(false);
            }}
            screenDir={isMobile ? uiDir : undefined}
        />
    );

    const previewPlayer = playerOpen && (
        <PreviewPlayer
            title={t('panel_preview')}
            dir={uiDir}
            isPlaying={isPlaying}
            totalDuration={totalDuration}
            timecode={`${formatTimecode(currentTime)} / ${formatTimecode(totalDuration)}`}
            progress={totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0}
            onTogglePlay={togglePlayback}
            onSeekBy={seekBy}
            onScrubStart={handlePlayerScrubStart}
            onScrub={handlePlayerScrub}
            onScrubEnd={handlePlayerScrubEnd}
            onClose={() => setPlayerOpen(false)}
            stageContainerRef={setPreviewContainerNode}
        >
            {previewStage}
        </PreviewPlayer>
    );

    if (isMobile) {
        const closeScreen = () => setMobileScreen(null);
        const activePreset = CANVAS_PRESETS.find((preset) => preset.width === canvas.width && preset.height === canvas.height);
        const selectPreset = (label: string) => {
            const preset = CANVAS_PRESETS.find((item) => item.label === label);
            if (preset) setCanvas((prev) => ({ ...prev, width: preset.width, height: preset.height }));
        };
        const clearSelection = () => {
            setSelectedClipId(null);
            setSelectedTrackId(null);
        };

        // Contextual tool bar: clip tools while a clip is selected, layer tools
        // for a selected layer, otherwise the "add / open" tools.
        let tools: React.ReactNode;
        if (selectedClip) {
            tools = (
                <>
                    <MobileToolButton icon={<LuSettings2 />} label={t('panel_settings')} tone="accent" onClick={() => setMobileScreen('settings')} />
                    <MobileToolButton icon={<LuScissors />} label={t('cut')} onClick={handleSplitClip} disabled={!!selectedTransitionClip} />
                    <MobileToolButton icon={<LuCopy />} label={tc('copy')} onClick={handleCopyClip} />
                    <MobileToolButton icon={<LuClipboardPaste />} label={tc('paste')} onClick={handlePasteClip} />
                    {selectedTransitionClip && (
                        <MobileToolButton icon={<LuArrowLeftRight />} label={t('mobile_tool_reverse')} onClick={() => handleFlipTransition()} />
                    )}
                    <MobileToolButton icon={<LuTrash2 />} label={tc('delete')} tone="danger" onClick={handleDeleteSelected} />
                </>
            );
        } else if (selectedTrackId) {
            tools = (
                <>
                    {selectedTextTrack && (
                        <MobileToolButton icon={<LuSettings2 />} label={t('panel_settings')} tone="accent" onClick={() => setMobileScreen('settings')} />
                    )}
                    <MobileToolButton icon={<LuClipboardPaste />} label={tc('paste')} onClick={handlePasteClip} />
                    <MobileToolButton
                        icon={<LuTrash2 />}
                        label={t('delete_layer_btn')}
                        tone="danger"
                        onClick={() => {
                            handleDeleteTrack(selectedTrackId);
                            setSelectedTrackId(null);
                        }}
                    />
                </>
            );
        } else {
            tools = (
                <>
                    <MobileToolButton icon={<LuBot />} label={t('mobile_tool_assistant')} onClick={() => setMobileScreen('chat')} />
                    <MobileToolButton icon={<LuCaptions />} label={t('mobile_tool_captions')} onClick={() => setCaptionStudioOpen(true)} />
                    <MobileToolButton icon={<LuScrollText />} label={t('mobile_tool_logs')} onClick={() => setMobileScreen('logs')} />
                    <MobileToolButton icon={<LuImagePlus />} label={t('add_media')} tone="accent" onClick={() => openMediaPicker()} />
                </>
            );
        }

        const screenTitles: Record<MobileScreen, string> = {
            media: t('panel_media'),
            settings: selectedClip?.title || t('panel_settings'),
            export: t('mobile_export_settings'),
            logs: t('panel_logs'),
            chat: t('panel_chat'),
        };
        const closeMediaPicker = () => {
            setMediaTargetTrackId(null);
            closeScreen();
        };

        // Split handle: drag up for a taller timeline, down for a bigger preview.
        const beginSplitDrag = (event: React.PointerEvent<HTMLDivElement>) => {
            if (event.button !== 0) return;
            const timelineEl = mobileTimelineSlotRef.current;
            const previewEl = mobilePreviewSlotRef.current;
            if (!timelineEl || !previewEl) return;
            event.preventDefault();
            const handle = event.currentTarget;
            handle.classList.add(mStyles.dragging);
            const startY = event.clientY;
            const startHeight = timelineEl.getBoundingClientRect().height;
            const maxHeight = Math.max(MOBILE_TIMELINE_MIN, startHeight + previewEl.getBoundingClientRect().height - MOBILE_PREVIEW_MIN);
            const stage = previewStageRef.current;
            const container = previewContainerNode;
            const baseWidth = Math.max(1, previewCanvasSize.width);
            let height = startHeight;
            splitDraggingRef.current = true;
            bindPointerDrag(event.pointerId, {
                onMove: (moveEvent) => {
                    height = Math.round(Math.min(maxHeight, Math.max(MOBILE_TIMELINE_MIN, startHeight - (moveEvent.clientY - startY))));
                    timelineEl.style.flexBasis = `${height}px`;
                    if (stage && container) {
                        const next = fitPreviewSize(container.getBoundingClientRect(), canvas.width, canvas.height);
                        stage.style.transform = `scale(${next.width / baseWidth})`;
                    }
                },
                onEnd: () => {
                    splitDraggingRef.current = false;
                    handle.classList.remove(mStyles.dragging);
                    if (stage) stage.style.transform = '';
                    setMobileTimelineHeight(height);
                    storeTimelineHeight(height);
                    if (container) {
                        setPreviewCanvasSize(fitPreviewSize(container.getBoundingClientRect(), canvas.width, canvas.height));
                    }
                },
            });
        };
        const nudgeSplit = (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            event.preventDefault();
            const current = mobileTimelineSlotRef.current?.getBoundingClientRect().height ?? MOBILE_TIMELINE_MIN;
            const next = Math.max(MOBILE_TIMELINE_MIN, current + (event.key === 'ArrowUp' ? 24 : -24));
            setMobileTimelineHeight(next);
            storeTimelineHeight(next);
        };

        return (
            <div className={`${styles.editorLayout} ${styles.mobileEditor} ${mStyles.root}`} data-theme={theme}>
                <div className={mStyles.topBar} dir={uiDir}>
                    <div className={mStyles.topStart}>
                        <NavbarSaveButton
                            saveStatus={saveStatus}
                            saveError={saveError}
                            onClick={saveNow}
                        />
                        <button
                            type="button"
                            className={mStyles.topIconBtn}
                            onClick={toggleTheme}
                            title={theme === 'dark' ? tp('theme_light') : tp('theme_dark')}
                            aria-label={theme === 'dark' ? tp('switch_light') : tp('switch_dark')}
                        >
                            {theme === 'dark' ? <LuSun /> : <LuMoon />}
                        </button>
                    </div>
                    <label className={mStyles.ratioPicker} title={`${canvas.width} × ${canvas.height}`}>
                        <LuRatio aria-hidden />
                        <span>{activePreset?.label ?? `${canvas.width}×${canvas.height}`}</span>
                        <LuChevronDown className={mStyles.ratioChevron} aria-hidden />
                        <select
                            value={activePreset?.label ?? ''}
                            onChange={(event) => selectPreset(event.target.value)}
                            aria-label={t('mobile_aspect_ratio')}
                        >
                            {!activePreset && <option value="">{`${canvas.width}×${canvas.height}`}</option>}
                            {CANVAS_PRESETS.map((preset) => (
                                <option key={preset.label} value={preset.label}>{preset.label}</option>
                            ))}
                        </select>
                    </label>
                    <div className={mStyles.topEnd}>
                        <button
                            type="button"
                            className={mStyles.topIconBtn}
                            onClick={() => setMobileScreen('export')}
                            title={t('panel_export')}
                            aria-label={t('panel_export')}
                        >
                            <LuUpload />
                        </button>
                    </div>
                </div>

                <div className={mStyles.preview} ref={mobilePreviewSlotRef}>
                    {!playerOpen && (
                        <div className={styles.previewContainer} ref={setPreviewContainerNode}>
                            {previewStage}
                        </div>
                    )}
                    <button
                        type="button"
                        className={mStyles.expandBtn}
                        onClick={() => setPlayerOpen(true)}
                        title={t('player_open')}
                        aria-label={t('player_open')}
                    >
                        <LuMaximize2 />
                    </button>
                </div>

                <div className={mStyles.transport}>
                    <span data-live-timecode className={mStyles.timecode}>
                        {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
                    </span>
                    <div className={mStyles.transportCenter}>
                        <button
                            type="button"
                            className={mStyles.transportBtn}
                            onClick={() => seekTo(Math.max(0, currentTimeRef.current - 1))}
                            aria-label={t('skip_back_1s')}
                        >
                            <LuSkipBack />
                        </button>
                        <button
                            type="button"
                            className={`${mStyles.transportBtn} ${mStyles.playBtn}`}
                            onClick={togglePlayback}
                            aria-label={isPlaying ? t('pause') : t('play')}
                        >
                            {isPlaying ? <LuPause /> : <LuPlay />}
                        </button>
                        <button
                            type="button"
                            className={mStyles.transportBtn}
                            onClick={() => seekTo(Math.min(totalDuration, currentTimeRef.current + 1))}
                            aria-label={t('skip_forward_1s')}
                        >
                            <LuSkipForward />
                        </button>
                    </div>
                    <div className={mStyles.transportEnd}>
                        <button type="button" className={mStyles.transportBtn} onClick={undo} disabled={!canUndo} aria-label={tp('undo')}>
                            <LuUndo2 />
                        </button>
                        <button type="button" className={mStyles.transportBtn} onClick={redo} disabled={!canRedo} aria-label={tp('redo')}>
                            <LuRedo2 />
                        </button>
                        <button
                            type="button"
                            className={`${mStyles.transportBtn} ${showTextDeckLine ? mStyles.active : ''}`}
                            onClick={() => setShowTextDeckLine((current) => !current)}
                            aria-label={t('text_deck_line')}
                            aria-pressed={showTextDeckLine}
                        >
                            <LuBaseline />
                        </button>
                    </div>
                </div>

                <div
                    className={mStyles.splitHandle}
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label={t('resize_preview_timeline')}
                    title={t('resize_preview_timeline')}
                    tabIndex={0}
                    onPointerDown={beginSplitDrag}
                    onKeyDown={nudgeSplit}
                />

                <div
                    className={mStyles.timeline}
                    ref={mobileTimelineSlotRef}
                    style={mobileTimelineHeight ? { flexBasis: `${mobileTimelineHeight}px` } : undefined}
                >
                    {timelineContent}
                </div>

                <MobileToolBar
                    dir={uiDir}
                    label={tp('tools')}
                    leading={selectedClip || selectedTrackId ? <MobileDoneButton label={tc('done')} onClick={clearSelection} /> : undefined}
                >
                    {tools}
                </MobileToolBar>

                {mobileScreen === 'media' && (
                    <MobileEditorScreen title={screenTitles.media} icon={<LuGalleryVerticalEnd />} dir={uiDir} onClose={closeMediaPicker} flush>
                        <MediaSidebar
                            mobile
                            projectId={projectId}
                            onAddToTimeline={(payload) => {
                                addMediaFromPicker(payload);
                                closeScreen();
                            }}
                            onAddText={(preset) => {
                                addTextClip({ title: preset.title, style: preset.style });
                                closeScreen();
                            }}
                        />
                    </MobileEditorScreen>
                )}
                {mobileScreen === 'settings' && (
                    <MobileEditorScreen title={screenTitles.settings} icon={<LuSettings2 />} dir={uiDir} onClose={closeScreen} form>
                        {settingsContent}
                    </MobileEditorScreen>
                )}
                {mobileScreen === 'logs' && (
                    <MobileEditorScreen title={screenTitles.logs} icon={<LuScrollText />} dir={uiDir} onClose={closeScreen} flush>
                        {logsContent}
                    </MobileEditorScreen>
                )}
                {mobileScreen === 'chat' && (
                    <MobileEditorScreen title={screenTitles.chat} icon={<LuBot />} dir={uiDir} onClose={closeScreen} flush>
                        {chatContent}
                    </MobileEditorScreen>
                )}
                {mobileScreen === 'export' && (
                    <VideoEditorExportPanel
                        projectId={projectId}
                        onBeforeExport={saveNow}
                        liveLogs={liveLogs}
                        onExportStarted={setFocusExportRunId}
                        screen={{
                            title: screenTitles.export,
                            icon: <LuUpload />,
                            dir: uiDir,
                            onClose: closeScreen,
                            secondaryAction: (
                                <button type="button" className={mStyles.secondaryBtn} onClick={() => void saveNow()}>
                                    {tc('save')}
                                </button>
                            ),
                        }}
                    >
                        <MobileField label={t('mobile_aspect_ratio')}>
                            <MobileSegmented
                                value={activePreset?.label ?? ''}
                                options={CANVAS_PRESETS.map((preset) => ({ value: preset.label, label: preset.label }))}
                                onChange={selectPreset}
                            />
                        </MobileField>
                        <div className={mStyles.fieldRow}>
                            <MobileField label={t('project_duration')}>
                                <label className={mStyles.input}>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min={5}
                                        max={3600}
                                        step={1}
                                        value={durationDraft ?? String(projectDuration)}
                                        onChange={(event) => setDurationDraft(event.target.value)}
                                        onBlur={() => commitProjectDuration()}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') event.currentTarget.blur();
                                        }}
                                    />
                                    <span>{t('seconds_unit')}</span>
                                </label>
                            </MobileField>
                            <MobileField label={t('mobile_output_size')}>
                                <div className={mStyles.readonly}>
                                    {canvas.width}×{canvas.height}
                                </div>
                            </MobileField>
                        </div>
                        <p className={mStyles.centerNote}>{t('project_duration_hint')}</p>
                    </VideoEditorExportPanel>
                )}

                {captionStudio}
                {previewPlayer}
            </div>
        );
    }

    return (
        <div className={styles.editorLayout} data-theme={theme}>
            <DockLayout
                root={layout.root}
                describeTab={describeKey}
                renderTab={renderKeyContent}
                onDockPanel={dockPanel}
                onMoveTab={moveTab}
                onActivateTab={activateTab}
                onFloatPanel={floatPanelActive}
                onHidePanel={hidePanel}
                onResize={resizeSplit}
            />

            <div className={styles.toolbar}>
                <div className={styles.toolbarMain}>
                    <PanelLayoutMenu
                        isPanelVisible={isPanelVisible}
                        isTabVisible={isTabVisible}
                        onTogglePanel={(panel) => {
                            if (isPanelVisible(panel)) {
                                hideContent({ kind: 'panel', panel });
                            } else if (panel === 'chat') {
                                floatContent({ kind: 'panel', panel });
                            } else {
                                dockContent({ kind: 'panel', panel });
                            }
                        }}
                        onToggleTab={(tab) => {
                            if (isTabVisible(tab)) hideTab(tab);
                            else showTab(tab);
                        }}
                        onFloatPanel={(panel) => {
                            floatContent({ kind: 'panel', panel });
                        }}
                        onReset={resetLayout}
                    />
                    <span className={styles.toolbarDivider} aria-hidden />
                    <button type="button" className={styles.addMediaBtn} onClick={() => openMediaPicker()}>
                        <LuImagePlus aria-hidden />
                        <span>{t('add_media')}</span>
                    </button>
                </div>

                <div className={styles.group}>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${chatVisible ? styles.chatToggleActive : ''}`}
                        onClick={toggleChat}
                        title={t('panel_chat')}
                        aria-label={t('panel_chat')}
                    >
                        <LuBot />
                    </button>
                </div>

                <div className={styles.group}>
                    <NavbarSaveButton
                        saveStatus={saveStatus}
                        saveError={saveError}
                        onClick={saveNow}
                    />
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.themeToggle}`}
                        onClick={toggleTheme}
                        title={theme === 'dark' ? tp('theme_light') : tp('theme_dark')}
                        aria-label={theme === 'dark' ? tp('switch_light') : tp('switch_dark')}
                    >
                        {theme === 'dark' ? <LuSun /> : <LuMoon />}
                    </button>
                </div>
            </div>

            {layout.floating.map((win) => {
                const meta = describeKey(win.key);
                const snapTargets = layout.floating
                    .filter((other) => other.id !== win.id)
                    .map((other) => ({ id: other.id, x: other.rect.x, y: other.rect.y, width: other.rect.width, height: other.rect.height }));
                return (
                    <FloatingPanel
                        key={win.id}
                        title={meta.title}
                        icon={meta.icon}
                        rect={win.rect}
                        z={win.z}
                        snapTargets={snapTargets}
                        onRectChange={(rect) => setFloatingRect(win.id, rect)}
                        onFocus={() => focusFloating(win.id)}
                        onClose={() => hideKey(win.key)}
                        onDock={() => dockKey(win.key)}
                    >
                        {renderKeyContent(win.key)}
                    </FloatingPanel>
                );
            })}

            {captionStudio}
            {previewPlayer}
        </div>
    );
}
