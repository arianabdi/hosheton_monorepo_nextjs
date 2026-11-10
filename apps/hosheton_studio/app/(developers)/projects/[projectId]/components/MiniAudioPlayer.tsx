'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuPause, LuPlay, LuVolume2 } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import styles from './MiniAudioPlayer.module.scss';

interface MiniAudioPlayerProps {
    src: string;
    title?: string;
    compact?: boolean;
    /**
     * default: پخش‌کننده قبلی (همه‌جا). waveform: کارت فایل صوتی — دکمه پخش، نام، زمان
     * و موج صوتی که خودش نوار جابه‌جایی است (نود reference و سایدبارش).
     * tile: کاشی مربعی هم‌اندازه کاشی تصاویر در شبکه چندفایلی reference.
     */
    variant?: 'default' | 'waveform' | 'tile';
    /** waveform: large = کارت بزرگ برای نمای جزئیات (مثلاً مودال جزئیات چت) */
    size?: 'default' | 'large';
    /** کلاس اضافه روی ریشه (waveform/tile) — برای تنظیم میزبان، مثلاً جای اکشن‌های روی کاشی */
    className?: string;
}

const TILE_BARS = 14;

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const WAVE_BARS = 40;

/**
 * شکل موج تزئینی ولی ثابت برای هر فایل (از روی آدرس) — بدون دانلود کل فایل صوتی.
 * نویز نرم‌شده با پوش ملایم تا شبیه موج واقعی باشد.
 */
function waveformHeights(seed: string): number[] {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    const random = () => {
        hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
        hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
        return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
    };
    const raw = Array.from({ length: WAVE_BARS }, () => random());
    return raw.map((_, index) => {
        const around = [raw[index - 1] ?? raw[index], raw[index], raw[index + 1] ?? raw[index]];
        const smooth = (around[0] + around[1] * 2 + around[2]) / 4;
        const envelope = 0.55 + 0.45 * Math.sin((index / (WAVE_BARS - 1)) * Math.PI);
        return Math.round((0.18 + smooth * 0.82 * envelope) * 100);
    });
}

