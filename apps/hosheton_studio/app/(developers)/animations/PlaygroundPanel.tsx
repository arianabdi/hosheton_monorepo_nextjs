'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import CatFigure, { type CatFigureHandle } from '../projects/[projectId]/chat/chatInput/cat/CatFigure';
import type { CatRig, ParticleKind } from '../projects/[projectId]/chat/chatInput/cat/rig/CatRig';
import { PARAMS, PARAM_NAMES, SPRINGS, type SpringGroup } from '../projects/[projectId]/chat/chatInput/cat/rig/params';
import { POSES, type PoseName } from '../projects/[projectId]/chat/chatInput/cat/rig/poses';
import { PARAM_INFO, SPRING_INFO } from './catalog';
import { useInspector } from './inspector';
import { GROUND_CLIP } from './PosesPanel';
import { Switch } from './ui';
import styles from './Animations.module.scss';

/* زمین بازی: یک ریگ آزاد برای دیدن گذار بین ژست‌ها، چرخیدن، نشانه‌ها و مقدار زندهٔ پارامترها */

const POSE_NAMES = Object.keys(POSES) as PoseName[];
const PARTICLES: ParticleKind[] = ['heart', 'z', 'question', 'exclaim', 'note'];
const GROUPS = Object.keys(SPRINGS) as SpringGroup[];

type Live = ReturnType<CatRig['inspect']>;

