'use client';

import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { LuPause, LuPlay } from 'react-icons/lu';
import {
    buildCutDocument,
    cutAudioTracks,
    stageSize,
    syncAudioTracks,
    type AdsAudioTrack,
} from '@/app/(marketing)/ads-video/lib/cut-runtime';
import { useFitSize } from '@/app/(marketing)/ads-video/lib/use-fit-size';
import styles from './AdsPreviewPlayer.module.scss';

// ────────────────────────────── Types ──────────────────────────────

export interface AdsPlayerCut {
    _id: string;
    title: string;
    html: string;
    durationSeconds: number;
    currentVersion: number;
    /** اسکرین‌شات ffmpeg از نقطه‌ی شروع کات — با هر نسخه از سمت بک‌اند تازه می‌شود */
    thumbnailUrl?: string | null;
    voiceover?: { audioUrl?: string } | null;
    soundEffects?: { audioUrl?: string; startAt?: number; volume?: number }[] | null;
}

/** هر فریم پخش/پرش — کات فعال و پیشرفت محلی همان کات (۰…۱) */
export interface AdsPlayerFrame {
    time: number;
    cutId: string;
    ratio: number;
}

/** حالت پخش — all = کل ویدیو پشت‌سرهم، cut = فقط یک کات (دکمه‌ی پخش ردیف کات) */
export interface AdsPlaybackState {
    playing: boolean;
    mode: 'all' | 'cut';
    cutId: string;
}

export interface AdsPlayerHandle {
    /** پخش/توقف کل ویدیو از نقطه‌ی فعلی */
    toggle(): void;
    /** پخش فقط همین کات تا پایانش — روی کاتِ در حال پخش، توقف */
    toggleCut(cutId: string): void;
    pause(): void;
}

interface AdsPreviewPlayerProps {
    cuts: AdsPlayerCut[];
    aspectRatio?: string;
    /** کات فعال (سگمنت جاری) با شناسه — توسط صفحه کنترل می‌شود تا با چت و لیست کات‌ها هم‌حالت باشد */
    activeCutId: string;
    onActiveChange(cutId: string): void;
    /** هر فریم — صفحه با آن پس‌زمینه‌ی پیشرفت ردیف کات فعال را مستقیم روی DOM می‌کشد */
    onFrame?(frame: AdsPlayerFrame): void;
    onPlaybackChange?(state: AdsPlaybackState): void;
    ref?: Ref<AdsPlayerHandle>;
}

const MIN_SEGMENT_DURATION = 0.1;
// پخش تک‌کات کمی قبل از مرز می‌ایستد تا کات فعال به کات بعدی نپرد
const CUT_END_EPSILON = 0.02;

