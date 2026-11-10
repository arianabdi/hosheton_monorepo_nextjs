'use client';

import React, { useEffect, useState } from 'react';
import {
    Handle, Position, NodeProps, useReactFlow, NodeResizer,
} from '@xyflow/react';
import type { Node } from '@xyflow/react';
import {
    LuFileText, LuBrain, LuMusic, LuMaximize2, LuTrash2, LuPlay,
    LuVolume2, LuImage, LuFilm, LuSparkles, LuImages,
    LuLoader, LuLayoutGrid, LuCircleAlert, LuStickyNote, LuWand,
    LuCheck, LuPlus, LuX, LuRefreshCw, LuChevronLeft, LuChevronRight,
    LuUserCheck, LuUserRound, LuCopyPlus,
} from 'react-icons/lu';
import {useTranslation} from 'react-i18next';
import type { StudioNodeData } from '../../types/studio';
import { useMediaStudio } from '../../../context/MediaStudioContext';
import { getNoteColorPreset } from '../../../lib/note-colors';
import { getGroupColorPreset } from '../../../lib/group-colors';
import { AssetRefUpload, type AssetRefChange } from '../AssetRefUpload';
import { MiniAudioPlayer } from '../MiniAudioPlayer';
import { getAudioCategoryLabelKey } from '../../../lib/audio-categories';
import { ErrorHoverPopup } from './ErrorHoverPopup';
import { HoshetonError } from '@/app/lib/errors';
import { ModelHeaderTitle } from './ModelHeaderTitle';
import { CostHoverBadge } from './CostHoverBadge';
import { ClickableImagePreview } from './ClickableImagePreview';
import { sanitizeLegacyStorageUrl } from '../../lib/file-url';
import LightweightMediaPreview from '../LightweightMediaPreview/LightweightMediaPreview';
import {
    resolveLightweightMedia,
    type MediaThumbMeta,
} from '../../../lib/lightweight-media';
import { getPreferredTargetHandle } from '../../../lib/studio-connections';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from './nodes.module.scss';
import { MediaMentionComposer } from '../../../components/MediaMentionComposer';
import PromptOptimizeControl from '../../../components/PromptOptimizeControl';
import { PromptEditDialog } from './PromptEditDialog';
import { useConnectedImageMentions } from './useConnectedImageMentions';
import { AngleStudioGlyph } from '../../../components/AngleStudio/AngleStudioGlyph';
import { angleShotCount, isAngleStudioOn, readAngleStudioState } from '../../../lib/angle-studio';
import { useParams } from 'next/navigation';

function useProjectsI18n() {
    const {t} = useTranslation('projects');
    const {t: tc} = useTranslation('common');
    const lang = useAppStore((s) => s.lang);
    return {t, tc, lang};
}

function collectMediaUrls(primary?: string, list?: string[]): string[] {
    const raw = (list?.length ? list : primary ? [primary] : [])
        .map((u) => sanitizeLegacyStorageUrl(String(u)))
        .filter(Boolean);
    return [...new Set(raw)];
}

function GenerationLoadingState({
    progress,
    connectionLost,
}: {
    progress?: number;
    connectionLost?: boolean;
}) {
    const clamped = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : undefined;
    const {t, lang} = useProjectsI18n();

    return (
        <div className={styles.generationLoading}>
            <div className={styles.renderProgressHeader}>
                <LuLoader className={styles.spinIcon} />
                <span>{t('generating')}</span>
            </div>
            <div className={styles.renderProgressBarTrack}>
                <div
                    className={styles.renderProgressBarFill}
                    style={{ width: `${clamped ?? 8}%` }}
                />
            </div>
            {typeof clamped === 'number' && (
                <span className={styles.renderProgressPercent}>{t('percent', {value: formatAppNumber(clamped, lang)})}</span>
            )}
            {connectionLost && (
                <p className={styles.connectionLostHint}>
                    {t('connection_lost')}
                </p>
            )}
        </div>
    );
}

function MediaCarouselPreview({
    items,
    cacheKey,
    mediaType = 'image',
    emptyIcon,
    thumbs,
}: {
    items: string[];
    cacheKey?: number;
    mediaType?: 'image' | 'video';
    emptyIcon: React.ReactNode;
    thumbs?: Record<string, MediaThumbMeta>;
}) {
    const [index, setIndex] = useState(0);
    const urls = items.filter(Boolean);
    const {t, tc, lang} = useProjectsI18n();

    useEffect(() => {
        setIndex(0);
    }, [urls.join('|')]);

    useEffect(() => {
        if (index >= urls.length) setIndex(0);
    }, [index, urls.length]);

    if (!urls.length) {
        return <GenerationPreviewEmpty icon={emptyIcon} />;
    }

    const currentUrl = urls[index];
    const hasMultiple = urls.length > 1;
    const media = resolveLightweightMedia(currentUrl, thumbs, mediaType);

    const goPrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIndex((i) => (i - 1 + urls.length) % urls.length);
    };

    const goNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIndex((i) => (i + 1) % urls.length);
    };

    const body = mediaType === 'video' ? (
        <LightweightMediaPreview media={media} cacheKey={cacheKey} controls />
    ) : (
        <ClickableImagePreview
            src={currentUrl}
            alt={t('preview_n', {index: formatAppNumber(index + 1, lang)})}
            thumbs={thumbs}
            cacheKey={cacheKey}
        />
    );

    if (!hasMultiple) {
        return body;
    }

    const rtl = lang === 'fa' || lang === 'ar';
    const PrevIcon = rtl ? LuChevronRight : LuChevronLeft;
    const NextIcon = rtl ? LuChevronLeft : LuChevronRight;

    return (
        <div className={styles.mediaCarousel}>
            <button type="button" className={styles.carouselNav} onClick={goPrev} title={tc('previous')}>
                <PrevIcon />
            </button>
            <div className={styles.carouselBody}>
                {body}
                <span className={styles.carouselCounter}>{t('carousel_counter', {current: formatAppNumber(index + 1, lang), total: formatAppNumber(urls.length, lang)})}</span>
            </div>
            <button type="button" className={styles.carouselNav} onClick={goNext} title={tc('next')}>
                <NextIcon />
            </button>
        </div>
    );
}

