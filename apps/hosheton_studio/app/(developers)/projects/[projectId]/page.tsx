'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {useTranslation} from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    useNodesState,
    useEdgesState,
    NodeTypes,
    useReactFlow,
    ReactFlowProvider,
    addEdge,
    useStoreApi,
    type Connection,
    type Node,
    type Edge,
    type NodeChange,
    type EdgeChange,
    type OnSelectionChangeParams,
    type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { catalogLabel } from '@/app/lib/i18n/catalogLabel';
import { useMobileShellStore } from '@/app/zustand/store/useMobileShellStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import { canUseDeveloperTools } from '@/app/lib/user-roles';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useStudioExploreStore } from '@/app/zustand/store/useStudioExploreStore';

import {
    LuFolderOpen, LuMessageSquare, LuMousePointerClick,
    LuStickyNote, LuBug, LuLayoutTemplate,
    LuCopy,
} from 'react-icons/lu';
import { MdOutlineContentPasteGo } from 'react-icons/md';
import { VscDeveloperTools } from 'react-icons/vsc';

import styles from './project-view.module.scss';
import {
    StartTriggerNode, NoteNode,
    PromptNode, AssetRefNode, AvatarRefNode,
    TextToImageNode, TextToVideoNode, AiAvatarNode, MusicSfxNode,
    ResultGalleryNode, RenderOutputNode,
    CustomGroupNode, LegacyFallbackNode,
} from './components/CustomNodes/CustomNodes';
import { ProcessLogPanel } from './components/ProcessLogPanel/ProcessLogPanel';
import { SidebarTabBar } from '../components/SidebarTabBar/SidebarTabBar';
import { ProcessErrorNotifier } from './components/ProcessErrorNotifier/ProcessErrorNotifier';
import { CommentsPanel } from './components/CommentsPanel/CommentsPanel';
import { NavbarEdgeTypeMenu } from './components/NavbarEdgeTypeMenu/NavbarEdgeTypeMenu';
import { NavbarSaveButton } from './components/NavbarSaveButton/NavbarSaveButton';
import { NavbarHistoryZoom } from './components/NavbarHistoryZoom/NavbarHistoryZoom';
import { useDeveloperToolsStore } from '@/app/zustand/store/useDeveloperToolsStore';
import type { StudioNodeData } from './types/studio';
import type { MediaJobLog } from '../types/media-api';
import { mediaApi } from '../lib/media-api';
import { nodeCatalogApi } from '../lib/node-catalog-api';
import { deserializeWorkflow, applyEdgePresentation, applyEdgeSelectionPresentation, inferEdgeTypeFromEdges, isEdgeTypeOption, EDGE_PRESENTATION_STYLE } from '../lib/workflow-serializer';
import { useAutoSaveWorkflow } from '../hooks/useAutoSaveWorkflow';
import { useWorkflowUndo } from '../hooks/useWorkflowUndo';
import { useWorkflowClipboard } from '../hooks/useWorkflowClipboard';
import { useMediaStudioSocket } from '../hooks/useMediaStudioSocket';
import { MediaStudioProvider, useMediaStudio } from '../context/MediaStudioContext';
import { NodeSettingsPanel } from '../components/NodeSettingsPanel';
import type { NodeCatalogEntry, EdgeTypeOption } from '../types/node-catalog';
import {
    STUDIO_TOOLBOX_GROUP_LABEL_KEY,
    STUDIO_TOOLBOX_ICONS,
    STUDIO_TOOLBOX_INPUT_GROUP_LABEL_KEY,
    STUDIO_TOOLBOX_INPUT_SHORTCUTS,
    STUDIO_TOOLBOX_SHORTCUTS,
} from '../lib/studio-toolbox-config';
import {
    getInvalidStudioEdges,
    isValidStudioConnection,
} from '../lib/studio-connections';
import { buildNodeCostEstimatePayload } from '../lib/build-node-cost-estimate';
import { connectionRadiusForLod, zoomToCanvasLod } from '../lib/canvas-lod';
import { readWorkflowViewport, writeWorkflowViewport } from '../lib/workflow-viewport';
import {
    assignNodeToGroup,
    buildGroupNode,
    createGroupFromNodes,
    ensureGroupDimensions,
    getViewportCenterFlowPosition,
    GROUP_MIN_HEIGHT,
    GROUP_MIN_WIDTH,
    isNodeInsideGroup,
    removeNodeFromGroup,
    deleteGroupKeepNodes,
    deleteGroupWithChildren,
    filterEdgesForGroupDelete,
    getGroupChildIds,
    sortNodesForRender,
} from '../lib/group-utils';
import {
    claimOsClipboardForNodeCopy,
    extractClipboardMediaFiles,
    isAssetRefPasteTarget,
    isEditablePasteTarget,
    type ClipboardMediaFile,
} from './lib/clipboard-media';
import { isModLetter } from '../lib/keyboard-shortcut';
import { enqueuePendingAssetFiles } from './lib/asset-upload-session';
import { PasteMediaModeDialog, type PasteMediaMode } from './components/CustomNodes/PasteMediaModeDialog';
import { getHoshetonErrorMessage } from '@/app/lib/errors';
import { AngleStudioGlyph } from '../components/AngleStudio/AngleStudioGlyph';
import { defaultAngleStudioState, FALLBACK_ANGLE_CONFIG, withResolvedShots } from '../lib/angle-studio';

const CANVAS_MIN_ZOOM = 0.2;
const CANVAS_MAX_ZOOM = 2;
/** حداکثر جابه‌جایی که هنوز «تپ/کلیک» روی نود حساب می‌شود (بیشتر = پن، نه انتخاب). */
const NODE_TAP_SLOP_MOUSE_PX = 4;
const NODE_TAP_SLOP_TOUCH_PX = 10;
// Trackpad pinch on Windows sends small ctrl+wheel deltas; boost them (d3 only
// does this on macOS) while keeping real mouse notches at the familiar step.
const PINCH_WHEEL_COEF = 0.0075;
const NOTCH_WHEEL_COEF = 0.002;
const MAX_WHEEL_STEP = 0.5;

const clampWheelStep = (value: number) => Math.min(MAX_WHEEL_STEP, Math.max(-MAX_WHEEL_STEP, value));

// Mouse wheels emit whole notches (line mode or large integer deltas) while
// trackpads emit small fractional deltas — that difference decides zoom vs pan.
const isDiscreteMouseWheel = (event: WheelEvent) => {
    if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return true;
    const magnitude = Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY));
    return Number.isInteger(event.deltaX) && Number.isInteger(event.deltaY) && magnitude >= 40;
};

