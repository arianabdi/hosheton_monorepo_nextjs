import { useCallback, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';

export type WorkflowSnapshot = {
    nodes: Node[];
    edges: Edge[];
};

function cloneSnapshot(nodes: Node[], edges: Edge[]): WorkflowSnapshot {
    return {
        nodes: JSON.parse(JSON.stringify(nodes)) as Node[],
        edges: JSON.parse(JSON.stringify(edges)) as Edge[],
    };
}

export function useWorkflowUndo(
    nodes: Node[],
    edges: Edge[],
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
) {
    const pastRef = useRef<WorkflowSnapshot[]>([]);
    const futureRef = useRef<WorkflowSnapshot[]>([]);
    const applyingRef = useRef(false);
    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);

    nodesRef.current = nodes;
    edgesRef.current = edges;

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const syncHistoryFlags = useCallback(() => {
        setCanUndo(pastRef.current.length > 0);
        setCanRedo(futureRef.current.length > 0);
    }, []);

    const pushHistory = useCallback(() => {
        if (applyingRef.current) return;
        pastRef.current.push(cloneSnapshot(nodesRef.current, edgesRef.current));
        if (pastRef.current.length > 60) pastRef.current.shift();
        futureRef.current = [];
        syncHistoryFlags();
    }, [syncHistoryFlags]);

    const applySnapshot = useCallback((snapshot: WorkflowSnapshot) => {
        applyingRef.current = true;
        setNodes(snapshot.nodes);
        setEdges(snapshot.edges);
        requestAnimationFrame(() => {
            applyingRef.current = false;
        });
    }, [setNodes, setEdges]);

    const undo = useCallback(() => {
        if (pastRef.current.length === 0) return;
        futureRef.current.push(cloneSnapshot(nodesRef.current, edgesRef.current));
        const prev = pastRef.current.pop()!;
        applySnapshot(prev);
        syncHistoryFlags();
    }, [applySnapshot, syncHistoryFlags]);

    const redo = useCallback(() => {
        if (futureRef.current.length === 0) return;
        pastRef.current.push(cloneSnapshot(nodesRef.current, edgesRef.current));
        const next = futureRef.current.pop()!;
        applySnapshot(next);
        syncHistoryFlags();
    }, [applySnapshot, syncHistoryFlags]);

    const resetHistory = useCallback(() => {
        pastRef.current = [];
        futureRef.current = [];
        syncHistoryFlags();
    }, [syncHistoryFlags]);

    return { pushHistory, undo, redo, resetHistory, canUndo, canRedo };
}
