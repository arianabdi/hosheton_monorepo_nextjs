'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuPause, LuPlay, LuRotateCcw } from 'react-icons/lu';
import {
    aspectCss,
    buildCutDocument,
    cutAudioTracks,
    formatClock,
    stageSize,
    stageSizeLabel,
    syncAudioTracks,
    type AdsAudioTrack,
} from '../lib/cut-runtime';
import { useFitSize } from '../lib/use-fit-size';
import styles from '../AdsVideo.module.scss';

export interface AllCutsPlayerCut {
    _id: string;
    title: string;
    html: string;
    durationSeconds: number;
    voiceover?: { audioUrl?: string } | null;
    soundEffects?: { audioUrl?: string; startAt?: number; volume?: number }[] | null;
}

export interface AllCutsPlayerProps {
    cuts: AllCutsPlayerCut[];
    aspectRatio?: string;
    /** با هر تغییر کات صدا زده می‌شود — برای همگام شدن استوری‌بورد */
    onCutChange?: (index: number) => void;
}

/**
 * پخش یکجای همه‌ی کات‌ها — کل ویدیو مثل یک فایل واحد play می‌شود:
 * ساعت سراسری با rAF جلو می‌رود، هر کات با __adsSeek روی زمان محلی‌اش قفل می‌شود
 * و کات بعدی از قبل mount می‌شود تا گذر بین کات‌ها بی‌درنگ باشد. صداگذاری و
 * افکت‌های هر کات هم با افست سراسری sync می‌شوند. محوطه fullheight و هم‌تم است.
 */
