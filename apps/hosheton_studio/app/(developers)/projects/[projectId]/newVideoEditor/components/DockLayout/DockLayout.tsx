'use client';

import React, { memo, useCallback, useRef } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { LuPinOff, LuX } from 'react-icons/lu';
import {
    type DockSide,
    type DockZone,
    MIN_PANEL_PX,
    type PanelNode,
    type SplitDirection,
    type SplitNode,
    type LayoutNode,
    MIN_RATIO,
    resolveAreaSide,
    resolveZone,
    zoneRect,
} from '../../utils/dock-layout';
import styles from './DockLayout.module.scss';

type Rect = { x: number; y: number; width: number; height: number };
type FloatRect = { x: number; y: number; width: number; height: number };

export interface DockLayoutProps {
    root: LayoutNode | null;
    /** Title + icon for a tab key (window header / tab label). */
    describeTab: (key: string) => { title: string; icon: ReactNode };
    renderTab: (key: string) => ReactNode;
    /** Move a whole leaf: side/center of a target leaf, or a layout edge (null target). */
    onDockPanel: (panelId: string, targetPanelId: string | null, zone: DockZone) => void;
    onMoveTab: (
        tabKey: string,
        sourcePanelId: string,
        target:
            | { kind: 'panel'; panelId: string; zone: DockZone }
            | { kind: 'area'; side: DockSide }
            | { kind: 'float'; rect: FloatRect },
    ) => void;
    onActivateTab: (panelId: string, tabKey: string) => void;
    onFloatPanel: (panelId: string, rect?: FloatRect) => void;
    onHidePanel: (panelId: string) => void;
    /** Commit a divider gesture: `path` addresses the split, `ratio` the first child. */
    onResize: (path: readonly number[], ratio: number) => void;
}

type DragState = {
    kind: 'leaf' | 'tab';
    panelId: string;
    tabKey?: string;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    active: boolean;
};

/** Where the pointer currently is during a drag. */
type HoverTarget =
    | { kind: 'panel'; panelId: string; zone: DockZone }
    | { kind: 'area'; side: DockSide }
    | null;

const DRAG_THRESHOLD_PX = 4;
const PREVIEW_INSET_PX = 2;

function sameTarget(a: HoverTarget, b: HoverTarget): boolean {
    if (a === b) return true;
    if (!a || !b || a.kind !== b.kind) return false;
    if (a.kind === 'panel' && b.kind === 'panel') {
        return a.panelId === b.panelId && a.zone === b.zone;
    }
    return (a as { side: DockSide }).side === (b as { side: DockSide }).side;
}

function rectAroundPointer(x: number, y: number): FloatRect {
    return { x: x - 230, y: y - 20, width: 460, height: 380 };
}