function formatClock(seconds: number) {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ────────────────────────────── Component ──────────────────────────────

/**
 * پلیر کل ویدیو برای ads-2video — ساعت سراسری با rAF، seek با قرارداد __adsSeek
 * و سینک صدا با افست سراسری. HTML فقط کاتِ فعال در حین پخش لود می‌شود (یک iframe
 * تنبل)؛ در توقف، اسکرین‌شات ffmpeg نقطه‌ی شروع کات دیده می‌شود. تایم‌لاین
 * تکه‌تکه است (هر کات یک سگمنت به نسبت مدتش) و پیشرفت هر فریم بدون ری‌رندر
 * روی DOM نوشته می‌شود؛ با toggleCut فقط یک کات پخش می‌شود.
 */
function AdsPreviewPlayerBase({
    cuts,
    aspectRatio = '16:9',
    activeCutId,
    onActiveChange,
    onFrame,
    onPlaybackChange,
    ref,
}: AdsPreviewPlayerProps) {
    const { t } = useTranslation('adsVideo');
    const renderable = useMemo(() => cuts.filter((cut) => cut.html), [cuts]);

    const [playing, setPlaying] = useState(false);
    const [mode, setMode] = useState<'all' | 'cut'>('all');
    const [uiTime, setUiTime] = useState(0);
    const [failedThumbs, setFailedThumbs] = useState<Record<string, true>>({});
    // سگمنت فعال — state رندر + قرینه‌ی ref برای حلقه‌ی rAF (خواندن ref در render مجاز نیست)
    const [activeIndex, setActiveIndex] = useState(0);

    const timeRef = useRef(0);
    const playingRef = useRef(false);
    const modeRef = useRef<'all' | 'cut'>('all');
    const cutEndRef = useRef(0);
    const lastTickRef = useRef(0);
    const rafRef = useRef(0);
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const audioRefs = useRef<Array<HTMLAudioElement | null>>([]);
    const pendingLocalRef = useRef(0);
    const activeIndexRef = useRef(0);
    const onActiveChangeRef = useRef(onActiveChange);
    const onFrameRef = useRef(onFrame);
    const onPlaybackChangeRef = useRef(onPlaybackChange);
    const jumpRef = useRef<(index: number) => void>(null);
    useEffect(() => {
        onActiveChangeRef.current = onActiveChange;
        onFrameRef.current = onFrame;
        onPlaybackChangeRef.current = onPlaybackChange;
    });
    useEffect(() => {
        activeIndexRef.current = activeIndex;
    }, [activeIndex]);

    // مدت و افست شروع هر کات روی تایم‌لاین سراسری
    const durations = useMemo(
        () => renderable.map((cut) => Math.max(MIN_SEGMENT_DURATION, cut.durationSeconds || 5)),
        [renderable],
    );
    const offsets = useMemo(() => {
        const result: number[] = [];
        let acc = 0;
        for (const duration of durations) {
            result.push(acc);
            acc += duration;
        }
        return result;
    }, [durations]);
    const totalDuration = useMemo(() => durations.reduce((sum, duration) => sum + duration, 0), [durations]);

    const tracks = useMemo<AdsAudioTrack[]>(() => renderable.flatMap((cut, index) => (
        cutAudioTracks({
            voiceover: cut.voiceover?.audioUrl ? { audioUrl: cut.voiceover.audioUrl } : null,
            soundEffects: cut.soundEffects || [],
        }).map((track) => ({ ...track, startAt: track.startAt + (offsets[index] || 0) }))
    )), [renderable, offsets]);

    const indexAt = useCallback((time: number) => {
        let index = 0;
        for (let i = 0; i < offsets.length; i++) {
            if (time >= offsets[i]) index = i;
        }
        return index;
    }, [offsets]);

    // state رندر و قرینه‌ی ref با هم — حلقه‌ی rAF همان فریم مقدار تازه را ببیند
    const setPlay = useCallback((next: boolean) => {
        playingRef.current = next;
        setPlaying(next);
    }, []);
    const setPlayMode = useCallback((next: 'all' | 'cut') => {
        modeRef.current = next;
        setMode(next);
    }, []);
    const pauseAudio = useCallback(() => {
        audioRefs.current.forEach((audio) => audio?.pause());
    }, []);

    /** پیشرفت هر سگمنت + خبر فریم به صفحه — مستقیم روی DOM، بدون ری‌رندر */
    const paintProgress = useCallback((time: number) => {
        for (let i = 0; i < durations.length; i++) {
            const ratio = Math.min(1, Math.max(0, (time - offsets[i]) / durations[i]));
            segmentRefs.current[i]?.style.setProperty('--seg-progress', String(ratio));
        }
        const index = activeIndexRef.current;
        const cut = renderable[index];
        if (!cut) return;
        const ratio = Math.min(1, Math.max(0, (time - (offsets[index] || 0)) / (durations[index] || 1)));
        onFrameRef.current?.({ time, cutId: cut._id, ratio });
    }, [durations, offsets, renderable]);

    /** قفل‌کردن ساعت سراسری: تعویض سگمنت + seek سند فعال + سینک صدا */
    const applyGlobal = useCallback((time: number) => {
        timeRef.current = time;
        const index = indexAt(time);
        if (index !== activeIndexRef.current) {
            activeIndexRef.current = index;
            setActiveIndex(index);
            const cutId = renderable[index]?._id;
            if (cutId) onActiveChangeRef.current?.(cutId);
        }
        pendingLocalRef.current = Math.max(0, time - (offsets[activeIndexRef.current] || 0));
        // سند فعال (پخش یا فریز) روی زمان محلی تازه قفل می‌شود — __adsSeek خودش رندر می‌کند
        try {
            const win = frameRef.current?.contentWindow as (Window & { __adsSeek?: (t: number) => void }) | null;
            win?.__adsSeek?.(pendingLocalRef.current);
        } catch {
            /* iframe آماده نیست */
        }
        syncAudioTracks(audioRefs.current.filter(Boolean) as HTMLAudioElement[], tracks, time, playingRef.current);
        paintProgress(time);
    }, [indexAt, offsets, paintProgress, renderable, tracks]);

    /** پرش — ساعت، سگمنت و پوستر همگی بی‌درنگ */
    const seekGlobal = useCallback((time: number) => {
        const next = Math.min(totalDuration, Math.max(0, time));
        applyGlobal(next);
        setUiTime(next);
    }, [applyGlobal, totalDuration]);

    /** پرش به ابتدای یک کات در حالت «کل ویدیو» — برای تغییر کات فعال از بیرون */
    const jumpToCut = useCallback((index: number) => {
        setPlayMode('all');
        seekGlobal((offsets[index] || 0) + 0.001);
    }, [offsets, seekGlobal, setPlayMode]);

    useEffect(() => {
        jumpRef.current = jumpToCut;
    });

    // سگمنت‌ها تازه رندر شدند (یا کات‌ها عوض شدند) — پیشرفت روی زمان فعلی کشیده شود
    useEffect(() => {
        paintProgress(timeRef.current);
    }, [paintProgress]);

    // کات فعال از بیرون (لیست کات‌ها/چت) عوض شود — پخش از ابتدای همان سگمنت در حالت «کل ویدیو» ادامه پیدا می‌کند
    useEffect(() => {
        const index = activeCutId ? renderable.findIndex((cut) => cut._id === activeCutId) : -1;
        const next = index >= 0 ? index : 0;
        if (next === activeIndex) return;
        jumpRef.current?.(next);
    }, [activeCutId, activeIndex, renderable]);

    useEffect(() => {
        let lastUi = 0;
        const tick = (now: number) => {
            const delta = lastTickRef.current ? (now - lastTickRef.current) / 1000 : 0;
            lastTickRef.current = now;
            if (playingRef.current) {
                const limit = modeRef.current === 'cut' ? Math.min(cutEndRef.current, totalDuration) : totalDuration;
                const next = timeRef.current + delta;
                if (next >= limit) {
                    applyGlobal(limit);
                    setUiTime(limit);
                    pauseAudio();
                    setPlay(false);
                } else {
                    applyGlobal(next);
                    // ساعت متنی حداکثر هر ۱۰۰ms — پیشرفت سگمنت‌ها هر فریم روی DOM است
                    if (now - lastUi > 100) {
                        lastUi = now;
                        setUiTime(next);
                    }
                }
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [totalDuration, applyGlobal, pauseAudio, setPlay]);

    const togglePlay = useCallback(() => {
        if (!renderable.length) return;
        if (playingRef.current) {
            pauseAudio();
            setPlay(false);
            return;
        }
        setPlayMode('all');
        // پایان ویدیو → از ابتدا
        if (timeRef.current >= totalDuration - 0.05) seekGlobal(0);
        pendingLocalRef.current = Math.max(0, timeRef.current - (offsets[activeIndexRef.current] || 0));
        setPlay(true);
    }, [offsets, pauseAudio, renderable.length, seekGlobal, setPlay, setPlayMode, totalDuration]);

    const toggleCut = useCallback((cutId: string) => {
        const index = renderable.findIndex((cut) => cut._id === cutId);
        if (index < 0) return;
        const inCut = activeIndexRef.current === index;
        if (playingRef.current && inCut) {
            pauseAudio();
            setPlay(false);
            return;
        }
        const start = offsets[index] || 0;
        const end = start + (durations[index] || 0) - CUT_END_EPSILON;
        cutEndRef.current = end;
        setPlayMode('cut');
        // وسط همین کات متوقف شده بود → از همان‌جا؛ وگرنه از ابتدای کات
        const resume = inCut && timeRef.current >= start && timeRef.current < end - 0.05;
        if (!resume) seekGlobal(start + 0.001);
        pendingLocalRef.current = Math.max(0, timeRef.current - start);
        setPlay(true);
    }, [durations, offsets, pauseAudio, renderable, seekGlobal, setPlay, setPlayMode]);

    const pause = useCallback(() => {
        if (!playingRef.current) return;
        pauseAudio();
        setPlay(false);
    }, [pauseAudio, setPlay]);

    useImperativeHandle(ref, () => ({ toggle: togglePlay, toggleCut, pause }), [pause, toggleCut, togglePlay]);

    const activeIndexSafe = Math.min(activeIndex, Math.max(0, renderable.length - 1));
    const activeCut = renderable[activeIndexSafe] || renderable[0] || null;
    const activeCutKey = activeCut?._id || '';

    useEffect(() => {
        onPlaybackChangeRef.current?.({ playing, mode, cutId: activeCutKey });
    }, [playing, mode, activeCutKey]);

    // ── scrub تایم‌لاین تکه‌تکه — نزدیک‌ترین سگمنت به نشانگر، با در نظر گرفتن RTL ──
    const seekFromPointer = useCallback((clientX: number) => {
        let best = -1;
        let bestDistance = Infinity;
        let fraction = 0;
        segmentRefs.current.forEach((segment, index) => {
            if (!segment) return;
            const rect = segment.getBoundingClientRect();
            const distance = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
            if (distance >= bestDistance) return;
            bestDistance = distance;
            best = index;
            const rtl = getComputedStyle(segment).direction === 'rtl';
            const raw = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
            fraction = Math.min(1, Math.max(0, raw));
        });
        if (best < 0) return;
        setPlayMode('all');
        seekGlobal((offsets[best] || 0) + fraction * (durations[best] || 0));
    }, [durations, offsets, seekGlobal, setPlayMode]);

    const onTrackPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        seekFromPointer(event.clientX);
    }, [seekFromPointer]);

    const onTrackPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (event.buttons === 0) return;
        seekFromPointer(event.clientX);
    }, [seekFromPointer]);

    // قاب fit — iframe با سایز واقعی استیج رندر و با scale داخلش جا می‌شود
    const size = useMemo(() => stageSize(aspectRatio), [aspectRatio]);
    const fit = useFitSize(stageRef, size.width, size.height);
    const boxStyle = fit.width
        ? { width: fit.width, height: fit.height }
        : ({ aspectRatio: '16 / 9', width: '100%' } as const);
    const iframeStyle = fit.width
        ? {
            width: size.width,
            height: size.height,
            transform: `scale(${fit.width / size.width})`,
            transformOrigin: 'top left',
            willChange: 'transform',
        }
        : ({ aspectRatio: '16 / 9', width: '100%' } as const);

    const posterFailed = activeCut ? Boolean(failedThumbs[activeCut._id]) : false;
    const hasPoster = Boolean(activeCut?.thumbnailUrl) && !posterFailed;

    if (!renderable.length) {
        return (
            <div className={styles.player}>
                <div ref={stageRef} className={styles.stageArea}>
                    <div className={styles.empty} style={boxStyle}>
                        <LuPlay size={24} />
                        <span>{t('allplayer_no_cuts', { defaultValue: 'کاتی برای پخش نیست' })}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.player}>
            {/* ── صحنه — پخش: iframe کات فعال؛ توقف: پوستر اسکرین‌شات، و اگر بک‌اند هنوز
                اسکرین‌شات نداده باشد سند زنده‌ی کات فریز‌شده روی زمان فعلی ── */}
            <div ref={stageRef} className={styles.stageArea}>
                <div className={styles.frameBox} style={boxStyle}>
                    {playing ? (
                        <iframe
                            key={activeCut!._id}
                            ref={frameRef}
                            title={`ads-preview-${activeCut!._id}`}
                            className={styles.frame}
                            style={iframeStyle}
                            srcDoc={buildCutDocument(activeCut!.html, null)}
                            sandbox="allow-scripts allow-same-origin"
                            scrolling="no"
                            tabIndex={-1}
                            onLoad={() => {
                                // سند تازه mount شده — روی زمان محلیِ همین لحظه قفل شود
                                try {
                                    const win = frameRef.current?.contentWindow as (Window & { __adsSeek?: (t: number) => void }) | null;
                                    win?.__adsSeek?.(Math.max(0, pendingLocalRef.current));
                                } catch {
                                    /* ignore */
                                }
                            }}
                        />
                    ) : hasPoster && activeCut ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={`${activeCut._id}-v${activeCut.currentVersion}`}
                            className={styles.poster}
                            src={activeCut.thumbnailUrl || undefined}
                            alt={activeCut.title}
                            draggable={false}
                            onError={() => setFailedThumbs((prev) => ({ ...prev, [activeCut._id]: true }))}
                        />
                    ) : activeCut ? (
                        <iframe
                            key={`${activeCut._id}-paused-v${activeCut.currentVersion}`}
                            ref={frameRef}
                            title={`ads-preview-paused-${activeCut._id}`}
                            className={styles.frame}
                            style={iframeStyle}
                            srcDoc={buildCutDocument(activeCut.html, null)}
                            sandbox="allow-scripts allow-same-origin"
                            scrolling="no"
                            tabIndex={-1}
                            onLoad={(event) => {
                                // فریز سند روی زمان محلیِ فعلی تا لحظه‌ی پخش/scrub بعدی
                                try {
                                    const win = event.currentTarget.contentWindow as (Window & {
                                        __adsSeek?: (t: number) => void;
                                        __adsPause?: () => void;
                                    }) | null;
                                    win?.__adsSeek?.(Math.max(0, pendingLocalRef.current));
                                    win?.__adsPause?.();
                                } catch {
                                    /* ignore */
                                }
                            }}
                        />
                    ) : null}

                    <button
                        type="button"
                        className={`${styles.playOverlay} ${playing ? styles.playOverlayPlaying : ''}`}
                        onClick={togglePlay}
                        aria-label={playing ? t('player_pause') : t('player_play')}
                        title={playing ? t('player_pause') : t('player_play')}
                    >
                        {playing ? <LuPause size={16} /> : <LuPlay size={18} />}
                    </button>
                </div>
            </div>

            {/* ── نوار پخش — دکمه، تایم‌لاین تکه‌تکه (هر کات یک سگمنت) و زمان ── */}
            <div className={styles.transport}>
                <button
                    type="button"
                    className={`${styles.transportPlay} ${playing && mode === 'all' ? styles.transportPlayActive : ''}`}
                    onClick={togglePlay}
                    aria-label={playing ? t('player_pause') : t('player_play')}
                    title={playing ? t('player_pause') : t('player_play')}
                >
                    {playing ? <LuPause size={13} /> : <LuPlay size={13} />}
                </button>
                <div
                    className={styles.segments}
                    role="slider"
                    aria-label={t('timeline_label', { defaultValue: 'تایم‌لاین ویدیو' })}
                    aria-valuemin={0}
                    aria-valuemax={Math.round(totalDuration)}
                    aria-valuenow={Math.round(uiTime)}
                    onPointerDown={onTrackPointerDown}
                    onPointerMove={onTrackPointerMove}
                >
                    {renderable.map((cut, index) => (
                        <div
                            key={cut._id}
                            ref={(el) => { segmentRefs.current[index] = el; }}
                            className={`${styles.segment} ${index === activeIndexSafe ? styles.segmentActive : ''}`}
                            style={{ flexGrow: durations[index] }}
                            title={`${index + 1}. ${cut.title}`}
                        >
                            <i className={styles.segmentFill} />
                        </div>
                    ))}
                </div>
                <span className={styles.clock}>
                    {formatClock(uiTime)} / {formatClock(totalDuration)}
                </span>
            </div>

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

export const AdsPreviewPlayer = memo(AdsPreviewPlayerBase);
export default AdsPreviewPlayer;
