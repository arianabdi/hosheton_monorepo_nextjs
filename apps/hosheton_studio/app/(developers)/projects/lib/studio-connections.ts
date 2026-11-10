import type { Connection, Edge, Node } from '@xyflow/react';
import type { StudioNodeData } from '../[projectId]/types/studio';
import { normalizeAssetRefData } from './studio-media.ts';

export type StudioConnectionKind =
    | 'prompt'
    | 'image'
    | 'video'
    | 'audio'
    | 'avatar'
    | 'control';

const PROMPT_HANDLES = new Set(['prompt-in', 'prompt', 'text-in']);
const IMAGE_HANDLES = new Set(['img-ref', 'image-in', 'images-in', 'ref', 'ref-image', 'image-ref']);
const VIDEO_HANDLES = new Set(['vid-ref', 'video-in', 'video-ref']);
const AUDIO_HANDLES = new Set(['audio-in', 'audio-ref']);
const AVATAR_HANDLES = new Set(['avatar-in', 'avatar-ref']);

function normalized(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

export function getSourceOutputKind(node: Node | undefined): StudioConnectionKind | null {
    if (!node) return null;
    const data = (node.data || {}) as StudioNodeData;
    const assetType = normalized(data.assetType);

    if (node.type === 'startTrigger') return 'control';
    if (node.type === 'prompt') return 'prompt';
    if (node.type === 'avatarRef') return 'avatar';
    if (node.type === 'textToImage' || node.type === 'resultGallery') return 'image';
    if (node.type === 'textToVideo' || node.type === 'aiAvatar') return 'video';
    if (node.type === 'musicSfx') return 'audio';
    if (node.type === 'assetRef') {
        const assetKinds = normalizeAssetRefData(data).map((asset) => asset.type);
        if (assetKinds.length) return assetKinds[0];
        // AssetRef renders and uploads as image when assetType is absent.
        if (!assetType) return 'image';
        if (assetType === 'image' || assetType === 'video' || assetType === 'audio') {
            return assetType;
        }
        return null;
    }
    if (node.type === 'render') {
        if (data.videoUrl || data.videos?.length) return 'video';
        if (data.audioUrl) return 'audio';
        if (data.imageUrl || data.images?.length) return 'image';
    }
    return null;
}

export function getTargetAcceptedKinds(
    target: Node | undefined,
    targetHandle: unknown,
): StudioConnectionKind[] {
    if (!target) return [];
    const handle = normalized(targetHandle);

    if (PROMPT_HANDLES.has(handle)) {
        // Start-trigger edges may be created through the prompt node's only
        // visible target handle. They express execution order, not prompt data.
        return target.type === 'prompt' ? ['prompt', 'control'] : ['prompt'];
    }
    if (VIDEO_HANDLES.has(handle)) return ['video'];
    if (AUDIO_HANDLES.has(handle)) return ['audio'];
    if (AVATAR_HANDLES.has(handle)) return ['avatar'];
    // `ref-in` semantics depend on the target: aiAvatar takes only avatars,
    // textToVideo takes every file type (unified reference input), other
    // generation nodes take images.
    if (handle === 'ref-in') {
        if (target.type === 'aiAvatar') return ['avatar'];
        if (target.type === 'textToVideo') return ['image', 'video', 'audio', 'avatar'];
        return ['image'];
    }
    if (IMAGE_HANDLES.has(handle)) return ['image'];

    if (!handle) {
        if (target.type === 'resultGallery') return ['image'];
        if (target.type === 'render') return ['image', 'video', 'audio'];
        // Legacy trigger edges use the default handle to express execution order.
        return ['control'];
    }
    return [];
}

export function isValidStudioConnection(
    connection: Pick<Connection | Edge, 'source' | 'target' | 'targetHandle'>,
    nodes: Node[],
): boolean {
    if (!connection.source || !connection.target || connection.source === connection.target) return false;
    const source = nodes.find((node) => node.id === connection.source);
    const target = nodes.find((node) => node.id === connection.target);
    const outputKind = getSourceOutputKind(source);
    if (!outputKind) return false;
    const accepted = getTargetAcceptedKinds(target, connection.targetHandle);
    if (source?.type === 'assetRef') {
        const assets = normalizeAssetRefData((source.data || {}) as Record<string, unknown>);
        if (assets.length) return assets.some((asset) => accepted.includes(asset.type));
    }
    return accepted.includes(outputKind);
}

export function getInvalidStudioEdges(edges: Edge[], nodes: Node[]): Edge[] {
    return edges.filter((edge) => !isValidStudioConnection(edge, nodes));
}

export const PROMPT_REQUIRED_NODE_TYPES = new Set([
    'textToImage',
    'textToVideo',
    'musicSfx',
    'aiAvatar',
]);

export function nodeRequiresConnectedPrompt(nodeType: unknown): boolean {
    return PROMPT_REQUIRED_NODE_TYPES.has(String(nodeType || ''));
}

export function hasConnectedPrompt(nodeId: string, edges: Edge[]): boolean {
    return edges.some((edge) => (
        edge.target === nodeId
        && PROMPT_HANDLES.has(normalized(edge.targetHandle))
    ));
}

export function getPreferredTargetHandle(
    source: Node,
    target: Node,
): string | undefined {
    let kind = getSourceOutputKind(source);
    if (!kind) return undefined;
    if (source.type === 'assetRef') {
        const kinds = new Set(normalizeAssetRefData((source.data || {}) as Record<string, unknown>).map((asset) => asset.type));
        if (target.type === 'musicSfx' && kinds.has('audio')) kind = 'audio';
        else if (target.type === 'textToVideo' && kinds.has('video')) kind = 'video';
        else if (kinds.has('image')) kind = 'image';
        else if (kinds.has('video')) kind = 'video';
        else if (kinds.has('audio')) kind = 'audio';
    }
    if (target.type === 'resultGallery' || target.type === 'render') return undefined;
    if (kind === 'prompt') return 'prompt-in';
    // textToVideo has one unified reference handle for every file type.
    if (kind === 'image') return target.type === 'textToImage' || target.type === 'textToVideo' ? 'ref-in' : 'img-ref';
    if (kind === 'video') return target.type === 'textToVideo' ? 'ref-in' : 'vid-ref';
    if (kind === 'audio') return target.type === 'textToVideo' ? 'ref-in' : 'audio-in';
    if (kind === 'avatar') return target.type === 'aiAvatar' || target.type === 'textToVideo' ? 'ref-in' : 'avatar-in';
    return undefined;
}