export function PlaygroundPanel() {
    const { playgroundPose, fa, tx } = useInspector();
    const cat = useRef<CatFigureHandle>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [pose, setPose] = useState<PoseName>(playgroundPose);
    const [speed, setSpeed] = useState(1);
    const [follow, setFollow] = useState(true);
    const [tour, setTour] = useState(false);
    const [heading, setHeading] = useState(0);
    const [paused, setPaused] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [live, setLive] = useState<Live | null>(null);

    useEffect(() => {
        const timer = window.setInterval(() => setLive(cat.current?.rig?.inspect() ?? null), 200);
        return () => window.clearInterval(timer);
    }, []);

    const go = (name: PoseName) => {
        setPose(name);
        cat.current?.rig?.setPose(name);
    };

    useEffect(() => {
        if (!tour) return undefined;
        let index = POSE_NAMES.indexOf(pose);
        const timer = setInterval(() => {
            index = (index + 1) % POSE_NAMES.length;
            setPose(POSE_NAMES[index]);
            cat.current?.rig?.setPose(POSE_NAMES[index]);
        }, 2600);
        return () => clearInterval(timer);
        // pose فقط نقطهٔ شروع تور است
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tour]);

    const onMove = (event: ReactPointerEvent<SVGSVGElement>) => {
        const svg = svgRef.current;
        const rig = cat.current?.rig;
        if (!svg || !rig || !follow) return;
        const matrix = svg.getScreenCTM();
        if (!matrix) return;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        rig.lookAt(point.x, point.y);
    };

    return (
        <div className={styles.playground}>
            <div className={styles.playMain}>
                <svg
                    ref={svgRef}
                    className={styles.playStage}
                    viewBox="-210 -122 420 140"
                    onPointerMove={onMove}
                    onPointerLeave={() => cat.current?.rig?.lookAt(null)}
                >
                    <rect className={styles.shelf} x="-205" y="0" width="410" height="60" rx="18" />
                    <g clipPath={`url(#${GROUND_CLIP})`}>
                        <CatFigure ref={cat} pose={playgroundPose} scale={1.05} timeScale={speed} paused={paused} />
                    </g>
                </svg>

                <div className={styles.controlBlock}>
                    <span className={styles.controlLabel}>{fa ? 'ژست' : 'Pose'}</span>
                    <div className={styles.chipRow} dir="ltr">
                        {POSE_NAMES.map((name) => (
                            <button
                                key={name}
                                type="button"
                                className={`${styles.chip} ${name === pose ? styles.chipActive : ''}`}
                                onClick={() => go(name)}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.controlBlock}>
                    <span className={styles.controlLabel}>{fa ? 'حرکت‌ها' : 'Actions'}</span>
                    <div className={styles.chipRow}>
                        <button type="button" className={styles.btn} onClick={() => cat.current?.rig?.turn('front')}>{fa ? 'چرخیدن از جلو' : 'Turn via front'}</button>
                        <button type="button" className={styles.btn} onClick={() => cat.current?.rig?.turn('back')}>{fa ? 'چرخیدن از پشت' : 'Turn via back'}</button>
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={() => {
                                const rig = cat.current?.rig;
                                rig?.kick('sy', -2.2);
                                rig?.kick('lift', 210);
                            }}
                        >
                            {fa ? 'پرش کوچک' : 'Hop'}
                        </button>
                        <button type="button" className={styles.btn} onClick={() => cat.current?.rig?.twitchEar('both')}>{fa ? 'تکان گوش' : 'Ear twitch'}</button>
                        <button type="button" className={styles.btn} onClick={() => cat.current?.rig?.blink()}>{fa ? 'پلک' : 'Blink'}</button>
                        <button type="button" className={styles.btn} onClick={() => cat.current?.rig?.spin(1, 'front', 240)}>{fa ? 'یک دور' : 'Spin'}</button>
                        {PARTICLES.map((kind) => (
                            <button key={kind} type="button" className={styles.btn} dir="ltr" onClick={() => cat.current?.rig?.emit(kind)}>{kind}</button>
                        ))}
                    </div>
                </div>

                <div className={styles.controlBlock}>
                    <span className={styles.controlLabel}>{fa ? 'نمایش' : 'View'}</span>
                    <div className={styles.chipRow}>
                        <Switch checked={tour} onChange={setTour} label={fa ? 'گردش خودکار بین ژست‌ها' : 'Auto tour'} />
                        <Switch checked={paused} onChange={setPaused} label={fa ? 'مکث' : 'Pause'} />
                        <button type="button" className={styles.btn} onClick={() => cat.current?.rig?.update(1 / 30)} disabled={!paused}>
                            {fa ? 'یک فریم' : 'Step'}
                        </button>
                        <Switch
                            checked={follow}
                            onChange={(value) => {
                                setFollow(value);
                                if (!value) cat.current?.rig?.lookAt(null);
                            }}
                            label={fa ? 'نگاه دنبال ماوس' : 'Eyes follow mouse'}
                        />
                        <label className={styles.selectLabel}>
                            {fa ? 'سرعت' : 'Speed'}
                            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                                <option value={0.1}>0.1×</option>
                                <option value={0.25}>0.25×</option>
                                <option value={0.5}>0.5×</option>
                                <option value={1}>1×</option>
                            </select>
                        </label>
                        <label className={styles.rangeLabel}>
                            <span dir="ltr">{`heading ${heading}°`}</span>
                            <input
                                type="range"
                                min={-180}
                                max={180}
                                step={5}
                                value={heading}
                                onChange={(event) => {
                                    const deg = Number(event.target.value);
                                    setHeading(deg);
                                    cat.current?.rig?.setHeading(deg);
                                }}
                            />
                        </label>
                    </div>
                </div>
            </div>

            <aside className={styles.liveParams}>
                <div className={styles.logHead}>
                    <span>{fa ? 'مقدار زندهٔ پارامترها' : 'Live parameters'}</span>
                    <Switch checked={showAll} onChange={setShowAll} label={fa ? 'همه' : 'All'} />
                </div>
                <p className={styles.muted}>
                    {fa
                        ? 'فعلی ← هدف؛ بدون «همه» فقط پارامترهایی که با stand فرق دارند یا در حال حرکت‌اند.'
                        : 'current → target; without "All" only params that differ from stand or are moving.'}
                </p>
                {live ? GROUPS.map((group) => {
                    const names = PARAM_NAMES.filter((name) => {
                        if (PARAMS[name].g !== group) return false;
                        const value = live.params[name];
                        return showAll || Math.abs(value.t - PARAMS[name].v) > 1e-6 || Math.abs(value.x - value.t) > 0.01;
                    });
                    if (!names.length) return null;
                    return (
                        <div key={group} className={styles.paramGroup}>
                            <div className={styles.paramGroupHead} title={tx(SPRING_INFO[group])}>
                                <code dir="ltr">{group}</code>
                                <span className={styles.muted} dir="ltr">{`k ${SPRINGS[group].k} · z ${SPRINGS[group].z}`}</span>
                            </div>
                            <ul>
                                {names.map((name) => {
                                    const value = live.params[name];
                                    const moving = Math.abs(value.x - value.t) > 0.01;
                                    return (
                                        <li key={name} className={moving ? styles.paramMoving : undefined} title={tx(PARAM_INFO[name])}>
                                            <code dir="ltr">{name}</code>
                                            <span dir="ltr">{`${value.x.toFixed(2)} → ${value.t.toFixed(2)}`}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                }) : null}
            </aside>
        </div>
    );
}
