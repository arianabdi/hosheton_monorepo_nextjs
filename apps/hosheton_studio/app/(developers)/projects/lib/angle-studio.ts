/**
 * «زاویه و نور» — state ویرایشگر سه‌بعدی دوربین/نور در چت و نود workflow.
 *
 * کپی محدوده‌ها و قراردادهای API (`my-workspace-api/libs/hosheton_core/src/ai/angle-studio`):
 * - azimuth دوربین ۰ = جای دوربین عکس اصلی، +۹۰ = راستِ صحنه، ۱۸۰ = پشت سوژه
 * - elevation + = بالاتر و رو به پایین؛ zoom ۰ = همان کادر، + = نزدیک‌تر
 * - نور در مختصات صحنه است (۰ = از سمت دوربین اصلی، ۱۸۰ = ضدنور)
 * پرامپت JSON هر نما را سرور می‌سازد؛ این‌جا فقط state و قیمت (تعداد نماها) است.
 */
import type { AiModeItem } from './providers-api';

export const ANGLE_STUDIO_MODE_ID = 'angle-studio';
export const ANGLE_STUDIO_TOOL = 'angle-studio';
export const ANGLE_STUDIO_MAX_SHOTS = 12;
/** طول اسمی پرامپت JSON هر نما برای قیمت — همان ANGLE_STUDIO_PROMPT_LENGTH سرور */
export const ANGLE_STUDIO_PROMPT_LENGTH = 1200;
/** تنظیماتی که «چند تصویر در یک درخواست» می‌خواهند؛ هر نما دقیقاً یک تصویر است */
export const MULTI_IMAGE_SETTING_KEYS = ['numberOfImages', 'numImages', 'num_images', 'n', 'imageCount', 'batchSize', 'batch_size'];

export const ANGLE_LIMITS = {
    cameraElevation: { min: -45, max: 80 },
    zoom: { min: -10, max: 10 },
    lightElevation: { min: -60, max: 90 },
} as const;

export interface AngleCamera {
    azimuth: number;
    elevation: number;
    zoom: number;
}

export interface AngleLight {
    enabled: boolean;
    azimuth: number;
    elevation: number;
    color: string;
    intensity: number;
    softness: number;
    presetId?: string;
}

export interface AngleShot {
    id: string;
    label?: string;
    labelFa?: string;
    camera: AngleCamera;
    light: AngleLight;
}

export interface AngleStudioState {
    version: 1;
    enabled: boolean;
    camera: AngleCamera;
    light: AngleLight;
    shots: AngleShot[];
    bestAngles: boolean;
    /** نماهای نهایی (به ترتیب خروجی) — برای قیمت و اجرای نود؛ سرور چت دوباره می‌سازد */
    resolvedShots?: AngleShot[];
}

export interface AngleBestAngle {
    id: string;
    label: string;
    labelFa: string;
    azimuth: number;
    elevation: number;
    zoom: number;
}

export interface AngleLightPreset {
    id: string;
    label: string;
    labelFa: string;
    azimuth: number;
    elevation: number;
    color: string;
    intensity: number;
    softness: number;
}

export interface AngleStudioConfig {
    maxShots: number;
    bestAngles: AngleBestAngle[];
    lightPresets: AngleLightPreset[];
}

export const DEFAULT_ANGLE_CAMERA: AngleCamera = { azimuth: 45, elevation: 15, zoom: 0 };
export const DEFAULT_ANGLE_LIGHT: AngleLight = {
    enabled: false,
    azimuth: 315,
    elevation: 35,
    color: '#ffe8c7',
    intensity: 70,
    softness: 70,
};

