'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import {
    ANGLE_LIMITS,
    LIGHT_SWATCHES,
    newShotId,
    normalizeHex,
    resolveAngleShots,
    signedDegrees,
    withResolvedShots,
    wrapDegrees,
    type AngleCamera,
    type AngleLight,
    type AngleShot,
    type AngleStudioConfig,
    type AngleStudioState,
} from '../../lib/angle-studio';
import AngleSphere, { type AngleSphereMarker } from './AngleSphere';
import styles from './AngleStudio.module.scss';

type Tab = 'camera' | 'light';

/** نوار اسلایدر شبیه مرجع: برچسب سمت شروع، مقدار سمت پایان، پرشدگی از صفر */
function BarSlider({
    label,
    value,
    min,
    max,
    step = 1,
    display,
    fromZero = false,
    disabled = false,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    display: string;
    fromZero?: boolean;
    disabled?: boolean;
    onChange: (value: number) => void;
}) {
    const pct = (input: number) => ((Math.min(max, Math.max(min, input)) - min) / (max - min)) * 100;
    const current = pct(value);
    const zero = fromZero ? pct(0) : 0;
    const fillStyle: CSSProperties = {
        insetInlineStart: `${Math.min(zero, current)}%`,
        width: `${Math.abs(current - zero)}%`,
    };
    return (
        <label className={`${styles.bar} ${disabled ? styles.barDisabled : ''}`}>
            <span className={styles.barFill} style={fillStyle} />
            <span className={styles.barThumb} style={{ insetInlineStart: `${current}%` }} />
            <span className={styles.barLabel}>{label}</span>
            <span className={styles.barValue} dir="ltr">{display}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                aria-label={label}
                aria-valuetext={display}
                onChange={(event) => onChange(Number(event.target.value))}
            />
        </label>
    );
}