function RefreshMediaButton({ id }: { id: string }) {
    const { readOnly, refreshNodeMedia } = useMediaStudio();
    const {t} = useProjectsI18n();
    const [loading, setLoading] = useState(false);

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (readOnly || loading) return;
        setLoading(true);
        try {
            await refreshNodeMedia(id);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            className={styles.refreshNodeBtn}
            onClick={handleRefresh}
            disabled={readOnly || loading}
            title={t('reload_preview')}
        >
            {loading ? <LuLoader className={styles.spinIcon} /> : <LuRefreshCw />}
        </button>
    );
}

function HandleWithLabel({
    type,
    position,
    id,
    top = '50%',
    label,
}: {
    type: 'source' | 'target';
    position: Position;
    id?: string;
    top?: string;
    label: string;
}) {
    const isLeft = position === Position.Left;
    return (
        <>
            <Handle type={type} position={position} id={id} style={{ top }} />
            <span
                className={`${styles.handleLabel} ${isLeft ? styles.handleLabelLeft : styles.handleLabelRight}`}
                style={{ top }}
            >
                {label}
            </span>
        </>
    );
}

function DuplicateNodeButton({ id, label, className }: { id: string; label?: string; className?: string }) {
    const { readOnly, requestCloneNode } = useMediaStudio();
    const {t} = useProjectsI18n();
    const handleDuplicate = (e: React.MouseEvent) => {
        if (readOnly) return;
        e.stopPropagation();
        requestCloneNode(id, label);
    };
    return (
        <button
            type="button"
            className={`${styles.duplicateNodeBtn} ${className ?? ''}`.trim()}
            onClick={handleDuplicate}
            disabled={readOnly}
            title={readOnly ? t('duplicate_view_disabled') : t('duplicate_node')}
        >
            <LuCopyPlus />
        </button>
    );
}

function DeleteNodeButton({ id, className }: { id: string; className?: string }) {
    const { readOnly } = useMediaStudio();
    const {t} = useProjectsI18n();
    const { setNodes, setEdges } = useReactFlow();
    const handleDelete = (e: React.MouseEvent) => {
        if (readOnly) return;
        e.stopPropagation();
        setNodes((nds) => nds.filter((node) => node.id !== id));
        setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    };
    return (
        <button
            type="button"
            className={`${styles.deleteNodeBtn} ${className ?? ''}`.trim()}
            onClick={handleDelete}
            disabled={readOnly}
            title={readOnly ? t('delete_view_disabled') : t('delete_node')}
        >
            <LuTrash2 />
        </button>
    );
}

function GroupDeleteButton({ id, label, className }: { id: string; label?: string; className?: string }) {
    const { readOnly, requestGroupDelete } = useMediaStudio();
    const {t} = useProjectsI18n();
    const handleDelete = (e: React.MouseEvent) => {
        if (readOnly) return;
        e.stopPropagation();
        requestGroupDelete(id, label);
    };
    return (
        <button
            type="button"
            className={`${styles.deleteNodeBtn} ${className ?? ''}`.trim()}
            onClick={handleDelete}
            disabled={readOnly}
            title={readOnly ? t('delete_view_disabled') : t('delete_group')}
        >
            <LuTrash2 />
        </button>
    );
}

function PlayNodeButton({
    id,
    label,
    nodeStatus,
    executable = true,
}: {
    id: string;
    label?: string;
    nodeStatus?: StudioNodeData['status'];
    executable?: boolean;
}) {
    const { readOnly, requestRunNode, runningNodeIds } = useMediaStudio();
    const {t} = useProjectsI18n();
    const isBlocked = runningNodeIds.has(id) && nodeStatus !== 'error' && nodeStatus !== 'success';

    if (!executable) return null;

    const handlePlay = (e: React.MouseEvent) => {
        if (readOnly) return;
        e.stopPropagation();
        requestRunNode(id, label);
    };

    return (
        <button
            type="button"
            className={styles.playNodeBtn}
            onClick={handlePlay}
            disabled={readOnly || isBlocked}
            title={readOnly ? t('run_view_disabled') : t('run_node')}
        >
            {isBlocked ? <LuLoader className={styles.spinIcon} /> : <LuPlay />}
        </button>
    );
}