/** پیش‌فرض‌ها اگر مود هنوز از سرور نرسیده باشد (همان پیش‌فرض‌های کد API) */
export const FALLBACK_BEST_ANGLES: AngleBestAngle[] = [
    { id: 'three-quarter-right', label: 'Front-right three-quarter', labelFa: 'سه‌رخ راست', azimuth: 45, elevation: 10, zoom: 0 },
    { id: 'three-quarter-left', label: 'Front-left three-quarter', labelFa: 'سه‌رخ چپ', azimuth: 315, elevation: 10, zoom: 0 },
    { id: 'profile-right', label: 'Right profile', labelFa: 'نیم‌رخ راست', azimuth: 90, elevation: 0, zoom: 0 },
    { id: 'profile-left', label: 'Left profile', labelFa: 'نیم‌رخ چپ', azimuth: 270, elevation: 0, zoom: 0 },
    { id: 'back-three-quarter-right', label: 'Back-right three-quarter', labelFa: 'پشت، سه‌رخ راست', azimuth: 135, elevation: 10, zoom: 0 },
    { id: 'back', label: 'Rear view', labelFa: 'از پشت', azimuth: 180, elevation: 5, zoom: 0 },
    { id: 'low-hero', label: 'Low hero angle', labelFa: 'زاویهٔ پایین (قهرمانانه)', azimuth: 20, elevation: -25, zoom: 1 },
    { id: 'high-angle', label: 'High angle', labelFa: 'زاویهٔ بالا', azimuth: 340, elevation: 45, zoom: 0 },
    { id: 'birds-eye', label: "Bird's-eye top view", labelFa: 'نمای عمود از بالا', azimuth: 0, elevation: 75, zoom: -2 },
    { id: 'close-up', label: 'Front close-up', labelFa: 'نمای نزدیک', azimuth: 10, elevation: 5, zoom: 6 },
    { id: 'wide', label: 'Wide establishing shot', labelFa: 'نمای باز', azimuth: 25, elevation: 15, zoom: -6 },
    { id: 'dutch-low-left', label: 'Low three-quarter left', labelFa: 'سه‌رخ چپ از پایین', azimuth: 330, elevation: -15, zoom: 3 },
];

export const FALLBACK_LIGHT_PRESETS: AngleLightPreset[] = [
    { id: 'softbox', label: 'Studio softbox', labelFa: 'سافت‌باکس استودیو', azimuth: 315, elevation: 35, color: '#fff3e0', intensity: 70, softness: 85 },
    { id: 'rembrandt', label: 'Rembrandt', labelFa: 'رامبراند', azimuth: 45, elevation: 40, color: '#ffe0b5', intensity: 80, softness: 45 },
    { id: 'golden-hour', label: 'Golden hour', labelFa: 'ساعت طلایی', azimuth: 60, elevation: 8, color: '#ffb257', intensity: 85, softness: 60 },
    { id: 'rim', label: 'Backlight rim', labelFa: 'ضدنور (ریم)', azimuth: 180, elevation: 25, color: '#ffffff', intensity: 90, softness: 35 },
    { id: 'neon-cyan', label: 'Cyan neon side light', labelFa: 'نئون آبی', azimuth: 270, elevation: 0, color: '#38d4ff', intensity: 80, softness: 30 },
    { id: 'neon-magenta', label: 'Magenta neon side light', labelFa: 'نئون سرخابی', azimuth: 90, elevation: 0, color: '#ff3fa4', intensity: 80, softness: 30 },
    { id: 'moonlight', label: 'Moonlight', labelFa: 'نور ماه', azimuth: 135, elevation: 50, color: '#9db8ff', intensity: 55, softness: 40 },
    { id: 'top-drama', label: 'Dramatic top light', labelFa: 'نور دراماتیک از بالا', azimuth: 0, elevation: 85, color: '#ffffff', intensity: 90, softness: 20 },
    { id: 'candle', label: 'Warm candle uplight', labelFa: 'نور گرم شمع', azimuth: 20, elevation: -20, color: '#ff9a3c', intensity: 60, softness: 55 },
];

export const LIGHT_SWATCHES = ['#fff3e0', '#ffffff', '#ffd27a', '#ff9a3c', '#ff4d4d', '#ff3fa4', '#a78bfa', '#38d4ff', '#5b8cff'];

export const FALLBACK_ANGLE_CONFIG: AngleStudioConfig = {
    maxShots: ANGLE_STUDIO_MAX_SHOTS,
    bestAngles: FALLBACK_BEST_ANGLES,
    lightPresets: FALLBACK_LIGHT_PRESETS,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const num = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export function wrapDegrees(value: number): number {
    const rounded = Math.round(value);
    return ((rounded % 360) + 360) % 360;
}

export function signedDegrees(value: number): number {
    const wrapped = wrapDegrees(value);
    return wrapped > 180 ? wrapped - 360 : wrapped;
}

export function normalizeHex(value: unknown, fallback = DEFAULT_ANGLE_LIGHT.color): string {
    const raw = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(raw)) return `#${raw.slice(1).split('').map((ch) => ch + ch).join('')}`.toLowerCase();
    return fallback;
}

