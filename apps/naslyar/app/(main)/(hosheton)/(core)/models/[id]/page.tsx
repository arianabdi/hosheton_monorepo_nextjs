'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { MdOutlineClose } from 'react-icons/md';
import { LuInfo } from 'react-icons/lu';

import styles from '../../ProviderForm.module.scss';
import pageStyles from './ModelEditPage.module.scss';
import { Field } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import type { ModelPricing } from './modelPricing.types';
import ModelSettingsSync from './ModelSettingsSync';
import ModelConfigPresetPanel from './ModelConfigPresetPanel';
import FormulaExpressionInput from './FormulaExpressionInput';
import {
    formulaNodeToTokens,
    formulaTokensToNode,
    serializeFormulaExpression,
    type FormulaEditorToken,
    type FormulaLookupDefinition,
    type TokenFormulaNode,
} from './formulaExpression';
import ActualCostEditor, {
    actualCostFromApi,
    validateActualCost,
} from './ActualCostEditor';
import ModelCapabilityModes from './ModelCapabilityModes';
import ModelModesEditor, {
    buildActualCostPayload,
    buildModesPayload,
    modeFromApi,
    type ActualCostConfig,
    type ModelModeEditorValue,
    type ProviderModelMode,
} from './ModelModesEditor';
import ProviderPricingTables, {
    createPricingTableId,
    DEFAULT_PRICING_KEY,
    pricingTableLabel,
    validateProviderPricingTables,
    type ProviderPricingTableMeta,
} from './ProviderPricingTables';
import FormulaMarkdownNotes from './FormulaMarkdownNotes';
import FormulaTutorialPanel, {
    type FormulaTutorialItem,
    type FormulaTutorialRef,
} from './FormulaTutorialPanel';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import ModelEditSummaryPanel from './ModelEditSummaryPanel';
import ModelEditSummaryMobile from './ModelEditSummaryMobile';
import ModelEditTabCard from './ModelEditTabCard';
import ModelFileInputsEditor from './ModelFileInputsEditor';
import { buildFileInputsPayload, emptyFileInputs, fileInputsFromApi, type ModelFileInputsForm } from './fileInputs';
import ModelChecklistSection from './ModelChecklistSection';
import PlatformIconPickerModal from '../../ai-settings/PlatformIconPickerModal';
import PlatformIconField from '../../ai-settings/PlatformIconField';
import { PlatformIconItem, usePlatformIcons } from '../../ai-settings/usePlatformIcons';
import platformIconStyles from '../../ai-settings/PlatformIcons.module.scss';
import {
    formatRequestProfile,
    parseRequestProfileText,
    type ProviderRequestProfile,
} from './requestProfile';
import SettingFieldEditor from './SettingFieldEditor';
import { remapIndexAfterMove, useSortableList } from './useSortableList';
import settingStyles from './SettingFieldEditor.module.scss';
import {
    buildSettingFieldPayload,
    emptySettingField,
    parseOptionsText,
    settingFieldFromApi,
    settingIsSent,
    type NodeSettingFieldForm,
    type NodeSettingFieldOption,
    type NodeSettingUrlSourcePayload,
} from './settingFieldForm';

interface MetadataItem {
    key: string;
    value: string;
}

interface ProviderOption {
    _id: string;
    name: string;
    displayName?: string;
}

type PricingMode =
    | 'token'
    | 'per_unit'
    | 'per_second'
    | 'per_minute'
    | 'per_hour'
    | 'per_1k_chars'
    | 'matrix';

type UnitPer =
    | 'second'
    | 'minute'
    | 'hour'
    | 'image'
    | 'video'
    | '1k_chars'
    | 'generation'
    | 'character'
    | '1m_tokens';

type MatrixPer =
    | 'second'
    | 'video'
    | 'image'
    | 'minute'
    | 'hour'
    | '1k_chars'
    | 'generation'
    | '1m_tokens';

interface CacheTier {
    id: string;
    label: string;
    ratePer1M: number;
}

interface MatrixAxis {
    key: string;
    label: string;
    valuesText: string;
    source: 'manual' | 'setting' | 'runtime';
    settingKey: string;
    runtimeKey: string;
    valueType: 'string' | 'number' | 'boolean';
}

interface MatrixRow {
    dimsText: string;
    price: number;
    per: MatrixPer;
}

type TokenEstimatorMode = 'none' | 'matrix' | 'video_pixels' | 'formula';

interface RuntimeMetricOption {
    key: string;
    label: string;
    valueType: 'number' | 'boolean';
    category: 'input' | 'output';
}

interface TokenEstimatorSegment {
    source: 'setting' | 'context';
    key: string;
    label: string;
    valuesText: string;
}

interface TokenEstimatorMatrixRow {
    dimsText: string;
    outputTokens: number;
}

interface TokenEstimatorResolution {
    value: string;
    width: number;
    height: number;
}

interface ModelPricingForm {
    mode: PricingMode;
    inputPer1M: number;
    outputPer1M: number;
    cacheTiers: CacheTier[];
    unitAmount: number;
    unitPer: UnitPer;
    axes: MatrixAxis[];
    rows: MatrixRow[];
    tokenEstimatorMode: TokenEstimatorMode;
    tokenSegments: TokenEstimatorSegment[];
    tokenRows: TokenEstimatorMatrixRow[];
    tokenMultiplyByQuantity: boolean;
    tokenFps: number;
    tokenDivisor: number;
    tokenIncludeInputVideoDuration: boolean;
    tokenResolutions: TokenEstimatorResolution[];
    tokenFormulaExpression: TokenFormulaNode;
    tokenFormulaTokens: FormulaEditorToken[];
    tokenFormulaText: string;
    tokenFormulaEditorError: string;
    tokenFormulaLookups: FormulaLookupDefinition[];
    tokenFormulaResultType: 'output_tokens' | 'vendor_cost_usd';
    tokenFormulaPresetKey: 'seedance' | 'veo' | 'omni' | 'heygen' | 'kling' | 'openai' | 'gpt-image' | '';
    tokenFormulaRounding: 'round' | 'ceil' | 'floor' | 'none';
    tokenFormulaMultiplyByQuantity: boolean;
    tokenFormulaNotes: string;
    /** ارجاع به آموزش مشترک (کتابخانه provider-model-formula-tutorials) — بدون کپی محتوا */
    tokenFormulaNotesRef: FormulaTutorialRef | null;
}

interface ModelForm {
    name: string;
    displayName: string;
    /** توضیح کوتاه زیر نام مدل در لیست انتخاب مدل استودیو */
    description: string;
    iconSvg: string;
    /** شناسه آیکون عمومی که iconSvg از آن انتخاب شده؛ '' = SVG دستی */
    platformIconId: string;
    providerId: string;
    section: string;
    class: string;
    isActive: boolean;
    input: number;
    output: number;
    cachedInput: number;
    /** مارکاپ اختصاصی این مدل (درصد سود). '' = خالی → استفاده از مارکاپ سراسری billing */
    markupPercent: number | '';
    pricing: ModelPricingForm;
}

/** جدول قیمت این مدل روی یک ارائه‌دهنده‌ی مشخص — با همان فرم قیمت پیش‌فرض ویرایش می‌شود */
interface ProviderPricingTableForm extends ProviderPricingTableMeta {
    pricing: ModelPricingForm;
}

interface ProviderModelPayload {
    name: string;
    displayName: string;
    description?: string;
    iconSvg?: string;
    platformIconId?: string;
    providerId: string;
    section: string;
    class: string;
    isActive: boolean;
    pricing: Record<string, unknown>;
    providerPricing: Array<{ providerId: string; modeIds?: string[]; pricing: Record<string, unknown> }>;
    metadata: MetadataItem[];
    settingsSchema: unknown[];
    modes: ProviderModelMode[];
    requestProfile?: ProviderRequestProfile | null;
    actualCost: ActualCostConfig | null;
    /** فایل‌های ورودی مدل متنی (فقط class=text فرستاده می‌شود) */
    fileInputs?: ReturnType<typeof buildFileInputsPayload>;
    input?: number;
    output?: number;
    cachedInput?: number;
    markupPercent?: number | null;
}

const SECTION_OPTIONS = [
    { label: 'Batch', value: 'batch' },
    { label: 'Standard', value: 'standard' },
    { label: 'Flex', value: 'flex' },
    { label: 'Priority', value: 'priority' },
];

const CLASS_OPTIONS = [
    { label: 'Text', value: 'text' },
    { label: 'Image', value: 'image' },
    { label: 'Audio', value: 'audio' },
    { label: 'Video', value: 'video' },
    { label: '3D', value: '3d' },
    { label: 'Fine-tuning', value: 'fine-tuning' },
    { label: 'Embeddings', value: 'embeddings' },
    { label: 'Moderation', value: 'moderation' },
];

const PRICING_MODE_OPTIONS: { label: string; value: PricingMode }[] = [
    { label: 'Token (متن)', value: 'token' },
    { label: 'Per unit (تخت)', value: 'per_unit' },
    { label: 'Per second', value: 'per_second' },
    { label: 'Per minute', value: 'per_minute' },
    { label: 'Per hour', value: 'per_hour' },
    { label: 'Per 1K chars', value: 'per_1k_chars' },
    { label: 'Matrix (جدول چندبعدی)', value: 'matrix' },
];

const UNIT_PER_OPTIONS: { label: string; value: UnitPer }[] = [
    { label: 'generation', value: 'generation' },
    { label: 'image', value: 'image' },
    { label: 'video', value: 'video' },
    { label: 'second', value: 'second' },
    { label: 'minute', value: 'minute' },
    { label: 'hour', value: 'hour' },
    { label: '1k_chars', value: '1k_chars' },
    { label: 'character', value: 'character' },
    { label: '1M tokens', value: '1m_tokens' },
];

const MATRIX_PER_OPTIONS: { label: string; value: MatrixPer }[] = [
    { label: 'second', value: 'second' },
    { label: 'video', value: 'video' },
    { label: 'image', value: 'image' },
    { label: 'minute', value: 'minute' },
    { label: 'hour', value: 'hour' },
    { label: '1k_chars', value: '1k_chars' },
    { label: 'generation', value: 'generation' },
    { label: '1M tokens', value: '1m_tokens' },
];

/**
 * معنی هر واحد محاسبه — دقیقاً همان ضربی که موتور هزینه API (unitMultiplier در
 * model-cost.engine) انجام می‌دهد؛ با تغییر آن‌جا این متن‌ها هم باید عوض شوند.
 */
const UNIT_PER_DESCRIPTIONS: Record<UnitPer, string> = {
    generation: 'به ازای هر ساخت: مبلغ = قیمت × تعداد خروجی‌هایی که همان اجرا می‌سازد، مستقل از نوع خروجی (عکس، ویدیو، مدل سه‌بعدی و…). اجرایی که یک خروجی دارد دقیقاً یک بار حساب می‌شود.',
    image: 'به ازای هر تصویر خروجی: مبلغ = قیمت × تعداد تصویرهای ساخته‌شده؛ ۴ تصویر در یک اجرا = ۴ برابر قیمت.',
    video: 'به ازای هر ویدیوی خروجی، مستقل از مدت آن: مبلغ = قیمت × تعداد ویدیوهای ساخته‌شده.',
    second: 'به ازای هر ثانیه از خروجی: مبلغ = قیمت × مدت خروجی به ثانیه (ویدیوی ۵ ثانیه با ۰٫۱$ ← ۰٫۵$). اگر خروجی مدت نداشته باشد (مثل عکس)، به ازای هر خروجی یک بار حساب می‌شود.',
    minute: 'به ازای هر دقیقه از خروجی: مبلغ = قیمت × (مدت به ثانیه ÷ ۶۰)؛ ۹۰ ثانیه = ۱٫۵ برابر قیمت. بدون مدت، به ازای هر خروجی یک بار.',
    hour: 'به ازای هر ساعت از خروجی: مبلغ = قیمت × (مدت به ثانیه ÷ ۳۶۰۰). بدون مدت، به ازای هر خروجی یک بار.',
    '1k_chars': 'به ازای هر ۱۰۰۰ کاراکتر متن (مثل تبدیل متن به گفتار): مبلغ = قیمت × (تعداد کاراکتر ÷ ۱۰۰۰)؛ ۲۵۰۰ کاراکتر = ۲٫۵ برابر. اگر تعداد کاراکتر معلوم نباشد، به ازای هر خروجی یک بار.',
    character: 'به ازای هر کاراکتر متن: مبلغ = قیمت × تعداد کاراکتر. اگر تعداد کاراکتر معلوم نباشد، به ازای هر خروجی یک بار.',
    '1m_tokens': 'به ازای هر یک میلیون توکن: مبلغ = قیمت × (توکن ورودی + خروجی) ÷ ۱٬۰۰۰٬۰۰۰. توکن‌ها از گزارش provider یا از «فرمول هزینه» با خروجی «تعداد توکن» می‌آیند؛ اگر هیچ‌کدام نباشد مبلغ صفر می‌شود.',
};

type FormulaResultType = ModelPricingForm['tokenFormulaResultType'];

const FORMULA_RESULT_OPTIONS: { value: FormulaResultType; label: string; hint: string }[] = [
    {
        value: 'vendor_cost_usd',
        label: 'هزینه به دلار (USD)',
        hint: 'نتیجه فرمول همان هزینه provider به دلار برای یک خروجی است (با تیک «ضرب در تعداد خروجی‌ها» × تعداد خروجی) و جای ضرب در واحدِ تب قیمت‌گذاری را می‌گیرد. قیمت منطبق جدول با @runtime.pricingRate در دسترس است؛ سود (markup) بعداً روی همین مبلغ اضافه می‌شود. مثال: @runtime.pricingRate + @runtime.inputImageCount * 0.003',
    },
    {
        value: 'output_tokens',
        label: 'تعداد توکن خروجی',
        hint: 'نتیجه فرمول تعداد توکن خروجی است و مبلغ = توکن × نرخ هر ۱ میلیون توکن در تب قیمت‌گذاری. فقط وقتی در مبلغ اثر دارد که حالت قیمت‌گذاری Token باشد یا واحد جدول «1M tokens».',
    },
];

/** همان قاعده formulaReferencesKey در موتور هزینه API */
function formulaUsesPricingRate(node: TokenFormulaNode | undefined): boolean {
    if (!node) return false;
    if (node.type === 'operation') return (node.operands || []).some(formulaUsesPricingRate);
    return node.key === 'pricingRate';
}

/**
 * نوع خروجی واقعی فرمول، مثل formulaResultType در API: @runtime.pricingRate قیمت دلاری
 * جدول است، پس فرمولی که آن را دارد همیشه هزینه دلاری است (نه تعداد توکن).
 */
function effectiveFormulaResultType(
    expression: TokenFormulaNode | undefined,
    stored: FormulaResultType,
): FormulaResultType {
    return formulaUsesPricingRate(expression) ? 'vendor_cost_usd' : stored;
}

/** عبارت فعلی فرمول — همان منبعی که هنگام ذخیره ارسال می‌شود */
function currentFormulaExpression(pricing: ModelPricingForm): TokenFormulaNode {
    return formulaTokensToNode(pricing.tokenFormulaTokens).expression || pricing.tokenFormulaExpression;
}

/** وضعیت «فرمول هزینه» از دید تب قیمت‌گذاری: آیا جدول/نرخ واحد مستقیم در مبلغ ضرب می‌شود؟ */
function formulaCostState(pricing: ModelPricingForm): 'none' | 'usd_rate' | 'usd_no_rate' | 'tokens' {
    if (pricing.tokenEstimatorMode === 'matrix' || pricing.tokenEstimatorMode === 'video_pixels') return 'tokens';
    if (pricing.tokenEstimatorMode !== 'formula') return 'none';
    const expression = currentFormulaExpression(pricing);
    if (effectiveFormulaResultType(expression, pricing.tokenFormulaResultType) === 'output_tokens') return 'tokens';
    return formulaUsesPricingRate(expression) ? 'usd_rate' : 'usd_no_rate';
}

/** توضیح واحد انتخاب‌شده + اثر «فرمول هزینه» بر آن — زیر هر انتخاب واحد */
function UnitPerHint({ per, pricing }: { per: UnitPer; pricing: ModelPricingForm }) {
    const state = formulaCostState(pricing);
    return (
        <>
            <span className={styles.hint}>{UNIT_PER_DESCRIPTIONS[per]}</span>
            {state === 'usd_rate' ? (
                <span className={styles.hint}>
                    «فرمول هزینه» فعال است: این قیمت با نام @runtime.pricingRate وارد فرمول می‌شود و مبلغ نهایی را
                    خود فرمول می‌سازد؛ ضرب در ثانیه/تعداد بالا اعمال نمی‌شود (ضرب در تعداد خروجی با تیک «ضرب در
                    تعداد خروجی‌ها» در تب فرمول است).
                </span>
            ) : state === 'usd_no_rate' ? (
                <span className={styles.hint}>
                    «فرمول هزینه» فعال است و از @runtime.pricingRate استفاده نمی‌کند؛ قیمت‌های این بخش در مبلغ نهایی
                    اثری ندارند.
                </span>
            ) : state === 'tokens' && per !== '1m_tokens' && pricing.mode !== 'token' ? (
                <span className={`${styles.hint} ${pageStyles.hintWarn}`}>
                    «فرمول هزینه» تعداد توکن می‌سازد ولی این واحد توکنی نیست؛ نتیجه فرمول در مبلغ اثری ندارد.
                    یا واحد را «1M tokens» کنید یا خروجی فرمول را «هزینه به دلار» بگذارید.
                </span>
            ) : null}
        </>
    );
}

function defaultModeForClass(modelClass: string): PricingMode {
    switch (modelClass) {
        case 'image':
        case '3d':
            return 'per_unit';
        case 'video':
            return 'matrix';
        case 'audio':
            return 'per_second';
        default:
            return 'token';
    }
}

function defaultUnitPerForMode(mode: PricingMode): UnitPer {
    switch (mode) {
        case 'per_second':
            return 'second';
        case 'per_minute':
            return 'minute';
        case 'per_hour':
            return 'hour';
        case 'per_1k_chars':
            return '1k_chars';
        default:
            return 'generation';
    }
}

function emptyPricing(mode: PricingMode = 'token'): ModelPricingForm {
    return {
        mode,
        inputPer1M: 0,
        outputPer1M: 0,
        cacheTiers: [{ id: 'cached_input', label: 'Cached Input', ratePer1M: 0 }],
        unitAmount: 0,
        unitPer: defaultUnitPerForMode(mode),
        axes: [
            { key: 'resolution', label: 'Resolution', valuesText: '480p,720p,1080p', source: 'manual', settingKey: '', runtimeKey: '', valueType: 'string' },
            { key: 'aspectRatio', label: 'Aspect Ratio', valuesText: '16:9,9:16', source: 'manual', settingKey: '', runtimeKey: '', valueType: 'string' },
        ],
        rows: [{ dimsText: 'resolution=720p,aspectRatio=16:9', price: 0, per: 'second' }],
        tokenEstimatorMode: 'none',
        tokenSegments: [],
        tokenRows: [],
        tokenMultiplyByQuantity: true,
        tokenFps: 24,
        tokenDivisor: 1024,
        tokenIncludeInputVideoDuration: true,
        tokenResolutions: [
            { value: '480p', width: 854, height: 480 },
            { value: '720p', width: 1280, height: 720 },
            { value: '1080p', width: 1920, height: 1080 },
            { value: '4k', width: 3840, height: 2160 },
        ],
        tokenFormulaExpression: {
            type: 'operation',
            operator: 'multiply',
            operands: [
                { type: 'value', source: 'runtime', key: 'outputDurationSeconds', fallback: 0 },
                { type: 'value', source: 'constant', value: 1 },
            ],
        },
        tokenFormulaTokens: [],
        tokenFormulaText: '@runtime.outputDurationSeconds * 1',
        tokenFormulaEditorError: '',
        tokenFormulaLookups: [],
        tokenFormulaResultType: 'output_tokens',
        tokenFormulaPresetKey: '',
        tokenFormulaRounding: 'round',
        tokenFormulaMultiplyByQuantity: true,
        tokenFormulaNotes: '',
        tokenFormulaNotesRef: null,
    };
}