function NodeShell({
    id,
    data,
    icon,
    title,
    className,
    children,
    sourceHandles,
    targetHandles,
    executable = true,
    showTarget = true,
    showSource = true,
    targetLabel,
    sourceLabel,
    successBadge = false,
    refreshMedia = false,
    modelHeader,
}: {
    id: string;
    data: StudioNodeData;
    icon: React.ReactNode;
    title: string;
    className?: string;
    children: React.ReactNode;
    sourceHandles?: React.ReactNode;
    targetHandles?: React.ReactNode;
    executable?: boolean;
    showTarget?: boolean;
    showSource?: boolean;
    targetLabel?: string;
    sourceLabel?: string;
    /** Shows a green checkmark badge instead of nothing when the node succeeded (used by the final output node) */
    successBadge?: boolean;
    /** Show button to reload preview media from server */
    refreshMedia?: boolean;
    /** Generation nodes: header shows the selected model's icon + name instead of the node's own */
    modelHeader?: 'image' | 'video' | 'audio' | 'text' | '3d';
}) {
    const { readOnly, selectedNodeId, openLogsForNode, edgeConnectedNodeIds } = useMediaStudio();
    const {t} = useProjectsI18n();
    const isSelected = selectedNodeId === id;
    const isEdgeConnected = edgeConnectedNodeIds.has(id);
    const [errorHovered, setErrorHovered] = useState(false);

    const defaultTarget = targetLabel
        ? <HandleWithLabel type="target" position={Position.Left} label={targetLabel} />
        : <Handle type="target" position={Position.Left} />;
    const defaultSource = sourceLabel
        ? <HandleWithLabel type="source" position={Position.Right} label={sourceLabel} />
        : <Handle type="source" position={Position.Right} />;

    return (
        <div className={`${styles.baseNode} ${className ?? ''} ${readOnly ? styles.readOnlyNode : ''} ${isSelected || data.isActive ? styles.activeNode : ''} ${isEdgeConnected ? styles.edgeConnectedNode : ''} ${data.runError ? styles.errorNode : ''}`}>
            {data.runError ? (
                <div
                    className={styles.nodeErrorBadge}
                    onClick={readOnly ? undefined : (e) => { e.stopPropagation(); openLogsForNode(id); }}
                    onMouseEnter={() => setErrorHovered(true)}
                    onMouseLeave={() => setErrorHovered(false)}
                    style={readOnly ? { cursor: 'default' } : undefined}
                >
                    <LuCircleAlert />
                    {errorHovered && (
                        <ErrorHoverPopup message={String(data.runError)} stage={data.runErrorStage} />
                    )}
                </div>
            ) : successBadge && data.status === 'success' ? (
                <div className={styles.nodeSuccessBadge} title={t('generated_ok')}>
                    <LuCheck />
                </div>
            ) : null}
            {showTarget && (targetHandles ?? defaultTarget)}
            <div className={styles.nodeHeader}>
                <div className={styles.headerTitle}>
                    {modelHeader ? (
                        <ModelHeaderTitle
                            nodeData={data}
                            providerClass={modelHeader}
                            fallbackIcon={icon}
                            fallbackTitle={title}
                        />
                    ) : (
                        <>{icon} <span>{title}</span></>
                    )}
                </div>
                <div className={styles.headerActions}>
                    {refreshMedia && <RefreshMediaButton id={id} />}
                    <PlayNodeButton id={id} label={title} nodeStatus={data.status} executable={executable} />
                    <DuplicateNodeButton id={id} label={title} />
                    <DeleteNodeButton id={id} />
                </div>
            </div>
            <div className={styles.nodeBody}>{children}</div>
            {(typeof data.totalCost === 'number' && data.totalCost > 0)
                || (typeof data.cost?.amount === 'number' && data.cost.amount > 0)
                || (Array.isArray(data.costHistory) && data.costHistory.length > 0)
                ? (
                    <div className={styles.nodeCostFooter}>
                        <CostHoverBadge
                            totalCost={typeof data.totalCost === 'number' ? data.totalCost : undefined}
                            currentCost={typeof data.cost?.amount === 'number' ? data.cost.amount : undefined}
                            costHistory={data.costHistory as StudioNodeData['costHistory']}
                            currency={data.cost?.currency}
                        />
                    </div>
                )
                : null}
            {showSource && (sourceHandles ?? defaultSource)}
        </div>
    );
}

// ── Trigger ────────────────────────────────────────────────────────────────

export function StartTriggerNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<LuPlay />}
            title={nodeData.label || t('start')}
            className={styles.startTriggerNode}
            showTarget={false}
            executable={false}
        >
            <span className={styles.triggerHint}>{t('trigger_hint')}</span>
        </NodeShell>
    );
}

// ── Annotation ─────────────────────────────────────────────────────────────

