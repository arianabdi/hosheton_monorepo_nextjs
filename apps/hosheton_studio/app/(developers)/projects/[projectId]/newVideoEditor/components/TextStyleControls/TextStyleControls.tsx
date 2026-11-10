'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuAlignCenter, LuAlignLeft, LuAlignRight, LuBold, LuItalic, LuUnderline } from 'react-icons/lu';
import type { TextClipStyle, TextExitMotion, TextHAlign, TextMotion } from '../../types/timeline';
import styles from './TextStyleControls.module.scss';

const FONT_OPTIONS = [
    { label: 'Vazirmatn / System', value: "'Vazirmatn', 'Segoe UI', Tahoma, sans-serif" },
    { label: 'Tahoma', value: 'Tahoma, sans-serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Courier New', value: "'Courier New', Courier, monospace" },
    { label: 'Impact', value: 'Impact, sans-serif' },
];

const MOTION_OPTIONS: TextMotion[] = ['none', 'fadeIn', 'slideUp', 'pop', 'typewriter'];
const EXIT_MOTION_OPTIONS: TextExitMotion[] = ['none', 'fadeOut', 'slideOutDown', 'slideOutUp', 'shrinkOut'];
const ALIGN_OPTIONS: TextHAlign[] = ['left', 'center', 'right'];

type TextStyleControlsProps = {
    text: string;
    style: TextClipStyle;
    onChangeText: (text: string) => void;
    onChangeStyle: (patch: Partial<TextClipStyle>) => void;
    /** Hide the text content textarea (per-row caption editing). */
    hideText?: boolean;
    /** Shown with a "back to layer default" reset button. */
    hasOverrides?: boolean;
    onResetOverrides?: () => void;
};

