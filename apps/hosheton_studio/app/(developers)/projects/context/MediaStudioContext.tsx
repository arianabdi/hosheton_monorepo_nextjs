'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {useTranslation} from 'react-i18next';
import type { Edge, Node } from '@xyflow/react';
import type { EdgeTypeOption } from '../types/node-catalog';
import type { StudioNodeData } from '../[projectId]/types/studio';
import { isEdgeTypeOption } from '../lib/workflow-serializer';
import { mediaApi } from '../lib/media-api';
import { getApiErrorMessage } from '../lib/api-client';
import { notifyError } from '@/app/lib/errors';
import { sanitizeLegacyStorageUrl } from '../[projectId]/lib/file-url';
import { RunModeDialog } from '../[projectId]/components/CustomNodes/RunModeDialog';
import { CloneModeDialog, type CloneMode } from '../[projectId]/components/CustomNodes/CloneModeDialog';
import { MissingPromptDialog } from '../[projectId]/components/CustomNodes/MissingPromptDialog';
import type { CostEstimatePayload } from '../components/CostEstimatePanel';
import { GroupDeleteDialog, type GroupDeleteMode } from '../[projectId]/components/CustomNodes/GroupDeleteDialog';
import type { ProcessErrorItem } from '../types/process-errors';
import { useRunStatusRecovery, type RecoveringRun } from '../hooks/useRunStatusRecovery';
import { isTerminalRunStatus } from '../lib/run-lifecycle-events';
import type { RunStatusResponse } from '../types/media-api';
import type { CanvasLod } from '../lib/canvas-lod';
import {
    hasConnectedPrompt,
    nodeRequiresConnectedPrompt,
} from '../lib/studio-connections';
import { isAngleStudioOn } from '../lib/angle-studio';
import { selectionHasExternalEdges } from '../lib/workflow-clipboard-edges';

function edgeTypeStorageKey(projectId: string) {
    return `hosheton-media-edge-type:${projectId}`;
}

import type { AiProviderLog } from '../types/developer-api';

export type DeveloperProviderLogEvent = {
    action: 'created' | 'updated';
    log: AiProviderLog;
};

export type RightPanel = 'editor' | 'logs' | 'comments' | null;
export type RunMode = 'isolated' | 'pipeline';

interface MediaStudioContextValue {
    projectId: string;
    readOnly: boolean;
    selectedNodeId: string | null;
    setSelectedNodeId: (id: string | null) => void;
    edgeType: EdgeTypeOption;
    setEdgeType: (type: EdgeTypeOption) => void;
    runningNodeIds: Set<string>;
    studioSocketConnected: boolean;
    isBrowserOnline: boolean;
    /** True when socket or browser network is down while a run may still be in progress */
    hasConnectionIssue: boolean;
    markNodeRunFinished: (nodeId: string) => void;
    clearAllRunningNodes: () => void;
    setStudioSocketConnected: (connected: boolean) => void;
    /** Opens run-mode dialog for a node */
    requestRunNode: (nodeId: string, nodeLabel?: string) => void;
    runNode: (nodeId: string, mode: RunMode) => Promise<void>;
    runModeDialog: { nodeId: string; nodeLabel?: string } | null;
    closeRunModeDialog: () => void;
    registerNodePatcher: (fn: ((nodeId: string, patch: Partial<StudioNodeData>) => void) | null) => void;
    /** Flush pending workflow save before queueing a run (ensures assetRef fileKey is persisted). */
    registerPreRunSave: (fn: (() => Promise<void>) | null) => void;
    activeRightPanel: RightPanel;
    setActiveRightPanel: Dispatch<SetStateAction<RightPanel>>;
    focusLogNodeId: string | null;
    openLogsForNode: (nodeId: string) => void;
    /** Re-fetch node output from server and reload preview (cache-bust) */
    refreshNodeMedia: (nodeId: string) => Promise<void>;
    /** Copy selected nodes to clipboard (Ctrl+C) */
    copySelectedNodes: () => void;
    /** Paste cloned nodes (Ctrl+V) */
    pasteNodes: () => void;
    /** Duplicate selection or a single node (Ctrl+D) */
    duplicateSelectedNodes: () => void;
    canvasLod: CanvasLod;
    setCanvasLod: (lod: CanvasLod) => void;
    duplicateNodeById: (nodeId: string, options?: { withExternalEdges?: boolean }) => void;
    requestCloneNode: (nodeId: string, nodeLabel?: string) => void;
    registerClipboardHandlers: (handlers: {
        copy: () => void;
        paste: () => void;
        duplicate: () => void;
        duplicateById: (nodeId: string, options?: { withExternalEdges?: boolean }) => void;
    } | null) => void;
    registerWorkflowSnapshot: (
        fn: (() => { nodes: Node[]; edges: Edge[] }) | null,
    ) => void;
    registerProviderLogListener: (fn: ((event: DeveloperProviderLogEvent) => void) | null) => void;
    dispatchProviderLog: (event: DeveloperProviderLogEvent) => void;
    processErrors: ProcessErrorItem[];
    addProcessError: (error: ProcessErrorItem) => void;
    dismissProcessError: (id: string) => void;
    requestGroupDelete: (groupId: string, groupLabel?: string) => void;
    registerGroupDeleteExecutor: (
        fn: ((groupId: string, mode: GroupDeleteMode) => void) | null,
    ) => void;
    registerNodeCostPayloadResolver: (
        fn: ((nodeId: string) => CostEstimatePayload | null) | null,
    ) => void;
    getNodeCostPayload: (nodeId: string) => CostEstimatePayload | null;
    edgeConnectedNodeIds: ReadonlySet<string>;
    setEdgeConnectedNodeIds: (ids: ReadonlySet<string>) => void;
}

