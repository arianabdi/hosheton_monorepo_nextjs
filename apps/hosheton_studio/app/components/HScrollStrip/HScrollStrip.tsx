'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import styles from './HScrollStrip.module.scss';

const DRAG_THRESHOLD_PX = 5;

type Props = {
    children: ReactNode;
    /** Extra class for the root (e.g. to override --hscroll-gap / --hscroll-margin). */
    className?: string;
};

/**
 * Single-row horizontal strip: one scrollable line with edge fades that appear
 * only where more content is available. Mouse users press-and-drag to pan (no
 * shift+wheel needed); touch devices scroll natively.
 */
export default function HScrollStrip({ children, className }: Props) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({ pointerId: -1, startX: 0, startScroll: 0, active: false, moved: false });
    const [dragging, setDragging] = useState(false);
    const [fades, setFades] = useState({ start: false, end: false });

    const updateFades = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 1) {
            setFades({ start: false, end: false });
            return;
        }
        // RTL scrollers report negative scrollLeft; |scrollLeft| is the distance
        // from the inline-start edge in both directions.
        const pos = Math.abs(el.scrollLeft);
        setFades({ start: pos > 1, end: pos < max - 1 });
    }, []);

    useEffect(() => {
        updateFades();
        const el = scrollerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(updateFades);
        observer.observe(el);
        return () => observer.disconnect();
    }, [updateFades]);

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        const el = scrollerRef.current;
        if (!el) return;
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScroll: el.scrollLeft,
            active: true,
            moved: false,
        };
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const el = scrollerRef.current;
        if (!drag.active || !el) return;
        const delta = event.clientX - drag.startX;
        if (!drag.moved && Math.abs(delta) > DRAG_THRESHOLD_PX) {
            drag.moved = true;
            setDragging(true);
            // Retarget the rest of the gesture to the strip so the click that
            // follows a drag never reaches the items' buttons.
            try {
                el.setPointerCapture(drag.pointerId);
            } catch {
                // Pointer may already be released; scrolling still works.
            }
        }
        if (drag.moved) {
            el.scrollLeft = drag.startScroll - delta;
        }
    };

    const endDrag = () => {
        if (!dragRef.current.active) return;
        dragRef.current.active = false;
        // Keep `moved` until the click that follows pointerup has passed.
        window.setTimeout(() => {
            dragRef.current.moved = false;
            setDragging(false);
        }, 0);
    };

    const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (dragRef.current.moved) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    const onDragStart = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    return (
        <div className={className ? `${styles.wrap} ${className}` : styles.wrap}>
            <div
                ref={scrollerRef}
                className={`${styles.scroller} ${dragging ? styles.dragging : ''}`}
                onScroll={updateFades}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClickCapture={onClickCapture}
                onDragStart={onDragStart}
            >
                {children}
            </div>
            {fades.start && (
                <div className={`${styles.fade} ${styles.fadeStart}`} aria-hidden="true">
                    <span className={`${styles.chev} ${styles.chevStart}`}>
                        <LuChevronLeft size={13} />
                    </span>
                </div>
            )}
            {fades.end && (
                <div className={`${styles.fade} ${styles.fadeEnd}`} aria-hidden="true">
                    <span className={`${styles.chev} ${styles.chevEnd}`}>
                        <LuChevronRight size={13} />
                    </span>
                </div>
            )}
        </div>
    );
}
