/**
 * Pure docking-layout engine for the video editor (Premiere/CapCut style).
 *
 * The layout is an immutable binary split tree: every internal node splits the
 * available space in two (`first` + `second`), every leaf is a tabbed panel.
 * All operations below are pure — they rebuild only the path from the root to
 * the mutated node and share every untouched subtree by reference, so React
 * can skip re-rendering panels that did not change.
 *
 * Orientation convention (physical, matches on-screen geometry because the
 * dock area renders with `direction: ltr`):
 *   - `horizontal` → `first` is the LEFT side,  `second` the RIGHT side.
 *   - `vertical`   → `first` is the TOP side,   `second` the BOTTOM side.
 *   - `ratio` is always the fraction of space owned by `first`.
 *
 * This module must stay free of React/DOM imports: it is unit-tested under
 * `node --test` and reused by the persistence layer.
 */

export type DockSide = 'left' | 'right' | 'top' | 'bottom';
export type DockZone = DockSide | 'center';
export type SplitDirection = 'horizontal' | 'vertical';

/** Windows that can exist only once across the whole editor. */
export type SingletonPanelId = 'media' | 'preview' | 'timeline' | 'chat';
/** Tab contents that live inside panel windows. */
export type DockTabId = 'logs' | 'settings' | 'export';

/** One dockable content unit, identified by a stable string key. */
export type WindowContent =
    | { kind: 'panel'; panel: SingletonPanelId }
    | { kind: 'tab'; tab: DockTabId };

/** Leaf of the layout tree: a window that stacks one or more tabs. */
export interface PanelNode {
    type: 'panel';
    id: string;
    tabs: string[];
    activeTab: string;
}

/** Internal node of the layout tree: splits the space in two. */
export interface SplitNode {
    type: 'split';
    id: string;
    direction: SplitDirection;
    /** Fraction of the space owned by `first`; `second` gets `1 - ratio`. */
    ratio: number;
    first: LayoutNode;
    second: LayoutNode;
}

export type LayoutNode = PanelNode | SplitNode;

export interface FloatingWindowData {
    id: string;
    key: string;
    rect: { x: number; y: number; width: number; height: number };
    z: number;
}

export interface EditorLayoutState {
    root: LayoutNode | null;
    floating: FloatingWindowData[];
    /** Content keys removed from the layout, re-addable from the layout menu. */
    hidden: string[];
}