const MediaStudioContext = createContext<MediaStudioContextValue | null>(null);

export function MediaStudioProvider({
    projectId,
    readOnly = false,
    children,
}: {
    projectId: string;
    readOnly?: boolean;
    children: ReactNode;
}) {
    const {t} = useTranslation('projects');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [edgeType, setEdgeTypeState] = useState<EdgeTypeOption>(() => {
        if (typeof window === 'undefined') return 'smoothstep';
        const saved = localStorage.getItem(edgeTypeStorageKey(projectId));
        return isEdgeTypeOption(saved) ? saved : 'smoothstep';
    });
    const [runningNodeIds, setRunningNodeIds] = useState<Set<string>>(new Set());
    const [recoveringRunsById, setRecoveringRunsById] = useState<Record<string, RecoveringRun>>({});
    const [studioSocketConnected, setStudioSocketConnected] = useState(true);
    const [isBrowserOnline, setIsBrowserOnline] = useState(true);
    const [runModeDialog, setRunModeDialog] = useState<{ nodeId: string; nodeLabel?: string } | null>(null);
    const [cloneModeDialog, setCloneModeDialog] = useState<{ nodeId: string; nodeLabel?: string } | null>(null);
    const [missingPromptDialog, setMissingPromptDialog] = useState<{ nodeId: string; nodeLabel?: string } | null>(null);
    const [canvasLod, setCanvasLodState] = useState<CanvasLod>('full');
    const nodePatcherRef = useRef<((nodeId: string, patch: Partial<StudioNodeData>) => void) | null>(null);
    const preRunSaveRef = useRef<(() => Promise<void>) | null>(null);
    const workflowSnapshotRef = useRef<(() => { nodes: Node[]; edges: Edge[] }) | null>(null);
    const clipboardHandlersRef = useRef({
        copy: () => {},
        paste: () => {},
        duplicate: () => {},
        duplicateById: (_nodeId: string, _options?: { withExternalEdges?: boolean }) => {
            void _nodeId;
            void _options;
        },
    });
    const providerLogListenerRef = useRef<((event: DeveloperProviderLogEvent) => void) | null>(null);
    const [activeRightPanel, setActiveRightPanel] = useState<RightPanel>('editor');
    const [focusLogNodeId, setFocusLogNodeId] = useState<string | null>(null);
    const [processErrors, setProcessErrors] = useState<ProcessErrorItem[]>([]);
    const [groupDeleteDialog, setGroupDeleteDialog] = useState<{ groupId: string; groupLabel?: string } | null>(null);
    const [edgeConnectedNodeIds, setEdgeConnectedNodeIds] = useState<ReadonlySet<string>>(() => new Set());
    const groupDeleteExecutorRef = useRef<((groupId: string, mode: GroupDeleteMode) => void) | null>(null);
    const nodeCostPayloadResolverRef = useRef<((nodeId: string) => CostEstimatePayload | null) | null>(null);

    const registerNodePatcher = useCallback((fn: ((nodeId: string, patch: Partial<StudioNodeData>) => void) | null) => {
        nodePatcherRef.current = fn;
    }, []);

    const registerPreRunSave = useCallback((fn: (() => Promise<void>) | null) => {
        preRunSaveRef.current = fn;
    }, []);

    const setCanvasLod = useCallback((lod: CanvasLod) => {
        setCanvasLodState((prev) => (prev === lod ? prev : lod));
    }, []);

    const registerWorkflowSnapshot = useCallback((
        fn: (() => { nodes: Node[]; edges: Edge[] }) | null,
    ) => {
        workflowSnapshotRef.current = fn;
    }, []);

    const registerClipboardHandlers = useCallback((handlers: {
        copy: () => void;
        paste: () => void;
        duplicate: () => void;
        duplicateById: (nodeId: string, options?: { withExternalEdges?: boolean }) => void;
    } | null) => {
        if (handlers) {
            clipboardHandlersRef.current = handlers;
        }
    }, []);

    const copySelectedNodes = useCallback(() => {
        clipboardHandlersRef.current.copy();
    }, []);

    const pasteNodes = useCallback(() => {
        clipboardHandlersRef.current.paste();
    }, []);

    const duplicateSelectedNodes = useCallback(() => {
        clipboardHandlersRef.current.duplicate();
    }, []);

    const duplicateNodeById = useCallback((
        nodeId: string,
        options?: { withExternalEdges?: boolean },
    ) => {
        clipboardHandlersRef.current.duplicateById(nodeId, options);
    }, []);

    const requestCloneNode = useCallback((nodeId: string, nodeLabel?: string) => {
        if (readOnly) return;
        const snapshot = workflowSnapshotRef.current?.();
        if (snapshot && selectionHasExternalEdges(snapshot.nodes, snapshot.edges, [nodeId])) {
            setCloneModeDialog({ nodeId, nodeLabel });
            return;
        }
        clipboardHandlersRef.current.duplicateById(nodeId, { withExternalEdges: false });
    }, [readOnly]);

    const closeCloneModeDialog = useCallback(() => {
        setCloneModeDialog(null);
    }, []);

    const confirmCloneNode = useCallback((mode: CloneMode) => {
        if (!cloneModeDialog) return;
        clipboardHandlersRef.current.duplicateById(cloneModeDialog.nodeId, {
            withExternalEdges: mode === 'with-edges',
        });
        setCloneModeDialog(null);
    }, [cloneModeDialog]);

    const registerProviderLogListener = useCallback((fn: ((event: DeveloperProviderLogEvent) => void) | null) => {
        providerLogListenerRef.current = fn;
    }, []);

    const dispatchProviderLog = useCallback((event: DeveloperProviderLogEvent) => {
        providerLogListenerRef.current?.(event);
    }, []);

    const openLogsForNode = useCallback((nodeId: string) => {
        setFocusLogNodeId(nodeId);
        setActiveRightPanel('logs');
    }, []);

    const addProcessError = useCallback((error: ProcessErrorItem) => {
        setProcessErrors((prev) => {
            if (prev.some((item) => item.id === error.id)) return prev;
            return [...prev, error].slice(-50);
        });
    }, []);

    const dismissProcessError = useCallback((id: string) => {
        setProcessErrors((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const requestGroupDelete = useCallback((groupId: string, groupLabel?: string) => {
        if (readOnly) return;
        setGroupDeleteDialog({ groupId, groupLabel });
    }, [readOnly]);

    const closeGroupDeleteDialog = useCallback(() => {
        setGroupDeleteDialog(null);
    }, []);

    const registerGroupDeleteExecutor = useCallback((
        fn: ((groupId: string, mode: GroupDeleteMode) => void) | null,
    ) => {
        groupDeleteExecutorRef.current = fn;
    }, []);

    const registerNodeCostPayloadResolver = useCallback((
        fn: ((nodeId: string) => CostEstimatePayload | null) | null,
    ) => {
        nodeCostPayloadResolverRef.current = fn;
    }, []);

    const getNodeCostPayload = useCallback((nodeId: string) => {
        return nodeCostPayloadResolverRef.current?.(nodeId) ?? null;
    }, []);

    const confirmGroupDelete = useCallback((mode: GroupDeleteMode) => {
        if (!groupDeleteDialog) return;
        groupDeleteExecutorRef.current?.(groupDeleteDialog.groupId, mode);
        setGroupDeleteDialog(null);
    }, [groupDeleteDialog]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const syncOnline = () => setIsBrowserOnline(navigator.onLine);
        syncOnline();
        window.addEventListener('online', syncOnline);
        window.addEventListener('offline', syncOnline);
        return () => {
            window.removeEventListener('online', syncOnline);
            window.removeEventListener('offline', syncOnline);
        };
    }, []);

    const markNodeRunFinished = useCallback((nodeId: string) => {
        setRunningNodeIds((prev) => {
            if (!prev.has(nodeId)) return prev;
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
        });
    }, []);

    const clearAllRunningNodes = useCallback(() => {
        setRunningNodeIds(new Set());
    }, []);

    const hasConnectionIssue = !studioSocketConnected || !isBrowserOnline;

    const setEdgeType = useCallback((type: EdgeTypeOption) => {
        setEdgeTypeState(type);
        if (typeof window !== 'undefined') {
            localStorage.setItem(edgeTypeStorageKey(projectId), type);
        }
    }, [projectId]);

    const requestRunNode = useCallback((nodeId: string, nodeLabel?: string) => {
        if (readOnly) return;
        if (runningNodeIds.has(nodeId)) {
            nodePatcherRef.current?.(nodeId, {
                runError: t('already_queued'),
            });
            setActiveRightPanel('logs');
            setFocusLogNodeId(nodeId);
            return;
        }
        const snapshot = workflowSnapshotRef.current?.();
        const node = snapshot?.nodes.find((candidate) => candidate.id === nodeId);
        const nodeType = node?.type;
        // Generation nodes can run standalone from their own inline prompt —
        // the connected-prompt requirement only applies when the node has none.
        const hasOwnPrompt = Boolean(String((node?.data as StudioNodeData | undefined)?.promptText || '').trim())
            // «زاویه و نور» پرامپت هر نما را خودش می‌سازد؛ متن فقط توضیح اختیاری است
            || isAngleStudioOn((node?.data as StudioNodeData | undefined)?.angleStudio);
        if (
            nodeRequiresConnectedPrompt(nodeType)
            && snapshot
            && !hasConnectedPrompt(nodeId, snapshot.edges)
            && !hasOwnPrompt
        ) {
            setMissingPromptDialog({ nodeId, nodeLabel });
            return;
        }
        setRunModeDialog({ nodeId, nodeLabel });
    }, [readOnly, runningNodeIds, t]);

    const closeRunModeDialog = useCallback(() => {
        setRunModeDialog(null);
    }, []);

    const closeMissingPromptDialog = useCallback(() => {
        setMissingPromptDialog(null);
    }, []);

    const refreshNodeMedia = useCallback(async (nodeId: string) => {
        if (readOnly) return;
        const { project } = await mediaApi.getProject(projectId);
        const serverNode = project.nodes?.find((n) => n.id === nodeId);
        if (!serverNode?.data) return;

        const sd = serverNode.data as StudioNodeData;
        const patch: Partial<StudioNodeData> = {
            previewCacheKey: Date.now(),
        };

        if (sd.imageUrl) patch.imageUrl = sanitizeLegacyStorageUrl(String(sd.imageUrl));
        if (Array.isArray(sd.images) && sd.images.length) {
            patch.images = sd.images.map((u) => sanitizeLegacyStorageUrl(String(u)));
        }
        if (sd.videoUrl) patch.videoUrl = sanitizeLegacyStorageUrl(String(sd.videoUrl));
        if (Array.isArray(sd.videos) && sd.videos.length) {
            patch.videos = sd.videos.map((u) => sanitizeLegacyStorageUrl(String(u)));
        }
        if (sd.audioUrl) patch.audioUrl = String(sd.audioUrl);
        if (sd.videoDurationSeconds) patch.videoDurationSeconds = sd.videoDurationSeconds;
        if (sd.audioDurationSeconds) patch.audioDurationSeconds = sd.audioDurationSeconds;
        if (sd.mediaMetadata) patch.mediaMetadata = sd.mediaMetadata;
        if (sd.status) patch.status = sd.status;
        patch.runError = sd.runError ? String(sd.runError) : undefined;
        if (sd.cost) patch.cost = sd.cost;
        if (Array.isArray(sd.costHistory)) patch.costHistory = sd.costHistory;
        if (typeof sd.totalCost === 'number') patch.totalCost = sd.totalCost;

        nodePatcherRef.current?.(nodeId, patch);

        if (sd.status === 'success' || sd.status === 'error') {
            markNodeRunFinished(nodeId);
        }
    }, [projectId, readOnly, markNodeRunFinished]);

    const recoveringRuns = useMemo(
        () => Object.values(recoveringRunsById),
        [recoveringRunsById],
    );

    const reconcileTerminalRun = useCallback(async (
        recoveringRun: RecoveringRun,
        status: RunStatusResponse,
    ) => {
        if (!isTerminalRunStatus(status.status)) return;

        for (const nodeId of recoveringRun.nodeIds) {
            try {
                await refreshNodeMedia(nodeId);
            } catch {
                // The terminal run payload below is sufficient to release UI
                // even if refreshing persisted media temporarily fails.
            }

            const result = status.nodeResults?.[nodeId] as Record<string, unknown> | undefined;
            const failed = status.status === 'FAILED'
                || status.status === 'CANCELLED'
                || String(result?.status || '').toLowerCase() === 'error'
                || Boolean(result?.error);
            nodePatcherRef.current?.(nodeId, {
                status: failed ? 'error' : 'success',
                runError: failed
                    ? status.errorMessage || String(result?.error || t('node_failed'))
                    : undefined,
                progress: failed ? undefined : 100,
            });
            markNodeRunFinished(nodeId);
        }

        setRecoveringRunsById((current) => {
            if (!current[recoveringRun.runId]) return current;
            const next = { ...current };
            delete next[recoveringRun.runId];
            return next;
        });
    }, [markNodeRunFinished, refreshNodeMedia, t]);

    useRunStatusRecovery({
        projectId,
        connected: studioSocketConnected && isBrowserOnline,
        runs: recoveringRuns,
        onTerminal: reconcileTerminalRun,
    });

    const hydrateActiveRuns = useCallback(async () => {
        if (!projectId || readOnly) return;
        try {
            const { runs } = await mediaApi.listRuns(projectId, { page: 1, limit: 30, active: true });
            const active = (runs || []).filter((run) => run.status === 'PENDING' || run.status === 'RUNNING');
            if (!active.length) return;

            setRecoveringRunsById((current) => {
                const next = { ...current };
                for (const run of active) {
                    const nodeIds = (run.executionOrder || []).filter(Boolean);
                    if (!nodeIds.length) continue;
                    next[run._id] = { runId: run._id, nodeIds };
                    for (const nodeId of nodeIds) {
                        const queued = run.status === 'PENDING' || run.jobState === 'waiting' || run.jobState === 'delayed';
                        nodePatcherRef.current?.(nodeId, {
                            status: 'running',
                            runError: queued
                                ? t('previous_still', {state: run.jobStateLabel || t('queued')})
                                : undefined,
                            progress: queued ? 0 : undefined,
                        });
                    }
                }
                return next;
            });

            setRunningNodeIds((prev) => {
                const next = new Set(prev);
                for (const run of active) {
                    for (const nodeId of run.executionOrder || []) {
                        if (nodeId) next.add(nodeId);
                    }
                }
                return next;
            });
        } catch {
            // Keep local running state if the status snapshot is temporarily unavailable.
        }
    }, [projectId, readOnly, t]);

    useEffect(() => {
        if (!studioSocketConnected || !isBrowserOnline) return;
        void hydrateActiveRuns();
    }, [hydrateActiveRuns, isBrowserOnline, studioSocketConnected]);

    const runNode = useCallback(async (nodeId: string, mode: RunMode) => {
        if (readOnly) return;
        setRunModeDialog(null);
        nodePatcherRef.current?.(nodeId, {
            status: 'running',
            runError: undefined,
            generatingIndex: 0,
            progress: 0,
        });
        setRunningNodeIds((prev) => new Set(prev).add(nodeId));
        try {
            await preRunSaveRef.current?.();
            const response = mode === 'isolated'
                ? await mediaApi.runNode(projectId, { nodeId })
                : await mediaApi.runPipeline(projectId, { targetNodeIds: [nodeId] });
            const runId = response.run._id;
            setRecoveringRunsById((current) => ({
                ...current,
                [runId]: { runId, nodeIds: [nodeId] },
            }));
        } catch (err) {
            notifyError(err);
            nodePatcherRef.current?.(nodeId, {
                status: 'error',
                runError: getApiErrorMessage(err, t('start_error')),
                progress: undefined,
            });
            markNodeRunFinished(nodeId);
        }
    }, [projectId, readOnly, markNodeRunFinished, t]);

    const value = useMemo(
        () => ({
            projectId,
            readOnly,
            selectedNodeId,
            setSelectedNodeId,
            edgeType,
            setEdgeType,
            runningNodeIds,
            studioSocketConnected,
            isBrowserOnline,
            hasConnectionIssue,
            markNodeRunFinished,
            clearAllRunningNodes,
            setStudioSocketConnected,
            requestRunNode,
            runNode,
            runModeDialog,
            closeRunModeDialog,
            registerNodePatcher,
            registerPreRunSave,
            activeRightPanel,
            setActiveRightPanel,
            focusLogNodeId,
            openLogsForNode,
            refreshNodeMedia,
            copySelectedNodes,
            pasteNodes,
            duplicateSelectedNodes,
            duplicateNodeById,
            requestCloneNode,
            registerClipboardHandlers,
            registerWorkflowSnapshot,
            canvasLod,
            setCanvasLod,
            registerProviderLogListener,
            dispatchProviderLog,
            processErrors,
            addProcessError,
            dismissProcessError,
            requestGroupDelete,
            registerGroupDeleteExecutor,
            registerNodeCostPayloadResolver,
            getNodeCostPayload,
            edgeConnectedNodeIds,
            setEdgeConnectedNodeIds,
        }),
        [
            projectId,
            readOnly,
            selectedNodeId,
            edgeType,
            setEdgeType,
            runningNodeIds,
            studioSocketConnected,
            isBrowserOnline,
            hasConnectionIssue,
            markNodeRunFinished,
            clearAllRunningNodes,
            requestRunNode,
            runNode,
            runModeDialog,
            closeRunModeDialog,
            registerNodePatcher,
            registerPreRunSave,
            activeRightPanel,
            focusLogNodeId,
            openLogsForNode,
            refreshNodeMedia,
            copySelectedNodes,
            pasteNodes,
            duplicateSelectedNodes,
            duplicateNodeById,
            requestCloneNode,
            registerClipboardHandlers,
            registerWorkflowSnapshot,
            canvasLod,
            setCanvasLod,
            registerProviderLogListener,
            dispatchProviderLog,
            processErrors,
            addProcessError,
            dismissProcessError,
            requestGroupDelete,
            registerGroupDeleteExecutor,
            registerNodeCostPayloadResolver,
            getNodeCostPayload,
            edgeConnectedNodeIds,
            setEdgeConnectedNodeIds,
        ],
    );

    return (
        <MediaStudioContext.Provider value={value}>
            {children}
            <RunModeDialog
                open={!!runModeDialog}
                nodeId={runModeDialog?.nodeId}
                nodeLabel={runModeDialog?.nodeLabel}
                onClose={closeRunModeDialog}
                onSelect={(mode) => {
                    if (runModeDialog) void runNode(runModeDialog.nodeId, mode);
                }}
            />
            <CloneModeDialog
                open={!!cloneModeDialog}
                nodeLabel={cloneModeDialog?.nodeLabel}
                onClose={closeCloneModeDialog}
                onSelect={confirmCloneNode}
            />
            <MissingPromptDialog
                open={!!missingPromptDialog}
                nodeLabel={missingPromptDialog?.nodeLabel}
                onClose={closeMissingPromptDialog}
            />
            <GroupDeleteDialog
                open={!!groupDeleteDialog}
                groupLabel={groupDeleteDialog?.groupLabel}
                onClose={closeGroupDeleteDialog}
                onSelect={confirmGroupDelete}
            />
        </MediaStudioContext.Provider>
    );
}

export function useMediaStudio() {
    const ctx = useContext(MediaStudioContext);
    if (!ctx) throw new Error('useMediaStudio must be used within MediaStudioProvider');
    return ctx;
}