export function NoteNode({ id, data, selected }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const { readOnly, edgeConnectedNodeIds } = useMediaStudio();
    const { setNodes } = useReactFlow();
    const preset = getNoteColorPreset(String(nodeData.noteColor ?? 'yellow'));

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (readOnly) return;
        setNodes((nds) => nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, noteText: e.target.value } } : n,
        ));
    };

    return (
        <>
            <NodeResizer
                minWidth={180}
                minHeight={120}
                isVisible={!!selected}
                lineClassName={styles.groupResizerLine}
                handleClassName={styles.groupResizerHandle}
            />
            <div
                className={`${styles.noteNode} ${readOnly ? styles.readOnlyNode : ''} ${selected ? styles.noteSelected : ''} ${edgeConnectedNodeIds.has(id) ? styles.edgeConnectedNode : ''}`}
                style={{
                    '--note-light-bg': preset.lightBg,
                    '--note-dark-bg': preset.darkBg,
                    '--note-light-border': preset.lightBorder,
                    '--note-dark-border': preset.darkBorder,
                    '--note-light-text': preset.lightText,
                    '--note-dark-text': preset.darkText,
                } as React.CSSProperties}
            >
                <div className={styles.noteActionBtns}>
                    <DuplicateNodeButton id={id} label={nodeData.label || t('note')} className={styles.noteDeleteBtn} />
                    <DeleteNodeButton id={id} className={styles.noteDeleteBtn} />
                </div>
                <textarea
                    className={`${styles.noteTextarea} nodrag nowheel nopan`}
                    value={String(nodeData.noteText ?? '')}
                    onChange={handleTextChange}
                    readOnly={readOnly}
                    placeholder={nodeData.label ? String(nodeData.label) : t('note_placeholder')}
                    onPointerDown={(e) => e.stopPropagation()}
                />
            </div>
        </>
    );
}

// ── Input ──────────────────────────────────────────────────────────────────

export function AssetRefNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const { readOnly } = useMediaStudio();
    const { setNodes } = useReactFlow();
    const assetType = String(nodeData.assetType || 'image');
    // آیکون هدر از خود فایل‌ها (نودهای قدیمی ممکن است assetType همگام نداشته باشند)
    const headerKind = String(nodeData.assets?.[0]?.type || assetType);

    const icon = headerKind === 'video'
        ? <LuFilm />
        : headerKind === 'audio'
            ? <LuVolume2 />
            : <LuImage />;

    const handleAssetChange = (patch: AssetRefChange) => {
        if (readOnly) return;
        setNodes((nds) => nds.map((n) =>
            n.id === id ? {
                ...n,
                data: {
                    ...n.data,
                    ...patch,
                    assetUrl: undefined,
                },
            } : n,
        ));
    };

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={icon}
            title={nodeData.label || t('asset_ref')}
            className={styles.assetRefNode}
            showTarget={false}
            sourceLabel={t('reference')}
            executable={false}
        >
            <AssetRefUpload
                nodeId={id}
                assetType={assetType}
                fileId={String(nodeData.fileId ?? '')}
                fileKey={String(nodeData.fileKey ?? '')}
                externalUrl={String(nodeData.externalUrl ?? '')}
                assetUrl={String(nodeData.assetUrl ?? '')}
                fileName={String(nodeData.fileName ?? '')}
                mediaMetadata={nodeData.mediaMetadata}
                mediaThumbs={nodeData.mediaThumbs}
                assets={nodeData.assets}
                compact
                readOnly={readOnly}
                onChange={handleAssetChange}
            />
        </NodeShell>
    );
}

export function AvatarRefNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const preview = String(nodeData.previewImageUrl || '');
    const characterName = String(nodeData.avatarName || '').trim();

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<LuUserCheck />}
            title={nodeData.label || t('verified_avatar')}
            className={styles.assetRefNode}
            showTarget={false}
            sourceLabel={t('avatar')}
            executable={false}
        >
            <div className={styles.batchMeta}>
                {characterName
                    ? characterName
                    : nodeData.avatarId
                        ? t('avatar_selected')
                        : t('select_person')}
            </div>
            {preview ? (
                <LightweightMediaPreview
                    media={resolveLightweightMedia(preview, nodeData.mediaThumbs, 'image')}
                    alt={characterName || t('character_preview')}
                />
            ) : (
                <GenerationPreviewEmpty icon={<LuUserCheck />} />
            )}
        </NodeShell>
    );
}

export function PromptNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const params = useParams<{ projectId?: string }>();
    const { readOnly } = useMediaStudio();
    const { setNodes } = useReactFlow();
    const [editorOpen, setEditorOpen] = useState(false);
    const teamNote = String(nodeData.description ?? '').trim();

    const patchData = (patch: Partial<StudioNodeData>) => {
        if (readOnly) return;
        setNodes((nds) => nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
        ));
    };

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<LuFileText />}
            title={nodeData.label || t('prompt_scenario')}
            className={styles.promptNode}
            targetHandles={
                <HandleWithLabel
                    type="target"
                    position={Position.Left}
                    id="prompt-in"
                    top="50%"
                    label={t('base_prompt')}
                />
            }
            sourceLabel={t('prompt')}
            executable={false}
        >
            <div className={`${styles.promptEditorWrap} nowheel nodrag nopan`} data-lock-canvas-zoom="true">
                {/* مثل کادر پرامپت سایدبار: optimize و expand با هم روی گوشه بالای خود باکس
                    (در RTL سمت چپ، expand در لبه بیرونی) — بدون ردیف جدا بالای متن */}
                <div className={styles.promptBox}>
                    <MediaMentionComposer
                        className={`${styles.promptTextarea} nodrag nowheel nopan`}
                        value={String(nodeData.promptText ?? '')}
                        mentions={nodeData.promptMentions}
                        projectId={params?.projectId}
                        onChange={(promptText, promptMentions) => patchData({ promptText, promptMentions })}
                        disabled={readOnly}
                        minRows={3}
                        maxHeight={160}
                        placeholder={t('prompt_placeholder')}
                    />
                    <div className={`${styles.promptBoxActions} nodrag nowheel nopan`}>
                        <PromptOptimizeControl
                            compact
                            disabled={readOnly}
                            promptText={String(nodeData.promptText ?? '')}
                            mentions={nodeData.promptMentions}
                            projectId={params?.projectId}
                            onApply={(promptText, promptMentions) => patchData({ promptText, promptMentions })}
                        />
                        <button
                            type="button"
                            className={`${styles.promptExpandBtn} nodrag nowheel nopan`}
                            onClick={(event) => {
                                event.stopPropagation();
                                setEditorOpen(true);
                            }}
                            aria-label={t('edit_prompt')}
                            title={t('edit_prompt')}
                        >
                            <LuMaximize2 size={13} />
                        </button>
                    </div>
                </div>
            </div>
            {/* یادداشت برای تیم فقط در سایدبار ویرایش می‌شود؛ اینجا فقط متنش، و اگر خالی است هیچ */}
            {teamNote ? <p className={styles.promptDescriptionText}>{teamNote}</p> : null}
            <PromptEditDialog
                open={editorOpen}
                readOnly={readOnly}
                projectId={params?.projectId}
                title={nodeData.label || t('prompt_scenario')}
                promptText={String(nodeData.promptText ?? '')}
                promptMentions={nodeData.promptMentions}
                onClose={() => setEditorOpen(false)}
                onSave={(next) => {
                    patchData(next);
                    setEditorOpen(false);
                }}
            />
        </NodeShell>
    );
}

