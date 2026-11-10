'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type OptionAudioStatus = 'idle' | 'loading' | 'playing' | 'paused';

export interface OptionAudioPreview {
    activeKey: string | null;
    status: OptionAudioStatus;
    /** Play `url` under `key`; same key toggles pause/resume, another key switches. */
    toggle: (key: string, url: string) => void;
    stop: () => void;
    /**
     * Ref for an element whose `--preview-progress` (0…1) follows playback of `key`.
     * Several elements may share a key (e.g. a dropdown's trigger and its open menu row).
     */
    bindFill: (key: string) => (el: HTMLElement | null) => void;
}

function playbackRatio(audio: HTMLAudioElement | null): number {
    if (!audio || !(audio.duration > 0)) return 0;
    return Math.min(1, audio.currentTime / audio.duration);
}

/**
 * One shared <audio> for every option sample in a settings popover, so only one
 * voice plays at a time. Progress is written straight onto the bound element as
 * a CSS variable on each animation frame — the popover itself never re-renders
 * while a sample plays.
 */
export function useOptionAudioPreview(): OptionAudioPreview {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fillsRef = useRef(new Map<string, Set<HTMLElement>>());
    const keyRef = useRef<string | null>(null);
    const rafRef = useRef(0);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [status, setStatus] = useState<OptionAudioStatus>('idle');

    const paint = useCallback((key: string | null, ratio: number) => {
        if (!key) return;
        fillsRef.current.get(key)?.forEach((el) => el.style.setProperty('--preview-progress', String(ratio)));
    }, []);

    const startLoop = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        const frame = () => {
            paint(keyRef.current, playbackRatio(audioRef.current));
            rafRef.current = requestAnimationFrame(frame);
        };
        rafRef.current = requestAnimationFrame(frame);
    }, [paint]);

    const reset = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        paint(keyRef.current, 0);
        keyRef.current = null;
        setActiveKey(null);
        setStatus('idle');
    }, [paint]);

    const stop = useCallback(() => {
        audioRef.current?.pause();
        reset();
    }, [reset]);

    const ensureAudio = useCallback(() => {
        if (audioRef.current) return audioRef.current;
        const audio = new Audio();
        audio.preload = 'auto';
        audio.addEventListener('playing', () => {
            setStatus('playing');
            startLoop();
        });
        audio.addEventListener('waiting', () => setStatus('loading'));
        // rAF is paused while the page isn't drawing (background tab) — keep progress honest anyway
        audio.addEventListener('timeupdate', () => paint(keyRef.current, playbackRatio(audio)));
        audio.addEventListener('ended', reset);
        audio.addEventListener('error', () => {
            if (keyRef.current) reset();
        });
        audioRef.current = audio;
        return audio;
    }, [paint, reset, startLoop]);

    const play = useCallback((audio: HTMLAudioElement, key: string) => {
        audio.play().catch((error: unknown) => {
            // a newer src/pause interrupted this play() — not a failure of the current sample
            if ((error as { name?: string })?.name === 'AbortError') return;
            if (keyRef.current === key) reset();
        });
    }, [reset]);

    const toggle = useCallback((key: string, url: string) => {
        const audio = ensureAudio();
        if (keyRef.current === key) {
            if (audio.paused) {
                setStatus('loading');
                play(audio, key);
            } else {
                audio.pause();
                cancelAnimationFrame(rafRef.current);
                paint(key, playbackRatio(audioRef.current));
                setStatus('paused');
            }
            return;
        }
        audio.pause();
        cancelAnimationFrame(rafRef.current);
        paint(keyRef.current, 0);
        keyRef.current = key;
        setActiveKey(key);
        setStatus('loading');
        audio.src = url;
        audio.currentTime = 0;
        play(audio, key);
    }, [ensureAudio, paint, play]);

    const bindFill = useCallback((key: string) => {
        // each render hands React a fresh callback; it remembers its own element so
        // detaching (called with null) removes exactly that one from the key's set
        let bound: HTMLElement | null = null;
        return (el: HTMLElement | null) => {
            const fills = fillsRef.current;
            if (!el) {
                if (bound) {
                    fills.get(key)?.delete(bound);
                    if (!fills.get(key)?.size) fills.delete(key);
                }
                bound = null;
                return;
            }
            bound = el;
            if (!fills.has(key)) fills.set(key, new Set());
            fills.get(key)?.add(el);
            el.style.setProperty('--preview-progress', String(keyRef.current === key ? playbackRatio(audioRef.current) : 0));
        };
    }, []);

    useEffect(() => () => {
        cancelAnimationFrame(rafRef.current);
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        }
        audioRef.current = null;
    }, []);

    return { activeKey, status, toggle, stop, bindFill };
}