function parseDimsText(text: string): Record<string, string> {
    const dims: Record<string, string> = {};
    String(text || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
            const eq = part.indexOf('=');
            if (eq <= 0) return;
            const key = part.slice(0, eq).trim();
            const value = part.slice(eq + 1).trim();
            if (key) dims[key] = value;
        });
    return dims;
}

function buildMatrixRowPayload(row: MatrixRow, axes: MatrixAxis[]) {
    const rawDims = parseDimsText(row.dimsText);
    const dims: Record<string, string> = {};
    const conditions: Record<string, Record<string, unknown>> = {};
    for (const [key, value] of Object.entries(rawDims)) {
        const axis = axes.find((item) => item.key === key);
        if (axis?.source === 'runtime' && axis.valueType === 'number') {
            const between = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)\s*$/);
            const comparison = value.match(/^\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/);
            if (between) {
                conditions[key] = { op: 'between', min: Number(between[1]), max: Number(between[2]) };
                continue;
            }
            if (comparison) {
                const opMap: Record<string, string> = { '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte' };
                conditions[key] = { op: opMap[comparison[1]], value: Number(comparison[2]) };
                continue;
            }
            const numeric = Number(value);
            if (Number.isFinite(numeric)) {
                conditions[key] = { op: 'eq', value: numeric };
                continue;
            }
        }
        if (axis?.source === 'runtime' && axis.valueType === 'boolean') {
            conditions[key] = { op: 'eq', value: value === 'true' };
            continue;
        }
        dims[key] = value;
    }
    return {
        dims,
        ...(Object.keys(conditions).length ? { conditions } : {}),
        price: Number(row.price) || 0,
        per: row.per,
    };
}