export function MiniAudioPlayer({
    src,
    title,
    compact = false,
    variant = 'default',
    size = 'default',
    className,
}: MiniAudioPlayerProps) {
    const { t } = useTranslation('projects');
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        setPlaying(false);
        setProgress(0);
        setCurrent(0);
        setDuration(0);
    }, [src]);

    const togglePlay = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            audio.play().catch(() => setPlaying(false));
        } else {
            audio.pause();
        }
    }, []);

    const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const next = (Number(e.target.value) / 100) * duration;
        audio.currentTime = next;
        setCurrent(next);
        setProgress(Number(e.target.value));
    };

    const seekTo = useCallback((seconds: number) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const next = Math.min(duration, Math.max(0, seconds));
        audio.currentTime = next;
        setCurrent(next);
        setProgress((next / duration) * 100);
    }, [duration]);

    const heights = useMemo(() => waveformHeights(src || title || 'audio'), [src, title]);
    const draggingRef = useRef(false);

    const audioElement = (
        <audio
            ref={audioRef}
            src={src}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setProgress(0); setCurrent(0); }}
            onLoadedMetadata={() => {
                const dur = audioRef.current?.duration || 0;
                setDuration(dur);
            }}
            onTimeUpdate={() => {
                const audio = audioRef.current;
                if (!audio) return;
                const dur = audio.duration || duration;
                if (audio.duration && audio.duration !== duration) {
                    setDuration(audio.duration);
                }
                setCurrent(audio.currentTime);
                setProgress(dur > 0 ? (audio.currentTime / dur) * 100 : 0);
            }}
        />
    );

    const seekFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (!rect.width) return;
        seekTo(((event.clientX - rect.left) / rect.width) * duration);
    };

    /** موج صوتی = نوار جابه‌جایی: کلیک/کشیدن برای رفتن به نقطه دلخواه، فلش‌ها ۵ ثانیه */
    const renderWave = (bars: number[], className: string) => {
        const playedBars = Math.round((progress / 100) * bars.length);
        return (
            <div
                className={`${className} nodrag nowheel`}
                role="slider"
                tabIndex={0}
                aria-label={title || t('audio_file')}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(current)}
                aria-valuetext={`${formatTime(current)} / ${formatTime(duration)}`}
                onPointerDown={(event) => {
                    event.stopPropagation();
                    if (!duration) return;
                    draggingRef.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    seekFromPointer(event);
                }}
                onPointerMove={(event) => {
                    if (draggingRef.current) seekFromPointer(event);
                }}
                onPointerUp={() => { draggingRef.current = false; }}
                onPointerCancel={() => { draggingRef.current = false; }}
                // جابه‌جایی روی موج، کلیک میزبان (مثلاً باز شدن جزئیات کاشی چت) را اجرا نکند
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') seekTo(current + 5);
                    else if (event.key === 'ArrowLeft') seekTo(current - 5);
                    else if (event.key === 'Home') seekTo(0);
                    else if (event.key === 'End') seekTo(duration);
                    else return;
                    event.preventDefault();
                    event.stopPropagation();
                }}
            >
                {bars.map((height, index) => (
                    <span
                        key={index}
                        className={`${styles.waveBar} ${index < playedBars ? styles.waveBarPlayed : ''}`}
                        style={{ height: `${height}%` }}
                    />
                ))}
            </div>
        );
    };

    const playButton = (className: string) => (
        <button
            type="button"
            className={`${className} nodrag`}
            onClick={togglePlay}
            aria-label={playing ? t('pause') : t('play')}
        >
            {playing ? <LuPause /> : <LuPlay className={styles.wavePlayIcon} />}
        </button>
    );

    if (variant === 'tile') {
        // نمونه‌برداری یکنواخت از همان موج تا کاشی و کارت یک فایل شکل یکسان داشته باشند
        const tileBars = Array.from(
            { length: TILE_BARS },
            (_, index) => heights[Math.round((index * (WAVE_BARS - 1)) / (TILE_BARS - 1))],
        );
        return (
            <div
                className={`${styles.audioTile} ${className || ''}`}
                data-playing={playing}
                title={title || t('audio_file')}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {audioElement}
                {playButton(styles.audioTilePlay)}
                {renderWave(tileBars, styles.audioTileWave)}
                <span className={styles.audioTileMeta}>
                    <span className={styles.audioTileName} dir="auto">{title || t('audio_file')}</span>
                    <span className={styles.audioTileTime}>
                        {playing || current > 0
                            ? formatTime(current)
                            : duration > 0 ? formatTime(duration) : '–:––'}
                    </span>
                </span>
            </div>
        );
    }

    if (variant === 'waveform') {
        return (
            <div
                className={`${styles.wavePlayer} ${compact ? styles.waveCompact : ''} ${size === 'large' ? styles.waveLarge : ''} ${className || ''}`}
                data-playing={playing}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {audioElement}
                {playButton(styles.wavePlay)}
                <div className={styles.waveBody}>
                    <div className={styles.waveHead}>
                        <span className={styles.waveTitle} dir="auto" title={title || t('audio_file')}>
                            {title || t('audio_file')}
                        </span>
                        <span className={styles.waveTime}>
                            {playing || current > 0 ? `${formatTime(current)} / ` : ''}
                            {duration > 0 ? formatTime(duration) : '–:––'}
                        </span>
                    </div>
                    {renderWave(heights, styles.waveform)}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`${styles.player} ${compact ? styles.compact : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {audioElement}

            <div className={styles.visual}>
                {[...Array(compact ? 5 : 8)].map((_, i) => (
                    <span
                        key={i}
                        className={`${styles.bar} ${playing ? styles.barActive : ''}`}
                        style={{ animationDelay: `${i * 0.08}s` }}
                    />
                ))}
            </div>

            <div className={styles.controls}>
                <button type="button" className={styles.playBtn} onClick={togglePlay} aria-label={playing ? t('pause') : t('play')}>
                    {playing ? <LuPause /> : <LuPlay />}
                </button>

                <div className={styles.meta}>
                    <div className={styles.titleRow}>
                        <LuVolume2 />
                        <span className={styles.title}>{title || t('audio_file')}</span>
                    </div>
                    <input
                        type="range"
                        className={styles.seek}
                        min={0}
                        max={100}
                        step={0.1}
                        value={progress}
                        onChange={onSeek}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                    <div className={styles.timeRow} style={{ direction: 'ltr' }}>
                        <span>{formatTime(current)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
