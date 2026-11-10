'use client';

import { useCallback, useId, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import { useAnimationFrame } from 'framer-motion';
import { CatRig } from './rig/CatRig';
import type { PoseName } from './rig/poses';

export type CatFigureHandle = { readonly rig: CatRig | null };

type Props = {
    ref?: Ref<CatFigureHandle>;
    /** ژست اولیه؛ بعد از mount با rig.setPose عوض می‌شود */
    pose?: PoseName;
    x?: number;
    y?: number;
    scale?: number;
    /** ضریب زمان (برای اسلوموشن در صفحهٔ تست) */
    timeScale?: number;
    paused?: boolean;
};

/**
 * گربه داخل یک <svg> والد رندر می‌شود؛ هندسه هر فریم مستقیم روی SVG نوشته می‌شود (بدون رندر React).
 * ساعت فریم‌ها از useAnimationFrame فریمر است و با پنهان شدن تب خودبه‌خود متوقف می‌شود.
 */
export default function CatFigure({ ref, pose = 'stand', x = 0, y = 0, scale = 1, timeScale = 1, paused = false }: Props) {
    const hostRef = useRef<SVGGElement>(null);
    const rigRef = useRef<CatRig | null>(null);
    const initial = useRef({ pose, x, y, scale });
    const live = useRef({ timeScale, paused });
    const id = `cat-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

    useLayoutEffect(() => {
        live.current = { timeScale, paused };
    }, [timeScale, paused]);

    useLayoutEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;
        const rig = new CatRig(host, { id, ...initial.current });
        rigRef.current = rig;
        return () => {
            rig.destroy();
            rigRef.current = null;
        };
    }, [id]);

    useLayoutEffect(() => {
        const rig = rigRef.current;
        if (!rig) return;
        rig.x = x;
        rig.y = y;
        rig.scale = scale;
    }, [x, y, scale]);

    useImperativeHandle(ref, () => ({
        get rig() {
            return rigRef.current;
        },
    }), []);

    const tick = useCallback((_time: number, delta: number) => {
        const rig = rigRef.current;
        if (!rig || live.current.paused) return;
        rig.update((Math.min(delta, 50) / 1000) * live.current.timeScale);
    }, []);
    useAnimationFrame(tick);

    return <g ref={hostRef} />;
}
