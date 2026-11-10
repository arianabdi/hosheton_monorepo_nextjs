'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Edge, Node } from '@xyflow/react';
import { LuPlay, LuBookmarkPlus, LuChevronDown, LuChevronUp, LuFileText, LuImage, LuFilm, LuMaximize2, LuVolume2 } from 'react-icons/lu';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { NodeCatalogEntry, NodeSettingField } from '../types/node-catalog';
import type { StudioNodeData } from '../[projectId]/types/studio';
import { providersApi, type ProviderItem, type ProviderModelItem } from '../lib/providers-api';
import { aiOptionsApi } from '../lib/ai-options-api';
import { resolveDerivedValue } from '../lib/derived-settings';
import { useMediaStudio } from '../context/MediaStudioContext';
import { NOTE_COLOR_PRESETS } from '../lib/note-colors';
import { GROUP_COLOR_PRESETS } from '../lib/group-colors';
import {
    AUDIO_CATEGORIES,
    filterAudioModelsByCategory,
    normalizeAudioCategory,
    type AudioCategory,
} from '../lib/audio-categories';
import { AssetRefUpload } from '../[projectId]/components/AssetRefUpload';
import { useAssetUploadSession } from '../[projectId]/lib/asset-upload-session';
import { MiniAudioPlayer } from '../[projectId]/components/MiniAudioPlayer';
import LightweightMediaPreview from '../[projectId]/components/LightweightMediaPreview/LightweightMediaPreview';
import { mediaThumbLargeSrc, resolveLightweightMedia } from '../lib/lightweight-media';
import { buildPublicFileUrl, sanitizeLegacyStorageUrl } from '../[projectId]/lib/file-url';
import { previewMediaKind } from '../lib/option-preview';
import { SaveAsAssetButton } from './SaveAsAssetButton';
import type { CostEstimatePayload } from './CostEstimatePanel';
import { BILLABLE_NODE_TYPES } from '../lib/build-node-cost-estimate';
import { mediaApi } from '../lib/media-api';
import {
    CostEstimatePopoverButton,
    useChatCostButtonVisible,
} from '../[projectId]/chat/ChatCostEstimate';
import { formatChatUsd } from '../[projectId]/chat/lib/chat-usage';
import { estimateUnitKey } from '../[projectId]/chat/lib/chat-cost-estimate';
import CompactChatToolbar, { type ChatToolbarSource } from '../[projectId]/chat/chatInput/CompactChatToolbar';
import { DEFAULT_CHAT_SETTINGS } from '../[projectId]/chat/ChatSessionContext';
// کادر پرامپت پایین سایدبار همان کادر ورودی چت است — همان استایل
import chatInputStyles from '../[projectId]/chat/chatInput/ChatInput.module.scss';
import type { StudioChatMediaKind, StudioChatSettings, TemplatePreviewMedia } from '../types/media-api';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { catalogDescription, catalogHint, catalogLabel } from '@/app/lib/i18n/catalogLabel';
import { resolveNodeMediaForAsset } from '../lib/studio-asset-helpers';
import { studioAssetsApi, type StudioAssetItem } from '../lib/studio-assets-api';
import { getApiErrorMessage } from '../lib/api-client';
import styles from './NodeSettingsPanel.module.scss';
import { aiAvatarApi } from '../lib/ai-avatar-api';
import type { AiAvatarAssetEntry, AiAvatarProfile } from '../types/ai-avatar-api';
import Link from 'next/link';
import {
    collectConnectedInputMetrics,
    EMPTY_RUNTIME_METRICS,
} from '../lib/connected-input-metrics';
import {
    normalizeAssetRefData,
    targetHandleMediaType,
    type EdgeAssetSelection,
    type StudioEdgeData,
    type StudioMediaRef,
} from '../lib/studio-media';
import { MediaMentionComposer } from './MediaMentionComposer';
import PromptOptimizeControl from './PromptOptimizeControl';
import { useConnectedImageMentions } from '../[projectId]/components/CustomNodes/useConnectedImageMentions';
import { PromptEditDialog } from '../[projectId]/components/CustomNodes/PromptEditDialog';
import SettingHelp, { type SettingHelpInfo } from './SettingHelpModal';
import AngleStudioNodeSettings from './AngleStudio/AngleStudioNodeSettings';
import { applyAngleEstimate } from '../lib/angle-studio';
import { useParams } from 'next/navigation';

const HANDLE_LABEL_KEYS: Record<string, string> = {
    'prompt-in': 'handle_prompt',
    'img-ref': 'handle_img_ref',
    'vid-ref': 'handle_vid_ref',
    'audio-in': 'handle_audio',
    'avatar-in': 'handle_avatar',
    'ref-in': 'handle_ref',
    'image-in': 'handle_image',
    'images-in': 'handle_images',
};

function useProjectsI18n() {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const lang = useAppStore((s) => s.lang);
    return { t, tc, lang };
}

type ConnectedMediaKind = 'prompt' | 'image' | 'video' | 'audio' | 'avatar' | 'unknown';

type ConnectedMediaItem = {
    id: string;
    handle: string;
    handleLabel: string;
    sourceLabel: string;
    kind: ConnectedMediaKind;
    url?: string;
    text?: string;
    thumbs?: StudioNodeData['mediaThumbs'];
    edgeId?: string;
    assets?: StudioMediaRef[];
    compatibleType?: StudioMediaRef['type'] | null;
    assetSelection?: EdgeAssetSelection;
};

function resolveConnectedMediaUrl(data: StudioNodeData): string {
    const external = String(data.externalUrl || '').trim();
    if (external) return sanitizeLegacyStorageUrl(external);
    // Stored URL first: it points at the storage the file was uploaded to; a key-built URL uses
    // the env base, which is wrong for files uploaded after an admin storage switch.
    const assetUrl = String(data.assetUrl || '').trim();
    if (assetUrl) return sanitizeLegacyStorageUrl(assetUrl);
    const fileKey = String(data.fileKey || '').trim();
    if (fileKey) {
        const built = buildPublicFileUrl(fileKey);
        if (built) return sanitizeLegacyStorageUrl(built);
    }
    return '';
}

function describeConnectedSource(
    source: Node | undefined,
    handle: string,
    t: TFunction,
): ConnectedMediaItem | null {
    if (!source) return null;
    const data = (source.data || {}) as StudioNodeData;
    const sourceLabel = String(data.label || source.type || t('node'));
    const handleKey = HANDLE_LABEL_KEYS[handle];
    const handleLabel = handleKey ? t(handleKey) : (handle || t('input'));
    const base = {
        id: `${source.id}-${handle}`,
        handle,
        handleLabel,
        sourceLabel,
    };

    if (source.type === 'prompt' || handle === 'prompt-in') {
        const text = String(data.promptText || data.prompt || '').trim();
        return { ...base, kind: 'prompt', text: text || undefined };
    }

    if (source.type === 'avatarRef' || handle === 'avatar-in') {
        const url = String(data.previewImageUrl || '').trim();
        return {
            ...base,
            kind: 'avatar',
            url: url || undefined,
            text: String(data.avatarName || '').trim() || undefined,
            thumbs: data.mediaThumbs,
        };
    }

    if (source.type === 'assetRef') {
        // نوع و آدرس از خود فایل‌ها (assets)؛ فیلدهای قدیمی سطح نود ممکن است کهنه باشند
        // (مثلاً فایل صوتی در نودی که assetType پیش‌فرض «تصویر» داشت)
        const first = normalizeAssetRefData(data)[0];
        const assetType = String(first?.type || data.assetType || 'image');
        const firstUrl = first ? String(first.url || first.externalUrl || '').trim() : '';
        const url = firstUrl ? sanitizeLegacyStorageUrl(firstUrl) : resolveConnectedMediaUrl(data);
        if (assetType === 'audio') return { ...base, kind: 'audio', url: url || undefined };
        if (assetType === 'video') return { ...base, kind: 'video', url: url || undefined, thumbs: data.mediaThumbs };
        return { ...base, kind: 'image', url: url || undefined, thumbs: data.mediaThumbs };
    }

    const videoUrl = String(data.videoUrl || data.videos?.[0] || '').trim();
    if (videoUrl || handle === 'vid-ref') {
        return { ...base, kind: 'video', url: sanitizeLegacyStorageUrl(videoUrl) || undefined, thumbs: data.mediaThumbs };
    }

    const audioUrl = String(data.audioUrl || '').trim();
    if (audioUrl || handle === 'audio-in') {
        return { ...base, kind: 'audio', url: sanitizeLegacyStorageUrl(audioUrl) || undefined };
    }

    const imageUrl = String(
        data.imageUrl
        || data.images?.[0]
        || data.previewImageUrl
        || resolveConnectedMediaUrl(data)
        || '',
    ).trim();
    if (imageUrl || handle === 'img-ref' || handle === 'image-in' || handle === 'images-in') {
        return { ...base, kind: 'image', url: sanitizeLegacyStorageUrl(imageUrl) || undefined, thumbs: data.mediaThumbs };
    }

    return { ...base, kind: 'unknown' };
}

