'use client';

import {
    useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
    type Ref, type RefObject,
} from 'react';
import { useAnimationFrame } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LuVolume2, LuVolumeX } from 'react-icons/lu';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { clamp } from './rig/math';
import { CatDirector } from './stage/CatDirector';
import { CatSounds } from './stage/CatSounds';
import { DEFAULT_CHAT_CAT_CONFIG, SCENARIO_NAMES, type ChatCatConfig, type ScenarioName } from './config';
import { observeResize } from '@my-workspace/utils';
import { catDebug } from './debug';
import styles from './ChatCat.module.scss';

/*
 * گربهٔ روی لبهٔ بالای چت‌باکس. هر چند وقت یک بار (config.interval) یکی از سناریوها را اجرا می‌کند
 * و می‌رود؛ هیچ‌وقت یک سناریو دو بار پشت‌سرهم نمی‌آید. باید داخل یک والد position: relative باشد.
 * تست دستی: ?cat=sleep|watch|ball|walk در آدرس، یا window.__chatCat.play('ball') در توسعه.
 */

export type ChatCatHandle = {
    play: (name: ScenarioName) => void;
    stop: () => void;
};

declare global {
    interface Window {
        __chatCat?: ChatCatHandle;
        /** فقط توسعه: کارگردان صحنهٔ فعلی برای جلو بردن دستی فریم‌ها */
        __chatCatStage?: CatDirector;
    }
}

type Props = {
    ref?: Ref<ChatCatHandle>;
    /** وقتی ورودی قفل است یا پیام در حال ویرایش است گربه نمی‌آید (و اگر هست محو می‌شود) */
    hidden?: boolean;
    /** باید ثابت باشد (بیرون از رندر تعریف شود) */
    config?: Partial<ChatCatConfig>;
    /** شبیه‌سازی prefers-reduced-motion (صفحهٔ «انیمیشن‌ها») */
    calm?: boolean;
    /** زمان‌بند بدون توجه به کلید ادمین (فقط صفحهٔ «انیمیشن‌ها») */
    ignoreAdmin?: boolean;
};

const MUTE_KEY = 'hosheton-chat-cat-muted';
const OLD_BAG_KEY = 'hosheton-chat-cat-bag';

function readMuted() {
    if (typeof window === 'undefined') return false;
    try {
        return window.localStorage.getItem(MUTE_KEY) === '1';
    } catch {
        return false;
    }
}

let remoteEnabled: Promise<boolean> | null = null;

/** روشن/خاموش بودن گربه از پنل ادمین (هوش مصنوعی ← تنظیمات ← چت)؛ یک بار در هر بارگذاری صفحه. خطا = روشن */
function fetchCatEnabled() {
    if (!remoteEnabled) {
        const base = process.env.NEXT_PUBLIC_API_URL;
        remoteEnabled = !base
            ? Promise.resolve(true)
            // CDN جلوی API پاسخ را کش می‌کند؛ پارامتر t و no-store همیشه مقدار تازه را می‌گیرند
            : fetch(`${base}/api/system-setting/public/studio.chat?t=${Date.now()}`, { cache: 'no-store' })
                .then((res) => (res.ok ? res.json() : null))
                .then((body) => body?.data?.value?.catEnabled !== false)
                .catch(() => true);
    }
    return remoteEnabled;
}

