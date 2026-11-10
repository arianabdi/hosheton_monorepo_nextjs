'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
    Background,
    BackgroundVariant,
    Handle,
    Position,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    type Node,
    type NodeProps,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import { LuLock, LuWorkflow } from 'react-icons/lu';
import type { ExploreWorkflowPreview as ExploreWorkflowGraph } from '@/app/(marketplace)/lib/types';
import styles from './ExploreWorkflowPreview.module.scss';

function PreviewNode({ data }: NodeProps) {
    return (
        <div className={styles.node}>
            <Handle type="target" position={Position.Left} isConnectable={false} />
            <span>{String((data as { label?: string })?.label || '')}</span>
            <Handle type="source" position={Position.Right} isConnectable={false} />
        </div>
    );
}

const nodeTypes = { preview: PreviewNode };

function CanvasInner({
    graph,
    locked,
    active,
}: {
    graph: ExploreWorkflowGraph;
    locked: boolean;
    active: boolean;
}) {
    const { fitView } = useReactFlow();
    const wrapRef = useRef<HTMLDivElement>(null);
    const nodes = useMemo<Node[]>(
        () => graph.nodes.map((node) => ({
            id: node.id,
            type: 'preview',
            position: node.position || { x: 0, y: 0 },
            data: { label: node.label || 'Node' },
            draggable: false,
            selectable: false,
            connectable: false,
        })),
        [graph.nodes],
    );
    const edges = useMemo<Edge[]>(
        () => graph.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            selectable: false,
            focusable: false,
        })),
        [graph.edges],
    );

    useEffect(() => {
        if (!nodes.length || !active) return;
        const run = () => fitView({ padding: 0.24, duration: 220 });
        const timer = window.setTimeout(run, 80);
        const ro = wrapRef.current ? new ResizeObserver(() => run()) : null;
        if (wrapRef.current && ro) ro.observe(wrapRef.current);
        return () => {
            window.clearTimeout(timer);
            ro?.disconnect();
        };
    }, [nodes, fitView, active]);

    if (!nodes.length) {
        return (
            <div className={styles.empty}>
                <LuWorkflow size={28} />
            </div>
        );
    }

    return (
        <div ref={wrapRef} className={styles.flowHost}>
            <ReactFlow
                className={styles.flow}
                style={{ width: '100%', height: '100%' }}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                nodesFocusable={false}
                edgesFocusable={false}
                panOnDrag={!locked}
                zoomOnScroll={!locked}
                zoomOnPinch={!locked}
                zoomOnDoubleClick={!locked}
                preventScrolling={!locked}
                fitView
                minZoom={0.2}
                maxZoom={1.6}
                deleteKeyCode={null}
                selectNodesOnDrag={false}
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            </ReactFlow>
        </div>
    );
}

export function ExploreWorkflowPreview({
    graph,
    locked = false,
    loading = false,
    active = true,
}: {
    graph: ExploreWorkflowGraph | null;
    locked?: boolean;
    loading?: boolean;
    active?: boolean;
}) {
    const { t } = useTranslation('marketplace');

    if (loading && !graph?.nodes?.length) {
        return (
            <div className={styles.empty}>
                <span className={styles.loading}>{t('loading_workflow')}</span>
            </div>
        );
    }

    if (!graph?.nodes?.length) {
        if (locked) {
            return (
                <div className={`${styles.wrap} ${styles.wrapLocked}`}>
                    <div className={styles.empty}>
                        <LuWorkflow size={28} />
                    </div>
                    <div className={styles.lockOverlay}>
                        <LuLock size={22} />
                        <span>{t('workflow_locked')}</span>
                    </div>
                </div>
            );
        }
        return (
            <div className={styles.empty}>
                <LuWorkflow size={28} />
            </div>
        );
    }

    return (
        <div className={`${styles.wrap} ${locked ? styles.wrapLocked : ''}`}>
            <ReactFlowProvider>
                <CanvasInner graph={graph} locked={locked} active={active} />
            </ReactFlowProvider>
            {locked ? (
                <div className={styles.lockOverlay}>
                    <LuLock size={22} />
                    <span>{t('workflow_locked')}</span>
                </div>
            ) : null}
        </div>
    );
}
