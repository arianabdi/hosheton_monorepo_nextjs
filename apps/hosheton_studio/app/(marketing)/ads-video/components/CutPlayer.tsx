'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuPause, LuPlay, LuRotateCcw } from 'react-icons/lu';
import {
    aspectCss,
    buildCutDocument,
    cutAudioTracks,
    formatClock,
    readCutElements,
    stageSize,
    stageSizeLabel,
    syncAudioTracks,
    type AdsAudioTrack,
} from '../lib/cut-runtime';
import { useFitSize } from '../lib/use-fit-size';
import { setupElementInteractivity } from '../lib/cut-runtime';
import styles from '../AdsVideo.module.scss';

export interface CutPlayerProps {
    html: string;
    durationSeconds: number;
    aspectRatio?: string;
    title?: string;
    /** تغییر این مقدار iframe را از نو مونت می‌کند (restart) */
    reloadKey?: string | number;
    /** مقادیر سفارشی المان‌ها — داخل سند تزریق می‌شود */
    overrides?: Record<string, unknown> | null;
    /** صداگذاری/افکت‌های کات برای پخش هماهنگ */
    audio?: {
        voiceoverUrl?: string;
        sfx?: { url?: string; startAt?: number; volume?: number }[];
    };
    /** دسترسی به iframe فعال — پنل تنظیمات المان‌ها از این طریق window کات را می‌خواند */
    onFrameReady?: (frame: HTMLIFrameElement | null) => void;
    /** زمان فعلی پخش (حدوداً هر ۲۵۰ms) — برای سینک پنل صدا */
    onTimeUpdate?: (time: number) => void;
    /** ثبت تابع seek پلیر — پنل صدا با آن روی لحظه‌ها می‌پرد */
    registerSeek?: (seek: ((t: number) => void) | null) => void;
    /** کاربر روی یک المان داخل پیش‌نمایش کلیک کرد */
    onElementClick?: (elementId: string) => void;
    /** المانی در حالت توقف کشیده شد — x/y آفست نهایی در مختصات استیج */
    onElementMove?: (elementId: string, x: number, y: number) => void;
    /** متن المان با دابل‌کلیک در حالت توقف ویرایش شد */
    onElementTextEdit?: (elementId: string, value: string) => void;
}

interface DragState {
    id: string;
    el: HTMLElement;
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
}

/**
 * پخش‌کننده‌ی کات — سند HTML تولیدی داخل iframe ایزوله play می‌شود.
 * iframe با سایز واقعی استیج (مثلاً ۱۹۲۰×۱۰۸۰) رندر و با transform: scale در
 * قابِ fit جا می‌شود؛ بنابراین کل سند همیشه دقیقاً داخل پیش‌نمایش دیده می‌شود.
 * ساعت اصلی پخش با rAF جلو می‌رود و در هر فریم __adsSeek صدا زده می‌شود تا
 * حرکت دقیقاً با تایم‌لاین و صداها sync بماند. در حالت توقف، المان‌های ثبت‌شده
 * با کشیدن جابه‌جا و با دابل‌کلیک (المان‌های متنی) درجا ویرایش می‌شوند.
 */
