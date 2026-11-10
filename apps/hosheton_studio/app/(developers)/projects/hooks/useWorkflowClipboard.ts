import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';
import {
    buildClipboardPayload,
    pasteClipboardPayload,
    type WorkflowClipboardPayload,
} from '../lib/workflow-clipboard';
import type { EdgeTypeOption } from '../types/node-catalog';
import { sortNodesForRender } from '../lib/group-utils';

interface UseWorkflowClipboardOptions {
    nodes: Node[];
    edges: Edge[];
    setNodes: Dispatch<SetStateAction<Node[]>>;
    setEdges: Dispatch<SetStateAction<Edge[]>>;
    pushHistory: () => void;
    getSelectedNodeIds: () => string[];
    edgeType: EdgeTypeOption;
    readOnly?: boolean;
}

export function useWorkflowClipboard({
    nodes,
    edges,
    setNodes,
    setEdges,
    pushHistory,
    getSelectedNodeIds,
    edgeType,
    readOnly = false,
}: UseWorkflowClipboardOptions) {
    const clipboardRef = useRef<WorkflowClipboardPayload | null>(null);
    const [canPaste, setCanPaste] = useState(false);

    const copySelection = useCallback((): boolean => {
        const selectedIds = getSelectedNodeIds();
        const payload = buildClipboardPayload(nodes, edges, selectedIds);
        if (!payload) return false;
        clipboardRef.current = payload;
        setCanPaste(true);
        return true;
    }, [nodes, edges, getSelectedNodeIds]);

    const applyPayload = useCallback((payload: WorkflowClipboardPayload): string[] => {
        if (readOnly) return [];

        pushHistory();
        const { nodes: pastedNodes, edges: pastedEdges, newNodeIds } = pasteClipboardPayload(
            payload,
            edgeType,
        );

        setNodes((current) => sortNodesForRender([
            ...current.map((node) => ({ ...node, selected: false })),
            ...pastedNodes,
        ]));
        setEdges((current) => [...current, ...pastedEdges]);

        return newNodeIds;
    }, [readOnly, pushHistory, edgeType, setNodes, setEdges]);

    const pasteSelection = useCallback((): string[] => {
        if (!clipboardRef.current) return [];
        return applyPayload(clipboardRef.current);
    }, [applyPayload]);

    const duplicateSelection = useCallback((): string[] => {
        if (readOnly) return [];
        if (!copySelection()) return [];
        return pasteSelection();
    }, [readOnly, copySelection, pasteSelection]);

    const duplicateNodesById = useCallback((
        nodeIds: string[],
        options?: { withExternalEdges?: boolean },
    ): string[] => {
        if (readOnly || !nodeIds.length) return [];
        const payload = buildClipboardPayload(nodes, edges, nodeIds, {
            includeExternalEdges: options?.withExternalEdges,
        });
        if (!payload) return [];
        return applyPayload(payload);
    }, [readOnly, nodes, edges, applyPayload]);

    return {
        copySelection,
        pasteSelection,
        duplicateSelection,
        duplicateNodesById,
        canPaste,
    };
}