export interface RectLike {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const SINGLETON_PANEL_IDS: SingletonPanelId[] = ['media', 'preview', 'timeline', 'chat'];
export const DOCK_TAB_IDS: DockTabId[] = ['logs', 'settings', 'export'];

/** Fraction of a panel's edge that activates a directional dock zone. */
export const ZONE_EDGE_FRACTION = 0.25;
/** Fraction taken by a panel docked against a whole layout edge. */
export const ROOT_DOCK_RATIO = 0.28;
/** Lower bound for a split ratio, mirrored to `1 - MIN_RATIO`. */
export const MIN_RATIO = 0.08;
/** Interactive minimum panel size in px (also enforced via CSS min-*) */
export const MIN_PANEL_PX = { width: 120, height: 80 };

// ─── Content keys ────────────────────────────────────────────────────────────

export function contentKey(content: WindowContent): string {
    return content.kind === 'panel' ? `panel:${content.panel}` : `tab:${content.tab}`;
}

export function contentFromKey(key: string): WindowContent | null {
    if (key.startsWith('panel:')) {
        const panel = key.slice(6) as SingletonPanelId;
        return SINGLETON_PANEL_IDS.includes(panel) ? { kind: 'panel', panel } : null;
    }
    if (key.startsWith('tab:')) {
        const tab = key.slice(4) as DockTabId;
        return DOCK_TAB_IDS.includes(tab) ? { kind: 'tab', tab } : null;
    }
    return null;
}

// ─── Node factories ──────────────────────────────────────────────────────────

let nodeSeq = 0;
function nextId(prefix: string): string {
    nodeSeq += 1;
    return `${prefix}-${Date.now().toString(36)}-${nodeSeq}`;
}

export function makePanelNode(tabs: string[], activeTab: string = tabs[0]): PanelNode {
    return { type: 'panel', id: nextId('p'), tabs: [...tabs], activeTab };
}

function makeSplitNode(direction: SplitDirection, first: LayoutNode, second: LayoutNode, ratio: number): SplitNode {
    return { type: 'split', id: nextId('s'), direction, ratio, first, second };
}

// ─── Tree queries ────────────────────────────────────────────────────────────

export function findPanel(root: LayoutNode | null, panelId: string): PanelNode | null {
    if (!root) return null;
    if (root.type === 'panel') return root.id === panelId ? root : null;
    return findPanel(root.first, panelId) ?? findPanel(root.second, panelId);
}

/** First leaf containing `key`, searching in on-screen order. */
export function findPanelByKey(root: LayoutNode | null, key: string): PanelNode | null {
    if (!root) return null;
    if (root.type === 'panel') return root.tabs.includes(key) ? root : null;
    return findPanelByKey(root.first, key) ?? findPanelByKey(root.second, key);
}

export function collectPanelNodes(root: LayoutNode | null): PanelNode[] {
    if (!root) return [];
    if (root.type === 'panel') return [root];
    return [...collectPanelNodes(root.first), ...collectPanelNodes(root.second)];
}

/** Immutably replace the panel with `id`; returns the same node if absent. */
function replacePanel(node: LayoutNode, panelId: string, replacement: LayoutNode): LayoutNode {
    if (node.type === 'panel') return node.id === panelId ? replacement : node;
    const first = replacePanel(node.first, panelId, replacement);
    if (first !== node.first) return { ...node, first };
    const second = replacePanel(node.second, panelId, replacement);
    if (second !== node.second) return { ...node, second };
    return node;
}

/** Immutably apply `fn` to the panel with `id`; only the path is cloned. */
export function updatePanel(node: LayoutNode, panelId: string, fn: (panel: PanelNode) => PanelNode): LayoutNode {
    if (node.type === 'panel') return node.id === panelId ? fn(node) : node;
    const first = updatePanel(node.first, panelId, fn);
    if (first !== node.first) return { ...node, first };
    const second = updatePanel(node.second, panelId, fn);
    if (second !== node.second) return { ...node, second };
    return node;
}

/**
 * Remove a leaf and collapse its parent split (`null` when the root itself
 * was the leaf). Shared subtrees stay untouched.
 */
export function removePanel(root: LayoutNode | null, panelId: string): { root: LayoutNode | null; removed: PanelNode | null } {
    if (!root) return { root: null, removed: null };
    if (root.type === 'panel') {
        return root.id === panelId ? { root: null, removed: root } : { root, removed: null };
    }
    const first = removePanel(root.first, panelId);
    if (first.removed) {
        return { root: first.root ? { ...root, first: first.root } : root.second, removed: first.removed };
    }
    const second = removePanel(root.second, panelId);
    if (second.removed) {
        return { root: second.root ? { ...root, second: second.root } : root.first, removed: second.removed };
    }
    return { root, removed: null };
}

// ─── Dock operations ─────────────────────────────────────────────────────────

function orderForSide(side: DockSide, leaf: LayoutNode, anchor: LayoutNode): { first: LayoutNode; second: LayoutNode; ratio: number } {
    return side === 'left' || side === 'top'
        ? { first: leaf, second: anchor, ratio: 0.5 }
        : { first: anchor, second: leaf, ratio: 0.5 };
}

/** Split a target leaf so `leaf` sits beside it. Null when the target is gone. */
function dockBeside(base: LayoutNode | null, targetPanelId: string, side: DockSide, leaf: PanelNode): LayoutNode | null {
    if (!base) return null;
    const target = findPanel(base, targetPanelId);
    if (!target) return null;
    const direction: SplitDirection = side === 'left' || side === 'right' ? 'horizontal' : 'vertical';
    const { first, second, ratio } = orderForSide(side, leaf, target);
    return replacePanel(base, targetPanelId, makeSplitNode(direction, first, second, ratio));
}

/** Wrap the whole tree so `leaf` docks against a layout edge. */
function wrapRoot(base: LayoutNode | null, side: DockSide, leaf: PanelNode): LayoutNode {
    if (!base) return leaf;
    const direction: SplitDirection = side === 'left' || side === 'right' ? 'horizontal' : 'vertical';
    return side === 'left'
        ? makeSplitNode(direction, leaf, base, ROOT_DOCK_RATIO)
        : side === 'right'
            ? makeSplitNode(direction, base, leaf, 1 - ROOT_DOCK_RATIO)
            : side === 'top'
                ? makeSplitNode(direction, leaf, base, ROOT_DOCK_RATIO + 0.02)
                : makeSplitNode(direction, base, leaf, 1 - (ROOT_DOCK_RATIO + 0.02));
}

/**
 * Move a whole leaf (with all of its tabs):
 *  - `zone === 'center'` merges the leaf's tabs into the target leaf.
 *  - a side zone splits the target leaf (or the whole layout when
 *    `targetPanelId` is null / no longer present).
 */
export function dockLeaf(root: LayoutNode | null, leafId: string, targetPanelId: string | null, zone: DockZone): LayoutNode | null {
    if (!root || targetPanelId === leafId) return root;
    const { root: base, removed } = removePanel(root, leafId);
    if (!removed) return root;

    if (targetPanelId && zone === 'center') {
        if (!base) return removed;
        const target = findPanel(base, targetPanelId);
        if (!target) return base;
        return updatePanel(base, targetPanelId, (panel) => ({
            ...panel,
            tabs: [...panel.tabs, ...removed.tabs],
            activeTab: removed.activeTab,
        }));
    }

    const side = zone === 'center' ? 'right' : zone;
    if (targetPanelId) {
        const beside = dockBeside(base, targetPanelId, side, removed);
        if (beside) return beside;
    }
    return wrapRoot(base, side, removed);
}

/** Pull one tab out of a leaf, collapsing the leaf when its last tab leaves. */
export function removeTab(root: LayoutNode | null, panelId: string, tabKey: string): { root: LayoutNode | null; removed: boolean } {
    if (!root) return { root, removed: false };
    const panel = findPanel(root, panelId);
    if (!panel || !panel.tabs.includes(tabKey)) return { root, removed: false };
    if (panel.tabs.length === 1) {
        const res = removePanel(root, panelId);
        return { root: res.root, removed: true };
    }
    const next = updatePanel(root, panelId, (p) => {
        const tabs = p.tabs.filter((tab) => tab !== tabKey);
        return { ...p, tabs, activeTab: p.activeTab === tabKey ? tabs[0] : p.activeTab };
    });
    return { root: next, removed: true };
}

/**
 * Move a single tab: merge into a target leaf (center), split beside a target
 * leaf or a layout edge (side), or detach into its own leaf (`target null`).
 */
export function dockTab(root: LayoutNode | null, tabKey: string, sourcePanelId: string, targetPanelId: string | null, zone: DockZone): LayoutNode | null {
    if (!root || (targetPanelId === sourcePanelId && zone === 'center')) return root;
    const res = removeTab(root, sourcePanelId, tabKey);
    if (!res.removed) return root;
    const base = res.root;
    const leaf = makePanelNode([tabKey]);

    if (targetPanelId && zone === 'center') {
        if (!base) return leaf;
        const target = findPanel(base, targetPanelId);
        return target ? addTabToPanel(base, targetPanelId, tabKey) : base;
    }
    const side = zone === 'center' ? 'right' : zone;
    if (targetPanelId) {
        const beside = dockBeside(base, targetPanelId, side, leaf);
        if (beside) return beside;
    }
    return wrapRoot(base, side, leaf);
}

/** Insert a fresh leaf holding `key` beside a target leaf (or at a layout edge). */
export function insertLeaf(root: LayoutNode | null, key: string, targetPanelId: string | null, side: DockSide): LayoutNode {
    const leaf = makePanelNode([key]);
    if (targetPanelId) {
        const beside = dockBeside(root, targetPanelId, side, leaf);
        if (beside) return beside;
    }
    return wrapRoot(root, side, leaf);
}

export function addTabToPanel(root: LayoutNode | null, panelId: string, tabKey: string): LayoutNode {
    if (!root) return makePanelNode([tabKey]);
    return updatePanel(root, panelId, (panel) => (
        panel.tabs.includes(tabKey)
            ? panel
            : { ...panel, tabs: [...panel.tabs, tabKey], activeTab: tabKey }
    ));
}

export function activateTab(root: LayoutNode | null, panelId: string, tabKey: string): LayoutNode | null {
    if (!root) return root;
    return updatePanel(root, panelId, (panel) => (
        panel.tabs.includes(tabKey) && panel.activeTab !== tabKey ? { ...panel, activeTab: tabKey } : panel
    ));
}

export function setSplitRatio(root: LayoutNode | null, path: readonly number[], ratio: number): LayoutNode | null {
    if (!root || root.type !== 'split') return root;
    const [head, ...rest] = path;
    if (head === undefined) {
        const clamped = Math.min(1 - MIN_RATIO, Math.max(MIN_RATIO, ratio));
        return clamped === root.ratio ? root : { ...root, ratio: clamped };
    }
    if (head === 0) {
        const first = setSplitRatio(root.first, rest, ratio);
        if (!first) return root;
        return first === root.first ? root : { ...root, first };
    }
    const second = setSplitRatio(root.second, rest, ratio);
    if (!second) return root;
    return second === root.second ? root : { ...root, second };
}

// ─── Pointer-zone geometry ───────────────────────────────────────────────────

/** 25%-edge bands decide the dock zone; the middle is the tab zone. */
export function resolveZone(rect: RectLike, x: number, y: number): DockZone {
    const dx = (x - rect.x) / Math.max(1, rect.width);
    const dy = (y - rect.y) / Math.max(1, rect.height);
    const edges: Array<[DockSide, number]> = [
        ['left', dx],
        ['right', 1 - dx],
        ['top', dy],
        ['bottom', 1 - dy],
    ];
    let best: [DockSide, number] = edges[0];
    for (const edge of edges) {
        if (edge[1] < best[1]) best = edge;
    }
    return best[1] < ZONE_EDGE_FRACTION ? best[0] : 'center';
}

/** Outer band of the whole dock area → layout-edge side, else null. */
export function resolveAreaSide(rect: RectLike, x: number, y: number): DockSide | null {
    const dx = (x - rect.x) / Math.max(1, rect.width);
    const dy = (y - rect.y) / Math.max(1, rect.height);
    if (dx < ZONE_EDGE_FRACTION) return 'left';
    if (dx > 1 - ZONE_EDGE_FRACTION) return 'right';
    if (dy < ZONE_EDGE_FRACTION) return 'top';
    if (dy > 1 - ZONE_EDGE_FRACTION) return 'bottom';
    return null;
}

/** The highlighted rectangle for a dock zone: a full panel (center) or an edge band. */
export function zoneRect(rect: RectLike, zone: DockZone): RectLike {
    switch (zone) {
        case 'left':
            return { x: rect.x, y: rect.y, width: rect.width * ZONE_EDGE_FRACTION, height: rect.height };
        case 'right':
            return { x: rect.x + rect.width * (1 - ZONE_EDGE_FRACTION), y: rect.y, width: rect.width * ZONE_EDGE_FRACTION, height: rect.height };
        case 'top':
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height * ZONE_EDGE_FRACTION };
        case 'bottom':
            return { x: rect.x, y: rect.y + rect.height * (1 - ZONE_EDGE_FRACTION), width: rect.width, height: rect.height * ZONE_EDGE_FRACTION };
        default:
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }
}

