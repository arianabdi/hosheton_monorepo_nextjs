'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * اندازه‌ی قاب ویدیو را طوری محاسبه می‌کند که کامل داخل محوطه‌ی صحنه جا شود
 * (fullheight) و نسبت تصویر دقیقاً حفظ شود — خروجی بر حسب پیکسل است.
 * اگر ری‌رندر باعث تعویض خودِ نود DOM شود (مثلاً گذر شاخه‌ی خالی → محتوا)،
 * دوباره روی نود تازه observe می‌کند تا اندازه کهنه نماند.
 */
export function useFitSize(containerRef: React.RefObject<HTMLElement | null>, stageWidth: number, stageHeight: number) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const rafRef = useRef(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const observedRef = useRef<HTMLElement | null>(null);
    const dimsRef = useRef({ stageWidth, stageHeight });

    // ابعاد استیج همیشه تازه در دسترس callbackهای observer باشند
    useEffect(() => {
        dimsRef.current = { stageWidth, stageHeight };
    }, [stageWidth, stageHeight]);

    useEffect(() => {
        const compute = (el: HTMLElement) => {
            const width = el.clientWidth - 24;
            const height = el.clientHeight - 24;
            if (width <= 0 || height <= 0) return;
            const { stageWidth: sw, stageHeight: sh } = dimsRef.current;
            const scale = Math.min(width / sw, height / sh);
            const next = {
                width: Math.floor(sw * scale),
                height: Math.floor(sh * scale),
            };
            setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
        };

        const el = containerRef.current;
        if (!el) return;
        if (!observerRef.current) {
            observerRef.current = new ResizeObserver(() => {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = requestAnimationFrame(() => {
                    if (observedRef.current) compute(observedRef.current);
                });
            });
        }
        if (observedRef.current !== el) {
            observerRef.current.disconnect();
            observerRef.current.observe(el);
            observedRef.current = el;
            compute(el);
        }
    });

    useEffect(() => () => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        observedRef.current = null;
        cancelAnimationFrame(rafRef.current);
    }, []);

    return size;
}
