'use client';

import React, { useMemo, useState } from 'react';
import { LuChevronDown, LuTrash2 } from 'react-icons/lu';

import styles from './ModelModesEditor.module.scss';
import ToggleSwitch from './ToggleSwitch';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import {
    formatRequestProfile,
    parseRequestProfileText,
    type ProviderRequestProfile,
} from './requestProfile';
import type { NodeSettingFieldForm } from './settingFieldForm';
import RouteConditionsEditor from './RouteConditionsEditor';
import {
    buildRouteConditionsPayload,
    routeConditionsFromApi,
    routeConditionsMatch,
    summarizeRouteConditions,
    validateRouteConditions,
    type RouteConditionForm,
    type RouteConditionPayload,
} from './routeConditions';

export const MODEL_INPUT_TYPES = ['prompt', 'image', 'video', 'audio', 'mask'] as const;

export type ModelInputType = (typeof MODEL_INPUT_TYPES)[number];

export type SizeUnit = 'MB' | 'KB' | 'Bytes';

// Unit conversion utilities
function bytesToUnit(bytes: number | undefined, unit: SizeUnit): number | undefined {
    if (bytes == null) return undefined;
    switch (unit) {
        case 'MB': return bytes / (1024 * 1024);
        case 'KB': return bytes / 1024;
        case 'Bytes': return bytes;
    }
}

function unitToBytes(value: number | undefined, unit: SizeUnit): number | undefined {
    if (value == null) return undefined;
    switch (unit) {
        case 'MB': return value * 1024 * 1024;
        case 'KB': return value * 1024;
        case 'Bytes': return value;
    }
}

function getStepForUnit(unit: SizeUnit): number {
    switch (unit) {
        case 'MB': return 0.1;
        case 'KB': return 1;
        case 'Bytes': return 1;
    }
}

export interface ActualCostConfig {
    enabled: boolean;
    source: string;
    jsonPath: string;
    currency: string;
    multiplier?: number;
    unitMultiplier?: number;
}

export interface ProviderOption {
    _id: string;
    name: string;
    displayName?: string;
}

export interface RouteCountConstraint {
    min?: number;
    max?: number;
}

export interface RouteSizeConstraint {
    min?: number; // in bytes
    max?: number; // in bytes
}

export interface RouteDurationConstraint {
    min?: number; // in seconds
    max?: number; // in seconds
}

export interface ProviderModelRoute {
    id: string;
    providerId: string;
    endpoint?: string;
    priority?: number;
    default?: boolean;
    /** false = خاموش: انتخاب، قیمت‌گذاری و نمایش نمی‌شود */
    isActive?: boolean;
    /** شرط تنظیمات کاربر (مثل رزولوشن 4k) — همه باید برقرار باشند */
    conditions?: RouteConditionPayload[];
    /** شکل درخواست provider همین مسیر (روی requestProfileOverride مود) */
    requestProfileOverride?: ProviderRequestProfile;
    imageCount?: RouteCountConstraint;
    videoCount?: RouteCountConstraint;
    audioCount?: RouteCountConstraint;
    /** Total number of media inputs across all kinds. */
    totalCount?: RouteCountConstraint;
    imageFileSize?: RouteSizeConstraint;
    videoFileSize?: RouteSizeConstraint;
    audioFileSize?: RouteSizeConstraint;
    /** Total size in bytes across all media inputs, regardless of kind. */
    totalFileSize?: RouteSizeConstraint;
    imageTotalSize?: RouteSizeConstraint;
    videoTotalSize?: RouteSizeConstraint;
    audioTotalSize?: RouteSizeConstraint;
    videoDuration?: RouteDurationConstraint;
    audioDuration?: RouteDurationConstraint;
    supportedFormats?: {
        image?: string[];
        video?: string[];
        audio?: string[];
    };
}

export interface ModelRouteEditorValue {
    editorId: string;
    id: string;
    providerId: string;
    endpointPath: string;
    priority: number;
    isDefault: boolean;
    isActive: boolean;
    conditions: RouteConditionForm[];
    requestProfileOverrideText: string;
    imageCount: RouteCountConstraint;
    videoCount: RouteCountConstraint;
    audioCount: RouteCountConstraint;
    totalCount: RouteCountConstraint;
    imageFileSize: RouteSizeConstraint;
    videoFileSize: RouteSizeConstraint;
    audioFileSize: RouteSizeConstraint;
    totalFileSize: RouteSizeConstraint;
    imageTotalSize: RouteSizeConstraint;
    videoTotalSize: RouteSizeConstraint;
    audioTotalSize: RouteSizeConstraint;
    videoDuration: RouteDurationConstraint;
    audioDuration: RouteDurationConstraint;
    supportedImageFormats: string;
    supportedVideoFormats: string;
    supportedAudioFormats: string;
}

function normalizeJsonPath(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('$') ? trimmed : `$.${trimmed.replace(/^\.+/, '')}`;
}

export function buildActualCostPayload(
    config: ActualCostConfig | undefined,
): ActualCostConfig | null | undefined {
    if (config == null) return config as null | undefined;
    const sourceRaw = String(config.source || 'response').trim().toLowerCase();
    const source = sourceRaw === 'usage' ? 'usage' : 'response';
    const multiplier = Number(config.unitMultiplier ?? config.multiplier ?? 1);
    return {
        enabled: config.enabled,
        source,
        jsonPath: normalizeJsonPath(config.jsonPath),
        currency: 'USD',
        unitMultiplier: Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
    };
}

export interface ProviderModelMode {
    id?: string;
    modeType?: string;
    label?: string;
    endpoint?: string;
    endpointPath?: string;
    default?: boolean;
    isDefault?: boolean;
    /** false = خاموش: نه اجرا می‌شود، نه در chat دیده می‌شود (حذف نمی‌شود) */
    isActive?: boolean;
    priority: number;
    requiredInputs: ModelInputType[];
    optionalInputs: ModelInputType[];
    settingsSchemaOverride?: unknown[];
    requestProfileOverride?: ProviderRequestProfile;
    pricingOverride?: Record<string, unknown>;
    actualCost?: ActualCostConfig;
    routes?: ProviderModelRoute[];
}

export interface ModelModeEditorValue {
    editorId: string;
    modeType: string;
    endpointPath: string;
    isDefault: boolean;
    isActive: boolean;
    priority: number;
    requiredInputs: ModelInputType[];
    optionalInputs: ModelInputType[];
    settingsSchemaOverrideText: string;
    requestProfileOverrideText: string;
    pricingOverrideText: string;
    actualCost?: ActualCostConfig;
    routes: ModelRouteEditorValue[];
}

export interface ModeValidationResult {
    errors: string[];
    overlapWarnings: string[];
    /** پیامد خاموش بودن مود/مسیرها — خطا نیست ولی ادمین باید بداند */
    switchWarnings: string[];
}

/** مثل بک‌اند: مود روشن است و اگر مسیر دارد، دست‌کم یک مسیرش روشن است */
export function isModeRunnable(mode: ModelModeEditorValue): boolean {
    return mode.isActive && (mode.routes.length === 0 || mode.routes.some((route) => route.isActive));
}

