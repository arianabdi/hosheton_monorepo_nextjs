import type { Edge, Node } from '@xyflow/react';
import type { WorkflowEdge, WorkflowNode } from '../types/media-api';
import { EDGE_TYPE_OPTIONS, type EdgeTypeOption } from '../types/node-catalog';
import { normalizeAssetRefData, type StudioEdgeData } from './studio-media';

export const EDGE_PRESENTATION_STYLE = { stroke: '#8b5cf6', strokeWidth: 2.5 } as const;

export const SELECTED_EDGE_COLOR = '#8b5cf6';

export const SELECTED_EDGE_STYLE = {
    stroke: SELECTED_EDGE_COLOR,
    strokeWidth: 3,
    filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.45))',
} as const;

const INVALID_EDGE_STYLE = {
    stroke: '#dc2626',
    strokeWidth: 2.5,
    strokeDasharray: '7 5',
} as const;

const SELECTED_INVALID_EDGE_STYLE = {
    stroke: '#dc2626',
    strokeWidth: 3,
    strokeDasharray: '7 5',
    filter: 'drop-shadow(0 0 4px rgba(220, 38, 38, 0.4))',
} as const;

/** Overlay selection glow without mutating the persisted edge style. */
export function applyEdgeSelectionPresentation(edge: Edge, invalid: boolean): Edge {
    if (invalid) {
        return {
            ...edge,
            animated: false,
            className: [edge.className, 'invalid-edge'].filter(Boolean).join(' '),
            label: edge.label || 'Invalid connection',
            style: {
                ...(edge.style ?? {}),
                ...(edge.selected ? SELECTED_INVALID_EDGE_STYLE : INVALID_EDGE_STYLE),
            },
            labelStyle: { ...(edge.labelStyle ?? {}), fill: '#dc2626', fontWeight: 700 },
            zIndex: edge.selected ? 1000 : edge.zIndex,
        };
    }

    if (!edge.selected) return edge;

    return {
        ...edge,
        style: {
            ...(edge.style ?? {}),
            ...SELECTED_EDGE_STYLE,
        },
        zIndex: 1000,
    };
}

const VALID_EDGE_TYPES = new Set(EDGE_TYPE_OPTIONS.map((o) => o.value));

export function isEdgeTypeOption(value: unknown): value is EdgeTypeOption {
    return typeof value === 'string' && VALID_EDGE_TYPES.has(value as EdgeTypeOption);
}

/** Apply consistent stroke styling while preserving each edge's saved type. */
export function applyEdgePresentation(edge: Edge): Edge {
    const type = isEdgeTypeOption(edge.type) ? edge.type : 'smoothstep';
    return {
        ...edge,
        type,
        animated: false,
        style: { ...(edge.style ?? {}), ...EDGE_PRESENTATION_STYLE },
    };
}

export function inferEdgeTypeFromEdges(edges: Edge[]): EdgeTypeOption {
    if (!edges.length) return 'smoothstep';
    const counts = new Map<EdgeTypeOption, number>();
    for (const edge of edges) {
        const type = isEdgeTypeOption(edge.type) ? edge.type : 'smoothstep';
        counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    let best: EdgeTypeOption = 'smoothstep';
    let bestCount = 0;
    for (const [type, count] of counts) {
        if (count > bestCount) {
            best = type;
            bestCount = count;
        }
    }
    return best;
}

export function serializeNode(node: Node): WorkflowNode {
    const rawData = (node.data as Record<string, unknown>) || {};
    const data = node.type === 'assetRef'
        ? { ...rawData, assets: normalizeAssetRefData(rawData) }
        : rawData;
    return {
        id: node.id,
        type: node.type || 'prompt',
        data,
        position: node.position,
        ...(node.parentId ? { parentId: node.parentId } : {}),
        ...(node.extent ? { extent: node.extent as string } : {}),
        ...(node.style ? { style: node.style as Record<string, unknown> } : {}),
        ...(node.zIndex !== undefined ? { zIndex: node.zIndex } : {}),
        ...(node.width !== undefined ? { width: node.width } : {}),
        ...(node.height !== undefined ? { height: node.height } : {}),
    };
}

export function serializeEdge(edge: Edge): WorkflowEdge {
    return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
        ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
        ...(edge.type ? { type: String(edge.type) } : {}),
        animated: edge.animated ?? false,
        ...(edge.style ? { style: edge.style as Record<string, unknown> } : {}),
        ...(edge.data ? { data: edge.data as StudioEdgeData } : {}),
    };
}

