'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import CatFigure, { type CatFigureHandle } from '../CatFigure';
import ChatCat, { type ChatCatHandle } from '../ChatCat';
import { SCENARIO_NAMES, type ChatCatConfig } from '../config';
import type { CatRig, ParticleKind } from '../rig/CatRig';
import type { PoseName } from '../rig/poses';
import chatStyles from '../../ChatInput.module.scss';
import styles from './CatLab.module.scss';

/* صفحهٔ تست (فقط dev): گالری ژست‌ها + زمین بازی برای دیدن گذار بین ژست‌ها */

type GalleryItem = {
    pose: PoseName;
    label: string;
    note: string;
    /** جابه‌جایی افقی گربه در کارت */
    x?: number;
    /** ژست دوم برای رفت‌وبرگشت (نمایش گذار) */
    alt?: PoseName;
    emit?: ParticleKind;
    every?: number;
};

const GALLERY: GalleryItem[] = [
    { pose: 'stand', label: 'Stand', note: 'side view' },
    { pose: 'walk', label: 'Walk', note: 'diagonal pairs + body bob' },
    { pose: 'walkSlow', label: 'Slow walk', note: 'calm, step by step' },
    { pose: 'run', label: 'Run', note: 'bound, spine flex' },
    { pose: 'sitSide', label: 'Sit · side', note: 'haunch + tail on the ground' },
    { pose: 'sitFront', label: 'Sit · front', note: 'tail waving' },
    { pose: 'sitFrontWrap', label: 'Sit · front', note: 'tail wrapped around paws' },
    { pose: 'sitBack', label: 'Sit · back', note: 'stripes on the back' },
    { pose: 'sitBackLook', label: 'Back · over the shoulder', note: 'head turned' },
    { pose: 'lieCurl', label: 'Sleep · curled', note: 'slow breathing', emit: 'z', every: 1.7 },
    { pose: 'lieSide', label: 'Sleep · on its side', note: 'stretched along the input', emit: 'z', every: 2, x: 22 },
    { pose: 'stretch', label: 'Stretch · play-bow', note: 'body elongates, springs back', alt: 'stand', every: 2.6 },
    { pose: 'stretchHind', label: 'Back-leg stretch', note: '', alt: 'stand', every: 2.6 },
    { pose: 'crouch', label: 'Hunting crouch', note: 'butt wiggle, tail flicks' },
    { pose: 'swipe', label: 'Paw swipe', note: 'crouch ↔ swipe', alt: 'crouch', every: 0.9 },
    { pose: 'angry', label: 'Angry', note: 'arched back, spikes, puffed tail' },
    { pose: 'happy', label: 'Happy / purring', note: 'eyes as arcs', emit: 'heart', every: 1.8 },
    { pose: 'yawn', label: 'Yawn', note: '', alt: 'sitFront', every: 2.2 },
    { pose: 'curious', label: 'Curious', note: 'head tilt', emit: 'question', every: 2.6 },
    { pose: 'startle', label: 'Startle', note: 'wide eyes, small hop', alt: 'lieCurl', every: 2.4 },
];

const TOUR: PoseName[] = GALLERY.map((item) => item.pose);
const GROUND_CLIP = 'cat-lab-ground';

declare global {
    interface Window {
        /** دسترسی به ریگ‌ها از کنسول: window.__catLab.playground()?.setPose('angry') */
        __catLab?: Record<string, () => CatRig | null | undefined>;
    }
}

function useLabHandle(key: string, cat: RefObject<CatFigureHandle | null>) {
    useEffect(() => {
        const registry = (window.__catLab ??= {});
        registry[key] = () => cat.current?.rig;
        return () => {
            delete registry[key];
        };
    }, [key, cat]);
}

function PoseCard({ item }: { item: GalleryItem }) {
    const cat = useRef<CatFigureHandle>(null);
    useLabHandle(`${item.pose}-${item.note}`, cat);

    useEffect(() => {
        const timers: ReturnType<typeof setInterval>[] = [];
        const every = (item.every ?? 2) * 1000;
        if (item.alt) {
            let flip = false;
            timers.push(setInterval(() => {
                flip = !flip;
                const rig = cat.current?.rig;
                if (!rig) return;
                rig.setPose(flip ? item.alt as PoseName : item.pose);
                if (item.pose === 'startle' && !flip) {
                    rig.kick('lift', 170);
                    rig.emit('exclaim');
                }
            }, every));
        }
        if (item.emit) {
            const kind = item.emit;
            timers.push(setInterval(() => cat.current?.rig?.emit(kind), every));
        }
        return () => timers.forEach(clearInterval);
    }, [item]);

    return (
        <figure className={styles.card}>
            <svg className={styles.cardStage} viewBox="-120 -112 240 126" aria-hidden>
                <rect className={styles.shelf} x="-118" y="0" width="236" height="40" rx="12" />
                <g clipPath={`url(#${GROUND_CLIP})`}>
                    <CatFigure ref={cat} pose={item.pose} x={item.x ?? 0} />
                </g>
            </svg>
            <figcaption>
                <strong>{item.label}</strong>
                {item.note ? <span>{item.note}</span> : null}
            </figcaption>
        </figure>
    );
}