export default function AngleStudioPanel({
    value,
    config,
    imageUrl,
    disabled = false,
    compact = false,
    onChange,
}: {
    value: AngleStudioState;
    config: AngleStudioConfig;
    /** عکس منبع برای کارت وسط کره */
    imageUrl?: string;
    disabled?: boolean;
    /** سایدبار نود: کره کوچک‌تر */
    compact?: boolean;
    onChange: (next: AngleStudioState) => void;
}) {
    const { t } = useTranslation('projects');
    const lang = useAppStore((s) => s.lang);
    const fa = lang === 'fa';
    const num = (input: number) => formatAppNumber(input, lang);
    const percent = (input: number) => `${num(input)}${fa || lang === 'ar' ? '٪' : '%'}`;
    const [tab, setTab] = useState<Tab>('camera');
    // با باز شدن دوباره، همان نمایی انتخاب شود که state.camera/light (و پیش‌نمایش) نشان می‌دهد
    const [selected, setSelected] = useState(() => {
        const sameView = (shot: AngleShot) => (
            shot.camera.azimuth === value.camera.azimuth
            && shot.camera.elevation === value.camera.elevation
            && shot.camera.zoom === value.camera.zoom
            && shot.light.enabled === value.light.enabled
            && shot.light.azimuth === value.light.azimuth
            && shot.light.elevation === value.light.elevation
            && shot.light.color === value.light.color
        );
        const index = value.shots.findIndex(sameView);
        return index >= 0 ? index : 0;
    });

    const multi = !value.bestAngles && value.shots.length > 0;
    const selectedIndex = multi ? Math.min(selected, value.shots.length - 1) : 0;
    useEffect(() => {
        if (multi && selected > value.shots.length - 1) setSelected(value.shots.length - 1);
    }, [multi, selected, value.shots.length]);

    // دوربین/نور قابل ویرایش = نمای انتخاب‌شده (چند نما) یا نمای فعلی
    const editCamera = multi ? value.shots[selectedIndex].camera : value.camera;
    const editLight = multi ? value.shots[selectedIndex].light : value.light;
    const resolved = useMemo(() => resolveAngleShots(value, config), [value, config]);

    const commit = (next: AngleStudioState) => onChange(withResolvedShots(next, config));

    const setCamera = (camera: AngleCamera) => {
        if (value.bestAngles) return;
        if (multi) {
            const shots = value.shots.map((shot, index) => (index === selectedIndex ? { ...shot, camera } : shot));
            commit({ ...value, camera, shots });
        } else {
            commit({ ...value, camera });
        }
    };

    const setLight = (light: AngleLight) => {
        if (multi) {
            const shots = value.shots.map((shot, index) => (index === selectedIndex ? { ...shot, light } : shot));
            commit({ ...value, light, shots });
        } else {
            commit({ ...value, light });
        }
    };

    const addShot = () => {
        if (value.bestAngles) return;
        const base: AngleShot[] = multi
            ? value.shots
            : [{ id: newShotId(), camera: { ...value.camera }, light: { ...value.light } }];
        if (base.length >= config.maxShots) return;
        const from = base[multi ? selectedIndex : 0];
        const shot: AngleShot = {
            id: newShotId(),
            camera: { ...from.camera, azimuth: wrapDegrees(from.camera.azimuth + 45) },
            light: { ...from.light },
        };
        const shots = [...base, shot];
        setSelected(shots.length - 1);
        commit({ ...value, camera: shot.camera, light: shot.light, shots });
    };

    const removeShot = (index: number) => {
        const shots = value.shots.filter((_, i) => i !== index);
        if (shots.length <= 1) {
            const only = shots[0] || value.shots[0];
            setSelected(0);
            commit({ ...value, camera: only.camera, light: only.light, shots: [] });
            return;
        }
        const nextIndex = Math.max(0, Math.min(index, shots.length - 1));
        setSelected(nextIndex);
        commit({ ...value, camera: shots[nextIndex].camera, light: shots[nextIndex].light, shots });
    };

    const selectShot = (index: number) => {
        setSelected(index);
        const shot = value.shots[index];
        if (shot) onChange(withResolvedShots({ ...value, camera: shot.camera, light: shot.light }, config));
    };

    const markers: AngleSphereMarker[] = useMemo(() => {
        if (value.bestAngles) return resolved.map((shot, index) => ({ id: shot.id, camera: shot.camera, index }));
        if (!multi) return [];
        return value.shots
            .map((shot, index) => ({ id: shot.id, camera: shot.camera, index }))
            .filter((marker) => marker.index !== selectedIndex);
    }, [multi, resolved, selectedIndex, value.bestAngles, value.shots]);

    const shotName = (shot: AngleShot, index: number) => {
        const named = fa ? shot.labelFa || shot.label : shot.label || shot.labelFa;
        if (named) return named;
        return t('angle_shot_n', { index: num(index + 1) });
    };

    const lightPresetLabel = (preset: AngleStudioConfig['lightPresets'][number]) => (
        fa ? preset.labelFa || preset.label : preset.label || preset.labelFa
    );

    return (
        <div className={`${styles.panel} ${compact ? styles.panelCompact : ''}`}>
            <div className={styles.tabs} role="tablist" aria-label={t('angle_studio_title')}>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'camera'}
                    className={`${styles.tab} ${tab === 'camera' ? styles.tabActive : ''}`}
                    onClick={() => setTab('camera')}
                >
                    {t('angle_tab_camera')}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'light'}
                    className={`${styles.tab} ${tab === 'light' ? styles.tabActive : ''}`}
                    onClick={() => setTab('light')}
                >
                    {t('angle_tab_light')}
                    {editLight.enabled ? <span className={styles.tabDot} style={{ background: editLight.color }} aria-hidden /> : null}
                </button>
            </div>

            <div className={styles.stageCard}>
                <p className={styles.stageHint}>
                    {tab === 'camera'
                        ? (value.bestAngles ? t('angle_hint_best') : t('angle_hint_camera'))
                        : t('angle_hint_light')}
                </p>
                <AngleSphere
                    camera={editCamera}
                    light={editLight}
                    target={tab}
                    imageUrl={imageUrl}
                    markers={markers}
                    disabled={disabled || (tab === 'camera' && value.bestAngles)}
                    onCameraChange={setCamera}
                    onLightChange={setLight}
                />
                {tab === 'camera' ? (
                    <label className={styles.checkRow}>
                        <input
                            type="checkbox"
                            checked={value.bestAngles}
                            disabled={disabled}
                            onChange={(event) => commit({ ...value, bestAngles: event.target.checked })}
                        />
                        <span>{t('angle_best_angles', { n: num(config.bestAngles.length) })}</span>
                    </label>
                ) : (
                    <label className={styles.checkRow}>
                        <input
                            type="checkbox"
                            checked={editLight.enabled}
                            disabled={disabled}
                            onChange={(event) => setLight({ ...editLight, enabled: event.target.checked })}
                        />
                        <span>{t('angle_light_enable')}</span>
                    </label>
                )}
            </div>

            {tab === 'camera' ? (
                <div className={styles.bars}>
                    <BarSlider
                        label={t('angle_rotation')}
                        value={editCamera.azimuth}
                        min={0}
                        max={359}
                        display={`${num(editCamera.azimuth)}°`}
                        disabled={disabled || value.bestAngles}
                        onChange={(azimuth) => setCamera({ ...editCamera, azimuth })}
                    />
                    <BarSlider
                        label={t('angle_tilt')}
                        value={editCamera.elevation}
                        min={ANGLE_LIMITS.cameraElevation.min}
                        max={ANGLE_LIMITS.cameraElevation.max}
                        display={`${num(editCamera.elevation)}°`}
                        fromZero
                        disabled={disabled || value.bestAngles}
                        onChange={(elevation) => setCamera({ ...editCamera, elevation })}
                    />
                    <BarSlider
                        label={t('angle_zoom')}
                        value={editCamera.zoom}
                        min={ANGLE_LIMITS.zoom.min}
                        max={ANGLE_LIMITS.zoom.max}
                        step={0.5}
                        display={num(editCamera.zoom)}
                        fromZero
                        disabled={disabled || value.bestAngles}
                        onChange={(zoom) => setCamera({ ...editCamera, zoom })}
                    />
                </div>
            ) : (
                <div className={styles.lightControls}>
                    <div className={styles.presetRow} role="list" aria-label={t('angle_light_presets')}>
                        {config.lightPresets.map((preset) => {
                            const active = editLight.enabled && editLight.presetId === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    role="listitem"
                                    className={`${styles.presetChip} ${active ? styles.presetChipActive : ''}`}
                                    disabled={disabled}
                                    onClick={() => setLight({
                                        enabled: true,
                                        azimuth: preset.azimuth,
                                        elevation: preset.elevation,
                                        color: preset.color,
                                        intensity: preset.intensity,
                                        softness: preset.softness,
                                        presetId: preset.id,
                                    })}
                                >
                                    <span className={styles.swatchMini} style={{ background: preset.color }} aria-hidden />
                                    {lightPresetLabel(preset)}
                                </button>
                            );
                        })}
                    </div>
                    <div className={styles.swatchRow} role="radiogroup" aria-label={t('angle_light_color')}>
                        {LIGHT_SWATCHES.map((color) => (
                            <button
                                key={color}
                                type="button"
                                role="radio"
                                aria-checked={editLight.color === color}
                                aria-label={color}
                                className={`${styles.swatch} ${editLight.color === color ? styles.swatchActive : ''}`}
                                style={{ background: color }}
                                disabled={disabled}
                                onClick={() => setLight({ ...editLight, enabled: true, color, presetId: undefined })}
                            />
                        ))}
                        <label className={`${styles.swatch} ${styles.swatchCustom}`} title={t('angle_light_custom_color')}>
                            <input
                                type="color"
                                value={editLight.color}
                                disabled={disabled}
                                aria-label={t('angle_light_custom_color')}
                                onChange={(event) => setLight({ ...editLight, enabled: true, color: normalizeHex(event.target.value), presetId: undefined })}
                            />
                        </label>
                    </div>
                    <div className={styles.bars}>
                        <BarSlider
                            label={t('angle_light_intensity')}
                            value={editLight.intensity}
                            min={0}
                            max={100}
                            display={percent(editLight.intensity)}
                            disabled={disabled || !editLight.enabled}
                            onChange={(intensity) => setLight({ ...editLight, intensity, presetId: undefined })}
                        />
                        <BarSlider
                            label={t('angle_light_softness')}
                            value={editLight.softness}
                            min={0}
                            max={100}
                            display={percent(editLight.softness)}
                            disabled={disabled || !editLight.enabled}
                            onChange={(softness) => setLight({ ...editLight, softness, presetId: undefined })}
                        />
                        <BarSlider
                            label={t('angle_light_direction')}
                            value={editLight.azimuth}
                            min={0}
                            max={359}
                            display={`${num(editLight.azimuth)}°`}
                            disabled={disabled || !editLight.enabled}
                            onChange={(azimuth) => setLight({ ...editLight, azimuth, presetId: undefined })}
                        />
                        <BarSlider
                            label={t('angle_light_height')}
                            value={editLight.elevation}
                            min={ANGLE_LIMITS.lightElevation.min}
                            max={ANGLE_LIMITS.lightElevation.max}
                            display={`${num(editLight.elevation)}°`}
                            fromZero
                            disabled={disabled || !editLight.enabled}
                            onChange={(elevation) => setLight({ ...editLight, elevation, presetId: undefined })}
                        />
                    </div>
                </div>
            )}

            <div className={styles.shots}>
                <div className={styles.shotsHead}>
                    <span className={styles.shotsTitle}>{t('angle_shots_title')}</span>
                    <span className={styles.shotsCount}>{t('angle_outputs_count', { n: num(resolved.length) })}</span>
                </div>
                <div className={styles.shotList}>
                    {value.bestAngles ? resolved.map((shot, index) => (
                        <span key={shot.id} className={styles.shotChip} title={shotName(shot, index)}>
                            <span className={styles.shotIndex}>{num(index + 1)}</span>
                            <span className={styles.shotLabel}>{shotName(shot, index)}</span>
                        </span>
                    )) : multi ? value.shots.map((shot, index) => (
                        <span
                            key={shot.id}
                            className={`${styles.shotChip} ${styles.shotChipButton} ${index === selectedIndex ? styles.shotChipActive : ''}`}
                        >
                            <button
                                type="button"
                                className={styles.shotSelect}
                                disabled={disabled}
                                aria-pressed={index === selectedIndex}
                                onClick={() => selectShot(index)}
                            >
                                <span className={styles.shotIndex}>{num(index + 1)}</span>
                                <span className={styles.shotLabel} dir="ltr">
                                    {`${num(signedDegrees(shot.camera.azimuth))}° · ${num(shot.camera.elevation)}°`}
                                </span>
                                {shot.light.enabled ? <span className={styles.swatchMini} style={{ background: shot.light.color }} aria-hidden /> : null}
                            </button>
                            <button
                                type="button"
                                className={styles.shotRemove}
                                aria-label={t('angle_shot_remove', { index: num(index + 1) })}
                                disabled={disabled}
                                onClick={() => removeShot(index)}
                            >
                                <LuTrash2 size={12} />
                            </button>
                        </span>
                    )) : (
                        <span className={`${styles.shotChip} ${styles.shotChipActive}`}>
                            <span className={styles.shotIndex}>{num(1)}</span>
                            <span className={styles.shotLabel}>{t('angle_current_view')}</span>
                        </span>
                    )}
                    {!value.bestAngles && resolved.length < config.maxShots ? (
                        <button type="button" className={styles.addShot} disabled={disabled} onClick={addShot}>
                            <LuPlus size={13} aria-hidden />
                            {t('angle_add_shot')}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
