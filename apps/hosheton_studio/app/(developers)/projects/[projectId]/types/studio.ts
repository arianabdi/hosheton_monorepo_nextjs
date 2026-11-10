import type { Node, Edge } from '@xyflow/react';
import type { StudioMediaMention, StudioMediaRef } from '../../lib/studio-media';

/** Active node types in the current workflow system */
export type NodeType =
    | 'startTrigger'
    | 'note'
    | 'prompt'
    | 'assetRef'
    | 'avatarRef'
    | 'textToImage'
    | 'textToVideo'
    | 'aiAvatar'
    | 'musicSfx'
    | 'resultGallery'
    | 'render'
    | 'customGroup';

export interface NodeCostHistoryEntry {
    amount: number;
    currency?: string;
    unit?: string;
    runId?: string;
    at?: string;
    model?: string;
}

export interface StudioNodeData {
    label?: string;
    type?: NodeType;
    promptText?: string;
    /** Free-form notes / description for prompt nodes (saved on project.nodes) */
    description?: string;
    images?: string[];
    videoUrl?: string;
    audioUrl?: string;
    assetUrl?: string;
    fileId?: string;
    fileKey?: string;
    externalUrl?: string;
    fileName?: string;
    assetType?: 'image' | 'video' | 'audio' | string;
    /** Canonical multi-file form. Legacy single-file fields above remain readable. */
    assets?: StudioMediaRef[];
    promptMentions?: StudioMediaMention[];
    model?: string;
    aspectRatio?: string;
    resolution?: string;
    duration?: number;
    durationSeconds?: number;
    videoDurationSeconds?: number;
    audioDurationSeconds?: number;
    mediaWidth?: number;
    mediaHeight?: number;
    width?: number;
    height?: number;
    mediaMetadata?: {
        durationSeconds?: number;
        width?: number;
        height?: number;
    };
    metadata?: {
        durationSeconds?: number;
        width?: number;
        height?: number;
        [key: string]: unknown;
    };
    generateAudio?: boolean;
    audioMode?: 'music' | 'sfx' | 'speech' | 'tts';
    isActive?: boolean;
    status?: 'idle' | 'running' | 'success' | 'error';
    count?: number;
    runError?: string;
    runErrorStage?: string;
    /** Estimated completion percentage (0-100) while an AI generation job is running, patched via the `node:progress` WS event */
    progress?: number;
    imageUrl?: string;
    /** Multiple generated videos when batch output is supported */
    videos?: string[];
    cost?: { amount: number; currency: string; unit: string } | null;
    /** Cumulative spend for this node across runs */
    totalCost?: number;
    /** Per-run cost log for hover popup */
    costHistory?: NodeCostHistoryEntry[];
    /** Bumped when media URLs change — cache-busts preview img/video src */
    previewCacheKey?: number;
    /** Lightweight JPEG + dimensions keyed by original media URL */
    mediaThumbs?: Record<string, {
        thumbnailUrlLarge?: string;
        width?: number;
        height?: number;
        aspectRatio?: number;
    }>;
    /** Registered BytePlus avatar profile id */
    avatarId?: string;
    avatarName?: string;
    avatarAssetUri?: string;
    /** Selected photo within the person/group (BytePlus asset id) */
    selectedAssetId?: string;
    byteplusAssetId?: string;
    previewImageUrl?: string;
    groupId?: string;
    noteText?: string;
    noteColor?: string;
    groupColor?: string;
    /** Resolved provider name (e.g. `heygen`, `kling`, `elevenlabs`) — set alongside providerId/modelId */
    providerName?: string;
    /**
     * Vendor-specific settings rendered from the selected `ProviderModel.settingsSchema`
     * (e.g. ElevenLabs stability/similarityBoost, HeyGen avatar/voice, Kling duration/mode).
     * Kept in its own namespace so vendor keys never collide with generic node fields.
     */
    modelSettings?: Record<string, unknown>;
    /** «زاویه و نور» روی نود تولید عکس — state ویرایشگر + resolvedShots (lib/angle-studio) */
    angleStudio?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface FlowTemplate {
    id: string;
    name: string;
    nameFa: string;
    description: string;
    category: 'character' | 'animation' | 'fashion' | 'commercial';
    nodes: Node[];
    edges: Edge[];
}

export type AddableNodeType = Exclude<NodeType, 'customGroup'>;
