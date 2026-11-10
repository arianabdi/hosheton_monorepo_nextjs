'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { LuX, LuPinOff } from 'react-icons/lu';
import styles from './FloatingPanel.module.scss';

export type FloatingPanelResizeEdge = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface SnapRect {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

type FloatingPanelProps = {
    title: string;
    icon?: ReactNode;
    rect: { x: number; y: number; width: number; height: number };
    z?: number;
    children: ReactNode;
    headerExtra?: ReactNode;
    onRectChange: (rect: { x: number; y: number; width: number; height: number }) => void;
    onFocus?: () => void;
    onClose?: () => void;
    onDock?: () => void;
    /** Other floating windows this panel can magnet-snap to. */
    snapTargets?: SnapRect[];
    minWidth?: number;
    minHeight?: number;
};

const RESIZE_HANDLES: FloatingPanelResizeEdge[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
const SNAP_THRESHOLD = 9;

/**
 * Edge/corner + sibling snapping. Candidates are checked per axis and the
 * closest one inside the threshold wins; corners emerge naturally when both
 * axes snap to the viewport bounds.
 */
function applySnap(
    x: number,
    y: number,
    width: number,
    height: number,
    targets: SnapRect[],
): { x: number; y: number } {
    const maxX = window.innerWidth;
    const maxY = window.innerHeight;
    let bestDeltaX = Infinity;
    let bestValueX = x;
    let bestDeltaY = Infinity;
    let bestValueY = y;
    const consider = (cands: number[], value: number, axis: 'x' | 'y') => {
        for (const cand of cands) {
            const delta = Math.abs(value - cand);
            if (axis === 'x') {
                if (delta <= SNAP_THRESHOLD && delta < bestDeltaX) {
                    bestDeltaX = delta;
                    bestValueX = cand;
                }
            } else if (delta <= SNAP_THRESHOLD && delta < bestDeltaY) {
                bestDeltaY = delta;
                bestValueY = cand;
            }
        }
    };
    const xCands = [0, maxX - width];
    const yCands = [0, maxY - height];
    for (const t of targets) {
        xCands.push(t.x, t.x + t.width, t.x - width, t.x + t.width - width);
        yCands.push(t.y, t.y + t.height, t.y - height, t.y + t.height - height);
    }
    consider(xCands, x, 'x');
    consider(yCands, y, 'y');
    // Hard clamp: windows stay inside the viewport, so crossing an edge
    // always lands exactly on it (standard window-manager behaviour).
    return {
        x: Math.min(Math.max(0, bestValueX), Math.max(0, maxX - width)),
        y: Math.min(Math.max(0, bestValueY), Math.max(0, maxY - height)),
    };
}

export default function FloatingPanel({
    title,
    icon,
    rect,
    z,
    children,
    headerExtra,
    onRectChange,
    onFocus,
    onClose,
    onDock,
    snapTargets = [],
    minWidth = 240,
    minHeight = 140,
}: FloatingPanelProps) {
    const panelRef = useRef<HTMLElement>(null);
    const dragStateRef = useRef<{
        mode: 'move' | FloatingPanelResizeEdge;
        pointerId: number;
        startX: number;
        startY: number;
        original: { x: number; y: number; width: number; height: number };
        latest: { x: number; y: number; width: number; height: number };
    } | null>(null);

    // Drag/resize mutate the panel element directly for zero-lag feedback;
    // React state (and the persisted layout) is committed once on release.
    const applyStyle = (next: { x: number; y: number; width: number; height: number }) => {
        const el = panelRef.current;
        if (!el) return;
        el.style.left = `${next.x}px`;
        el.style.top = `${next.y}px`;
        el.style.width = `${next.width}px`;
        el.style.height = `${next.height}px`;
    };

    const clampRect = useCallback((next: { x: number; y: number; width: number; height: number }) => {
        const maxW = Math.max(minWidth, window.innerWidth - 16);
        const maxH = Math.max(minHeight, window.innerHeight - 16);
        const width = Math.min(maxW, Math.max(minWidth, next.width));
        const height = Math.min(maxH, Math.max(minHeight, next.height));
        const x = Math.min(Math.max(-width + 80, next.x), Math.max(0, window.innerWidth - 80));
        const y = Math.min(Math.max(0, next.y), Math.max(0, window.innerHeight - 48));
        return { x, y, width, height };
    }, [minHeight, minWidth]);

    const beginGesture = useCallback((event: ReactPointerEvent<HTMLElement>, mode: 'move' | FloatingPanelResizeEdge) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        onFocus?.();

        dragStateRef.current = {
            mode,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            original: { ...rect },
            latest: { ...rect },
        };

        const handleMove = (moveEvent: PointerEvent) => {
            const state = dragStateRef.current;
            if (!state || state.pointerId !== moveEvent.pointerId) return;
            const dx = moveEvent.clientX - state.startX;
            const dy = moveEvent.clientY - state.startY;
            const base = state.original;

            let next = { ...base };
            if (mode === 'move') {
                next = { ...base, x: base.x + dx, y: base.y + dy };
                const snapped = applySnap(next.x, next.y, next.width, next.height, snapTargets);
                next.x = snapped.x;
                next.y = snapped.y;
            } else {
                if (mode.includes('e')) next.width = base.width + dx;
                if (mode.includes('s')) next.height = base.height + dy;
                if (mode.includes('w')) {
                    next.x = base.x + dx;
                    next.width = base.width - dx;
                }
                if (mode.includes('n')) {
                    next.y = base.y + dy;
                    next.height = base.height - dy;
                }
                if (next.width < minWidth && mode.includes('w')) next.x = base.x + base.width - minWidth;
                if (next.height < minHeight && mode.includes('n')) next.y = base.y + base.height - minHeight;
            }

            next = clampRect(next);
            state.latest = next;
            applyStyle(next);
        };

        const handleUp = (upEvent: PointerEvent) => {
            const state = dragStateRef.current;
            if (!state || state.pointerId !== upEvent.pointerId) return;
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
            dragStateRef.current = null;
            onRectChange(state.latest);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
    }, [clampRect, onFocus, onRectChange, rect, snapTargets, minHeight, minWidth]);

    const handles = useMemo(() => RESIZE_HANDLES.map((edge) => (
        <span
            key={edge}
            className={`${styles.resizeHandle} ${styles[edge]}`}
            onPointerDown={(event) => beginGesture(event, edge)}
        />
    )), [beginGesture]);

    return (
        <section
            ref={panelRef}
            className={styles.floatingPanel}
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: z }}
            onPointerDown={() => onFocus?.()}
        >
            <header
                className={styles.panelHeader}
                onPointerDown={(event) => beginGesture(event, 'move')}
                onDoubleClick={() => onDock?.()}
            >
                <span className={styles.panelTitle}>
                    {icon}
                    <span>{title}</span>
                </span>
                <span className={styles.headerExtra} onPointerDown={(event) => event.stopPropagation()}>
                    {headerExtra}
                </span>
                <span className={styles.headerActions} onPointerDown={(event) => event.stopPropagation()}>
                    {onDock && (
                        <button type="button" className={styles.headerBtn} title="Dock" onClick={onDock}>
                            <LuPinOff />
                        </button>
                    )}
                    {onClose && (
                        <button type="button" className={styles.headerBtn} onClick={onClose} aria-label="Close">
                            <LuX />
                        </button>
                    )}
                </span>
            </header>
            <div className={styles.panelBody}>
                {children}
            </div>
            {handles}
        </section>
    );
}
