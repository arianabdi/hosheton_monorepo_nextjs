'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * مرتب‌سازی لیست با کشیدن دستگیره (موس و لمس) + کیبورد (↑/↓ روی دستگیره).
 * بدون کتابخانه: با pointer capture روی دستگیره، جای رها کردن از وسط هر آیتم حساب می‌شود.
 *
 * dropIndex = جای درج بین آیتم‌ها (۰ تا count)؛ برای خط راهنمای رها کردن.
 */
export function useSortableList({
    count,
    getItemElement,
    onMove,
    getHandleElement,
}: {
    count: number;
    getItemElement: (index: number) => HTMLElement | null;
    onMove: (from: number, to: number) => void;
    /** برای برگرداندن فوکوس به دستگیره بعد از جابه‌جایی با کیبورد */
    getHandleElement?: (index: number) => HTMLElement | null;
}) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const dropRef = useRef<number | null>(null);

    const insertionIndexAt = (clientY: number) => {
        for (let index = 0; index < count; index += 1) {
            const rect = getItemElement(index)?.getBoundingClientRect();
            if (rect && clientY < rect.top + rect.height / 2) return index;
        }
        return count;
    };

    const finish = (commit: boolean) => {
        const from = dragIndex;
        const insertion = dropRef.current;
        setDragIndex(null);
        setDropIndex(null);
        dropRef.current = null;
        if (!commit || from == null || insertion == null) return;
        const to = insertion > from ? insertion - 1 : insertion;
        if (to !== from) onMove(from, to);
    };

    const moveByKeyboard = (index: number, to: number) => {
        if (to < 0 || to >= count) return;
        onMove(index, to);
        requestAnimationFrame(() => getHandleElement?.(to)?.focus());
    };

    const handleProps = (index: number) => ({
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            dropRef.current = index;
            setDragIndex(index);
            setDropIndex(index);
        },
        onPointerMove: (event: PointerEvent<HTMLElement>) => {
            if (dragIndex == null) return;
            // نزدیک لبه‌ی بالا/پایین پنجره، صفحه خودش اسکرول شود
            const edge = 56;
            if (event.clientY < edge) window.scrollBy(0, -14);
            else if (event.clientY > window.innerHeight - edge) window.scrollBy(0, 14);
            const next = insertionIndexAt(event.clientY);
            if (next !== dropRef.current) {
                dropRef.current = next;
                setDropIndex(next);
            }
        },
        onPointerUp: () => finish(true),
        onPointerCancel: () => finish(false),
        onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveByKeyboard(index, index - 1);
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveByKeyboard(index, index + 1);
            } else if (event.key === 'Escape' && dragIndex != null) {
                finish(false);
            }
        },
    });

    /** خط راهنما فقط وقتی رها کردن واقعاً جابه‌جا می‌کند */
    const dropIndicator = (index: number): 'before' | 'after' | null => {
        if (dragIndex == null || dropIndex == null) return null;
        if (dropIndex === dragIndex || dropIndex === dragIndex + 1) return null;
        if (dropIndex === index) return 'before';
        if (dropIndex === count && index === count - 1) return 'after';
        return null;
    };

    return { dragIndex, handleProps, dropIndicator };
}

/** اندیس آیتم بازشده بعد از جابه‌جایی from → to */
export function remapIndexAfterMove(current: number | null, from: number, to: number): number | null {
    if (current == null) return current;
    if (current === from) return to;
    if (from < current && current <= to) return current - 1;
    if (to <= current && current < from) return current + 1;
    return current;
}