/** Full style editor for a text/caption layer (font, colors, glow, motion…). */
export default function TextStyleControls({
    text,
    style,
    onChangeText,
    onChangeStyle,
    hideText = false,
    hasOverrides = false,
    onResetOverrides,
}: TextStyleControlsProps) {
    const { t } = useTranslation('videoEditor');

    return (
        <div className={styles.panel}>
            <div className={styles.titleRow}>
                <p className={styles.panelTitle}>{t('text_style_title')}</p>
                {hasOverrides && onResetOverrides && (
                    <button
                        type="button"
                        className={styles.resetOverridesBtn}
                        title={t('text_reset_to_default_hint')}
                        onClick={onResetOverrides}
                    >
                        {t('text_reset_to_default')}
                    </button>
                )}
            </div>

            {!hideText && (
                <label className={styles.field}>
                    <span>{t('text_content')}</span>
                    <textarea
                        rows={3}
                        value={text}
                        onChange={(event) => onChangeText(event.target.value)}
                    />
                </label>
            )}

            <div className={styles.row}>
                <label className={styles.field}>
                    <span>{t('font')}</span>
                    <select
                        value={style.fontFamily}
                        onChange={(event) => onChangeStyle({ fontFamily: event.target.value })}
                    >
                        {FONT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span>{t('motion')}</span>
                    <select
                        value={style.motion}
                        onChange={(event) => onChangeStyle({ motion: event.target.value as TextMotion })}
                    >
                        {MOTION_OPTIONS.map((option) => (
                            <option key={option} value={option}>{t(`motion_${option}`)}</option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span>{t('exit_motion')}</span>
                    <select
                        value={style.exitMotion ?? 'none'}
                        onChange={(event) => onChangeStyle({ exitMotion: event.target.value as TextExitMotion })}
                    >
                        {EXIT_MOTION_OPTIONS.map((option) => (
                            <option key={option} value={option}>{t(`exit_${option}`)}</option>
                        ))}
                    </select>
                </label>
            </div>

            <label className={styles.sliderField}>
                <span>{t('font_size')}</span>
                <input
                    type="range"
                    min={16}
                    max={140}
                    step={2}
                    value={style.fontSize}
                    onChange={(event) => onChangeStyle({ fontSize: Number(event.target.value) })}
                />
                <em>{style.fontSize}px</em>
            </label>

            <div className={styles.row}>
                <label className={`${styles.field} ${styles.colorField}`}>
                    <span>{t('text_color')}</span>
                    <input
                        type="color"
                        value={style.color || '#ffffff'}
                        onChange={(event) => onChangeStyle({ color: event.target.value })}
                    />
                </label>

                <div className={styles.toggleGroup} role="group" aria-label={t('text_decoration')}>
                    <button
                        type="button"
                        className={style.bold ? styles.toggleActive : ''}
                        aria-pressed={!!style.bold}
                        title={t('bold')}
                        onClick={() => onChangeStyle({ bold: !style.bold })}
                    >
                        <LuBold />
                    </button>
                    <button
                        type="button"
                        className={style.italic ? styles.toggleActive : ''}
                        aria-pressed={!!style.italic}
                        title={t('italic')}
                        onClick={() => onChangeStyle({ italic: !style.italic })}
                    >
                        <LuItalic />
                    </button>
                    <button
                        type="button"
                        className={style.underline ? styles.toggleActive : ''}
                        aria-pressed={!!style.underline}
                        title={t('underline')}
                        onClick={() => onChangeStyle({ underline: !style.underline })}
                    >
                        <LuUnderline />
                    </button>
                </div>

                <div className={styles.toggleGroup} role="group" aria-label={t('alignment')}>
                    {ALIGN_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={(style.align ?? 'center') === option ? styles.toggleActive : ''}
                            aria-pressed={(style.align ?? 'center') === option}
                            title={t(`align_${option}`)}
                            onClick={() => onChangeStyle({ align: option })}
                        >
                            {option === 'left' && <LuAlignLeft />}
                            {option === 'center' && <LuAlignCenter />}
                            {option === 'right' && <LuAlignRight />}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.row}>
                <label className={`${styles.field} ${styles.colorField}`}>
                    <span>
                        {t('background_color')}
                        <button
                            type="button"
                            className={styles.noneBtn}
                            onClick={() => onChangeStyle({ backgroundColor: '' })}
                        >
                            {t('color_none')}
                        </button>
                    </span>
                    <input
                        type="color"
                        value={style.backgroundColor || '#111827'}
                        onChange={(event) => onChangeStyle({ backgroundColor: event.target.value })}
                    />
                </label>

                {style.backgroundColor && (
                    <label className={styles.sliderField}>
                        <span>{t('background_opacity')}</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round((style.backgroundOpacity ?? 0.55) * 100)}
                            onChange={(event) => onChangeStyle({ backgroundOpacity: Number(event.target.value) / 100 })}
                        />
                        <em>{Math.round((style.backgroundOpacity ?? 0.55) * 100)}%</em>
                    </label>
                )}
            </div>

            <div className={styles.row}>
                <label className={`${styles.field} ${styles.colorField}`}>
                    <span>
                        {t('glow')}
                        <button
                            type="button"
                            className={styles.noneBtn}
                            onClick={() => onChangeStyle({ glowColor: '' })}
                        >
                            {t('color_none')}
                        </button>
                    </span>
                    <input
                        type="color"
                        value={style.glowColor || '#22d3ee'}
                        onChange={(event) => onChangeStyle({ glowColor: event.target.value })}
                    />
                </label>

                {style.glowColor && (
                    <label className={styles.sliderField}>
                        <span>{t('glow_blur')}</span>
                        <input
                            type="range"
                            min={2}
                            max={48}
                            value={style.glowBlur ?? 12}
                            onChange={(event) => onChangeStyle({ glowBlur: Number(event.target.value) })}
                        />
                        <em>{style.glowBlur ?? 12}px</em>
                    </label>
                )}
            </div>

            <div className={styles.row}>
                <label className={`${styles.field} ${styles.colorField}`}>
                    <span>
                        {t('stroke')}
                        <button
                            type="button"
                            className={styles.noneBtn}
                            onClick={() => onChangeStyle({ strokeWidth: 0 })}
                        >
                            {t('color_none')}
                        </button>
                    </span>
                    <input
                        type="color"
                        value={style.strokeColor || '#000000'}
                        onChange={(event) => onChangeStyle({ strokeColor: event.target.value })}
                    />
                </label>

                {(style.strokeWidth ?? 0) > 0 && (
                    <label className={styles.sliderField}>
                        <span>{t('stroke_width')}</span>
                        <input
                            type="range"
                            min={1}
                            max={12}
                            value={style.strokeWidth ?? 3}
                            onChange={(event) => onChangeStyle({ strokeWidth: Number(event.target.value) })}
                        />
                        <em>{style.strokeWidth ?? 3}px</em>
                    </label>
                )}
            </div>

            {style.motion && style.motion !== 'none' && (
                <label className={styles.sliderField}>
                    <span>{t('motion_speed')}</span>
                    <input
                        type="range"
                        min={10}
                        max={200}
                        value={Math.round((style.motionDuration ?? 0.3) * 100)}
                        onChange={(event) => onChangeStyle({ motionDuration: Number(event.target.value) / 100 })}
                    />
                    <em>{((style.motionDuration ?? 0.3)).toFixed(2)}s</em>
                </label>
            )}

            {style.exitMotion && style.exitMotion !== 'none' && (
                <label className={styles.sliderField}>
                    <span>{t('exit_motion_speed')}</span>
                    <input
                        type="range"
                        min={10}
                        max={200}
                        value={Math.round((style.exitMotionDuration ?? style.motionDuration ?? 0.3) * 100)}
                        onChange={(event) => onChangeStyle({ exitMotionDuration: Number(event.target.value) / 100 })}
                    />
                    <em>{((style.exitMotionDuration ?? style.motionDuration ?? 0.3)).toFixed(2)}s</em>
                </label>
            )}
        </div>
    );
}