function CutPlayerBase({ html, durationSeconds, aspectRatio = '16:9', title, reloadKey, overrides, audio, onFrameReady, onTimeUpdate, registerSeek, onElementClick, onElementMove, onElementTextEdit }: CutPlayerProps) {
    const { t } = useTranslation('adsVideo');
    // overrideها فقط هنگام (re)load سند تزریق می‌شوند؛ ویرایش زنده‌ی المان‌ها
    // مستقیم روی iframe اجرا می‌شود و نباید باعث reload/ریست پخش شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const documentHtml = useMemo(() => buildCutDocument(html, overrides), [html, reloadKey]);
    const size = useMemo(() => stageSize(aspectRatio), [aspectRatio]);
    const tracks = useMemo<AdsAudioTrack[]>(() => cutAudioTracks({
        voiceover: audio?.voiceoverUrl ? { audioUrl: audio.voiceoverUrl } : null,
        soundEffects: audio?.sfx || [],
    }), [audio]);
    const duration = Math.max(0.1, durationSeconds || 5);

    const areaRef = useRef<HTMLDivElement | null>(null);
    const fit = useFitSize(areaRef, size.width, size.height);

    if (!html) {
        return (
            <div className={styles.player}>
                <div ref={areaRef} className={styles.playerStageArea}>
                    <div className={styles.stageSizeBadge} title={t('stage_size_hint')}>
                        {stageSizeLabel(aspectRatio)} · {aspectRatio}
                    </div>
                    <div
                        className={styles.playerFrameBox}
                        style={fit.width ? { width: fit.width, height: fit.height } : { aspectRatio: aspectCss(aspectRatio), width: '100%' }}
                    >
                        <div className={styles.playerEmpty}>
                            <LuPlay size={26} />
                            <span>{t('player_no_preview')}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <CutPlayerCore
            key={`${reloadKey ?? ''}`}
            documentHtml={documentHtml}
            duration={duration}
            tracks={tracks}
            title={title}
            aspectRatio={aspectRatio}
            size={size}
            sizeLabel={`${stageSizeLabel(aspectRatio)} · ${aspectRatio}`}
            fit={fit}
            areaRef={areaRef}
            onFrameReady={onFrameReady}
            onTimeUpdate={onTimeUpdate}
            registerSeek={registerSeek}
            onElementClick={onElementClick}
            onElementMove={onElementMove}
            onElementTextEdit={onElementTextEdit}
        />
    );
}

/** هسته‌ی پخش — با تغییر سند از نو مونت می‌شود و پخش از ابتدا شروع می‌شود */
function CutPlayerCore({
    documentHtml,
    duration,
    tracks,
    title,
    aspectRatio,
    size,
    sizeLabel,
    fit,
    areaRef,
    onFrameReady,
    onTimeUpdate,
    registerSeek,
    onElementClick,
    onElementMove,
    onElementTextEdit,
}: {
    documentHtml: string;
    duration: number;
    tracks: AdsAudioTrack[];
    title?: string;
    aspectRatio: string;
    size: { width: number; height: number };
    sizeLabel: string;
    fit: { width: number; height: number };
    areaRef: React.RefObject<HTMLDivElement | null>;
    onFrameReady?: (frame: HTMLIFrameElement | null) => void;
    onTimeUpdate?: (time: number) => void;
    registerSeek?: (seek: ((t: number) => void) | null) => void;
    onElementClick?: (elementId: string) => void;
    onElementMove?: (elementId: string, x: number, y: number) => void;
    onElementTextEdit?: (elementId: string, value: string) => void;
}) {
    const { t } = useTranslation('adsVideo');
    const [nonce] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);

    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const timeRef = useRef(0);
    const playingRef = useRef(false);
    const lastTickRef = useRef(0);
    const rafRef = useRef(0);
    const audioRefs = useRef<Array<HTMLAudioElement | null>>([]);
    // آخرین callback بدون ریران شدن effect — فقط با mount/unmount iframe صدا زده می‌شود
    const onFrameReadyRef = useRef(onFrameReady);
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const registerSeekRef = useRef(registerSeek);
    const onElementClickRef = useRef(onElementClick);
    const onElementMoveRef = useRef(onElementMove);
    const onElementTextEditRef = useRef(onElementTextEdit);
    const seekFnRef = useRef<((t: number) => void) | null>(null);
    const lastEmitRef = useRef(0);
    // بعد از پایانِ کشیدن المان، click بعدی نباید المان را انتخاب کند
    const justDraggedAtRef = useRef(0);
    const dragRef = useRef<DragState | null>(null);
    useEffect(() => {
        onFrameReadyRef.current = onFrameReady;
        onTimeUpdateRef.current = onTimeUpdate;
        registerSeekRef.current = registerSeek;
        onElementClickRef.current = onElementClick;
        onElementMoveRef.current = onElementMove;
        onElementTextEditRef.current = onElementTextEdit;
    });

    useEffect(() => {
        onFrameReadyRef.current?.(frameRef.current);
        registerSeekRef.current?.((t: number) => seekFnRef.current?.(t));
        return () => {
            onFrameReadyRef.current?.(null);
            registerSeekRef.current?.(null);
        };
    }, []);

    /** اتصال کلیک/کشیدن/دابل‌کلیک روی المان‌های داخل سند — ویرایش در حالت توقف */
    const wireElementClicks = useCallback((frame: HTMLIFrameElement | null) => {
        try {
            const doc = frame?.contentDocument;
            const win = doc?.defaultView as (Window & { __adsClickWired?: boolean }) | null;
            if (!doc || !win || win.__adsClickWired) return;
            setupElementInteractivity(doc);
            win.__adsClickWired = true;
            doc.addEventListener('click', (event) => {
                if (Date.now() - justDraggedAtRef.current < 250) return; // بعد از drag نه
                const target = event.target as HTMLElement | null;
                const node = target?.closest?.('[data-ads-element-id]');
                const id = node?.getAttribute('data-ads-element-id');
                if (id) onElementClickRef.current?.(id);
            }, true);

            // ── کشیدن المان برای جابه‌جایی — فقط وقتی پخش متوقف است ──
            doc.addEventListener('pointerdown', (event) => {
                if (playingRef.current) return;
                if (event.button !== 0) return;
                const target = event.target as HTMLElement | null;
                const node = target?.closest?.('[data-ads-element-id]') as HTMLElement | null;
                const id = node?.getAttribute('data-ads-element-id');
                if (!node || !id || node.getAttribute('contenteditable') === 'true') return;
                event.preventDefault();
                dragRef.current = {
                    id,
                    el: node,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    // آفست override قبلی — کشیدن روی آن جمع می‌شود
                    baseX: Number.parseFloat(node.style.left) || 0,
                    baseY: Number.parseFloat(node.style.top) || 0,
                    moved: false,
                };
                const drag = dragRef.current;
                const onMove = (ev: PointerEvent) => {
                    const dx = ev.clientX - drag.startX;
                    const dy = ev.clientY - drag.startY;
                    if (!drag.moved) {
                        if (Math.abs(dx) + Math.abs(dy) < 3) return;
                        drag.moved = true;
                        try { node.setPointerCapture(drag.pointerId); } catch { /* ignore */ }
                    }
                    node.style.position = 'relative';
                    node.style.left = `${Math.round(drag.baseX + dx)}px`;
                    node.style.top = `${Math.round(drag.baseY + dy)}px`;
                };
                const onUp = (ev: PointerEvent) => {
                    node.removeEventListener('pointermove', onMove);
                    node.removeEventListener('pointerup', onUp);
                    node.removeEventListener('pointercancel', onUp);
                    dragRef.current = null;
                    if (!drag.moved) return;
                    justDraggedAtRef.current = Date.now();
                    const x = Math.round(drag.baseX + (ev.clientX - drag.startX));
                    const y = Math.round(drag.baseY + (ev.clientY - drag.startY));
                    onElementMoveRef.current?.(drag.id, x, y);
                };
                node.addEventListener('pointermove', onMove);
                node.addEventListener('pointerup', onUp);
                node.addEventListener('pointercancel', onUp);
            }, true);

            // ── دابل‌کلیک روی المان متنی = ویرایش درجا — فقط در حالت توقف ──
            doc.addEventListener('dblclick', (event) => {
                if (playingRef.current) return;
                const target = event.target as HTMLElement | null;
                const node = target?.closest?.('[data-ads-element-id]') as HTMLElement | null;
                const id = node?.getAttribute('data-ads-element-id');
                if (!node || !id) return;
                const type = node.getAttribute('data-ads-element-type');
                if (type && type !== 'text') return; // ویرایش درجا فقط برای متن
                if (node.getAttribute('contenteditable') === 'true') return;
                node.setAttribute('data-ads-inline-edit', '1');
                node.setAttribute('contenteditable', 'true');
                node.focus();
                const commit = () => {
                    node.removeEventListener('keydown', onKey);
                    node.removeAttribute('data-ads-inline-edit');
                    node.setAttribute('contenteditable', 'false');
                    node.blur();
                    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
                    if (!text) return;
                    // apply خودِ المان مقدار را در سند نرمال می‌کند
                    readCutElements(frameRef.current)
                        .find((handle) => handle.id === id)
                        ?.apply(text);
                    onElementTextEditRef.current?.(id, text);
                };
                const onKey = (ke: KeyboardEvent) => {
                    if (ke.key === 'Enter' && !ke.shiftKey) {
                        ke.preventDefault();
                        commit();
                    } else if (ke.key === 'Escape') {
                        ke.preventDefault();
                        node.blur(); // blur → commit
                    }
                };
                node.addEventListener('keydown', onKey);
                node.addEventListener('blur', commit, { once: true });
            }, true);
        } catch {
            /* سند هنوز آماده نیست */
        }
    }, []);

    useEffect(() => {
        playingRef.current = playing;
    }, [playing]);

    /** اعمال زمان روی سند و صداها — بدون رفرش UI؛ در هر فریم پخش صدا زده می‌شود */
    const applyTime = useCallback((t: number) => {
        const clamped = Math.min(Math.max(0, t), duration);
        timeRef.current = clamped;
        try {
            const win = frameRef.current?.contentWindow as (Window & { __adsSeek?: (time: number) => void }) | null;
            win?.__adsSeek?.(clamped);
        } catch {
            /* iframe هنوز لود نشده */
        }
        syncAudioTracks(audioRefs.current.filter(Boolean) as HTMLAudioElement[], tracks, clamped, playingRef.current);
    }, [duration, tracks]);

    /** پرش کاربر (اسلایدر/پنل صدا) — سند + UI هر دو بی‌درنگ */
    const seek = useCallback((t: number) => {
        applyTime(t);
        setCurrentTime(Math.min(Math.max(0, t), duration));
    }, [applyTime, duration]);

    useEffect(() => {
        seekFnRef.current = seek;
    }, [seek]);

    // ساعت اصلی پخش — سند در «هر» فریم seek می‌شود اما ری‌رندر React و رویداد
    // زمان حداکثر هر ۱۰۰ms رفرش می‌شوند؛ رفرشِ ۶۰fps خودِ پنجره‌ی پدر را می‌لرزاند
    useEffect(() => {
        const tick = (now: number) => {
            const delta = lastTickRef.current ? (now - lastTickRef.current) / 1000 : 0;
            lastTickRef.current = now;
            if (playingRef.current) {
                const next = timeRef.current + delta;
                if (next >= duration) {
                    applyTime(duration);
                    setCurrentTime(duration);
                    setPlaying(false);
                    // سند هم فریز شود — وگرنه انیمیشن‌های CSS لوپ‌شونده به پخش ادامه می‌دهند
                    try {
                        (frameRef.current?.contentWindow as (Window & { __adsPause?: () => void }) | null)?.__adsPause?.();
                    } catch { /* ignore */ }
                    (audioRefs.current.filter(Boolean) as HTMLAudioElement[]).forEach((audio) => audio.pause());
                    lastEmitRef.current = now;
                    onTimeUpdateRef.current?.(duration);
                } else {
                    applyTime(next);
                    if (now - lastEmitRef.current > 100) {
                        lastEmitRef.current = now;
                        setCurrentTime(next);
                        onTimeUpdateRef.current?.(next);
                    }
                }
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [duration, applyTime]);

    const togglePlay = useCallback(() => {
        if (playing) {
            try {
                (frameRef.current?.contentWindow as (Window & { __adsPause?: () => void }) | null)?.__adsPause?.();
            } catch { /* ignore */ }
            (audioRefs.current.filter(Boolean) as HTMLAudioElement[]).forEach((audio) => audio.pause());
            setPlaying(false);
            return;
        }
        if (timeRef.current >= duration - 0.05) {
            // پایان کات — پخش دوباره از ابتدا
            seek(0);
            try {
                (frameRef.current?.contentWindow as (Window & { __adsResume?: () => void }) | null)?.__adsResume?.();
            } catch { /* ignore */ }
            setPlaying(true);
            return;
        }
        try {
            (frameRef.current?.contentWindow as (Window & { __adsResume?: () => void }) | null)?.__adsResume?.();
        } catch { /* ignore */ }
        setPlaying(true);
    }, [duration, playing, seek]);

    const restart = useCallback(() => {
        try {
            (frameRef.current?.contentWindow as (Window & { __adsResume?: () => void }) | null)?.__adsResume?.();
        } catch { /* ignore */ }
        setPlaying(true);
        seek(0);
    }, [seek]);

    // قاب fit — اما iframe با سایز واقعی استیج رندر و با scale داخلش جا می‌شود؛
    // بنابراین viewport سند دقیقاً اندازه‌ی طراحی (مثلاً ۱۹۲۰×۱۰۸۰) است و چیزی
    // از صفحه بیرون نمی‌زند. مختصات فیزیکی top/left تا در RTL هم درست بنشیند.
    // will-change:iframe روی لایه‌ی کامپوزیتور خودش می‌ماند و ری‌پینت انیمیشن‌ها
    // قابِ scale شده را نمی‌لرزاند.
    const frameStyle = fit.width
        ? {
            width: size.width,
            height: size.height,
            transform: `scale(${fit.width / size.width})`,
            transformOrigin: 'top left',
            willChange: 'transform',
        }
        : { aspectRatio: aspectCss(aspectRatio), width: '100%' };

    return (
        <div className={styles.player}>
            <div ref={areaRef} className={styles.playerStageArea}>
                <div className={styles.stageSizeBadge} title={t('stage_size_hint')}>
                    {sizeLabel}
                </div>
                <div className={styles.playerFrameBox} style={fit.width ? { width: fit.width, height: fit.height } : { aspectRatio: aspectCss(aspectRatio), width: '100%' }}>
                    <iframe
                        ref={frameRef}
                        id={`ads-cut-frame-${nonce}`}
                        title={title || 'ads-cut-preview'}
                        className={styles.playerFrame}
                        style={frameStyle}
                        srcDoc={documentHtml}
                        sandbox="allow-scripts allow-same-origin"
                        loading="eager"
                        onLoad={(e) => {
                            wireElementClicks(e.currentTarget);
                        }}
                    />
                    <span className={styles.frameRatioChip}>{aspectRatio}</span>
                </div>
            </div>
            <div className={styles.playerBar}>
                <button
                    type="button"
                    className={styles.playerBtn}
                    onClick={togglePlay}
                    title={playing ? t('player_pause') : t('player_play')}
                    aria-label={playing ? t('player_pause') : t('player_play')}
                >
                    {playing ? <LuPause size={13} /> : <LuPlay size={13} />}
                </button>
                <button
                    type="button"
                    className={styles.playerBtn}
                    onClick={restart}
                    title={t('player_restart')}
                    aria-label={t('player_restart')}
                >
                    <LuRotateCcw size={13} />
                </button>
                <input
                    className={styles.playerSeek}
                    type="range"
                    min={0}
                    max={duration}
                    step={0.05}
                    value={currentTime}
                    aria-label={t('player_timeline')}
                    onChange={(e) => seek(Number(e.target.value))}
                />
                <span className={styles.playerTime}>{formatClock(currentTime)} / {formatClock(duration)}</span>
                {!playing && (
                    <span className={styles.playerEditHint} title={t('player_edit_hint_title', { defaultValue: 'ویرایش درجا در حالت توقف' })}>
                        {t('player_edit_hint', { defaultValue: 'حالت توقف: کشیدن = جابه‌جایی · دابل‌کلیک = ویرایش متن' })}
                    </span>
                )}
            </div>
            {/* ترک‌های صوتی کات — با تایم‌لاین sync می‌شوند */}
            {tracks.map((track, index) => (
                <audio
                    key={`${track.url}-${index}`}
                    ref={(el) => { audioRefs.current[index] = el; }}
                    src={track.url}
                    preload="auto"
                    hidden
                />
            ))}
        </div>
    );
}

export const CutPlayer = memo(CutPlayerBase);
export default CutPlayer;