function Playground() {
    const cat = useRef<CatFigureHandle>(null);
    useLabHandle('playground', cat);
    const svgRef = useRef<SVGSVGElement>(null);
    const [pose, setPose] = useState<PoseName>('stand');
    const [speed, setSpeed] = useState(1);
    const [follow, setFollow] = useState(true);
    const [tour, setTour] = useState(false);
    const [heading, setHeading] = useState(0);
    const [paused, setPaused] = useState(false);

    const go = (name: PoseName) => {
        setPose(name);
        cat.current?.rig?.setPose(name);
    };

    useEffect(() => {
        if (!tour) return undefined;
        let index = TOUR.indexOf(pose);
        const timer = setInterval(() => {
            index = (index + 1) % TOUR.length;
            setPose(TOUR[index]);
            cat.current?.rig?.setPose(TOUR[index]);
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
        <section className={styles.playground}>
            <svg
                ref={svgRef}
                className={styles.playStage}
                viewBox="-210 -122 420 140"
                onPointerMove={onMove}
                onPointerLeave={() => cat.current?.rig?.lookAt(null)}
            >
                <rect className={styles.shelf} x="-205" y="0" width="410" height="60" rx="18" />
                <g clipPath={`url(#${GROUND_CLIP})`}>
                    <CatFigure ref={cat} pose="stand" scale={1.05} timeScale={speed} paused={paused} />
                </g>
            </svg>

            <div className={styles.controls}>
                <div className={styles.poseRow}>
                    {TOUR.filter((name, i) => TOUR.indexOf(name) === i).map((name) => (
                        <button
                            key={name}
                            type="button"
                            className={name === pose ? styles.active : undefined}
                            onClick={() => go(name)}
                        >
                            {name}
                        </button>
                    ))}
                </div>
                <div className={styles.toolRow}>
                    <button type="button" onClick={() => cat.current?.rig?.turn('front')}>turn (via front)</button>
                    <button type="button" onClick={() => cat.current?.rig?.turn('back')}>turn (via back)</button>
                    <button
                        type="button"
                        onClick={() => {
                            const rig = cat.current?.rig;
                            rig?.kick('sy', -2.2);
                            rig?.kick('lift', 210);
                        }}
                    >
                        hop
                    </button>
                    <button type="button" onClick={() => cat.current?.rig?.twitchEar('both')}>ear twitch</button>
                    <button type="button" onClick={() => cat.current?.rig?.blink()}>blink</button>
                    {(['heart', 'z', 'question', 'exclaim'] as ParticleKind[]).map((kind) => (
                        <button key={kind} type="button" onClick={() => cat.current?.rig?.emit(kind)}>{kind}</button>
                    ))}
                </div>
                <div className={styles.toolRow}>
                    <label>
                        <input type="checkbox" checked={tour} onChange={(e) => setTour(e.target.checked)} />
                        auto tour
                    </label>
                    <label>
                        <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
                        pause
                    </label>
                    <button type="button" onClick={() => cat.current?.rig?.update(1 / 30)}>step</button>
                    <label>
                        <input
                            type="checkbox"
                            checked={follow}
                            onChange={(e) => {
                                setFollow(e.target.checked);
                                if (!e.target.checked) cat.current?.rig?.lookAt(null);
                            }}
                        />
                        eyes follow mouse
                    </label>
                    <label>
                        speed
                        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                            <option value={0.25}>0.25×</option>
                            <option value={0.5}>0.5×</option>
                            <option value={1}>1×</option>
                        </select>
                    </label>
                    <label className={styles.slider}>
                        heading {heading}°
                        <input
                            type="range"
                            min={-180}
                            max={180}
                            step={5}
                            value={heading}
                            onChange={(e) => {
                                const deg = Number(e.target.value);
                                setHeading(deg);
                                cat.current?.rig?.setHeading(deg);
                            }}
                        />
                    </label>
                </div>
            </div>
        </section>
    );
}

const LAB_CAT_CONFIG: Partial<ChatCatConfig> = { enabled: false };

/** همان کامپوننت واقعی ChatCat روی یک چت‌باکس نمونه؛ تایپ و کلیک «صدا» حساب می‌شوند */
function LiveStage() {
    const cat = useRef<ChatCatHandle>(null);
    return (
        <section className={styles.live} data-chat-column>
            <div className={styles.liveControls}>
                <strong>Live stage</strong>
                {SCENARIO_NAMES.map((name) => (
                    <button key={name} type="button" onClick={() => cat.current?.play(name)}>{name}</button>
                ))}
                <button type="button" onClick={() => cat.current?.stop()}>stop</button>
                <span>type in the box or click around to wake the sleeping cat · hover = pet · click the ball to pop it</span>
            </div>
            <div className={chatStyles.composer}>
                <div className={chatStyles.inputCardWrapper}>
                    <ChatCat ref={cat} config={LAB_CAT_CONFIG} />
                    <div className={chatStyles.mainInputArea}>
                        <textarea rows={2} placeholder="Type here…" className={styles.liveInput} />
                        <div className={styles.liveSend}>
                            <button type="button">send</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function CatLab() {
    return (
        <main className={styles.page} dir="ltr">
            <svg width="0" height="0" className={styles.defs} aria-hidden>
                <clipPath id={GROUND_CLIP}>
                    <rect x="-2000" y="-2000" width="4000" height="2000" />
                </clipPath>
            </svg>
            <header className={styles.header}>
                <h1>Cat lab</h1>
                <p>
                    Rig + poses for review. Every pose is the same procedural cat; transitions are springs.
                    The bar under each cat stands in for the chat input&apos;s top edge.
                </p>
            </header>
            <LiveStage />
            <Playground />
            <section className={styles.gallery}>
                {GALLERY.map((item) => (
                    <PoseCard key={`${item.pose}-${item.note}`} item={item} />
                ))}
            </section>
        </main>
    );
}