// ─── Default layout ──────────────────────────────────────────────────────────

export function defaultLayout(): EditorLayoutState {
    const media = makePanelNode(['panel:media']);
    const preview = makePanelNode(['panel:preview']);
    const tabsMain = makePanelNode(['tab:logs', 'tab:settings', 'tab:export'], 'tab:settings');
    const timeline = makePanelNode(['panel:timeline']);
    const topRow = makeSplitNode(
        'horizontal',
        makeSplitNode('horizontal', media, preview, 0.3),
        tabsMain,
        0.74,
    );
    return {
        root: makeSplitNode('vertical', topRow, timeline, 0.62),
        floating: [
            {
                id: nextId('fl'),
                key: 'panel:chat',
                rect: { x: 24, y: 90, width: 330, height: 440 },
                z: 4000,
            },
        ],
        hidden: [],
    };
}

// ─── Validation (localStorage input is untrusted) ────────────────────────────

function isValidRect(value: unknown): value is { x: number; y: number; width: number; height: number } {
    if (!value || typeof value !== 'object') return false;
    const rect = value as Record<string, unknown>;
    return typeof rect.x === 'number' && typeof rect.y === 'number'
        && typeof rect.width === 'number' && rect.width > 0
        && typeof rect.height === 'number' && rect.height > 0;
}

