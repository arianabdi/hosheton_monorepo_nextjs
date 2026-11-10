'use client';

import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuPause, LuPlay, LuRotateCcw, LuRotateCw } from 'react-icons/lu';
import { ModalCloseButton } from '@my-workspace/components';
import styles from './PreviewPlayer.module.scss';

/** Seconds jumped by the back / forward buttons and the arrow keys. */
export const PLAYER_SEEK_STEP_S = 5;

type PreviewPlayerProps = {
    title: string;
    dir: 'rtl' | 'ltr';
    isPlaying: boolean;
    totalDuration: number;
    /** Initial values only — the editor's rAF transport repaints
     *  `[data-live-timecode]` and `[data-live-progress]` every frame. */
    timecode: string;
    progress: number;
    onTogglePlay: () => void;
    onSeekBy: (delta: number) => void;
    onScrubStart: () => void;
    onScrub: (time: number) => void;
    onScrubEnd: () => void;
    onClose: () => void;
    /** Container the editor measures to size the preview stage. */
    stageContainerRef: (node: HTMLDivElement | null) => void;
    /** The editor's own preview stage, moved here while the player is open. */
    children: ReactNode;
};

/**
 * Full-screen preview player: the real preview stage, big, with play/pause,
 * ±5s jumps and a draggable progress bar. Editing handles are hidden here.
 */
export default function PreviewPlayer({
    title,
    dir,
    isPlaying,
    totalDuration,
    timecode,
    progress,
    onTogglePlay,
    onSeekBy,
    onScrubStart,
    onScrub,
    onScrubEnd,
    onClose,
    stageContainerRef,
    children,
}: PreviewPlayerProps) {
    const { t } = useTranslation('videoEditor');
    const { t: tc } = useTranslation('common');
    const barRef = useRef<HTMLDivElement>(null);

    const timeAt = (clientX: number) => {
        const bar = barRef.current;
        if (!bar) return 0;
        const rect = bar.getBoundingClientRect();
        const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
        return fraction * totalDuration;
    };

    const handleBarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const bar = event.currentTarget;
        try {
            bar.setPointerCapture(event.pointerId);
        } catch {
            /* pointer already gone — the drag still works while over the bar */
        }
        onScrubStart();
        onScrub(timeAt(event.clientX));

        let pendingX: number | null = null;
        let frame = 0;
        const onMove = (moveEvent: PointerEvent) => {
            pendingX = moveEvent.clientX;
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                if (pendingX === null) return;
                onScrub(timeAt(pendingX));
                pendingX = null;
            });
        };
        const onEnd = () => {
            if (frame) cancelAnimationFrame(frame);
            if (pendingX !== null) onScrub(timeAt(pendingX));
            bar.removeEventListener('pointermove', onMove);
            bar.removeEventListener('pointerup', onEnd);
            bar.removeEventListener('pointercancel', onEnd);
            onScrubEnd();
        };
        bar.addEventListener('pointermove', onMove);
        bar.addEventListener('pointerup', onEnd);
        bar.addEventListener('pointercancel', onEnd);
    };

    return (
        <section className={styles.player} dir={dir} role="dialog" aria-modal="true" aria-label={title}>
            <header className={styles.header}>
                <h2 className={styles.title}>{title}</h2>
                <ModalCloseButton placement="inline" onClick={onClose} aria-label={tc('close')} />
            </header>

            {/* Tapping the picture toggles playback, like any video player. */}
            <div className={styles.stage} ref={stageContainerRef} onClick={onTogglePlay}>
                {children}
            </div>

            <div className={styles.controls}>
                <div
                    ref={barRef}
                    className={styles.progress}
                    data-live-progress
                    style={{ '--progress': progress } as React.CSSProperties}
                    role="slider"
                    tabIndex={0}
                    aria-label={t('player_seek')}
                    aria-valuemin={0}
                    aria-valuemax={Math.round(totalDuration)}
                    aria-valuenow={Math.round(progress * totalDuration)}
                    onPointerDown={handleBarPointerDown}
                >
                    <span className={styles.progressTrack} />
                    <span className={styles.progressFill} />
                    <span className={styles.progressThumb} />
                </div>

                <div className={styles.row}>
                    <span data-live-timecode className={styles.timecode}>{timecode}</span>
                    <div className={styles.buttons}>
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={() => onSeekBy(-PLAYER_SEEK_STEP_S)}
                            aria-label={t('player_back', { count: PLAYER_SEEK_STEP_S })}
                            title={t('player_back', { count: PLAYER_SEEK_STEP_S })}
                        >
                            <LuRotateCcw />
                            <span className={styles.stepLabel}>{PLAYER_SEEK_STEP_S}</span>
                        </button>
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.playBtn}`}
                            onClick={onTogglePlay}
                            aria-label={isPlaying ? t('pause') : t('play')}
                            title={isPlaying ? t('pause') : t('play')}
                        >
                            {isPlaying ? <LuPause /> : <LuPlay />}
                        </button>
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={() => onSeekBy(PLAYER_SEEK_STEP_S)}
                            aria-label={t('player_forward', { count: PLAYER_SEEK_STEP_S })}
                            title={t('player_forward', { count: PLAYER_SEEK_STEP_S })}
                        >
                            <LuRotateCw />
                            <span className={styles.stepLabel}>{PLAYER_SEEK_STEP_S}</span>
                        </button>
                    </div>
                    <span className={styles.rowEnd} aria-hidden />
                </div>
            </div>
        </section>
    );
}