export function normalizeCamera(raw: unknown, fallback: AngleCamera = DEFAULT_ANGLE_CAMERA): AngleCamera {
    const obj = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    return {
        azimuth: wrapDegrees(num(obj.azimuth, fallback.azimuth)),
        elevation: Math.round(clamp(num(obj.elevation, fallback.elevation), ANGLE_LIMITS.cameraElevation.min, ANGLE_LIMITS.cameraElevation.max)),
        zoom: Math.round(clamp(num(obj.zoom, fallback.zoom), ANGLE_LIMITS.zoom.min, ANGLE_LIMITS.zoom.max) * 2) / 2,
    };
}

export function normalizeLight(raw: unknown, fallback: AngleLight = DEFAULT_ANGLE_LIGHT): AngleLight {
    const obj = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const presetId = String(obj.presetId || '').trim();
    return {
        enabled: obj.enabled === true,
        azimuth: wrapDegrees(num(obj.azimuth, fallback.azimuth)),
        elevation: Math.round(clamp(num(obj.elevation, fallback.elevation), ANGLE_LIMITS.lightElevation.min, ANGLE_LIMITS.lightElevation.max)),
        color: normalizeHex(obj.color, fallback.color),
        intensity: Math.round(clamp(num(obj.intensity, fallback.intensity), 0, 100)),
        softness: Math.round(clamp(num(obj.softness, fallback.softness), 0, 100)),
        ...(presetId ? { presetId } : {}),
    };
}