// ── AI Generation Nodes ────────────────────────────────────────────────────

function ImageOutputGrid({
    images,
    slots = 3,
    thumbs,
}: {
    images?: (string | null)[];
    slots?: number;
    thumbs?: Record<string, MediaThumbMeta>;
}) {
    const items = images?.length ? images : Array.from({ length: slots }, () => null);
    const {t, lang} = useProjectsI18n();
    return (
        <div className={styles.imageGrid}>
            {items.slice(0, slots).map((src, i) => (
                <div key={i} className={styles.imagePlaceholder}>
                    {src ? (
                        <LightweightMediaPreview
                            media={resolveLightweightMedia(src, thumbs, 'image')}
                            alt={t('output_n', {index: formatAppNumber(i + 1, lang)})}
                        />
                    ) : <LuSparkles />}
                </div>
            ))}
        </div>
    );
}

function GenerationPreviewEmpty({ icon }: { icon: React.ReactNode }) {
    return (
        <div className={styles.generationPreviewEmpty}>
            {icon}
        </div>
    );
}

function AudioPreview({ audioUrl }: { audioUrl?: string }) {
    const {t} = useProjectsI18n();
    if (audioUrl) {
        return <MiniAudioPlayer src={audioUrl} title={t('audio_output')} compact />;
    }
    return (
        <div className={styles.audioPreviewEmpty}>
            <LuMusic />
            <div className={styles.waveBar} /><div className={styles.waveBar} /><div className={styles.waveBar} />
        </div>
    );
}

/** نود تولید عکس؛ با «زاویه و نور» روشن، نمای چندنمایی خودش را دارد */
export function TextToImageNode(props: NodeProps) {
    const nodeData = props.data as StudioNodeData;
    return isAngleStudioOn(nodeData.angleStudio)
        ? <AngleStudioNode {...props} />
        : <PlainTextToImageNode {...props} />;
}

/**
 * «زاویه و نور» روی بوم: ورودی عکس (و توضیح اختیاری)، خروجی = همهٔ نماها در یک نود
 * (به گالری نتایج وصل شود همه را جمع می‌کند).
 */
function AngleStudioNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t, lang} = useProjectsI18n();
    const { runningNodeIds, hasConnectionIssue } = useMediaStudio();
    const isTerminal = nodeData.status === 'error' || nodeData.status === 'success';
    const isActiveRun = !isTerminal && (nodeData.status === 'running' || runningNodeIds.has(id));
    const progress = typeof nodeData.progress === 'number' ? nodeData.progress : undefined;
    const imageUrls = collectMediaUrls(nodeData.imageUrl as string | undefined, nodeData.images as string[] | undefined);
    const shotCount = angleShotCount(nodeData.angleStudio);
    const source = useConnectedImageMentions(id)[0];
    const state = readAngleStudioState(nodeData.angleStudio);
    const lightOn = Boolean(state?.light.enabled);

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<AngleStudioGlyph size={16} className={styles.sparkIcon} />}
            title={nodeData.label || t('angle_studio_title')}
            className={`${styles.textToImageNode} ${styles.angleStudioNode}`}
            refreshMedia
            targetHandles={
                <>
                    <HandleWithLabel type="target" position={Position.Left} id="ref-in" top="35%" label={t('angle_handle_image')} />
                    <HandleWithLabel type="target" position={Position.Left} id="prompt-in" top="65%" label={t('angle_handle_notes')} />
                </>
            }
            sourceLabel={t('images')}
        >
            <div className={styles.angleSummary}>
                <span>{t('angle_outputs_count', { n: formatAppNumber(shotCount, lang) })}</span>
                {state?.bestAngles ? <span className={styles.angleSummaryTag}>{t('angle_best_short')}</span> : null}
                {lightOn ? <span className={styles.angleLightSwatch} style={{ background: state?.light.color }} title={t('angle_tab_light')} /> : null}
                {nodeData.modelName ? <span className={styles.angleSummaryModel}>{String(nodeData.modelName)}</span> : null}
            </div>
            {isActiveRun ? (
                <GenerationLoadingState progress={progress} connectionLost={hasConnectionIssue} />
            ) : imageUrls.length ? (
                <ImageOutputGrid images={imageUrls} slots={imageUrls.length} thumbs={nodeData.mediaThumbs} />
            ) : (
                <div className={styles.angleEmpty}>
                    {source?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={String(source.thumbnailUrl || source.url)} alt="" draggable={false} />
                    ) : (
                        <AngleStudioGlyph size={26} />
                    )}
                    <span>{source?.url ? t('angle_node_ready') : t('angle_node_connect_image')}</span>
                </div>
            )}
        </NodeShell>
    );
}

function PlainTextToImageNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const { runningNodeIds, hasConnectionIssue } = useMediaStudio();
    const isTerminal = nodeData.status === 'error' || nodeData.status === 'success';
    const isActiveRun = !isTerminal && (nodeData.status === 'running' || runningNodeIds.has(id));
    const progress = typeof nodeData.progress === 'number' ? nodeData.progress : undefined;
    const cacheKey = typeof nodeData.previewCacheKey === 'number' ? nodeData.previewCacheKey : undefined;
    const imageUrls = collectMediaUrls(nodeData.imageUrl as string | undefined, nodeData.images as string[] | undefined);

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<LuBrain className={styles.sparkIcon} />}
            title={nodeData.label || t('generate_image')}
            className={styles.textToImageNode}
            refreshMedia
            modelHeader="image"
            targetHandles={
                <>
                    <HandleWithLabel type="target" position={Position.Left} id="prompt-in" top="35%" label={t('prompt')} />
                    <HandleWithLabel type="target" position={Position.Left} id="ref-in" top="65%" label={t('optional_ref')} />
                </>
            }
            sourceLabel={t('image')}
        >
            {isActiveRun ? (
                <GenerationLoadingState
                    progress={progress}
                    connectionLost={hasConnectionIssue}
                />
            ) : (
                <MediaCarouselPreview
                    items={imageUrls}
                    cacheKey={cacheKey}
                    mediaType="image"
                    emptyIcon={<LuSparkles />}
                    thumbs={nodeData.mediaThumbs}
                />
            )}
        </NodeShell>
    );
}

/**
 * تولید ویدیو — Video Generation node
 * Accepts: prompt (required) + a single unified reference handle (`ref-in`)
 * that carries every file type — image / video / audio refs and avatars —
 * exactly like the image node's reference input.
 */
export function TextToVideoNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const { runningNodeIds, hasConnectionIssue } = useMediaStudio();
    const isTerminal = nodeData.status === 'error' || nodeData.status === 'success';
    const isActiveRun = !isTerminal && (nodeData.status === 'running' || runningNodeIds.has(id));
    const progress = typeof nodeData.progress === 'number' ? nodeData.progress : undefined;
    const cacheKey = typeof nodeData.previewCacheKey === 'number' ? nodeData.previewCacheKey : undefined;
    const videoUrls = collectMediaUrls(
        nodeData.videoUrl as string | undefined,
        nodeData.videos as string[] | undefined,
    );

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<LuFilm />}
            title={nodeData.label || t('generate_video')}
            className={styles.textToVideoNode}
            refreshMedia
            modelHeader="video"
            targetHandles={
                <>
                    <HandleWithLabel type="target" position={Position.Left} id="prompt-in" top="35%" label={t('prompt')} />
                    <HandleWithLabel type="target" position={Position.Left} id="ref-in" top="65%" label={t('optional_ref')} />
                </>
            }
            sourceLabel={t('video')}
        >
            {isActiveRun ? (
                <GenerationLoadingState
                    progress={progress}
                    connectionLost={hasConnectionIssue}
                />
            ) : (
                <MediaCarouselPreview
                    items={videoUrls}
                    cacheKey={cacheKey}
                    mediaType="video"
                    emptyIcon={<LuPlay />}
                    thumbs={nodeData.mediaThumbs}
                />
            )}
        </NodeShell>
    );
}

/** ویدیو آواتار — BytePlus verified real-person asset:// */
export function AiAvatarNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const { runningNodeIds, hasConnectionIssue } = useMediaStudio();
    const isTerminal = nodeData.status === 'error' || nodeData.status === 'success';
    const isActiveRun = !isTerminal && (nodeData.status === 'running' || runningNodeIds.has(id));
    const progress = typeof nodeData.progress === 'number' ? nodeData.progress : undefined;
    const cacheKey = typeof nodeData.previewCacheKey === 'number' ? nodeData.previewCacheKey : undefined;
    const videoUrls = collectMediaUrls(
        nodeData.videoUrl as string | undefined,
        nodeData.videos as string[] | undefined,
    );

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<LuUserRound />}
            title={nodeData.label || t('avatar_video')}
            className={styles.textToVideoNode}
            refreshMedia
            modelHeader="video"
            targetHandles={
                <>
                    <HandleWithLabel type="target" position={Position.Left} id="prompt-in" top="30%" label={t('prompt')} />
                    <HandleWithLabel type="target" position={Position.Left} id="ref-in" top="60%" label={t('avatar')} />
                </>
            }
            sourceLabel={t('video')}
        >
            <div className={styles.moodTag}>
                {nodeData.avatarName
                    ? t('avatar_named', {name: nodeData.avatarName})
                    : t('connect_avatar')}
            </div>
            {isActiveRun ? (
                <GenerationLoadingState
                    progress={progress}
                    connectionLost={hasConnectionIssue}
                />
            ) : (
                <MediaCarouselPreview
                    items={videoUrls}
                    cacheKey={cacheKey}
                    mediaType="video"
                    emptyIcon={<LuUserRound />}
                    thumbs={nodeData.mediaThumbs}
                />
            )}
        </NodeShell>
    );
}

