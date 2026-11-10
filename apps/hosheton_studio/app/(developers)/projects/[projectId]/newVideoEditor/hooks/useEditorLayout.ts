'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    type DockSide,
    type DockTabId,
    type DockZone,
    type EditorLayoutState,
    type FloatingWindowData,
    type LayoutNode,
    type SingletonPanelId,
    type WindowContent,
    activateTab as activateTabInTree,
    addTabToPanel,
    contentKey,
    defaultLayout,
    dockLeaf,
    dockTab,
    findPanel,
    findPanelByKey,
    insertLeaf,
    isValidLayoutState,
    makePanelNode,
    removePanel,
    removeTab,
    setSplitRatio,
} from '../utils/dock-layout';

export type {
    DockSide,
    DockTabId,
    DockZone,
    EditorLayoutState,
    FloatingWindowData,
    LayoutNode,
    PanelNode,
    SingletonPanelId,
    SplitNode,
    SplitDirection,
    WindowContent,
} from '../utils/dock-layout';

const STORAGE_PREFIX = 'hosheton.videoEditor.layout.v2';
const BASE_Z = 4000;
const DEFAULT_FLOAT_RECT = { x: 120, y: 110, width: 460, height: 380 };

type FloatRect = { x: number; y: number; width: number; height: number };

function clampFloatRect(rect: FloatRect): FloatRect {
    const width = Math.min(Math.max(240, rect.width), Math.max(240, window.innerWidth - 24));
    const height = Math.min(Math.max(160, rect.height), Math.max(160, window.innerHeight - 24));
    const x = Math.min(Math.max(0, rect.x), Math.max(0, window.innerWidth - 90));
    const y = Math.min(Math.max(0, rect.y), Math.max(0, window.innerHeight - 60));
    return { x, y, width, height };
}

function loadLayout(storageKey: string, legacyKey?: string): EditorLayoutState {
    try {
        // `legacyKey` migrates the pre-per-user layout (keyed by project only)
        // once; every later write goes to the user-scoped key.
        const raw = window.localStorage.getItem(storageKey)
            ?? (legacyKey ? window.localStorage.getItem(legacyKey) : null);
        if (!raw) return defaultLayout();
        const parsed = JSON.parse(raw) as unknown;
        return isValidLayoutState(parsed) ? parsed : defaultLayout();
    } catch {
        return defaultLayout();
    }
}

let floatSeq = 0;
function newFloatingId() {
    floatSeq += 1;
    return `fl-${Date.now().toString(36)}-${floatSeq}`;
}

/**
 * Detach a content key from everywhere (tree, floating, hidden).
 * Returns the pruned state pieces, or null when the key was not present.
 */
function detachKey(state: EditorLayoutState, key: string) {
    let root: LayoutNode | null = state.root;
    const floating: FloatingWindowData[] = [];
    let detached = false;
    for (const item of state.floating) {
        if (item.key === key) {
            detached = true;
            continue;
        }
        floating.push(item);
    }
    const hidden = state.hidden.filter((hiddenKey) => {
        if (hiddenKey !== key) return true;
        detached = true;
        return false;
    });
    if (!detached) {
        const owner = findPanelByKey(root, key);
        if (!owner) return null;
        const res = removeTab(root, owner.id, key);
        root = res.root;
    }
    return { root, floating, hidden };
}

function nextFloatingZ(floating: FloatingWindowData[]): number {
    return Math.max(BASE_Z, ...floating.map((item) => item.z)) + 1;
}