function AllCutsPlayerBase({ cuts, aspectRatio = '16:9', onCutChange }: AllCutsPlayerProps) {
    const { t } = useTranslation('adsVideo');
    const renderable = useMemo(() => cuts.filter((cut) => cut.html), [cuts]);

    const [playing, setPlaying] = useState(false);
    const [globalTime, setGlobalTime] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);

    const timeRef = useRef(0);
    const activeIndexRef = useRef(0);
    const playingRef = useRef(false);
    const lastTickRef = useRef(0);
    const rafRef = useRef(0);
    const frameRefs = useRef<Array<HTMLIFrameElement | null>>([]);
    const audioRefs = useRef<Array<HTMLAudioElement | null>>([]);
    const onCutChangeRef = useRef(onCutChange);
    useEffect(() => {
        onCutChangeRef.current = onCutChange;
    });

    // افست شروع هر کات روی تایم‌لاین سراسری
    const offsets = useMemo(() => {
        const result: number[] = [];
        let acc = 0;
        for (const cut of renderable) {
            result.push(acc);
            acc += Math.max(0.1, cut.durationSeconds || 5);
        }
        return result;
    }, [renderable]);
    const totalDuration = useMemo(
        () => renderable.reduce((sum, cut) => sum + Math.max(0.1, cut.durationSeconds || 5), 0),
        [renderable],
    );

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

    useEffect(() => {
        playingRef.current = playing;
    }, [playing]);

    useEffect(() => {
        activeIndexRef.current = activeIndex;
        onCutChangeRef.current?.(activeIndex);
    }, [activeIndex]);

    /** قفل‌کردن همه‌ی فریم‌ها روی زمان سراسری (فقط کات فعال seek می‌شود) — بدون رفرش UI */
    const applyGlobal = useCallback((time: number) => {
        timeRef.current = time;
        const index = indexAt(time);
        if (index !== activeIndexRef.current) setActiveIndex(index);
        const local = time - (offsets[index] || 0);
        try {
            const win = frameRefs.current[index]?.contentWindow as (Window & { __adsSeek?: (t: number) => void }) | null;
            win?.__adsSeek?.(Math.max(0, local));
        } catch {
            /* iframe آماده نیست */
        }
        syncAudioTracks(audioRefs.current.filter(Boolean) as HTMLAudioElement[], tracks, time, playingRef.current);
    }, [indexAt, offsets, tracks]);

    /** پرش کاربر (سگمنت تایم‌لاین) — سند + UI هر دو بی‌درنگ */
    const seekGlobal = useCallback((time: number) => {
        applyGlobal(time);
        setGlobalTime(time);
    }, [applyGlobal]);

    useEffect(() => {
        const uiEmitRef = { last: 0 };
        const tick = (now: number) => {
            const delta = lastTickRef.current ? (now - lastTickRef.current) / 1000 : 0;
            lastTickRef.current = now;
            if (playingRef.current) {
                const next = timeRef.current + delta;
                if (next >= totalDuration) {
                    applyGlobal(totalDuration);
                    setGlobalTime(totalDuration);
                    setPlaying(false);
                } else {
                    applyGlobal(next);
                    // رفرش UI حداکثر هر ۱۰۰ms — ری‌رندرِ هر فریم پنجره‌ی پدر را می‌لرزاند
                    if (now - uiEmitRef.last > 100) {
                        uiEmitRef.last = now;
                        setGlobalTime(next);
                    }
                }
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [totalDuration, applyGlobal]);

    const setFramePaused = useCallback((index: number, paused: boolean) => {
        try {
            const win = frameRefs.current[index]?.contentWindow as (Window & { __adsPause?: () => void; __adsResume?: () => void }) | null;
            if (!win) return;
            if (paused) win.__adsPause?.();
            else win.__adsResume?.();
        } catch {
            /* iframe آماده نیست */
        }
    }, []);

    // فقط کات فعال در حال اجرا می‌ماند؛ تا وقتی پلیر pause است همه‌ی فریم‌ها
    // (حتی کات فعال) فریز می‌شوند وگرنه انیمیشن داخلی سند لوپ‌وار به پخش ادامه می‌دهد
    useEffect(() => {
        frameRefs.current.forEach((_, index) => {
            setFramePaused(index, !playingRef.current || index !== activeIndex);
        });
    }, [activeIndex, playing, setFramePaused, renderable]);

    const restart = useCallback(() => {
        setActiveIndex(0);
        setPlaying(true);
        seekGlobal(0);
    }, [seekGlobal]);

    const togglePlay = useCallback(() => {
        if (!renderable.length) return;
        const next = !playing;
        if (timeRef.current < totalDuration - 0.05) {
            setFramePaused(activeIndexRef.current, !next);
        }
        if (!next) {
            (audioRefs.current.filter(Boolean) as HTMLAudioElement[]).forEach((audio) => audio.pause());
        }
        if (!playing && timeRef.current >= totalDuration - 0.05) {
            restart();
            return;
        }
        setPlaying(next);
    }, [playing, renderable.length, restart, setFramePaused, totalDuration]);

    const size = useMemo(() => stageSize(aspectRatio), [aspectRatio]);
    const areaRef = useRef<HTMLDivElement | null>(null);
    const fit = useFitSize(areaRef, size.width, size.height);

    if (!renderable.length) {
        return (
            <div className={styles.player}>
                <div ref={areaRef} className={styles.playerStageArea}>
                    <div className={styles.stageSizeBadge}>{stageSizeLabel(aspectRatio)} · {aspectRatio}</div>
                    <div
                        className={styles.playerEmpty}
                        style={fit.width ? { width: fit.width, height: fit.height } : { aspectRatio: '16 / 9', width: '100%' }}
                    >
                        <LuPlay size={26} />
                        <span>{t('allplayer_no_cuts')}</span>
                    </div>
                </div>
            </div>
        );
    }

    const visible = renderable.map((cut, index) => ({ cut, index, isActive: index === activeIndex }));
    // قاب fit — اما iframeها با سایز واقعی استیج رندر و با scale داخلش جا می‌شوند
    // (مثل CutThumb) تا کل سند همیشه دقیقاً داخل پیش‌نمایش دیده شود؛ will-change
    // هر فریم را روی لایه‌ی کامپوزیتور خودش نگه می‌دارد تا قاب scale شده نلرزد
    const iframeStyle = fit.width
        ? {
            width: size.width,
            height: size.height,
            transform: `scale(${fit.width / size.width})`,
            transformOrigin: 'top left',
            willChange: 'transform',
        }
        : { aspectRatio: aspectCss(aspectRatio), width: '100%' };
    const boxStyle = fit.width
        ? { width: fit.width, height: fit.height }
        : { aspectRatio: aspectCss(aspectRatio), width: '100%' };

    return (
        <div className={styles.player}>
            <div ref={areaRef} className={styles.playerStageArea}>
                <div className={styles.stageSizeBadge}>
                    {stageSizeLabel(aspectRatio)} · {aspectRatio}
                    <em className={styles.stageCutName}>{renderable[activeIndex]?.title}</em>
                </div>
                <div className={styles.playerFrameBox} style={boxStyle}>
                    {visible.map(({ cut, index, isActive }) => (
                        <iframe
                            key={cut._id}
                            ref={(el) => { frameRefs.current[index] = el; }}
                            title={`all-${cut._id}`}
                            className={`${styles.playerFrame} ${isActive ? '' : styles.playerFrameHidden}`}
                            style={iframeStyle}
                            srcDoc={buildCutDocument(cut.html, null)}
                            sandbox="allow-scripts allow-same-origin"
                            loading="eager"
                            onLoad={(e) => {
                                // سند تازه لود شده — اگر غیرفعال است یا پلیر روی pause است همان‌جا فریزش کنیم
                                if (!isActive || !playingRef.current) {
                                    try {
                                        (e.currentTarget.contentWindow as (Window & { __adsPause?: () => void }) | null)?.__adsPause?.();
                                    } catch { /* ignore */ }
                                }
                            }}
                        />
                    ))}
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
                <div className={styles.allTimeline} role="presentation">
                    {renderable.map((cut, index) => (
                        <button
                            key={cut._id}
                            type="button"
                            className={`${styles.allSegment} ${index === activeIndex ? styles.allSegmentActive : ''}`}
                            style={{ flexGrow: Math.max(0.1, cut.durationSeconds || 5) }}
                            title={cut.title}
                            aria-label={cut.title}
                            onClick={() => {
                                setPlaying(true);
                                seekGlobal((offsets[index] || 0) + 0.01);
                            }}
                        />
                    ))}
                </div>
                <span className={styles.playerTime}>
                    {formatClock(globalTime)} / {formatClock(totalDuration)}
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

export const AllCutsPlayer = memo(AllCutsPlayerBase);
export default AllCutsPlayer;
