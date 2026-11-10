import type { Edge, Node } from '@xyflow/react';
import type { StudioNodeData } from '../[projectId]/types/studio';
import { applyEdgePresentation } from './workflow-serializer';
import type { EdgeTypeOption } from '../types/node-catalog';
import { getAbsolutePosition } from './group-utils';
import {
    edgesForClipboardPayload,
    expandSelectionIds,
    remapPastedEdgeEndpoints,
} from './workflow-clipboard-edges';

export {
    expandSelectionIds,
    selectionHasExternalEdges,
} from './workflow-clipboard-edges';

const DEFAULT_PASTE_OFFSET = { x: 48, y: 48 };

export interface WorkflowClipboardPayload {
    nodes: Node[];
    edges: Edge[];
    copiedAt: number;
}

function deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function resetNodeData(data: StudioNodeData): StudioNodeData {
    const next = deepClone(data);
    next.status = 'idle';
    delete next.runError;
    delete next.runErrorStage;
    delete next.progress;
    delete next.generatingIndex;
    next.isActive = false;
    next.cost = null;
    delete next.totalCost;
    delete next.costHistory;
    next.previewCacheKey = Date.now();
    return next;
}

function newNodeId(index: number): string {
    return `node-${Date.now()}-${index}`;
}

function newGroupId(index: number): string {
    return `group-${Date.now()}-${index}`;
}

function newEdgeId(source: string, target: string, index: number): string {
    return `edge-${source}-${target}-${Date.now()}-${index}`;
}

export function buildClipboardPayload(
    allNodes: Node[],
    allEdges: Edge[],
    selectedIds: string[],
    options?: { includeExternalEdges?: boolean },
): WorkflowClipboardPayload | null {
    if (!selectedIds.length) return null;

    const idSet = expandSelectionIds(selectedIds, allNodes);
    const nodes = allNodes.filter((n) => idSet.has(n.id));
    if (!nodes.length) return null;

    const edges = edgesForClipboardPayload(allEdges, idSet, options?.includeExternalEdges);

    return {
        nodes: deepClone(nodes),
        edges: deepClone(edges),
        copiedAt: Date.now(),
    };
}

export function pasteClipboardPayload(
    payload: WorkflowClipboardPayload,
    edgeType: EdgeTypeOption,
    offset = DEFAULT_PASTE_OFFSET,
): { nodes: Node[]; edges: Edge[]; newNodeIds: string[] } {
    const idMap = new Map<string, string>();
    let index = 0;

    const sorted = [...payload.nodes].sort((a, b) => {
        if (a.type === 'customGroup' && b.type !== 'customGroup') return -1;
        if (b.type === 'customGroup' && a.type !== 'customGroup') return 1;
        return 0;
    });

    for (const node of sorted) {
        idMap.set(
            node.id,
            node.type === 'customGroup' ? newGroupId(index++) : newNodeId(index++),
        );
    }

    const copiedIds = new Set(payload.nodes.map((n) => n.id));

    const clonedNodes: Node[] = payload.nodes.map((node) => {
        const newId = idMap.get(node.id)!;
        const parentInCopy = Boolean(node.parentId && copiedIds.has(node.parentId));
        const newParentId = parentInCopy && node.parentId ? idMap.get(node.parentId) : undefined;

        let position = { ...node.position };
        if (newParentId) {
            // Keep relative position inside copied group.
        } else {
            const abs = node.parentId
                ? getAbsolutePosition(node, payload.nodes)
                : node.position;
            position = {
                x: abs.x + offset.x,
                y: abs.y + offset.y,
            };
        }

        const cloned: Node = {
            ...deepClone(node),
            id: newId,
            data: resetNodeData(node.data as StudioNodeData),
            position,
            selected: true,
        };

        if (newParentId) {
            cloned.parentId = newParentId;
            cloned.extent = 'parent';
        } else {
            delete cloned.parentId;
            delete cloned.extent;
        }

        return cloned;
    });

    const clonedEdges: Edge[] = payload.edges.flatMap((edge, i) => {
        const remapped = remapPastedEdgeEndpoints(edge, idMap);
        if (!remapped) return [];
        return [applyEdgePresentation({
            ...deepClone(edge),
            id: newEdgeId(remapped.source, remapped.target, i),
            source: remapped.source,
            target: remapped.target,
            selected: false,
        })];
    });

    return {
        nodes: clonedNodes,
        edges: clonedEdges,
        newNodeIds: clonedNodes.map((n) => n.id),
    };
}
