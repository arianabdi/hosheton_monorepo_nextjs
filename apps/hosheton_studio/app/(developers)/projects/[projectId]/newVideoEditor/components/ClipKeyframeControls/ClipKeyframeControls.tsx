'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuDiamond, LuChevronLeft, LuChevronRight, LuTimer, LuTrash2 } from 'react-icons/lu';
import type { Clip, ClipKeyframeMap, KeyframeEasing, TextClipStyle } from '../../types/timeline';
import { KEYFRAME_EASINGS, getKeyframeAtTime, sampleKeyframeChannel } from '../../utils/keyframes';
import {
    KEYFRAME_GROUP_ORDER,
    getKeyframeChannelsForClip,
    groupLabelKey,
    type KeyframeChannelDef,
    type KeyframeChannelId,
} from '../../utils/keyframe-channels';
import styles from './ClipKeyframeControls.module.scss';

type ClipKeyframeControlsProps = {
    clip: Clip;
    /** Playhead position in seconds relative to the clip start (clamped). */
    localTime: number;
    /** Effective text style — base values for text channels. */
    textStyle?: TextClipStyle;
    onToggleChannel: (channel: KeyframeChannelDef) => void;
    onUpsertKeyframe: (channelId: KeyframeChannelId, time: number, value: number | string) => void;
    onRemoveKeyframeAt: (channelId: KeyframeChannelId, time: number) => void;
    onSetEasing: (channelId: KeyframeChannelId, easing: KeyframeEasing) => void;
    onSeekLocalTime: (time: number) => void;
    /** Edit the static (non-animated) value the channel holds. */
    onEditBase: (channelId: KeyframeChannelId, value: number | string) => void;
    onClearAll: () => void;
};

function roundDisplay(value: number): number {
    return Math.round(value * 100) / 100;
}