/**
 * تولید موزیک / افکت صوتی / گفتار — Audio Generation node
 * Accepts prompt from connected prompt node.
 */
export function MusicSfxNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const modeLabel = t(getAudioCategoryLabelKey(String(nodeData.audioMode || 'tts')));

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<LuMusic />}
            title={nodeData.label || t('generate_audio')}
            className={styles.musicSfxNode}
            modelHeader="audio"
            targetHandles={
                <HandleWithLabel
                    type="target"
                    position={Position.Left}
                    id="prompt-in"
                    top="50%"
                    label={t('handle_prompt')}
                />
            }
            sourceLabel={t('audio')}
        >
            <div className={styles.moodTag}>{modeLabel}</div>
            <AudioPreview audioUrl={nodeData.audioUrl as string | undefined} />
        </NodeShell>
    );
}

// ── Output Nodes ───────────────────────────────────────────────────────────

export function ResultGalleryNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t, lang} = useProjectsI18n();
    const images = nodeData.images as string[] | undefined;
    const count = Number(nodeData.count || images?.length || 0);

    return (
        <NodeShell
            id={id}
            data={nodeData}
            icon={<LuLayoutGrid />}
            title={nodeData.label || t('results_gallery')}
            className={styles.resultGalleryNode}
            executable={false}
            targetLabel={t('images')}
            showSource={false}
        >
            <div className={styles.batchMeta}>{count ? t('image_count', {count: formatAppNumber(count, lang)}) : t('waiting_results')}</div>
            <ImageOutputGrid images={images} slots={Math.max(count, 3)} thumbs={nodeData.mediaThumbs} />
        </NodeShell>
    );
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