function isValidNode(value: unknown, seen: Set<string>): value is LayoutNode {
    if (!value || typeof value !== 'object') return false;
    const node = value as Record<string, unknown>;
    if (node.type === 'panel') {
        if (typeof node.id !== 'string' || !node.id) return false;
        if (!Array.isArray(node.tabs) || !node.tabs.length) return false;
        for (const tab of node.tabs) {
            if (typeof tab !== 'string' || !contentFromKey(tab) || seen.has(tab)) return false;
            seen.add(tab);
        }
        return typeof node.activeTab === 'string' && node.tabs.includes(node.activeTab);
    }
    if (node.type !== 'split') return false;
    if (typeof node.id !== 'string' || !node.id) return false;
    if (node.direction !== 'horizontal' && node.direction !== 'vertical') return false;
    if (typeof node.ratio !== 'number' || node.ratio <= MIN_RATIO || node.ratio >= 1 - MIN_RATIO) return false;
    return isValidNode(node.first, seen) && isValidNode(node.second, seen);
}

export function isValidLayoutState(value: unknown): value is EditorLayoutState {
    if (!value || typeof value !== 'object') return false;
    const state = value as Record<string, unknown>;
    const seen = new Set<string>();
    if (state.root !== null && !isValidNode(state.root, seen)) return false;
    if (!Array.isArray(state.floating) || !Array.isArray(state.hidden)) return false;
    for (const item of state.floating) {
        if (!item || typeof item !== 'object') return false;
        const win = item as Record<string, unknown>;
        if (typeof win.id !== 'string' || typeof win.key !== 'string') return false;
        if (!contentFromKey(win.key) || seen.has(win.key)) return false;
        seen.add(win.key);
        if (!isValidRect(win.rect)) return false;
    }
    for (const key of state.hidden) {
        if (typeof key !== 'string' || !contentFromKey(key) || seen.has(key)) return false;
        seen.add(key);
    }
    // Every singleton panel and every tab must be accounted for exactly once
    // (docked, floating, or hidden) — `seen` already guarantees "at most once".
    for (const panel of SINGLETON_PANEL_IDS) {
        if (!seen.has(`panel:${panel}`)) return false;
    }
    for (const tab of DOCK_TAB_IDS) {
        if (!seen.has(`tab:${tab}`)) return false;
    }
    return true;
}