export default function ClipKeyframeControls({
    clip,
    localTime,
    textStyle,
    onToggleChannel,
    onUpsertKeyframe,
    onRemoveKeyframeAt,
    onSetEasing,
    onSeekLocalTime,
    onEditBase,
    onClearAll,
}: ClipKeyframeControlsProps) {
    const { t } = useTranslation('videoEditor');
    const channels = getKeyframeChannelsForClip(clip).sort(
        (a, b) => KEYFRAME_GROUP_ORDER.indexOf(a.group) - KEYFRAME_GROUP_ORDER.indexOf(b.group),
    );
    const keyframes: ClipKeyframeMap = clip.keyframes ?? {};
    const totalCount = channels.reduce((sum, channel) => sum + (keyframes[channel.id]?.length ?? 0), 0);

    const grouped = KEYFRAME_GROUP_ORDER
        .map((group) => ({ group, list: channels.filter((channel) => channel.group === group) }))
        .filter((entry) => entry.list.length > 0);

    const renderRow = (channel: KeyframeChannelDef) => {
        const kfs = keyframes[channel.id];
        const animated = !!kfs?.length;
        const kfAtPlayhead = getKeyframeAtTime(kfs, localTime);

        let displayValue: number | string;
        if (animated) {
            displayValue = sampleKeyframeChannel(kfs, localTime) ?? channel.readBase(clip, textStyle) ?? 0;
        } else {
            displayValue = channel.readBase(clip, textStyle) ?? '';
        }
        if (channel.kind === 'color' && (typeof displayValue !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(displayValue))) {
            displayValue = channel.fallbackColor ?? '#000000';
        }

        const storedToDisplay = (value: number | string) => (
            typeof value === 'number' ? roundDisplay(value * channel.displayScale) : value
        );
        const displayToStored = (raw: number) => raw / channel.displayScale;

        const changeValue = (raw: number | string) => {
            if (channel.kind === 'color') {
                if (typeof raw !== 'string') return;
                if (animated) onUpsertKeyframe(channel.id, localTime, raw);
                else onEditBase(channel.id, raw);
                return;
            }
            const numeric = Number(raw);
            if (!Number.isFinite(numeric)) return;
            const clamped = Math.min(channel.max, Math.max(channel.min, numeric));
            if (animated) onUpsertKeyframe(channel.id, localTime, displayToStored(clamped));
            else onEditBase(channel.id, displayToStored(clamped));
        };

        const stepToNeighbor = (direction: -1 | 1) => {
            if (!kfs?.length) return;
            if (direction === -1) {
                const before = [...kfs].reverse().find((kf) => kf.time < localTime - 1e-6);
                if (before) onSeekLocalTime(before.time);
            } else {
                const after = kfs.find((kf) => kf.time > localTime + 1e-6);
                if (after) onSeekLocalTime(after.time);
            }
        };

        const easingValue = kfAtPlayhead?.easing
            ?? kfs?.find((kf) => kf.easing)?.easing
            ?? kfs?.[0]?.easing
            ?? 'linear';

        return (
            <div key={channel.id} className={`${styles.row} ${animated ? styles.rowAnimated : ''}`}>
                <button
                    type="button"
                    className={`${styles.stopwatch} ${animated ? styles.stopwatchOn : ''}`}
                    onClick={() => onToggleChannel(channel)}
                    title={t('keyframe_stopwatch')}
                    aria-label={t('keyframe_stopwatch')}
                    aria-pressed={animated}
                >
                    <LuTimer />
                </button>
                <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => stepToNeighbor(-1)}
                    disabled={!animated}
                    title={t('keyframe_prev')}
                    aria-label={t('keyframe_prev')}
                >
                    <LuChevronLeft />
                </button>
                <button
                    type="button"
                    className={`${styles.kfToggle} ${kfAtPlayhead ? styles.kfToggleOn : ''}`}
                    onClick={() => {
                        if (!animated) return;
                        if (kfAtPlayhead) onRemoveKeyframeAt(channel.id, localTime);
                        else onUpsertKeyframe(channel.id, localTime, displayValue);
                    }}
                    disabled={!animated}
                    title={t('keyframe_toggle')}
                    aria-label={t('keyframe_toggle')}
                >
                    <LuDiamond />
                </button>
                <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => stepToNeighbor(1)}
                    disabled={!animated}
                    title={t('keyframe_next')}
                    aria-label={t('keyframe_next')}
                >
                    <LuChevronRight />
                </button>

                <span className={styles.label}>{t(channel.labelKey)}</span>

                {animated && (
                    <select
                        className={styles.easing}
                        value={easingValue}
                        onChange={(event) => onSetEasing(channel.id, event.target.value as KeyframeEasing)}
                        title={t('keyframe_easing')}
                        aria-label={t('keyframe_easing')}
                    >
                        {KEYFRAME_EASINGS.map((easing) => (
                            <option key={easing} value={easing}>{t(`easing_${easing}`)}</option>
                        ))}
                    </select>
                )}

                {channel.kind === 'color' ? (
                    <input
                        type="color"
                        className={styles.colorInput}
                        value={String(displayValue)}
                        onChange={(event) => changeValue(event.target.value)}
                        aria-label={t(channel.labelKey)}
                    />
                ) : (
                    <label className={styles.valueField}>
                        <input
                            type="number"
                            dir="ltr"
                            min={channel.min}
                            max={channel.max}
                            step={channel.step}
                            value={storedToDisplay(displayValue) as number}
                            onChange={(event) => changeValue(event.target.value)}
                            aria-label={t(channel.labelKey)}
                        />
                        {channel.unit && <span className={styles.unit}>{channel.unit}</span>}
                    </label>
                )}
            </div>
        );
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <span className={styles.title}>{t('keyframes_title')}</span>
                <span className={styles.timeBadge} dir="ltr">
                    {localTime.toFixed(2)}s / {clip.duration.toFixed(2)}s
                </span>
                {totalCount > 0 && (
                    <>
                        <span className={styles.count}>{t('keyframes_count', { count: totalCount })}</span>
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={onClearAll}
                            title={t('keyframes_clear_all')}
                        >
                            <LuTrash2 />
                        </button>
                    </>
                )}
            </div>
            <p className={styles.hint}>{t('keyframes_hint')}</p>

            {grouped.map(({ group, list }) => (
                <details key={group} className={styles.group} open>
                    <summary>{t(groupLabelKey(group))}</summary>
                    <div className={styles.rows}>{list.map(renderRow)}</div>
                </details>
            ))}
        </div>
    );
}