function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ChatCat({ ref, hidden = false, config, calm = false, ignoreAdmin = false }: Props) {
    const cfg = useMemo(() => ({ ...DEFAULT_CHAT_CAT_CONFIG, ...config }), [config]);
    const [run, setRun] = useState<{ id: number; name: ScenarioName } | null>(null);
    const [muted, setMuted] = useState(readMuted);
    const [systemReduced, setReduced] = useState(prefersReducedMotion);
    const reduced = systemReduced || calm;
    const [soundReady, setSoundReady] = useState(false);
    const [adminAllowed, setAllowed] = useState(false);
    const allowed = adminAllowed || ignoreAdmin;
    const soundsRef = useRef<CatSounds | null>(null);
    const lastRef = useRef<ScenarioName | null>(null);
    const firstRef = useRef(true);

    const play = useCallback((name: ScenarioName) => setRun({ id: Date.now(), name }), []);
    const stop = useCallback(() => setRun(null), []);
    useImperativeHandle(ref, () => ({ play, stop }), [play, stop]);

    // صدا: فقط بعد از اولین تعامل کاربر
    useEffect(() => {
        const sounds = new CatSounds();
        soundsRef.current = sounds;
        const off = sounds.onAvailable(setSoundReady);
        const unlock = () => sounds.unlock();
        window.addEventListener('pointerdown', unlock, { capture: true });
        window.addEventListener('keydown', unlock, { capture: true });
        try {
            window.localStorage.removeItem(OLD_BAG_KEY);
        } catch {
            // نادیده
        }
        return () => {
            off();
            window.removeEventListener('pointerdown', unlock, { capture: true });
            window.removeEventListener('keydown', unlock, { capture: true });
            sounds.dispose();
            soundsRef.current = null;
        };
    }, []);

    useEffect(() => {
        soundsRef.current?.configure({ enabled: cfg.sound, volume: cfg.volume, muted });
    }, [cfg.sound, cfg.volume, muted]);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduced(query.matches);
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        let cancelled = false;
        void fetchCatEnabled().then((value) => {
            if (!cancelled) setAllowed(value);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // ابزار تست: ?cat=sleep|watch|ball|walk و window.__chatCat در توسعه
    useEffect(() => {
        const name = new URLSearchParams(window.location.search).get('cat');
        let timer: number | undefined;
        if (allowed && name && (SCENARIO_NAMES as string[]).includes(name)) {
            timer = window.setTimeout(() => play(name as ScenarioName), 900);
        }
        if (process.env.NODE_ENV !== 'production') window.__chatCat = { play, stop };
        return () => {
            window.clearTimeout(timer);
            if (window.__chatCat?.play === play) delete window.__chatCat;
        };
    }, [allowed, play, stop]);

    // زمان‌بند: بعد از هر سناریو، فاصلهٔ تصادفی؛ با پنهان شدن تب شمارش متوقف می‌شود
    useEffect(() => {
        if (!cfg.enabled || !allowed || hidden || run) return undefined;
        const range = firstRef.current ? cfg.firstDelay : cfg.interval;
        let remaining = (range[0] + Math.random() * Math.max(0, range[1] - range[0])) * 1000;
        let timer: number | undefined;
        let startedAt = 0;
        const poolNow = () => (reduced ? cfg.scenarios.filter((n) => n === 'watch' || n === 'sleep') : cfg.scenarios);
        if (catDebug.tracing) {
            catDebug.trace({ type: 'schedule', delay: remaining, pool: poolNow().filter((n) => n !== lastRef.current), first: firstRef.current });
        }
        const fire = () => {
            timer = undefined;
            firstRef.current = false;
            const pool = poolNow();
            const options = pool.filter((n) => n !== lastRef.current);
            const list = options.length ? options : pool;
            if (list.length) setRun({ id: Date.now(), name: list[Math.floor(Math.random() * list.length)] });
        };
        const startTimer = () => {
            startedAt = performance.now();
            timer = window.setTimeout(fire, remaining);
        };
        const onVisibility = () => {
            if (document.hidden) {
                if (timer !== undefined) {
                    window.clearTimeout(timer);
                    timer = undefined;
                    remaining = Math.max(0, remaining - (performance.now() - startedAt));
                }
            } else if (timer === undefined) {
                startTimer();
            }
        };
        if (!document.hidden) startTimer();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [cfg, allowed, hidden, run, reduced]);

    const onDone = useCallback(() => {
        setRun((current) => {
            if (current) lastRef.current = current.name;
            return null;
        });
    }, []);

    const toggleMute = useCallback(() => {
        setMuted((value) => {
            const next = !value;
            try {
                window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
            } catch {
                // نادیده
            }
            return next;
        });
    }, []);

    if (!run) return null;
    return (
        <CatStage
            key={run.id}
            name={run.name}
            soundsRef={soundsRef}
            calm={reduced}
            size={cfg.size}
            hidden={hidden}
            showMute={cfg.sound && soundReady}
            muted={muted}
            onToggleMute={toggleMute}
            onDone={onDone}
        />
    );
}

type StageProps = {
    name: ScenarioName;
    soundsRef: RefObject<CatSounds | null>;
    calm: boolean;
    size: number;
    hidden: boolean;
    showMute: boolean;
    muted: boolean;
    onToggleMute: () => void;
    onDone: () => void;
};

/** یک اجرای سناریو: صحنهٔ SVG روی لبهٔ کارت، کارگردان، شنونده‌ها و حلقهٔ فریم */
function CatStage({ name, soundsRef, calm, size, hidden, showMute, muted, onToggleMute, onDone }: StageProps) {
    const { t, i18n } = useTranslation('projects');
    const boxRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const directorRef = useRef<CatDirector | null>(null);
    const [stageHeight, setStageHeight] = useState(0);
    const id = `chatcat-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const live = useRef({ onDone, meow: '', rtl: false });

    useLayoutEffect(() => {
        live.current = { onDone, meow: t('chat_cat_meow'), rtl: isRtlLanguage(i18n.language) };
    });

    useLayoutEffect(() => {
        const box = boxRef.current;
        const svg = svgRef.current;
        const card = box?.parentElement;
        if (!box || !svg || !card) return undefined;
        const measure = () => {
            const width = Math.max(140, card.clientWidth);
            const scale = clamp(width / 900, 0.52, 0.78) * size;
            const height = Math.round(190 * scale);
            box.style.height = `${height}px`;
            svg.setAttribute('width', `${width}`);
            svg.setAttribute('height', `${height}`);
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            return { width, height, scale };
        };
        const director = new CatDirector({
            svg,
            id,
            env: measure(),
            calm,
            sounds: soundsRef.current,
            meow: live.current.meow,
            rtl: live.current.rtl,
        });
        director.onDone = () => live.current.onDone();
        directorRef.current = director;
        catDebug.director = director;
        if (process.env.NODE_ENV !== 'production') window.__chatCatStage = director;
        director.start(name);
        // فریم بعد: setEnv اندازهٔ صحنهٔ SVG داخل همین کارتِ observe شده را عوض می‌کند (حلقهٔ ResizeObserver)
        const stopObserving = observeResize(card, () => {
            const env = measure();
            director.setEnv(env);
            setStageHeight(env.height);
        });
        return () => {
            stopObserving();
            director.dispose();
            directorRef.current = null;
            if (catDebug.director === director) catDebug.director = null;
            if (window.__chatCatStage === director) delete window.__chatCatStage;
        };
    }, [id, name, calm, size, soundsRef]);

    // ماوس، تایپ و کلیک در چت (صدا برای گربهٔ خواب)
    useEffect(() => {
        const box = boxRef.current;
        const svg = svgRef.current;
        const card = box?.parentElement;
        if (!box || !svg || !card) return undefined;
        const column: Element = card.closest('[data-chat-column]') ?? document.body;
        const onMove = (event: PointerEvent) => {
            const rect = svg.getBoundingClientRect();
            directorRef.current?.pointerMove(event.clientX - rect.left, event.clientY - rect.top, event.pointerType === 'touch');
        };
        const onOut = (event: PointerEvent) => {
            if (!event.relatedTarget) directorRef.current?.pointerOut();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter' || event.key === 'Delete') {
                directorRef.current?.noise('key');
            }
        };
        const onDown = (event: Event) => {
            if (!(event.target instanceof Node && box.contains(event.target))) directorRef.current?.noise('click');
        };
        const onVisibility = () => {
            if (document.hidden) soundsRef.current?.stopAll();
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('pointerout', onOut);
        card.addEventListener('keydown', onKey, true);
        column.addEventListener('pointerdown', onDown, true);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerout', onOut);
            card.removeEventListener('keydown', onKey, true);
            column.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [soundsRef]);

    useEffect(() => {
        if (hidden) directorRef.current?.vanish();
    }, [hidden]);

    const tick = useCallback((_time: number, delta: number) => {
        const director = directorRef.current;
        if (!director || catDebug.paused) return;
        // ضریب زمان صفحهٔ بررسی (پیش‌فرض 1)؛ بیشتر از 1 در چند گام جلو می‌رود تا dt بریده نشود
        let left = (Math.min(delta, 50) / 1000) * catDebug.timeScale;
        do {
            const dt = Math.min(left, 0.05);
            director.frame(dt);
            left -= dt;
        } while (left > 1e-6);
    }, []);
    useAnimationFrame(tick);

    const muteLabel = muted ? t('chat_cat_unmute') : t('chat_cat_mute');
    return (
        <>
            <div ref={boxRef} className={styles.stage} aria-hidden>
                <svg ref={svgRef} className={styles.svg} />
            </div>
            {showMute ? (
                <button
                    type="button"
                    className={styles.mute}
                    style={{ bottom: `calc(100% + ${Math.max(0, stageHeight - 30)}px)` }}
                    tabIndex={-1}
                    aria-label={muteLabel}
                    title={muteLabel}
                    onPointerDown={(event) => event.preventDefault()}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={onToggleMute}
                >
                    {muted ? <LuVolumeX /> : <LuVolume2 />}
                </button>
            ) : null}
        </>
    );
}
