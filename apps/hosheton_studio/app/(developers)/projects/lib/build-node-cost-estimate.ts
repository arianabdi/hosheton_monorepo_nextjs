import type { Edge, Node } from '@xyflow/react';
import type { CostEstimatePayload } from '../components/CostEstimatePanel';
import type { StudioNodeData } from '../[projectId]/types/studio';
import { collectConnectedInputMetrics, EMPTY_RUNTIME_METRICS } from './connected-input-metrics';
import { applyAngleEstimate } from './angle-studio';

export const BILLABLE_NODE_TYPES = new Set([
    'textToImage',
    'textToVideo',
    'aiAvatar',
    'musicSfx',
]);

function computePromptLength(node: Node, nodes: Node[], edges: Edge[]): number | undefined {
    const nodeData = (node.data ?? {}) as StudioNodeData;
    const localLength = String(nodeData.promptText || '').trim().length;
    const connectedLength = edges
        .filter((edge) =>
            edge.target === node.id
            && ['prompt-in', 'prompt', 'text-in'].includes(
                String(edge.targetHandle || '').trim().toLowerCase(),
            ),
        )
        .reduce((total, edge) => {
            const source = nodes.find((candidate) => candidate.id === edge.source);
            return total + (source?.type === 'prompt'
                ? String((source.data as StudioNodeData)?.promptText || '').trim().length
                : 0);
        }, 0);
    const total = localLength + connectedLength;
    return total > 0 ? total : undefined;
}

function computeConnectedVideoEstimate(nodeId: string, nodes: Node[], edges: Edge[]) {
    const incoming = edges.filter((edge) => edge.target === nodeId);
    const sourceIds = new Set(incoming.map((edge) => edge.source));
    const targetType = String(nodes.find((node) => node.id === nodeId)?.type || '');
    let durationSeconds = 0;

    for (const source of nodes.filter((candidate) => sourceIds.has(candidate.id))) {
        const data = (source.data || {}) as StudioNodeData & Record<string, unknown>;
        const sourceEdges = incoming.filter((edge) => edge.source === source.id);
        const isVideo = /video/i.test(String(source.type || ''))
            || String(data.assetType || '').toLowerCase() === 'video'
            || typeof data.videoUrl === 'string'
            || (Array.isArray(data.videos) && data.videos.length > 0)
            // textToVideo's unified ref-in carries video refs too (legacy vid-ref as well)
            || sourceEdges.some((edge) =>
                edge.targetHandle === 'vid-ref'
                || (edge.targetHandle === 'ref-in' && targetType === 'textToVideo'));
        if (!isVideo) continue;

        durationSeconds += Number(
            data.videoDurationSeconds
            || (data.mediaMetadata as Record<string, unknown> | undefined)?.durationSeconds
            || 0,
        );
    }

    return {
        hasVideoInput: durationSeconds > 0 || incoming.some((edge) => {
            const source = nodes.find((candidate) => candidate.id === edge.source);
            if (!source) return false;
            const data = (source.data || {}) as StudioNodeData;
            return /video/i.test(String(source.type || ''))
                || String(data.assetType || '').toLowerCase() === 'video'
                || typeof data.videoUrl === 'string';
        }),
        inputVideoDurationSeconds: durationSeconds,
    };
}

export function buildNodeCostEstimatePayload(
    node: Node,
    nodes: Node[],
    edges: Edge[],
): CostEstimatePayload | null {
    const nodeType = String(node.type || '');
    if (!BILLABLE_NODE_TYPES.has(nodeType)) return null;

    const nodeData = (node.data ?? {}) as StudioNodeData;
    const modelId = String(nodeData.modelId || '').trim();
    if (!modelId) return null;

    const connectedInputMetrics = node.id
        ? collectConnectedInputMetrics(node.id, nodes, edges)
        : EMPTY_RUNTIME_METRICS;
    const connectedVideoEstimate = node.id
        ? computeConnectedVideoEstimate(node.id, nodes, edges)
        : { hasVideoInput: false, inputVideoDurationSeconds: 0 };

    const modelType = String(
        nodeData.modelModeId
        || nodeData.modelMode
        || (nodeData.modelSettings as Record<string, unknown> | undefined)?.modelModeId
        || (nodeData.modelSettings as Record<string, unknown> | undefined)?.modelMode
        || '',
    ).trim();

    // «زاویه و نور»: هر نما یک تصویر (همان قیمتی که worker برای هر درخواست می‌گیرد)
    return applyAngleEstimate({
        modelId,
        nodeType,
        modelSettings: {
            ...((nodeData.modelSettings || {}) as Record<string, unknown>),
            ...(modelType ? { modelModeId: modelType, modelMode: modelType } : {}),
            hasVideoInput: connectedVideoEstimate.hasVideoInput,
            inputVideoDurationSeconds: connectedVideoEstimate.inputVideoDurationSeconds,
        },
        promptLength: computePromptLength(node, nodes, edges),
        runtimeMetrics: {
            ...connectedInputMetrics,
            hasVideoInput: connectedVideoEstimate.hasVideoInput,
            inputVideoDurationSeconds: Math.max(
                connectedInputMetrics.inputVideoDurationSeconds,
                connectedVideoEstimate.inputVideoDurationSeconds,
            ),
            inputVideoWholeSeconds: Math.max(
                connectedInputMetrics.inputVideoWholeSeconds,
                Math.floor(connectedVideoEstimate.inputVideoDurationSeconds),
            ),
        },
    } as CostEstimatePayload, nodeData.angleStudio);
}

export function getBillableNodeTypeLabelKey(nodeType: string): string {
    switch (nodeType) {
        case 'textToImage':
            return 'generate_image';
        case 'textToVideo':
            return 'generate_video';
        case 'aiAvatar':
            return 'avatar_video';
        case 'musicSfx':
            return 'generate_audio';
        default:
            return 'run_node';
    }
}