export function deserializeNode(raw: WorkflowNode): Node {
    const rawData = raw.data ?? {};
    const data = raw.type === 'assetRef'
        ? { ...rawData, assets: normalizeAssetRefData(rawData) }
        : rawData;
    return {
        id: raw.id,
        type: raw.type,
        position: raw.position ?? { x: 0, y: 0 },
        data,
        ...(raw.parentId ? { parentId: raw.parentId } : {}),
        ...(raw.extent ? { extent: raw.extent as 'parent' } : {}),
        ...(raw.style ? { style: raw.style as Node['style'] } : {}),
        ...(raw.zIndex !== undefined ? { zIndex: raw.zIndex } : {}),
        ...(raw.width !== undefined ? { width: raw.width as number } : {}),
        ...(raw.height !== undefined ? { height: raw.height as number } : {}),
    };
}

export function deserializeEdge(raw: WorkflowEdge): Edge {
    return applyEdgePresentation({
        id: raw.id || `e-${raw.source}-${raw.target}`,
        source: raw.source,
        target: raw.target,
        type: isEdgeTypeOption(raw.type) ? raw.type : 'smoothstep',
        animated: raw.animated ?? false,
        ...(raw.style ? { style: raw.style as Edge['style'] } : {}),
        ...(raw.sourceHandle ? { sourceHandle: raw.sourceHandle } : {}),
        ...(raw.targetHandle ? { targetHandle: raw.targetHandle } : {}),
        ...(raw.data ? { data: raw.data } : {}),
    });
}

export function serializeWorkflow(nodes: Node[], edges: Edge[]) {
    return {
        nodes: nodes.map(serializeNode),
        edges: edges.map(serializeEdge),
    };
}

/**
 * Runtime-only keys that the server owns and that change constantly while a
 * job runs (progress, status, cached preview busters, per-tile state, cost
 * accounting). Autosave signatures must ignore these — otherwise every socket
 * `node:progress` / `node:update` tick triggers a new PATCH and the editor
 * gets flooded with save requests (page lockup + save stuck on "saving").
 */
const RUNTIME_ONLY_NODE_KEYS = new Set<string>([
    'status',
    'progress',
    'previewCacheKey',
    'runError',
    'generatingIndex',
    'tileErrors',
    'cost',
    'totalCost',
    'costHistory',
]);

/** Serialize a workflow ignoring volatile runtime fields (used for save-signature comparison). */
export function serializeWorkflowSignature(nodes: Node[], edges: Edge[]) {
    return {
        nodes: nodes.map((node) => {
            const data = (node.data ?? {}) as Record<string, unknown>;
            const stableData: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(data)) {
                if (RUNTIME_ONLY_NODE_KEYS.has(key)) continue;
                stableData[key] = value;
            }
            return {
                ...serializeNode(node),
                data: stableData,
            };
        }),
        edges: edges.map(serializeEdge),
    };
}

/**
 * textToVideo now exposes one unified reference handle (`ref-in`) for every
 * file type. Rewrite the legacy per-type reference handles of saved workflows
 * so their edges stay anchored to a real handle and pass connection validation.
 */
function migrateLegacyVideoRefHandles(nodes: Node[], edges: Edge[]): Edge[] {
    const videoNodeIds = new Set(
        nodes.filter((node) => node.type === 'textToVideo').map((node) => node.id),
    );
    if (!videoNodeIds.size) return edges;
    return edges.map((edge) => {
        if (!videoNodeIds.has(edge.target)) return edge;
        const handle = String(edge.targetHandle || '');
        if (!handle || handle === 'prompt-in' || handle === 'ref-in') return edge;
        if (['img-ref', 'vid-ref', 'audio-in', 'avatar-in'].includes(handle)) {
            return { ...edge, targetHandle: 'ref-in' };
        }
        return edge;
    });
}

export function deserializeWorkflow(nodes: WorkflowNode[] = [], edges: WorkflowEdge[] = []) {
    const deserializedNodes = nodes.map(deserializeNode);
    return {
        nodes: deserializedNodes,
        edges: migrateLegacyVideoRefHandles(deserializedNodes, edges.map(deserializeEdge)),
    };
}