function CanvasInner() {
    const {t} = useTranslation('projects');
    const {t: tc} = useTranslation('common');
    const { projectId } = useParams<{ projectId: string }>();
    const router = useRouter();
    const { fitView, screenToFlowPosition, zoomIn, zoomOut, getZoom, getViewport, setViewport, getIntersectingNodes } = useReactFlow();
    const flowStore = useStoreApi();
    const userRoles = useAppStore((state) => state.roles);
    const lang = useAppStore((state) => state.lang);
    const token = useAuthStore((s) => s.token);
    const canUseDevTools = canUseDeveloperTools(userRoles);
    const {
        edgeType, setEdgeType, setSelectedNodeId, selectedNodeId, registerNodePatcher, registerPreRunSave,
        registerClipboardHandlers, registerNodeCostPayloadResolver, setEdgeConnectedNodeIds,
        registerWorkflowSnapshot, canvasLod, setCanvasLod,
        activeRightPanel, setActiveRightPanel, focusLogNodeId,
        markNodeRunFinished, clearAllRunningNodes, setStudioSocketConnected,
        readOnly, dispatchProviderLog, addProcessError,
        registerGroupDeleteExecutor, requestGroupDelete,
    } = useMediaStudio();

    const [projectTitle, setProjectTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<NodeCatalogEntry[]>([]);
    const [pendingPasteMedia, setPendingPasteMedia] = useState<ClipboardMediaFile[] | null>(null);
    const [liveLogs, setLiveLogs] = useState<MediaJobLog[]>([]);
    const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
    // جای کادر پرامپت/اجرای نود: پایین سایدبار، بیرون از ناحیه اسکرول
    const [nodeFooterSlot, setNodeFooterSlot] = useState<HTMLDivElement | null>(null);
    const selectedNodesRef = useRef<Node[]>([]);
    const openDeveloperTools = useDeveloperToolsStore((state) => state.openDeveloperTools);
    const isMobile = useMobileViewport();
    const [lassoArmed, setLassoArmed] = useState(false);
    const [octopusPos, setOctopusPos] = useState<{ x: number; y: number } | null>(null);
    const holdTimerRef = useRef<number | null>(null);
    const holdStartRef = useRef<{ x: number; y: number } | null>(null);
    const holdMovedRef = useRef(false);
    const octopusRef = useRef<HTMLDivElement>(null);
    const lassoBoxRef = useRef<HTMLDivElement>(null);
    const flowWrapperRef = useRef<HTMLDivElement>(null);
    const tapGuardRef = useRef({ pointers: new Set<number>(), x: 0, y: 0, moved: false });
    const lassoArmedRef = useRef(false);
    const lassoRafRef = useRef<number | null>(null);
    const lastLassoIdsRef = useRef<string>('');
    const pointerIdRef = useRef<number | null>(null);
    const pointerActiveRef = useRef(false);

    const dragHistoryPushed = useRef(false);
    const resizeHistoryIds = useRef<Set<string>>(new Set());

    const nodeTypes = useMemo<NodeTypes>(() => ({
        // Active nodes
        startTrigger: StartTriggerNode,
        note: NoteNode,
        prompt: PromptNode,
        assetRef: AssetRefNode,
        avatarRef: AvatarRefNode,
        textToImage: TextToImageNode,
        textToVideo: TextToVideoNode,
        aiAvatar: AiAvatarNode,
        musicSfx: MusicSfxNode,
        resultGallery: ResultGalleryNode,
        render: RenderOutputNode,
        customGroup: CustomGroupNode,
        // Legacy fallback — renders a placeholder for any removed node type in old saved workflows
        imageToVideo: LegacyFallbackNode,
        tts: LegacyFallbackNode,
        aspectRatio: LegacyFallbackNode,
        cameraMotion: LegacyFallbackNode,
        inpainting: LegacyFallbackNode,
        audioMixer: LegacyFallbackNode,
        imageGen: LegacyFallbackNode,
        videoGen: LegacyFallbackNode,
        audioGen: LegacyFallbackNode,
        logic: LegacyFallbackNode,
        sync: LegacyFallbackNode,
    }), []);

    const catalogByType = useMemo(() => {
        const map = new Map<string, NodeCatalogEntry>();
        catalog.forEach((c) => map.set(c.type, c));
        return map;
    }, [catalog]);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const handleJobLog = useCallback((log: MediaJobLog) => {
        setLiveLogs((prev) => (prev.some((l) => l._id === log._id) ? prev : [...prev, log].slice(-300)));
    }, []);

    useMediaStudioSocket(projectId, setNodes, {
        onJobLog: handleJobLog,
        onNodeRunFinished: markNodeRunFinished,
        onRunFailed: clearAllRunningNodes,
        onProcessError: addProcessError,
        onSocketConnectionChange: setStudioSocketConnected,
        onProviderLog: (payload) => {
            dispatchProviderLog({
                action: payload.action,
                log: payload.log as unknown as import('../types/developer-api').AiProviderLog,
            });
        },
    });
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

    const { pushHistory, undo, redo, resetHistory, canUndo, canRedo } = useWorkflowUndo(nodes, edges, setNodes, setEdges);

    const executeGroupDelete = useCallback((groupId: string, mode: 'keepNodes' | 'withNodes') => {
        pushHistory();
        setNodes((currentNodes) => {
            const nextNodes = mode === 'keepNodes'
                ? deleteGroupKeepNodes(groupId, currentNodes)
                : deleteGroupWithChildren(groupId, currentNodes);
            setEdges((currentEdges) => filterEdgesForGroupDelete(groupId, mode, currentNodes, currentEdges));

            const removedIds = mode === 'withNodes'
                ? new Set([groupId, ...getGroupChildIds(groupId, currentNodes)])
                : new Set([groupId]);
            if (selectedNodeId && removedIds.has(selectedNodeId)) {
                setSelectedNodeId(null);
            }
            selectedNodesRef.current = selectedNodesRef.current.filter((n) => !removedIds.has(n.id));
            setSelectedNodes((prev) => prev.filter((n) => !removedIds.has(n.id)));

            return nextNodes;
        });
    }, [pushHistory, setNodes, setEdges, selectedNodeId, setSelectedNodeId]);

    useEffect(() => {
        registerGroupDeleteExecutor(executeGroupDelete);
        return () => registerGroupDeleteExecutor(null);
    }, [registerGroupDeleteExecutor, executeGroupDelete]);

    const handleBeforeDelete = useCallback(async ({
        nodes: nodesToDelete,
    }: {
        nodes: Node[];
        edges: Edge[];
    }) => {
        const group = nodesToDelete.find((node) => node.type === 'customGroup');
        if (!group) return true;
        const groupData = group.data as StudioNodeData;
        requestGroupDelete(group.id, groupData.label || t('group'));
        return false;
    }, [requestGroupDelete, t]);

    const [zoomPercent, setZoomPercent] = useState(100);
    const [lockCanvasZoom, setLockCanvasZoom] = useState(false);

    const handleZoomIn = useCallback(() => {
        zoomIn({ duration: 180 });
    }, [zoomIn]);

    const handleZoomOut = useCallback(() => {
        zoomOut({ duration: 180 });
    }, [zoomOut]);

    const handleZoomReset = useCallback(() => {
        const viewport = getViewport();
        setViewport({ ...viewport, zoom: 1 }, { duration: 180 });
    }, [getViewport, setViewport]);

    const handleViewportMove = useCallback(() => {
        // پن/زوم در حین لمس → کلیک بعدی روی نود «تپ» حساب نشود
        if (tapGuardRef.current.pointers.size > 0) tapGuardRef.current.moved = true;
        const zoom = getZoom();
        setZoomPercent(Math.round(zoom * 100));
        setCanvasLod(zoomToCanvasLod(zoom));
    }, [getZoom, setCanvasLod]);

    useEffect(() => {
        const root = flowWrapperRef.current;
        if (!root) return;
        const isZoomLockTarget = (target: EventTarget | null) =>
            target instanceof HTMLElement && Boolean(target.closest('[data-lock-canvas-zoom="true"], .nowheel'));
        const onFocusIn = (event: FocusEvent) => {
            if (isZoomLockTarget(event.target)) setLockCanvasZoom(true);
        };
        const onFocusOut = (event: FocusEvent) => {
            if (isZoomLockTarget(event.target) && !isZoomLockTarget(event.relatedTarget)) {
                setLockCanvasZoom(false);
            }
        };
        root.addEventListener('focusin', onFocusIn);
        root.addEventListener('focusout', onFocusOut);
        return () => {
            root.removeEventListener('focusin', onFocusIn);
            root.removeEventListener('focusout', onFocusOut);
        };
    }, []);

    // رفتار اسکرول بوم: چرخ موس = زوم، ctrl+چرخ/پینچ تاچ‌پد = زوم حساس‌تر (حتی روی
    // متن نود پرامپت، تا مرورگر صفحه را زوم نکند)، دو انگشت تاچ‌پد = پن آزاد.
    useEffect(() => {
        const root = flowWrapperRef.current;
        if (!root) return;

        const zoomAtPointer = (event: WheelEvent, factor: number) => {
            const [x, y, currentZoom] = flowStore.getState().transform;
            const nextZoom = Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, currentZoom * factor));
            if (!Number.isFinite(nextZoom) || nextZoom === currentZoom) return;
            const rect = root.getBoundingClientRect();
            const pointerX = event.clientX - rect.left;
            const pointerY = event.clientY - rect.top;
            const ratio = nextZoom / currentZoom;
            setViewport({
                x: pointerX - (pointerX - x) * ratio,
                y: pointerY - (pointerY - y) * ratio,
                zoom: nextZoom,
            }, { duration: 0 });
        };

        const onWheel = (event: WheelEvent) => {
            if (event.defaultPrevented) return;
            const { panBy } = flowStore.getState();
            const target = event.target;
            const inScrollLock = target instanceof HTMLElement
                && Boolean(target.closest('[data-lock-canvas-zoom="true"], .nowheel'));

            if (event.ctrlKey || event.metaKey) {
                // پینچ تاچ‌پد به‌صورت ctrl+wheel می‌آید؛ همیشه زوم بوم، نه زوم مرورگر.
                event.preventDefault();
                event.stopPropagation();
                const magnitude = Math.min(Math.abs(event.deltaY), 120);
                const coef = magnitude <= 50 ? PINCH_WHEEL_COEF : NOTCH_WHEEL_COEF;
                const step = clampWheelStep(-Math.sign(event.deltaY) * magnitude * coef);
                zoomAtPointer(event, Math.pow(2, step));
                return;
            }

            // چرخ ساده روی متن‌ها/اسکرول‌های داخلی نودها: اسکرول بومی خودشان
            if (inScrollLock) return;

            event.preventDefault();
            event.stopPropagation();

            if (event.deltaY === 0 && event.deltaX !== 0) {
                panBy({ x: -event.deltaX, y: 0 });
                return;
            }

            if (isDiscreteMouseWheel(event)) {
                // چرخ موس: مثل حالت عادی، زوم داخل/خارج
                const exponent = event.deltaMode === 1
                    ? -event.deltaY * 0.05
                    : -event.deltaY * NOTCH_WHEEL_COEF;
                zoomAtPointer(event, Math.pow(2, clampWheelStep(exponent)));
                return;
            }

            // دو انگشت تاچ‌پد: پن آزاد در همه جهات
            panBy({ x: -event.deltaX, y: -event.deltaY });
        };

        root.addEventListener('wheel', onWheel, { passive: false, capture: true });
        return () => root.removeEventListener('wheel', onWheel, { capture: true });
    }, [flowStore, setViewport]);

    const getSelectedNodeIds = useCallback(() => {
        const fromRef = selectedNodesRef.current.map((n) => n.id);
        if (fromRef.length > 0) return fromRef;
        if (selectedNodeId) return [selectedNodeId];
        return [];
    }, [selectedNodeId]);

    const handlePastedNodes = useCallback((newNodeIds: string[]) => {
        if (newNodeIds.length === 1) {
            setSelectedNodeId(newNodeIds[0]);
        } else if (newNodeIds.length > 1) {
            setSelectedNodeId(null);
        }
    }, [setSelectedNodeId]);

    const {
        copySelection,
        pasteSelection,
        duplicateSelection,
        duplicateNodesById,
        canPaste,
    } = useWorkflowClipboard({
        nodes,
        edges,
        setNodes,
        setEdges,
        pushHistory,
        getSelectedNodeIds,
        edgeType,
        readOnly,
    });

    const handleCopy = useCallback(() => {
        if (copySelection()) {
            claimOsClipboardForNodeCopy();
        }
    }, [copySelection]);

    const handlePaste = useCallback(() => {
        const newIds = pasteSelection();
        handlePastedNodes(newIds);
    }, [pasteSelection, handlePastedNodes]);

    const handleDuplicate = useCallback(() => {
        const newIds = duplicateSelection();
        handlePastedNodes(newIds);
    }, [duplicateSelection, handlePastedNodes]);

    const handleDuplicateNodeById = useCallback((
        nodeId: string,
        options?: { withExternalEdges?: boolean },
    ) => {
        const newIds = duplicateNodesById([nodeId], options);
        handlePastedNodes(newIds);
    }, [duplicateNodesById, handlePastedNodes]);

    useEffect(() => {
        registerClipboardHandlers({
            copy: handleCopy,
            paste: handlePaste,
            duplicate: handleDuplicate,
            duplicateById: handleDuplicateNodeById,
        });
        return () => registerClipboardHandlers(null);
    }, [registerClipboardHandlers, handleCopy, handlePaste, handleDuplicate, handleDuplicateNodeById]);

    const prepareWorkflowSave = useCallback(async (saveNodes: Node[], saveEdges: Edge[]) => {
        const invalidEdges = getInvalidStudioEdges(saveEdges, saveNodes);
        if (!invalidEdges.length) return { nodes: saveNodes, edges: saveEdges };

        const summary = invalidEdges.slice(0, 8).map((edge) => {
            const source = saveNodes.find((node) => node.id === edge.source);
            const target = saveNodes.find((node) => node.id === edge.target);
            const sourceLabel = String((source?.data as StudioNodeData | undefined)?.label || source?.type || edge.source);
            const targetLabel = String((target?.data as StudioNodeData | undefined)?.label || target?.type || edge.target);
            return `• ${sourceLabel} → ${targetLabel}`;
        }).join('\n');
        const remainder = invalidEdges.length > 8 ? t('more_edges', {count: formatAppNumber(invalidEdges.length - 8, lang)}) : '';
        const shouldRemove = window.confirm(
            t('incompatible_edges', {
                count: formatAppNumber(invalidEdges.length, lang),
                summary,
                remainder,
            }),
        );
        if (!shouldRemove) return null;

        const invalidIds = new Set(invalidEdges.map((edge) => edge.id));
        const validEdges = saveEdges.filter((edge) => !invalidIds.has(edge.id));
        setEdges(validEdges);
        return { nodes: saveNodes, edges: validEdges };
    }, [setEdges, t, lang]);

    const {
        saveStatus,
        saveError,
        finishHydration,
        scheduleSave,
        saveNow,
    } = useAutoSaveWorkflow(projectId, projectTitle, prepareWorkflowSave);

    const fitViewRef = useRef(fitView);
    const setViewportRef = useRef(setViewport);
    const getViewportRef = useRef(getViewport);
    const finishHydrationRef = useRef(finishHydration);
    const resetHistoryRef = useRef(resetHistory);
    const savedViewport = useMemo(() => readWorkflowViewport(projectId), [projectId]);
    const viewportPersistableRef = useRef(false);
    useEffect(() => {
        fitViewRef.current = fitView;
        setViewportRef.current = setViewport;
        getViewportRef.current = getViewport;
        finishHydrationRef.current = finishHydration;
        resetHistoryRef.current = resetHistory;
    }, [fitView, setViewport, getViewport, finishHydration, resetHistory]);

    const defaultEdgeOptions = useMemo(
        () => ({ type: edgeType, animated: false, style: EDGE_PRESENTATION_STYLE, interactionWidth: 24 }),
        [edgeType],
    );

    const editorPanelOpen = useMobileShellStore((state) => state.editorPanelOpen);
    const setEditorPanelOpen = useMobileShellStore((state) => state.setEditorPanelOpen);

    const displayNodes = useMemo(
        () => nodes.map((node) => {
            const sized = ensureGroupDimensions(node);
            if (!isMobile) return sized;
            return {
                ...sized,
                draggable: Boolean(sized.selected) && !lassoArmed,
            };
        }),
        [nodes, isMobile, lassoArmed],
    );
    const displayEdges = useMemo(() => {
        const invalidIds = new Set(getInvalidStudioEdges(edges, nodes).map((edge) => edge.id));
        return edges.map((edge) => {
            const presented = applyEdgePresentation({
                ...edge,
                type: isEdgeTypeOption(edge.type) ? edge.type : edgeType,
            });
            return applyEdgeSelectionPresentation(presented, invalidIds.has(edge.id));
        });
    }, [edges, nodes, edgeType]);

    const selectedNode = useMemo(() => {
        if (selectedNodeId) {
            const match = nodes.find((n) => n.id === selectedNodeId);
            if (match) return match;
        }
        if (selectedNodes.length === 1) return selectedNodes[0];
        return null;
    }, [selectedNodeId, nodes, selectedNodes]);

    const hasNodeSelection = selectedNodes.length > 0 || Boolean(selectedNodeId);
    const canCopyNodes = hasNodeSelection && !readOnly;
    const canPasteNodes = canPaste && !readOnly;

    useEffect(() => {
        nodeCatalogApi.list().then((res) => setCatalog(res.nodes ?? [])).catch(() => setCatalog([]));
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (isEditablePasteTarget(e.target)) return;

            if (isModLetter(e, 'z') && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            if (isModLetter(e, 'y') || (isModLetter(e, 'z') && e.shiftKey)) {
                e.preventDefault();
                redo();
                return;
            }
            if (readOnly) return;

            if (isModLetter(e, 'c')) {
                e.preventDefault();
                handleCopy();
                return;
            }
            if (isModLetter(e, 'd')) {
                e.preventDefault();
                handleDuplicate();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [undo, redo, readOnly, handleCopy, handleDuplicate]);

    useEffect(() => {
        let cancelled = false;

        async function loadProject() {
            setLoading(true);
            setLoadError(null);
            try {
                const { project } = await mediaApi.getProject(projectId);
                if (cancelled) return;

                setProjectTitle(project.title);
                setActiveTemplateId(project.templateId ?? null);

                const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(
                    project.nodes ?? [],
                    project.edges ?? [],
                );

                setNodes(sortNodesForRender(loadedNodes.map(ensureGroupDimensions)));
                setEdges(loadedEdges);
                setEdgeType(inferEdgeTypeFromEdges(loadedEdges));
                resetHistoryRef.current();
                setSelectedNodes([]);

                requestAnimationFrame(() => {
                    finishHydrationRef.current();
                    const stored = readWorkflowViewport(projectId);
                    if (stored) {
                        setViewportRef.current(stored, { duration: 0 });
                    } else if (loadedNodes.length) {
                        setTimeout(() => fitViewRef.current({ padding: 0.15, duration: 300 }), 50);
                    }
                    viewportPersistableRef.current = true;
                });
            } catch (err) {
                if (!cancelled) {
                    setLoadError(getHoshetonErrorMessage(err, { fallback: t('load_error') }));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadProject();
        return () => { cancelled = true; };
    }, [projectId, setNodes, setEdges, setEdgeType, t]);

    useEffect(() => {
        viewportPersistableRef.current = false;
        const persistViewport = () => {
            if (!viewportPersistableRef.current) return;
            writeWorkflowViewport(projectId, getViewportRef.current());
        };
        const onPageHide = () => persistViewport();
        window.addEventListener('pagehide', onPageHide);
        return () => {
            persistViewport();
            window.removeEventListener('pagehide', onPageHide);
        };
    }, [projectId]);

    useEffect(() => {
        scheduleSave(nodes, edges);
    }, [nodes, edges, scheduleSave]);

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        let shouldPush = false;

        for (const change of changes) {
            if (change.type === 'remove' || change.type === 'add') {
                shouldPush = true;
            }
            if (change.type === 'dimensions' && change.resizing) {
                if (!resizeHistoryIds.current.has(change.id)) {
                    shouldPush = true;
                    resizeHistoryIds.current.add(change.id);
                }
            }
            if (change.type === 'dimensions' && change.resizing === false) {
                resizeHistoryIds.current.delete(change.id);
            }
        }

        if (shouldPush) pushHistory();
        onNodesChange(changes);
    }, [onNodesChange, pushHistory]);

    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
        if (changes.some((c) => c.type === 'remove' || c.type === 'add')) {
            pushHistory();
        }
        onEdgesChange(changes);
    }, [onEdgesChange, pushHistory]);

    const onSelectionChange = useCallback(({ nodes: sel, edges: selEdges }: OnSelectionChangeParams) => {
        selectedNodesRef.current = sel;
        setSelectedNodes(sel);
        if (sel.length === 1) {
            setSelectedNodeId(sel[0].id);
        } else if (sel.length === 0) {
            setSelectedNodeId(null);
        }

        const connectedNodeIds = new Set<string>();
        for (const edge of selEdges) {
            connectedNodeIds.add(edge.source);
            connectedNodeIds.add(edge.target);
        }
        setEdgeConnectedNodeIds(connectedNodeIds);
    }, [setSelectedNodeId, setEdgeConnectedNodeIds]);

    // تشخیص «تپ واقعی» از پن/پینچ: اگر انگشت/موس جابه‌جا شد، دو انگشتی بود یا صفحه
    // حرکت کرد، کلیکی که بعدش روی نود می‌رسد نود را انتخاب نکند و تنظیماتش را باز نکند.

    const handleTapGuardDown = useCallback((event: React.PointerEvent) => {
        const guard = tapGuardRef.current;
        if (guard.pointers.size === 0) {
            guard.x = event.clientX;
            guard.y = event.clientY;
            guard.moved = false;
        } else {
            guard.moved = true;
        }
        guard.pointers.add(event.pointerId);
    }, []);

    const handleTapGuardMove = useCallback((event: React.PointerEvent) => {
        const guard = tapGuardRef.current;
        if (guard.moved || !guard.pointers.has(event.pointerId)) return;
        const dx = event.clientX - guard.x;
        const dy = event.clientY - guard.y;
        const slop = event.pointerType === 'mouse' ? NODE_TAP_SLOP_MOUSE_PX : NODE_TAP_SLOP_TOUCH_PX;
        if ((dx * dx) + (dy * dy) > slop * slop) guard.moved = true;
    }, []);

    const handleTapGuardUp = useCallback((event: React.PointerEvent) => {
        tapGuardRef.current.pointers.delete(event.pointerId);
    }, []);

    const handleTapGuardClick = useCallback((event: React.MouseEvent) => {
        if (!tapGuardRef.current.moved) return;
        const target = event.target as HTMLElement | null;
        if (!target?.closest('.react-flow__node')) return;
        event.stopPropagation();
        event.preventDefault();
    }, []);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
        setActiveRightPanel('editor');
        if (isMobile) setEditorPanelOpen(true);
    }, [setSelectedNodeId, setActiveRightPanel, isMobile, setEditorPanelOpen]);

    const onConnect = useCallback((connection: Connection) => {
        if (!isValidStudioConnection(connection, nodes)) return;
        pushHistory();
        setEdges((eds) => addEdge(applyEdgePresentation({ ...connection, type: edgeType } as Edge), eds));
    }, [setEdges, edgeType, pushHistory, nodes]);

    const isValidConnection = useCallback((connection: Connection | Edge) => {
        return isValidStudioConnection(connection, nodes);
    }, [nodes]);

    const handleEdgeTypeChange = useCallback((newType: EdgeTypeOption) => {
        setEdgeType(newType);
        pushHistory();
        setEdges((eds) => eds.map((edge) => applyEdgePresentation({ ...edge, type: newType })));
    }, [setEdgeType, setEdges, pushHistory]);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, [setSelectedNodeId]);

    const addNewNode = useCallback((type: string, defaultData?: Record<string, unknown>) => {
        pushHistory();
        const id = `node-${Date.now()}`;
        const entry = catalogByType.get(type);
        const isNote = type === 'note';
        const nodeWidth = isNote ? 260 : 300;
        const nodeHeight = isNote ? 180 : 120;
        const position = getViewportCenterFlowPosition(screenToFlowPosition, nodeWidth, nodeHeight);
        setNodes((nds) => sortNodesForRender([...nds, {
            id,
            type,
            position,
            data: {
                ...(entry?.defaultData ?? {}),
                ...(defaultData ?? {}),
                // میان‌برهای از پیش تنظیم‌شده (مثل «زاویه و نور») برچسب خودشان را دارند
                label: (typeof defaultData?.label === 'string' && defaultData.label) || catalogLabel(entry, lang) || type,
                ...(isNote ? { noteColor: 'yellow' } : {}),
            },
            ...(isNote ? { style: { width: 260, height: 180 }, width: 260, height: 180, zIndex: 0 } : {}),
        }]));
    }, [setNodes, catalogByType, pushHistory, screenToFlowPosition, lang]);

    const addAngleStudioNode = useCallback(() => {
        addNewNode('textToImage', {
            label: t('angle_studio_title'),
            angleStudio: withResolvedShots(defaultAngleStudioState(), FALLBACK_ANGLE_CONFIG),
        });
    }, [addNewNode, t]);

    const pendingCanvasInsert = useStudioExploreStore((s) => s.pendingCanvasInsert);
    const clearCanvasInsert = useStudioExploreStore((s) => s.clearCanvasInsert);

    useEffect(() => {
        if (!pendingCanvasInsert) return;
        if (pendingCanvasInsert.kind === 'prompt') {
            addNewNode('prompt', { promptText: pendingCanvasInsert.promptText });
        } else if (pendingCanvasInsert.kind === 'assetRefs') {
            // یک یا چند فایل گالری — حتی با نوع‌های مختلف (تصویر/ویدیو/صوت) — همه در یک نود
            // reference؛ هر فایل با منشن جداگانه قابل ارجاع است
            const assets = pendingCanvasInsert.items;
            const first = assets[0];
            if (first) {
                addNewNode('assetRef', {
                    assetType: first.type,
                    fileId: first.fileId,
                    fileKey: first.fileKey,
                    externalUrl: first.externalUrl || first.url,
                    fileName: first.label,
                    assets,
                });
            }
        } else {
            const media = pendingCanvasInsert.media;
            const mediaType = String(media.type) === 'video'
                ? 'video'
                : String(media.type) === 'audio'
                    ? 'audio'
                    : 'image';
            addNewNode('assetRef', {
                assetType: mediaType,
                externalUrl: media.url,
                fileId: media.fileId,
                fileKey: media.fileKey,
                fileName: media.label,
                assetUrl: media.url,
                assets: [{
                    id: `media-${media.fileId || media.fileKey || media.url}`,
                    type: mediaType,
                    label: media.label || mediaType,
                    fileId: media.fileId,
                    fileKey: media.fileKey,
                    externalUrl: media.url,
                    url: media.url,
                    thumbnailUrlLarge: media.thumbnailUrlLarge,
                    width: media.width,
                    height: media.height,
                }],
            });
        }
        clearCanvasInsert();
    }, [pendingCanvasInsert, addNewNode, clearCanvasInsert]);

    const addEmptyGroup = useCallback(() => {
        pushHistory();
        const position = getViewportCenterFlowPosition(
            screenToFlowPosition,
            GROUP_MIN_WIDTH,
            GROUP_MIN_HEIGHT,
        );
        const id = `group-${Date.now()}`;
        const groupNode = buildGroupNode(
            id,
            position,
            GROUP_MIN_WIDTH,
            GROUP_MIN_HEIGHT,
        );
        setNodes((nds) => sortNodesForRender([...nds, groupNode]));
    }, [setNodes, screenToFlowPosition, pushHistory]);

    const handleGroupAction = useCallback(() => {
        const currentSelection = selectedNodesRef.current.length > 0
            ? selectedNodesRef.current
            : selectedNodes;

        const selectedGroups = currentSelection.filter((n) => n.type === 'customGroup');
        const selectedRegular = currentSelection.filter((n) => n.type !== 'customGroup' && n.type !== 'note');

        if (selectedGroups.length === 1 && selectedRegular.length > 0) {
            pushHistory();
            const group = selectedGroups[0];
            setNodes((nds) => sortNodesForRender(nds.map((n) => {
                if (!selectedRegular.some((s) => s.id === n.id)) return n;
                return assignNodeToGroup(n, group, nds);
            })));
            return;
        }

        if (selectedRegular.length >= 1) {
            pushHistory();
            setNodes((nds) => sortNodesForRender(createGroupFromNodes(selectedRegular, nds)));
            setSelectedNodes([]);
            return;
        }

        addEmptyGroup();
    }, [selectedNodes, setNodes, addEmptyGroup, pushHistory]);

    const onNodeDragStart = useCallback(() => {
        if (!dragHistoryPushed.current) {
            pushHistory();
            dragHistoryPushed.current = true;
        }
    }, [pushHistory]);

    const onNodeDragStop: OnNodeDrag<Node> = useCallback((_, draggedNode) => {
        dragHistoryPushed.current = false;

        if (draggedNode.type === 'customGroup' || draggedNode.type === 'note') return;

        const nds = nodes;
        const groups = nds.filter((n) => n.type === 'customGroup' && n.id !== draggedNode.id);
        const targetGroup = groups.find((g) => isNodeInsideGroup(draggedNode, g, nds));

        if (targetGroup && draggedNode.parentId !== targetGroup.id) {
            pushHistory();
            setNodes(sortNodesForRender(nds.map((n) =>
                n.id === draggedNode.id ? assignNodeToGroup(n, targetGroup, nds) : n,
            )));
            return;
        }

        if (!targetGroup && draggedNode.parentId) {
            const parent = nds.find((n) => n.id === draggedNode.parentId);
            if (parent && !isNodeInsideGroup(draggedNode, parent, nds)) {
                pushHistory();
                setNodes(sortNodesForRender(nds.map((n) =>
                    n.id === draggedNode.id ? removeNodeFromGroup(n, nds) : n,
                )));
            }
        }
    }, [nodes, setNodes, pushHistory]);

    const updateNodeData = useCallback((nodeId: string, data: Partial<StudioNodeData>) => {
        setNodes((nds) => nds.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
        ));
    }, [setNodes]);

    const pasteClipboardMedia = useCallback((mediaFiles: ClipboardMediaFile[], mode: PasteMediaMode = 'separate') => {
        if (readOnly || !mediaFiles.length) return;
        if (!token) {
            addProcessError({
                id: `paste-media-${Date.now()}`,
                message: t('login_first'),
                timestamp: new Date().toISOString(),
            });
            return;
        }

        pushHistory();
        const entry = catalogByType.get('assetRef');
        const origin = getViewportCenterFlowPosition(screenToFlowPosition, 300, 120);
        const stamp = Date.now();
        const batches = mode === 'combined'
            ? [{ id: `node-${stamp}-0`, items: mediaFiles, position: origin }]
            : mediaFiles.map((item, index) => ({
                id: `node-${stamp}-${index}`,
                items: [item],
                position: { x: origin.x + index * 36, y: origin.y + index * 36 },
            }));

        const created = batches.map((batch) => {
            const first = batch.items[0];
            const node: Node = {
                id: batch.id,
                type: 'assetRef',
                position: batch.position,
                selected: true,
                data: {
                    ...(entry?.defaultData ?? {}),
                    label: catalogLabel(entry, lang) || t('asset_ref'),
                    assetType: first.assetType,
                    fileName: batch.items.length === 1
                        ? first.file.name
                        : t('paste_media_files_label', { count: batch.items.length }),
                },
            };
            return { id: batch.id, files: batch.items.map((item) => item.file), node };
        });

        setNodes((current) => sortNodesForRender([
            ...current.map((node) => ({ ...node, selected: false })),
            ...created.map((item) => item.node),
        ]));
        handlePastedNodes(created.map((item) => item.id));
        created.forEach(({ id, files }) => {
            enqueuePendingAssetFiles(id, files);
        });
    }, [
        readOnly,
        token,
        addProcessError,
        t,
        pushHistory,
        catalogByType,
        screenToFlowPosition,
        lang,
        setNodes,
        handlePastedNodes,
    ]);

    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            if (readOnly) return;
            if (isEditablePasteTarget(e.target)) return;
            if (isAssetRefPasteTarget(document.activeElement) || isAssetRefPasteTarget(e.target)) return;

            const mediaFiles = extractClipboardMediaFiles(e.clipboardData);
            if (mediaFiles.length) {
                e.preventDefault();
                if (mediaFiles.length === 1) {
                    void pasteClipboardMedia(mediaFiles, 'separate');
                } else {
                    setPendingPasteMedia(mediaFiles);
                }
                return;
            }
            if (canPaste) {
                e.preventDefault();
                handlePaste();
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [readOnly, canPaste, handlePaste, pasteClipboardMedia]);

    useEffect(() => {
        registerNodePatcher(updateNodeData);
        return () => registerNodePatcher(null);
    }, [registerNodePatcher, updateNodeData]);

    useEffect(() => {
        registerPreRunSave(saveNow);
        return () => registerPreRunSave(null);
    }, [registerPreRunSave, saveNow]);

    useEffect(() => {
        registerNodeCostPayloadResolver((nodeId) => {
            const node = nodes.find((candidate) => candidate.id === nodeId);
            if (!node) return null;
            return buildNodeCostEstimatePayload(node, nodes, edges);
        });
        return () => registerNodeCostPayloadResolver(null);
    }, [registerNodeCostPayloadResolver, nodes, edges]);

    useEffect(() => {
        registerWorkflowSnapshot(() => ({ nodes, edges }));
        return () => registerWorkflowSnapshot(null);
    }, [registerWorkflowSnapshot, nodes, edges]);

    const handleOpenCreateTemplate = useCallback(async () => {
        if (loading || activeTemplateId) return;
        try {
            await saveNow();
        } catch {
            // still navigate; canvas autosave may already have persisted
        }
        router.push(`/templates/new?kind=workflow&sourceProjectId=${encodeURIComponent(projectId)}`);
    }, [loading, activeTemplateId, saveNow, router, projectId]);

    const preventFocusSteal = useCallback((e: React.MouseEvent) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'OPTION') return;
        e.preventDefault();
    }, []);

    const LASSO_HOLD_MS = 750;
    const LASSO_MOVE_CANCEL_PX2 = 10 * 10;

    const clearLassoHold = useCallback(() => {
        if (holdTimerRef.current != null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        holdStartRef.current = null;
        holdMovedRef.current = false;
        pointerIdRef.current = null;
    }, []);

    const hideLassoBox = useCallback(() => {
        const box = lassoBoxRef.current;
        if (!box) return;
        box.style.display = 'none';
        box.style.width = '0px';
        box.style.height = '0px';
    }, []);

    const abortActivePan = useCallback((pointerId: number, x: number, y: number) => {
        const renderer = flowWrapperRef.current?.querySelector('.react-flow__renderer') as (HTMLElement & { __zooming?: unknown }) | null;
        if (renderer) {
            delete renderer.__zooming;
            try {
                const touch = new Touch({
                    identifier: pointerId,
                    target: renderer,
                    clientX: x,
                    clientY: y,
                });
                renderer.dispatchEvent(new TouchEvent('touchcancel', {
                    bubbles: true,
                    cancelable: true,
                    touches: [],
                    targetTouches: [],
                    changedTouches: [touch],
                }));
            } catch {
                renderer.dispatchEvent(new Event('touchcancel', { bubbles: true, cancelable: true }));
            }
        }
        flowStore.getState().panZoom?.destroy();
        flowStore.getState().resetSelectedElements();
        flowStore.setState({ userSelectionActive: true, paneDragging: false });
    }, [flowStore]);

    const applyLassoSelection = useCallback((clientX: number, clientY: number) => {
        const start = holdStartRef.current;
        if (!start) return;
        const a = screenToFlowPosition({ x: start.x, y: start.y });
        const b = screenToFlowPosition({ x: clientX, y: clientY });
        const rect = {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            width: Math.abs(b.x - a.x),
            height: Math.abs(b.y - a.y),
        };
        if (rect.width < 4 && rect.height < 4) return;
        const hits = getIntersectingNodes(rect, true);
        const idSet = new Set(hits.map((node) => node.id));
        const ids = [...idSet].sort().join(',');
        if (ids === lastLassoIdsRef.current) return;
        lastLassoIdsRef.current = ids;
        setNodes((nds) => nds.map((node) => {
            const selected = idSet.has(node.id);
            return node.selected === selected ? node : { ...node, selected };
        }));
        setEdges((eds) => eds.map((edge) => {
            const selected = idSet.has(edge.source) || idSet.has(edge.target);
            return edge.selected === selected ? edge : { ...edge, selected };
        }));
    }, [getIntersectingNodes, screenToFlowPosition, setNodes, setEdges]);

    const isEmptyPaneTarget = useCallback((target: EventTarget | null) => {
        const el = target as HTMLElement | null;
        if (!el) return false;
        if (el.closest('.react-flow__node, .react-flow__handle, .react-flow__controls, .react-flow__minimap, .react-flow__edge')) {
            return false;
        }
        return Boolean(el.closest('.react-flow__pane, .react-flow__background, .react-flow__container'));
    }, []);

    const handleFlowPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!isMobile || event.pointerType === 'mouse') return;
        if (!event.isPrimary) {
            holdMovedRef.current = true;
            if (holdTimerRef.current != null) {
                window.clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
            }
            return;
        }
        if (!isEmptyPaneTarget(event.target)) return;
        clearLassoHold();
        hideLassoBox();
        lassoArmedRef.current = false;
        lastLassoIdsRef.current = '';
        pointerActiveRef.current = true;
        pointerIdRef.current = event.pointerId;
        holdMovedRef.current = false;
        holdStartRef.current = { x: event.clientX, y: event.clientY };
        holdTimerRef.current = window.setTimeout(() => {
            holdTimerRef.current = null;
            if (holdMovedRef.current || !pointerActiveRef.current) return;
            const start = holdStartRef.current;
            const pointerId = pointerIdRef.current;
            if (!start || pointerId == null) return;
            lassoArmedRef.current = true;
            abortActivePan(pointerId, start.x, start.y);
            try {
                flowWrapperRef.current?.setPointerCapture(pointerId);
            } catch {
                // capture is best-effort; custom lasso still tracks wrapper events
            }
            setLassoArmed(true);
            setOctopusPos({ x: start.x, y: start.y });
        }, LASSO_HOLD_MS);
    }, [isMobile, isEmptyPaneTarget, clearLassoHold, hideLassoBox, abortActivePan]);

    const handleFlowPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
        if (octopusRef.current) {
            octopusRef.current.style.left = `${event.clientX}px`;
            octopusRef.current.style.top = `${event.clientY}px`;
        }
        const start = holdStartRef.current;
        if (!start) return;
        if (lassoArmedRef.current) {
            event.preventDefault();
            const x = Math.min(start.x, event.clientX);
            const y = Math.min(start.y, event.clientY);
            const w = Math.abs(event.clientX - start.x);
            const h = Math.abs(event.clientY - start.y);
            const box = lassoBoxRef.current;
            if (box) {
                box.style.display = w < 2 && h < 2 ? 'none' : 'block';
                box.style.left = `${x}px`;
                box.style.top = `${y}px`;
                box.style.width = `${w}px`;
                box.style.height = `${h}px`;
            }
            if (lassoRafRef.current != null) return;
            const clientX = event.clientX;
            const clientY = event.clientY;
            lassoRafRef.current = window.requestAnimationFrame(() => {
                lassoRafRef.current = null;
                applyLassoSelection(clientX, clientY);
            });
            return;
        }
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if ((dx * dx) + (dy * dy) > LASSO_MOVE_CANCEL_PX2) {
            holdMovedRef.current = true;
            if (holdTimerRef.current != null) {
                window.clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
            }
        }
    }, [applyLassoSelection]);

    const handleFlowPointerUp = useCallback((event?: React.PointerEvent<HTMLDivElement>) => {
        if (event && pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
        if (lassoRafRef.current != null) {
            window.cancelAnimationFrame(lassoRafRef.current);
            lassoRafRef.current = null;
        }
        const pointerId = event?.pointerId ?? pointerIdRef.current;
        if (pointerId != null) {
            try {
                flowWrapperRef.current?.releasePointerCapture(pointerId);
            } catch {
                // already released
            }
        }
        const hadLasso = lassoArmedRef.current;
        lassoArmedRef.current = false;
        pointerActiveRef.current = false;
        hideLassoBox();
        clearLassoHold();
        flowStore.setState({
            userSelectionActive: false,
            userSelectionRect: null,
            nodesSelectionActive: hadLasso && lastLassoIdsRef.current.length > 0,
        });
        setLassoArmed(false);
        setOctopusPos(null);
    }, [clearLassoHold, hideLassoBox, flowStore]);

    useEffect(() => () => {
        if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current);
        if (lassoRafRef.current != null) window.cancelAnimationFrame(lassoRafRef.current);
    }, []);

    if (loadError) {
        return (
            <div className={styles.canvasContainer}>
                <div className={styles.loadingOverlay}>{loadError}</div>
            </div>
        );
    }

    return (
        <div className={styles.canvasContainer}>
            {loading && <div className={styles.loadingOverlay}>{t('loading_workflow')}</div>}

            <div
                ref={flowWrapperRef}
                className={styles.flowWrapper}
                data-canvas-lod={canvasLod}
                onPointerDown={handleFlowPointerDown}
                onPointerMove={handleFlowPointerMove}
                onPointerUp={handleFlowPointerUp}
                onPointerCancel={handleFlowPointerUp}
                onPointerDownCapture={handleTapGuardDown}
                onPointerMoveCapture={handleTapGuardMove}
                onPointerUpCapture={handleTapGuardUp}
                onPointerCancelCapture={handleTapGuardUp}
                onClickCapture={handleTapGuardClick}
            >
                <ProcessErrorNotifier />
                <ReactFlow
                    nodes={displayNodes}
                    edges={displayEdges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onConnect={onConnect}
                    isValidConnection={isValidConnection}
                    onSelectionChange={onSelectionChange}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDragStop={onNodeDragStop}
                    onMove={handleViewportMove}
                    onInit={handleViewportMove}
                    nodeTypes={nodeTypes}
                    defaultViewport={savedViewport ?? undefined}
                    fitView={!savedViewport}
                    minZoom={CANVAS_MIN_ZOOM}
                    maxZoom={CANVAS_MAX_ZOOM}
                    // wheel/زوم/پن توسط هندلر سفارشی بالاتر مدیریت می‌شود؛ react-flow
                    // فقط پن با درگ (کلید وسط/راست) و پینچ لمسی را هندل می‌کند.
                    zoomOnScroll={false}
                    panOnScroll={false}
                    zoomOnPinch={!lockCanvasZoom}
                    onlyRenderVisibleElements
                    nodesDraggable={!isMobile && !lassoArmed}
                    selectNodesOnDrag={!isMobile}
                    nodeDragThreshold={isMobile ? 8 : 1}
                    selectionOnDrag={!isMobile}
                    panOnDrag={isMobile ? true : [1, 2]}
                    connectionRadius={connectionRadiusForLod(canvasLod, isMobile)}
                    multiSelectionKeyCode="Control"
                    selectionKeyCode={null}
                    elementsSelectable
                    elevateEdgesOnSelect
                    defaultEdgeOptions={defaultEdgeOptions}
                    deleteKeyCode={['Backspace', 'Delete']}
                    onBeforeDelete={readOnly ? undefined : handleBeforeDelete}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background variant={BackgroundVariant.Dots} color="var(--body-text-color)" gap={22} size={1} style={{ opacity: 0.12 }} />
                    <Controls position="bottom-left" style={{ marginBottom: '80px', marginRight: '20px' }} />
                </ReactFlow>
            </div>

            {octopusPos ? (
                <div
                    ref={octopusRef}
                    className={styles.octopusBadge}
                    style={{ left: octopusPos.x, top: octopusPos.y }}
                    aria-hidden="true"
                />
            ) : null}
            <div ref={lassoBoxRef} className={styles.lassoBox} aria-hidden="true" />

            <aside className={styles.leftRail} onMouseDown={preventFocusSteal}>
                <div className={styles.leftToolbox}>
                <div className={styles.toolboxGroup} aria-label={t(STUDIO_TOOLBOX_INPUT_GROUP_LABEL_KEY)}>
                    {STUDIO_TOOLBOX_INPUT_SHORTCUTS.map(({ type, titleKey }) => {
                        const Icon = STUDIO_TOOLBOX_ICONS[type];
                        return (
                            <div
                                key={type}
                                className={styles.toolIcon}
                                title={t(titleKey)}
                                role="button"
                                tabIndex={0}
                                onClick={() => addNewNode(type)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        addNewNode(type);
                                    }
                                }}
                            >
                                <Icon />
                            </div>
                        );
                    })}
                </div>
                <div className={styles.separator} />
                <div className={styles.toolboxGroup} aria-label={t(STUDIO_TOOLBOX_GROUP_LABEL_KEY)}>
                    {STUDIO_TOOLBOX_SHORTCUTS.map(({ type, titleKey }) => {
                        const Icon = STUDIO_TOOLBOX_ICONS[type];
                        return (
                            <div
                                key={type}
                                className={styles.toolIcon}
                                title={t(titleKey)}
                                role="button"
                                tabIndex={0}
                                onClick={() => addNewNode(type)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        addNewNode(type);
                                    }
                                }}
                            >
                                <Icon />
                            </div>
                        );
                    })}
                    {/* «زاویه و نور»: نود تولید عکس با ابزار سه‌بعدی دوربین/نور روشن */}
                    <div
                        className={styles.toolIcon}
                        title={t('angle_studio_title')}
                        role="button"
                        tabIndex={0}
                        onClick={addAngleStudioNode}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                addAngleStudioNode();
                            }
                        }}
                    >
                        <AngleStudioGlyph size={18} />
                    </div>
                </div>
                <div className={styles.separator} />
                <div className={styles.toolIcon} title={t('create_group')} onClick={handleGroupAction}><LuFolderOpen /></div>
                <div className={styles.toolIcon} title={t('note')} onClick={() => addNewNode('note')}><LuStickyNote /></div>
                
                {canUseDevTools && (
                    <>
                        <div className={styles.separator} />
                        <button
                            type="button"
                            className={`${styles.toolIcon} ${styles.developerToolBtn}`}
                            title={t('developer_tools')}
                            onClick={openDeveloperTools}
                        >
                            <VscDeveloperTools />
                        </button>
                    </>
                )}
                </div>
            </aside>

            {isMobile && editorPanelOpen ? (
                <button
                    type="button"
                    className={styles.sidebarBackdrop}
                    aria-label={tc('close')}
                    onClick={() => setEditorPanelOpen(false)}
                />
            ) : null}

            <div className={`${styles.rightControlArea} ${editorPanelOpen ? styles.mobileActive : ''}`}>
                <div className={styles.stackedPanels}>
                    <section className={`${styles.panelBox} ${activeRightPanel ? styles.panelOpen : styles.panelClosed}`}>
                        <SidebarTabBar
                            tabs={[
                                { id: 'editor', icon: <LuFolderOpen />, title: t('editor') },
                                { id: 'logs', icon: <LuBug />, title: t('logs') },
                                { id: 'comments', icon: <LuMessageSquare />, title: t('comments') },
                            ]}
                            active={activeRightPanel}
                            onSelect={(id) => setActiveRightPanel((prev) => (prev === id ? null : id))}
                            onClose={isMobile ? () => setEditorPanelOpen(false) : undefined}
                            closeLabel={tc('close')}
                            ariaLabel={t('sidebar_right')}
                        />

                        {activeRightPanel === 'editor' && (
                            <div className={styles.panelBoxBody}>
                                <div className={styles.sidebarScrollContent}>
                                    {selectedNodes.length > 1 && (
                                        <div className={styles.multiSelectHint}>
                                            {t('nodes_selected_hint', {count: formatAppNumber(selectedNodes.length, lang)})}
                                        </div>
                                    )}

                                    {selectedNode ? (
                                        <NodeSettingsPanel
                                            selectedNode={selectedNode}
                                            catalogEntry={catalogByType.get(String(selectedNode.type)) ?? null}
                                            nodes={nodes}
                                            edges={edges}
                                            onUpdateNode={updateNodeData}
                                            onUpdateEdge={(edgeId, data) => setEdges((current) => current.map((edge) => (
                                                edge.id === edgeId
                                                    ? { ...edge, data: { ...(edge.data || {}), ...data } }
                                                    : edge
                                            )))}
                                            footerSlot={nodeFooterSlot}
                                        />
                                    ) : selectedNodes.length <= 1 ? (
                                        <div className={styles.nodeSettingsEmpty}>
                                            {/* موشن سبک فقط با CSS: یک نود نمادین (هدر + بدنه، دو ورودی + یک خروجی)
                                                که به دو نود قبلی و یک نود بعدی وصل است و نشانگر رویش «کلیک» و انتخابش می‌کند */}
                                            <div className={styles.emptyHintArt} aria-hidden>
                                                <svg className={styles.emptyHintEdges} viewBox="0 0 220 104">
                                                    <path className={styles.emptyHintEdge} d="M30 20 C48 20 48 43 66 43" />
                                                    <path className={styles.emptyHintEdge} d="M30 84 C48 84 48 61 66 61" />
                                                    <path className={styles.emptyHintEdge} d="M156 52 L190 52" />
                                                    <path className={styles.emptyHintEdgeFlow} d="M30 20 C48 20 48 43 66 43" />
                                                    <path className={styles.emptyHintEdgeFlow} d="M30 84 C48 84 48 61 66 61" />
                                                    <path className={`${styles.emptyHintEdgeFlow} ${styles.emptyHintEdgeFlowOut}`} d="M156 52 L190 52" />
                                                </svg>
                                                <span className={`${styles.emptyHintGhost} ${styles.emptyHintGhostSourceTop}`}>
                                                    <span className={`${styles.emptyHintHandle} ${styles.emptyHintHandleOut}`} />
                                                </span>
                                                <span className={`${styles.emptyHintGhost} ${styles.emptyHintGhostSourceBottom}`}>
                                                    <span className={`${styles.emptyHintHandle} ${styles.emptyHintHandleOut}`} />
                                                </span>
                                                <span className={`${styles.emptyHintGhost} ${styles.emptyHintGhostTarget}`}>
                                                    <span className={`${styles.emptyHintHandle} ${styles.emptyHintHandleIn}`} />
                                                </span>
                                                <span className={styles.emptyHintNode}>
                                                    <span className={styles.emptyHintNodeHeader}>
                                                        <i />
                                                        <b />
                                                    </span>
                                                    <span className={styles.emptyHintNodeBody}>
                                                        <b />
                                                        <b />
                                                    </span>
                                                    <span className={styles.emptyHintFlash} />
                                                    <span className={`${styles.emptyHintHandle} ${styles.emptyHintHandleIn} ${styles.emptyHintHandleInTop}`} />
                                                    <span className={`${styles.emptyHintHandle} ${styles.emptyHintHandleIn} ${styles.emptyHintHandleInBottom}`} />
                                                    <span className={`${styles.emptyHintHandle} ${styles.emptyHintHandleOut}`} />
                                                </span>
                                                <span className={styles.emptyHintRipple} />
                                                <span className={styles.emptyHintBurst}>
                                                    <i /><i /><i /><i /><i /><i /><i /><i />
                                                </span>
                                                <LuMousePointerClick className={styles.emptyHintCursor} />
                                            </div>
                                            <p className={styles.emptyHintTitle}>{t('node_settings')}</p>
                                            <p className={styles.emptyHintText}>{t('select_node_settings')}</p>
                                        </div>
                                    ) : null}
                                </div>
                                <div ref={setNodeFooterSlot} className={styles.sidebarFooterSlot} />
                            </div>
                        )}

                        {activeRightPanel === 'logs' && (
                            <div className={styles.panelBoxBody}>
                                <ProcessLogPanel projectId={projectId} focusNodeId={focusLogNodeId} liveLogs={liveLogs} />
                            </div>
                        )}

                        {activeRightPanel === 'comments' && (
                            <div className={styles.panelBoxBody}>
                                <CommentsPanel projectId={projectId} />
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <footer className={styles.bottomNavbar} onMouseDown={preventFocusSteal}>
                <div className={styles.runSection}>
                    <button
                        type="button"
                        className={styles.navTool}
                        onClick={handleOpenCreateTemplate}
                        disabled={loading || !!activeTemplateId}
                        title={activeTemplateId ? t('create_template_cloned_disabled') : t('create_template_from')}
                        aria-label={t('create_template')}
                    >
                        <LuLayoutTemplate />
                    </button>
                </div>

                <div className={styles.navDivider} aria-hidden />

                {!readOnly && (
                    <>
                        <div className={styles.clipboardTools} aria-label={t('clipboard')}>
                            <button
                                type="button"
                                className={styles.navTool}
                                title={canCopyNodes ? t('copy_hint') : t('copy_need_selection')}
                                onClick={handleCopy}
                                disabled={!canCopyNodes}
                            >
                                <LuCopy />
                            </button>
                            <button
                                type="button"
                                className={styles.navTool}
                                title={canPasteNodes ? t('paste_hint') : t('paste_need_copy')}
                                onClick={handlePaste}
                                disabled={!canPasteNodes}
                            >
                                <MdOutlineContentPasteGo />
                            </button>
                        </div>
                        <div className={styles.navDivider} aria-hidden />
                    </>
                )}

                <div className={styles.centerTools}>
                    <NavbarEdgeTypeMenu value={edgeType} onChange={handleEdgeTypeChange} />

                    <NavbarSaveButton saveStatus={saveStatus} saveError={saveError} onClick={saveNow} />
                </div>

                <div className={styles.navDivider} aria-hidden />

                <NavbarHistoryZoom
                    canUndo={canUndo}
                    canRedo={canRedo}
                    zoomPercent={zoomPercent}
                    onUndo={undo}
                    onRedo={redo}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onZoomReset={handleZoomReset}
                />
            </footer>

            <PasteMediaModeDialog
                open={Boolean(pendingPasteMedia?.length)}
                count={pendingPasteMedia?.length ?? 0}
                onClose={() => setPendingPasteMedia(null)}
                onSelect={(mode) => {
                    const files = pendingPasteMedia;
                    setPendingPasteMedia(null);
                    if (files?.length) void pasteClipboardMedia(files, mode);
                }}
            />

        </div>
    );
}

export default function MediaStudioCanvas() {
    const { projectId } = useParams<{ projectId: string }>();

    return (
        <MediaStudioProvider projectId={projectId}>
            <ReactFlowProvider>
                <CanvasInner />
            </ReactFlowProvider>
        </MediaStudioProvider>
    );
}