function matrixPreviewValueMatches(expected: string, actual: unknown, axis?: MatrixAxis): boolean {
    if (axis?.source === 'runtime' && axis.valueType === 'number') {
        const number = Number(actual);
        const between = expected.match(/^\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (between) return number >= Number(between[1]) && number <= Number(between[2]);
        const comparison = expected.match(/^\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (comparison) {
            const value = Number(comparison[2]);
            if (comparison[1] === '>') return number > value;
            if (comparison[1] === '>=') return number >= value;
            if (comparison[1] === '<') return number < value;
            return number <= value;
        }
    }
    return String(actual ?? '').toLowerCase() === expected.toLowerCase();
}

function formatDims(dims: Record<string, string> | undefined): string {
    if (!dims || typeof dims !== 'object') return '';
    return Object.entries(dims)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
}

function formatMatrixRowDims(row: any): string {
    const values: Record<string, string> = { ...(row?.dims || {}) };
    for (const [key, condition] of Object.entries(row?.conditions || {})) {
        const item = condition as any;
        values[key] = item.op === 'between'
            ? `${item.min}..${item.max}`
            : item.op === 'eq'
                ? String(item.value)
                : `${item.op === 'gte' ? '>=' : item.op === 'lte' ? '<=' : item.op === 'gt' ? '>' : '<'}${item.value}`;
    }
    return formatDims(values);
}

function pricingFromApi(data: any): ModelPricingForm {
    const pricing = data?.pricing;
    if (pricing?.mode) {
        const mode = pricing.mode as PricingMode;
        const form = emptyPricing(mode);
        // توضیحات فرمول باید در همه حالت‌های قیمت‌گذاری خوانده و حفظ شود —
        // در ریشه pricing (canonical) یا به‌صورت legacy داخل tokenEstimator
        if (typeof pricing.notesMarkdown === 'string') {
            form.tokenFormulaNotes = pricing.notesMarkdown;
        } else if (typeof pricing.tokenEstimator?.notesMarkdown === 'string') {
            form.tokenFormulaNotes = pricing.tokenEstimator.notesMarkdown;
        }
        if (pricing.notesRef?.tutorialId) {
            form.tokenFormulaNotesRef = {
                tutorialId: String(pricing.notesRef.tutorialId),
                name: String(pricing.notesRef.name || ''),
            };
        }
        form.inputPer1M = Number(pricing.rates?.inputPer1M ?? data.input ?? 0);
        form.outputPer1M = Number(pricing.rates?.outputPer1M ?? data.output ?? 0);
        form.cacheTiers =
            Array.isArray(pricing.rates?.cacheTiers) && pricing.rates.cacheTiers.length > 0
                ? pricing.rates.cacheTiers.map((t: any) => ({
                      id: String(t.id || 'cached_input'),
                      label: String(t.label || t.id || 'Cached'),
                      ratePer1M: Number(t.ratePer1M ?? 0),
                  }))
                : [
                      {
                          id: 'cached_input',
                          label: 'Cached Input',
                          ratePer1M: Number(data.cachedInput ?? 0),
                      },
                  ];
        form.unitAmount = Number(pricing.unit?.amount ?? 0);
        form.unitPer = (pricing.unit?.per as UnitPer) || defaultUnitPerForMode(mode);
        if (Array.isArray(pricing.matrix?.axes) && pricing.matrix.axes.length > 0) {
            form.axes = pricing.matrix.axes.map((a: any) => ({
                key: String(a.key || ''),
                label: String(a.label || a.key || ''),
                valuesText: Array.isArray(a.values) ? a.values.join(',') : String(a.values || ''),
                source: ['setting', 'runtime'].includes(a.source) ? a.source : 'manual',
                settingKey: String(a.settingKey || ''),
                runtimeKey: String(a.runtimeKey || ''),
                valueType: ['number', 'boolean'].includes(a.valueType) ? a.valueType : 'string',
            }));
        }
        if (Array.isArray(pricing.matrix?.rows) && pricing.matrix.rows.length > 0) {
            form.rows = pricing.matrix.rows.map((r: any) => ({
                dimsText: formatMatrixRowDims(r),
                price: Number(r.price ?? 0),
                per: (r.per as MatrixPer) || 'second',
            }));
        }
        const estimator = pricing.tokenEstimator;
        if (estimator?.mode === 'matrix') {
            form.tokenEstimatorMode = 'matrix';
            form.tokenMultiplyByQuantity = estimator.multiplyByQuantity !== false;
            form.tokenSegments = Array.isArray(estimator.segments)
                ? estimator.segments.map((segment: any) => ({
                    source: segment.source === 'context' ? 'context' : 'setting',
                    key: String(segment.key || ''),
                    label: String(segment.label || segment.key || ''),
                    valuesText: Array.isArray(segment.values) ? segment.values.join(',') : '',
                }))
                : [];
            form.tokenRows = Array.isArray(estimator.rows)
                ? estimator.rows.map((row: any) => ({
                    dimsText: formatDims(row.dims),
                    outputTokens: Number(row.outputTokens || 0),
                }))
                : [];
            if (form.tokenSegments.length === 0 && form.tokenRows.length > 0) {
                const rowDims = form.tokenRows.map((row) => parseDimsText(row.dimsText));
                const keys = Array.from(new Set(rowDims.flatMap((dims) => Object.keys(dims))));
                form.tokenSegments = keys.map((key) => ({
                    source: 'setting',
                    key,
                    label: key,
                    valuesText: Array.from(new Set(rowDims.map((dims) => dims[key]).filter(Boolean))).join(','),
                }));
            }
        } else if (estimator?.mode === 'video_pixels') {
            form.tokenEstimatorMode = 'video_pixels';
            form.tokenFps = Number(estimator.fps || 24);
            form.tokenDivisor = Number(estimator.divisor || 1024);
            form.tokenIncludeInputVideoDuration = estimator.includeInputVideoDuration !== false;
            form.tokenResolutions = Array.isArray(estimator.resolutions)
                ? estimator.resolutions.map((row: any) => ({
                    value: String(row.value || ''),
                    width: Number(row.width || 0),
                    height: Number(row.height || 0),
                }))
                : form.tokenResolutions;
        } else if (estimator?.mode === 'formula' && estimator.expression) {
            form.tokenEstimatorMode = 'formula';
            form.tokenFormulaExpression = estimator.expression as TokenFormulaNode;
            form.tokenFormulaTokens = formulaNodeToTokens(form.tokenFormulaExpression);
            form.tokenFormulaText = typeof estimator.expressionText === 'string' && estimator.expressionText.trim()
                ? estimator.expressionText
                : serializeFormulaExpression(form.tokenFormulaExpression).text;
            form.tokenFormulaLookups = Array.isArray(estimator.lookups)
                ? estimator.lookups
                    .map((lookup: any) => ({
                        id: String(lookup.id || '').trim(),
                        label: String(lookup.label || lookup.id || '').trim(),
                        source: lookup.source === 'runtime' ? 'runtime' as const : 'setting' as const,
                        key: String(lookup.key || '').trim(),
                        table: Object.fromEntries(
                            Object.entries(lookup.table && typeof lookup.table === 'object' ? lookup.table : {})
                                .map(([key, value]) => [key, Number(value)])
                                .filter(([, value]) => Number.isFinite(value)),
                        ),
                        fallback: Number(lookup.fallback || 0),
                    }))
                    .filter((lookup: FormulaLookupDefinition) => lookup.id && lookup.key)
                : [];
            form.tokenFormulaResultType = effectiveFormulaResultType(
                form.tokenFormulaExpression,
                estimator.resultType === 'vendor_cost_usd' ? 'vendor_cost_usd' : 'output_tokens',
            );
            form.tokenFormulaPresetKey = estimator.presetKey || '';
            form.tokenFormulaRounding = form.tokenFormulaResultType === 'vendor_cost_usd'
                ? 'none'
                : estimator.rounding || 'round';
            form.tokenFormulaMultiplyByQuantity = estimator.multiplyByQuantity !== false;
        }
        return form;
    }

    // Legacy fallback → token pricing
    const form = emptyPricing('token');
    form.inputPer1M = Number(data?.input ?? 0);
    form.outputPer1M = Number(data?.output ?? 0);
    form.cacheTiers = [
        {
            id: 'cached_input',
            label: 'Cached Input',
            ratePer1M: Number(data?.cachedInput ?? 0),
        },
    ];
    return form;
}

function buildPricingPayload(pricing: ModelPricingForm) {
    const payload: any = {
        currency: 'USD',
        mode: pricing.mode,
    };

    // توضیحات آموزش فرمول همیشه ذخیره شود — مستقل از حالت estimator.
    // (رفع باگ: قبلاً فقط وقتی tokenEstimatorMode === 'formula' بود ارسال می‌شد
    //  و در سایر حالت‌ها توضیحات نوشته‌شده بی‌صدا از دست می‌رفت.)
    const formulaNotes = typeof pricing.tokenFormulaNotes === 'string' ? pricing.tokenFormulaNotes : '';
    if (formulaNotes.trim()) payload.notesMarkdown = formulaNotes;
    if (pricing.tokenFormulaNotesRef) payload.notesRef = pricing.tokenFormulaNotesRef;

    if (pricing.mode === 'token') {
        payload.rates = {
            inputPer1M: Number(pricing.inputPer1M) || 0,
            outputPer1M: Number(pricing.outputPer1M) || 0,
            cacheTiers: pricing.cacheTiers
                .filter((t) => t.id.trim())
                .map((t) => ({
                    id: t.id.trim(),
                    label: t.label.trim() || t.id.trim(),
                    ratePer1M: Number(t.ratePer1M) || 0,
                })),
        };
    } else if (pricing.mode === 'matrix') {
        payload.matrix = {
            axes: pricing.axes
                .filter((a) => a.key.trim())
                .map((a) => ({
                    key: a.key.trim(),
                    label: a.label.trim() || a.key.trim(),
                    source: a.source,
                    ...(a.source === 'setting' ? { settingKey: a.settingKey.trim() || a.key.trim() } : {}),
                    ...(a.source === 'runtime' ? { runtimeKey: a.runtimeKey.trim() || a.key.trim() } : {}),
                    valueType: a.valueType,
                    values: a.valuesText
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean),
                })),
            rows: pricing.rows.map((row) => buildMatrixRowPayload(row, pricing.axes)),
        };
    } else {
        payload.unit = {
            amount: Number(pricing.unitAmount) || 0,
            per: pricing.unitPer || defaultUnitPerForMode(pricing.mode),
        };
    }

    if (pricing.tokenEstimatorMode === 'matrix') {
        payload.tokenEstimator = {
            mode: 'matrix',
            multiplyByQuantity: pricing.tokenMultiplyByQuantity,
            segments: pricing.tokenSegments
                .filter((segment) => segment.key.trim())
                .map((segment) => ({
                    source: segment.source,
                    key: segment.key.trim(),
                    label: segment.label.trim() || segment.key.trim(),
                    values: segment.valuesText.split(',').map((value) => value.trim()).filter(Boolean),
                })),
            rows: pricing.tokenRows
                .filter((row) => row.dimsText.trim() && Number(row.outputTokens) >= 0)
                .map((row) => ({
                    dims: parseDimsText(row.dimsText),
                    outputTokens: Number(row.outputTokens) || 0,
                })),
        };
    } else if (pricing.tokenEstimatorMode === 'video_pixels') {
        payload.tokenEstimator = {
            mode: 'video_pixels',
            fps: Number(pricing.tokenFps) || 24,
            divisor: Number(pricing.tokenDivisor) || 1024,
            includeInputVideoDuration: pricing.tokenIncludeInputVideoDuration,
            resolutions: pricing.tokenResolutions
                .filter((row) => row.value.trim() && row.width > 0 && row.height > 0)
                .map((row) => ({
                    value: row.value.trim(),
                    width: Number(row.width),
                    height: Number(row.height),
                })),
        };
    } else if (pricing.tokenEstimatorMode === 'formula') {
        const expression = currentFormulaExpression(pricing);
        const resultType = effectiveFormulaResultType(expression, pricing.tokenFormulaResultType);
        payload.tokenEstimator = {
            mode: 'formula',
            expression,
            expressionText: pricing.tokenFormulaText,
            lookups: pricing.tokenFormulaLookups,
            resultType,
            ...(pricing.tokenFormulaPresetKey ? { presetKey: pricing.tokenFormulaPresetKey } : {}),
            // مبلغ دلاری هرگز به عدد صحیح گرد نمی‌شود (موتور هم نادیده می‌گیرد)
            rounding: resultType === 'vendor_cost_usd' ? 'none' : pricing.tokenFormulaRounding,
            multiplyByQuantity: pricing.tokenFormulaMultiplyByQuantity,
            // سازگاری با نسخه‌های قبلی: همان توضیحات داخل estimator هم می‌ماند
            ...(formulaNotes.trim() ? { notesMarkdown: formulaNotes } : {}),
        };
    }

    return payload;
}

// ─── Matrix Pricing Editor ────────────────────────────────────────────────────
// Shows axes as labeled cards and a 2-D price grid for the two main axes.
// Falls back to per-row editor when there are more than 2 axes.

function getRowPrice(rows: MatrixRow[], dims: Record<string, string>): number {
    const hit = rows.find((r) => {
        const parsed = parseDimsText(r.dimsText);
        return Object.entries(dims).every(([k, v]) => parsed[k] === v);
    });
    return hit?.price ?? 0;
}

function getRowPer(rows: MatrixRow[]): MatrixPer {
    return rows[0]?.per ?? 'second';
}

function setRowPrice(
    rows: MatrixRow[],
    dims: Record<string, string>,
    price: number,
    per: MatrixPer,
): MatrixRow[] {
    const dimsText = Object.entries(dims)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
    const existing = rows.find((r) => r.dimsText === dimsText);
    if (existing) {
        return rows.map((r) => (r.dimsText === dimsText ? { ...r, price, per } : r));
    }
    return [...rows, { dimsText, price, per }];
}

function rebuildRows(
    axes: MatrixAxis[],
    prevRows: MatrixRow[],
    per: MatrixPer,
): MatrixRow[] {
    if (!axes.length) return prevRows;
    const combinations = axes.reduce<Record<string, string>[]>(
        (items, axis) => {
            const values = axis.valuesText.split(',').map((value) => value.trim()).filter(Boolean);
            if (!axis.key || !values.length) return [];
            return items.flatMap((item) => values.map((value) => ({ ...item, [axis.key]: value })));
        },
        [{}],
    );
    return combinations.map((dims) => ({
        dimsText: formatDims(dims),
        price: getRowPrice(prevRows, dims),
        per,
    }));
}

interface MatrixEditorProps {
    pricing: ModelPricingForm;
    updatePricing: (patch: Partial<ModelPricingForm>) => void;
}

function MatrixPricingEditor({
    pricing,
    updatePricing,
    settingsSchema = [],
    runtimeMetrics = [],
}: MatrixEditorProps & {
    settingsSchema?: NodeSettingFieldForm[];
    runtimeMetrics?: RuntimeMetricOption[];
}) {
    const axes = pricing.axes;
    const rows = pricing.rows;
    const globalPer: MatrixPer = getRowPer(rows);

    const ax0 = axes[0];
    const ax1 = axes[1];
    const ax0Values = ax0 ? ax0.valuesText.split(',').map((v) => v.trim()).filter(Boolean) : [];
    const ax1Values = ax1 ? ax1.valuesText.split(',').map((v) => v.trim()).filter(Boolean) : [];

    const hasTwoAxes = axes.length === 2 && ax0Values.length > 0 && ax1Values.length > 0;

    const updateAxis = (index: number, patch: Partial<MatrixAxis>) => {
        const newAxes = axes.map((a, i) => (i === index ? { ...a, ...patch } : a));
        const newRows = rebuildRows(newAxes, rows, globalPer);
        updatePricing({ axes: newAxes, rows: newRows });
    };

    const handlePerChange = (per: MatrixPer) => {
        updatePricing({ rows: rows.map((r) => ({ ...r, per })) });
    };

    const handleCellChange = (v0: string, v1: string, price: number) => {
        const dims = { [ax0.key]: v0, [ax1.key]: v1 };
        updatePricing({ rows: setRowPrice(rows, dims, price, globalPer) });
    };

    return (
        <div className={styles.column}>
            {/* Axes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h6 style={{ margin: 0 }}>محورهای جدول قیمت</h6>
                <div
                    className={styles.addButton}
                    style={{ margin: 0, padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => {
                        const newAxes = [...axes, {
                            key: '',
                            label: '',
                            valuesText: '',
                            source: 'manual' as const,
                            settingKey: '',
                            runtimeKey: '',
                            valueType: 'string' as const,
                        }];
                        updatePricing({ axes: newAxes });
                    }}
                >
                    + افزودن محور
                </div>
            </div>
            <p className={styles.hint} style={{ marginBottom: '1rem' }}>
                مثال: محور «کیفیت» با مقادیر «480p,720p,1080p» و محور «نسبت تصویر» با مقادیر «16:9,9:16,1:1»
            </p>

            {axes.map((axis, index) => (
                <div key={index} style={{ background: 'var(--input-background-color)', border: '1px solid var(--input-border-color)', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.83rem' }}>محور {index + 1}</span>
                        <button type="button" className={styles.removeBtn} style={{ margin: 0 }}
                            onClick={() => {
                                const newAxes = axes.filter((_, i) => i !== index);
                                updatePricing({ axes: newAxes, rows: rebuildRows(newAxes, rows, globalPer) });
                            }}
                        >
                            <MdOutlineClose size={14} />
                        </button>
                    </div>
                    <div className={styles.row} style={{ marginBottom: 0 }}>
                        <label>
                            منبع محور
                            <select
                                value={axis.source}
                                className="form-control form-control-sm"
                                onChange={(event) => updateAxis(index, {
                                    source: event.target.value as MatrixAxis['source'],
                                    settingKey: '',
                                    runtimeKey: '',
                                })}
                            >
                                <option value="manual">دستی</option>
                                <option value="setting">از تنظیمات مدل</option>
                                <option value="runtime">از ورودی‌های اجرا</option>
                            </select>
                        </label>
                        {axis.source === 'setting' && (
                            <label>
                                فیلد تنظیمات
                                <select
                                    value={axis.settingKey}
                                    className="form-control form-control-sm"
                                    onChange={(event) => {
                                        const field = settingsSchema.find((item) => item.key === event.target.value);
                                        const values = field ? parseOptionsText(field.optionsText).map((item) => item.value) : [];
                                        updateAxis(index, {
                                            settingKey: event.target.value,
                                            key: event.target.value,
                                            label: field?.labelFa || field?.label || event.target.value,
                                            valuesText: values.join(','),
                                            valueType: field?.type === 'number' || field?.type === 'slider'
                                                ? 'number'
                                                : field?.type === 'checkbox' ? 'boolean' : 'string',
                                        });
                                    }}
                                >
                                    <option value="">انتخاب تنظیمات</option>
                                    {settingsSchema.filter((field) => field.key).map((field) => (
                                        <option key={field.key} value={field.key}>
                                            {field.labelFa || field.label || field.key}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        {axis.source === 'runtime' && (
                            <label>
                                داده داینامیک ورودی
                                <select
                                    value={axis.runtimeKey}
                                    className="form-control form-control-sm"
                                    onChange={(event) => {
                                        const metric = runtimeMetrics.find((item) => item.key === event.target.value);
                                        updateAxis(index, {
                                            runtimeKey: event.target.value,
                                            key: event.target.value,
                                            label: metric?.label || event.target.value,
                                            valueType: metric?.valueType || 'string',
                                            valuesText: metric?.valueType === 'boolean' ? 'true,false' : '',
                                        });
                                    }}
                                >
                                    <option value="">انتخاب داده داینامیک</option>
                                    {runtimeMetrics.map((metric) => (
                                        <option key={metric.key} value={metric.key}>{metric.label}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label>
                            کلید (key)
                            <Field value={axis.key} type="text" className="form-control form-control-sm"
                                onChange={(e) => updateAxis(index, { key: e })}
                            />
                            <span className={styles.hint}>مثلاً: resolution یا aspectRatio</span>
                        </label>
                        <label>
                            عنوان نمایشی
                            <Field value={axis.label} type="text" className="form-control form-control-sm"
                                onChange={(e) => updateAxis(index, { label: e })}
                            />
                            <span className={styles.hint}>مثلاً: کیفیت تصویر</span>
                        </label>
                        <label>
                            مقادیر (با کاما)
                            <Field value={axis.valuesText} type="text" className="form-control form-control-sm"
                                onChange={(e) => updateAxis(index, { valuesText: e })}
                            />
                            <span className={styles.hint}>مثلاً: 480p,720p,1080p</span>
                            {axis.source === 'runtime' && axis.valueType === 'number' && (
                                <span className={styles.hint}>بازه‌ها: 0..5,5..10 یا شرط‌ها: &gt;10,&lt;=30</span>
                            )}
                        </label>
                    </div>
                </div>
            ))}

            {/* Global per */}
            <div className={styles.row} style={{ marginTop: '0.5rem' }}>
                <label>
                    واحد محاسبه (برای همه سلول‌ها)
                    <Field value={globalPer} type="select" className="form-control form-control-sm"
                        options={MATRIX_PER_OPTIONS}
                        onChange={(e) => handlePerChange(e as MatrixPer)}
                    />
                    <UnitPerHint per={globalPer} pricing={pricing} />
                </label>
            </div>

            {/* Price grid */}
            {hasTwoAxes ? (
                <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <h6 style={{ margin: 0 }}>جدول قیمت (USD)</h6>
                        <span className={styles.hint}>هر سلول = قیمت برای ترکیب {ax0.label || ax0.key} × {ax1.label || ax1.key}</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>{ax0.label || ax0.key} \ {ax1.label || ax1.key}</th>
                                    {ax1Values.map((v) => (
                                        <th key={v} style={thStyle}>{v}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ax0Values.map((v0) => (
                                    <tr key={v0}>
                                        <td style={{ ...tdStyle, fontWeight: 600, background: 'var(--input-background-color)' }}>{v0}</td>
                                        {ax1Values.map((v1) => (
                                            <td key={v1} style={tdStyle}>
                                                <input
                                                    type="number"
                                                    step="0.000001"
                                                    value={getRowPrice(rows, { [ax0.key]: v0, [ax1.key]: v1 })}
                                                    onChange={(e) => handleCellChange(v0, v1, Number(e.target.value) || 0)}
                                                    style={{
                                                        width: '100%',
                                                        minWidth: 80,
                                                        background: 'var(--plan-card-background-color)',
                                                        border: '1px solid var(--input-border-color)',
                                                        borderRadius: 6,
                                                        padding: '0.35rem 0.5rem',
                                                        color: 'var(--body-text-color)',
                                                        fontSize: '0.82rem',
                                                        fontFamily: 'inherit',
                                                    }}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Fallback: per-row editor (more than 2 axes or axes not filled yet) */
                <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h6 style={{ margin: 0 }}>ردیف‌های قیمت</h6>
                        <div className={styles.addButton} style={{ margin: 0, padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
                            onClick={() => updatePricing({ rows: [...rows, { dimsText: '', price: 0, per: globalPer }] })}
                        >
                            + افزودن ردیف
                        </div>
                    </div>
                    {rows.map((row, index) => (
                        <div key={index} className={styles.metadataRow}>
                            <label>
                                dims
                                <Field value={row.dimsText} type="text" className="form-control form-control-sm"
                                    onChange={(e) => updatePricing({ rows: rows.map((r, i) => i === index ? { ...r, dimsText: e } : r) })}
                                />
                            </label>
                            <label>
                                قیمت (USD)
                                <Field value={row.price} type="number" className="form-control form-control-sm"
                                    onChange={(e) => updatePricing({ rows: rows.map((r, i) => i === index ? { ...r, price: e === '' ? 0 : Number(e) } : r) })}
                                />
                            </label>
                            <button type="button" className={styles.removeBtn}
                                onClick={() => updatePricing({ rows: rows.filter((_, i) => i !== index) })}
                            >
                                <MdOutlineClose size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TokenEstimatorEditor({ pricing, updatePricing }: MatrixEditorProps) {
    const [previewQuantity, setPreviewQuantity] = useState(1);
    const [previewOutputSeconds, setPreviewOutputSeconds] = useState(5);
    const [previewInputSeconds, setPreviewInputSeconds] = useState(0);
    const estimatorMode = pricing.tokenEstimatorMode;

    const preview = useMemo(() => {
        if (estimatorMode === 'matrix') {
            const tokenRow = pricing.tokenRows[0];
            if (!tokenRow) return null;
            const dims = parseDimsText(tokenRow.dimsText);
            const priceRow = pricing.rows.find((row) => {
                const rowDims = parseDimsText(row.dimsText);
                return Object.entries(rowDims).every(([key, value]) => dims[key] === value);
            });
            const tokens = tokenRow.outputTokens
                * (pricing.tokenMultiplyByQuantity ? previewQuantity : 1);
            const cost = priceRow?.per === '1m_tokens'
                ? (tokens / 1_000_000) * priceRow.price
                : undefined;
            return {
                tokens,
                formula: `${tokenRow.outputTokens.toLocaleString('en-US')} × ${pricing.tokenMultiplyByQuantity ? previewQuantity : 1}`,
                cost,
            };
        }

        if (estimatorMode === 'video_pixels') {
            const resolution = pricing.tokenResolutions[0];
            if (!resolution) return null;
            const seconds = previewInputSeconds + previewOutputSeconds;
            const tokens = Math.round(
                seconds * resolution.width * resolution.height
                * pricing.tokenFps / Math.max(1, pricing.tokenDivisor),
            );
            const inputType = previewInputSeconds > 0 ? 'included' : 'not_included';
            const priceRow = pricing.rows.find((row) => {
                const dims = parseDimsText(row.dimsText);
                return (!dims.resolution || dims.resolution.toLowerCase() === resolution.value.toLowerCase())
                    && (!dims.videoInput || dims.videoInput === inputType);
            });
            const cost = priceRow?.per === '1m_tokens'
                ? (tokens / 1_000_000) * priceRow.price
                : undefined;
            return {
                tokens,
                formula: `(${previewInputSeconds}s + ${previewOutputSeconds}s) × ${resolution.width} × ${resolution.height} × ${pricing.tokenFps} ÷ ${pricing.tokenDivisor}`,
                cost,
            };
        }
        return null;
    }, [
        estimatorMode,
        pricing,
        previewInputSeconds,
        previewOutputSeconds,
        previewQuantity,
    ]);

    return (
        <section className={styles.formCard}>
            <h4 className={styles.formCardTitle}>پیش‌بینی توکن و هزینه</h4>
            <p className={styles.formCardDesc}>
                برای مدل‌هایی که قیمت ماتریس آن‌ها به ازای یک میلیون توکن است، ابتدا توکن خروجی
                تخمین زده می‌شود و سپس نرخ ردیف متناظر ماتریس اعمال می‌شود.
            </p>

            <div className={styles.row}>
                <label>
                    روش تخمین توکن
                    <select
                        value={estimatorMode}
                        className="form-control form-control-sm"
                        onChange={(event) => {
                            const mode = event.target.value as TokenEstimatorMode;
                            updatePricing({
                                tokenEstimatorMode: mode,
                                ...(mode === 'matrix' && pricing.tokenRows.length === 0
                                    ? {
                                        tokenRows: pricing.rows.map((row) => ({
                                            dimsText: row.dimsText,
                                            outputTokens: 0,
                                        })),
                                    }
                                    : {}),
                            });
                        }}
                    >
                        <option value="none">بدون تخمین توکن</option>
                        <option value="matrix">جدول توکن بر اساس dimensions — GPT Image</option>
                        <option value="formula">فرمول ماژولار تنظیمات و ورودی‌ها</option>
                        <option value="video_pixels">فرمول پیکسل و مدت ویدیو — Seedance</option>
                    </select>
                </label>
            </div>

            {estimatorMode === 'matrix' && (
                <div className={styles.column}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            checked={pricing.tokenMultiplyByQuantity}
                            onChange={(event) => updatePricing({ tokenMultiplyByQuantity: event.target.checked })}
                        />
                        ضرب توکن هر ردیف در تعداد خروجی‌ها
                    </label>
                    <div
                        className={styles.addButton}
                        onClick={() => updatePricing({
                            tokenRows: [
                                ...pricing.tokenRows,
                                { dimsText: '', outputTokens: 0 },
                            ],
                        })}
                    >
                        افزودن ردیف تخمین توکن
                    </div>
                    {pricing.tokenRows.map((row, index) => (
                        <div key={index} className={styles.metadataRow}>
                            <label>
                                dimensions
                                <input
                                    value={row.dimsText}
                                    className="form-control form-control-sm"
                                    placeholder="quality=high,imageSize=1024x1024"
                                    onChange={(event) => updatePricing({
                                        tokenRows: pricing.tokenRows.map((item, itemIndex) =>
                                            itemIndex === index
                                                ? { ...item, dimsText: event.target.value }
                                                : item
                                        ),
                                    })}
                                />
                            </label>
                            <label>
                                توکن خروجی هر واحد
                                <input
                                    value={row.outputTokens}
                                    type="number"
                                    className="form-control form-control-sm"
                                    onChange={(event) => updatePricing({
                                        tokenRows: pricing.tokenRows.map((item, itemIndex) =>
                                            itemIndex === index
                                                ? { ...item, outputTokens: Number(event.target.value) || 0 }
                                                : item
                                        ),
                                    })}
                                />
                            </label>
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => updatePricing({
                                    tokenRows: pricing.tokenRows.filter((_, itemIndex) => itemIndex !== index),
                                })}
                            >
                                <MdOutlineClose size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {estimatorMode === 'video_pixels' && (
                <div className={styles.column}>
                    <div className={styles.row}>
                        <label>
                            FPS
                            <input
                                value={pricing.tokenFps}
                                type="number"
                                className="form-control form-control-sm"
                                onChange={(event) => updatePricing({ tokenFps: Number(event.target.value) || 24 })}
                            />
                        </label>
                        <label>
                            مقسوم‌علیه فرمول
                            <input
                                value={pricing.tokenDivisor}
                                type="number"
                                className="form-control form-control-sm"
                                onChange={(event) => updatePricing({ tokenDivisor: Number(event.target.value) || 1024 })}
                            />
                        </label>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="checkbox"
                            checked={pricing.tokenIncludeInputVideoDuration}
                            onChange={(event) => updatePricing({
                                tokenIncludeInputVideoDuration: event.target.checked,
                            })}
                        />
                        مدت ویدیوهای ورودی نیز در فرمول محاسبه شود
                    </label>
                    <div
                        className={styles.addButton}
                        onClick={() => updatePricing({
                            tokenResolutions: [
                                ...pricing.tokenResolutions,
                                { value: '', width: 0, height: 0 },
                            ],
                        })}
                    >
                        افزودن رزولوشن
                    </div>
                    {pricing.tokenResolutions.map((row, index) => (
                        <div key={index} className={`${styles.metadataRow} ${styles.cacheTierRow}`}>
                            <label>
                                مقدار resolution
                                <input value={row.value} type="text" className="form-control form-control-sm"
                                    onChange={(event) => updatePricing({
                                        tokenResolutions: pricing.tokenResolutions.map((item, itemIndex) =>
                                            itemIndex === index ? { ...item, value: event.target.value } : item
                                        ),
                                    })}
                                />
                            </label>
                            <label>
                                عرض
                                <input value={row.width} type="number" className="form-control form-control-sm"
                                    onChange={(event) => updatePricing({
                                        tokenResolutions: pricing.tokenResolutions.map((item, itemIndex) =>
                                            itemIndex === index ? { ...item, width: Number(event.target.value) || 0 } : item
                                        ),
                                    })}
                                />
                            </label>
                            <label>
                                ارتفاع
                                <input value={row.height} type="number" className="form-control form-control-sm"
                                    onChange={(event) => updatePricing({
                                        tokenResolutions: pricing.tokenResolutions.map((item, itemIndex) =>
                                            itemIndex === index ? { ...item, height: Number(event.target.value) || 0 } : item
                                        ),
                                    })}
                                />
                            </label>
                            <button type="button" className={styles.removeBtn}
                                onClick={() => updatePricing({
                                    tokenResolutions: pricing.tokenResolutions.filter((_, itemIndex) => itemIndex !== index),
                                })}
                            >
                                <MdOutlineClose size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {estimatorMode !== 'none' && (
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--input-border-color)', borderRadius: 8 }}>
                    <h6>نمونه پیش‌بینی</h6>
                    {estimatorMode === 'matrix' ? (
                        <label>
                            تعداد خروجی
                            <input type="number" min={1} value={previewQuantity}
                                onChange={(event) => setPreviewQuantity(Math.max(1, Number(event.target.value) || 1))}
                                className="form-control form-control-sm"
                            />
                        </label>
                    ) : (
                        <div className={styles.row}>
                            <label>
                                مدت ویدیوی ورودی
                                <input type="number" min={0} value={previewInputSeconds}
                                    onChange={(event) => setPreviewInputSeconds(Math.max(0, Number(event.target.value) || 0))}
                                    className="form-control form-control-sm"
                                />
                            </label>
                            <label>
                                مدت خروجی
                                <input type="number" min={0} value={previewOutputSeconds}
                                    onChange={(event) => setPreviewOutputSeconds(Math.max(0, Number(event.target.value) || 0))}
                                    className="form-control form-control-sm"
                                />
                            </label>
                        </div>
                    )}
                    {preview ? (
                        <div style={{ marginTop: '0.75rem', lineHeight: 1.8 }}>
                            <div>فرمول: <code>{preview.formula}</code></div>
                            <div>توکن تخمینی: <strong>{preview.tokens.toLocaleString('en-US')}</strong></div>
                            <div>هزینه vendor: <strong>{preview.cost == null ? 'نرخ ماتریس 1M tokens پیدا نشد' : `$${preview.cost.toFixed(6)}`}</strong></div>
                        </div>
                    ) : (
                        <p className={styles.hint}>برای نمایش نمونه، ردیف تخمین را کامل کنید.</p>
                    )}
                </div>
            )}
        </section>
    );
}

const TOKEN_CONTEXT_FIELDS: Array<{ key: string; label: string; values: string[] }> = [
    { key: 'videoInput', label: 'نوع ورودی ویدیو', values: ['included', 'not_included'] },
    { key: 'durationSeconds', label: 'مدت خروجی (ثانیه)', values: ['5', '10'] },
];

function segmentValues(segment: TokenEstimatorSegment): string[] {
    return segment.valuesText.split(',').map((value) => value.trim()).filter(Boolean);
}

function buildTokenCombinations(segments: TokenEstimatorSegment[]): Record<string, string>[] {
    if (segments.length === 0) return [];
    return segments.reduce<Record<string, string>[]>(
        (rows, segment) => {
            const values = segmentValues(segment);
            if (values.length === 0) return [];
            return rows.flatMap((row) => values.map((value) => ({ ...row, [segment.key]: value })));
        },
        [{}],
    );
}

function formulaLookupText(table: Record<string, number>): string {
    return Object.entries(table || {}).map(([key, value]) => `${key}=${value}`).join('\n');
}

function parseFormulaLookup(text: string): Record<string, number> {
    return String(text || '').split('\n').reduce<Record<string, number>>((result, line) => {
        const index = line.indexOf('=');
        if (index <= 0) return result;
        const key = line.slice(0, index).trim();
        const value = Number(line.slice(index + 1).trim());
        if (key && Number.isFinite(value)) result[key] = value;
        return result;
    }, {});
}

function seedanceFormulaPreset(): TokenFormulaNode {
    return {
        type: 'operation',
        operator: 'divide',
        operands: [
            {
                type: 'operation',
                operator: 'multiply',
                operands: [
                    {
                        type: 'operation',
                        operator: 'add',
                        operands: [
                            {
                                type: 'value',
                                source: 'runtime',
                                key: 'inputVideoDurationSeconds',
                                fallback: 0,
                                label: 'Input video duration',
                            },
                            {
                                type: 'value',
                                source: 'runtime',
                                key: 'outputDurationSeconds',
                                fallback: 0,
                                label: 'Output video duration',
                            },
                        ],
                    },
                    {
                        type: 'value',
                        source: 'runtime',
                        key: 'outputWidth',
                        fallback: 0,
                        label: 'Output video width',
                    },
                    {
                        type: 'value',
                        source: 'runtime',
                        key: 'outputHeight',
                        fallback: 0,
                        label: 'Output video height',
                    },
                    {
                        type: 'value',
                        source: 'runtime',
                        key: 'outputFrameRate',
                        fallback: 24,
                        label: 'Output video frame rate',
                    },
                ],
            },
            { type: 'value', source: 'constant', value: 1024, label: 'Divisor' },
        ],
    };
}

function durationRateFormulaPreset(
    fallbackRate: number,
    rateLabel: string,
): TokenFormulaNode {
    return {
        type: 'operation',
        operator: 'multiply',
        operands: [
            {
                type: 'value',
                source: 'runtime',
                key: 'outputDurationSeconds',
                fallback: 0,
                label: 'Output video duration',
            },
            {
                type: 'value',
                source: 'runtime',
                key: 'pricingRate',
                fallback: fallbackRate,
                label: rateLabel,
            },
        ],
    };
}

function omniCostFormulaPreset(): TokenFormulaNode {
    return {
        type: 'operation',
        operator: 'add',
        operands: [
            {
                type: 'operation',
                operator: 'multiply',
                operands: [
                    {
                        type: 'value',
                        source: 'runtime',
                        key: 'inputVideoDurationSeconds',
                        fallback: 0,
                        label: 'Input video duration',
                    },
                    { type: 'value', source: 'constant', value: 0.0004, label: 'Input cost / second' },
                ],
            },
            {
                type: 'operation',
                operator: 'multiply',
                operands: [
                    {
                        type: 'value',
                        source: 'runtime',
                        key: 'outputDurationSeconds',
                        fallback: 0,
                        label: 'Output video duration',
                    },
                    { type: 'value', source: 'constant', value: 0.1014, label: 'Output cost / second' },
                ],
            },
        ],
    };
}

const GPT_IMAGE_QUALITY_FACTORS: Record<string, number> = {
    low: 16,
    medium: 48,
    high: 96,
};

const GPT_IMAGE_ASPECT_RATIOS: Record<string, number> = {
    '1:1': 1,
    '4:3': 0.75,
    '3:4': 0.75,
    '16:9': 0.5625,
    '9:16': 0.5625,
    '3:2': 0.6667,
    '2:3': 0.6667,
    '21:9': 0.4286,
    '9:21': 0.4286,
    '16:10': 0.625,
    '10:16': 0.625,
};

function gptImageOutputTokenEstimate(
    quality: string | number,
    aspectRatio: string | number,
    outputPixels: string | number,
): number {
    const factor = GPT_IMAGE_QUALITY_FACTORS[String(quality || '').toLowerCase().trim()] ?? 48;
    const ratioKey = String(aspectRatio || '').toLowerCase().trim();
    let ratio = ratioKey in GPT_IMAGE_ASPECT_RATIOS
        ? GPT_IMAGE_ASPECT_RATIOS[ratioKey]
        : 1;
    if (!(ratioKey in GPT_IMAGE_ASPECT_RATIOS)) {
        const match = ratioKey.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
        if (match) {
            const a = Number(match[1]);
            const b = Number(match[2]);
            if (a > 0 && b > 0) ratio = Math.min(a / b, b / a);
        }
    }
    return Math.max(0, Math.round(
        factor * (factor * ratio) * (2_000_000 + Math.max(0, Number(outputPixels) || 0)) / 4_000_000,
    ));
}

/**
 * OpenAI image models (gpt-image family) hosted on fal bill text input, image
 * input (references/edits) and image output tokens separately. The output
 * portion mirrors OpenAI's quality-axis-factor formula (low=16, medium=48,
 * high=96) with an aspect-ratio adjustment. `pricingRate` is injected from the
 * matched size × quality matrix row when one exists.
 */
function gptImageCostFormulaPreset(): TokenFormulaNode {
    const qualityFactor: TokenFormulaNode = {
        type: 'lookup',
        source: 'setting',
        key: 'quality',
        table: GPT_IMAGE_QUALITY_FACTORS,
        fallback: 48,
        label: 'Quality factor',
    };
    const aspectRatio: TokenFormulaNode = {
        type: 'lookup',
        source: 'setting',
        key: 'aspectRatio',
        table: GPT_IMAGE_ASPECT_RATIOS,
        fallback: 1,
        label: 'Aspect ratio (short/long)',
    };
    const shortAxisFactor: TokenFormulaNode = {
        type: 'operation',
        operator: 'multiply',
        operands: [qualityFactor, aspectRatio],
    };
    const imageOutputTokens: TokenFormulaNode = {
        type: 'operation',
        operator: 'divide',
        operands: [
            {
                type: 'operation',
                operator: 'multiply',
                operands: [
                    {
                        type: 'operation',
                        operator: 'multiply',
                        operands: [qualityFactor, shortAxisFactor],
                    },
                    {
                        type: 'operation',
                        operator: 'add',
                        operands: [
                            { type: 'value', source: 'constant', value: 2_000_000, label: 'Token area offset' },
                            { type: 'value', source: 'runtime', key: 'outputPixels', fallback: 0, label: 'Output pixels' },
                        ],
                    },
                ],
            },
            { type: 'value', source: 'constant', value: 4_000_000, label: 'Token area scale' },
        ],
    };
    const textInputCost: TokenFormulaNode = {
        type: 'operation',
        operator: 'multiply',
        operands: [
            {
                type: 'operation',
                operator: 'divide',
                operands: [
                    { type: 'value', source: 'runtime', key: 'promptLength', fallback: 0, label: 'Prompt length (chars)' },
                    { type: 'value', source: 'constant', value: 4, label: 'Chars per token' },
                ],
            },
            { type: 'value', source: 'constant', value: 0.000005, label: 'Text input $ per token' },
        ],
    };
    const imageInputCost: TokenFormulaNode = {
        type: 'operation',
        operator: 'multiply',
        operands: [
            {
                type: 'operation',
                operator: 'divide',
                operands: [
                    { type: 'value', source: 'runtime', key: 'totalInputImagePixels', fallback: 0, label: 'Input image pixels' },
                    { type: 'value', source: 'constant', value: 750, label: 'Pixels per image token' },
                ],
            },
            { type: 'value', source: 'constant', value: 0.000008, label: 'Image input $ per token' },
        ],
    };
    const imageOutputCost: TokenFormulaNode = {
        type: 'operation',
        operator: 'multiply',
        operands: [
            imageOutputTokens,
            { type: 'value', source: 'constant', value: 0.00003, label: 'Image output $ per token' },
        ],
    };
    return {
        type: 'operation',
        operator: 'add',
        operands: [textInputCost, imageInputCost, imageOutputCost],
    };
}

/**
 * Generic OpenAI model on fal: the matched size × quality matrix/unit rate
 * covers the generation, then prompt text and reference images are added on
 * top (text input $5/1M, image input $8/1M).
 */
function openAICostFormulaPreset(): TokenFormulaNode {
    const textInputCost: TokenFormulaNode = {
        type: 'operation',
        operator: 'multiply',
        operands: [
            {
                type: 'operation',
                operator: 'divide',
                operands: [
                    { type: 'value', source: 'runtime', key: 'promptLength', fallback: 0, label: 'Prompt length (chars)' },
                    { type: 'value', source: 'constant', value: 4, label: 'Chars per token' },
                ],
            },
            { type: 'value', source: 'constant', value: 0.000005, label: 'Text input $ per token' },
        ],
    };
    const imageInputCost: TokenFormulaNode = {
        type: 'operation',
        operator: 'multiply',
        operands: [
            {
                type: 'operation',
                operator: 'divide',
                operands: [
                    { type: 'value', source: 'runtime', key: 'totalInputImagePixels', fallback: 0, label: 'Input image pixels' },
                    { type: 'value', source: 'constant', value: 750, label: 'Pixels per image token' },
                ],
            },
            { type: 'value', source: 'constant', value: 0.000008, label: 'Image input $ per token' },
        ],
    };
    return {
        type: 'operation',
        operator: 'add',
        operands: [
            { type: 'value', source: 'runtime', key: 'pricingRate', fallback: 0, label: 'Matched matrix rate' },
            textInputCost,
            imageInputCost,
        ],
    };
}

function formulaKeys(node: TokenFormulaNode): Array<{ source: 'setting' | 'runtime'; key: string }> {
    if (node.type === 'operation') return node.operands.flatMap(formulaKeys);
    if (node.source === 'constant' || !node.key) return [];
    return [{ source: node.source, key: node.key }];
}

function evaluateFormulaPreview(node: TokenFormulaNode, values: Record<string, string | number>): number {
    if (node.type === 'value') {
        const value = node.source === 'constant' ? node.value : values[node.key || ''];
        if (value == null || value === '') return Number(node.fallback || 0);
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : Number(node.fallback || 0);
    }
    if (node.type === 'lookup') {
        const key = String(values[node.key] ?? '').toLowerCase().trim();
        const match = Object.entries(node.table || {}).find(([item]) => item.toLowerCase().trim() === key);
        return Number(match?.[1] ?? node.fallback ?? 0);
    }
    const operands = node.operands.map((item) => evaluateFormulaPreview(item, values));
    if (!operands.length) return 0;
    if (node.operator === 'add') return operands.reduce((sum, value) => sum + value, 0);
    if (node.operator === 'subtract') return operands.slice(1).reduce((value, item) => value - item, operands[0]);
    if (node.operator === 'multiply') return operands.reduce((value, item) => value * item, 1);
    if (node.operator === 'max') return Math.max(...operands);
    if (node.operator === 'min') return Math.min(...operands);
    return operands.slice(1).reduce((value, item) => item === 0 ? 0 : value / item, operands[0]);
}

function FormulaNodeEditor({
    node,
    onChange,
    settings,
    runtimeMetrics,
    depth = 0,
}: {
    node: TokenFormulaNode;
    onChange: (node: TokenFormulaNode) => void;
    settings: Array<{ key: string; label: string }>;
    runtimeMetrics: RuntimeMetricOption[];
    depth?: number;
}) {
    const replaceType = (type: TokenFormulaNode['type']) => {
        if (type === 'operation') {
            onChange({
                type: 'operation',
                operator: 'multiply',
                operands: [
                    { type: 'value', source: 'constant', value: 1 },
                    { type: 'value', source: 'constant', value: 1 },
                ],
            });
        } else if (type === 'lookup') {
            onChange({ type: 'lookup', source: 'setting', key: '', table: {} });
        } else {
            onChange({ type: 'value', source: 'constant', value: 1 });
        }
    };

    return (
        <div style={{
            border: '1px solid var(--input-border-color)',
            borderRadius: 8,
            padding: '0.75rem',
            marginTop: depth ? '0.5rem' : 0,
            background: depth ? 'var(--input-background-color)' : undefined,
        }}>
            <div className={styles.row}>
                <label>
                    نوع سگمنت
                    <select value={node.type} className="form-control form-control-sm"
                        onChange={(event) => replaceType(event.target.value as TokenFormulaNode['type'])}>
                        <option value="value">مقدار</option>
                        <option value="lookup">جدول تبدیل</option>
                        <option value="operation">گروه محاسباتی</option>
                    </select>
                </label>

                {node.type === 'operation' ? (
                    <label>
                        عملیات
                        <select value={node.operator} className="form-control form-control-sm"
                            onChange={(event) => onChange({
                                ...node,
                                operator: event.target.value as typeof node.operator,
                            })}>
                            <option value="add">جمع (+)</option>
                            <option value="subtract">تفریق (−)</option>
                            <option value="multiply">ضرب (×)</option>
                            <option value="divide">تقسیم (÷)</option>
                            <option value="max">بیشترین مقدار (max)</option>
                            <option value="min">کمترین مقدار (min)</option>
                        </select>
                    </label>
                ) : (
                    <label>
                        منبع مقدار
                        <select value={node.source} className="form-control form-control-sm"
                            onChange={(event) => {
                                const source = event.target.value as 'constant' | 'setting' | 'runtime';
                                if (node.type === 'lookup') {
                                    onChange({
                                        ...node,
                                        source: source as 'setting' | 'runtime',
                                    });
                                } else {
                                    onChange({
                                        ...node,
                                        source,
                                        key: source === 'constant' ? undefined : node.key,
                                    });
                                }
                            }}>
                            {node.type === 'value' && <option value="constant">عدد ثابت</option>}
                            <option value="setting">تنظیمات مدل</option>
                            <option value="runtime">داده داینامیک ورودی / خروجی</option>
                        </select>
                    </label>
                )}
            </div>

            {node.type === 'operation' ? (
                <>
                    {node.operands.map((operand, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                            <FormulaNodeEditor
                                node={operand}
                                settings={settings}
                                runtimeMetrics={runtimeMetrics}
                                depth={depth + 1}
                                onChange={(next) => onChange({
                                    ...node,
                                    operands: node.operands.map((item, itemIndex) => itemIndex === index ? next : item),
                                })}
                            />
                            {node.operands.length > 1 && (
                                <button type="button" className={styles.removeBtn}
                                    onClick={() => onChange({
                                        ...node,
                                        operands: node.operands.filter((_, itemIndex) => itemIndex !== index),
                                    })}>
                                    <MdOutlineClose size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" className={styles.addButton}
                        onClick={() => onChange({
                            ...node,
                            operands: [...node.operands, { type: 'value', source: 'constant', value: 1 }],
                        })}>
                        افزودن سگمنت به گروه
                    </button>
                </>
            ) : (
                <div className={styles.row}>
                    {node.type === 'value' && node.source === 'constant' ? (
                        <label>
                            مقدار ثابت
                            <input type="number" value={node.value ?? 0} className="form-control form-control-sm"
                                onChange={(event) => onChange({ ...node, value: Number(event.target.value) || 0 })} />
                        </label>
                    ) : (
                        <label>
                            فیلد
                            <select value={node.key || ''} className="form-control form-control-sm"
                                onChange={(event) => onChange({ ...node, key: event.target.value })}>
                                <option value="">انتخاب فیلد</option>
                                {node.source === 'setting'
                                    ? settings.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)
                                    : (
                                        <>
                                            <optgroup label="Input metrics">
                                                {runtimeMetrics.filter((item) => item.category === 'input').map((item) => (
                                                    <option key={item.key} value={item.key}>{item.label}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Output metrics">
                                                {runtimeMetrics.filter((item) => item.category === 'output').map((item) => (
                                                    <option key={item.key} value={item.key}>{item.label}</option>
                                                ))}
                                            </optgroup>
                                        </>
                                    )}
                            </select>
                        </label>
                    )}
                    {node.type === 'lookup' && (
                        <label>
                            جدول تبدیل (هر خط key=value)
                            <textarea value={formulaLookupText(node.table)} className="form-control form-control-sm"
                                rows={4}
                                onChange={(event) => onChange({ ...node, table: parseFormulaLookup(event.target.value) })} />
                        </label>
                    )}
                    <label>
                        مقدار جایگزین
                        <input type="number" value={node.fallback ?? 0} className="form-control form-control-sm"
                            onChange={(event) => onChange({ ...node, fallback: Number(event.target.value) || 0 })} />
                    </label>
                </div>
            )}
        </div>
    );
}

function ExpressionTokenEstimatorEditor({
    pricing,
    updatePricing,
    settingsSchema,
    runtimeMetrics,
    markupPercent,
}: MatrixEditorProps & {
    settingsSchema: NodeSettingFieldForm[];
    runtimeMetrics: RuntimeMetricOption[];
    /** مارکاپ مؤثر مدل (اختصاصی یا سراسری) برای نمایش مبلغ نهایی در پیش‌نمایش؛ null = نامعلوم */
    markupPercent: number | null;
}) {
    const [selectedPreset, setSelectedPreset] = useState<'seedance' | 'veo' | 'omni' | 'heygen' | 'kling' | 'openai' | 'gpt-image'>('seedance');
    const [previewValues, setPreviewValues] = useState<Record<string, string | number>>({});
    const [previewQuantity, setPreviewQuantity] = useState(1);
    const tokens = pricing.tokenFormulaTokens;
    const parsed = useMemo(() => formulaTokensToNode(tokens), [tokens]);
    const currentExpression = parsed.expression || pricing.tokenFormulaExpression;
    const usesPricingRate = formulaUsesPricingRate(currentExpression);
    const resultType = effectiveFormulaResultType(currentExpression, pricing.tokenFormulaResultType);
    const isCostResult = resultType === 'vendor_cost_usd';
    const resultOption = FORMULA_RESULT_OPTIONS.find((option) => option.value === resultType) || FORMULA_RESULT_OPTIONS[0];
    const tokenRateConfigured = pricing.mode === 'token'
        || (pricing.mode === 'matrix'
            ? pricing.rows.some((row) => row.per === '1m_tokens')
            : pricing.unitPer === '1m_tokens');

    // همان قیمتی که موتور به‌جای @runtime.pricingRate می‌گذارد: ردیف منطبق جدول یا نرخ واحد
    const pricingRateChoices = useMemo(() => {
        if (pricing.mode === 'token') return [];
        if (pricing.mode !== 'matrix') {
            return [{ value: String(pricing.unitAmount), label: `$${pricing.unitAmount} / ${pricing.unitPer}` }];
        }
        // یک گزینه برای هر قیمت یکتا (ردیف‌های هم‌قیمت نتیجه یکسان دارند)
        const byRate = new Map<string, { value: string; per: string; dims: string[] }>();
        for (const row of pricing.rows) {
            const entry = byRate.get(String(row.price)) || { value: String(row.price), per: row.per, dims: [] };
            if (row.dimsText) entry.dims.push(row.dimsText);
            byRate.set(String(row.price), entry);
        }
        return Array.from(byRate.values()).map((entry) => ({
            value: entry.value,
            label: `$${entry.value} / ${entry.per}`
                + (entry.dims.length
                    ? ` — ${entry.dims[0]}${entry.dims.length > 1 ? ` و ${entry.dims.length - 1} ردیف دیگر` : ''}`
                    : ''),
        }));
    }, [pricing.mode, pricing.rows, pricing.unitAmount, pricing.unitPer]);
    const previewInputs = useMemo(() => {
        const values = { ...previewValues };
        if (usesPricingRate && values.pricingRate == null && pricingRateChoices.length) {
            values.pricingRate = pricingRateChoices[0].value;
        }
        // مثل موتور: قیمت صفر/خالی تزریق نمی‌شود و مقدار جایگزین فرمول به کار می‌رود
        if (values.pricingRate != null && !(Number(values.pricingRate) > 0)) delete values.pricingRate;
        return values;
    }, [usesPricingRate, pricingRateChoices, previewValues]);

    const updateFormula = (next: {
        text: string;
        tokens: FormulaEditorToken[];
        expression?: TokenFormulaNode;
        error?: string;
    }) => {
        updatePricing({
            tokenFormulaText: next.text,
            tokenFormulaTokens: next.tokens,
            tokenFormulaEditorError: next.error || '',
            tokenEstimatorMode: 'formula',
            tokenFormulaPresetKey: '',
            ...(next.expression ? { tokenFormulaExpression: next.expression } : {}),
            // @runtime.pricingRate قیمت دلاری است؛ فرمولی که آن را دارد هزینه دلاری است، نه توکن
            ...(next.expression && formulaUsesPricingRate(next.expression)
                ? { tokenFormulaResultType: 'vendor_cost_usd' as const, tokenFormulaRounding: 'none' as const }
                : {}),
        });
    };

    const applySelectedPreset = () => {
        const expression = selectedPreset === 'seedance'
            ? seedanceFormulaPreset()
            : selectedPreset === 'omni'
                ? omniCostFormulaPreset()
                : selectedPreset === 'veo'
                    ? durationRateFormulaPreset(0.75, 'Veo rate / second')
                    : selectedPreset === 'heygen'
                        ? durationRateFormulaPreset(0.05, 'HeyGen matched rate / second')
                        : selectedPreset === 'kling'
                            ? durationRateFormulaPreset(0.084, 'Kling matched rate / second')
                            : selectedPreset === 'openai'
                                ? openAICostFormulaPreset()
                                : gptImageCostFormulaPreset();
        const isTokenFormula = selectedPreset === 'seedance';
        updatePricing({
            tokenEstimatorMode: 'formula',
            tokenFormulaExpression: expression,
            tokenFormulaTokens: formulaNodeToTokens(expression),
            tokenFormulaText: serializeFormulaExpression(expression).text,
            tokenFormulaEditorError: '',
            tokenFormulaResultType: isTokenFormula ? 'output_tokens' : 'vendor_cost_usd',
            tokenFormulaPresetKey: selectedPreset,
            tokenFormulaRounding: isTokenFormula ? 'round' : 'none',
            tokenFormulaMultiplyByQuantity: true,
        });
    };

    // همان ترتیب موتور: max(0, فرمول) × تعداد؛ گرد کردن فقط برای توکن — مبلغ دلاری هرگز گرد نمی‌شود
    const previewRaw = parsed.expression
        ? Math.max(0, evaluateFormulaPreview(parsed.expression, previewInputs))
            * (pricing.tokenFormulaMultiplyByQuantity ? previewQuantity : 1)
        : 0;
    const previewResult = isCostResult
        ? previewRaw
        : pricing.tokenFormulaRounding === 'ceil'
            ? Math.ceil(previewRaw)
            : pricing.tokenFormulaRounding === 'floor'
                ? Math.floor(previewRaw)
                : pricing.tokenFormulaRounding === 'none'
                    ? previewRaw
                    : Math.round(previewRaw);
    const previewCharged = isCostResult && markupPercent != null
        ? previewResult * (1 + Math.max(0, markupPercent) / 100)
        : null;
    const omniPreviewTokens = Math.round(
        Math.max(0, Number(previewValues.inputVideoDurationSeconds || 0)) * 263
        + Math.max(0, Number(previewValues.outputDurationSeconds || 0)) * 5_792,
    );
    const gptImagePreviewTokens = gptImageOutputTokenEstimate(
        previewValues.quality,
        previewValues.aspectRatio,
        previewValues.outputPixels,
    );
    const openAiPreviewTokens = Math.round(
        Math.max(0, Number(previewValues.promptLength || 0)) / 4
        + Math.max(0, Number(previewValues.totalInputImagePixels || 0)) / 750,
    );
    const previewFields = parsed.expression
        ? Array.from(new Map(formulaKeys(parsed.expression).map((item) => [item.key, item])).values())
        : [];
    const outputRate = pricing.mode === 'token' ? pricing.outputPer1M : undefined;

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <select
                    value={selectedPreset}
                    className="form-control form-control-sm"
                    onChange={(event) => setSelectedPreset(event.target.value as typeof selectedPreset)}
                >
                    <option value="seedance">Seedance</option>
                    <option value="veo">Google Veo</option>
                    <option value="omni">Gemini Omni Flash</option>
                    <option value="heygen">HeyGen</option>
                    <option value="kling">Kling</option>
                    <option value="openai">OpenAI (fal)</option>
                    <option value="gpt-image">GPT Image (fal)</option>
                </select>
                <button type="button" className={styles.addButton} onClick={applySelectedPreset}>
                    اعمال
                </button>
            </div>

            <FormulaExpressionInput
                value={pricing.tokenFormulaText}
                expression={pricing.tokenFormulaExpression}
                runtimeMetrics={runtimeMetrics}
                settings={settingsSchema
                    .filter((field) => field.key.trim())
                    .map((field) => ({
                        key: field.key.trim(),
                        label: field.labelFa.trim() || field.label.trim() || field.key.trim(),
                        options: parseOptionsText(field.optionsText),
                    }))}
                lookups={pricing.tokenFormulaLookups}
                onLookupsChange={(lookups) => updatePricing({ tokenFormulaLookups: lookups })}
                onChange={updateFormula}
            />

            <div className={styles.row} style={{ marginTop: '1rem' }}>
                <label>
                    خروجی فرمول
                    <select
                        value={resultType}
                        className="form-control form-control-sm"
                        disabled={usesPricingRate}
                        onChange={(event) => {
                            const next = event.target.value as FormulaResultType;
                            updatePricing({
                                tokenFormulaResultType: next,
                                tokenFormulaRounding: next === 'vendor_cost_usd' ? 'none' : 'round',
                            });
                        }}
                    >
                        {FORMULA_RESULT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <span className={styles.hint}>{resultOption.hint}</span>
                    {usesPricingRate ? (
                        <span className={styles.hint}>
                            چون فرمول از @runtime.pricingRate (قیمت دلاری تب قیمت‌گذاری) استفاده می‌کند، خروجی آن همیشه دلار است.
                        </span>
                    ) : null}
                    {!isCostResult && !tokenRateConfigured ? (
                        <span className={`${styles.hint} ${pageStyles.hintWarn}`}>
                            واحد تب قیمت‌گذاری «1M tokens» نیست؛ توکنِ این فرمول در مبلغ اثری ندارد.
                        </span>
                    ) : null}
                </label>
                {isCostResult ? (
                    <label>
                        گرد کردن خروجی
                        <span className={styles.hint}>
                            مبلغ دلاری گرد نمی‌شود و تا ۶ رقم اعشار دقیق حساب می‌شود.
                        </span>
                    </label>
                ) : (
                    <label>
                        گرد کردن خروجی
                        <select
                            value={pricing.tokenFormulaRounding}
                            className="form-control form-control-sm"
                            onChange={(event) => updatePricing({
                                tokenFormulaRounding: event.target.value as ModelPricingForm['tokenFormulaRounding'],
                            })}
                        >
                            <option value="round">نزدیک‌ترین عدد</option>
                            <option value="ceil">رو به بالا</option>
                            <option value="floor">رو به پایین</option>
                            <option value="none">بدون گرد کردن</option>
                        </select>
                        <span className={styles.hint}>تعداد توکن نهایی (بعد از ضرب در تعداد خروجی) به این روش گرد می‌شود.</span>
                    </label>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={pricing.tokenFormulaMultiplyByQuantity}
                        onChange={(event) => updatePricing({
                            tokenFormulaMultiplyByQuantity: event.target.checked,
                        })}
                    />
                    ضرب در تعداد خروجی‌ها
                </label>
            </div>

            {parsed.expression ? (
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--input-border-color)', borderRadius: 8 }}>
                    <h6>پیش‌نمایش</h6>
                    <div className={styles.row}>
                        {previewFields.map((field) => (
                            <label key={field.key}>
                                {field.key}
                                {field.key === 'pricingRate' && pricingRateChoices.length ? (
                                    <select
                                        value={String(previewInputs.pricingRate ?? '')}
                                        className="form-control form-control-sm"
                                        onChange={(event) => setPreviewValues((current) => ({
                                            ...current,
                                            pricingRate: event.target.value,
                                        }))}
                                    >
                                        {pricingRateChoices.map((choice, index) => (
                                            <option key={`${choice.label}-${index}`} value={choice.value}>{choice.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        value={previewValues[field.key] ?? ''}
                                        className="form-control form-control-sm"
                                        onChange={(event) => setPreviewValues((current) => ({
                                            ...current,
                                            [field.key]: event.target.value,
                                        }))}
                                    />
                                )}
                            </label>
                        ))}
                        {pricing.tokenFormulaMultiplyByQuantity ? (
                            <label>
                                تعداد خروجی
                                <input
                                    type="number"
                                    min={1}
                                    value={previewQuantity}
                                    className="form-control form-control-sm"
                                    onChange={(event) => setPreviewQuantity(Math.max(1, Number(event.target.value) || 1))}
                                />
                            </label>
                        ) : null}
                    </div>
                    {isCostResult ? (
                        <>
                            <strong>هزینه Vendor: ${previewResult.toFixed(6)}</strong>
                            {previewCharged != null ? (
                                <div>مبلغ نهایی با {markupPercent}٪ سود: ${previewCharged.toFixed(6)}</div>
                            ) : null}
                            {pricing.tokenFormulaPresetKey === 'omni'
                                || pricing.tokenFormulaPresetKey === 'gpt-image'
                                || pricing.tokenFormulaPresetKey === 'openai' ? (
                                    <div>
                                        توکن تخمینی:{' '}
                                        {pricing.tokenFormulaPresetKey === 'omni'
                                            ? omniPreviewTokens.toLocaleString('en-US')
                                            : pricing.tokenFormulaPresetKey === 'gpt-image'
                                                ? gptImagePreviewTokens.toLocaleString('en-US')
                                                : openAiPreviewTokens.toLocaleString('en-US')}
                                    </div>
                                ) : null}
                            {(pricing.tokenFormulaPresetKey === 'gpt-image' || pricing.tokenFormulaPresetKey === 'openai') && (
                                <div className={styles.hint}>
                                    {pricing.tokenFormulaPresetKey === 'gpt-image'
                                        ? 'شامل متن ورودی ($5/1M) + تصاویر ورودی ($8/1M) + تصویر خروجی با فاکتور کیفیت ($30/1M)'
                                        : 'شامل نرخ منطبق ماتریس + متن ورودی ($5/1M) + تصاویر ورودی ($8/1M)'}
                                </div>
                            )}
                        </>
                    ) : (
                        <strong>توکن تخمینی: {previewResult.toLocaleString('en-US')}</strong>
                    )}
                    {!isCostResult && outputRate != null ? (
                        <div>هزینه vendor: ${((previewResult / 1_000_000) * outputRate).toFixed(6)}</div>
                    ) : null}
                </div>
            ) : null}

            <FormulaMarkdownNotes
                value={pricing.tokenFormulaNotes}
                onChange={(tokenFormulaNotes) => updatePricing({ tokenFormulaNotes })}
                linkedName={pricing.tokenFormulaNotesRef?.name}
                onUnlink={() => updatePricing({ tokenFormulaNotesRef: null })}
            />
        </>
    );
}

function GenericTokenEstimatorEditor({
    pricing,
    updatePricing,
    settingsSchema,
    runtimeMetrics,
}: MatrixEditorProps & {
    settingsSchema: NodeSettingFieldForm[];
    runtimeMetrics: RuntimeMetricOption[];
}) {
    const [previewDims, setPreviewDims] = useState<Record<string, string>>({});
    const [previewQuantity, setPreviewQuantity] = useState(1);
    const [formulaPreviewValues, setFormulaPreviewValues] = useState<Record<string, string | number>>({});
    const estimatorMode = pricing.tokenEstimatorMode;
    const segments = pricing.tokenSegments;

    const settingChoices = useMemo(() => settingsSchema
        .filter((field) => field.key.trim())
        .map((field) => {
            const options = parseOptionsText(field.optionsText).map((option) => option.value);
            const values = options.length
                ? options
                : field.type === 'checkbox'
                    ? ['true', 'false']
                    : [];
            return {
                source: 'setting' as const,
                key: field.key.trim(),
                label: field.labelFa.trim() || field.label.trim() || field.key.trim(),
                values,
            };
        }), [settingsSchema]);

    if (estimatorMode === 'video_pixels') {
        return <TokenEstimatorEditor pricing={pricing} updatePricing={updatePricing} />;
    }

    const updateSegment = (index: number, patch: Partial<TokenEstimatorSegment>) => {
        updatePricing({
            tokenSegments: segments.map((segment, itemIndex) =>
                itemIndex === index ? { ...segment, ...patch } : segment
            ),
        });
    };

    const selectSegmentField = (index: number, selection: string) => {
        const [source, key] = selection.split(':', 2) as ['setting' | 'context', string];
        const choice = source === 'setting'
            ? settingChoices.find((item) => item.key === key)
            : TOKEN_CONTEXT_FIELDS.find((item) => item.key === key);
        if (!choice) return;
        updateSegment(index, {
            source,
            key,
            label: choice.label,
            valuesText: choice.values.join(','),
        });
    };

    const generateRows = () => {
        const previous = new Map(
            pricing.tokenRows.map((row) => [
                JSON.stringify(parseDimsText(row.dimsText)),
                row.outputTokens,
            ]),
        );
        updatePricing({
            tokenRows: buildTokenCombinations(segments).map((dims) => ({
                dimsText: formatDims(dims),
                outputTokens: previous.get(JSON.stringify(dims)) ?? 0,
            })),
        });
    };

    const previewRow = pricing.tokenRows.find((row) => {
        const dims = parseDimsText(row.dimsText);
        return segments.every((segment) => dims[segment.key] === previewDims[segment.key]);
    });
    const previewMultiplier = pricing.tokenMultiplyByQuantity ? previewQuantity : 1;
    const previewTokens = (previewRow?.outputTokens || 0) * previewMultiplier;
    const previewPriceRow = pricing.rows.find((row) => {
        const dims = parseDimsText(row.dimsText);
        return Object.entries(dims).every(([key, value]) => previewDims[key] === value);
    });
    const previewTokenRate = pricing.mode === 'token'
        ? pricing.outputPer1M
        : previewPriceRow?.per === '1m_tokens'
            ? previewPriceRow.price
            : undefined;
    const previewCost = previewTokenRate != null
        ? (previewTokens / 1_000_000) * previewTokenRate
        : undefined;
    const formulaRawTokens = Math.max(
        0,
        evaluateFormulaPreview(pricing.tokenFormulaExpression, formulaPreviewValues)
        * (pricing.tokenFormulaMultiplyByQuantity ? previewQuantity : 1),
    );
    const formulaPreviewTokens = pricing.tokenFormulaRounding === 'ceil'
        ? Math.ceil(formulaRawTokens)
        : pricing.tokenFormulaRounding === 'floor'
            ? Math.floor(formulaRawTokens)
            : pricing.tokenFormulaRounding === 'none'
                ? formulaRawTokens
                : Math.round(formulaRawTokens);
    const formulaRate = pricing.mode === 'token'
        ? pricing.outputPer1M
        : pricing.rows.find((row) => {
            const dims = parseDimsText(row.dimsText);
            return Object.entries(dims).every(([key, value]) =>
                matrixPreviewValueMatches(
                    value,
                    formulaPreviewValues[key],
                    pricing.axes.find((axis) => axis.key === key),
                )
            );
        });
    const formulaRatePer1M = typeof formulaRate === 'number'
        ? formulaRate
        : formulaRate?.per === '1m_tokens' ? formulaRate.price : undefined;
    const formulaPreviewFields = Array.from(new Map([
        ...formulaKeys(pricing.tokenFormulaExpression).map((item) => [
            item.key,
            { key: item.key, label: item.key, values: [] as string[] },
        ] as const),
        ...pricing.axes.map((axis) => [
            axis.key,
            { key: axis.key, label: axis.label || axis.key, values: segmentValues({
                source: axis.source === 'runtime' ? 'context' : 'setting',
                key: axis.key,
                label: axis.label,
                valuesText: axis.valuesText,
            }) },
        ] as const),
    ]).values());

    return (
        <section className={styles.formCard}>
            <h4 className={styles.formCardTitle}>پیش‌بینی توکن و هزینه</h4>
            <p className={styles.formCardDesc}>
                فیلدهای مؤثر را از تنظیمات مدل انتخاب کنید؛ سپس برای هر ترکیب، توکن خروجی ثابت را وارد کنید.
            </p>

            <div className={styles.row}>
                <label>
                    روش تخمین توکن
                    <select
                        value={estimatorMode}
                        className="form-control form-control-sm"
                        onChange={(event) => updatePricing({
                            tokenEstimatorMode: event.target.value as TokenEstimatorMode,
                        })}
                    >
                        <option value="none">بدون تخمین توکن</option>
                        <option value="matrix">ترکیب تنظیمات → توکن ثابت</option>
                        <option value="formula">فرمول ماژولار تنظیمات و ورودی‌ها</option>
                        <option value="video_pixels">فرمول تخصصی مدت و پیکسل — Seedance</option>
                    </select>
                </label>
            </div>

            {estimatorMode === 'matrix' && (
                <div className={styles.column}>
                    <div>
                        <h6>۱. فیلدهای مؤثر در تخمین</h6>
                        <p className={styles.hint}>هر فیلد یک سگمنت از قانون تطبیق است؛ دو، سه یا هر تعداد فیلد قابل انتخاب است.</p>
                    </div>

                    {segments.map((segment, index) => (
                        <div key={`${segment.source}-${segment.key}-${index}`} className={styles.metadataRow}>
                            <label>
                                فیلد
                                <select
                                    value={`${segment.source}:${segment.key}`}
                                    className="form-control form-control-sm"
                                    onChange={(event) => selectSegmentField(index, event.target.value)}
                                >
                                    <option value="">انتخاب فیلد</option>
                                    <optgroup label="تنظیمات مدل">
                                        {settingChoices.map((choice) => (
                                            <option key={`setting:${choice.key}`} value={`setting:${choice.key}`}>
                                                {choice.label} ({choice.key})
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="اطلاعات اجرا">
                                        {TOKEN_CONTEXT_FIELDS.map((choice) => (
                                            <option key={`context:${choice.key}`} value={`context:${choice.key}`}>
                                                {choice.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                            </label>
                            <label>
                                مقادیر قابل تطبیق
                                <input
                                    value={segment.valuesText}
                                    className="form-control form-control-sm"
                                    placeholder="high,medium,low"
                                    onChange={(event) => updateSegment(index, { valuesText: event.target.value })}
                                />
                            </label>
                            <button
                                type="button"
                                className={styles.removeBtn}
                                onClick={() => updatePricing({
                                    tokenSegments: segments.filter((_, itemIndex) => itemIndex !== index),
                                })}
                            >
                                <MdOutlineClose size={16} />
                            </button>
                        </div>
                    ))}

                    <div className={styles.row}>
                        <button
                            type="button"
                            className={styles.addButton}
                            onClick={() => {
                                const used = new Set(segments.map((segment) => segment.key));
                                const choice = settingChoices.find((item) => !used.has(item.key));
                                updatePricing({
                                    tokenSegments: [
                                        ...segments,
                                        {
                                            source: 'setting',
                                            key: choice?.key || '',
                                            label: choice?.label || '',
                                            valuesText: choice?.values.join(',') || '',
                                        },
                                    ],
                                });
                            }}
                        >
                            افزودن فیلد مؤثر
                        </button>
                        <button
                            type="button"
                            className={styles.addButton}
                            disabled={segments.length === 0 || segments.some((segment) => segmentValues(segment).length === 0)}
                            onClick={generateRows}
                        >
                            ساخت جدول ترکیب‌ها
                        </button>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={pricing.tokenMultiplyByQuantity}
                            onChange={(event) => updatePricing({ tokenMultiplyByQuantity: event.target.checked })}
                        />
                        ضرب توکن ثابت در تعداد خروجی‌ها
                    </label>

                    <div>
                        <h6>۲. توکن ثابت هر ترکیب</h6>
                        {pricing.tokenRows.length === 0 ? (
                            <p className={styles.hint}>فیلدها و مقادیر را انتخاب و «ساخت جدول ترکیب‌ها» را بزنید.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {segments.map((segment) => <th key={segment.key} style={thStyle}>{segment.label || segment.key}</th>)}
                                            <th style={thStyle}>توکن خروجی ثابت</th>
                                            <th style={thStyle}>حذف</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pricing.tokenRows.map((row, rowIndex) => {
                                            const dims = parseDimsText(row.dimsText);
                                            return (
                                                <tr key={`${row.dimsText}-${rowIndex}`}>
                                                    {segments.map((segment) => (
                                                        <td key={segment.key} style={tdStyle}>
                                                            <select
                                                                value={dims[segment.key] || ''}
                                                                className="form-control form-control-sm"
                                                                onChange={(event) => {
                                                                    const nextDims = { ...dims, [segment.key]: event.target.value };
                                                                    updatePricing({
                                                                        tokenRows: pricing.tokenRows.map((item, itemIndex) =>
                                                                            itemIndex === rowIndex ? { ...item, dimsText: formatDims(nextDims) } : item
                                                                        ),
                                                                    });
                                                                }}
                                                            >
                                                                {segmentValues(segment).map((value) => <option key={value} value={value}>{value}</option>)}
                                                            </select>
                                                        </td>
                                                    ))}
                                                    <td style={tdStyle}>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={row.outputTokens}
                                                            className="form-control form-control-sm"
                                                            onChange={(event) => updatePricing({
                                                                tokenRows: pricing.tokenRows.map((item, itemIndex) =>
                                                                    itemIndex === rowIndex
                                                                        ? { ...item, outputTokens: Math.max(0, Number(event.target.value) || 0) }
                                                                        : item
                                                                ),
                                                            })}
                                                        />
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <button type="button" className={styles.removeBtn}
                                                            onClick={() => updatePricing({
                                                                tokenRows: pricing.tokenRows.filter((_, itemIndex) => itemIndex !== rowIndex),
                                                            })}
                                                        >
                                                            <MdOutlineClose size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {segments.length > 0 && (
                        <div style={{ padding: '1rem', border: '1px solid var(--input-border-color)', borderRadius: 8 }}>
                            <h6>۳. نمونه پیش‌بینی</h6>
                            <div className={styles.row}>
                                {segments.map((segment) => (
                                    <label key={segment.key}>
                                        {segment.label || segment.key}
                                        <select
                                            value={previewDims[segment.key] || ''}
                                            className="form-control form-control-sm"
                                            onChange={(event) => setPreviewDims((current) => ({
                                                ...current,
                                                [segment.key]: event.target.value,
                                            }))}
                                        >
                                            <option value="">انتخاب کنید</option>
                                            {segmentValues(segment).map((value) => <option key={value} value={value}>{value}</option>)}
                                        </select>
                                    </label>
                                ))}
                                {pricing.tokenMultiplyByQuantity && (
                                    <label>
                                        تعداد خروجی
                                        <input
                                            type="number"
                                            min={1}
                                            value={previewQuantity}
                                            className="form-control form-control-sm"
                                            onChange={(event) => setPreviewQuantity(
                                                Math.max(1, Number(event.target.value) || 1),
                                            )}
                                        />
                                    </label>
                                )}
                            </div>
                            {previewRow ? (
                                <div style={{ marginTop: '0.75rem', lineHeight: 1.8 }}>
                                    <div>توکن ثابت ردیف: <strong>{previewRow.outputTokens.toLocaleString('en-US')}</strong></div>
                                    <div>توکن تخمینی نهایی: <strong>{previewTokens.toLocaleString('en-US')}</strong></div>
                                    <div>هزینه vendor: <strong>{previewCost == null ? 'نرخ ماتریس 1M tokens پیدا نشد' : `$${previewCost.toFixed(6)}`}</strong></div>
                                </div>
                            ) : (
                                <p className={styles.hint}>برای این ترکیب، ردیف توکن تعریف نشده است.</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {estimatorMode === 'formula' && (
                <div className={styles.column}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <h6>فرمول تخمین توکن</h6>
                            <button
                                type="button"
                                className={styles.addButton}
                                onClick={() => updatePricing({
                                    tokenFormulaExpression: seedanceFormulaPreset(),
                                    tokenFormulaRounding: 'round',
                                    tokenFormulaMultiplyByQuantity: true,
                                })}
                            >
                                استفاده از فرمول Seedance
                            </button>
                        </div>
                        <p className={styles.hint}>
                            گروه‌های جمع، ضرب و تقسیم بسازید و هر مقدار را از تنظیمات، داده‌های داینامیک ورودی یا عدد ثابت بگیرید.
                        </p>
                    </div>
                    <FormulaNodeEditor
                        node={pricing.tokenFormulaExpression}
                        onChange={(expression) => updatePricing({ tokenFormulaExpression: expression })}
                        settings={settingChoices.map((item) => ({ key: item.key, label: item.label }))}
                        runtimeMetrics={runtimeMetrics}
                    />
                    <div className={styles.row}>
                        <label>
                            گرد کردن خروجی
                            <select value={pricing.tokenFormulaRounding} className="form-control form-control-sm"
                                onChange={(event) => updatePricing({
                                    tokenFormulaRounding: event.target.value as ModelPricingForm['tokenFormulaRounding'],
                                })}>
                                <option value="round">نزدیک‌ترین عدد</option>
                                <option value="ceil">رو به بالا</option>
                                <option value="floor">رو به پایین</option>
                                <option value="none">بدون گرد کردن</option>
                            </select>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" checked={pricing.tokenFormulaMultiplyByQuantity}
                                onChange={(event) => updatePricing({
                                    tokenFormulaMultiplyByQuantity: event.target.checked,
                                })} />
                            ضرب نتیجه در تعداد خروجی‌ها
                        </label>
                    </div>
                    <div style={{ padding: '1rem', border: '1px solid var(--input-border-color)', borderRadius: 8 }}>
                        <h6>نمونه پیش‌بینی فرمول</h6>
                        <div className={styles.row}>
                            {formulaPreviewFields.map((item) => (
                                <label key={item.key}>
                                    {item.label}
                                    {item.values?.length ? (
                                        <select value={formulaPreviewValues[item.key] ?? ''}
                                            className="form-control form-control-sm"
                                            onChange={(event) => setFormulaPreviewValues((current) => ({
                                                ...current,
                                                [item.key]: event.target.value,
                                            }))}>
                                            <option value="">انتخاب کنید</option>
                                            {item.values.map((value) => <option key={value} value={value}>{value}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            value={formulaPreviewValues[item.key] ?? ''}
                                            className="form-control form-control-sm"
                                            onChange={(event) => setFormulaPreviewValues((current) => ({
                                                ...current,
                                                [item.key]: event.target.value,
                                            }))}
                                        />
                                    )}
                                </label>
                            ))}
                            {pricing.tokenFormulaMultiplyByQuantity && (
                                <label>
                                    تعداد خروجی
                                    <input type="number" min={1} value={previewQuantity}
                                        className="form-control form-control-sm"
                                        onChange={(event) => setPreviewQuantity(Math.max(1, Number(event.target.value) || 1))} />
                                </label>
                            )}
                        </div>
                        <strong>
                            توکن تخمینی: {formulaPreviewTokens.toLocaleString('en-US')}
                        </strong>
                        <div>نرخ خروجی / 1M: {formulaRatePer1M == null ? 'تعریف نشده' : `$${formulaRatePer1M}`}</div>
                        <div>
                            هزینه vendor: {formulaRatePer1M == null
                                ? 'نرخ منطبق پیدا نشد'
                                : `$${((formulaPreviewTokens / 1_000_000) * formulaRatePer1M).toFixed(6)}`}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

const thStyle: React.CSSProperties = {
    padding: '0.45rem 0.65rem',
    background: 'var(--input-background-color)',
    border: '1px solid var(--input-border-color)',
    fontWeight: 700,
    textAlign: 'center',
    whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
    padding: '0.35rem 0.5rem',
    border: '1px solid var(--input-border-color)',
    textAlign: 'center',
};

// ─────────────────────────────────────────────────────────────────────────────

const MODEL_EDIT_SECTIONS = [
    { id: 'basic', title: 'اطلاعات پایه', short: 'اطلاعات پایه' },
    { id: 'checklist', title: 'چک‌لیست مدل', short: 'چک‌لیست' },
    { id: 'modes', title: 'مودها و Routeها', short: 'مودها' },
    { id: 'capabilityModes', title: 'حالت‌های قابلیتی', short: 'قابلیت‌ها' },
    { id: 'actualCost', title: 'هزینه واقعی', short: 'هزینه واقعی' },
    { id: 'pricing', title: 'قیمت‌گذاری', short: 'قیمت‌گذاری' },
    { id: 'formula', title: 'فرمول هزینه', short: 'فرمول هزینه' },
    { id: 'metadata', title: 'متادیتا', short: 'متادیتا' },
    { id: 'settings', title: 'تنظیمات مدل', short: 'تنظیمات مدل' },
    // فقط مدل‌های متنی (LLM): قالب‌های فایلی که کاربر در چت متنی پیوست می‌کند
    { id: 'fileInputs', title: 'فایل‌های ورودی (مدل متنی)', short: 'فایل‌های ورودی' },
] as const;

type ModelEditSectionId = (typeof MODEL_EDIT_SECTIONS)[number]['id'];

export default function ProviderModelFormPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const isEditing = id !== 'new';

    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [providers, setProviders] = useState<ProviderOption[]>([]);
    const [model, setModel] = useState<ModelForm>({
        name: '',
        displayName: '',
        description: '',
        iconSvg: '',
        platformIconId: '',
        providerId: '',
        section: 'standard',
        class: 'text',
        isActive: false,
        input: 0,
        output: 0,
        cachedInput: 0,
        markupPercent: '',
        pricing: emptyPricing('token'),
    });
    // جدول‌های قیمت ارائه‌دهنده‌ها؛ تب قیمت‌گذاری و فرمول همیشه جدولِ انتخاب‌شده را ویرایش می‌کنند
    const [providerPricing, setProviderPricing] = useState<ProviderPricingTableForm[]>([]);
    const [activePricingKey, setActivePricingKey] = useState<string>(DEFAULT_PRICING_KEY);
    const [metadata, setMetadata] = useState<MetadataItem[]>([{ key: '', value: '' }]);
    const [settingsSchema, setSettingsSchema] = useState<NodeSettingFieldForm[]>([]);
    const [modes, setModes] = useState<ModelModeEditorValue[]>([]);
    const [requestProfileText, setRequestProfileText] = useState('');
    const [actualCost, setActualCost] = useState<ActualCostConfig | undefined>();
    const [fileInputs, setFileInputs] = useState<ModelFileInputsForm>(emptyFileInputs);
    const [runtimeMetrics, setRuntimeMetrics] = useState<RuntimeMetricOption[]>([]);
    const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number | null>(null);
    const [expandedFieldIdx, setExpandedFieldIdx] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<ModelEditSectionId>('basic');
    const [focusedModeEditorId, setFocusedModeEditorId] = useState<string | null>(null);
    const [focusNonce, setFocusNonce] = useState(0);
    const pendingSettingFocusRef = useRef<number | null>(null);
    // مودال انتخاب از کتابخانه آیکون‌های عمومی — مقصد می‌تواند آیکون مدل یا آیکون یک گزینه باشد
    const [platformIconPicker, setPlatformIconPicker] = useState<
        { kind: 'model' } | { kind: 'option'; fieldIdx: number; rowIdx: number } | null
    >(null);

    const { items: platformIcons } = usePlatformIcons(token, baseUrl);
    const [modelLoaded, setModelLoaded] = useState(!isEditing);
    const legacyIconsLinkedRef = useRef(false);

    const setOptionIcon = (fieldIdx: number, rowIdx: number, patch: Pick<NodeSettingFieldOption, 'iconSvg' | 'platformIconId'>) => {
        setSettingsSchema((prev) =>
            prev.map((f, i) => i === fieldIdx
                ? {
                    ...f,
                    optionsRows: (f.optionsRows || []).map((item, j) =>
                        j === rowIdx ? { ...item, ...patch } : item),
                }
                : f),
        );
    };

    const handlePlatformIconPick = (icon: PlatformIconItem) => {
        const target = platformIconPicker;
        setPlatformIconPicker(null);
        if (!target) return;
        const patch = { iconSvg: icon.iconSvg, platformIconId: icon._id };
        if (target.kind === 'model') {
            setModel((prev) => ({ ...prev, ...patch }));
            return;
        }
        setOptionIcon(target.fieldIdx, target.rowIdx, patch);
    };

    // SVGهای قدیمی که قبل از ذخیره‌ی شناسه از کتابخانه کپی شده‌اند و هنوز دقیقاً همان آیکون‌اند،
    // یک بار به آیکون عمومی وصل می‌شوند تا قفل شوند و با ویرایش کتابخانه به‌روز شوند
    useEffect(() => {
        if (!modelLoaded || !platformIcons.length || legacyIconsLinkedRef.current) return;
        legacyIconsLinkedRef.current = true;
        const idBySvg = new Map(platformIcons.map((icon) => [icon.iconSvg.trim(), icon._id]));
        const linkedIdFor = (iconSvg?: string, platformIconId?: string) =>
            platformIconId || idBySvg.get((iconSvg || '').trim()) || '';
        setModel((prev) => {
            const platformIconId = linkedIdFor(prev.iconSvg, prev.platformIconId);
            return platformIconId === prev.platformIconId ? prev : { ...prev, platformIconId };
        });
        setSettingsSchema((prev) => prev.map((f) => {
            if (!f.optionsRows?.some((row) => linkedIdFor(row.iconSvg, row.platformIconId) !== (row.platformIconId || ''))) return f;
            return {
                ...f,
                optionsRows: f.optionsRows.map((row) => ({ ...row, platformIconId: linkedIdFor(row.iconSvg, row.platformIconId) })),
            };
        }));
    }, [modelLoaded, platformIcons]);

    const visibleTabs = useMemo(
        // چک‌لیست و حالت‌های قابلیتی فقط در حالت ویرایش (مدل موجود) معنا دارند
        () => MODEL_EDIT_SECTIONS.filter((section) => {
            if (section.id === 'fileInputs') return model.class === 'text';
            return (section.id !== 'capabilityModes' && section.id !== 'checklist') || isEditing;
        }),
        [isEditing, model.class],
    );

    useEffect(() => {
        if (!visibleTabs.some((tab) => tab.id === activeTab)) {
            setActiveTab('basic');
        }
    }, [activeTab, visibleTabs]);

    const activeProviderTable = providerPricing.find((table) => table.editorId === activePricingKey) || null;
    /** جدولی که الان در تب قیمت‌گذاری/فرمول ویرایش می‌شود: پیش‌فرض یا جدول یک ارائه‌دهنده */
    const editingPricing = activeProviderTable?.pricing ?? model.pricing;
    const providerLabel = (providerId: string) => {
        const provider = providers.find((item) => item._id === providerId);
        return provider?.displayName || provider?.name || '';
    };
    const editingPricingLabel = activeProviderTable
        ? `جدول ${pricingTableLabel(activeProviderTable, providerLabel)}`
        : 'قیمت پیش‌فرض';
    const pricingTabs = [
        { id: DEFAULT_PRICING_KEY, label: 'قیمت پیش‌فرض' },
        ...providerPricing.map((table) => ({ id: table.editorId, label: pricingTableLabel(table, providerLabel) })),
    ];
    const tablesSameAsDefault = useMemo(() => {
        const base = JSON.stringify(buildPricingPayload(model.pricing));
        return new Set(providerPricing
            .filter((table) => JSON.stringify(buildPricingPayload(table.pricing)) === base)
            .map((table) => table.editorId));
    }, [model.pricing, providerPricing]);

    const isTokenMode = editingPricing.mode === 'token';
    const isMatrixMode = editingPricing.mode === 'matrix';
    const isUnitMode = !isTokenMode && !isMatrixMode;

    const modeHint = useMemo(() => {
        switch (editingPricing.mode) {
            case 'token':
                return 'قیمت به ازای هر ۱ میلیون توکن (input / output / cache tiers).';
            case 'matrix':
                return 'جدول چندبعدی مثل Seedance/HeyGen: axes + ردیف‌های dims/price/per.';
            case 'per_1k_chars':
                return 'قیمت به ازای هر ۱۰۰۰ کاراکتر.';
            case 'per_second':
                return 'قیمت به ازای هر ثانیه.';
            case 'per_minute':
                return 'قیمت به ازای هر دقیقه.';
            case 'per_hour':
                return 'قیمت به ازای هر ساعت.';
            default:
                return 'قیمت تخت به ازای هر واحد (image / video / generation و ...).';
        }
    }, [editingPricing.mode]);

    useEffect(() => {
        if (!token) return;

        async function loadProviders() {
            try {
                const res = await axios.get(`${baseUrl}/api/providers`, {
                    headers: { authorization: `Bearer ${token}` },
                });
                if (res.data.statusCode === 200) {
                    setProviders(res.data.data.providers || []);
                }
            } catch (e) {
                ErrorToaster(e);
            }
        }

        loadProviders();
        axios.get(`${baseUrl}/api/studio/media/cost/runtime-metrics`, {
            headers: { authorization: `Bearer ${token}` },
        }).then((res) => {
            const metrics = res.data?.data;
            if (Array.isArray(metrics)) setRuntimeMetrics(metrics);
        }).catch(() => setRuntimeMetrics([]));
        axios.get(`${baseUrl}/api/billing/settings`, {
            headers: { authorization: `Bearer ${token}` },
        }).then((res) => {
            const settings = res.data?.data;
            const pct = Number(settings?.aiUsageMarkupPercent);
            setGlobalMarkupPercent(Number.isFinite(pct) ? pct : null);
        }).catch(() => setGlobalMarkupPercent(null));
    }, [token, baseUrl]);

    useEffect(() => {
        if (!isEditing || !token) return;

        async function loadModel() {
            try {
                setIsSubmitting(true);
                const res = await axios.get(`${baseUrl}/api/provider-models/${id}?includeInactive=true`, {
                    headers: { authorization: `Bearer ${token}` },
                });

                if (res.data.statusCode === 200) {
                    const data = res.data.data;
                    const pricing = pricingFromApi(data);
                    setModel({
                        name: data.name || '',
                        displayName: data.displayName || '',
                        description: data.description || '',
                        iconSvg: data.iconSvg || '',
                        platformIconId: data.iconSvg ? String(data.platformIconId || '') : '',
                        providerId: data.providerId || '',
                        section: data.section || 'standard',
                        class: data.class || 'text',
                        isActive: data.isActive === true,
                        input: data.input ?? pricing.inputPer1M,
                        output: data.output ?? pricing.outputPer1M,
                        cachedInput: data.cachedInput ?? pricing.cacheTiers[0]?.ratePer1M ?? 0,
                        markupPercent: data.markupPercent == null ? '' : Number(data.markupPercent),
                        pricing,
                    });
                    if (data.metadata?.length > 0) {
                        setMetadata(data.metadata);
                    }
                    if (Array.isArray(data.settingsSchema) && data.settingsSchema.length > 0) {
                        setSettingsSchema(data.settingsSchema.map(settingFieldFromApi));
                    }
                    setModes(Array.isArray(data.modes)
                        ? data.modes.map((mode: ProviderModelMode) => modeFromApi({
                            ...mode,
                            actualCost: actualCostFromApi(mode.actualCost),
                        }))
                        : []);
                    setProviderPricing(Array.isArray(data.providerPricing)
                        ? data.providerPricing
                            .filter((table: any) => table?.providerId && table?.pricing?.mode)
                            .map((table: any) => ({
                                editorId: createPricingTableId(),
                                providerId: String(table.providerId),
                                modeIds: Array.isArray(table.modeIds) ? table.modeIds.map(String) : [],
                                pricing: pricingFromApi({ pricing: table.pricing }),
                            }))
                        : []);
                    setActivePricingKey(DEFAULT_PRICING_KEY);
                    setRequestProfileText(formatRequestProfile(data.requestProfile));
                    setActualCost(actualCostFromApi(data.actualCost));
                    setFileInputs(fileInputsFromApi(data.fileInputs));
                    setModelLoaded(true);
                }
            } catch (e) {
                ErrorToaster(e);
            } finally {
                setIsSubmitting(false);
            }
        }

        loadModel();
    }, [id, isEditing, token, baseUrl]);

    /** جدول در حال ویرایش (پیش‌فرض یا جدول ارائه‌دهنده) را با تابع به‌روز می‌کند */
    const setEditingPricing = (update: (current: ModelPricingForm) => ModelPricingForm) => {
        if (activeProviderTable) {
            const key = activeProviderTable.editorId;
            setProviderPricing((prev) => prev.map((table) =>
                table.editorId === key ? { ...table, pricing: update(table.pricing) } : table));
            return;
        }
        setModel((prev) => ({ ...prev, pricing: update(prev.pricing) }));
    };

    const updatePricing = (patch: Partial<ModelPricingForm>) => {
        setEditingPricing((current) => ({ ...current, ...patch }));
    };

    const addProviderPricingTable = (providerId: string) => {
        // ساختار (axes، فرمول، واحد) از قیمت پیش‌فرض کپی می‌شود؛ ادمین فقط اعداد را عوض می‌کند
        const table: ProviderPricingTableForm = {
            editorId: createPricingTableId(),
            providerId,
            modeIds: [],
            pricing: structuredClone(model.pricing),
        };
        setProviderPricing((prev) => [...prev, table]);
        setActivePricingKey(table.editorId);
    };

    const patchProviderPricingTable = (editorId: string, patch: Partial<ProviderPricingTableMeta>) => {
        setProviderPricing((prev) => prev.map((table) => table.editorId === editorId ? { ...table, ...patch } : table));
    };

    const removeProviderPricingTable = (editorId: string) => {
        setProviderPricing((prev) => prev.filter((table) => table.editorId !== editorId));
        setActivePricingKey((current) => current === editorId ? DEFAULT_PRICING_KEY : current);
    };

    const handleClassChange = (nextClass: string) => {
        setModel((prev) => {
            if (isEditing) {
                return { ...prev, class: nextClass };
            }
            const nextMode = defaultModeForClass(nextClass);
            return {
                ...prev,
                class: nextClass,
                pricing: {
                    ...prev.pricing,
                    mode: nextMode,
                    unitPer: defaultUnitPerForMode(nextMode),
                },
            };
        });
    };

    const handleModeChange = (mode: PricingMode) => {
        updatePricing({
            mode,
            unitPer: defaultUnitPerForMode(mode),
        });
    };

    const handleSyncApply = (
        p: ModelPricing,
        provenance?: { source?: string; sourceUrl?: string; matchedName?: string; syncedAt: string },
    ) => {
        const mode = (p.mode || 'token') as PricingMode;
        let newPricing = emptyPricing(mode);

        if (mode === 'token' && p.rates) {
            newPricing.inputPer1M = Number(p.rates.inputPer1M) || 0;
            newPricing.outputPer1M = Number(p.rates.outputPer1M) || 0;
            newPricing.cacheTiers =
                Array.isArray(p.rates.cacheTiers) && p.rates.cacheTiers.length > 0
                    ? p.rates.cacheTiers.map((t) => ({ id: String(t.id || 'cached_input'), label: String(t.label || t.id || 'Cached'), ratePer1M: Number(t.ratePer1M) || 0 }))
                    : newPricing.cacheTiers;
        } else if (mode === 'matrix' && p.matrix) {
            newPricing.axes = (p.matrix.axes || []).map((a) => ({
                key: String(a.key), label: String(a.label || a.key),
                valuesText: Array.isArray(a.values) ? a.values.join(',') : String(a.values || ''),
                source: ['setting', 'runtime'].includes(String((a as any).source))
                    ? (a as any).source
                    : 'manual',
                settingKey: String((a as any).settingKey || ''),
                runtimeKey: String((a as any).runtimeKey || ''),
                valueType: ['number', 'boolean'].includes(String((a as any).valueType))
                    ? (a as any).valueType
                    : 'string',
            }));
            newPricing.rows = (p.matrix.rows || []).map((r) => ({
                dimsText: formatMatrixRowDims(r),
                price: Number(r.price) || 0,
                per: (r.per as MatrixPer) || 'second',
            }));
        } else if (p.unit) {
            newPricing.unitAmount = Number(p.unit.amount) || 0;
            newPricing.unitPer = (p.unit.per as UnitPer) || 'generation';
        }

        if (p.tokenEstimator?.mode === 'matrix') {
            newPricing.tokenEstimatorMode = 'matrix';
            newPricing.tokenMultiplyByQuantity = p.tokenEstimator.multiplyByQuantity !== false;
            newPricing.tokenSegments = (p.tokenEstimator.segments || []).map((segment) => ({
                source: segment.source === 'context' ? 'context' : 'setting',
                key: String(segment.key || ''),
                label: String(segment.label || segment.key || ''),
                valuesText: (segment.values || []).join(','),
            }));
            newPricing.tokenRows = (p.tokenEstimator.rows || []).map((row) => ({
                dimsText: formatDims(row.dims),
                outputTokens: Number(row.outputTokens) || 0,
            }));
            if (newPricing.tokenSegments.length === 0 && newPricing.tokenRows.length > 0) {
                const rowDims = newPricing.tokenRows.map((row) => parseDimsText(row.dimsText));
                newPricing.tokenSegments = Array.from(new Set(rowDims.flatMap((dims) => Object.keys(dims))))
                    .map((key) => ({
                        source: 'setting',
                        key,
                        label: key,
                        valuesText: Array.from(new Set(rowDims.map((dims) => dims[key]).filter(Boolean))).join(','),
                    }));
            }
        } else if (p.tokenEstimator?.mode === 'video_pixels') {
            newPricing.tokenEstimatorMode = 'video_pixels';
            newPricing.tokenFps = Number(p.tokenEstimator.fps) || 24;
            newPricing.tokenDivisor = Number(p.tokenEstimator.divisor) || 1024;
            newPricing.tokenIncludeInputVideoDuration =
                p.tokenEstimator.includeInputVideoDuration !== false;
            newPricing.tokenResolutions = (p.tokenEstimator.resolutions || []).map((row) => ({
                value: String(row.value || ''),
                width: Number(row.width) || 0,
                height: Number(row.height) || 0,
            }));
        } else if (p.tokenEstimator?.mode === 'formula' && p.tokenEstimator.expression) {
            newPricing.tokenEstimatorMode = 'formula';
            newPricing.tokenFormulaExpression = p.tokenEstimator.expression as TokenFormulaNode;
            newPricing.tokenFormulaTokens = formulaNodeToTokens(newPricing.tokenFormulaExpression);
            newPricing.tokenFormulaText = p.tokenEstimator.expressionText?.trim()
                || serializeFormulaExpression(newPricing.tokenFormulaExpression).text;
            newPricing.tokenFormulaEditorError = '';
            newPricing.tokenFormulaLookups = (p.tokenEstimator.lookups || []).map((lookup) => ({
                id: lookup.id,
                label: lookup.label,
                source: lookup.source,
                key: lookup.key,
                table: lookup.table,
                fallback: Number(lookup.fallback || 0),
            }));
            newPricing.tokenFormulaResultType = effectiveFormulaResultType(
                newPricing.tokenFormulaExpression,
                p.tokenEstimator.resultType === 'vendor_cost_usd' ? 'vendor_cost_usd' : 'output_tokens',
            );
            newPricing.tokenFormulaPresetKey = p.tokenEstimator.presetKey || '';
            newPricing.tokenFormulaRounding = newPricing.tokenFormulaResultType === 'vendor_cost_usd'
                ? 'none'
                : p.tokenEstimator.rounding || 'round';
            newPricing.tokenFormulaMultiplyByQuantity = p.tokenEstimator.multiplyByQuantity !== false;
            if (p.tokenEstimator.notesMarkdown) {
                // قالب/سینک محتوای خودش را دارد؛ ارجاع قبلی به آموزش مشترک اعتبار ندارد
                newPricing.tokenFormulaNotes = p.tokenEstimator.notesMarkdown;
                newPricing.tokenFormulaNotesRef = null;
            }
        }

        // روی همان جدولی اعمال می‌شود که الان انتخاب شده (پیش‌فرض یا ارائه‌دهنده)
        setEditingPricing((current) => {
            // توضیحات نوشته‌شده هنگام apply کردن قیمت/قالب جدید گم نشوند
            if (!newPricing.tokenFormulaNotes.trim() && current.tokenFormulaNotes.trim()) {
                newPricing.tokenFormulaNotes = current.tokenFormulaNotes;
                newPricing.tokenFormulaNotesRef = current.tokenFormulaNotesRef;
            }
            return newPricing;
        });
        // provenance مدل فقط برای قیمت پیش‌فرض است
        if (provenance && !activeProviderTable) {
            setMetadata((current) => [
                ...current.filter((item) => item.key !== 'pricingProvenance'),
                { key: 'pricingProvenance', value: JSON.stringify(provenance) },
            ]);
        }
    };

    const selectedProvider = providers.find((p) => p._id === model.providerId);
    const activeTabMeta = visibleTabs.find((tab) => tab.id === activeTab) ?? MODEL_EDIT_SECTIONS[0];

    const sectionLabel = SECTION_OPTIONS.find((option) => option.value === model.section)?.label ?? model.section;
    const classLabel = CLASS_OPTIONS.find((option) => option.value === model.class)?.label ?? model.class;
    const metadataCount = metadata.filter((item) => item.key.trim()).length;
    const markupLabel = model.markupPercent === ''
        ? (globalMarkupPercent != null ? `سراسری (${globalMarkupPercent}٪)` : 'سراسری')
        : `${model.markupPercent}٪ (اختصاصی)`;

    const modeSummaries = useMemo(
        () => modes.map((mode) => ({
            editorId: mode.editorId,
            modeType: mode.modeType,
            endpointPath: mode.endpointPath,
            isDefault: mode.isDefault,
            priority: mode.priority,
            routesCount: mode.routes?.length ?? 0,
        })),
        [modes],
    );

    const settingSummaries = useMemo(
        () => settingsSchema
            .map((field, index) => ({
                index,
                key: field.key,
                label: field.labelFa || field.label || field.key,
                type: field.type,
            }))
            .filter((field) => field.key.trim()),
        [settingsSchema],
    );

    // ترتیب فیلدهای تنظیمات = ترتیب نمایش در استودیو؛ با کشیدن دستگیره‌ی هر کارت عوض می‌شود
    const moveSettingField = (from: number, to: number) => {
        setSettingsSchema((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
        setExpandedFieldIdx((current) => remapIndexAfterMove(current, from, to));
    };
    const settingsSort = useSortableList({
        count: settingsSchema.length,
        getItemElement: (index) => document.getElementById(`model-setting-${index}`),
        getHandleElement: (index) => document.getElementById(`model-setting-handle-${index}`),
        onMove: moveSettingField,
    });

    const jumpToMode = (editorId: string) => {
        setActiveTab('modes');
        setFocusedModeEditorId(editorId);
        setFocusNonce((n) => n + 1);
    };

    const jumpToSetting = (index: number) => {
        pendingSettingFocusRef.current = index;
        setExpandedFieldIdx(null);
        setActiveTab('settings');
        setFocusNonce((n) => n + 1);
    };

    useEffect(() => {
        const targetIndex = pendingSettingFocusRef.current;
        if (targetIndex == null || activeTab !== 'settings') return;

        setExpandedFieldIdx(targetIndex);

        const scrollToSetting = () => {
            pendingSettingFocusRef.current = null;
            document.getElementById(`model-setting-header-${targetIndex}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        };

        requestAnimationFrame(() => {
            requestAnimationFrame(scrollToSetting);
        });
    }, [activeTab, focusNonce]);

    const summaryProps = {
        displayName: model.displayName,
        modelName: model.name,
        providerLabel: selectedProvider?.displayName || selectedProvider?.name || '',
        sectionLabel,
        classLabel,
        isActive: model.isActive,
        markupLabel,
        modeItems: modeSummaries,
        settingItems: settingSummaries,
        metadataCount,
        activeTabLabel: activeTabMeta.short,
        onModeClick: jumpToMode,
        onSettingClick: jumpToSetting,
    };

    const handleSettingsSyncApply = (
        fields: Array<{
            key: string;
            label: string;
            labelFa?: string;
            type: string;
            placeholder?: string;
            hintFa?: string;
            helpFa?: string;
            min?: number;
            max?: number;
            step?: number;
            optionsSource?: string;
            options?: NodeSettingFieldOption[];
            payloadPath?: string;
            transform?: NodeSettingFieldForm['transform'];
            sendToProvider?: boolean;
            urlSource?: NodeSettingUrlSourcePayload;
        }>,
        provenance?: {
            sourceUrl: string;
            fetchedAt: string;
            docAnchor: string;
            excerptHash: string;
            parserVersion: string;
            warnings: string[];
        },
    ) => {
        // راهنمای کاربر (helpFa) نوشته‌شده‌ی ادمین هنگام سینک از بین نرود —
        // فیلدهای هم‌کلید راهنمای قبلی خودشان را نگه می‌دارند و hintFa مستندات فقط برای فیلد بی‌راهنما استفاده می‌شود.
        setSettingsSchema((prev) => fields.map((field) => {
            const previous = prev.find((item) => item.key === field.key);
            if (field.helpFa == null && previous?.helpFa.trim()) {
                return settingFieldFromApi({ ...field, hintFa: '', helpFa: previous.helpFa });
            }
            return settingFieldFromApi(field);
        }));
        if (provenance) {
            setMetadata((current) => [
                ...current.filter((item) => item.key !== 'settingsProvenance'),
                { key: 'settingsProvenance', value: JSON.stringify(provenance) },
            ]);
        }
    };

    const handleSubmit = async () => {
        if (!token) return;

        try {
            const pricingTables: Array<{ label: string; pricing: ModelPricingForm }> = [
                { label: 'قیمت پیش‌فرض', pricing: model.pricing },
                ...providerPricing.map((table) => ({
                    label: `جدول ${pricingTableLabel(table, providerLabel)}`,
                    pricing: table.pricing,
                })),
            ];
            for (const table of pricingTables) {
                if (table.pricing.tokenEstimatorMode !== 'formula') continue;
                if (table.pricing.tokenFormulaEditorError) {
                    throw new Error(`${table.label}: ${table.pricing.tokenFormulaEditorError}`);
                }
                const formula = formulaTokensToNode(table.pricing.tokenFormulaTokens);
                if (!formula.expression) {
                    throw new Error(`${table.label}: ${formula.error || 'فرمول پیش‌بینی معتبر نیست.'}`);
                }
            }
            const providerPricingErrors = validateProviderPricingTables(providerPricing, modes, providerLabel);
            if (providerPricingErrors.length) throw new Error(providerPricingErrors[0]);
            const actualCostErrors = [
                ...validateActualCost(actualCost, 'تنظیم پیش‌فرض مدل'),
                ...modes.flatMap((mode, index) => validateActualCost(
                    mode.actualCost,
                    `mode ${mode.modeType || index + 1}`,
                )),
            ];
            if (actualCostErrors.length) throw new Error(actualCostErrors[0]);
            const modesPayload = buildModesPayload(modes);
            const requestProfile = parseRequestProfileText(
                requestProfileText,
                'requestProfile مدل',
            );
            setIsSubmitting(true);
            const pricing = buildPricingPayload(model.pricing);
            const payload: ProviderModelPayload = {
                name: model.name,
                displayName: model.displayName,
                description: model.description.trim(),
                iconSvg: model.iconSvg,
                platformIconId: model.iconSvg.trim() ? model.platformIconId : '',
                providerId: model.providerId,
                section: model.section,
                class: model.class,
                isActive: model.isActive,
                pricing,
                providerPricing: providerPricing.map((table) => ({
                    providerId: table.providerId,
                    ...(table.modeIds.length ? { modeIds: table.modeIds } : {}),
                    pricing: buildPricingPayload(table.pricing),
                })),
                metadata,
                settingsSchema: settingsSchema
                    .filter((f) => f.key.trim())
                    .map(buildSettingFieldPayload),
                modes: modesPayload,
                requestProfile: requestProfile || null,
                actualCost: buildActualCostPayload(actualCost) || null,
                ...(model.class === 'text' ? { fileInputs: buildFileInputsPayload(fileInputs) } : {}),
                // خالی بودن مارکاپ اختصاصی = null → مارکاپ سراسری billing اعمال می‌شود
                markupPercent: model.markupPercent === '' ? null : Number(model.markupPercent),
            };

            // Keep legacy fields in sync for token mode (API also mirrors them)
            if (model.pricing.mode === 'token') {
                payload.input = Number(model.pricing.inputPer1M) || 0;
                payload.output = Number(model.pricing.outputPer1M) || 0;
                payload.cachedInput = Number(model.pricing.cacheTiers[0]?.ratePer1M) || 0;
            }

            const res = isEditing
                ? await axios.put(`${baseUrl}/api/provider-models/${id}`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  })
                : await axios.post(`${baseUrl}/api/provider-models`, payload, {
                      headers: { authorization: `Bearer ${token}` },
                  });

            if (res.data.statusCode === 200) {
                SuccessToaster({
                    message: `مدل با موفقیت ${isEditing ? 'ویرایش' : 'ایجاد'} شد`,
                });
                router.push('/models');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`${pageStyles.page} ${styles.dense} ${styles.rtl}`}>
            <div className={pageStyles.pageHeader}>
                <div className={pageStyles.titleBlock}>
                    <h3 className={pageStyles.title}>
                        {isEditing ? 'ویرایش' : 'ایجاد'} مدل
                        {model.displayName || model.name ? (
                            <span style={{ fontWeight: 500, opacity: 0.7 }}> — {model.displayName || model.name}</span>
                        ) : null}
                    </h3>
                    <p className={pageStyles.description}>
                        هر بخش در یک تب جداگانه است. خلاصه تنظیمات در دسکتاپ کنار فرم و در موبایل از دکمه «خلاصه تنظیمات» باز می‌شود.
                    </p>
                </div>
            </div>

            <div className={pageStyles.tabBarRow}>
                <div className={pageStyles.tabBarWrap}>
                    <SimpleLineTabs
                        tabs={visibleTabs.map((tab) => ({ id: tab.id, label: tab.short }))}
                        activeTab={activeTab}
                        onChange={(tabId) => setActiveTab(tabId as ModelEditSectionId)}
                    />
                </div>
                <ModelEditSummaryMobile {...summaryProps} />
            </div>

            <div className={pageStyles.workspace}>
                <div className={pageStyles.summaryColumn}>
                    <ModelEditSummaryPanel {...summaryProps} />
                </div>

                <div className={pageStyles.tabContentColumn}>
            <div className={pageStyles.form} role="tabpanel" aria-label={activeTabMeta.title}>
                {activeTab === 'basic' ? (
                <ModelEditTabCard title="اطلاعات پایه" subtitle="شناسه، نام، توضیح، ارائه‌دهنده و وضعیت">
                <div className={styles.row}>
                    <label>
                        شناسه اصلی مدل
                        <Field
                            value={model.name}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setModel((prev) => ({ ...prev, name: e }))}
                        />
                        <span className={styles.hint}>
                            به عنوان مثال مدل Claude Opus 4.7 دارای شناسه claude-opus-4-7-20250219 است.
                        </span>
                    </label>
                    <label>
                        اسم مدل
                        <Field
                            value={model.displayName}
                            type="text"
                            className="form-control form-control-sm"
                            onChange={(e) => setModel((prev) => ({ ...prev, displayName: e }))}
                        />
                        <span className={styles.hint}>
                            نام نمایشی مدل. به عنوان مثال Claude Opus 4.7
                        </span>
                    </label>
                </div>

                <div className={styles.row}>
                    <label>
                        توضیح کوتاه مدل
                        <Field
                            value={model.description}
                            type="textarea"
                            rows={2}
                            className="form-control form-control-sm"
                            onChange={(e) => setModel((prev) => ({ ...prev, description: e }))}
                        />
                        <span className={styles.hint}>
                            یک جمله کوتاه که زیر نام مدل در لیست انتخاب مدل استودیو نمایش داده می‌شود. مثلاً «سریع و ارزان، مناسب طرح‌های اولیه».
                        </span>
                    </label>
                </div>

                <div className={styles.row}>
                    <label>
                        * ارائه دهنده هوش مصنوعی
                        <Field
                            value={model.providerId}
                            disabled={providers.length === 0}
                            type="select"
                            className="form-control form-control-sm"
                            options={providers.map((item) => ({
                                label: item.displayName || item.name,
                                value: item._id,
                            }))}
                            onChange={(e) => setModel((prev) => ({ ...prev, providerId: e }))}
                        />
                        <span className={styles.hint}>
                            ارائه دهنده هوش مصنوعی که قصد افزودن مدلی از آن را دارید.
                        </span>
                    </label>
                    <label>
                        * نوع سرویس‌دهی
                        <Field
                            value={model.section}
                            type="select"
                            className="form-control form-control-sm"
                            options={SECTION_OPTIONS}
                            onChange={(e) => setModel((prev) => ({ ...prev, section: e }))}
                        />
                        <span className={styles.hint}>
                            نوع سرویس‌دهی مدل (Standard، Batch، Flex یا Priority).
                        </span>
                    </label>
                </div>

                <div className={styles.row}>
                    <label>
                        * نوع مدل
                        <Field
                            value={model.class}
                            type="select"
                            className="form-control form-control-sm"
                            options={CLASS_OPTIONS}
                            onChange={handleClassChange}
                        />
                        <span className={styles.hint}>
                            نوع خروجی مدل (متن، تصویر، صوت و ...).
                        </span>
                    </label>
                    <label>
                        وضعیت انتشار
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
                            <button
                                type="button"
                                onClick={() => setModel((prev) => ({ ...prev, isActive: !prev.isActive }))}
                                style={{
                                    position: 'relative',
                                    width: 42,
                                    height: 24,
                                    border: 'none',
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    padding: 0,
                                    background: model.isActive ? '#137333' : '#9aa0a6',
                                    transition: 'background-color 0.2s',
                                }}
                                title={model.isActive ? 'مدل فعال — در Studio و لیست‌های کاربر نمایش داده می‌شود' : 'مدل غیرفعال — در هیچ لیستی دیده نمی‌شود'}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 3,
                                        left: model.isActive ? 21 : 3,
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        background: '#fff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                                        transition: 'left 0.2s',
                                    }}
                                />
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: model.isActive ? '#137333' : '#9aa0a6' }}>
                                {model.isActive ? 'فعال' : 'غیرفعال'}
                            </span>
                        </div>
                        <span className={styles.hint}>
                            مدل‌های غیرفعال در Studio، pricing و سایر لیست‌های کاربر نمایش داده نمی‌شوند.
                        </span>
                    </label>
                </div>
                <div className={styles.row}>
                    <label>
                        درصد مارکاپ اختصاصی (سود)
                        <Field
                            value={model.markupPercent}
                            type="number"
                            min={0}
                            max={1000}
                            step={1}
                            className="form-control form-control-sm"
                            placeholder={globalMarkupPercent != null
                                ? `خالی = مارکاپ سراسری (${globalMarkupPercent}٪)`
                                : 'خالی = مارکاپ سراسری'}
                            onChange={(e) => setModel((prev) => ({ ...prev, markupPercent: e === '' ? '' : Number(e) }))}
                        />
                        <span className={styles.hint}>
                            درصد سود روی هزینه vendor همین مدل هنگام مصرف. اگر خالی بماند، مارکاپ اصلی از
                            {' '}تنظیمات Billing (مارکاپ مصرف AI{globalMarkupPercent != null ? ` = ${globalMarkupPercent}٪` : ''}) اعمال می‌شود.
                        </span>
                    </label>
                </div>
                <div className={styles.row}>
                    <div className={platformIconStyles.iconField}>
                        <span className={platformIconStyles.fieldTitle}>آیکون مدل</span>
                        <PlatformIconField
                            iconSvg={model.iconSvg}
                            platformIconId={model.platformIconId}
                            icons={platformIcons}
                            rows={4}
                            onPick={() => setPlatformIconPicker({ kind: 'model' })}
                            onChange={(iconSvg) => setModel((prev) => ({ ...prev, iconSvg }))}
                            onClear={() => setModel((prev) => ({ ...prev, iconSvg: '', platformIconId: '' }))}
                        />
                        <span className={styles.hint}>
                            کنار نام مدل در سلکت چت نمایش داده می‌شود. از «آیکون‌های عمومی» انتخاب کنید تا با ویرایش آن‌جا این‌جا هم به‌روز شود، یا SVG را دستی paste کنید.
                        </span>
                    </div>
                </div>
                </ModelEditTabCard>
                ) : null}

                {activeTab === 'modes' ? (
                <ModelEditTabCard
                    title="مدیریت مودهای مدل"
                    subtitle={`${modes.length} مود · endpoint و route`}
                >
                    <ModelModesEditor
                        value={modes}
                        onChange={setModes}
                        providers={providers}
                        parentProviderId={model.providerId}
                        modelRequestProfileText={requestProfileText}
                        onModelRequestProfileChange={setRequestProfileText}
                        focusedModeEditorId={focusedModeEditorId}
                        focusNonce={focusNonce}
                        settingsSchema={settingsSchema}
                    />
                </ModelEditTabCard>
                ) : null}

                {activeTab === 'capabilityModes' && isEditing ? (
                <ModelEditTabCard
                    title="حالت‌های قابلیتی"
                    subtitle="کدام حالت‌های کاتالوگ برای این مدل فعال باشد و از کدام مود اجرا شود"
                >
                        <ModelCapabilityModes modelId={id} />
                </ModelEditTabCard>
                ) : null}

                {activeTab === 'actualCost' ? (
                <ModelEditTabCard
                    title="هزینه واقعی provider"
                    subtitle="مسیر مبلغ واقعی در پاسخ provider"
                >
                    <ActualCostEditor
                        modelValue={actualCost}
                        modes={modes}
                        onModelChange={setActualCost}
                        onModeChange={(editorId, value) => setModes((current) => current.map((mode) =>
                            mode.editorId === editorId ? { ...mode, actualCost: value } : mode
                        ))}
                    />
                </ModelEditTabCard>
                ) : null}

                {activeTab === 'pricing' ? (
                <ModelEditTabCard
                    title="ساختار هزینه و قیمت‌گذاری"
                    subtitle={`حالت قیمت‌گذاری و نرخ‌ها · در حال ویرایش: ${editingPricingLabel}`}
                >

                    <ProviderPricingTables
                        tables={providerPricing}
                        activeKey={activeProviderTable ? activeProviderTable.editorId : DEFAULT_PRICING_KEY}
                        onSelect={setActivePricingKey}
                        onAdd={addProviderPricingTable}
                        onPatch={patchProviderPricingTable}
                        onRemove={removeProviderPricingTable}
                        providers={providers}
                        modes={modes}
                        parentProviderId={model.providerId}
                        settingsSchema={settingsSchema}
                        sameAsDefault={tablesSameAsDefault}
                    />

                    {token && (
                        <ModelConfigPresetPanel
                            key={`ModelConfigPresetPanel-${activeProviderTable?.editorId || DEFAULT_PRICING_KEY}`}
                            kind="pricing"
                            modelId={isEditing ? id : undefined}
                            modelName={model.name}
                            token={token}
                            baseUrl={baseUrl}
                            canSave={Boolean(editingPricing?.mode)}
                            getCurrentPayload={() => ({
                                pricing: buildPricingPayload(editingPricing) as ModelPricing,
                            })}
                            onApplyPricing={handleSyncApply}
                        />
                    )}

                <div className={styles.row}>
                    <label>
                        * حالت قیمت‌گذاری
                        <Field
                            value={editingPricing.mode}
                            type="select"
                            className="form-control form-control-sm"
                            options={PRICING_MODE_OPTIONS}
                            onChange={handleModeChange}
                        />
                        <span className={styles.hint}>{modeHint}</span>
                    </label>
                </div>

                {isTokenMode && (
                    <>
                        <div className={styles.row}>
                            <label>
                                Input / 1M
                                <Field
                                    value={editingPricing.inputPer1M}
                                    type="number"
                                    className="form-control form-control-sm"
                                    onChange={(e) =>
                                        updatePricing({
                                            inputPer1M: e === '' ? 0 : Number(e),
                                        })
                                    }
                                />
                                <span className={styles.hint}>قیمت توکن‌های ورودی به ازای هر ۱ میلیون توکن</span>
                            </label>
                            <label>
                                Output / 1M
                                <Field
                                    value={editingPricing.outputPer1M}
                                    type="number"
                                    className="form-control form-control-sm"
                                    onChange={(e) =>
                                        updatePricing({
                                            outputPer1M: e === '' ? 0 : Number(e),
                                        })
                                    }
                                />
                                <span className={styles.hint}>قیمت توکن‌های خروجی به ازای ۱ میلیون توکن</span>
                            </label>
                        </div>

                        <div className={styles.column}>
                            <h6>Cache tiers</h6>
                            <div
                                className={styles.addButton}
                                onClick={() =>
                                    updatePricing({
                                        cacheTiers: [
                                            ...editingPricing.cacheTiers,
                                            { id: '', label: '', ratePer1M: 0 },
                                        ],
                                    })
                                }
                            >
                                افزودن cache tier
                            </div>
                            {editingPricing.cacheTiers.map((tier, index) => (
                                <div key={index} className={`${styles.metadataRow} ${styles.cacheTierRow}`}>
                                    <label>
                                        شناسه
                                        <Field
                                            value={tier.id}
                                            type="text"
                                            className="form-control form-control-sm"
                                            onChange={(e) =>
                                                updatePricing({
                                                    cacheTiers: editingPricing.cacheTiers.map((t, i) =>
                                                        i === index ? { ...t, id: e } : t
                                                    ),
                                                })
                                            }
                                        />
                                    </label>
                                    <label>
                                        عنوان
                                        <Field
                                            value={tier.label}
                                            type="text"
                                            className="form-control form-control-sm"
                                            onChange={(e) =>
                                                updatePricing({
                                                    cacheTiers: editingPricing.cacheTiers.map((t, i) =>
                                                        i === index ? { ...t, label: e } : t
                                                    ),
                                                })
                                            }
                                        />
                                    </label>
                                    <label>
                                        Rate / 1M
                                        <Field
                                            value={tier.ratePer1M}
                                            type="number"
                                            className="form-control form-control-sm"
                                            onChange={(e) =>
                                                updatePricing({
                                                    cacheTiers: editingPricing.cacheTiers.map((t, i) =>
                                                        i === index
                                                            ? { ...t, ratePer1M: e === '' ? 0 : Number(e) }
                                                            : t
                                                    ),
                                                })
                                            }
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={() =>
                                            updatePricing({
                                                cacheTiers: editingPricing.cacheTiers.filter((_, i) => i !== index),
                                            })
                                        }
                                    >
                                        <MdOutlineClose size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {isUnitMode && (
                    <div className={styles.row}>
                        <label>
                            مبلغ (USD)
                            <Field
                                value={editingPricing.unitAmount}
                                type="number"
                                className="form-control form-control-sm"
                                onChange={(e) =>
                                    updatePricing({
                                        unitAmount: e === '' ? 0 : Number(e),
                                    })
                                }
                            />
                            <span className={styles.hint}>مبلغ به ازای هر واحد</span>
                        </label>
                        <label>
                            واحد
                            <Field
                                value={editingPricing.unitPer}
                                type="select"
                                className="form-control form-control-sm"
                                options={UNIT_PER_OPTIONS}
                                onChange={(e) => updatePricing({ unitPer: e as UnitPer })}
                            />
                            <UnitPerHint per={editingPricing.unitPer} pricing={editingPricing} />
                        </label>
                    </div>
                )}

                {isMatrixMode && (
                    <MatrixPricingEditor
                        key={`MatrixPricingEditor-${activeProviderTable?.editorId || DEFAULT_PRICING_KEY}`}
                        pricing={editingPricing}
                        updatePricing={updatePricing}
                        settingsSchema={settingsSchema}
                        runtimeMetrics={runtimeMetrics}
                    />
                )}
                </ModelEditTabCard>
                ) : null}

                {activeTab === 'formula' ? (
                <ModelEditTabCard
                    title="فرمول هزینه"
                    subtitle={`پیش‌بینی توکن و هزینه با ترکیب فیلدها، عملگر و پرانتز · در حال ویرایش: ${editingPricingLabel}`}
                >
                {providerPricing.length ? (
                    <div className={pageStyles.pricingTableSwitch}>
                        <SimpleLineTabs
                            tabs={pricingTabs}
                            activeTab={activeProviderTable ? activeProviderTable.editorId : DEFAULT_PRICING_KEY}
                            onChange={setActivePricingKey}
                        />
                        <span className={styles.hint}>
                            هر جدول قیمت فرمول خودش را دارد؛ جدول‌ها را در تب «قیمت‌گذاری» اضافه یا حذف کنید.
                        </span>
                    </div>
                ) : null}
                {token && (
                    <FormulaTutorialPanel
                        key={`FormulaTutorialPanel-${activeProviderTable?.editorId || DEFAULT_PRICING_KEY}`}
                        token={token}
                        baseUrl={baseUrl}
                        modelId={isEditing ? id : undefined}
                        modelName={model.displayName || model.name}
                        linkedRef={editingPricing.tokenFormulaNotesRef}
                        currentNotes={editingPricing.tokenFormulaNotes}
                        onLink={(tutorial) => updatePricing({
                            tokenFormulaNotes: tutorial.notesMarkdown || '',
                            tokenFormulaNotesRef: {
                                tutorialId: tutorial._id,
                                name: tutorial.name,
                            },
                        })}
                        onUnlink={() => updatePricing({ tokenFormulaNotesRef: null })}
                    />
                )}
                <ExpressionTokenEstimatorEditor
                    key={`ExpressionTokenEstimatorEditor-${activeProviderTable?.editorId || DEFAULT_PRICING_KEY}`}
                    pricing={editingPricing}
                    updatePricing={updatePricing}
                    settingsSchema={settingsSchema}
                    runtimeMetrics={runtimeMetrics}
                    markupPercent={model.markupPercent === '' ? globalMarkupPercent : Number(model.markupPercent)}
                />
                </ModelEditTabCard>
                ) : null}

                {activeTab === 'metadata' ? (
                <ModelEditTabCard title="متادیتا" subtitle={`${metadataCount} مورد`}>
                <div className={styles.column}>
                    <h6>متادیتاها</h6>
                    <div
                        className={styles.addButton}
                        onClick={() => setMetadata((prev) => [...prev, { key: '', value: '' }])}
                    >
                        افزودن متادیتا
                    </div>

                    {metadata.length === 0 ? (
                        <div className={styles.emptyPlaceholder}>متادیتایی ثبت نشده است.</div>
                    ) : (
                        metadata.map((item, index) => (
                            <div key={index} className={styles.metadataRow}>
                                <label>
                                    عنوان
                                    <Field
                                        value={item.key}
                                        type="text"
                                        className="form-control form-control-sm"
                                        onChange={(e) =>
                                            setMetadata((prev) =>
                                                prev.map((meta, i) =>
                                                    i === index ? { ...meta, key: e } : meta
                                                )
                                            )
                                        }
                                    />
                                </label>
                                <label>
                                    مقدار
                                    <Field
                                        value={item.value}
                                        type="text"
                                        className="form-control form-control-sm"
                                        onChange={(e) =>
                                            setMetadata((prev) =>
                                                prev.map((meta, i) =>
                                                    i === index ? { ...meta, value: e } : meta
                                                )
                                            )
                                        }
                                    />
                                </label>
                                <button
                                    type="button"
                                    className={styles.removeBtn}
                                    onClick={() =>
                                        setMetadata((prev) => prev.filter((_, i) => i !== index))
                                    }
                                >
                                    <MdOutlineClose size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
                </ModelEditTabCard>
                ) : null}

                {activeTab === 'settings' ? (
                <ModelEditTabCard
                    title="تنظیمات مدل"
                    subtitle={`${settingsSchema.length} فیلد تنظیمات`}
                >
                    {token && (
                        <ModelSettingsSync
                            modelName={model.name}
                            modelClass={model.class}
                            providerName={selectedProvider?.name}
                            token={token}
                            baseUrl={baseUrl}
                            currentSettings={settingsSchema
                                .filter((field) => field.key.trim())
                                .map(buildSettingFieldPayload)}
                            onApply={handleSettingsSyncApply}
                        />
                    )}

                    {token && (
                        <ModelConfigPresetPanel
                            kind="settings"
                            modelId={isEditing ? id : undefined}
                            modelName={model.name}
                            token={token}
                            baseUrl={baseUrl}
                            canSave={settingsSchema.some((f) => f.key.trim())}
                            getCurrentPayload={() => ({
                                settingsSchema: settingsSchema
                                    .filter((f) => f.key.trim())
                                    .map(buildSettingFieldPayload),
                            })}
                            onApplySettings={handleSettingsSyncApply}
                        />
                    )}

                <div className={settingStyles.guide}>
                    <LuInfo size={15} aria-hidden />
                    <ul>
                        <li>هر فیلد یک تنظیم در پاپ‌اور مدل در چت و ورک‌فلو است؛ روی ردیف بزنید تا باز شود.</li>
                        <li>سوییچ «ارسال به AI» تعیین می‌کند کلید و مقدار فیلد در درخواست provider برود یا فقط داخل استودیو بماند (مثلاً مبدأ یک فیلد ترکیبی).</li>
                        <li>«راهنمای کاربر» با کلیک روی آیکون (!) کنار عنوان تنظیم به کاربر نمایش داده می‌شود.</li>
                    </ul>
                </div>
                <div className={settingStyles.listHeader}>
                    <div>
                        <h6 className={settingStyles.listTitle}>فیلدهای تنظیمات</h6>
                        {settingsSchema.length ? (
                            <span className={settingStyles.listStats}>
                                {settingsSchema.length} فیلد · {settingsSchema.filter(settingIsSent).length} ارسال می‌شود
                                · {settingsSchema.filter((f) => !settingIsSent(f)).length} فقط داخلی
                            </span>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className={settingStyles.addBtn}
                        onClick={() => {
                            setSettingsSchema((prev) => [...prev, emptySettingField()]);
                            setExpandedFieldIdx(settingsSchema.length);
                        }}
                    >
                        + افزودن فیلد
                    </button>
                </div>

                {settingsSchema.length === 0 ? (
                    <div className={settingStyles.empty}>فیلد تنظیماتی تعریف نشده است.</div>
                ) : (
                    settingsSchema.map((field, idx) => (
                        <SettingFieldEditor
                            key={field.uid}
                            field={field}
                            index={idx}
                            schema={settingsSchema}
                            open={expandedFieldIdx === idx}
                            onToggle={() => setExpandedFieldIdx(expandedFieldIdx === idx ? null : idx)}
                            onPatch={(patch) => setSettingsSchema((prev) =>
                                prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
                            )}
                            onRemove={() => {
                                setSettingsSchema((prev) => prev.filter((_, i) => i !== idx));
                                setExpandedFieldIdx((current) => (current == null || current === idx
                                    ? null
                                    : current > idx ? current - 1 : current));
                            }}
                            token={token}
                            baseUrl={baseUrl}
                            providerName={selectedProvider?.name}
                            icons={platformIcons}
                            onPickIcon={(rowIdx) => setPlatformIconPicker({ kind: 'option', fieldIdx: idx, rowIdx })}
                            onIconChange={(rowIdx, patch) => setOptionIcon(idx, rowIdx, patch)}
                            dragHandleProps={settingsSchema.length > 1 ? settingsSort.handleProps(idx) : undefined}
                            dragging={settingsSort.dragIndex === idx}
                            dropIndicator={settingsSort.dropIndicator(idx)}
                        />
                    ))
                )}
                </ModelEditTabCard>
                ) : null}

                {activeTab === 'fileInputs' && model.class === 'text' ? (
                    <ModelFileInputsEditor value={fileInputs} onChange={setFileInputs} />
                ) : null}
                {activeTab === 'checklist' && isEditing ? (
                <ModelEditTabCard title="چک‌لیست مدل" subtitle="تیک آیتم‌های انجام‌شده این مدل">
                <ModelChecklistSection modelId={id} token={token} baseUrl={baseUrl} />
                </ModelEditTabCard>
                ) : null}
            </div>
                </div>
            </div>

            <div className={pageStyles.stickyFooter}>
                <span className={pageStyles.footerHint}>
                    تغییرات پس از ذخیره اعمال می‌شوند
                </span>
                <button className={pageStyles.submit} disabled={isSubmitting} onClick={handleSubmit}>
                    {isEditing ? 'ذخیره تغییرات' : 'ایجاد مدل'}
                </button>
            </div>

            {platformIconPicker && token ? (
                <PlatformIconPickerModal
                    token={token}
                    baseUrl={baseUrl}
                    onClose={() => setPlatformIconPicker(null)}
                    onSelect={handlePlatformIconPick}
                />
            ) : null}
        </div>
    );
}
