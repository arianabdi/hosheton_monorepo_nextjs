'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuPause, LuPlay } from 'react-icons/lu';
import styles from './CommentsPanel.module.scss';

const BAR_COUNT = 28;

/** Deterministic waveform so the same voice note always draws the same shape. */
function waveformBars(seed: string): number[] {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    const bars: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
        hash = Math.imul(hash ^ (i + 1), 2654435761);
        const unit = ((hash >>> 13) & 0xffff) / 0xffff;
        // Mix a speech-like envelope over the noise so bars swell in the middle.
        const envelope = 0.45 + 0.55 * Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
        bars.push(0.18 + 0.82 * unit * envelope);
    }
    return bars;
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

interface VoiceMessageProps {
    src: string;
    /** Stable seed (comment id + attachment index) for the waveform shape. */
    seed: string;
    title?: string;
}

/**
 * Voice-note pill per the chat design: black capsule, white round play button,
 * waveform that fills as playback progresses.
 */
export function VoiceMessage({ src, seed, title }: VoiceMessageProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const bars = useMemo(() => waveformBars(seed), [seed]);

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, [src]);

    const ensureAudio = useCallback(() => {
        if (audioRef.current) return audioRef.current;
        const audio = new Audio(src);
        audio.preload = 'metadata';
        audio.addEventListener('loadedmetadata', () => setDuration(audio.duration || 0));
        audio.addEventListener('timeupdate', () => {
            const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
            setProgress(total > 0 ? Math.min(1, audio.currentTime / total) : 0);
        });
        audio.addEventListener('ended', () => {
            setPlaying(false);
            setProgress(0);
        });
        audio.addEventListener('pause', () => setPlaying(false));
        audio.addEventListener('play', () => setPlaying(true));
        audioRef.current = audio;
        return audio;
    }, [src]);

    const toggle = () => {
        const audio = ensureAudio();
        if (playing) {
            audio.pause();
            return;
        }
        void audio.play().catch(() => setPlaying(false));
    };

    const shownDuration = duration || 0;
    const playedBars = Math.round(progress * BAR_COUNT);

    return (
        <button
            type="button"
            className={styles.voicePill}
            onClick={toggle}
            title={title}
            aria-label={playing ? 'pause' : 'play'}
        >
            <span className={styles.voicePlayBtn}>
                {playing ? <LuPause size={14} /> : <LuPlay size={14} className={styles.voicePlayIcon} />}
            </span>
            <span className={styles.voiceWave} aria-hidden="true">
                {bars.map((height, i) => (
                    <span
                        key={i}
                        className={`${styles.voiceBar} ${i < playedBars ? styles.voiceBarPlayed : ''}`}
                        style={{ height: `${Math.round(height * 100)}%` }}
                    />
                ))}
            </span>
            <span className={styles.voiceDuration}>{formatDuration(shownDuration)}</span>
        </button>
    );
}