function createEditorId(): string {
    return `mode-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function routeFromApi(value: ProviderModelRoute): ModelRouteEditorValue {
    return {
        editorId: createEditorId(),
        id: String(value.id || ''),
        providerId: String(value.providerId || ''),
        endpointPath: String(value.endpoint || ''),
        priority: Number(value.priority) || 0,
        isDefault: value.default === true,
        isActive: value.isActive !== false,
        conditions: routeConditionsFromApi(value.conditions),
        requestProfileOverrideText: formatRequestProfile(value.requestProfileOverride),
        imageCount: value.imageCount || {},
        videoCount: value.videoCount || {},
        audioCount: value.audioCount || {},
        totalCount: value.totalCount || {},
        imageFileSize: value.imageFileSize || {},
        videoFileSize: value.videoFileSize || {},
        audioFileSize: value.audioFileSize || {},
        totalFileSize: value.totalFileSize || {},
        imageTotalSize: value.imageTotalSize || {},
        videoTotalSize: value.videoTotalSize || {},
        audioTotalSize: value.audioTotalSize || {},
        videoDuration: value.videoDuration || {},
        audioDuration: value.audioDuration || {},
        supportedImageFormats: value.supportedFormats?.image?.join(', ') || '',
        supportedVideoFormats: value.supportedFormats?.video?.join(', ') || '',
        supportedAudioFormats: value.supportedFormats?.audio?.join(', ') || '',
    };
}

function emptyRoute(providerId = '', isDefault = false): ModelRouteEditorValue {
    return {
        editorId: createEditorId(),
        id: '',
        providerId,
        endpointPath: '',
        priority: 0,
        isDefault,
        isActive: true,
        conditions: [],
        requestProfileOverrideText: '',
        imageCount: {},
        videoCount: {},
        audioCount: {},
        totalCount: {},
        imageFileSize: {},
        videoFileSize: {},
        audioFileSize: {},
        totalFileSize: {},
        imageTotalSize: {},
        videoTotalSize: {},
        audioTotalSize: {},
        videoDuration: {},
        audioDuration: {},
        supportedImageFormats: '',
        supportedVideoFormats: '',
        supportedAudioFormats: '',
    };
}

function constraintIfSet<T extends object>(value: T): T | undefined {
    return Object.keys(value).length ? value : undefined;
}

function parseFormatList(text: string): string[] | undefined {
    const formats = text.split(',').map((f) => f.trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
    return formats.length ? formats : undefined;
}

function formatJson(value: unknown): string {
    if (value == null) return '';
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return '';
    }
}

export function modeFromApi(value: Partial<ProviderModelMode> & Record<string, unknown>): ModelModeEditorValue {
    return {
        editorId: createEditorId(),
        modeType: String(value.modeType || value.id || ''),
        endpointPath: String(value.endpointPath || value.endpoint || ''),
        isDefault: value.isDefault === true || value.default === true,
        isActive: value.isActive !== false,
        priority: Number(value.priority) || 0,
        requiredInputs: MODEL_INPUT_TYPES.filter((input) => value.requiredInputs?.includes(input)),
        optionalInputs: MODEL_INPUT_TYPES.filter((input) => value.optionalInputs?.includes(input)),
        settingsSchemaOverrideText: formatJson(value.settingsSchemaOverride),
        requestProfileOverrideText: formatRequestProfile(value.requestProfileOverride),
        pricingOverrideText: formatJson(value.pricingOverride ?? value.pricing),
        actualCost: value.actualCost,
        routes: Array.isArray(value.routes) ? value.routes.map(routeFromApi) : [],
    };
}

export function emptyMode(isDefault = false): ModelModeEditorValue {
    return {
        editorId: createEditorId(),
        modeType: '',
        endpointPath: '',
        isDefault,
        isActive: true,
        priority: 0,
        requiredInputs: [],
        optionalInputs: [],
        settingsSchemaOverrideText: '',
        requestProfileOverrideText: '',
        pricingOverrideText: '',
        routes: [],
    };
}

function parseOptionalJson(
    text: string,
    expected: 'array' | 'object',
    label: string,
): unknown[] | Record<string, unknown> | undefined {
    if (!text.trim()) return undefined;
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error(`${label} JSON معتبر نیست.`);
    }
    if (expected === 'array' && !Array.isArray(parsed)) {
        throw new Error(`${label} باید آرایه JSON باشد.`);
    }
    if (expected === 'object' && (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))) {
        throw new Error(`${label} باید object JSON باشد.`);
    }
    return parsed as unknown[] | Record<string, unknown>;
}

export function buildModesPayload(modes: ModelModeEditorValue[]): ProviderModelMode[] {
    const validation = validateModes(modes);
    if (validation.errors.length) throw new Error(validation.errors[0]);

    return modes.map((mode, index) => {
        const settingsSchemaOverride = parseOptionalJson(
            mode.settingsSchemaOverrideText,
            'array',
            `settingsSchemaOverride حالت ${index + 1}`,
        ) as unknown[] | undefined;
        const pricingOverride = parseOptionalJson(
            mode.pricingOverrideText,
            'object',
            `pricingOverride حالت ${index + 1}`,
        ) as Record<string, unknown> | undefined;
        const requestProfileOverride = parseRequestProfileText(
            mode.requestProfileOverrideText,
            `requestProfileOverride حالت ${index + 1}`,
        );

        return {
            id: mode.modeType.trim(),
            label: mode.modeType.trim(),
            endpoint: mode.endpointPath.trim(),
            default: mode.isDefault,
            isActive: mode.isActive,
            priority: Number(mode.priority) || 0,
            requiredInputs: mode.requiredInputs,
            optionalInputs: mode.optionalInputs,
            ...(mode.routes.length ? {
                routes: mode.routes.map((route, routeIndex) => {
                    const conditions = buildRouteConditionsPayload(route.conditions);
                    const routeRequestProfile = parseRequestProfileText(
                        route.requestProfileOverrideText,
                        `requestProfileOverride مسیر ${route.id || routeIndex + 1}`,
                    );
                    const supportedFormats: { image?: string[]; video?: string[]; audio?: string[] } = {};
                    const imageFormats = parseFormatList(route.supportedImageFormats);
                    const videoFormats = parseFormatList(route.supportedVideoFormats);
                    const audioFormats = parseFormatList(route.supportedAudioFormats);
                    if (imageFormats) supportedFormats.image = imageFormats;
                    if (videoFormats) supportedFormats.video = videoFormats;
                    if (audioFormats) supportedFormats.audio = audioFormats;
                    return {
                        id: route.id.trim(),
                        providerId: route.providerId,
                        endpoint: route.endpointPath.trim() || undefined,
                        priority: Number(route.priority) || 0,
                        default: route.isDefault,
                        isActive: route.isActive,
                        ...(conditions ? { conditions } : {}),
                        ...(routeRequestProfile ? { requestProfileOverride: routeRequestProfile } : {}),
                        ...(constraintIfSet(route.imageCount) ? { imageCount: route.imageCount } : {}),
                        ...(constraintIfSet(route.videoCount) ? { videoCount: route.videoCount } : {}),
                        ...(constraintIfSet(route.audioCount) ? { audioCount: route.audioCount } : {}),
                        ...(constraintIfSet(route.totalCount) ? { totalCount: route.totalCount } : {}),
                        ...(constraintIfSet(route.imageFileSize) ? { imageFileSize: route.imageFileSize } : {}),
                        ...(constraintIfSet(route.videoFileSize) ? { videoFileSize: route.videoFileSize } : {}),
                        ...(constraintIfSet(route.audioFileSize) ? { audioFileSize: route.audioFileSize } : {}),
                        ...(constraintIfSet(route.totalFileSize) ? { totalFileSize: route.totalFileSize } : {}),
                        ...(constraintIfSet(route.imageTotalSize) ? { imageTotalSize: route.imageTotalSize } : {}),
                        ...(constraintIfSet(route.videoTotalSize) ? { videoTotalSize: route.videoTotalSize } : {}),
                        ...(constraintIfSet(route.audioTotalSize) ? { audioTotalSize: route.audioTotalSize } : {}),
                        ...(constraintIfSet(route.videoDuration) ? { videoDuration: route.videoDuration } : {}),
                        ...(constraintIfSet(route.audioDuration) ? { audioDuration: route.audioDuration } : {}),
                        ...(Object.keys(supportedFormats).length ? { supportedFormats } : {}),
                    };
                }),
            } : {}),
            ...(settingsSchemaOverride ? { settingsSchemaOverride } : {}),
            ...(requestProfileOverride ? { requestProfileOverride } : {}),
            ...(pricingOverride ? { pricingOverride } : {}),
            ...(mode.actualCost ? {
                actualCost: buildActualCostPayload(mode.actualCost) as ActualCostConfig,
            } : {}),
        };
    });
}

function rulesCanOverlap(a: ModelModeEditorValue, b: ModelModeEditorValue): boolean {
    const requiredUnion = new Set([...a.requiredInputs, ...b.requiredInputs]);
    const allowedA = new Set([...a.requiredInputs, ...a.optionalInputs]);
    const allowedB = new Set([...b.requiredInputs, ...b.optionalInputs]);
    const inputRulesOverlap = [...requiredUnion]
        .every((input) => allowedA.has(input) && allowedB.has(input));
    if (!inputRulesOverlap) return false;
    const routesA = a.routes.filter((route) => route.isActive);
    const routesB = b.routes.filter((route) => route.isActive);
    if (routesA.length === 0 || routesB.length === 0) return true;
    return routesA.some((firstRoute) => routesB.some((secondRoute) =>
        countRangesOverlap(firstRoute.imageCount, secondRoute.imageCount)
        && countRangesOverlap(firstRoute.videoCount, secondRoute.videoCount)
        && countRangesOverlap(firstRoute.audioCount, secondRoute.audioCount)
        && countRangesOverlap(firstRoute.totalCount, secondRoute.totalCount),
    ));
}

function countRangesOverlap(a: RouteCountConstraint, b: RouteCountConstraint): boolean {
    const min = Math.max(a.min ?? 0, b.min ?? 0);
    const max = Math.min(a.max ?? Number.POSITIVE_INFINITY, b.max ?? Number.POSITIVE_INFINITY);
    return min <= max;
}

export function validateModes(modes: ModelModeEditorValue[]): ModeValidationResult {
    const errors: string[] = [];
    const overlapWarnings: string[] = [];
    const switchWarnings: string[] = [];
    if (modes.length === 0) return { errors, overlapWarnings, switchWarnings };

    const defaultCount = modes.filter((mode) => mode.isDefault).length;
    if (defaultCount !== 1) {
        errors.push('در بین modeها باید دقیقاً یک مورد به‌عنوان پیش‌فرض انتخاب شود.');
    }

    modes.forEach((mode, index) => {
        const label = mode.modeType.trim() || `ردیف ${index + 1}`;
        if (!mode.modeType.trim()) errors.push(`modeType برای ${label} الزامی است.`);
        if (!mode.endpointPath.trim() && mode.routes.length === 0) {
            errors.push(`endpointPath برای ${label} بدون route الزامی است.`);
        }
        const duplicateInputs = mode.requiredInputs.filter((input) => mode.optionalInputs.includes(input));
        if (duplicateInputs.length) {
            errors.push(`ورودی ${duplicateInputs.join('، ')} در ${label} نمی‌تواند هم required و هم optional باشد.`);
        }
        try {
            parseOptionalJson(mode.settingsSchemaOverrideText, 'array', `settingsSchemaOverride در ${label}`);
            parseRequestProfileText(
                mode.requestProfileOverrideText,
                `requestProfileOverride در ${label}`,
            );
            parseOptionalJson(mode.pricingOverrideText, 'object', `pricingOverride در ${label}`);
        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }
        const routeIds = new Set<string>();
        if (mode.routes.filter((route) => route.isDefault).length > 1) {
            errors.push(`در ${label} فقط یک route می‌تواند پیش‌فرض باشد.`);
        }
        mode.routes.forEach((route, routeIndex) => {
            const routeLabel = route.id.trim() || `route ${routeIndex + 1}`;
            if (!route.id.trim()) errors.push(`شناسه ${routeLabel} در ${label} الزامی است.`);
            if (routeIds.has(route.id.trim().toLowerCase())) {
                errors.push(`شناسه route «${route.id}» در ${label} تکراری است.`);
            }
            routeIds.add(route.id.trim().toLowerCase());
            if (!route.providerId) errors.push(`Provider برای ${routeLabel} در ${label} الزامی است.`);
            if (!route.endpointPath.trim() && !mode.endpointPath.trim()) {
                errors.push(`endpoint برای ${routeLabel} در ${label} الزامی است.`);
            }
            errors.push(...validateRouteConditions(route.conditions, `${routeLabel} (${label})`));
            try {
                parseRequestProfileText(route.requestProfileOverrideText, `requestProfileOverride مسیر ${routeLabel} (${label})`);
            } catch (error) {
                errors.push(error instanceof Error ? error.message : String(error));
            }
            (['imageCount', 'videoCount', 'audioCount', 'totalCount'] as const).forEach((key) => {
                const { min, max } = route[key];
                if (min != null && (!Number.isInteger(min) || min < 0)) {
                    errors.push(`حداقل ${key} در ${routeLabel} باید عدد صحیح نامنفی باشد.`);
                }
                if (max != null && (!Number.isInteger(max) || max < 0)) {
                    errors.push(`حداکثر ${key} در ${routeLabel} باید عدد صحیح نامنفی باشد.`);
                }
                if (min != null && max != null && min > max) {
                    errors.push(`حداقل ${key} در ${routeLabel} نمی‌تواند از حداکثر بیشتر باشد.`);
                }
            });

            const rangeKeys = [
                ['imageFileSize', 'حجم هر عکس'],
                ['videoFileSize', 'حجم هر ویدیو'],
                ['audioFileSize', 'حجم هر صوت'],
                ['totalFileSize', 'حجم کل فایل‌ها'],
                ['imageTotalSize', 'حجم مجموع عکس‌ها'],
                ['videoTotalSize', 'حجم مجموع ویدیوها'],
                ['audioTotalSize', 'حجم مجموع صوت‌ها'],
                ['videoDuration', 'مدت ویدیو'],
                ['audioDuration', 'مدت صوت'],
            ] as const;
            rangeKeys.forEach(([key, labelFa]) => {
                const { min, max } = route[key];
                if (min != null && (!Number.isFinite(min) || min < 0)) {
                    errors.push(`حداقل ${labelFa} در ${routeLabel} باید عدد نامنفی باشد.`);
                }
                if (max != null && (!Number.isFinite(max) || max < 0)) {
                    errors.push(`حداکثر ${labelFa} در ${routeLabel} باید عدد نامنفی باشد.`);
                }
                if (min != null && max != null && min > max) {
                    errors.push(`حداقل ${labelFa} در ${routeLabel} نمی‌تواند از حداکثر بیشتر باشد.`);
                }
            });
        });
    });

    const runnable = modes.filter(isModeRunnable);
    if (!runnable.length) {
        switchWarnings.push('همه‌ی مودها (یا همه‌ی مسیرهایشان) خاموش‌اند؛ این مدل در استودیو اجرا نمی‌شود و ارسال با خطا رد می‌شود.');
    }
    modes.forEach((mode, index) => {
        const label = mode.modeType.trim() || `ردیف ${index + 1}`;
        if (!mode.isActive) {
            if (mode.isDefault && runnable.length) {
                switchWarnings.push(`مود پیش‌فرض «${label}» خاموش است؛ وقتی هیچ مودی جور نشود، مود روشن با بیشترین اولویت اجرا می‌شود.`);
            }
            return;
        }
        if (mode.routes.length && !mode.routes.some((route) => route.isActive)) {
            switchWarnings.push(`همه‌ی مسیرهای «${label}» خاموش‌اند؛ این مود اجرا نمی‌شود (به provider اصلی مدل هم نمی‌رود).`);
        }
        mode.routes.forEach((route, routeIndex) => {
            if (!route.isActive && route.isDefault && mode.routes.some((item) => item.isActive)) {
                switchWarnings.push(`مسیر fallback «${route.id || routeIndex + 1}» در «${label}» خاموش است؛ اگر هیچ مسیر روشنی جور نشود، provider اصلی مدل استفاده می‌شود.`);
            }
        });
    });

    for (let first = 0; first < modes.length; first += 1) {
        for (let second = first + 1; second < modes.length; second += 1) {
            if (!modes[first].isActive || !modes[second].isActive) continue;
            if (!rulesCanOverlap(modes[first], modes[second])) continue;
            const firstLabel = modes[first].modeType || `ردیف ${first + 1}`;
            const secondLabel = modes[second].modeType || `ردیف ${second + 1}`;
            overlapWarnings.push(
                `قانون «${firstLabel}» و «${secondLabel}» می‌توانند برای یک ورودی هم‌زمان منطبق شوند؛ priority برنده را تعیین می‌کند.`,
            );
        }
    }

    // حالت «هیچ ورودی‌ای متصل نیست» فقط با mode پیش‌فرض قابل حل است
    if (modes.length > 0 && !modes.some((mode) => mode.isDefault)) {
        errors.push('هیچ mode پیش‌فرضی انتخاب نشده است؛ حالت بدون ورودی قابل حل نیست. یک mode را پیش‌فرض کنید.');
    }

    return { errors: Array.from(new Set(errors)), overlapWarnings, switchWarnings };
}

function matchesInputs(mode: ModelModeEditorValue, selectedInputs: ModelInputType[]): boolean {
    const selected = new Set(selectedInputs);
    const allowed = new Set([...mode.requiredInputs, ...mode.optionalInputs]);
    return mode.requiredInputs.every((input) => selected.has(input))
        && selectedInputs.every((input) => allowed.has(input));
}

interface RoutePreviewSettings {
    values: Record<string, string>;
    schema: NodeSettingFieldForm[];
}

function resolveMode(
    allModes: ModelModeEditorValue[],
    selectedInputs: ModelInputType[],
    counts: Record<'image' | 'video' | 'audio', number>,
    settings: RoutePreviewSettings,
) {
    // مودهای خاموش (یا با همه‌ی مسیرهای خاموش) مثل بک‌اند اصلاً در انتخاب شرکت نمی‌کنند
    const modes = allModes.filter(isModeRunnable);
    const matching = modes
        .filter((mode) =>
            matchesInputs(mode, selectedInputs)
            && modeHasMatchingRoute(mode, counts, settings))
        .sort((a, b) => b.priority - a.priority);
    // هماهنگ با resolver بک‌اند: تطبیق → mode پیش‌فرض → بالاترین priority
    // (وقتی هیچ mode پیش‌فرضی علامت نخورده باشد، مثل بک‌اند بالاترین priority برنده می‌شود)
    const winner = matching[0]
        || modes.find((mode) => mode.isDefault)
        || [...modes].sort((a, b) => b.priority - a.priority)[0]
        || null;
    return {
        matching,
        winner,
        usedDefault: matching.length === 0 && modes.some((mode) => mode.isDefault),
        usedHighestPriority: matching.length === 0 && !modes.some((mode) => mode.isDefault),
    };
}

/** وقتی هیچ mode‌ای با ورودی‌ها منطبق نمی‌شود، سقف قابل پذیرش کل مدل (بیشینه‌ی روت‌ها) */
function resolveModelLimits(modes: ModelModeEditorValue[]) {
    const routes = modes.filter(isModeRunnable).flatMap((mode) => mode.routes.filter((route) => route.isActive));
    if (!routes.length) return null;
    const maxOf = (pick: (route: ModelRouteEditorValue) => RouteCountConstraint) => routes
        .reduce<number | null>((acc, route) => {
            const max = pick(route).max;
            if (typeof max !== 'number') return acc;
            return acc == null ? max : Math.max(acc, max);
        }, null);
    return {
        imageMax: maxOf((route) => route.imageCount),
        videoMax: maxOf((route) => route.videoCount),
        audioMax: maxOf((route) => route.audioCount),
        totalMax: maxOf((route) => route.totalCount),
    };
}

/** سقف‌های صفر (ورودی‌های اصلاً پذیرفته نمی‌شوند) در پیام نمایش داده نمی‌شوند */
function formatModelLimits(limits: {
    imageMax: number | null;
    videoMax: number | null;
    audioMax: number | null;
    totalMax: number | null;
}) {
    const parts: string[] = [];
    if (limits.imageMax !== 0) parts.push(`عکس ${limits.imageMax ?? 'نامحدود'}`);
    if (limits.videoMax !== 0) parts.push(`ویدیو ${limits.videoMax ?? 'نامحدود'}`);
    if (limits.audioMax !== 0) parts.push(`صوت ${limits.audioMax ?? 'نامحدود'}`);
    if (limits.totalMax !== 0) parts.push(`مجموع ${limits.totalMax ?? 'نامحدود'}`);
    return parts.join(' · ');
}

function countMatches(value: number, constraint: RouteCountConstraint): boolean {
    return (constraint.min == null || value >= constraint.min)
        && (constraint.max == null || value <= constraint.max);
}

function routeMatchesCounts(
    route: ModelRouteEditorValue,
    counts: Record<'image' | 'video' | 'audio', number>,
): boolean {
    const totalCount = counts.image + counts.video + counts.audio;
    return countMatches(counts.image, route.imageCount)
        && countMatches(counts.video, route.videoCount)
        && countMatches(counts.audio, route.audioCount)
        && countMatches(totalCount, route.totalCount);
}

function routeMatchesRequest(
    route: ModelRouteEditorValue,
    counts: Record<'image' | 'video' | 'audio', number>,
    settings: RoutePreviewSettings,
): boolean {
    return routeMatchesCounts(route, counts)
        && routeConditionsMatch(route.conditions, settings.values, settings.schema);
}

function modeHasMatchingRoute(
    mode: ModelModeEditorValue,
    counts: Record<'image' | 'video' | 'audio', number>,
    settings: RoutePreviewSettings,
): boolean {
    const routes = mode.routes.filter((route) => route.isActive);
    return routes.length === 0
        || routes.some((route) => routeMatchesRequest(route, counts, settings));
}

/** هم‌سان با بک‌اند: اولویت ← مسیر دقیق‌تر (شرط بیشتر) ← ترتیب لیست؛ بعد fallback روشن */
function resolveRoute(
    mode: ModelModeEditorValue | null,
    counts: Record<'image' | 'video' | 'audio', number>,
    settings: RoutePreviewSettings,
) {
    const routes = (mode?.routes || []).filter((route) => route.isActive);
    if (!routes.length) return null;
    const conditionCount = (route: ModelRouteEditorValue) => route.conditions.filter((item) => item.key.trim()).length;
    return routes
        .map((route, index) => ({ route, index }))
        .filter(({ route }) => routeMatchesRequest(route, counts, settings))
        .sort((a, b) => b.route.priority - a.route.priority
            || conditionCount(b.route) - conditionCount(a.route)
            || a.index - b.index)[0]?.route
        || routes
            .filter((route) => route.isDefault)
            .sort((a, b) => Number(routeConditionsMatch(b.conditions, settings.values, settings.schema))
                - Number(routeConditionsMatch(a.conditions, settings.values, settings.schema)))[0]
        || null;
}

type MediaKind = 'image' | 'video' | 'audio';
type RangeValue = { min?: number; max?: number };

const MEDIA_LIMIT_ROWS: Array<{
    kind: MediaKind;
    label: string;
    countKey: 'imageCount' | 'videoCount' | 'audioCount';
    fileSizeKey: 'imageFileSize' | 'videoFileSize' | 'audioFileSize';
    totalSizeKey: 'imageTotalSize' | 'videoTotalSize' | 'audioTotalSize';
    durationKey?: 'videoDuration' | 'audioDuration';
    formatsKey: 'supportedImageFormats' | 'supportedVideoFormats' | 'supportedAudioFormats';
    formatsPlaceholder: string;
}> = [
    { kind: 'image', label: 'عکس', countKey: 'imageCount', fileSizeKey: 'imageFileSize', totalSizeKey: 'imageTotalSize', formatsKey: 'supportedImageFormats', formatsPlaceholder: 'jpg, png, webp' },
    { kind: 'video', label: 'ویدیو', countKey: 'videoCount', fileSizeKey: 'videoFileSize', totalSizeKey: 'videoTotalSize', durationKey: 'videoDuration', formatsKey: 'supportedVideoFormats', formatsPlaceholder: 'mp4, mov' },
    { kind: 'audio', label: 'صوت', countKey: 'audioCount', fileSizeKey: 'audioFileSize', totalSizeKey: 'audioTotalSize', durationKey: 'audioDuration', formatsKey: 'supportedAudioFormats', formatsPlaceholder: 'mp3, wav' },
];

const MODE_TYPE_SUGGESTIONS = [
    'text-to-text', 'text-to-image', 'image-to-image', 'reference_to_image', 'text-to-video',
    'image-to-video', 'reference_to_video', 'video-to-video', 'text-to-audio', 'audio-to-text', 'inpainting',
];

const INPUT_LABELS_FA: Record<ModelInputType, string> = {
    prompt: 'متن (Prompt)',
    image: 'عکس',
    video: 'ویدیو',
    audio: 'صوت',
    mask: 'ماسک',
};

function hasRange(value: RangeValue) {
    return value.min != null || value.max != null;
}

function formatNumber(value: number) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatRange(value: RangeValue, suffix = '') {
    const { min, max } = value;
    if (max === 0) return 'ممنوع';
    if (min != null && max != null) return min === max ? `${formatNumber(min)}${suffix}` : `${formatNumber(min)}–${formatNumber(max)}${suffix}`;
    if (min != null) return `≥${formatNumber(min)}${suffix}`;
    if (max != null) return `≤${formatNumber(max)}${suffix}`;
    return '';
}

/** خلاصه‌ی یک‌خطی شرط‌های انتخاب مسیر — برای ردیف بسته‌ی جدول */
function summarizeRouteLimits(route: ModelRouteEditorValue): string {
    const parts: string[] = [];
    MEDIA_LIMIT_ROWS.forEach((row) => {
        const range = formatRange(route[row.countKey]);
        if (range) parts.push(`${row.label} ${range}`);
    });
    const total = formatRange(route.totalCount);
    if (total) parts.push(`مجموع ${total}`);
    const extra = MEDIA_LIMIT_ROWS.some((row) => hasRange(route[row.fileSizeKey]) || hasRange(route[row.totalSizeKey])
        || (row.durationKey && hasRange(route[row.durationKey])) || route[row.formatsKey].trim())
        || hasRange(route.totalFileSize);
    if (extra) parts.push('+ حجم/مدت/فرمت');
    return parts.join(' · ');
}

function inputState(mode: ModelModeEditorValue, input: ModelInputType): 'off' | 'optional' | 'required' {
    if (mode.requiredInputs.includes(input)) return 'required';
    if (mode.optionalInputs.includes(input)) return 'optional';
    return 'off';
}

function RangeInputs({
    value,
    onChange,
    step = 1,
    toDisplay = (v) => v,
    fromDisplay = (v) => v,
    label,
}: {
    value: RangeValue;
    onChange: (value: RangeValue) => void;
    step?: number;
    toDisplay?: (value: number) => number;
    fromDisplay?: (value: number) => number;
    label: string;
}) {
    const show = (v?: number) => (v == null ? '' : formatNumber(toDisplay(v)));
    const parse = (raw: string) => (raw === '' ? undefined : fromDisplay(Number(raw)));
    return (
        <span className={styles.range}>
            <input
                type="number"
                min={0}
                step={step}
                value={show(value.min)}
                placeholder="از"
                aria-label={`${label} — حداقل`}
                onChange={(event) => onChange({ ...value, min: parse(event.target.value) })}
            />
            <span>–</span>
            <input
                type="number"
                min={0}
                step={step}
                value={show(value.max)}
                placeholder="تا"
                aria-label={`${label} — حداکثر`}
                onChange={(event) => onChange({ ...value, max: parse(event.target.value) })}
            />
        </span>
    );
}

interface ModelModesEditorProps {
    value: ModelModeEditorValue[];
    onChange: (value: ModelModeEditorValue[]) => void;
    providers: ProviderOption[];
    parentProviderId: string;
    modelRequestProfileText: string;
    onModelRequestProfileChange: (value: string) => void;
    /** وقتی از خلاصه روی یک مود کلیک می‌شود، همان مود باز و اسکرول می‌شود */
    focusedModeEditorId?: string | null;
    /** برای تکرار کلیک روی همان مود */
    focusNonce?: number;
    /** تنظیمات مدل — کلید و گزینه‌های شرط تنظیمات مسیرها از همین‌جا می‌آید */
    settingsSchema?: NodeSettingFieldForm[];
}

type OverrideTab = 'settings' | 'request' | 'pricing';

export default function ModelModesEditor({
    value,
    onChange,
    providers,
    parentProviderId,
    modelRequestProfileText,
    onModelRequestProfileChange,
    focusedModeEditorId = null,
    focusNonce = 0,
    settingsSchema = [],
}: ModelModesEditorProps) {
    const [previewInputs, setPreviewInputs] = useState<ModelInputType[]>(['prompt']);
    const [previewCounts, setPreviewCounts] = useState({ image: 0, video: 0, audio: 0 });
    // مقدار فرضی تنظیماتی که در شرط مسیرها آمده‌اند (خالی = پیش‌فرض تنظیم)
    const [previewSettingValues, setPreviewSettingValues] = useState<Record<string, string>>({});
    // واحد نمایش حجم در جدول شرط‌های هر مسیر (ذخیره همیشه به بایت است)
    const [routeUnits, setRouteUnits] = useState<Record<string, SizeUnit>>({});
    const [openModeIds, setOpenModeIds] = useState<Record<string, boolean>>({});
    const [openRouteIds, setOpenRouteIds] = useState<Record<string, boolean>>({});
    const [allKindsRouteIds, setAllKindsRouteIds] = useState<Record<string, boolean>>({});
    const [advancedOpen, setAdvancedOpen] = useState<Record<string, OverrideTab | null>>({});
    const [profileOpen, setProfileOpen] = useState(false);
    const validation = useMemo(() => validateModes(value), [value]);
    const modelRequestProfileError = useMemo(() => {
        try {
            parseRequestProfileText(modelRequestProfileText, 'requestProfile مدل');
            return '';
        } catch (error) {
            return error instanceof Error ? error.message : String(error);
        }
    }, [modelRequestProfileText]);
    const previewSettings = useMemo<RoutePreviewSettings>(
        () => ({ values: previewSettingValues, schema: settingsSchema }),
        [previewSettingValues, settingsSchema],
    );
    /** تنظیماتی که دست‌کم یک مسیر روی آن شرط دارد — فقط همین‌ها در تست نشان داده می‌شوند */
    const conditionKeys = useMemo(
        () => Array.from(new Set(value.flatMap((mode) => mode.routes.flatMap((route) =>
            route.conditions.map((condition) => condition.key.trim()).filter(Boolean))))),
        [value],
    );
    const preview = useMemo(
        () => resolveMode(value, previewInputs, previewCounts, previewSettings),
        [value, previewInputs, previewCounts, previewSettings],
    );
    const previewRoute = useMemo(
        () => resolveRoute(preview.winner, previewCounts, previewSettings),
        [preview.winner, previewCounts, previewSettings],
    );
    const previewLimits = useMemo(
        () => resolveModelLimits(value),
        [value],
    );

    React.useEffect(() => {
        if (!focusedModeEditorId) return;
        setOpenModeIds((prev) => ({ ...prev, [focusedModeEditorId]: true }));
        requestAnimationFrame(() => {
            document.getElementById(`model-mode-${focusedModeEditorId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    }, [focusedModeEditorId, focusNonce]);

    const providerName = (providerId: string) => {
        const provider = providers.find((p) => p._id === providerId);
        return provider?.displayName || provider?.name || '';
    };

    const isModeOpen = (editorId: string, index: number) => {
        if (openModeIds[editorId] !== undefined) return openModeIds[editorId];
        if (focusedModeEditorId) return editorId === focusedModeEditorId;
        return index === 0 && value.length === 1;
    };

    const patchMode = (editorId: string, patch: Partial<ModelModeEditorValue>) => {
        onChange(value.map((mode) => mode.editorId === editorId ? { ...mode, ...patch } : mode));
    };

    const setDefault = (editorId: string) => {
        onChange(value.map((mode) => ({ ...mode, isDefault: mode.editorId === editorId })));
    };

    const patchRoute = (
        mode: ModelModeEditorValue,
        routeEditorId: string,
        patch: Partial<ModelRouteEditorValue>,
    ) => {
        patchMode(mode.editorId, {
            routes: mode.routes.map((route) =>
                route.editorId === routeEditorId ? { ...route, ...patch } : route),
        });
    };

    const setDefaultRoute = (mode: ModelModeEditorValue, routeEditorId: string, isDefault: boolean) => {
        patchMode(mode.editorId, {
            routes: mode.routes.map((route) => ({
                ...route,
                isDefault: isDefault && route.editorId === routeEditorId,
            })),
        });
    };

    const setInputState = (mode: ModelModeEditorValue, input: ModelInputType, state: 'off' | 'optional' | 'required') => {
        patchMode(mode.editorId, {
            requiredInputs: state === 'required'
                ? MODEL_INPUT_TYPES.filter((item) => item === input || mode.requiredInputs.includes(item))
                : mode.requiredInputs.filter((item) => item !== input),
            optionalInputs: state === 'optional'
                ? MODEL_INPUT_TYPES.filter((item) => item === input || mode.optionalInputs.includes(item))
                : mode.optionalInputs.filter((item) => item !== input),
        });
    };

    const addMode = () => {
        const mode = emptyMode(value.length === 0);
        onChange([...value, mode]);
        setOpenModeIds((prev) => ({ ...prev, [mode.editorId]: true }));
    };

    const addRoute = (mode: ModelModeEditorValue) => {
        const route = emptyRoute(parentProviderId, mode.routes.length === 0);
        patchMode(mode.editorId, { routes: [...mode.routes, route] });
        setOpenRouteIds((prev) => ({ ...prev, [route.editorId]: true }));
    };

    const togglePreviewInput = (input: ModelInputType) => {
        const willConnect = !previewInputs.includes(input);
        setPreviewInputs((current) => willConnect
            ? [...current, input]
            : current.filter((item) => item !== input));
        if (input === 'image' || input === 'video' || input === 'audio') {
            setPreviewCounts((current) => ({
                ...current,
                [input]: willConnect ? Math.max(1, current[input]) : 0,
            }));
        }
    };

    const renderRoute = (mode: ModelModeEditorValue, route: ModelRouteEditorValue, routeIndex: number) => {
        const open = Boolean(openRouteIds[route.editorId]);
        const unit = routeUnits[route.editorId] || 'MB';
        const sizeProps = {
            step: getStepForUnit(unit),
            toDisplay: (v: number) => bytesToUnit(v, unit) ?? v,
            fromDisplay: (v: number) => unitToBytes(v, unit) ?? v,
        };
        const accepted = new Set([...mode.requiredInputs, ...mode.optionalInputs]);
        const rowHasValues = (row: (typeof MEDIA_LIMIT_ROWS)[number]) => hasRange(route[row.countKey])
            || hasRange(route[row.fileSizeKey]) || hasRange(route[row.totalSizeKey])
            || Boolean(row.durationKey && hasRange(route[row.durationKey])) || Boolean(route[row.formatsKey].trim());
        const showAll = Boolean(allKindsRouteIds[route.editorId]);
        const visibleRows = MEDIA_LIMIT_ROWS.filter((row) => showAll || accepted.has(row.kind) || rowHasValues(row));
        const hiddenCount = MEDIA_LIMIT_ROWS.length - visibleRows.length;
        const provider = providerName(route.providerId);
        const conditionSummary = summarizeRouteConditions(route.conditions, settingsSchema);
        const limits = [conditionSummary, summarizeRouteLimits(route)].filter(Boolean).join(' · ');

        return (
            <div
                key={route.editorId}
                className={`${styles.route} ${open ? styles.routeOpen : ''} ${route.isActive ? '' : styles.routeOff}`}
            >
                <div
                    className={styles.routeRow}
                    onClick={() => setOpenRouteIds((prev) => ({ ...prev, [route.editorId]: !open }))}
                    aria-expanded={open}
                >
                    <span className={styles.routeIndex}>{routeIndex + 1}</span>
                    <span className={`${styles.cellLtr} ${route.id ? '' : styles.cellMuted}`}>{route.id || 'بدون شناسه'}</span>
                    <span className={`${styles.cellEllipsis} ${provider ? '' : styles.cellMuted}`}>
                        {provider || 'انتخاب نشده'}
                        {route.isDefault ? <> <span className={`${styles.tag} ${styles.tagBrand}`}>fallback</span></> : null}
                        {route.isActive ? null : <> <span className={`${styles.tag} ${styles.tagOff}`}>خاموش</span></>}
                    </span>
                    <span className={`${styles.cellLtr} ${styles.routeEndpoint} ${route.endpointPath ? '' : styles.cellMuted}`}>
                        {route.endpointPath || mode.endpointPath || '—'}
                    </span>
                    <span className={`${styles.cellEllipsis} ${styles.routeLimits} ${limits ? '' : styles.cellMuted}`}>
                        {limits || 'بدون شرط — همه‌ی درخواست‌ها'}
                    </span>
                    <span className={styles.routeActions}>
                        <ToggleSwitch
                            checked={route.isActive}
                            onChange={(checked) => patchRoute(mode, route.editorId, { isActive: checked })}
                            ariaLabel={`${route.isActive ? 'خاموش' : 'روشن'} کردن مسیر ${route.id || routeIndex + 1}`}
                            title={route.isActive ? 'روشن — برای کنار گذاشتن بدون حذف، خاموش کنید' : 'خاموش — انتخاب و قیمت‌گذاری نمی‌شود'}
                        />
                        <LuChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden />
                        <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="حذف مسیر"
                            aria-label={`حذف مسیر ${route.id || routeIndex + 1}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                patchMode(mode.editorId, {
                                    routes: mode.routes.filter((item) => item.editorId !== route.editorId),
                                });
                            }}
                        >
                            <LuTrash2 size={13} aria-hidden />
                        </button>
                    </span>
                </div>

                {open ? (
                    <div className={styles.routeBody}>
                        <div className={styles.routeGrid}>
                            <label className={styles.field}>
                                <span>شناسه مسیر *</span>
                                <input
                                    value={route.id}
                                    className={styles.ltr}
                                    placeholder="atlas-single"
                                    onChange={(event) => patchRoute(mode, route.editorId, { id: event.target.value })}
                                />
                            </label>
                            <label className={styles.field}>
                                <span>Provider *</span>
                                <select
                                    value={route.providerId}
                                    onChange={(event) => patchRoute(mode, route.editorId, { providerId: event.target.value })}
                                >
                                    <option value="">انتخاب Provider</option>
                                    {providers.map((item) => (
                                        <option key={item._id} value={item._id}>{item.displayName || item.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>endpoint</span>
                                <input
                                    value={route.endpointPath}
                                    className={styles.ltr}
                                    placeholder={mode.endpointPath || '/provider/model/endpoint'}
                                    onChange={(event) => patchRoute(mode, route.editorId, { endpointPath: event.target.value })}
                                />
                                <span className={styles.hint}>خالی = endpoint خود مود</span>
                            </label>
                            <label className={styles.field}>
                                <span>اولویت</span>
                                <input
                                    type="number"
                                    value={route.priority}
                                    onChange={(event) => patchRoute(mode, route.editorId, { priority: Number(event.target.value) || 0 })}
                                />
                            </label>
                        </div>
                        <div className={styles.switchRow}>
                            <ToggleSwitch
                                checked={route.isDefault}
                                onChange={(checked) => setDefaultRoute(mode, route.editorId, checked)}
                                label="مسیر fallback"
                                description="اگر هیچ مسیری با شرط‌ها جور نشد"
                            />
                            <ToggleSwitch
                                checked={route.isActive}
                                onChange={(checked) => patchRoute(mode, route.editorId, { isActive: checked })}
                                label="مسیر روشن"
                                description={route.isActive
                                    ? 'خاموش کنید تا بدون حذف کنار گذاشته شود'
                                    : 'خاموش: انتخاب، قیمت‌گذاری و در chat دیده نمی‌شود'}
                            />
                        </div>

                        <RouteConditionsEditor
                            conditions={route.conditions}
                            settingsSchema={settingsSchema}
                            onChange={(conditions) => patchRoute(mode, route.editorId, { conditions })}
                        />

                        <details className={styles.details} open={Boolean(route.requestProfileOverrideText.trim()) || undefined}>
                            <summary>
                                نحوه‌ی ارسال درخواست این مسیر (JSON)
                                <span className={styles.hint}>
                                    {route.requestProfileOverrideText.trim()
                                        ? ' — تنظیم شده'
                                        : ' — فقط وقتی provider این مسیر نام فیلدها را متفاوت می‌خواهد'}
                                </span>
                            </summary>
                            <label className={styles.field}>
                                <span>
                                    requestProfileOverride مسیر{' '}
                                    <span className={styles.hint}>— روی «نحوه‌ی ارسال درخواست» همین مود اعمال می‌شود و فقط برای همین مسیر</span>
                                </span>
                                <textarea
                                    value={route.requestProfileOverrideText}
                                    spellCheck={false}
                                    placeholder={'{\n  "settingPaths": { "image_size": "size" },\n  "bindings": [\n    { "source": "image", "payloadPath": "images", "selection": "all", "materialization": "preserve" }\n  ]\n}'}
                                    onChange={(event) => patchRoute(mode, route.editorId, { requestProfileOverrideText: event.target.value })}
                                />
                            </label>
                            <ul>
                                <li><code>settingPaths</code> — تنظیمی که این provider با نام دیگری می‌خواهد (مثلاً fal <code>image_size</code>، Atlas <code>size</code>).</li>
                                <li><code>bindings</code> — جای عکس/ویدیوی ورودی در درخواست؛ اگر بنویسید، جای bindings مود را برای همین مسیر می‌گیرد.</li>
                            </ul>
                        </details>

                        <div>
                            <div className={styles.limitsHead}>
                                <div>
                                    <span className={styles.sectionTitle}>شرط انتخاب این مسیر</span>
                                    <span className={styles.sectionHint}>
                                        خالی = بدون محدودیت. «تا ۰» یعنی این نوع ورودی در این مسیر پذیرفته نمی‌شود.
                                    </span>
                                </div>
                                <label className={styles.unitPicker}>
                                    واحد حجم
                                    <select
                                        value={unit}
                                        onChange={(event) => setRouteUnits((prev) => ({ ...prev, [route.editorId]: event.target.value as SizeUnit }))}
                                    >
                                        <option value="MB">MB</option>
                                        <option value="KB">KB</option>
                                        <option value="Bytes">Bytes</option>
                                    </select>
                                </label>
                            </div>
                            <div className={styles.limitsWrap}>
                                <table className={styles.limits}>
                                    <thead>
                                        <tr>
                                            <th>نوع</th>
                                            <th>تعداد</th>
                                            <th>حجم هر فایل ({unit})</th>
                                            <th>حجم مجموع ({unit})</th>
                                            <th>مدت هر فایل (ثانیه)</th>
                                            <th>فرمت‌های مجاز</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleRows.map((row) => (
                                            <tr key={row.kind}>
                                                <td>{row.label}</td>
                                                <td>
                                                    <RangeInputs
                                                        label={`تعداد ${row.label}`}
                                                        value={route[row.countKey]}
                                                        onChange={(next) => patchRoute(mode, route.editorId, { [row.countKey]: next })}
                                                    />
                                                </td>
                                                <td>
                                                    <RangeInputs
                                                        label={`حجم هر ${row.label}`}
                                                        value={route[row.fileSizeKey]}
                                                        onChange={(next) => patchRoute(mode, route.editorId, { [row.fileSizeKey]: next })}
                                                        {...sizeProps}
                                                    />
                                                </td>
                                                <td>
                                                    <RangeInputs
                                                        label={`حجم مجموع ${row.label}`}
                                                        value={route[row.totalSizeKey]}
                                                        onChange={(next) => patchRoute(mode, route.editorId, { [row.totalSizeKey]: next })}
                                                        {...sizeProps}
                                                    />
                                                </td>
                                                <td>
                                                    {row.durationKey ? (
                                                        <RangeInputs
                                                            label={`مدت ${row.label}`}
                                                            step={0.1}
                                                            value={route[row.durationKey]}
                                                            onChange={(next) => patchRoute(mode, route.editorId, { [row.durationKey as string]: next })}
                                                        />
                                                    ) : <div className={styles.na}>—</div>}
                                                </td>
                                                <td>
                                                    <input
                                                        className={styles.formatsInput}
                                                        value={route[row.formatsKey]}
                                                        placeholder={row.formatsPlaceholder}
                                                        aria-label={`فرمت‌های ${row.label}`}
                                                        onChange={(event) => patchRoute(mode, route.editorId, { [row.formatsKey]: event.target.value })}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className={styles.limitsTotal}>
                                            <td>همه‌ی فایل‌ها</td>
                                            <td>
                                                <RangeInputs
                                                    label="تعداد کل فایل‌ها"
                                                    value={route.totalCount}
                                                    onChange={(next) => patchRoute(mode, route.editorId, { totalCount: next })}
                                                />
                                            </td>
                                            <td><div className={styles.na}>—</div></td>
                                            <td>
                                                <RangeInputs
                                                    label="حجم کل فایل‌ها"
                                                    value={route.totalFileSize}
                                                    onChange={(next) => patchRoute(mode, route.editorId, { totalFileSize: next })}
                                                    {...sizeProps}
                                                />
                                            </td>
                                            <td><div className={styles.na}>—</div></td>
                                            <td><div className={styles.na}>—</div></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {hiddenCount > 0 ? (
                                <button
                                    type="button"
                                    className={styles.linkBtn}
                                    onClick={() => setAllKindsRouteIds((prev) => ({ ...prev, [route.editorId]: true }))}
                                >
                                    + نمایش {hiddenCount} نوع ورودی دیگر (این مود آن‌ها را نمی‌پذیرد)
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    };

    const renderAdvanced = (mode: ModelModeEditorValue) => {
        const tab = advancedOpen[mode.editorId] ?? null;
        const filled = {
            settings: Boolean(mode.settingsSchemaOverrideText.trim()),
            request: Boolean(mode.requestProfileOverrideText.trim()),
            pricing: Boolean(mode.pricingOverrideText.trim()),
        };
        const filledCount = Object.values(filled).filter(Boolean).length;
        const tabs: Array<{ id: OverrideTab; label: string }> = [
            { id: 'request', label: `نحوه‌ی ارسال درخواست${filled.request ? ' ●' : ''}` },
            { id: 'settings', label: `تنظیمات اختصاصی${filled.settings ? ' ●' : ''}` },
            { id: 'pricing', label: `قیمت اختصاصی${filled.pricing ? ' ●' : ''}` },
        ];
        return (
            <div className={styles.advanced}>
                <button
                    type="button"
                    className={styles.advancedToggle}
                    aria-expanded={tab != null}
                    onClick={() => setAdvancedOpen((prev) => ({ ...prev, [mode.editorId]: tab ? null : 'request' }))}
                >
                    <LuChevronDown size={14} className={`${styles.chevron} ${tab ? styles.chevronOpen : ''}`} aria-hidden />
                    تنظیمات پیشرفته‌ی این مود (JSON)
                    <span className={styles.hint}>
                        {filledCount ? `${filledCount} مورد تغییر داده شده` : 'اختیاری — معمولاً لازم نیست'}
                    </span>
                </button>
                {tab ? (
                    <div className={styles.advancedBody}>
                        <SimpleLineTabs
                            tabs={tabs}
                            activeTab={tab}
                            onChange={(next) => setAdvancedOpen((prev) => ({ ...prev, [mode.editorId]: next as OverrideTab }))}
                        />
                        {tab === 'request' ? (
                            <>
                                <label className={styles.field}>
                                    <span>requestProfileOverride <span className={styles.hint}>— فقط برای این مود جای requestProfile مدل را می‌گیرد</span></span>
                                    <textarea
                                        value={mode.requestProfileOverrideText}
                                        spellCheck={false}
                                        placeholder={'{\n  "envelope": "nested-input",\n  "inputKey": "input",\n  "promptPath": "prompt",\n  "bindings": [\n    { "source": "image", "payloadPath": "reference_images", "selection": "all", "maxItems": 4, "materialization": "data-url" }\n  ]\n}'}
                                        onChange={(event) => patchMode(mode.editorId, { requestProfileOverrideText: event.target.value })}
                                    />
                                </label>
                                <details className={styles.details}>
                                    <summary>راهنما و مثال</summary>
                                    <ul>
                                        <li><code>envelope</code> — ساختار payload: flat | nested-input | custom</li>
                                        <li><code>promptPath</code> — جای prompt در payload</li>
                                        <li><code>bindings</code> — هر نوع ورودی‌ای که این مود می‌پذیرد باید binding داشته باشد؛ وگرنه اجرا با خطا متوقف می‌شود</li>
                                        <li><code>item</code> — وقتی provider آبجکت می‌خواهد، مثل <code>{'"item": { "valueKey": "url" }'}</code></li>
                                        <li><code>materialization</code> — public-url | data-url | buffer؛ <code>selection</code> — first | all | last</li>
                                    </ul>
                                    <pre className={styles.code}>{`{
  "adapter": "atlas-prediction",
  "envelope": "flat",
  "promptPath": "prompt",
  "bindings": [
    { "source": "image", "payloadPath": "image", "selection": "first", "materialization": "public-url" }
  ],
  "outputPaths": { "video": ["$.data.output.url"] }
}`}</pre>
                                </details>
                            </>
                        ) : null}
                        {tab === 'settings' ? (
                            <>
                                <label className={styles.field}>
                                    <span>settingsSchemaOverride <span className={styles.hint}>— آرایه‌ی تنظیماتی که فقط در این مود به کاربر نشان داده می‌شود</span></span>
                                    <textarea
                                        value={mode.settingsSchemaOverrideText}
                                        spellCheck={false}
                                        placeholder={'[\n  { "key": "quality", "type": "select", "options": ["standard", "hd"] }\n]'}
                                        onChange={(event) => patchMode(mode.editorId, { settingsSchemaOverrideText: event.target.value })}
                                    />
                                </label>
                                <details className={styles.details}>
                                    <summary>راهنما و مثال</summary>
                                    <ul>
                                        <li>هم‌شکل فیلدهای تب «تنظیمات مدل» است: <code>select</code>، <code>number</code>، <code>text</code>، <code>checkbox</code></li>
                                        <li>روی مودهای دیگر اثری ندارد.</li>
                                    </ul>
                                    <pre className={styles.code}>{`[
  { "key": "quality", "type": "select", "label": "Quality", "options": ["standard", "hd"], "default": "hd" },
  { "key": "steps", "type": "number", "min": 10, "max": 50, "default": 20 }
]`}</pre>
                                </details>
                            </>
                        ) : null}
                        {tab === 'pricing' ? (
                            <>
                                <label className={styles.field}>
                                    <span>pricingOverride <span className={styles.hint}>— قیمت این مود به‌جای قیمت‌گذاری مدل</span></span>
                                    <textarea
                                        value={mode.pricingOverrideText}
                                        spellCheck={false}
                                        placeholder={'{\n  "mode": "per_unit",\n  "unit": { "amount": 0.04, "per": "image" }\n}'}
                                        onChange={(event) => patchMode(mode.editorId, { pricingOverrideText: event.target.value })}
                                    />
                                </label>
                                <details className={styles.details}>
                                    <summary>راهنما و مثال</summary>
                                    <ul>
                                        <li><code>per_unit</code> — قیمت ثابت برای هر عکس/ویدیو/صوت</li>
                                        <li><code>per_token</code>، <code>per_second</code>، <code>per_pixel</code>، <code>formula</code></li>
                                    </ul>
                                    <pre className={styles.code}>{`{ "mode": "per_second", "unit": { "amount": 0.002, "per": "second" } }`}</pre>
                                </details>
                            </>
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    };

    const winnerProviderId = previewRoute?.providerId || parentProviderId;

    return (
        <>
            <div className={styles.steps}>
                <div className={styles.step}>
                    <span className={styles.stepNum}>۱</span>
                    <div>
                        <strong>مود = یک نوع کار</strong>
                        <span className={styles.stepText}>مثل متن→تصویر یا عکس→ویدیو. سیستم از روی ورودی‌هایی که کاربر وصل کرده مود را انتخاب می‌کند.</span>
                    </div>
                </div>
                <div className={styles.step}>
                    <span className={styles.stepNum}>۲</span>
                    <div>
                        <strong>مسیر اجرا = کجا ارسال شود</strong>
                        <span className={styles.stepText}>کدام provider و endpoint. با چند مسیر، بر اساس تعداد و حجم فایل‌ها یا تنظیمات کاربر (مثل 4k) یکی انتخاب می‌شود. مود یا مسیر را می‌شود بدون حذف خاموش کرد.</span>
                    </div>
                </div>
                <div className={styles.step}>
                    <span className={styles.stepNum}>۳</span>
                    <div>
                        <strong>تست کنید</strong>
                        <span className={styles.stepText}>پایین صفحه یک درخواست فرضی بسازید و ببینید کدام مود و مسیر انتخاب می‌شود.</span>
                    </div>
                </div>
            </div>

            <div className={styles.toolbar}>
                <h6 className={styles.toolbarTitle}>مودها {value.length ? `(${value.length})` : ''}</h6>
                <button type="button" className={styles.primaryBtn} onClick={addMode}>+ افزودن مود</button>
            </div>

            <datalist id="provider-model-mode-types">
                {MODE_TYPE_SUGGESTIONS.map((type) => <option key={type} value={type} />)}
            </datalist>

            {value.length === 0 ? (
                <div className={styles.empty}>
                    مودی تعریف نشده است؛ مدل با provider و endpoint اصلی خودش اجرا می‌شود.
                    <br />
                    فقط وقتی لازم است که مدل برای ورودی‌های مختلف (مثلاً با عکس / بدون عکس) endpoint جدا دارد.
                </div>
            ) : value.map((mode, index) => {
                const open = isModeOpen(mode.editorId, index);
                const inputs = MODEL_INPUT_TYPES
                    .filter((input) => inputState(mode, input) !== 'off')
                    .map((input) => `${INPUT_LABELS_FA[input]}${inputState(mode, input) === 'required' ? '*' : ''}`);
                return (
                    <div
                        key={mode.editorId}
                        id={`model-mode-${mode.editorId}`}
                        className={`${styles.mode} ${open ? styles.modeOpen : ''} ${mode.isActive ? '' : styles.modeOff}`}
                    >
                        <div
                            className={styles.modeHeader}
                            aria-expanded={open}
                            onClick={() => setOpenModeIds((prev) => ({ ...prev, [mode.editorId]: !open }))}
                        >
                            <LuChevronDown size={15} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden />
                            <div className={styles.modeTitle}>
                                <div className={styles.modeTitleLine}>
                                    {mode.modeType
                                        ? <span className={styles.modeName}>{mode.modeType}</span>
                                        : <span className={styles.modeNameEmpty}>مود {index + 1} — بدون نام</span>}
                                    {mode.isDefault ? <span className={`${styles.tag} ${styles.tagBrand}`}>پیش‌فرض</span> : null}
                                    {mode.isActive ? null : <span className={`${styles.tag} ${styles.tagOff}`}>خاموش</span>}
                                    {mode.isActive && mode.routes.length && !mode.routes.some((route) => route.isActive)
                                        ? <span className={`${styles.tag} ${styles.tagOff}`}>همه‌ی مسیرها خاموش</span>
                                        : null}
                                </div>
                                <div className={styles.modeMeta}>
                                    <span>ورودی: {inputs.length ? inputs.join(' + ') : 'بدون ورودی'}</span>
                                    <span>
                                        {mode.routes.length
                                            ? `${mode.routes.length} مسیر اجرا${mode.routes.some((route) => !route.isActive)
                                                ? ` (${mode.routes.filter((route) => route.isActive).length} روشن)`
                                                : ''}`
                                            : 'مسیر اصلی مدل'}
                                    </span>
                                    <span>اولویت {mode.priority}</span>
                                    {mode.endpointPath ? <span className={styles.metaLtr}>{mode.endpointPath}</span> : null}
                                </div>
                            </div>
                            <ToggleSwitch
                                checked={mode.isActive}
                                onChange={(checked) => patchMode(mode.editorId, { isActive: checked })}
                                ariaLabel={`${mode.isActive ? 'خاموش' : 'روشن'} کردن مود ${mode.modeType || index + 1}`}
                                title={mode.isActive
                                    ? 'روشن — برای کنار گذاشتن بدون حذف، خاموش کنید'
                                    : 'خاموش — نه اجرا می‌شود، نه در chat دیده می‌شود'}
                            />
                            <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                title="حذف مود"
                                aria-label={`حذف مود ${mode.modeType || index + 1}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onChange(value.filter((item) => item.editorId !== mode.editorId));
                                }}
                            >
                                <LuTrash2 size={14} aria-hidden />
                            </button>
                        </div>

                        {open ? (
                            <div className={styles.modeBody}>
                                <div className={styles.section}>
                                    <div className={styles.sectionHead}>
                                        <span className={styles.sectionTitle}><span className={styles.sectionNum}>۱</span> مشخصات مود</span>
                                    </div>
                                    <div className={styles.grid}>
                                        <label className={styles.field}>
                                            <span>نوع مود <span className={styles.fieldCode}>modeType</span> *</span>
                                            <input
                                                value={mode.modeType}
                                                list="provider-model-mode-types"
                                                className={styles.ltr}
                                                placeholder="text-to-image"
                                                onChange={(event) => patchMode(mode.editorId, { modeType: event.target.value })}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>endpoint {mode.routes.length ? '' : '*'}</span>
                                            <input
                                                value={mode.endpointPath}
                                                className={styles.ltr}
                                                placeholder="/v1/images/generations"
                                                onChange={(event) => patchMode(mode.editorId, { endpointPath: event.target.value })}
                                            />
                                            <span className={styles.hint}>
                                                {mode.routes.length ? 'مسیرهایی که endpoint ندارند از این استفاده می‌کنند.' : 'بدون مسیر اجرا، همین endpoint صدا زده می‌شود.'}
                                            </span>
                                        </label>
                                        <label className={styles.field}>
                                            <span>اولویت</span>
                                            <input
                                                value={mode.priority}
                                                type="number"
                                                onChange={(event) => patchMode(mode.editorId, { priority: Number(event.target.value) || 0 })}
                                            />
                                            <span className={styles.hint}>بزرگ‌تر = زودتر</span>
                                        </label>
                                    </div>
                                    <div className={styles.switchRow}>
                                        <ToggleSwitch
                                            checked={mode.isDefault}
                                            onChange={(checked) => { if (checked) setDefault(mode.editorId); }}
                                            label="مود پیش‌فرض"
                                            description={mode.isDefault ? 'وقتی هیچ مودی جور نشود اجرا می‌شود' : 'روشن کنید تا جای پیش‌فرض فعلی را بگیرد'}
                                            title={mode.isDefault ? 'همیشه یک مود باید پیش‌فرض باشد؛ برای تغییر، مود دیگری را پیش‌فرض کنید' : undefined}
                                        />
                                    </div>
                                </div>

                                <div className={styles.section}>
                                    <div className={styles.sectionHead}>
                                        <div>
                                            <span className={styles.sectionTitle}><span className={styles.sectionNum}>۲</span> ورودی‌هایی که این مود می‌پذیرد</span>
                                            <span className={styles.sectionHint}>
                                                «الزامی» = بدون آن این مود انتخاب نمی‌شود. «اختیاری» = اگر وصل باشد اشکالی ندارد. ورودی خاموش وصل باشد، مود رد می‌شود.
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.inputs}>
                                        {MODEL_INPUT_TYPES.map((input) => {
                                            const state = inputState(mode, input);
                                            return (
                                                <div className={styles.inputCell} key={input}>
                                                    <span className={styles.inputName}>{INPUT_LABELS_FA[input]}</span>
                                                    <div className={styles.segmented} role="radiogroup" aria-label={INPUT_LABELS_FA[input]}>
                                                        {([
                                                            ['off', 'خاموش'],
                                                            ['optional', 'اختیاری'],
                                                            ['required', 'الزامی'],
                                                        ] as const).map(([option, label]) => (
                                                            <button
                                                                key={option}
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={state === option}
                                                                className={state === option ? (option === 'required' ? styles.segRequired : styles.segOn) : ''}
                                                                onClick={() => setInputState(mode, input, option)}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className={styles.section}>
                                    <div className={styles.sectionHead}>
                                        <div>
                                            <span className={styles.sectionTitle}><span className={styles.sectionNum}>۳</span> مسیرهای اجرا</span>
                                            <span className={styles.sectionHint}>
                                                از بین مسیرهای روشنی که شرطشان (فایل‌های ورودی + تنظیمات کاربر) جور است، بیشترین اولویت اجرا می‌شود؛
                                                با اولویت برابر، مسیری که شرط تنظیمات بیشتری دارد برنده است (مثلاً «4k → fal» از مسیر بی‌شرط Atlas).
                                                اگر هیچ‌کدام جور نشد، مسیر fallback. قیمت هر مسیر از جدول قیمت provider همان مسیر در تب «قیمت‌گذاری» خوانده می‌شود.
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.routes}>
                                        {mode.routes.length ? (
                                            <div className={`${styles.routeRow} ${styles.routeHead}`}>
                                                <span className={styles.routeIndex}>#</span>
                                                <span>شناسه</span>
                                                <span>Provider</span>
                                                <span className={styles.routeEndpoint}>endpoint</span>
                                                <span className={styles.routeLimits}>شرط انتخاب</span>
                                                <span />
                                            </div>
                                        ) : (
                                            <div className={styles.empty}>
                                                مسیری تعریف نشده؛ provider اصلی مدل و endpoint همین مود استفاده می‌شود.
                                            </div>
                                        )}
                                        {mode.routes.map((route, routeIndex) => renderRoute(mode, route, routeIndex))}
                                        <button
                                            type="button"
                                            className={`${styles.routeAdd} ${mode.routes.length ? '' : styles.routeAddOnly}`}
                                            onClick={() => addRoute(mode)}
                                        >
                                            + افزودن مسیر اجرا
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.section}>
                                    {renderAdvanced(mode)}
                                </div>
                            </div>
                        ) : null}
                    </div>
                );
            })}

            {validation.errors.length ? (
                <div className={`${styles.issues} ${styles.issuesError}`}>
                    <strong>قبل از ذخیره این موارد را درست کنید</strong>
                    <ul>{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
                </div>
            ) : null}
            {validation.switchWarnings.length ? (
                <div className={`${styles.issues} ${styles.issuesWarn}`}>
                    <strong>پیامد مودها / مسیرهای خاموش</strong>
                    <ul>{validation.switchWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </div>
            ) : null}
            {validation.overlapWarnings.length ? (
                <div className={`${styles.issues} ${styles.issuesWarn}`}>
                    <strong>هم‌پوشانی (مشکلی نیست، فقط اولویت برنده را تعیین می‌کند)</strong>
                    <ul>{validation.overlapWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </div>
            ) : null}

            {value.length ? (
                <div className={styles.tester}>
                    <div className={styles.sectionHead}>
                        <div>
                            <span className={styles.sectionTitle}>تست انتخاب مود</span>
                            <span className={styles.sectionHint}>ورودی‌های یک درخواست فرضی را بچینید تا ببینید کدام مود، مسیر و provider اجرا می‌شود.</span>
                        </div>
                    </div>
                    <div className={styles.testerCounts}>
                        {(['image', 'video', 'audio'] as const).map((kind) => (
                            <label className={styles.field} key={kind}>
                                <span>تعداد {INPUT_LABELS_FA[kind]}</span>
                                <input
                                    type="number"
                                    min={0}
                                    className={styles.ltr}
                                    value={previewCounts[kind]}
                                    onChange={(event) => {
                                        const count = Math.max(0, Math.floor(Number(event.target.value) || 0));
                                        setPreviewCounts((current) => ({ ...current, [kind]: count }));
                                        setPreviewInputs((current) => count > 0
                                            ? Array.from(new Set([...current, kind]))
                                            : current.filter((item) => item !== kind));
                                    }}
                                />
                            </label>
                        ))}
                    </div>
                    {conditionKeys.length ? (
                        <div className={styles.testerCounts}>
                            {conditionKeys.map((key) => {
                                const field = settingsSchema.find((item) => item.key === key);
                                const options = (field?.optionsRows || []).filter((option) => String(option.value ?? '').trim());
                                const fallback = field ? (field.defaultText.trim() || (['number', 'slider'].includes(field.type) ? field.min : '')) : '';
                                return (
                                    <label className={styles.field} key={key}>
                                        <span>{field?.labelFa || field?.label || key}</span>
                                        {options.length ? (
                                            <select
                                                value={previewSettingValues[key] ?? ''}
                                                onChange={(event) => setPreviewSettingValues((current) => ({ ...current, [key]: event.target.value }))}
                                            >
                                                <option value="">پیش‌فرض{fallback ? ` (${fallback})` : ''}</option>
                                                {options.map((option) => (
                                                    <option key={option.value} value={String(option.value)}>{option.label || option.value}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                className={styles.ltr}
                                                value={previewSettingValues[key] ?? ''}
                                                placeholder={fallback ? `پیش‌فرض: ${fallback}` : 'خالی'}
                                                onChange={(event) => setPreviewSettingValues((current) => ({ ...current, [key]: event.target.value }))}
                                            />
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    ) : null}
                    <div className={styles.testerSwitches}>
                        {(['prompt', 'mask'] as const).map((input) => (
                            <ToggleSwitch
                                key={input}
                                checked={previewInputs.includes(input)}
                                onChange={() => togglePreviewInput(input)}
                                label={`${INPUT_LABELS_FA[input]} وصل باشد`}
                            />
                        ))}
                    </div>
                    <div className={styles.result}>
                        {preview.winner ? (
                            <>
                                <div className={styles.resultPath}>
                                    <span>مود <b className={styles.metaLtr}>{preview.winner.modeType || 'بدون نام'}</b></span>
                                    <span className={styles.resultArrow}>←</span>
                                    <span>مسیر <b className={styles.metaLtr}>{previewRoute?.id || 'اصلی'}</b></span>
                                    <span className={styles.resultArrow}>←</span>
                                    <span>Provider <b>{providerName(winnerProviderId) || 'نامشخص'}</b></span>
                                    <span className={styles.resultArrow}>←</span>
                                    <b className={styles.metaLtr}>{previewRoute?.endpointPath || preview.winner.endpointPath || 'بدون endpoint'}</b>
                                </div>
                                {preview.matching.length > 1 ? (
                                    <div className={styles.resultNote}>{preview.matching.length} مود جور بود؛ اولویت {preview.winner.priority} برنده شد.</div>
                                ) : null}
                                {preview.usedDefault ? <div className={styles.resultNote}>هیچ مودی جور نبود؛ مود پیش‌فرض اجرا می‌شود.</div> : null}
                                {preview.usedHighestPriority ? <div className={styles.resultNote}>مود پیش‌فرض ندارید؛ بالاترین اولویت انتخاب شد.</div> : null}
                                {preview.matching.length === 0 && previewLimits ? (
                                    <div className={styles.resultError}>
                                        هیچ مودی این ترکیب ورودی را نمی‌پذیرد
                                        {formatModelLimits(previewLimits) ? ` — حداکثر قابل پذیرش مدل: ${formatModelLimits(previewLimits)}` : ''}
                                    </div>
                                ) : null}
                            </>
                        ) : 'هیچ مود جور یا پیش‌فرضی وجود ندارد.'}
                    </div>
                </div>
            ) : null}

            <div className={`${styles.advanced} ${styles.tester}`}>
                <button
                    type="button"
                    className={styles.advancedToggle}
                    aria-expanded={profileOpen}
                    onClick={() => setProfileOpen((open) => !open)}
                >
                    <LuChevronDown size={14} className={`${styles.chevron} ${profileOpen ? styles.chevronOpen : ''}`} aria-hidden />
                    requestProfile پیش‌فرض مدل (پیشرفته)
                    <span className={styles.hint}>
                        {modelRequestProfileText.trim() ? 'تنظیم شده' : 'خالی — رفتار legacy مدل'}
                    </span>
                </button>
                {profileOpen ? (
                    <div className={styles.advancedBody}>
                        <label className={styles.field}>
                            <textarea
                                value={modelRequestProfileText}
                                spellCheck={false}
                                placeholder={'{\n  "adapter": "atlas-prediction",\n  "submitPath": { "strategy": "fixed", "path": "/model/generateVideo" },\n  "envelope": "flat",\n  "promptPath": "prompt",\n  "bindings": [\n    { "source": "image", "payloadPath": "image", "selection": "first", "materialization": "public-url" }\n  ],\n  "outputPaths": { "video": ["$.data.output.url"] }\n}'}
                                onChange={(event) => onModelRequestProfileChange(event.target.value)}
                            />
                            <span className={styles.hint}>
                                برای همه‌ی مودهایی که override ندارند. برای Atlas Cloud همیشه baseUrl باید <code>https://api.atlascloud.ai/api/v1</code> باشد
                                و submitPath روی <code>/model/generateVideo</code> fixed بماند؛ شناسه مدل فقط داخل body می‌رود.
                            </span>
                        </label>
                        {modelRequestProfileError ? (
                            <div className={`${styles.issues} ${styles.issuesError}`}>{modelRequestProfileError}</div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </>
    );
}