function ChainOutputMenu({ id, outputUrl, isVideo }: { id: string; outputUrl: string; isVideo: boolean }) {
    const { readOnly } = useMediaStudio();
    const { setNodes, setEdges } = useReactFlow();
    const {t} = useProjectsI18n();
    const [open, setOpen] = useState(false);

    const quickTypes: { type: string; label: string; data: Record<string, unknown> }[] = isVideo
        ? [
            { type: 'assetRef', label: t('ref_video'), data: { assetType: 'video', externalUrl: outputUrl } },
            { type: 'textToVideo', label: t('new_video_from_ref'), data: {} },
        ]
        : [
            { type: 'assetRef', label: t('ref_image'), data: { assetType: 'image', externalUrl: outputUrl } },
            { type: 'textToImage', label: t('new_image_from_ref'), data: {} },
            { type: 'textToVideo', label: t('video_from_image'), data: {} },
        ];

    const handlePick = (e: React.MouseEvent, opt: typeof quickTypes[number]) => {
        if (readOnly) return;
        e.stopPropagation();
        const newId = `node-${Date.now()}`;
        const targetNode = {
            id: newId,
            type: opt.type,
            position: { x: 0, y: 0 },
            data: { label: opt.label, ...opt.data },
        } as Node;
        const sourceNode = {
            id,
            type: 'render',
            position: { x: 0, y: 0 },
            data: isVideo ? { videoUrl: outputUrl } : { imageUrl: outputUrl },
        } as Node;
        setNodes((nds) => {
            const source = nds.find((n) => n.id === id);
            const basePos = source?.position || { x: 0, y: 0 };
            return [...nds, {
                ...targetNode,
                position: { x: basePos.x + 340, y: basePos.y },
            }];
        });
        if (opt.type !== 'assetRef') {
            setEdges((eds) => [...eds, {
                id: `edge-${id}-${newId}`,
                source: id,
                target: newId,
                targetHandle: getPreferredTargetHandle(sourceNode, targetNode),
            }]);
        }
        setOpen(false);
    };

    return (
        <div className={styles.chainOutputWrap}>
            <button
                type="button"
                className={styles.chainOutputBtn}
                disabled={readOnly}
                onClick={(e) => {
                    if (readOnly) return;
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                title={readOnly ? t('send_as_input_disabled') : t('send_as_input')}
            >
                {open ? <LuX /> : <LuPlus />}
                <span>{t('send_to_new_node')}</span>
            </button>
            {open && (
                <div className={styles.chainOutputMenu} onClick={(e) => e.stopPropagation()}>
                    {quickTypes.map((opt) => (
                        <button key={opt.type + opt.label} type="button" onClick={(e) => handlePick(e, opt)}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function RenderOutputNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t, lang} = useProjectsI18n();
    const status = nodeData.status;
    const outputUrl = sanitizeLegacyStorageUrl(String(nodeData.videoUrl || nodeData.imageUrl || ''));
    const isVideo = !!nodeData.videoUrl && (VIDEO_EXT_RE.test(outputUrl) || !nodeData.imageUrl);
    const progress = typeof nodeData.progress === 'number' ? Math.max(0, Math.min(100, nodeData.progress)) : undefined;
    const isError = status === 'error' || !!nodeData.runError;
    const isSuccess = status === 'success' && !!outputUrl;
    const isRunning = status === 'running' && !isError && !isSuccess;

    return (
        <>
            <NodeShell
                id={id}
                data={nodeData}
                icon={<LuMaximize2 />}
                title={nodeData.label || t('final_output')}
                className={styles.renderNode}
                successBadge={isSuccess}
            >
                {isRunning && (
                    <div className={styles.renderProgress}>
                        <div className={styles.renderProgressHeader}>
                            <LuLoader className={styles.spinIcon} />
                            <span>{t('processing_ai')}</span>
                        </div>
                        <div className={styles.renderProgressBarTrack}>
                            <div
                                className={styles.renderProgressBarFill}
                                style={{ width: `${progress ?? 8}%` }}
                            />
                        </div>
                        {typeof progress === 'number' && (
                            <span className={styles.renderProgressPercent}>{t('percent', {value: formatAppNumber(progress, lang)})}</span>
                        )}
                    </div>
                )}

                {isError && (
                    <div className={styles.renderFailed}>
                        <div className={styles.renderFailedHeader}>
                            <LuCircleAlert />
                            <span>{t('processing_failed')}</span>
                        </div>
                        <HoshetonError error={nodeData.runError} kind="generation">
                            {(e) => <p className={styles.renderFailedMessage}>{e.message}</p>}
                        </HoshetonError>
                    </div>
                )}

                {isSuccess && (
                    <div className={styles.renderPreviewWrap}>
                        {isVideo ? (
                            <LightweightMediaPreview
                                media={resolveLightweightMedia(outputUrl, nodeData.mediaThumbs, 'video')}
                                controls
                            />
                        ) : (
                            <ClickableImagePreview
                                src={outputUrl}
                                alt={t('final_output')}
                                thumbs={nodeData.mediaThumbs}
                            />
                        )}
                        <ChainOutputMenu id={id} outputUrl={outputUrl} isVideo={isVideo} />
                    </div>
                )}

                {!isRunning && !isSuccess && !isError && (
                    <button className={styles.compileBtn} type="button" disabled>
                        <LuPlay /> {t('run_render')}
                    </button>
                )}
            </NodeShell>
        </>
    );
}

// ── Resizable Group Node ───────────────────────────────────────────────────

export function CustomGroupNode({ id, data, selected }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const { readOnly, edgeConnectedNodeIds } = useMediaStudio();
    const preset = getGroupColorPreset(String(nodeData.groupColor ?? 'purple'));

    return (
        <>
            <NodeResizer
                minWidth={280}
                minHeight={200}
                isVisible={!!selected}
                lineClassName={styles.groupResizerLine}
                handleClassName={styles.groupResizerHandle}
            />
            <div
                className={`${styles.groupContainerNode} ${readOnly ? styles.readOnlyNode : ''} ${selected ? styles.groupSelected : ''} ${edgeConnectedNodeIds.has(id) ? styles.edgeConnectedNode : ''}`}
                style={{
                    '--group-light-bg': preset.lightBg,
                    '--group-dark-bg': preset.darkBg,
                    '--group-light-border': preset.lightBorder,
                    '--group-dark-border': preset.darkBorder,
                    '--group-accent': preset.accent,
                    '--group-dark-accent': preset.darkAccent,
                } as React.CSSProperties}
            >
                <div className={styles.groupHeaderArea}>
                    <div className={styles.groupBadge}>
                        {nodeData.label || t('group')}
                    </div>
                    <div className={styles.headerActions}>
                        <DuplicateNodeButton id={id} label={nodeData.label || t('group')} />
                        <GroupDeleteButton id={id} label={nodeData.label || t('group')} />
                    </div>
                </div>
                <div className={styles.groupHint}>
                    <LuWand />
                    <div>
                        <strong>{t('create_group_colon')}</strong>
                        <span> {t('create_group_help')}</span>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Legacy node stubs — kept so old saved workflows render without crashing ─
// These types are no longer in the catalog and cannot be added via the toolbox.

export function LegacyFallbackNode({ id, data }: NodeProps) {
    const nodeData = data as StudioNodeData;
    const {t} = useProjectsI18n();
    const { edgeConnectedNodeIds } = useMediaStudio();
    return (
        <div className={`${styles.baseNode} ${edgeConnectedNodeIds.has(id) ? styles.edgeConnectedNode : ''}`} style={{ opacity: 0.5, minWidth: 160 }}>
            <Handle type="target" position={Position.Left} />
            <div className={styles.nodeHeader}>
                <div className={styles.headerTitle}>
                    <LuImages />
                    <span>{nodeData.label || t('legacy_node')}</span>
                </div>
                <div className={styles.headerActions}>
                    <DuplicateNodeButton id={id} label={nodeData.label || t('legacy_node')} />
                    <DeleteNodeButton id={id} />
                </div>
            </div>
            <div className={styles.nodeBody} style={{ fontSize: 11, color: '#888' }}>
                {t('legacy_unsupported')}
            </div>
            <Handle type="source" position={Position.Right} />
        </div>
    );
}