export function useEditorLayout(projectId: string, userId?: string) {
    const [layout, setLayout] = useState<EditorLayoutState>(defaultLayout);
    const [hydrated, setHydrated] = useState(false);

    // Layouts are stored per user (per project): two people sharing a browser
    // keep their own arrangements.
    const storageKey = userId
        ? `${STORAGE_PREFIX}:${projectId}:${userId}`
        : `${STORAGE_PREFIX}:${projectId}`;
    const legacyKey = userId ? `${STORAGE_PREFIX}:${projectId}` : undefined;

    useEffect(() => {
        // Stored layout must swap in AFTER the first commit: reading it during
        // render would diverge from the SSR HTML (which renders defaults).
        /* eslint-disable react-hooks/set-state-in-effect -- SSR-safe localStorage hydration;
           the rule reports only the first setState, but the load below is equally intentional */
        setHydrated(false);
        setLayout(loadLayout(storageKey, legacyKey));
        // eslint-enable react-hooks/set-state-in-effect
        // Persist only after the loaded state reached a render — otherwise the
        // mount-time persist effect would overwrite the stored layout with defaults.
        setHydrated(true);
    }, [storageKey, legacyKey]);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(layout));
        } catch {
            /* storage unavailable */
        }
    }, [layout, storageKey, hydrated]);

    const dockKey = useCallback((key: string) => {
        setLayout((prev) => {
            if (findPanelByKey(prev.root, key)) return prev; // already docked
            const detached = detachKey(prev, key);
            if (!detached) return prev;
            const ids = collectIds(detached.root);
            const last = ids[ids.length - 1];
            const root = insertLeaf(detached.root, key, last ?? null, 'right');
            return { root, floating: detached.floating, hidden: detached.hidden };
        });
    }, []);

    const floatKey = useCallback((key: string, rect?: FloatRect) => {
        setLayout((prev) => {
            const detached = detachKey(prev, key);
            if (!detached) return prev;
            const z = nextFloatingZ(detached.floating);
            return {
                root: detached.root,
                floating: [...detached.floating, {
                    id: newFloatingId(),
                    key,
                    rect: clampFloatRect(rect ?? DEFAULT_FLOAT_RECT),
                    z,
                }],
                hidden: detached.hidden,
            };
        });
    }, []);

    const hideKey = useCallback((key: string) => {
        setLayout((prev) => {
            const detached = detachKey(prev, key);
            if (!detached) return prev;
            return { root: detached.root, floating: detached.floating, hidden: [...detached.hidden, key] };
        });
    }, []);

    /** Hide a whole docked leaf — all of its tabs go to the hidden list. */
    const hidePanel = useCallback((panelId: string) => {
        setLayout((prev) => {
            const leaf = findPanel(prev.root, panelId);
            if (!leaf) return prev;
            const res = removePanel(prev.root, panelId);
            if (!res.removed) return prev;
            return { root: res.root, floating: prev.floating, hidden: [...prev.hidden, ...leaf.tabs] };
        });
    }, []);

    /** Dock a whole leaf: side zone of a target leaf, or of the whole layout. */
    const dockPanel = useCallback((panelId: string, targetPanelId: string | null, zone: DockZone) => {
        setLayout((prev) => {
            const root = dockLeaf(prev.root, panelId, targetPanelId, zone);
            return root === prev.root ? prev : { ...prev, root };
        });
    }, []);

    /** Move one tab: merge / split beside a leaf, layout-edge dock, or float. */
    const moveTab = useCallback((
        tabKey: string,
        sourcePanelId: string,
        target:
            | { kind: 'panel'; panelId: string; zone: DockZone }
            | { kind: 'area'; side: DockSide }
            | { kind: 'float'; rect?: FloatRect },
    ) => {
        setLayout((prev) => {
            if (target.kind === 'float') {
                const res = removeTab(prev.root, sourcePanelId, tabKey);
                if (!res.removed) return prev;
                const z = nextFloatingZ(prev.floating);
                return {
                    root: res.root,
                    floating: [...prev.floating, {
                        id: newFloatingId(),
                        key: tabKey,
                        rect: clampFloatRect(target.rect ?? DEFAULT_FLOAT_RECT),
                        z,
                    }],
                    hidden: prev.hidden,
                };
            }
            const root = target.kind === 'panel'
                ? dockTab(prev.root, tabKey, sourcePanelId, target.panelId, target.zone)
                : dockTab(prev.root, tabKey, sourcePanelId, null, target.side);
            return root === prev.root ? prev : { ...prev, root };
        });
    }, []);

    const activateTab = useCallback((panelId: string, tabKey: string) => {
        setLayout((prev) => {
            const root = activateTabInTree(prev.root, panelId, tabKey);
            return root === prev.root ? prev : { ...prev, root };
        });
    }, []);

    /** Commit a divider drag: `path` addresses the split, `ratio` the first child. */
    const resizeSplit = useCallback((path: readonly number[], ratio: number) => {
        setLayout((prev) => {
            const root = setSplitRatio(prev.root, path, ratio);
            return root === prev.root ? prev : { ...prev, root };
        });
    }, []);

    /** Float the active tab of a docked leaf (header Float button / drag-out). */
    const floatPanelActive = useCallback((panelId: string, rect?: FloatRect) => {
        setLayout((prev) => {
            const leaf = findPanel(prev.root, panelId);
            if (!leaf) return prev;
            const detached = detachKey(prev, leaf.activeTab);
            if (!detached) return prev;
            const z = nextFloatingZ(detached.floating);
            return {
                root: detached.root,
                floating: [...detached.floating, {
                    id: newFloatingId(),
                    key: leaf.activeTab,
                    rect: clampFloatRect(rect ?? DEFAULT_FLOAT_RECT),
                    z,
                }],
                hidden: detached.hidden,
            };
        });
    }, []);

    const setFloatingRect = useCallback((windowId: string, rect: FloatRect) => {
        setLayout((prev) => {
            const target = prev.floating.find((item) => item.id === windowId);
            if (!target) return prev;
            const r = target.rect;
            if (r.x === rect.x && r.y === rect.y && r.width === rect.width && r.height === rect.height) return prev;
            return {
                ...prev,
                floating: prev.floating.map((item) => (
                    item.id === windowId ? { ...item, rect } : item
                )),
            };
        });
    }, []);

    const focusFloating = useCallback((windowId: string) => {
        setLayout((prev) => {
            const maxZ = Math.max(BASE_Z, ...prev.floating.map((item) => item.z));
            const target = prev.floating.find((item) => item.id === windowId);
            if (!target || target.z === maxZ) return prev;
            return {
                ...prev,
                floating: prev.floating.map((item) => (
                    item.id === windowId ? { ...item, z: maxZ + 1 } : item
                )),
            };
        });
    }, []);

    // ── Content-based wrappers (menu / toolbar API) ──

    const dockContent = useCallback((content: WindowContent) => dockKey(contentKey(content)), [dockKey]);
    const floatContent = useCallback((content: WindowContent, rect?: FloatRect) => floatKey(contentKey(content), rect), [floatKey]);
    const hideContent = useCallback((content: WindowContent) => hideKey(contentKey(content)), [hideKey]);

    /** Re-add a hidden tab into the first panel leaf (layout menu toggle). */
    const showTab = useCallback((tab: DockTabId) => {
        setLayout((prev) => {
            const key = `tab:${tab}`;
            if (keyExists(prev, key)) return prev;
            const detached = detachKey(prev, key);
            if (!detached) return prev;
            const first = firstLeaf(detached.root);
            const root = first ? addTabToPanel(detached.root, first.id, key) : makePanelNode([key]);
            return { root, floating: detached.floating, hidden: detached.hidden };
        });
    }, []);

    const hideTab = useCallback((tab: DockTabId) => hideKey(`tab:${tab}`), [hideKey]);

    /** Re-add a hidden singleton panel by docking it into the layout. */
    const showContent = useCallback((content: WindowContent) => dockKey(contentKey(content)), [dockKey]);

    const isTabVisible = useCallback((tab: DockTabId) => (
        keyExists(layout, `tab:${tab}`)
    ), [layout]);

    const isPanelVisible = useCallback((panel: SingletonPanelId) => (
        keyExists(layout, `panel:${panel}`)
    ), [layout]);

    /** Panel leaf id currently hosting a content key (docked only). */
    const findPanelIdByContent = useCallback((content: WindowContent): string | null => (
        findPanelByKey(layout.root, contentKey(content))?.id ?? null
    ), [layout]);

    const resetLayout = useCallback(() => {
        setLayout(defaultLayout());
    }, []);

    return {
        layout,
        dockPanel,
        moveTab,
        activateTab,
        resizeSplit,
        floatPanelActive,
        dockKey,
        floatKey,
        hideKey,
        hidePanel,
        dockContent,
        floatContent,
        hideContent,
        showContent,
        showTab,
        hideTab,
        isPanelVisible,
        isTabVisible,
        findPanelIdByContent,
        setFloatingRect,
        focusFloating,
        resetLayout,
    };
}

// ── helpers kept outside the hook so identity stays stable ──

function collectIds(root: LayoutNode | null): string[] {
    const ids: string[] = [];
    const walk = (node: LayoutNode | null) => {
        if (!node) return;
        if (node.type === 'panel') {
            ids.push(node.id);
            return;
        }
        walk(node.first);
        walk(node.second);
    };
    walk(root);
    return ids;
}

function firstLeaf(root: LayoutNode | null) {
    const ids = collectIds(root);
    return ids.length ? findPanel(root, ids[0]) : null;
}

function keyExists(layout: EditorLayoutState, key: string): boolean {
    if (findPanelByKey(layout.root, key)) return true;
    return layout.floating.some((item) => item.key === key);
}
