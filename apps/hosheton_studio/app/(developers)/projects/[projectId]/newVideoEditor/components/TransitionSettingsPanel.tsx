'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Clip, Track, TransitionType } from '../types/timeline';
import { getVideoClipsForTransition } from '../utils/transition-utils';
import nodeStyles from '@/app/(developers)/projects/components/NodeSettingsPanel.module.scss';

type TransitionSettingsPanelProps = {
    clip: Clip;
    tracks: Track[];
    onUpdate: (clipId: string, patch: Partial<Clip>) => void;
    onFlip: () => void;
};

export function TransitionSettingsPanel({
    clip,
    tracks,
    onUpdate,
    onFlip,
}: TransitionSettingsPanelProps) {
    const { t } = useTranslation('videoEditor');
    const pair = useMemo(() => getVideoClipsForTransition(tracks, clip), [tracks, clip]);
    const midpoint = clip.startTime + clip.duration / 2;
    const transitionTypes: { value: TransitionType; label: string }[] = [
        { value: 'crossDissolve', label: t('cross_dissolve') },
    ];

    return (
        <div className={nodeStyles.settingsPanel}>
            <h3 className={nodeStyles.panelTitle}>{t('transition_settings')}</h3>
            <p className={nodeStyles.panelMeta}>
                {t('transition_hint')}
            </p>

            <div className={nodeStyles.fieldGroup}>
                <label className={nodeStyles.fieldLabel} htmlFor="tr-title">{t('title_label')}</label>
                <input
                    id="tr-title"
                    className={nodeStyles.fieldInput}
                    value={clip.title}
                    onChange={(e) => onUpdate(clip.id, { title: e.target.value })}
                />
            </div>

            <div className={nodeStyles.fieldGroup}>
                <label className={nodeStyles.fieldLabel} htmlFor="tr-type">{t('effect_type')}</label>
                <select
                    id="tr-type"
                    className={nodeStyles.fieldSelect}
                    value={clip.transitionType ?? 'crossDissolve'}
                    onChange={(e) => onUpdate(clip.id, { transitionType: e.target.value as TransitionType })}
                >
                    {transitionTypes.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            <div className={nodeStyles.fieldGroup}>
                <label className={nodeStyles.fieldLabel} htmlFor="tr-duration">
                    {t('duration_seconds', { value: clip.duration.toFixed(2) })}
                </label>
                <input
                    id="tr-duration"
                    type="range"
                    min={0.15}
                    max={3}
                    step={0.05}
                    value={clip.duration}
                    onChange={(e) => onUpdate(clip.id, { duration: Number(e.target.value) })}
                />
            </div>

            <div className={nodeStyles.fieldGroup}>
                <label className={nodeStyles.fieldLabel} htmlFor="tr-curve">{t('fade_curve')}</label>
                <select
                    id="tr-curve"
                    className={nodeStyles.fieldSelect}
                    value={clip.transitionCurve ?? 'smooth'}
                    onChange={(e) => onUpdate(clip.id, { transitionCurve: e.target.value as Clip['transitionCurve'] })}
                >
                    <option value="linear">{t('linear')}</option>
                    <option value="smooth">{t('smooth')}</option>
                    <option value="easeIn">{t('ease_in')}</option>
                    <option value="easeOut">{t('ease_out')}</option>
                </select>
            </div>

            <div className={nodeStyles.fieldGroup}>
                <label className={nodeStyles.fieldLabel} htmlFor="tr-intensity">
                    {t('fade_intensity', { percent: Math.round((clip.transitionIntensity ?? 1) * 100) })}
                </label>
                <div className={nodeStyles.sliderRow}>
                    <input
                        id="tr-intensity"
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={clip.transitionIntensity ?? 1}
                        onChange={(e) => onUpdate(clip.id, { transitionIntensity: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className={nodeStyles.fieldGroup}>
                <label className={nodeStyles.fieldLabel}>
                    <input
                        type="checkbox"
                        checked={!!clip.reversed}
                        onChange={() => onFlip()}
                    />
                    {' '}{t('reverse_direction')}
                </label>
            </div>

            <div className={nodeStyles.fieldGroup}>
                <span className={nodeStyles.fieldLabel}>{t('connection_status')}</span>
                {pair ? (
                    <p className={nodeStyles.panelMeta}>
                        {t('connected_at', { from: pair.from.title, to: pair.to.title, time: midpoint.toFixed(2) })}
                    </p>
                ) : (
                    <p className={nodeStyles.panelMeta} style={{ color: '#f472b6' }}>
                        {t('need_adjacent')}
                    </p>
                )}
            </div>
        </div>
    );
}
