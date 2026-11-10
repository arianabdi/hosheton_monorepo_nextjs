'use client';

import { useEffect, useRef } from 'react';
import { LuMousePointerClick } from 'react-icons/lu';
import CatFigure, { type CatFigureHandle } from '../projects/[projectId]/chat/chatInput/cat/CatFigure';
import { POSES } from '../projects/[projectId]/chat/chatInput/cat/rig/poses';
import { POSE_INFO, POSE_USAGE, SCENARIOS, type PoseDef } from './catalog';
import { useInspector } from './inspector';
import styles from './Animations.module.scss';

/* گالری همهٔ ژست‌ها: هر خانه همان ریگ واقعی است؛ ژست‌های دوتایی رفت‌وبرگشت می‌کنند تا گذار فنری دیده شود */

export const GROUND_CLIP = 'animations-ground';

export function PosesPanel() {
    const { fa } = useInspector();
    return (
        <>
            <p className={styles.panelNote}>
                {fa
                    ? 'هر ژست فقط تفاوتش با «stand» را می‌گوید و ریگ با فنرها به آن می‌رود. نوار زیر هر گربه جای لبهٔ بالای چت‌باکس است. روی نام هر ژست بزنید تا در زمین بازی باز شود.'
                    : 'Each pose only lists its differences from "stand" and the rig springs into it. The bar under each cat stands in for the chat box top edge. Open any pose in the playground.'}
            </p>
            <div className={styles.poseGrid}>
                {POSE_INFO.map((def) => <PoseCell key={def.pose} def={def} />)}
            </div>
        </>
    );
}

function PoseCell({ def }: { def: PoseDef }) {
    const { tx, fa, openInPlayground } = useInspector();
    const cat = useRef<CatFigureHandle>(null);

    useEffect(() => {
        const timers: ReturnType<typeof setInterval>[] = [];
        const every = (def.every ?? 2) * 1000;
        if (def.alt) {
            const alt = def.alt;
            let flip = false;
            timers.push(setInterval(() => {
                flip = !flip;
                const rig = cat.current?.rig;
                if (!rig) return;
                rig.setPose(flip ? alt : def.pose);
                if (def.pose === 'startle' && !flip) {
                    rig.kick('lift', 170);
                    rig.emit('exclaim');
                }
            }, every));
        }
        if (def.emit) {
            const kind = def.emit;
            timers.push(setInterval(() => cat.current?.rig?.emit(kind), every));
        }
        return () => timers.forEach(clearInterval);
    }, [def]);

    const changed = Object.keys(POSES[def.pose]).length;
    const usage = POSE_USAGE[def.pose] ?? [];

    return (
        <figure className={styles.poseCell}>
            <svg className={styles.poseStage} viewBox="-120 -112 240 126" aria-hidden>
                <rect className={styles.shelf} x="-118" y="0" width="236" height="40" rx="12" />
                <g clipPath={`url(#${GROUND_CLIP})`}>
                    <CatFigure ref={cat} pose={def.pose} x={def.x ?? 0} />
                </g>
            </svg>
            <figcaption>
                <div className={styles.poseName}>
                    <button
                        type="button"
                        className={styles.poseOpen}
                        dir="ltr"
                        onClick={() => openInPlayground(def.pose)}
                        title={fa ? 'باز کردن در زمین بازی' : 'Open in the playground'}
                    >
                        {def.pose}
                        <LuMousePointerClick size={12} />
                    </button>
                    <span className={styles.meta}>
                        {fa ? `${changed} پارامتر` : `${changed} params`}
                        {def.alt ? ` · ↔ ${def.alt}` : ''}
                    </span>
                </div>
                <p>{tx(def.body)}</p>
                <div className={styles.metaRow}>
                    {usage.length ? usage.map((item) => (
                        <span key={`${item.scenario}-${item.title.en}`} className={styles.chipStatic}>
                            {`${tx(SCENARIOS.find((s) => s.name === item.scenario)?.title ?? item.title)} · ${tx(item.title)}`}
                        </span>
                    )) : (
                        <span className={styles.muted}>{fa ? 'در سناریوها استفاده نمی‌شود' : 'Not used by any scenario'}</span>
                    )}
                </div>
            </figcaption>
        </figure>
    );
}