function ConnectedAssetThumb({
    asset,
    thumbs,
}: {
    asset: StudioMediaRef;
    thumbs?: StudioNodeData['mediaThumbs'];
}) {
    const url = sanitizeLegacyStorageUrl(asset.url || asset.externalUrl || '');
    if (asset.type === 'audio') {
        return (
            <div className={styles.edgeAssetThumb} aria-hidden>
                <LuVolume2 />
            </div>
        );
    }

    const media = url
        ? {
            ...resolveLightweightMedia(url, thumbs, asset.type === 'video' ? 'video' : 'image'),
            thumbnailUrlLarge: asset.thumbnailUrlLarge || undefined,
            width: asset.width,
            height: asset.height,
            aspectRatio: asset.aspectRatio,
        }
        : null;
    const poster = sanitizeLegacyStorageUrl(asset.thumbnailUrlLarge || asset.thumbnailUrl || '');
    const src = poster || (media ? mediaThumbLargeSrc(media) : '');

    if (!src) {
        return (
            <div className={`${styles.edgeAssetThumb} ${styles.edgeAssetThumbEmpty}`} aria-hidden>
                {asset.type === 'video' ? <LuFilm /> : <LuImage />}
            </div>
        );
    }

    if (asset.type === 'video' && !poster) {
        return (
            <div className={styles.edgeAssetThumb}>
                <video
                    src={src}
                    muted
                    playsInline
                    preload="metadata"
                    className={styles.edgeAssetThumbMedia}
                />
            </div>
        );
    }

    return (
        <div className={styles.edgeAssetThumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className={styles.edgeAssetThumbMedia} />
        </div>
    );
}

function ConnectedInputsPreview({
    nodeId,
    nodes,
    edges,
    onUpdateEdge,
}: {
    nodeId: string;
    nodes: Node[];
    edges: Edge[];
    onUpdateEdge: (edgeId: string, data: StudioEdgeData) => void;
}) {
    const { t } = useProjectsI18n();
    const targetType = String(nodes.find((node) => node.id === nodeId)?.type || '');
    const items = useMemo(() => {
        const incoming = edges.filter((e) => e.target === nodeId);
        const list: ConnectedMediaItem[] = [];
        for (const edge of incoming) {
            const source = nodes.find((n) => n.id === edge.source);
            const handle = String(edge.targetHandle || '');
            const item = describeConnectedSource(source, handle, t);
            if (item) {
                const sourceData = (source?.data || {}) as StudioNodeData;
                list.push({
                    ...item,
                    id: edge.id,
                    edgeId: edge.id,
                    thumbs: item.thumbs || sourceData.mediaThumbs,
                    assets: source?.type === 'assetRef' ? normalizeAssetRefData(sourceData) : undefined,
                    compatibleType: targetHandleMediaType(edge.targetHandle, targetType),
                    assetSelection: (edge.data as StudioEdgeData | undefined)?.assetSelection,
                });
            }
        }
        return list;
    }, [nodeId, nodes, edges, t, targetType]);

    if (!items.length) {
        return (
            <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>{t('connected_inputs')}</span>
                <p className={styles.matrixHint}>{t('no_inputs_connected')}</p>
            </div>
        );
    }

    return (
        <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>{t('connected_inputs')}</span>
            <div className={styles.connectionStatusList}>
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`${styles.connectionStatusRow} ${styles.connectionOk}`}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span className={styles.fieldLabel}>{item.handleLabel}</span>
                            <span className={styles.matrixHint} style={{ margin: 0 }}>
                                {t('from_source', { label: item.sourceLabel })}
                            </span>
                        </div>

                        {item.assets && item.edgeId && (
                            <div className={styles.edgeAssetSelection}>
                                {item.assets.map((asset) => {
                                    const compatible = !item.compatibleType || asset.type === item.compatibleType;
                                    const manuallySelected = new Set(item.assetSelection?.assetIds || []);
                                    const checked = compatible && (
                                        item.assetSelection?.mode !== 'manual' || manuallySelected.has(asset.id)
                                    );
                                    return (
                                        <label
                                            key={asset.id}
                                            className={`${styles.edgeAssetOption} ${!compatible ? styles.edgeAssetIncompatible : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={!compatible}
                                                onChange={() => {
                                                    const selected = item.assetSelection?.mode === 'manual'
                                                        ? new Set(item.assetSelection.assetIds || [])
                                                        : new Set(item.assets?.filter((entry) => (
                                                            !item.compatibleType || entry.type === item.compatibleType
                                                        )).map((entry) => entry.id));
                                                    if (selected.has(asset.id)) selected.delete(asset.id);
                                                    else selected.add(asset.id);
                                                    onUpdateEdge(item.edgeId!, {
                                                        assetSelection: {
                                                            mode: 'manual',
                                                            assetIds: [...selected],
                                                        },
                                                    });
                                                }}
                                            />
                                            <ConnectedAssetThumb asset={asset} thumbs={item.thumbs} />
                                            <span>{asset.label}</span>
                                            <small>
                                                {compatible ? asset.type : t('asset_not_sent_to_node')}
                                            </small>
                                        </label>
                                    );
                                })}
                                {item.assetSelection?.mode === 'manual' && (
                                    <button
                                        type="button"
                                        className={styles.edgeAssetAuto}
                                        onClick={() => onUpdateEdge(item.edgeId!, {
                                            assetSelection: { mode: 'auto' },
                                        })}
                                    >
                                        {t('asset_selection_auto')}
                                    </button>
                                )}
                            </div>
                        )}

                        {item.kind === 'prompt' && (
                            <p className={styles.matrixHint} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                {item.text
                                    ? (item.text.length > 220 ? `${item.text.slice(0, 220)}…` : item.text)
                                    : t('empty_prompt')}
                            </p>
                        )}

                        {item.kind === 'avatar' && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                {item.url ? (
                                    <div style={{ width: 56, flexShrink: 0 }}>
                                        <LightweightMediaPreview
                                            media={resolveLightweightMedia(item.url, item.thumbs, 'image')}
                                            alt={item.text || t('avatar')}
                                        />
                                    </div>
                                ) : null}
                                <span>{item.text || t('avatar_selected')}</span>
                            </div>
                        )}

                        {!item.assets?.length && item.kind === 'image' && item.url && (
                            <LightweightMediaPreview
                                media={resolveLightweightMedia(item.url, item.thumbs, 'image')}
                                alt=""
                            />
                        )}

                        {!item.assets?.length && item.kind === 'video' && item.url && (
                            <LightweightMediaPreview
                                media={resolveLightweightMedia(item.url, item.thumbs, 'video')}
                                controls
                            />
                        )}

                        {!item.assets?.length && item.kind === 'audio' && item.url && (
                            <MiniAudioPlayer src={item.url} title={item.sourceLabel} compact />
                        )}

                        {!item.assets?.length && (item.kind === 'image' || item.kind === 'video' || item.kind === 'audio') && !item.url && (
                            <p className={styles.matrixHint} style={{ margin: 0 }}>
                                {t('file_connected_no_url')}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AvatarGalleryThumb({
    src,
    alt,
    size = 72,
}: {
    src: string;
    alt: string;
    size?: number;
}) {
    const trimmed = String(src || '').trim();
    if (!trimmed) {
        return <span style={{ fontSize: 11, padding: 6, display: 'block' }}>{alt}</span>;
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={trimmed}
            alt={alt}
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
    );
}

interface NodeSettingsPanelProps {
    selectedNode: Node | null;
    catalogEntry: NodeCatalogEntry | null;
    nodes: Node[];
    edges: Edge[];
    onUpdateNode: (nodeId: string, data: Partial<StudioNodeData>) => void;
    onUpdateEdge?: (edgeId: string, data: StudioEdgeData) => void;
    /**
     * جای کادر پرامپت/اجرا بیرون از ناحیه اسکرول میزبان (پایین سایدبار).
     * undefined: میزبان جایی نداده — کادر داخل پنل و sticky می‌ماند.
     * null: جا هنوز mount نشده — تا آماده شدنش چیزی رندر نمی‌شود.
     */
    footerSlot?: HTMLElement | null;
}

type ConnectedVideoInput = {
    id: string;
    url: string;
    durationSeconds: number;
    width: number;
    height: number;
};

type VideoMetadata = { durationSeconds: number; width: number; height: number };
const videoMetadataRequests = new Map<string, Promise<VideoMetadata>>();

function readVideoMetadata(url: string): Promise<VideoMetadata> {
    const cached = videoMetadataRequests.get(url);
    if (cached) return cached;

    const request = new Promise<VideoMetadata>((resolve) => {
        const video = document.createElement('video');
        let settled = false;
        const finish = (metadata: Partial<VideoMetadata> = {}) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            video.removeAttribute('src');
            video.load();
            resolve({
                durationSeconds: Number(metadata.durationSeconds) > 0 ? Number(metadata.durationSeconds) : 0,
                width: Number(metadata.width) > 0 ? Number(metadata.width) : 0,
                height: Number(metadata.height) > 0 ? Number(metadata.height) : 0,
            });
        };
        const timeout = window.setTimeout(() => finish(), 12_000);
        video.preload = 'metadata';
        video.onloadedmetadata = () => finish({
            durationSeconds: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
        });
        video.onerror = () => finish();
        video.src = url;
        video.load();
    });
    videoMetadataRequests.set(url, request);
    return request;
}

function resolveConnectedVideoInputs(
    nodeId: string,
    nodes: Node[],
    edges: Edge[],
): ConnectedVideoInput[] {
    const incoming = edges.filter((edge) => edge.target === nodeId);
    const sourceIds = new Set(incoming.map((edge) => edge.source));
    const inputs: ConnectedVideoInput[] = [];
    for (const source of nodes.filter((node) => sourceIds.has(node.id))) {
        const data = (source.data || {}) as StudioNodeData & Record<string, unknown>;
        const settings = (data.modelSettings || {}) as Record<string, unknown>;
        const metadata = (data.mediaMetadata || data.metadata || {}) as Record<string, unknown>;
        const sourceEdges = incoming.filter((edge) => edge.source === source.id);
        const isVideo = /video/i.test(String(source.type || ''))
            || String(data.assetType || '').toLowerCase() === 'video'
            || typeof data.videoUrl === 'string'
            || (Array.isArray(data.videos) && data.videos.length > 0)
            || sourceEdges.some((edge) => edge.targetHandle === 'vid-ref');
        if (!isVideo) continue;

        const duration = Number(
            data.videoDurationSeconds
            ?? data.durationSeconds
            ?? data.duration
            ?? metadata.durationSeconds
            ?? metadata.duration
            ?? settings.durationSeconds
            ?? settings.duration
            ?? 0,
        );
        const url = String(
            data.videoUrl
            || data.videos?.[0]
            || resolveConnectedMediaUrl(data)
            || '',
        ).trim();
        inputs.push({
            id: source.id,
            url: sanitizeLegacyStorageUrl(url),
            durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : 0,
            width: Number(metadata.width || data.mediaWidth || 0),
            height: Number(metadata.height || data.mediaHeight || 0),
        });
    }
    return inputs;
}

function useConnectedVideoEstimate(
    nodeId: string | undefined,
    nodes: Node[],
    edges: Edge[],
    onDurationResolved: (nodeId: string, data: Partial<StudioNodeData>) => void,
): { hasVideoInput: boolean; inputVideoDurationSeconds: number } {
    const inputs = useMemo(
        () => nodeId ? resolveConnectedVideoInputs(nodeId, nodes, edges) : [],
        [nodeId, nodes, edges],
    );
    const knownDuration = inputs.reduce((total, input) => total + input.durationSeconds, 0);
    const [probedDuration, setProbedDuration] = useState(0);
    // Remember which URLs we already probed so a metadata read that still leaves
    // width/height unresolved can't re-trigger the probe (and re-patch the node)
    // forever, which used to flood the editor with saves and freeze the page.
    const probedUrlsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        let cancelled = false;
        setProbedDuration(0);
        const unresolved = inputs.filter((input) =>
            input.url && !probedUrlsRef.current.has(input.url)
            && (input.durationSeconds <= 0 || input.width <= 0 || input.height <= 0)
        );
        if (unresolved.length === 0) return () => { cancelled = true; };

        Promise.all(unresolved.map((input) => readVideoMetadata(input.url)))
            .then((metadataItems) => {
                if (cancelled) return;
                setProbedDuration(metadataItems.reduce(
                    (total, metadata, index) =>
                        total + (unresolved[index].durationSeconds <= 0 ? metadata.durationSeconds : 0),
                    0,
                ));
                unresolved.forEach((input, index) => {
                    probedUrlsRef.current.add(input.url);
                    const metadata = metadataItems[index];
                    if (metadata.durationSeconds > 0 || metadata.width > 0 || metadata.height > 0) {
                        onDurationResolved(input.id, {
                            videoDurationSeconds: metadata.durationSeconds || input.durationSeconds,
                            mediaMetadata: {
                                durationSeconds: metadata.durationSeconds || input.durationSeconds,
                                width: metadata.width || input.width,
                                height: metadata.height || input.height,
                            },
                        });
                    }
                });
            });
        return () => { cancelled = true; };
    }, [inputs, onDurationResolved]);

    return {
        hasVideoInput: inputs.length > 0,
        inputVideoDurationSeconds: knownDuration + probedDuration,
    };
}

function resolveMatrixBatchCount(
    nodeId: string,
    nodeData: StudioNodeData,
    nodes: Node[],
    edges: Edge[],
): { batchCount: number; isFromTransformer: boolean } {
    const refEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'image-in');
    if (!refEdge) {
        return {
            batchCount: Math.min(Math.max(Number(nodeData.batchCount) || 6, 1), 12),
            isFromTransformer: false,
        };
    }
    const source = nodes.find((n) => n.id === refEdge.source);
    if (source?.type !== 'inpainting') {
        return {
            batchCount: Math.min(Math.max(Number(nodeData.batchCount) || 6, 1), 12),
            isFromTransformer: false,
        };
    }
    const srcData = source.data as StudioNodeData;
    const fromImages = (srcData.images as string[] | undefined)?.length || 0;
    return {
        batchCount: fromImages || Number(srcData.count) || Number(nodeData.batchCount) || 6,
        isFromTransformer: true,
    };
}

function ImageMatrixSettings({
    nodeId,
    nodeData,
    nodes,
    edges,
    onPatch,
}: {
    nodeId: string;
    nodeData: StudioNodeData;
    nodes: Node[];
    edges: Edge[];
    onPatch: (patch: Partial<StudioNodeData>) => void;
}) {
    const { t } = useProjectsI18n();
    const { batchCount, isFromTransformer } = useMemo(
        () => resolveMatrixBatchCount(nodeId, nodeData, nodes, edges),
        [nodeId, nodeData, nodes, edges],
    );

    const tilePrompts = (nodeData.tilePrompts as string[] | undefined) || [];

    const handleCountChange = (val: number) => {
        const c = Math.min(Math.max(val || 1, 1), 12);
        const next = Array.from({ length: c }, (_, i) => tilePrompts[i] ?? '');
        onPatch({ batchCount: c, tilePrompts: next });
    };

    const handleTileChange = (index: number, val: string) => {
        const next = Array.from({ length: batchCount }, (_, i) => tilePrompts[i] ?? '');
        next[index] = val;
        onPatch({ tilePrompts: next });
    };

    return (
        <div className={styles.matrixSettings}>
            <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{t('image_count_label')}</label>
                <input
                    type="number"
                    className={styles.fieldInput}
                    min={1}
                    max={12}
                    value={batchCount}
                    disabled={isFromTransformer}
                    onChange={(e) => handleCountChange(Number(e.target.value))}
                />
                {isFromTransformer && (
                    <span className={styles.matrixHint}>{t('count_from_transformer')}</span>
                )}
            </div>

            <div className={styles.tilePromptsSection}>
                <span className={styles.fieldLabel}>{t('prompt_per_image')}</span>
                <p className={styles.matrixHint}>
                    {t('prompt_per_image_hint')}
                </p>
                {Array.from({ length: batchCount }).map((_, i) => (
                    <div key={i} className={styles.tilePromptRow}>
                        <label className={styles.tilePromptLabel}>#{i + 1}</label>
                        <input
                            className={styles.fieldInput}
                            value={tilePrompts[i] ?? ''}
                            placeholder={t('example_pose')}
                            onChange={(e) => handleTileChange(i, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function resolveTransformerConnections(nodeId: string, nodes: Node[], edges: Edge[]) {
    const imageEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'images-in');
    const refEdge = edges.find((e) => e.target === nodeId && e.targetHandle === 'ref-in');

    const imageSource = imageEdge ? nodes.find((n) => n.id === imageEdge.source) : null;
    const refSource = refEdge ? nodes.find((n) => n.id === refEdge.source) : null;

    const imageSourceData = (imageSource?.data ?? {}) as StudioNodeData;
    const incomingCount = (imageSourceData.images as string[] | undefined)?.length
        || Number(imageSourceData.count)
        || 0;

    return {
        imageConnected: !!imageEdge,
        imageSourceLabel: String(imageSourceData.label || imageSource?.type || ''),
        incomingCount,
        refConnected: !!refEdge,
        refSourceLabel: String((refSource?.data as StudioNodeData)?.label || refSource?.type || ''),
    };
}

function ImageTransformerSettings({
    nodeId,
    nodes,
    edges,
}: {
    nodeId: string;
    nodes: Node[];
    edges: Edge[];
}) {
    const { t } = useProjectsI18n();
    const conn = useMemo(
        () => resolveTransformerConnections(nodeId, nodes, edges),
        [nodeId, nodes, edges],
    );

    return (
        <div className={styles.transformerSettings}>
            <p className={styles.matrixHint}>
                {t('no_prompt_transformer')}
            </p>
            <div className={styles.connectionStatusList}>
                <div className={`${styles.connectionStatusRow} ${conn.imageConnected ? styles.connectionOk : ''}`}>
                    <span className={styles.fieldLabel}>{t('images_handle')}</span>
                    <span>
                        {conn.imageConnected
                            ? t('images_from', {
                                count: conn.incomingCount || t('unknown_count'),
                                label: conn.imageSourceLabel,
                            })
                            : t('connect_matrix')}
                    </span>
                </div>
                <div className={`${styles.connectionStatusRow} ${conn.refConnected ? styles.connectionOk : ''}`}>
                    <span className={styles.fieldLabel}>{t('new_ref_handle')}</span>
                    <span>
                        {conn.refConnected
                            ? t('connected_to', { label: conn.refSourceLabel })
                            : t('connect_ref')}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function SettingField({
    field,
    value,
    nodeData,
    onChange,
    onPatch,
}: {
    field: NodeSettingField;
    value: unknown;
    nodeData: StudioNodeData;
    onChange: (key: string, val: unknown) => void;
    onPatch: (patch: Partial<StudioNodeData>) => void;
}) {
    const { t, tc, lang } = useProjectsI18n();
    const [providers, setProviders] = useState<ProviderItem[]>([]);
    const [models, setModels] = useState<ProviderModelItem[]>([]);
    const [remoteOptions, setRemoteOptions] = useState<{ value: string; label: string; preview?: string }[] | null>(null);
    const [urlOptions, setUrlOptions] = useState<{ value: string; label: string; preview?: string }[] | null>(null);
    const [urlError, setUrlError] = useState<string | null>(null);
    const label = catalogLabel(field, lang) || field.label;
    const providerClass = field.providerClass;
    const params = useParams<{ projectId?: string }>();
    // پنجره‌ی راهنما (علامت تعجب کنار عنوان هر تنظیم) — تنها جای راهنمای تنظیم (helpFa، یا hint قدیمی)
    const helpInfo: SettingHelpInfo = { label, helpFa: field.helpFa, hintFa: catalogHint(field, lang) };

    useEffect(() => {
        if (field.type !== 'select' || !field.optionsSource) return;
        const providerName = String(nodeData.providerName || '').trim();
        if (!providerName) {
            setRemoteOptions([]);
            return;
        }
        let cancelled = false;
        aiOptionsApi.getOptions(providerName, field.optionsSource)
            .then((res) => { if (!cancelled) setRemoteOptions(res.options ?? []); })
            .catch(() => { if (!cancelled) setRemoteOptions([]); });
        return () => { cancelled = true; };
    }, [field.type, field.optionsSource, nodeData.providerName]);

    const loadUrlOptions = useCallback(() => {
        if (field.type !== 'select' || !field.urlSource?.url) return;
        let cancelled = false;
        aiOptionsApi.fetchUrlOptions({
            url: field.urlSource.url,
            method: field.urlSource.method,
            headers: field.urlSource.headers,
            query: field.urlSource.query,
            body: field.urlSource.body,
            itemsPath: field.urlSource.itemsPath,
            valuePath: field.urlSource.valuePath,
            labelPath: field.urlSource.labelPath,
            previewPath: field.urlSource.previewPath,
            providerName: String(nodeData.providerName || '').trim() || undefined,
        })
            .then((res) => {
                if (cancelled) return;
                setUrlOptions(res.options ?? []);
                setUrlError(null);
            })
            .catch((err) => {
                if (cancelled) return;
                setUrlOptions([]);
                setUrlError(getApiErrorMessage(err, t('fetch_options_error')));
            });
        return () => { cancelled = true; };
    }, [field, nodeData.providerName, t]);

    useEffect(() => {
        if (field.type !== 'select' || !field.urlSource?.url) return;
        const cleanup = loadUrlOptions();
        return cleanup;
    }, [loadUrlOptions, field.type, field.urlSource?.url]);

    useEffect(() => {
        if (field.type !== 'provider-select' && field.type !== 'model-select') return;

        providersApi.listProviders().then((res) => {
            setProviders(res.providers ?? []);
        }).catch(() => setProviders([]));
    }, [field.type]);

    // مدل‌ها مثل chat فقط بر اساس نوع نود (providerClass) لود می‌شوند؛ انتخاب provider جداگانه نداریم
    // و provider از روی مدل انتخاب‌شده استخراج می‌شود.
    useEffect(() => {
        if (field.type !== 'model-select') return;
        const providerId = String(nodeData.providerId || '');
        if (!providerClass && !providerId) {
            setModels([]);
            return;
        }

        providersApi.listModels({
            class: providerClass,
            ...(providerClass ? {} : { providerId }),
        }).then((res) => {
            setModels(res.models ?? []);
        }).catch(() => setModels([]));
    }, [field.type, providerClass, nodeData.providerId]);

    const providerNameFor = useCallback((id?: string) => {
        const key = String(id || '');
        if (!key) return '';
        const provider = providers.find((p) => p._id === key);
        return provider?.name || provider?.displayName || '';
    }, [providers]);

    const displayModels = useMemo(() => {
        if (field.type !== 'model-select') return models;
        if (field.providerClass !== 'audio') return models;
        return filterAudioModelsByCategory(
            models,
            normalizeAudioCategory(String(nodeData.audioMode || 'tts')),
        );
    }, [field.type, field.providerClass, models, nodeData.audioMode]);

    if (field.type === 'derived') {
        // مقدار خودکار از ترکیب فیلدهای مبدأ — فقط خواندنی (مگر ادمین مخفی کرده باشد)
        if (field.showToUser === false) return null;
        const modelSettingsBag = (nodeData.modelSettings || {}) as Record<string, unknown>;
        const derived = resolveDerivedValue(field, (key) => String(modelSettingsBag[key] ?? ''));
        return (
            <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                    <label className={styles.fieldLabel}>{label}</label>
                    <SettingHelp info={helpInfo} />
                </div>
                <span
                    className={styles.fieldInput}
                    style={{ opacity: 0.85, pointerEvents: 'none' }}
                    title="به‌صورت خودکار از ترکیب تنظیمات دیگر محاسبه می‌شود"
                >
                    {derived || '—'}
                </span>
            </div>
        );
    }

    if (field.type === 'textarea') {
        if (field.key === 'promptText') {
            return (
                <div className={styles.fieldGroup}>
                    <div className={styles.fieldLabelRow}>
                        <label className={styles.fieldLabel}>{label}</label>
                        <SettingHelp info={helpInfo} />
                    </div>
                    <MediaMentionComposer
                        className={styles.fieldTextarea}
                        value={String(value ?? '')}
                        mentions={nodeData.promptMentions}
                        projectId={params?.projectId}
                        onChange={(promptText, promptMentions) => onPatch({ promptText, promptMentions })}
                        placeholder={field.placeholder || t('enter_value', { label })}
                    />
                </div>
            );
        }
        return (
            <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                    <label className={styles.fieldLabel}>{label}</label>
                    <SettingHelp info={helpInfo} />
                </div>
                <textarea
                    className={styles.fieldTextarea}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder || t('enter_value', { label })}
                />
            </div>
        );
    }

    if (field.type === 'select') {
        const hasUrlSource = Boolean(field.urlSource?.url);
        const urlLoading = hasUrlSource && urlOptions === null;
        const options = hasUrlSource
            ? (urlOptions ?? [])
            : field.optionsSource
                ? (remoteOptions ?? [])
                : (field.options ?? []);
        const loadingRemote = hasUrlSource ? urlLoading : (field.optionsSource && remoteOptions === null);
        const selectedOption = options.find((opt) => opt.value === String(value ?? ''));
        const previewUrl = selectedOption?.preview
            ? sanitizeLegacyStorageUrl(String(selectedOption.preview))
            : '';
        const previewKind = previewUrl ? previewMediaKind(previewUrl, providerClass) : null;
        return (
            <div className={styles.fieldGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <label className={styles.fieldLabel}>{label}</label>
                        <SettingHelp info={helpInfo} />
                    </span>
                    {hasUrlSource && (
                        <button
                            type="button"
                            className={styles.matrixHint}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => {
                                setUrlOptions(null);
                                setUrlError(null);
                                loadUrlOptions();
                            }}
                            disabled={urlLoading}
                        >
                            {urlLoading ? t('loading_options') : t('updating_list')}
                        </button>
                    )}
                </div>
                <select
                    className={styles.fieldSelect}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(field.key, e.target.value)}
                >
                    <option value="">{loadingRemote ? t('loading_options') : tc('select')}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {previewUrl && previewKind === 'audio' && (
                    <MiniAudioPlayer src={previewUrl} compact title={selectedOption?.label} />
                )}
                {previewUrl && previewKind === 'image' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={previewUrl}
                        alt={selectedOption?.label || ''}
                        className={styles.optionPreviewImage}
                        loading="lazy"
                    />
                )}
                {previewUrl && previewKind === 'video' && (
                    <video
                        src={previewUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className={styles.optionPreviewVideo}
                    />
                )}
                {hasUrlSource && urlError && (
                    <p className={styles.matrixHint}>{urlError}</p>
                )}
                {hasUrlSource && !urlLoading && !urlError && options.length === 0 && (
                    <p className={styles.matrixHint}>
                        {t('no_options_url')}
                    </p>
                )}
                {!hasUrlSource && field.optionsSource && !loadingRemote && options.length === 0 && (
                    <p className={styles.matrixHint}>{t('no_options_provider')}</p>
                )}
            </div>
        );
    }

    if (field.type === 'number') {
        // default sits at the schema minimum and stays clamped within [min, max]
        const parsed = value == null || value === '' ? NaN : Number(value);
        const lo = field.min != null && Number.isFinite(Number(field.min)) ? Number(field.min) : -Infinity;
        const hi = field.max != null && Number.isFinite(Number(field.max)) ? Number(field.max) : Infinity;
        const numeric = Math.min(Math.max(Number.isFinite(parsed) ? parsed : (lo === -Infinity ? 0 : lo), lo), hi);
        return (
            <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                    <label className={styles.fieldLabel}>{label}</label>
                    <SettingHelp info={helpInfo} />
                </div>
                <input
                    type="number"
                    className={styles.fieldInput}
                    value={numeric}
                    min={field.min}
                    max={field.max}
                    onChange={(e) => onChange(field.key, Number(e.target.value))}
                />
            </div>
        );
    }

    if (field.type === 'checkbox') {
        return (
            <label className={styles.checkboxRow}>
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange(field.key, e.target.checked)}
                />
                {label}
                <SettingHelp info={helpInfo} />
            </label>
        );
    }

    if (field.type === 'slider') {
        const min = field.min ?? 0;
        const max = field.max ?? 1;
        const step = field.step ?? 0.05;
        const numeric = Number(value ?? min);
        return (
            <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                    <label className={styles.fieldLabel}>{label}</label>
                    <SettingHelp info={helpInfo} />
                </div>
                <div className={styles.sliderRow}>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={Number.isFinite(numeric) ? numeric : min}
                        onChange={(e) => onChange(field.key, Number(e.target.value))}
                    />
                    <span className={styles.sliderValue}>{Number.isFinite(numeric) ? numeric : min}</span>
                </div>
            </div>
        );
    }

    if (field.type === 'provider-select') {
        // انتخاب provider دیگر به کاربر نشان داده نمی‌شود — مدل‌ها مستقیم بر اساس
        // نوع نود لود می‌شوند و provider از روی مدل انتخابی تعیین می‌گردد (الگوی chat).
        return null;
    }

    if (field.type === 'model-select') {
        return (
            <div className={styles.fieldGroup}>
                <div className={styles.fieldLabelRow}>
                    <label className={styles.fieldLabel}>{label}</label>
                    <SettingHelp info={helpInfo} />
                </div>
                <select
                    className={styles.fieldSelect}
                    value={String(value ?? '')}
                    onChange={(e) => {
                        const modelId = e.target.value;
                        const selected = displayModels.find((model) => model._id === modelId);
                        const providerId = String(selected?.providerId || '');
                        onPatch({
                            modelId,
                            model: selected?.name || '',
                            modelName: selected?.displayName || selected?.name || '',
                            modelSettings: {},
                            providerId,
                            providerName: providerNameFor(providerId),
                        });
                    }}
                >
                    <option value="">{t('select_model')}</option>
                    {displayModels.map((m) => (
                        <option key={m._id} value={m._id}>{m.displayName || m.name}</option>
                    ))}
                </select>
            </div>
        );
    }

    if (field.type === 'avatar-select') {
        return (
            <AvatarSelectField
                label={label}
                labelSlot={<SettingHelp info={helpInfo} />}
                value={String(value ?? '')}
                selectedAssetId={String(nodeData.selectedAssetId || nodeData.byteplusAssetId || '')}
                selectedAssetUri={String(nodeData.avatarAssetUri || '')}
                onPatch={onPatch}
            />
        );
    }

    return (
        <div className={styles.fieldGroup}>
            <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>{label}</label>
                <SettingHelp info={helpInfo} />
            </div>
            <input
                className={styles.fieldInput}
                value={String(value ?? '')}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder || t('enter_value', { label })}
            />
        </div>
    );
}

function AvatarSelectField({
    label,
    labelSlot,
    value,
    selectedAssetId,
    selectedAssetUri,
    onPatch,
}: {
    label: string;
    /** آیکون راهنما (علامت تعجب) کنار عنوان فیلد */
    labelSlot?: ReactNode;
    value: string;
    selectedAssetId?: string;
    selectedAssetUri?: string;
    onPatch: (patch: Partial<StudioNodeData>) => void;
}) {
    const { t } = useProjectsI18n();
    const [avatars, setAvatars] = useState<AiAvatarProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [personAssets, setPersonAssets] = useState<AiAvatarAssetEntry[]>([]);

    const loadAvatars = useCallback(() => {
        setLoading(true);
        aiAvatarApi.listActiveAvatars()
            .then((res) => setAvatars(res.avatars ?? []))
            .catch(() => setAvatars([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadAvatars();
    }, [loadAvatars]);

    const selected = avatars.find((a) => a._id === value);

    const photoItems = useMemo(() => {
        const fromAssets = (personAssets.length ? personAssets : selected?.assets || [])
            .map((asset, index) => {
                const assetId = String(asset.assetId || '').trim();
                const assetUri = String(asset.assetUri || (assetId ? `asset://${assetId}` : '')).trim();
                const thumb = String(asset.sourceUrl || '').trim()
                    || String(selected?.previewImageUrl || '').trim();
                return {
                    key: assetId || assetUri || `asset-${index}`,
                    assetId,
                    assetUri,
                    thumb,
                    name: asset.name || t('photo_n', { index: index + 1 }),
                    status: asset.status || '',
                };
            })
            .filter((item) => item.assetUri.startsWith('asset://'));

        if (fromAssets.length) return fromAssets;

        // Fallback: source sheets without BytePlus asset yet
        return (selected?.sourceImageUrls || []).map((url, index) => ({
            key: `source-${index}`,
            assetId: '',
            assetUri: '',
            thumb: url,
            name: t('photo_n', { index: index + 1 }),
            status: '',
        }));
    }, [personAssets, selected, t]);

    useEffect(() => {
        if (!value) {
            setPersonAssets([]);
            return;
        }

        const fromList = selected?.assets;
        if (fromList?.length) {
            setPersonAssets(fromList);
            return;
        }

        setDetailLoading(true);
        aiAvatarApi.getAvatar(value)
            .then((detail) => setPersonAssets(detail.assets || []))
            .catch(() => setPersonAssets([]))
            .finally(() => setDetailLoading(false));
    }, [value, selected?.assets]);

    const activeAssetUri = String(selectedAssetUri || '').trim();
    const activeAssetId = String(selectedAssetId || '').trim();

    const selectPerson = (avatarId: string) => {
        const next = avatars.find((a) => a._id === avatarId);
        const firstAsset = (next?.assets || []).find((a) => String(a.assetUri || '').startsWith('asset://'))
            || (next?.assets || [])[0];
        const firstUri = String(firstAsset?.assetUri || next?.byteplusAssetUri || '').trim();
        const firstId = String(firstAsset?.assetId || next?.byteplusAssetId || '').trim();
        const thumb = String(firstAsset?.sourceUrl || next?.previewImageUrl || '').trim();

        onPatch({
            avatarId,
            avatarName: next?.name || '',
            avatarAssetUri: firstUri,
            selectedAssetId: firstId,
            byteplusAssetId: firstId,
            previewImageUrl: thumb || next?.previewImageUrl || '',
        });
    };

    const selectPhoto = (item: { assetId: string; assetUri: string; thumb: string }) => {
        if (!item.assetUri.startsWith('asset://')) return;
        onPatch({
            avatarAssetUri: item.assetUri,
            selectedAssetId: item.assetId,
            byteplusAssetId: item.assetId,
            previewImageUrl: item.thumb || selected?.previewImageUrl || '',
        });
    };

    return (
        <div className={styles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <label className={styles.fieldLabel}>{label}</label>
                    {labelSlot}
                </span>
                <button
                    type="button"
                    className={styles.matrixHint}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={loadAvatars}
                >
                    {t('updating_list')}
                </button>
            </div>
            <select
                className={styles.fieldSelect}
                value={value}
                onChange={(e) => selectPerson(e.target.value)}
            >
                <option value="">
                    {loading ? t('loading_options') : t('select_character')}
                </option>
                {avatars.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                ))}
            </select>

            {value && (
                <div style={{ marginTop: 10 }}>
                    <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>
                        {t('photos_of_person')}
                        {detailLoading ? ' …' : ''}
                    </div>
                    {photoItems.length === 0 ? (
                        <p className={styles.matrixHint}>{t('no_photos')}</p>
                    ) : (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                                gap: 8,
                            }}
                        >
                            {photoItems.map((item) => {
                                const isActive = (item.assetUri && item.assetUri === activeAssetUri)
                                    || (item.assetId && item.assetId === activeAssetId);
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => selectPhoto(item)}
                                        title={item.name}
                                        style={{
                                            padding: 0,
                                            border: isActive ? '2px solid var(--primary-color, #2563eb)' : '1px solid var(--border-color, #ddd)',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            cursor: item.assetUri ? 'pointer' : 'default',
                                            background: 'transparent',
                                            aspectRatio: '1',
                                        }}
                                    >
                                        {item.thumb ? (
                                            <AvatarGalleryThumb src={item.thumb} alt={item.name} size={72} />
                                        ) : (
                                            <span style={{ fontSize: 11, padding: 6, display: 'block' }}>{item.name}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <p className={styles.matrixHint} style={{ marginTop: 8 }}>
                        {t('only_selected_photo')}
                    </p>
                </div>
            )}

            {!loading && avatars.length === 0 && (
                <p className={styles.matrixHint}>
                    {t('no_active_character')}{' '}
                    <Link href="/avatars">{t('create_verify_avatars')}</Link>
                </p>
            )}
        </div>
    );
}

export function AudioCategoryField({
    nodeData,
    onPatch,
}: {
    nodeData: StudioNodeData;
    onPatch: (patch: Partial<StudioNodeData>) => void;
}) {
    const { t } = useProjectsI18n();
    const audioCategory = normalizeAudioCategory(String(nodeData.audioMode || 'tts'));

    const handleCategoryChange = (nextCategory: AudioCategory) => {
        onPatch({
            audioMode: nextCategory,
            modelId: '',
            model: '',
            modelName: '',
            modelSettings: {},
        });
    };

    const selectedCategory = AUDIO_CATEGORIES.find((item) => item.value === audioCategory);

    return (
        <div className={styles.audioSettings}>
            <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{t('audio_category')}</label>
                <select
                    className={styles.fieldSelect}
                    value={audioCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as AudioCategory)}
                >
                    {AUDIO_CATEGORIES.map((item) => (
                        <option key={item.value} value={item.value}>{t(`audio_cat_${item.value}`)}</option>
                    ))}
                </select>
                {selectedCategory && (
                    <span className={styles.matrixHint}>{t(`audio_cat_${selectedCategory.value}_desc`)}</span>
                )}
            </div>
        </div>
    );
}

function PromptAssetControls({
    promptText,
    onInsert,
}: {
    promptText: string;
    onInsert: (text: string) => void;
}) {
    const { t, tc } = useProjectsI18n();
    const [open, setOpen] = useState(false);
    const [assets, setAssets] = useState<StudioAssetItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const toggleOpen = () => {
        const next = !open;
        setOpen(next);
        if (next && assets.length === 0) {
            setLoading(true);
            setError(null);
            studioAssetsApi.list('prompt')
                .then((res) => setAssets(res.assets ?? []))
                .catch((err) => setError(getApiErrorMessage(err, t('load_assets_error'))))
                .finally(() => setLoading(false));
        }
    };

    const handleSaveAsAsset = async () => {
        if (!promptText.trim()) return;
        const name = window.prompt(t('asset_name_prompt'));
        if (!name || !name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const { asset } = await studioAssetsApi.create({
                type: 'prompt',
                name: name.trim(),
                payload: { promptText },
            });
            setAssets((prev) => [asset, ...prev]);
        } catch (err) {
            setError(getApiErrorMessage(err, t('save_asset_error')));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.fieldGroup}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className={styles.runNodeBtn}
                    style={{ background: 'transparent', color: 'inherit', border: '1px dashed var(--input-border-color)' }}
                    onClick={toggleOpen}
                >
                    <LuFileText /> {t('insert_from_assets')} <LuChevronDown />
                </button>
                <button
                    type="button"
                    className={styles.runNodeBtn}
                    style={{ background: 'transparent', color: 'inherit', border: '1px dashed var(--input-border-color)' }}
                    disabled={saving || !promptText.trim()}
                    onClick={handleSaveAsAsset}
                >
                    <LuBookmarkPlus /> {t('save_as_asset')}
                </button>
            </div>

            {open && (
                <div style={{
                    marginTop: 8,
                    border: '1px solid var(--input-border-color)',
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: 'auto',
                }}>
                    {loading && <p style={{ padding: 10, margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>{tc('loading')}</p>}
                    {!loading && error && <p style={{ padding: 10, margin: 0, fontSize: '0.8rem', color: '#ff4757' }}>{error}</p>}
                    {!loading && !error && assets.length === 0 && (
                        <p style={{ padding: 10, margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>{t('no_saved_assets')}</p>
                    )}
                    {!loading && !error && assets.map((asset) => (
                        <button
                            key={asset._id}
                            type="button"
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'right',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid var(--input-border-color)',
                                padding: '8px 10px',
                                cursor: 'pointer',
                                color: 'inherit',
                                fontSize: '0.8rem',
                            }}
                            onClick={() => {
                                const text = ('promptText' in asset.payload ? asset.payload.promptText : '')
                                    || asset.promptText
                                    || '';
                                onInsert(text);
                                setOpen(false);
                            }}
                        >
                            <strong>{asset.name}</strong>
                            <div style={{ opacity: 0.6, fontSize: '0.72rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {('promptText' in asset.payload ? asset.payload.promptText : '') || asset.promptText}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Generation nodes whose prompt lives only in this settings panel (no inline editor on the node body). */
const GENERATION_PROMPT_NODE_TYPES = ['textToImage', 'textToVideo', 'aiAvatar', 'musicSfx'];

/** نوع رسانه معادل چت برای هر نود تولیدی — تولبار چت با همین کار می‌کند */
const NODE_MEDIA_KIND: Record<string, StudioChatMediaKind> = {
    textToImage: 'image',
    textToVideo: 'video',
    aiAvatar: 'video',
    musicSfx: 'audio',
};

const NO_ATTACHMENTS: TemplatePreviewMedia[] = [];
const noop = () => undefined;

/**
 * انتخاب مدل و تنظیمات مدل نود — دقیقاً همان CompactChatToolbar کادر چت،
 * با دیتای نود به‌جای جلسه چت. مود/دوربین/نور و انتخاب نوع رسانه مخصوص چت‌اند و نمایش داده نمی‌شوند.
 */
function NodeModelToolbar({
    nodeType,
    nodeData,
    onPatch,
    onBlockersChange,
}: {
    nodeType: string;
    nodeData: StudioNodeData;
    onPatch: (patch: Partial<StudioNodeData>) => void;
    onBlockersChange: (blockers: string[]) => void;
}) {
    const { readOnly } = useMediaStudio();
    const mediaKind = NODE_MEDIA_KIND[nodeType] || 'image';
    const promptText = String(nodeData.promptText || '');
    const readComposerText = useCallback(() => promptText, [promptText]);

    const settings = useMemo<StudioChatSettings>(() => ({
        ...DEFAULT_CHAT_SETTINGS,
        modelId: String(nodeData.modelId || ''),
        model: String(nodeData.model || ''),
        modelName: String(nodeData.modelName || ''),
        providerId: String(nodeData.providerId || ''),
        modelSettings: (nodeData.modelSettings || {}) as Record<string, unknown>,
    }), [nodeData.modelId, nodeData.model, nodeData.modelName, nodeData.providerId, nodeData.modelSettings]);

    // فقط فیلدهای مدل به نود نوشته می‌شوند؛ aspectRatio/resolution داخل modelSettings هم هستند
    const patchSettings = useCallback((patch: Partial<StudioChatSettings>) => {
        const next: Partial<StudioNodeData> = {};
        if ('modelId' in patch) next.modelId = patch.modelId;
        if ('model' in patch) next.model = patch.model;
        if ('modelName' in patch) next.modelName = patch.modelName;
        if ('providerId' in patch) next.providerId = patch.providerId;
        if ('modelSettings' in patch) next.modelSettings = patch.modelSettings;
        if (Object.keys(next).length) onPatch(next);
    }, [onPatch]);

    // providerName برای گزینه‌های راه‌دور فیلدها لازم است؛ تولبار فقط providerId می‌دهد
    const providerId = String(nodeData.providerId || '');
    const providerName = String(nodeData.providerName || '');
    useEffect(() => {
        if (!providerId) return;
        let cancelled = false;
        providersApi.listProviders()
            .then((res) => {
                if (cancelled) return;
                const provider = (res.providers ?? []).find((item) => item._id === providerId);
                const name = provider?.name || provider?.displayName || '';
                if (name && name !== providerName) onPatch({ providerName: name });
            })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [providerId, providerName, onPatch]);

    const audioCategory = nodeType === 'musicSfx'
        ? normalizeAudioCategory(String(nodeData.audioMode || 'tts'))
        : null;
    const filterModels = useMemo(
        () => (audioCategory
            ? (models: ProviderModelItem[]) => filterAudioModelsByCategory(models, audioCategory)
            : undefined),
        [audioCategory],
    );

    const source = useMemo<ChatToolbarSource>(() => ({
        mediaKind,
        setMediaKind: noop,
        settings,
        patchSettings,
        readComposerText,
        attachments: NO_ATTACHMENTS,
        connectionOk: true,
        setComposerBlockers: onBlockersChange,
        hasTranscript: false,
    }), [mediaKind, settings, patchSettings, readComposerText, onBlockersChange]);

    return (
        <div className={styles.nodeModelToolbar}>
            <CompactChatToolbar
                source={source}
                nodeType={nodeType}
                filterModels={filterModels}
                showKind={false}
                showDirector={false}
                // «زاویه و نور» در نود بخش خودش را دارد (AngleStudioNodeSettings)
                showAngles={false}
                variant="fields"
                disabled={readOnly}
            />
        </div>
    );
}

const NODE_COST_KIND: Record<string, 'image' | 'video' | 'audio'> = {
    textToImage: 'image',
    textToVideo: 'video',
    aiAvatar: 'video',
    musicSfx: 'audio',
};

/**
 * کادر پایین سایدبار — همان کادر ورودی چت (همان استایل و اجزا) ولی فقط پرامپت:
 * بدون تنظیمات و فایل ورودی، با دکمه اجرا به‌جای ارسال و قیمت تخمینی بالای کادر.
 * نود پرامپت هم همین کادر را دارد، بدون دکمه اجرا (onRun ندارد).
 */
function NodePromptComposer({
    nodeId,
    nodeData,
    hasPrompt,
    isPromptNode = false,
    onPatch,
    payload,
    modelLabel,
    isRunning,
    runBlocked,
    onRun,
    footerSlot,
}: {
    nodeId: string;
    nodeData: StudioNodeData;
    hasPrompt: boolean;
    /** نود پرامپت: منشن از گالری پروژه (مثل خود نود) به‌جای تصاویر وصل‌شده */
    isPromptNode?: boolean;
    onPatch: (patch: Partial<StudioNodeData>) => void;
    payload: CostEstimatePayload | null;
    modelLabel: string;
    isRunning: boolean;
    runBlocked: string[];
    onRun?: () => void;
    footerSlot?: HTMLElement | null;
}) {
    const { t } = useProjectsI18n();
    const { readOnly } = useMediaStudio();
    const params = useParams<{ projectId?: string }>();
    const imageInputMentions = useConnectedImageMentions(nodeId);
    const costButtonVisible = useChatCostButtonVisible();
    const [fetched, setFetched] = useState<{ amount: number | null; unit?: string; breakdown?: Record<string, unknown> }>({
        amount: null,
    });
    const payloadKey = payload ? JSON.stringify(payload) : '';
    const kind = payload ? NODE_COST_KIND[String(payload.nodeType || '')] : undefined;
    // تا رسیدن قیمت تازه، مبلغ قبلی می‌ماند (مثل چت)؛ بدون مدل چیزی نشان داده نمی‌شود
    const amount = payloadKey ? fetched.amount : null;
    // همان برچسب چت: مبنای «هر ساخت» مدل → «/ساخت»، وگرنه نوع خروجی
    const unitKey = kind ? estimateUnitKey(fetched, kind) : undefined;

    // مثل چت: با تأخیر کوتاه تا تغییر پشت‌سرهم تنظیمات، درخواست پشت‌سرهم نسازد
    useEffect(() => {
        if (!payloadKey) return;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            mediaApi.estimateCost(JSON.parse(payloadKey) as CostEstimatePayload)
                .then((data) => {
                    if (!cancelled) {
                        setFetched({ amount: data.chargedUsd ?? data.amount ?? null, unit: data.unit, breakdown: data.breakdown });
                    }
                })
                .catch(() => { if (!cancelled) setFetched({ amount: null }); });
        }, 400);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [payloadKey]);

    // ویرایش کامل پرامپت در همان پنجره دکمه expand نود پرامپت روی بوم
    const [editorOpen, setEditorOpen] = useState(false);
    // موبایل: کادر می‌تواند به یک ردیف (پیش‌نمایش یک‌خطی پرامپت + اجرا) کوچک شود تا ارتفاع سایدبار را نگیرد
    const isMobile = useMobileViewport();
    const [minimized, setMinimized] = useState(false);
    const canMinimize = isMobile && hasPrompt;
    const collapsed = canMinimize && minimized;

    const showCostButton = costButtonVisible && Boolean(payload && kind);
    // جای میزبان هنوز mount نشده؛ با آماده شدنش (همان commit) رندر می‌شود
    if (footerSlot === null) return null;

    const connectedImageLabels = {
        title: t('mention_connected_images'),
        empty: t('mention_no_connected_images'),
        hint: t('mention_connected_images_hint'),
    };
    const promptPreview = String(nodeData.promptText ?? '').replace(/\s+/g, ' ').trim();

    const runButton = onRun ? (
        <button
            type="button"
            className={chatInputStyles.sendBtn}
            // مربع با گوشه گرد تا با دکمه گرد ارسال چت اشتباه نشود (قاعده چت border-radius: 50% دارد)
            style={{ borderRadius: 10 }}
            onClick={onRun}
            disabled={isRunning || readOnly || runBlocked.length > 0}
            aria-label={isRunning ? t('running') : t('run_this_node')}
            title={runBlocked[0] || (isRunning ? t('running') : t('run_this_node'))}
        >
            <LuPlay size={14} />
        </button>
    ) : null;

    const footer = (
        <div className={`${styles.runFooter} ${footerSlot ? '' : styles.runFooterInline} ${canMinimize ? styles.runFooterWithToggle : ''}`}>
            {amount != null && unitKey ? (
                <div className={styles.runCostLine}>
                    <span className={styles.runCostChip} dir="ltr">
                        {formatChatUsd(amount)}/{t(`chat_unit_${unitKey}`, { defaultValue: unitKey })}
                    </span>
                </div>
            ) : null}
            {/* پنجره تخمین هزینه داخل همین کادر می‌ماند */}
            <div className={`${chatInputStyles.composer} ${styles.nodeComposer}`} data-chat-popover-bounds>
                {canMinimize ? (
                    <button
                        type="button"
                        className={styles.composerSizeToggle}
                        onClick={() => setMinimized((value) => !value)}
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? t('node_composer_expand') : t('node_composer_minimize')}
                        title={collapsed ? t('node_composer_expand') : t('node_composer_minimize')}
                    >
                        {collapsed ? <LuChevronUp size={12} aria-hidden /> : <LuChevronDown size={12} aria-hidden />}
                    </button>
                ) : null}
                {collapsed ? (
                    // حالت کوچک: همان کارت، یک ردیف — لمس پیش‌نمایش کادر را دوباره باز می‌کند
                    <div className={chatInputStyles.inputCardWrapper}>
                        <div className={`${chatInputStyles.mainInputArea} ${styles.collapsedArea}`}>
                            <div className={`${chatInputStyles.bottomControls} ${styles.collapsedControls}`}>
                                <div className={`${chatInputStyles.leftTools} ${styles.collapsedPreviewSlot}`}>
                                    <button
                                        type="button"
                                        className={styles.collapsedPreview}
                                        onClick={() => setMinimized(false)}
                                        dir="auto"
                                        title={t('node_composer_expand')}
                                    >
                                        {promptPreview || (
                                            <span className={styles.collapsedPlaceholder}>
                                                {t(isPromptNode ? 'prompt_placeholder' : 'node_prompt_placeholder')}
                                            </span>
                                        )}
                                    </button>
                                </div>
                                {runButton ? <div className={chatInputStyles.rightTools}>{runButton}</div> : null}
                            </div>
                        </div>
                    </div>
                ) : (
                <div className={chatInputStyles.inputCardWrapper} data-mention-dock>
                    <div className={chatInputStyles.mainInputArea}>
                        <div
                            className={`${chatInputStyles.composerTextSlot} ${chatInputStyles.composerTextWithOptimize}`}
                            // بدون ردیف دکمه اجرا (نود پرامپت) فاصله زیر متن لازم نیست
                            style={onRun ? undefined : { marginBottom: 0 }}
                        >
                            {showCostButton && payload && kind ? (
                                <div className={chatInputStyles.costAnchor}>
                                    <CostEstimatePopoverButton
                                        compact
                                        takeSnapshot={() => {
                                            const metrics = (payload.runtimeMetrics || {}) as Record<string, unknown>;
                                            return {
                                                payload,
                                                modelLabel,
                                                kind,
                                                promptLength: payload.promptLength || 0,
                                                images: Number(metrics.inputImageCount) || 0,
                                                videos: Number(metrics.inputVideoCount) || 0,
                                                audios: Number(metrics.inputAudioCount) || 0,
                                            };
                                        }}
                                    />
                                </div>
                            ) : null}
                            {hasPrompt ? (
                                <>
                                    <div className={chatInputStyles.optimizeAnchor}>
                                        {/* همان گوشه دکمه optimize (در RTL سمت چپ)؛ expand در لبه بیرونی */}
                                        <div className={styles.composerTopActions}>
                                            <PromptOptimizeControl
                                                compact
                                                disabled={readOnly}
                                                promptText={String(nodeData.promptText ?? '')}
                                                mentions={nodeData.promptMentions}
                                                projectId={params?.projectId}
                                                onApply={(promptText, promptMentions) => onPatch({ promptText, promptMentions })}
                                            />
                                            <button
                                                type="button"
                                                className={styles.composerExpandBtn}
                                                onClick={() => setEditorOpen(true)}
                                                aria-label={t('edit_prompt')}
                                                title={t('edit_prompt')}
                                            >
                                                <LuMaximize2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    {isPromptNode ? (
                                        // نود پرامپت: همان منشن گالری پروژه که روی خود نود است
                                        <MediaMentionComposer
                                            className={chatInputStyles.composerTextarea}
                                            value={String(nodeData.promptText ?? '')}
                                            mentions={nodeData.promptMentions}
                                            projectId={params?.projectId}
                                            dir="auto"
                                            pickerPlacement="above"
                                            onChange={(promptText, promptMentions) => onPatch({ promptText, promptMentions })}
                                            disabled={readOnly}
                                            minRows={1}
                                            placeholder={t('prompt_placeholder')}
                                        />
                                    ) : (
                                        <MediaMentionComposer
                                            className={chatInputStyles.composerTextarea}
                                            value={String(nodeData.promptText ?? '')}
                                            mentions={nodeData.promptMentions}
                                            projectId={params?.projectId}
                                            dir="auto"
                                            mentionSource="attachments"
                                            attachmentsMentions={imageInputMentions}
                                            attachmentsLabels={connectedImageLabels}
                                            pickerPlacement="above"
                                            onChange={(promptText, promptMentions) => onPatch({ promptText, promptMentions })}
                                            disabled={readOnly}
                                            minRows={1}
                                            placeholder={t('node_prompt_placeholder')}
                                        />
                                    )}
                                </>
                            ) : (
                                <p className={styles.runOnlyLabel}>{t('run_this_node')}</p>
                            )}
                        </div>
                        {runButton ? (
                            <div className={chatInputStyles.bottomControls}>
                                <div className={chatInputStyles.leftTools} />
                                <div className={chatInputStyles.rightTools}>{runButton}</div>
                            </div>
                        ) : null}
                    </div>
                </div>
                )}
            </div>
            {hasPrompt ? (
                <PromptEditDialog
                    open={editorOpen}
                    readOnly={readOnly}
                    projectId={params?.projectId}
                    title={String(nodeData.label || '') || t(isPromptNode ? 'prompt_scenario' : 'node_prompt')}
                    promptText={String(nodeData.promptText ?? '')}
                    promptMentions={nodeData.promptMentions}
                    // همان منبع منشن کادر کوچک: نود پردازشی = تصاویر وصل‌شده، نود پرامپت = گالری
                    {...(isPromptNode ? {} : {
                        mentionSource: 'attachments' as const,
                        attachmentsMentions: imageInputMentions,
                        attachmentsLabels: connectedImageLabels,
                        placeholder: t('node_prompt_placeholder'),
                    })}
                    onClose={() => setEditorOpen(false)}
                    onSave={(next) => {
                        onPatch(next);
                        setEditorOpen(false);
                    }}
                />
            ) : null}
        </div>
    );

    // پایین سایدبار، بیرون از ناحیه اسکرول؛ میزبانی که جا نداده (ویرایشگر ویدیو) → داخل پنل
    return footerSlot ? createPortal(footer, footerSlot) : footer;
}

export function NodeSettingsPanel({
    selectedNode,
    catalogEntry,
    nodes,
    edges,
    onUpdateNode,
    onUpdateEdge = () => undefined,
    footerSlot,
}: NodeSettingsPanelProps) {
    const { t, tc, lang } = useProjectsI18n();
    const { requestRunNode, runningNodeIds, readOnly } = useMediaStudio();
    const nodeData = (selectedNode?.data ?? {}) as StudioNodeData;
    const isRunning = selectedNode ? runningNodeIds.has(selectedNode.id) : false;
    // پیام‌های مسدودکننده اجرا از تولبار مدل (مثل فیلد ترکیبی بدون مقدار) — همان گیت ارسال چت
    const [runBlockers, setRunBlockers] = useState<string[]>([]);
    const assetUploadSession = useAssetUploadSession(
        selectedNode?.type === 'assetRef' ? selectedNode.id : undefined,
    );
    const assetUploading = Boolean(assetUploadSession?.uploading);
    const connectedVideoEstimate = useConnectedVideoEstimate(selectedNode?.id, nodes, edges, onUpdateNode);
    const connectedInputMetrics = useMemo(
        () => selectedNode
            ? collectConnectedInputMetrics(selectedNode.id, nodes, edges)
            : EMPTY_RUNTIME_METRICS,
        [selectedNode, nodes, edges],
    );
    const promptLength = useMemo(() => {
        const localLength = String(nodeData.promptText || '').trim().length;
        if (!selectedNode) return localLength || undefined;
        const connectedLength = edges
            .filter((edge) =>
                edge.target === selectedNode.id
                && ['prompt-in', 'prompt', 'text-in'].includes(
                    String(edge.targetHandle || '').trim().toLowerCase(),
                ),
            )
            .reduce((total, edge) => {
                const source = nodes.find((node) => node.id === edge.source);
                return total + (source?.type === 'prompt'
                    ? String((source.data as StudioNodeData)?.promptText || '').trim().length
                    : 0);
            }, 0);
        return localLength + connectedLength || undefined;
    }, [selectedNode, nodeData.promptText, nodes, edges]);
    const runtimeMetrics = useMemo(() => ({
        ...connectedInputMetrics,
        hasVideoInput: connectedVideoEstimate.hasVideoInput,
        inputVideoDurationSeconds: Math.max(
            connectedInputMetrics.inputVideoDurationSeconds,
            connectedVideoEstimate.inputVideoDurationSeconds,
        ),
    }), [connectedInputMetrics, connectedVideoEstimate]);

    const handleChange = useCallback((key: string, val: unknown) => {
        if (!selectedNode) return;
        onUpdateNode(selectedNode.id, { [key]: val });
    }, [selectedNode, onUpdateNode]);

    const handlePatch = useCallback((patch: Partial<StudioNodeData>) => {
        if (!selectedNode) return;
        onUpdateNode(selectedNode.id, patch);
    }, [selectedNode, onUpdateNode]);

    useEffect(() => {
        if (!selectedNode) return;
        const data = selectedNode.data as StudioNodeData;
        const modelId = String(data.modelId || '');
        if (!modelId || data.modelName || data.model) return;

        providersApi.listModels({
            class: catalogEntry?.providerClass,
            providerId: data.providerId ? String(data.providerId) : undefined,
        }).then((res) => {
            const match = res.models?.find((model) => model._id === modelId);
            if (!match) return;
            onUpdateNode(selectedNode.id, {
                model: match.name,
                modelName: match.displayName || match.name,
            });
        }).catch(() => undefined);
    }, [selectedNode, catalogEntry?.providerClass, onUpdateNode]);

    if (!selectedNode) {
        return <div className={styles.emptyState}>{t('select_node_settings')}</div>;
    }

    const isImageMatrix = selectedNode.type === 'imageGen';
    const isImageTransformer = selectedNode.type === 'inpainting';
    const isAudioGeneration = selectedNode.type === 'musicSfx';
    const isGenerationPromptNode = GENERATION_PROMPT_NODE_TYPES.includes(String(selectedNode.type || ''));
    const isPromptNode = selectedNode.type === 'prompt';
    const fields = (catalogEntry?.settingsFields ?? []).filter((field) => {
        if (selectedNode.type === 'assetRef' && (field.key === 'assetUrl' || field.key === 'externalUrl')) return false;
        if (selectedNode.type === 'textToImage' && ['aspectRatio', 'imageSize', 'quality', 'resolution'].includes(field.key)) return false;
        if (isImageMatrix && (field.key === 'batchCount' || field.key === 'promptText')) return false;
        // پرامپت نودهای تولیدی فقط در بخش اختصاصی پایین رندر می‌شود
        if (isGenerationPromptNode && field.key === 'promptText') return false;
        // نود پرامپت: پرامپت در کادر پایین و یادداشت تیم در فیلد اختصاصی خودش
        if (isPromptNode && (field.key === 'promptText' || field.key === 'description')) return false;
        // انتخاب مدل نودهای تولیدی با تولبار چت (NodeModelToolbar) انجام می‌شود
        if (isGenerationPromptNode && (field.type === 'model-select' || field.type === 'provider-select')) return false;
        if (isAudioGeneration && field.key === 'audioMode') return false;
        if (isAudioGeneration && field.key === 'voiceId' && nodeData.modelId) return false;
        return true;
    });
    // Only the final output node ("render") can be executed directly — running it
    // triggers the full upstream chain required to produce its output.
    const canRun = ['render', 'textToImage', 'textToVideo', 'musicSfx', 'aiAvatar'].includes(String(selectedNode.type || ''));
    const isBillableNode = BILLABLE_NODE_TYPES.has(String(selectedNode.type || ''));
    const costModelId = String(nodeData.modelId || '').trim();
    const costModelType = String(
        nodeData.modelModeId
        || nodeData.modelMode
        || (nodeData.modelSettings as Record<string, unknown> | undefined)?.modelModeId
        || (nodeData.modelSettings as Record<string, unknown> | undefined)?.modelMode
        || '',
    );
    // «زاویه و نور»: تعداد = نماها (هر نما یک درخواست ویرایش)
    const costPayload: CostEstimatePayload | null = isBillableNode && costModelId ? applyAngleEstimate({
        modelId: costModelId,
        nodeType: String(selectedNode.type || ''),
        modelSettings: {
            ...((nodeData.modelSettings || {}) as Record<string, unknown>),
            ...(costModelType ? { modelModeId: costModelType, modelMode: costModelType } : {}),
            hasVideoInput: connectedVideoEstimate.hasVideoInput,
            inputVideoDurationSeconds: connectedVideoEstimate.inputVideoDurationSeconds,
        },
        promptLength,
        runtimeMetrics,
    }, selectedNode.type === 'textToImage' ? nodeData.angleStudio : undefined) : null;

    return (
        // پنجره تنظیمات مدل/انتخاب مدل داخل عرض همین پنل می‌ماند (data-chat-popover-bounds)
        <div className={styles.settingsPanel} data-chat-popover-bounds>
            <div>
                <h3 className={styles.panelTitle}>
                    {catalogLabel(catalogEntry, lang) || (isImageTransformer ? t('image_transformer') : nodeData.label) || selectedNode.type}
                </h3>
                <p className={styles.panelMeta}>
                    {catalogDescription(catalogEntry, lang)
                        || (isImageTransformer ? t('image_transformer_desc') : undefined)}
                </p>
            </div>

            {['textToVideo', 'textToImage', 'aiAvatar', 'musicSfx', 'render'].includes(String(selectedNode.type || '')) && (
                <ConnectedInputsPreview
                    nodeId={selectedNode.id}
                    nodes={nodes}
                    edges={edges}
                    onUpdateEdge={onUpdateEdge}
                />
            )}

            {isAudioGeneration && (
                <AudioCategoryField
                    nodeData={nodeData}
                    onPatch={handlePatch}
                />
            )}

            {isGenerationPromptNode && (
                <NodeModelToolbar
                    key={selectedNode.id}
                    nodeType={String(selectedNode.type || '')}
                    nodeData={nodeData}
                    onPatch={handlePatch}
                    onBlockersChange={setRunBlockers}
                />
            )}

            {selectedNode.type === 'textToImage' && (
                <AngleStudioNodeSettings
                    key={`angle-${selectedNode.id}`}
                    nodeId={selectedNode.id}
                    nodeData={nodeData}
                    readOnly={readOnly}
                    onPatch={handlePatch}
                />
            )}

            {fields.map((field) => (
                <SettingField
                    key={field.key}
                    field={field}
                    value={nodeData[field.key]}
                    nodeData={nodeData}
                    onChange={handleChange}
                    onPatch={handlePatch}
                />
            ))}

            {isPromptNode && (
                <PromptAssetControls
                    promptText={String(nodeData.promptText || '')}
                    onInsert={(text) => handleChange('promptText', text)}
                />
            )}

            {/* یادداشت برای تیم — فقط اینجا ویرایش می‌شود؛ روی نود فقط متنش (اگر باشد) نمایش داده می‌شود */}
            {isPromptNode && (
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor={`node-team-note-${selectedNode.id}`}>
                        {t('node_team_note')}
                    </label>
                    <textarea
                        id={`node-team-note-${selectedNode.id}`}
                        className={styles.fieldTextarea}
                        value={String(nodeData.description ?? '')}
                        onChange={(event) => handleChange('description', event.target.value)}
                        readOnly={readOnly}
                        rows={3}
                        placeholder={t('notes_placeholder')}
                    />
                </div>
            )}

            {isImageMatrix && (
                <ImageMatrixSettings
                    nodeId={selectedNode.id}
                    nodeData={nodeData}
                    nodes={nodes}
                    edges={edges}
                    onPatch={handlePatch}
                />
            )}

            {isImageTransformer && (
                <ImageTransformerSettings
                    nodeId={selectedNode.id}
                    nodes={nodes}
                    edges={edges}
                />
            )}

            {selectedNode.type === 'assetRef' && (
                <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>{t('upload_or_url')}</span>
                    <AssetRefUpload
                        nodeId={selectedNode.id}
                        assetType={String(nodeData.assetType || 'image')}
                        fileId={String(nodeData.fileId ?? '')}
                        fileKey={String(nodeData.fileKey ?? '')}
                        externalUrl={String(nodeData.externalUrl ?? '')}
                        assetUrl={String(nodeData.assetUrl ?? '')}
                        fileName={String(nodeData.fileName ?? '')}
                        mediaMetadata={nodeData.mediaMetadata}
                        mediaThumbs={nodeData.mediaThumbs}
                        assets={nodeData.assets}
                        onChange={(patch) => {
                            Object.entries(patch).forEach(([key, val]) => handleChange(key, val));
                            if (nodeData.assetUrl) handleChange('assetUrl', undefined);
                        }}
                    />
                </div>
            )}

            {selectedNode.type === 'note' && (
                <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>{t('note_color')}</span>
                    <div className={styles.colorSwatches}>
                        {NOTE_COLOR_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                className={`${styles.colorSwatch} ${styles.themeAwareSwatch} ${nodeData.noteColor === preset.id ? styles.colorSwatchActive : ''}`}
                                style={{
                                    '--swatch-light-bg': preset.lightBg,
                                    '--swatch-dark-bg': preset.darkBg,
                                    '--swatch-light-border': preset.lightBorder,
                                    '--swatch-dark-border': preset.darkBorder,
                                } as CSSProperties}
                                title={tc(`color_${preset.id}`)}
                                onClick={() => handleChange('noteColor', preset.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {selectedNode.type === 'customGroup' && (
                <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>{t('group_color')}</span>
                    <div className={styles.colorSwatches}>
                        {GROUP_COLOR_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                className={`${styles.colorSwatch} ${styles.themeAwareSwatch} ${nodeData.groupColor === preset.id ? styles.colorSwatchActive : ''}`}
                                style={{
                                    '--swatch-light-bg': preset.lightBg,
                                    '--swatch-dark-bg': preset.darkBg,
                                    '--swatch-light-border': preset.lightBorder,
                                    '--swatch-dark-border': preset.darkBorder,
                                } as CSSProperties}
                                title={tc(`color_${preset.id}`)}
                                onClick={() => handleChange('groupColor', preset.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {(() => {
                const media = resolveNodeMediaForAsset(String(selectedNode.type || ''), nodeData);
                if (!media) return null;
                return (
                    <SaveAsAssetButton
                        type={media.type}
                        payload={{
                            url: media.url,
                            ...(media.fileKey ? { fileKey: media.fileKey } : {}),
                            ...(media.fileName ? { fileName: media.fileName } : {}),
                        }}
                    />
                );
            })()}

            {(canRun || isGenerationPromptNode) && (
                <NodePromptComposer
                    nodeId={selectedNode.id}
                    nodeData={nodeData}
                    hasPrompt={isGenerationPromptNode}
                    onPatch={handlePatch}
                    payload={costPayload}
                    modelLabel={String(nodeData.modelName || nodeData.model || costModelId)}
                    isRunning={isRunning}
                    runBlocked={isGenerationPromptNode ? runBlockers : []}
                    onRun={() => requestRunNode(
                        selectedNode.id,
                        String((selectedNode.data as StudioNodeData)?.label || selectedNode.type || ''),
                    )}
                    footerSlot={footerSlot}
                />
            )}

            {isPromptNode && (
                <NodePromptComposer
                    nodeId={selectedNode.id}
                    nodeData={nodeData}
                    hasPrompt
                    isPromptNode
                    onPatch={handlePatch}
                    payload={null}
                    modelLabel=""
                    isRunning={false}
                    runBlocked={[]}
                    footerSlot={footerSlot}
                />
            )}
        </div>
    );
}