const DockPanelView = memo(function DockPanelView({
    node,
    style,
    describeTab,
    renderTab,
    onActivateTab,
    onHeaderPointerDown,
    onTabPointerDown,
    onFloat,
    onHide,
}: {
    node: PanelNode;
    style: CSSProperties;
    describeTab: DockLayoutProps['describeTab'];
    renderTab: DockLayoutProps['renderTab'];
    onActivateTab: DockLayoutProps['onActivateTab'];
    onHeaderPointerDown: (event: ReactPointerEvent<HTMLElement>, panelId: string) => void;
    onTabPointerDown: (event: ReactPointerEvent<HTMLElement>, panelId: string, tabKey: string) => void;
    onFloat: DockLayoutProps['onFloatPanel'];
    onHide: DockLayoutProps['onHidePanel'];
}) {
    const stacked = node.tabs.length > 1;
    const activeMeta = describeTab(node.activeTab);
    return (
        <section className={styles.panel} style={style} data-panel-id={node.id}>
            <header
                className={`${styles.panelHeader} ${stacked ? styles.panelHeaderStacked : ''}`}
                onPointerDown={(event) => onHeaderPointerDown(event, node.id)}
                onDoubleClick={() => onFloat(node.id)}
            >
                {stacked ? (
                    <div className={styles.tabBar}>
                        {node.tabs.map((tabKey) => {
                            const tabMeta = describeTab(tabKey);
                            return (
                                <button
                                    key={tabKey}
                                    type="button"
                                    data-tab-btn=""
                                    className={`${styles.tabBtn} ${tabKey === node.activeTab ? styles.tabBtnActive : ''}`}
                                    title={tabMeta.title}
                                    onClick={() => onActivateTab(node.id, tabKey)}
                                    onPointerDown={(event) => {
                                        event.stopPropagation();
                                        onTabPointerDown(event, node.id, tabKey);
                                    }}
                                >
                                    {tabMeta.icon}
                                    <span>{tabMeta.title}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <span className={styles.panelTitle}>
                        {activeMeta.icon}
                        <span>{activeMeta.title}</span>
                    </span>
                )}
                <span className={styles.panelActions}>
                    <button
                        type="button"
                        className={styles.panelBtn}
                        title="Float"
                        onClick={() => onFloat(node.id)}
                    >
                        <LuPinOff />
                    </button>
                    <button
                        type="button"
                        className={styles.panelBtn}
                        onClick={() => onHide(node.id)}
                        aria-label="Close"
                    >
                        <LuX />
                    </button>
                </span>
            </header>
            <div className={styles.panelBody}>
                {renderTab(node.activeTab)}
            </div>
        </section>
    );
});

export default function DockLayout({
    root,
    describeTab,
    renderTab,
    onDockPanel,
    onMoveTab,
    onActivateTab,
    onFloatPanel,
    onHidePanel,
    onResize,
}: DockLayoutProps) {
    const areaRef = useRef<HTMLDivElement>(null);
    const previewLayerRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    // The full drag lifecycle runs outside React: refs + direct DOM writes only.
    // Panels never re-render during a drag; the tree updates exactly once, on drop.
    const dragRef = useRef<DragState | null>(null);
    const hoverRef = useRef<HoverTarget>(null);
    const rafRef = useRef<number | null>(null);
    /** Client-space rects captured once when the drag activates. */
    const panelRectsRef = useRef<Map<string, Rect>>(new Map());
    const areaRectRef = useRef<Rect | null>(null);

    const positionPreview = useCallback((target: HoverTarget) => {
        const preview = previewRef.current;
        const areaRect = areaRectRef.current;
        if (!preview || !areaRect) return;
        if (!target) {
            preview.style.display = 'none';
            return;
        }
        let rect: Rect;
        if (target.kind === 'panel') {
            const panelRect = panelRectsRef.current.get(target.panelId);
            if (!panelRect) return;
            rect = zoneRect(panelRect, target.zone);
        } else {
            rect = zoneRect(areaRect, target.side);
        }
        preview.style.width = `${Math.max(0, rect.width - PREVIEW_INSET_PX * 2)}px`;
        preview.style.height = `${Math.max(0, rect.height - PREVIEW_INSET_PX * 2)}px`;
        // Transform only — never top/left — so the preview never triggers layout.
        preview.style.transform = `translate3d(${rect.x - areaRect.x + PREVIEW_INSET_PX}px, ${rect.y - areaRect.y + PREVIEW_INSET_PX}px, 0)`;
        preview.style.display = 'block';
    }, []);

    /** Hit-test the cached rects (pure math — no DOM reads during the gesture). */
    const hitTest = useCallback((state: DragState): HoverTarget => {
        const { lastX, lastY } = state;
        for (const [panelId, rect] of panelRectsRef.current) {
            if (lastX < rect.x || lastX > rect.x + rect.width) continue;
            if (lastY < rect.y || lastY > rect.y + rect.height) continue;
            // Dropping a whole leaf onto itself is a no-op; a tab can still
            // split itself out of its own panel via the edge zones.
            if (state.kind === 'leaf' && panelId === state.panelId) return null;
            return { kind: 'panel', panelId, zone: resolveZone(rect, lastX, lastY) };
        }
        const areaRect = areaRectRef.current;
        if (!areaRect) return null;
        if (lastX < areaRect.x || lastX > areaRect.x + areaRect.width) return null;
        if (lastY < areaRect.y || lastY > areaRect.y + areaRect.height) return null;
        const side = resolveAreaSide(areaRect, lastX, lastY);
        return side ? { kind: 'area', side } : null;
    }, []);

    const updateHover = useCallback(() => {
        rafRef.current = null;
        const state = dragRef.current;
        if (!state || !state.active) return;
        const next = hitTest(state);
        if (sameTarget(hoverRef.current, next)) return;
        hoverRef.current = next;
        positionPreview(next);
    }, [hitTest, positionPreview]);

    const scheduleHoverUpdate = useCallback(() => {
        if (rafRef.current == null) {
            rafRef.current = requestAnimationFrame(updateHover);
        }
    }, [updateHover]);

    /** One measurement pass when the gesture becomes active; zero afterwards. */
    const activateDrag = useCallback((state: DragState) => {
        state.active = true;
        document.body.style.cursor = 'grabbing';
        const area = areaRef.current;
        if (!area) return;
        const rects = new Map<string, Rect>();
        const elements = area.querySelectorAll<HTMLElement>('[data-panel-id]');
        for (const element of elements) {
            const id = element.dataset.panelId;
            if (!id) continue;
            const rect = element.getBoundingClientRect();
            rects.set(id, { x: rect.left, y: rect.top, width: rect.width, height: rect.height });
        }
        panelRectsRef.current = rects;
        const areaDomRect = area.getBoundingClientRect();
        areaRectRef.current = { x: areaDomRect.left, y: areaDomRect.top, width: areaDomRect.width, height: areaDomRect.height };
        const source = area.querySelector<HTMLElement>(`[data-panel-id="${CSS.escape(state.panelId)}"]`);
        source?.classList.add(styles.dragSource);
        if (previewLayerRef.current) previewLayerRef.current.style.display = 'block';
        scheduleHoverUpdate();
    }, [scheduleHoverUpdate]);

    const endDrag = useCallback((state: DragState, apply: boolean) => {
        document.body.style.cursor = '';
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        const area = areaRef.current;
        area?.querySelector<HTMLElement>(`[data-panel-id="${CSS.escape(state.panelId)}"]`)
            ?.classList.remove(styles.dragSource);
        if (previewRef.current) previewRef.current.style.display = 'none';
        if (previewLayerRef.current) previewLayerRef.current.style.display = 'none';

        if (apply && state.active) {
            const target = hoverRef.current;
            const areaRect = areaRectRef.current;
            const outsideArea = !areaRect
                || state.lastX < areaRect.x || state.lastX > areaRect.x + areaRect.width
                || state.lastY < areaRect.y || state.lastY > areaRect.y + areaRect.height;
            if (outsideArea) {
                // Release outside the layout → float the dragged content.
                const rect = rectAroundPointer(state.lastX, state.lastY);
                if (state.kind === 'leaf') onFloatPanel(state.panelId, rect);
                else if (state.tabKey) onMoveTab(state.tabKey, state.panelId, { kind: 'float', rect });
            } else if (target?.kind === 'panel') {
                if (state.kind === 'leaf') onDockPanel(state.panelId, target.panelId, target.zone);
                else if (state.tabKey) onMoveTab(state.tabKey, state.panelId, { kind: 'panel', panelId: target.panelId, zone: target.zone });
            } else if (target?.kind === 'area') {
                if (state.kind === 'leaf') onDockPanel(state.panelId, null, target.side);
                else if (state.tabKey) onMoveTab(state.tabKey, state.panelId, { kind: 'area', side: target.side });
            }
        }
        dragRef.current = null;
        hoverRef.current = null;
    }, [onDockPanel, onFloatPanel, onMoveTab]);

    const beginDragGesture = useCallback((
        event: ReactPointerEvent<HTMLElement>,
        state: Omit<DragState, 'startX' | 'startY' | 'lastX' | 'lastY' | 'active' | 'pointerId'>,
    ) => {
        const full: DragState = {
            ...state,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            active: false,
        };
        dragRef.current = full;

        const onMove = (moveEvent: PointerEvent) => {
            const current = dragRef.current;
            if (!current || current.pointerId !== moveEvent.pointerId) return;
            current.lastX = moveEvent.clientX;
            current.lastY = moveEvent.clientY;
            if (!current.active) {
                const distance = Math.abs(current.lastX - current.startX) + Math.abs(current.lastY - current.startY);
                if (distance < DRAG_THRESHOLD_PX) return;
                activateDrag(current);
            }
            scheduleHoverUpdate();
        };
        const onUp = (upEvent: PointerEvent) => {
            const current = dragRef.current;
            if (!current || current.pointerId !== upEvent.pointerId) return;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
            endDrag(current, true);
        };
        const onCancel = (cancelEvent: PointerEvent) => {
            const current = dragRef.current;
            if (!current || current.pointerId !== cancelEvent.pointerId) return;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
            endDrag(current, false);
        };
        const onKey = (keyEvent: KeyboardEvent) => {
            if (keyEvent.key !== 'Escape') return;
            const current = dragRef.current;
            if (!current) return;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
            endDrag(current, false);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey);
    }, [activateDrag, endDrag, scheduleHoverUpdate]);

    const onHeaderPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>, panelId: string) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest('button')) return;
        event.preventDefault();
        beginDragGesture(event, { kind: 'leaf', panelId });
    }, [beginDragGesture]);

    const onTabPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>, panelId: string, tabKey: string) => {
        if (event.button !== 0) return;
        event.preventDefault();
        beginDragGesture(event, { kind: 'tab', panelId, tabKey });
    }, [beginDragGesture]);

    /**
     * Divider gesture: both children are re-weighted by writing `flex-grow`
     * directly on their DOM nodes (rAF-coalesced, zero React renders); the
     * ratio is committed to the tree once on release and matches the visuals.
     */
    const beginResize = useCallback((
        event: ReactPointerEvent<HTMLElement>,
        path: number[],
        direction: SplitDirection,
    ) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const divider = event.currentTarget;
        const first = divider.previousElementSibling as HTMLElement | null;
        const second = divider.nextElementSibling as HTMLElement | null;
        if (!first || !second) return;
        const firstRect = first.getBoundingClientRect();
        const secondRect = second.getBoundingClientRect();
        // Distributable space between the two children — NOT divider.offsetWidth,
        // whose cross-axis size stretches with the flex container.
        const totalPx = direction === 'horizontal'
            ? firstRect.width + secondRect.width
            : firstRect.height + secondRect.height;
        if (totalPx <= 0) return;
        const startPx = direction === 'horizontal' ? event.clientX : event.clientY;
        const startRatio = (direction === 'horizontal' ? firstRect.width : firstRect.height) / totalPx;
        const minPx = direction === 'horizontal' ? MIN_PANEL_PX.width : MIN_PANEL_PX.height;
        const minRatio = Math.min(0.5, minPx / totalPx);
        let ratio = startRatio;
        let raf = 0;
        const apply = () => {
            raf = 0;
            first.style.flexGrow = String(ratio);
            second.style.flexGrow = String(1 - ratio);
        };
        const onMove = (moveEvent: PointerEvent) => {
            if (moveEvent.pointerId !== event.pointerId) return;
            const delta = (direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY) - startPx;
            ratio = Math.min(1 - minRatio, Math.max(minRatio, startRatio + delta / totalPx));
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const onUp = (upEvent: PointerEvent) => {
            if (upEvent.pointerId !== event.pointerId) return;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            document.body.style.cursor = '';
            if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
            apply();
            onResize(path, Math.min(1 - MIN_RATIO, Math.max(MIN_RATIO, ratio)));
        };
        const onCancel = (cancelEvent: PointerEvent) => {
            if (cancelEvent.pointerId !== event.pointerId) return;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            document.body.style.cursor = '';
            if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        };
        document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
    }, [onResize]);

    const renderNode = (node: LayoutNode, style: CSSProperties, path: number[]): ReactNode => {
        if (node.type === 'panel') {
            return (
                <DockPanelView
                    key={node.id}
                    node={node}
                    style={style}
                    describeTab={describeTab}
                    renderTab={renderTab}
                    onActivateTab={onActivateTab}
                    onHeaderPointerDown={onHeaderPointerDown}
                    onTabPointerDown={onTabPointerDown}
                    onFloat={onFloatPanel}
                    onHide={onHidePanel}
                />
            );
        }
        const split = node as SplitNode;
        const horizontal = split.direction === 'horizontal';
        return (
            <div
                key={split.id}
                className={horizontal ? styles.splitH : styles.splitV}
                style={style}
            >
                {renderNode(split.first, { flex: `${split.ratio} 1 0%` }, [...path, 0])}
                <div
                    className={horizontal ? styles.dividerH : styles.dividerV}
                    onPointerDown={(event) => beginResize(event, path, split.direction)}
                />
                {renderNode(split.second, { flex: `${1 - split.ratio} 1 0%` }, [...path, 1])}
            </div>
        );
    };

    return (
        <div className={styles.dockArea} ref={areaRef}>
            {root ? renderNode(root, { flex: '1 1 0%' }, []) : null}
            {/* Separate overlay layer: pointer-events none, never part of the layout. */}
            <div className={styles.previewLayer} ref={previewLayerRef} aria-hidden="true">
                <div className={styles.previewRect} ref={previewRef} />
            </div>
        </div>
    );
}
