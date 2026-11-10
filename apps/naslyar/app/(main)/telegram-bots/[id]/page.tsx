'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Background,
    Controls,
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type Node,
    type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from '../TelegramBots.module.scss';
import parentStyles from '../../marketing/Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import Link from 'next/link';
import { getBot, updateBot } from '../telegram-bots-api';
import {
    NODE_LABELS,
    createDefaultNodeData,
    createNodeId,
    type TelegramBot,
    type TelegramBotFlowEdge,
    type TelegramBotFlowNode,
    type TelegramBotNodeType,
} from '../telegram-bots.types';
import FlowNode, { type FlowNodeData } from './components/FlowNode';
import NodeConfigPanel from './components/NodeConfigPanel';

const nodeTypes: NodeTypes = { flow: FlowNode as never };

const defaultEdgeOptions = {
    type: 'smoothstep',
    style: { stroke: '#64748b', strokeWidth: 2 },
};

function toFlowNodes(nodes: TelegramBotFlowNode[]): Node[] {
    return nodes.map((n) => ({
        id: n.id,
        type: 'flow',
        position: n.position,
        data: { ...n.data, nodeType: n.type } as unknown as Record<string, unknown>,
    }));
}

function toFlowEdges(edges: TelegramBotFlowEdge[]): Edge[] {
    return edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? 'next',
    }));
}

export default function TelegramBotEditorPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <ReactFlowProvider>
            <EditorInner params={params} />
        </ReactFlowProvider>
    );
}

function EditorInner({ params }: { params: Promise<{ id: string }> }) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [botId, setBotId] = useState('');
    const [botName, setBotName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    useEffect(() => {
        void params.then((p) => setBotId(p.id));
    }, [params]);

    useEffect(() => {
        if (!token || !botId) return;
        (async () => {
            try {
                setLoading(true);
                const bot = await getBot(baseUrl, token, botId);
                setBotName(bot.name);
                setNodes(toFlowNodes(bot.graph?.nodes ?? []));
                setEdges(toFlowEdges(bot.graph?.edges ?? []));
            } catch (e) {
                ErrorToaster(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [baseUrl, token, botId, setNodes, setEdges]);

    const selectedNode = nodes.find((n) => n.selected);
    const variables = useMemo(() => {
        const set = new Set<string>();
        nodes.forEach((n) => {
            const d = n.data as unknown as FlowNodeData;
            if (d.saveTo) set.add(d.saveTo);
            (d.buttons ?? []).forEach((b) => b.saveTo && set.add(b.saveTo));
        });
        return [...set];
    }, [nodes]);

    const onConnect = useCallback(
        (connection: Connection) => {
            setEdges((eds) =>
                addEdge(
                    {
                        ...connection,
                        id: createNodeId('edge'),
                        sourceHandle: connection.sourceHandle ?? 'next',
                        ...defaultEdgeOptions,
                    },
                    eds,
                ),
            );
        },
        [setEdges],
    );

    const addNode = (type: TelegramBotNodeType) => {
        const id = createNodeId(type);
        setNodes((ns) => [
            ...ns,
            {
                id,
                type: 'flow',
                position: { x: 100 + ns.length * 60, y: 100 + ns.length * 40 },
                data: { ...createDefaultNodeData(type), nodeType: type } as unknown as Record<string, unknown>,
            },
        ]);
    };

    const updateSelected = (patch: Record<string, unknown>) => {
        if (!selectedNode) return;
        setNodes((ns) =>
            ns.map((n) =>
                n.id === selectedNode.id
                    ? { ...n, data: { ...n.data, ...patch } as Record<string, unknown> }
                    : n,
            ),
        );
    };

    const deleteSelected = () => {
        if (!selectedNode) return;
        const id = selectedNode.id;
        setNodes((ns) => ns.filter((n) => n.id !== id));
        setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    };

    const save = async () => {
        if (!token || !botId) return;
        try {
            setSaving(true);
            const graph = {
                nodes: nodes.map((n) => ({
                    id: n.id,
                    type: (n.data as unknown as FlowNodeData).nodeType,
                    position: n.position,
                    data: { ...(n.data as unknown as FlowNodeData) },
                })),
                edges: edges.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle ?? 'next',
                })),
            };
            // strip runtime-only field from persisted data
            graph.nodes.forEach((n) => delete (n.data as Record<string, unknown>).nodeType);
            await updateBot(baseUrl, token, botId, { graph });
            SuccessToaster({ message: 'سناریو ذخیره شد' });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;

    const selectedData = selectedNode ? (selectedNode.data as unknown as FlowNodeData) : null;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>طراحی سناریو — {botName}</h1>
                            <p className={parentStyles.subtitle}>گره‌ها را از پالت اضافه کنید و با اتصال‌ها، مسیر گفتگو را بسازید</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="button" className={parentStyles.secondaryBtn} onClick={() => history.back()}>
                                بازگشت
                            </button>
                            <button type="button" className={parentStyles.primaryBtn} onClick={save} disabled={saving}>
                                {saving ? 'در حال ذخیره...' : 'ذخیره سناریو'}
                            </button>
                        </div>
                    </header>

                    <div className={styles.editorLayout}>
                        <aside className={styles.palette}>
                            <p className={styles.paletteTitle}>گره‌ها</p>
                            {(Object.keys(NODE_LABELS) as TelegramBotNodeType[]).map((type) => (
                                <button key={type} type="button" className={styles.paletteItem} onClick={() => addNode(type)}>
                                    + {NODE_LABELS[type]}
                                </button>
                            ))}
                        </aside>

                        <div className={styles.canvasWrap}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                defaultEdgeOptions={defaultEdgeOptions}
                                deleteKeyCode={['Delete', 'Backspace']}
                                multiSelectionKeyCode={['Shift']}
                                fitView
                                dir="ltr"
                            >
                                <Background />
                                <Controls />
                            </ReactFlow>
                        </div>

                        <aside className={styles.configPanel}>
                            {selectedData ? (
                                <>
                                    <NodeConfigPanel
                                        nodeType={selectedData.nodeType}
                                        data={selectedData}
                                        variables={variables}
                                        onChange={updateSelected}
                                    />
                                    <button type="button" className={parentStyles.deleteBtn} style={{ marginTop: '1rem' }} onClick={deleteSelected}>
                                        حذف گره
                                    </button>
                                </>
                            ) : (
                                <p className={styles.hint}>یک گره را انتخاب کنید تا تنظیمات آن نمایش داده شود.</p>
                            )}
                        </aside>
                    </div>

                    <p className={styles.hint}>
                        برای فعال‌سازی بات، از <Link href="/telegram-bots" className={parentStyles.editLink}>فهرست بات‌ها</Link> وب‌هوک را ثبت کنید.
                    </p>
                </div>
            </Wrapper>
        </Container>
    );
}
