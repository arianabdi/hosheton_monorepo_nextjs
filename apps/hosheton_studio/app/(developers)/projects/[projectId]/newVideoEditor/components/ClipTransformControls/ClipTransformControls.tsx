'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuRotateCcw } from 'react-icons/lu';
import type { ClipFrame } from '../../types/timeline';
import styles from './ClipTransformControls.module.scss';

type ClipTransformControlsProps = {
    frame: ClipFrame;
    onChange: (patch: Partial<ClipFrame>) => void;
    onReset: () => void;
};

function round1(value: number) {
    return Math.round(value * 10) / 10;
}

/** Position/size may bleed past the canvas; rotation wraps at ±180°. */
const BOUNDS = {
    pos: { min: -100, max: 100 },
    size: { min: 5, max: 200 },
    rotation: { min: -180, max: 180 },
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export default function ClipTransformControls({ frame, onChange, onReset }: ClipTransformControlsProps) {
    const { t } = useTranslation('videoEditor');

    const fields: Array<{
        key: 'x' | 'y' | 'width' | 'height';
        label: string;
        min: number;
        max: number;
        value: number;
    }> = [
        { key: 'x', label: t('transform_x'), min: BOUNDS.pos.min, max: BOUNDS.pos.max, value: round1(frame.x * 100) },
        { key: 'y', label: t('transform_y'), min: BOUNDS.pos.min, max: BOUNDS.pos.max, value: round1(frame.y * 100) },
        { key: 'width', label: t('transform_width'), min: BOUNDS.size.min, max: BOUNDS.size.max, value: round1(frame.width * 100) },
        { key: 'height', label: t('transform_height'), min: BOUNDS.size.min, max: BOUNDS.size.max, value: round1(frame.height * 100) },
    ];

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <span className={styles.title}>{t('transform_title')}</span>
                <button
                    type="button"
                    className={styles.reset}
                    onClick={onReset}
                    title={t('reset')}
                >
                    <LuRotateCcw />
                    <span>{t('reset')}</span>
                </button>
            </div>
            <div className={styles.grid}>
                {fields.map((field) => (
                    <label key={field.key} className={styles.field}>
                        <span>{field.label}</span>
                        <input
                            type="number"
                            dir="ltr"
                            min={field.min}
                            max={field.max}
                            step={0.5}
                            value={round1(frame[field.key] * 100)}
                            onChange={(event) => {
                                const raw = Number(event.target.value);
                                if (!Number.isFinite(raw)) return;
                                const next = clamp(raw, field.min, field.max) / 100;
                                if (field.key === 'x') {
                                    onChange({ x: next });
                                } else if (field.key === 'y') {
                                    onChange({ y: next });
                                } else if (field.key === 'width') {
                                    onChange({ width: next });
                                } else {
                                    onChange({ height: next });
                                }
                            }}
                        />
                        <span className={styles.unit}>%</span>
                    </label>
                ))}
                <label className={`${styles.field} ${styles.rotationField}`}>
                    <span>{t('transform_rotate')}</span>
                    <input
                        type="number"
                        dir="ltr"
                        min={BOUNDS.rotation.min}
                        max={BOUNDS.rotation.max}
                        step={1}
                        value={Math.round(frame.rotation ?? 0)}
                        onChange={(event) => {
                            const raw = Number(event.target.value);
                            if (!Number.isFinite(raw)) return;
                            onChange({ rotation: clamp(raw, BOUNDS.rotation.min, BOUNDS.rotation.max) });
                        }}
                    />
                    <span className={styles.unit}>°</span>
                </label>
            </div>
        </div>
    );
}
