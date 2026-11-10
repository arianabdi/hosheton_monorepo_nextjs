import type { Edge, Node } from '@xyflow/react';

/** If a group is selected, include all its children in the copy set. */
export function expandSelectionIds(selectedIds: string[], allNodes: Node[]): Set<string> {
    const expanded = new Set(selectedIds);
    let changed = true;

    while (changed) {
        changed = false;
        for (const node of allNodes) {
            if (node.type !== 'customGroup' || !expanded.has(node.id)) continue;
            for (const child of allNodes) {
                if (child.parentId === node.id && !expanded.has(child.id)) {
                    expanded.add(child.id);
                    changed = true;
                }
            }
        }
    }

    return expanded;
}

export function isExternalClipboardEdge(
    edge: Pick<Edge, 'source' | 'target'>,
    idSet: Set<string>,
): boolean {
    const sourceIn = idSet.has(edge.source);
    const targetIn = idSet.has(edge.target);
    return (sourceIn || targetIn) && !(sourceIn && targetIn);
}

export function selectionHasExternalEdges(
    allNodes: Node[],
    allEdges: Edge[],
    selectedIds: string[],
): boolean {
    if (!selectedIds.length) return false;
    const idSet = expandSelectionIds(selectedIds, allNodes);
    return allEdges.some((edge) => isExternalClipboardEdge(edge, idSet));
}

export function edgesForClipboardPayload(
    allEdges: Edge[],
    idSet: Set<string>,
    includeExternalEdges = false,
): Edge[] {
    return allEdges.filter((edge) => {
        const sourceIn = idSet.has(edge.source);
        const targetIn = idSet.has(edge.target);
        if (sourceIn && targetIn) return true;
        return includeExternalEdges && (sourceIn || targetIn);
    });
}

export function remapPastedEdgeEndpoints(
    edge: Pick<Edge, 'source' | 'target'>,
    idMap: Map<string, string>,
): { source: string; target: string } | null {
    const source = idMap.get(edge.source) ?? edge.source;
    const target = idMap.get(edge.target) ?? edge.target;
    if (!source || !target || source === target) return null;
    return { source, target };
}