export function newShotId(): string {
    return `shot-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultAngleStudioState(): AngleStudioState {
    return {
        version: 1,
        enabled: true,
        camera: { ...DEFAULT_ANGLE_CAMERA },
        light: { ...DEFAULT_ANGLE_LIGHT },
        shots: [],
        bestAngles: false,
    };
}

/** state خام (تنظیمات چت/دیتای نود) → state کامل ویرایشگر؛ null اگر هرگز روشن نشده */
export function readAngleStudioState(raw: unknown): AngleStudioState | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const shots = (Array.isArray(obj.shots) ? obj.shots : [])
        .slice(0, ANGLE_STUDIO_MAX_SHOTS)
        .map((shot, index) => {
            const row = shot && typeof shot === 'object' ? shot as Record<string, unknown> : {};
            return {
                id: String(row.id || `shot-${index + 1}`),
                camera: normalizeCamera(row.camera),
                light: normalizeLight(row.light),
            };
        });
    return {
        version: 1,
        enabled: obj.enabled === true,
        camera: normalizeCamera(obj.camera),
        light: normalizeLight(obj.light),
        shots,
        bestAngles: obj.bestAngles === true,
    };
}

export function isAngleStudioOn(raw: unknown): boolean {
    return Boolean(raw && typeof raw === 'object' && (raw as Record<string, unknown>).enabled === true);
}

/** constraints مود (پریست‌ها) از پاسخ for-model — با پیش‌فرض‌ها پر می‌شود */
export function angleConfigFromMode(mode?: Pick<AiModeItem, 'constraints'> | null): AngleStudioConfig {
    const constraints = (mode?.constraints || {}) as Record<string, unknown>;
    const bestAngles = Array.isArray(constraints.bestAngles)
        ? (constraints.bestAngles as Array<Record<string, unknown>>).map((row, index) => ({
            id: String(row.id || `angle-${index + 1}`),
            label: String(row.label || row.labelFa || ''),
            labelFa: String(row.labelFa || row.label || ''),
            ...normalizeCamera(row),
        }))
        : [];
    const lightPresets = Array.isArray(constraints.lightPresets)
        ? (constraints.lightPresets as Array<Record<string, unknown>>).map((row, index) => {
            const light = normalizeLight({ ...row, enabled: true });
            return {
                id: String(row.id || `light-${index + 1}`),
                label: String(row.label || row.labelFa || ''),
                labelFa: String(row.labelFa || row.label || ''),
                azimuth: light.azimuth,
                elevation: light.elevation,
                color: light.color,
                intensity: light.intensity,
                softness: light.softness,
            };
        })
        : [];
    const maxShots = Math.round(Number(constraints.maxShots));
    return {
        maxShots: Number.isFinite(maxShots) && maxShots >= 1 ? Math.min(ANGLE_STUDIO_MAX_SHOTS, maxShots) : ANGLE_STUDIO_MAX_SHOTS,
        bestAngles: (bestAngles.length ? bestAngles : FALLBACK_BEST_ANGLES).slice(0, ANGLE_STUDIO_MAX_SHOTS),
        lightPresets: lightPresets.length ? lightPresets : FALLBACK_LIGHT_PRESETS,
    };
}

/** نماهای نهایی به ترتیب خروجی — همان resolveAngleStudioShots سرور */
export function resolveAngleShots(state: AngleStudioState | null, config: AngleStudioConfig = FALLBACK_ANGLE_CONFIG): AngleShot[] {
    if (!state?.enabled) return [];
    const cap = Math.max(1, Math.min(ANGLE_STUDIO_MAX_SHOTS, config.maxShots));
    if (state.bestAngles) {
        return config.bestAngles.slice(0, cap).map((angle) => ({
            id: angle.id,
            label: angle.label,
            labelFa: angle.labelFa,
            camera: normalizeCamera(angle),
            light: { ...state.light },
        }));
    }
    if (state.shots.length) return state.shots.slice(0, cap);
    return [{ id: 'current', camera: { ...state.camera }, light: { ...state.light } }];
}

/** state + نماهای نهایی (برای ذخیره در تنظیمات چت / دیتای نود) */
export function withResolvedShots(state: AngleStudioState, config: AngleStudioConfig): AngleStudioState {
    const { resolvedShots: _old, ...rest } = state;
    return { ...rest, resolvedShots: resolveAngleShots(rest, config) };
}

export function angleShotCount(raw: unknown, config?: AngleStudioConfig): number {
    if (!isAngleStudioOn(raw)) return 0;
    const record = raw as Record<string, unknown>;
    if (!config && Array.isArray(record.resolvedShots) && record.resolvedShots.length) {
        return Math.min(ANGLE_STUDIO_MAX_SHOTS, record.resolvedShots.length);
    }
    return resolveAngleShots(readAngleStudioState(raw), config).length;
}

export function isNeutralCamera(camera: AngleCamera): boolean {
    return wrapDegrees(camera.azimuth) === 0 && camera.elevation === 0 && camera.zoom === 0;
}

export function shotChangesSomething(shot: AngleShot): boolean {
    return !isNeutralCamera(shot.camera) || shot.light.enabled;
}

export function withoutMultiImageSettings(settings: Record<string, unknown> | null | undefined): Record<string, unknown> {
    const next = { ...(settings || {}) };
    for (const key of MULTI_IMAGE_SETTING_KEYS) delete next[key];
    return next;
}

/** ورودی قیمت چند نما — دقیقاً angleStudioQuoteInput سرور */
export function angleQuoteInput(userPromptLength: number, shotCount: number) {
    return {
        unitCount: Math.max(1, shotCount),
        promptLength: Math.max(0, Math.round(userPromptLength || 0)) + ANGLE_STUDIO_PROMPT_LENGTH,
    };
}

/** مود ابزار «زاویه و نور» از فهرست مودهای سازگار یک مدل */
export function findAngleStudioMode(modes: AiModeItem[] | null | undefined): AiModeItem | null {
    return (modes || []).find((mode) => (
        mode.id === ANGLE_STUDIO_MODE_ID
        || String((mode.constraints as Record<string, unknown> | undefined)?.tool || '') === ANGLE_STUDIO_TOOL
    ) && mode.enabled !== false) || null;
}

export function isToolMode(mode: Pick<AiModeItem, 'constraints' | 'id'> | null | undefined): boolean {
    return mode?.id === ANGLE_STUDIO_MODE_ID || Boolean((mode?.constraints as Record<string, unknown> | undefined)?.tool);
}

/** خلاصهٔ کوتاه یک نما برای چیپ‌ها — «۴۵° · ↑۱۵°» (اعداد با فرمت زبان در UI) */
export function shotSummaryParts(shot: AngleShot): { turn: number; tilt: number; zoom: number } {
    return { turn: signedDegrees(shot.camera.azimuth), tilt: shot.camera.elevation, zoom: shot.camera.zoom };
}

/**
 * درخواست قیمت یک نود/چت با «زاویه و نور»: تعداد = نماها، طول = متن + پرامپت JSON،
 * بدون تنظیمات چندتصویری. بدون ابزار، همان درخواست دست‌نخورده برمی‌گردد.
 */
export function applyAngleEstimate<T extends { modelSettings?: Record<string, unknown>; promptLength?: number; unitCount?: number }>(
    payload: T,
    angleStudio: unknown,
): T {
    const shots = angleShotCount(angleStudio);
    if (!shots) return payload;
    const quote = angleQuoteInput(payload.promptLength || 0, shots);
    return {
        ...payload,
        modelSettings: withoutMultiImageSettings(payload.modelSettings),
        promptLength: quote.promptLength,
        unitCount: quote.unitCount,
    };
}
