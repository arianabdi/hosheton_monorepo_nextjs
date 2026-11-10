'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { WorkflowEdge, WorkflowNode } from '@/app/(developers)/projects/types/media-api';
import { STUDIO_NODE_TYPES } from '@/app/(developers)/projects/lib/studio-node-types';
import { deserializeWorkflow } from '@/app/(developers)/projects/lib/workflow-serializer';
import { ensureGroupDimensions, sortNodesForRender } from '@/app/(developers)/projects/lib/group-utils';
import { MediaStudioProvider } from '@/app/(developers)/projects/context/MediaStudioContext';
import styles from './template-view.module.scss';

interface TemplateReadOnlyCanvasProps {
    templateId: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

function CanvasInner({ nodes: rawNodes, edges: rawEdges }: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) {
    const { fitView } = useReactFlow();
    const safeNodes = Array.isArray(rawNodes) ? rawNodes : [];
    const safeEdges = Array.isArray(rawEdges) ? rawEdges : [];
    const workflowKey = useMemo(
        () => JSON.stringify({ nodes: safeNodes, edges: safeEdges }),
        [safeNodes, safeEdges],
    );
    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => deserializeWorkflow(safeNodes, safeEdges),
        [workflowKey, safeNodes, safeEdges],
    );
    const preparedNodes = useMemo(
        () => sortNodesForRender(initialNodes.map(ensureGroupDimensions)),
        [initialNodes],
    );
    const [nodes, setNodes] = useNodesState(preparedNodes);
    const [edges, setEdges] = useEdgesState(initialEdges);
    const handleNodesChange = useCallback(() => {}, []);
    const handleEdgesChange = useCallback(() => {}, []);

    useEffect(() => {
        setNodes(preparedNodes);
        setEdges(initialEdges);
    }, [workflowKey, preparedNodes, initialEdges, setNodes, setEdges]);

    useEffect(() => {
        if (!nodes.length) return;
        const timer = setTimeout(() => fitView({ padding: 0.18, duration: 250 }), 120);
        return () => clearTimeout(timer);
    }, [nodes.length, workflowKey, fitView]);

    return (
        <div className={styles.canvasWrap}>
            <ReactFlow
                className={styles.readOnlyFlow}
                style={{ width: '100%', height: '100%' }}
                nodes={nodes}
                edges={edges}
                nodeTypes={STUDIO_NODE_TYPES}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                nodesDraggable={false}
                nodesConnectable={false}
                edgesReconnectable={false}
                elementsSelectable={false}
                nodesFocusable={false}
                selectNodesOnDrag={false}
                panOnDrag
                zoomOnScroll
                fitView
                minZoom={0.15}
                maxZoom={2}
                deleteKeyCode={null}
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}

export function TemplateReadOnlyCanvas({ templateId, nodes, edges }: TemplateReadOnlyCanvasProps) {
    return (
        <MediaStudioProvider projectId={`template-preview-${templateId}`} readOnly>
            <ReactFlowProvider>
                <CanvasInner nodes={nodes} edges={edges} />
            </ReactFlowProvider>
        </MediaStudioProvider>
    );
}
