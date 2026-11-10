'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClipAnimation, ClipAnimKind, ClipLoopKind } from '../../types/timeline';
import { CLIP_ANIM_MOTION_LABEL_KEYS, CLIP_LOOP_LABEL_KEYS } from '../../utils/clip-animation';
import styles from './ClipAnimationControls.module.scss';

const MOTION_VALUES: ClipAnimKind[] = ['none', 'fadeIn', 'slideUp', 'slideLeft', 'slideRight', 'zoomIn', 'bounceIn'];
const LOOP_VALUES: ClipLoopKind[] = ['none', 'float', 'pulse', 'sway', 'shake'];

type ClipAnimationControlsProps = {
    animation?: ClipAnimation;
    onChange: (animation: ClipAnimation | undefined) => void;
};

/**
 * Procedural motion editor for a media clip: entrance, exit, and a continuous
 * sinusoidal effect whose `amplitude` (how far it travels) and `speed`
 * (oscillations per second) act as the two draggable handles.
 */
export default function ClipAnimationControls({ animation, onChange }: ClipAnimationControlsProps) {
    const { t } = useTranslation('videoEditor');
    const enter = animation?.enter;
    const exit = animation?.exit;
    const loop = animation?.loop;

    const patch = (next: Partial<ClipAnimation>) => {
        const merged: ClipAnimation = { ...(animation ?? {}), ...next };
        if (!merged.enter && !merged.exit && !merged.loop) {
            onChange(undefined);
            return;
        }
        onChange(merged);
    };

    const resetAll = () => onChange(undefined);
    const hasAny = !!(enter || exit || loop);

    return (
        <div className={styles.panel}>
            <div className={styles.titleRow}>
                <p className={styles.panelTitle}>{t('clip_animation_title')}</p>
                {hasAny && (
                    <button type="button" className={styles.resetBtn} onClick={resetAll}>
                        {t('clip_animation_reset')}
                    </button>
                )}
            </div>

            <div className={styles.row}>
                <label className={styles.field}>
                    <span>{t('anim_enter')}</span>
                    <select
                        value={enter?.motion ?? 'none'}
                        onChange={(event) => patch({
                            enter: event.target.value === 'none'
                                ? undefined
                                : { motion: event.target.value as ClipAnimKind, duration: enter?.duration ?? 0.5 },
                        })}
                    >
                        {MOTION_VALUES.map((value) => (
                            <option key={value} value={value}>{t(CLIP_ANIM_MOTION_LABEL_KEYS[value])}</option>
                        ))}
                    </select>
                </label>
                {enter && enter.motion !== 'none' && (
                    <label className={styles.field}>
                        <span>{t('anim_enter_speed')}</span>
                        <input
                            type="range"
                            min={10}
                            max={200}
                            value={Math.round((enter.duration ?? 0.5) * 100)}
                            onChange={(event) => patch({
                                enter: { motion: enter.motion, duration: Number(event.target.value) / 100 },
                            })}
                        />
                        <em>{(enter.duration ?? 0.5).toFixed(2)}s</em>
                    </label>
                )}
            </div>

            <div className={styles.row}>
                <label className={styles.field}>
                    <span>{t('anim_exit')}</span>
                    <select
                        value={exit?.motion ?? 'none'}
                        onChange={(event) => patch({
                            exit: event.target.value === 'none'
                                ? undefined
                                : { motion: event.target.value as ClipAnimKind, duration: exit?.duration ?? 0.5 },
                        })}
                    >
                        {MOTION_VALUES.map((value) => (
                            <option key={value} value={value}>{t(CLIP_ANIM_MOTION_LABEL_KEYS[value])}</option>
                        ))}
                    </select>
                </label>
                {exit && exit.motion !== 'none' && (
                    <label className={styles.field}>
                        <span>{t('anim_exit_speed')}</span>
                        <input
                            type="range"
                            min={10}
                            max={200}
                            value={Math.round((exit.duration ?? 0.5) * 100)}
                            onChange={(event) => patch({
                                exit: { motion: exit.motion, duration: Number(event.target.value) / 100 },
                            })}
                        />
                        <em>{(exit.duration ?? 0.5).toFixed(2)}s</em>
                    </label>
                )}
            </div>

            <div className={styles.row}>
                <label className={styles.field}>
                    <span>{t('clip_loop_effect')}</span>
                    <select
                        value={loop?.kind ?? 'none'}
                        onChange={(event) => patch({
                            loop: event.target.value === 'none'
                                ? undefined
                                : {
                                    kind: event.target.value as ClipLoopKind,
                                    amplitude: loop?.amplitude ?? 0.5,
                                    speed: loop?.speed ?? 0.6,
                                },
                        })}
                    >
                        {LOOP_VALUES.map((value) => (
                            <option key={value} value={value}>{t(CLIP_LOOP_LABEL_KEYS[value])}</option>
                        ))}
                    </select>
                </label>
            </div>

            {loop && loop.kind !== 'none' && (
                <>
                    <label className={styles.sliderField} title={t('loop_amplitude_hint')}>
                        <span>{t('loop_amplitude')}</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round((loop.amplitude ?? 0.5) * 100)}
                            onChange={(event) => patch({
                                loop: { kind: loop.kind, amplitude: Number(event.target.value) / 100, speed: loop.speed ?? 0.6 },
                            })}
                        />
                        <em>{Math.round((loop.amplitude ?? 0.5) * 100)}%</em>
                    </label>
                    <label className={styles.sliderField} title={t('loop_speed_hint')}>
                        <span>{t('loop_speed')}</span>
                        <input
                            type="range"
                            min={5}
                            max={300}
                            value={Math.round((loop.speed ?? 0.6) * 100)}
                            onChange={(event) => patch({
                                loop: { kind: loop.kind, amplitude: loop.amplitude ?? 0.5, speed: Number(event.target.value) / 100 },
                            })}
                        />
                        <em>{(loop.speed ?? 0.6).toFixed(2)}Hz</em>
                    </label>
                </>
            )}
        </div>
    );
}
