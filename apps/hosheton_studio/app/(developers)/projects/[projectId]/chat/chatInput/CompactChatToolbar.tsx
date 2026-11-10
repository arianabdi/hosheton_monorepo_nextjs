'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { RiImageLine, RiMicLine, RiVidicon2Line } from 'react-icons/ri';
import { LuCamera, LuChevronDown, LuCpu, LuMessageSquareText, LuSettings2, LuSparkles, LuSun } from 'react-icons/lu';
import { ModeIcon, MODE_GROUP_LABELS, SvgMarkup, sanitizeSvg } from '../lib/modeIcon';
import { nodeCatalogApi } from '@/app/(developers)/projects/lib/node-catalog-api';
import { providersApi, type AiModeItem, type DirectorPresetItem, type ProviderModelItem } from '@/app/(developers)/projects/lib/providers-api';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { catalogLabel } from '@/app/lib/i18n/catalogLabel';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import type { NodeCatalogEntry, NodeSettingField, NodeSettingFieldOption } from '@/app/(developers)/projects/types/node-catalog';
import type { StudioChatMediaKind, StudioChatSettings, TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import {
    applyDerivedSettings,
    deriveBlockers,
    resolveDerivedValue,
} from '@/app/(developers)/projects/lib/derived-settings';
import { DEFAULT_CHAT_SETTINGS, useOptionalChatSession } from '../ChatSessionContext';
import { chatAttachmentsRuntimeMetrics } from '../lib/chat-attachment-kind';
import { CHAT_KIND_TO_NODE, chatEstimateRequest, estimateUnitKey } from '../lib/chat-cost-estimate';
import { classifyChatAttachmentKind, isChatFileAttachment } from '../lib/chat-attachment-kind';
import { useAngleStudioMode } from '@/app/(developers)/projects/lib/useAngleStudioMode';
import {
    defaultAngleStudioState,
    isAngleStudioOn,
    isToolMode,
    readAngleStudioState,
    resolveAngleShots,
    withResolvedShots,
    type AngleStudioState,
} from '@/app/(developers)/projects/lib/angle-studio';
import AngleStudioDialog from '@/app/(developers)/projects/components/AngleStudio/AngleStudioDialog';
import { AngleStudioGlyph } from '@/app/(developers)/projects/components/AngleStudio/AngleStudioGlyph';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import {
    menuPopoverPlacement,
    panelPopoverPlacement,
    resolvePopoverBounds,
    useCloseOnAnchorScroll,
    verticalMenuPlacement,
} from '../lib/popover-bounds';
import DirectorPickerModal, { type DirectorPickerCard } from './DirectorPickerModal';
import SelectOptionsField from './SelectOptionsField';
import SettingHelp, { type SettingHelpInfo } from '@/app/(developers)/projects/components/SettingHelpModal';
import { useOptionAudioPreview } from '../lib/useOptionAudioPreview';
import { optionIconsEnabled } from '@/app/(developers)/projects/lib/option-preview';
import styles from './CompactChatToolbar.module.scss';

const KIND_META: { id: StudioChatMediaKind; icon: typeof RiImageLine; labelKey: string }[] = [
    { id: 'image', icon: RiImageLine, labelKey: 'chat_kind_image' },
    { id: 'video', icon: RiVidicon2Line, labelKey: 'chat_kind_video' },
    { id: 'audio', icon: RiMicLine, labelKey: 'chat_kind_audio' },
    { id: 'text', icon: LuMessageSquareText, labelKey: 'chat_kind_text' },
];

/** سرعت حرکت متن خلاصه موبایل (px/s) — آرام مثل تابلوی بالای اتوبوس */
const MARQUEE_SPEED = 28;
/** مکث ابتدا و انتهای مسیر (ثانیه) */
const MARQUEE_HOLD = 1.4;

/**
 * متن یک‌خطی که اگر جا نشود آرام تا انتها حرکت می‌کند، کمی مکث، و دوباره از اول.
 * اگر جا شود (یا کاربر کاهش حرکت خواسته باشد) ثابت می‌ماند.
 */
function MarqueeText({ text, className }: { text: string; className?: string }) {
    const boxRef = useRef<HTMLSpanElement>(null);
    const innerRef = useRef<HTMLSpanElement>(null);
    const [moving, setMoving] = useState(false);

    useLayoutEffect(() => {
        const box = boxRef.current;
        const inner = innerRef.current;
        if (!box || !inner) return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let animation: Animation | null = null;
        let lastShift = 0;
        const sync = () => {
            const overflow = Math.ceil(inner.scrollWidth - box.clientWidth);
            // متن راست‌به‌چپ به سمت راست حرکت می‌کند
            const rtl = getComputedStyle(inner).direction === 'rtl';
            const shift = reduce || overflow <= 2 ? 0 : (rtl ? overflow : -overflow);
            if (shift === lastShift) return;
            lastShift = shift;
            animation?.cancel();
            animation = null;
            setMoving(shift !== 0);
            if (!shift) return;
            const duration = (Math.abs(shift) / MARQUEE_SPEED + MARQUEE_HOLD * 2) * 1000;
            const hold = (MARQUEE_HOLD * 1000) / duration;
            animation = inner.animate([
                { transform: 'translateX(0)', offset: 0 },
                { transform: 'translateX(0)', offset: hold },
                { transform: `translateX(${shift}px)`, offset: 1 - hold },
                { transform: `translateX(${shift}px)`, offset: 1 },
            ], { duration, iterations: Infinity, easing: 'linear' });
        };
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(box);
        return () => {
            observer.disconnect();
            animation?.cancel();
        };
    }, [text]);

    return (
        <span ref={boxRef} className={`${className || ''} ${moving ? styles.marqueeActive : ''}`} dir="auto">
            <span ref={innerRef} className={styles.marqueeInner}>{text}</span>
        </span>
    );
}

function optionSvgHtml(svg?: string) {
    const raw = String(svg || '').trim();
    if (!raw.toLowerCase().includes('<svg')) return '';
    return raw
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function fieldValue(settings: StudioChatSettings, key: string): string {
    const nested = settings.modelSettings?.[key];
    if (nested != null && nested !== '') return String(nested);
    if (key === 'aspectRatio') return String(settings.aspectRatio || '');
    if (key === 'resolution') return String(settings.resolution || '');
    return '';
}

function selectedOption(field: NodeSettingField, value: string): NodeSettingFieldOption | undefined {
    return (field.options || []).find((option) => option.value === value);
}

function pickSelectValue(field: NodeSettingField, settings: StudioChatSettings): string {
    const options = field.options || [];
    if (!options.length) return '';
    const current = fieldValue(settings, field.key);
    if (current && options.some((option) => option.value === current)) return current;
    if (field.key === 'aspectRatio') {
        const match = options.find((option) => option.value === settings.aspectRatio);
        if (match) return match.value;
    }
    if (field.key === 'resolution') {
        const match = options.find((option) => option.value === settings.resolution);
        if (match) return match.value;
    }
    // پیش‌فرضِ تعریف‌شده در naslyar (مثلاً زبان «fa») بر گزینه‌ی اول مقدم است
    const preset = fieldDefault(field);
    if (preset !== undefined) {
        const match = options.find((option) => option.value === String(preset));
        if (match) return match.value;
    }
    return options[0].value;
}

function fieldDefault(field: NodeSettingField): unknown {
    const value = (field as {default?: unknown}).default;
    if (value !== undefined && value !== null && value !== '') return value;
    // numeric fields default to the schema minimum (changeable up to max)
    if (field.type === 'number' || field.type === 'slider') {
        const min = field.min;
        if (min != null && Number.isFinite(Number(min))) return Number(min);
    }
    return undefined;
}

function defaultsFromSchema(schema: NodeSettingField[], settings: StudioChatSettings, pruneUnknown = false) {
    const modelSettings: Record<string, unknown> = { ...(settings.modelSettings || {}) };
    let aspectRatio = settings.aspectRatio;
    let resolution = settings.resolution;
    let changed = false;
    // چت: کلیدهای مدل‌های قبلی (مثلاً size/quality/background) که در اسکیمای این مدل نیستند پاک شوند —
    // وگرنه به snapshot نوبت می‌روند و برچسب نسبت/اندازه‌ی تایل را غلط نشان می‌دهند.
    // نود این کار را نمی‌کند چون modelSettings نود کلیدهای غیر اسکیما هم دارد (modelModeId و…)
    if (pruneUnknown) {
        const schemaKeys = new Set(schema.map((field) => field.key).filter(Boolean));
        for (const key of Object.keys(modelSettings)) {
            if (schemaKeys.has(key)) continue;
            delete modelSettings[key];
            changed = true;
        }
    }
    for (const field of schema) {
        if (field.type === 'select') {
            if (!field.options?.length) continue;
            const next = pickSelectValue(field, { ...settings, modelSettings });
            if (!next) continue;
            const current = fieldValue({ ...settings, modelSettings }, field.key);
            if (current === next && modelSettings[field.key] === next) continue;
            modelSettings[field.key] = next;
            if (field.key === 'aspectRatio') aspectRatio = next;
            if (field.key === 'resolution') resolution = next;
            changed = true;
            continue;
        }
        // text/textarea/number/checkbox/slider defaults are seeded once so they
        // are visible in the UI, persist in chat settings and reach the request
        // even before the worker's schema-default fallback runs.
        const fallback = fieldDefault(field);
        if (fallback === undefined) continue;
        const current = fieldValue({ ...settings, modelSettings }, field.key);
        if (current !== undefined && current !== null && current !== '') continue;
        modelSettings[field.key] = fallback;
        changed = true;
    }
    return changed ? { modelSettings, aspectRatio, resolution } : null;
}

function readDirector(settings: StudioChatSettings) {
    const raw = settings.director && typeof settings.director === 'object' ? settings.director : {};
    return {
        camera: raw.camera && typeof raw.camera === 'object' ? { ...raw.camera } : {},
        lighting: raw.lighting && typeof raw.lighting === 'object' ? { ...raw.lighting } : {},
    };
}

function readChatPanels(settings: StudioChatSettings) {
    const raw = settings.chatPanels && typeof settings.chatPanels === 'object' ? settings.chatPanels : {};
    return {
        mode: raw.mode !== false,
        camera: raw.camera !== false,
        lighting: raw.lighting !== false,
        angles: raw.angles !== false,
    };
}

function presetCards(presets: DirectorPresetItem[], fallbackIcon: string): DirectorPickerCard[] {
    return presets.map((preset) => ({
        id: preset.id,
        title: preset.title,
        titleFa: preset.titleFa,
        description: preset.summaryFa || preset.promptText || '',
        icon: fallbackIcon,
        iconSvg: preset.iconSvg,
        groupKey: preset.layer || 'preset',
        groupTitle: preset.layerTitleFa || preset.layer || 'preset',
        guide: preset.guide,
        guideImages: preset.guideImages,
    }));
}

function ChipGlyph({ iconSvg, fallback }: { iconSvg?: string; fallback: ReactNode }) {
    if (sanitizeSvg(iconSvg)) return <SvgMarkup svg={iconSvg} />;
    return fallback;
}

/** ورودی‌های تولبار — در چت از ChatSession و بیرون از آن (تنظیمات نود) از میزبان */
export type ChatToolbarSource = {
    mediaKind: StudioChatMediaKind;
    setMediaKind: (kind: StudioChatMediaKind) => void;
    settings: StudioChatSettings;
    patchSettings: (patch: Partial<StudioChatSettings>) => void;
    readComposerText: () => string;
    attachments: TemplatePreviewMedia[];
    connectionOk: boolean;
    setComposerBlockers: (blockers: string[]) => void;
    hasTranscript: boolean;
};

export default function CompactChatToolbar({
    narrow = false,
    mobile = false,
    compact = false,
    disabled = false,
    onEstimateChange,
    source,
    nodeType: nodeTypeOverride,
    filterModels,
    showKind = true,
    showDirector = true,
    showAngles = true,
    variant = 'chips',
}: {
    narrow?: boolean;
    mobile?: boolean;
    /** کادر چت جمع‌شده (موبایل): فقط آیکون ریز مدل + همان خط متحرک «مدل | تنظیمات» */
    compact?: boolean;
    disabled?: boolean;
    onEstimateChange?: (estimate: {
        amount: number | null;
        unit: string;
        pricingMode?: string;
        breakdown?: Record<string, unknown>;
    }) => void;
    /** بیرون از چت: منبع تنظیمات (مثلاً دیتای نود) */
    source?: ChatToolbarSource;
    /** نوع نود کاتالوگ برای لود مدل‌ها؛ پیش‌فرض از نوع رسانه چت */
    nodeType?: string;
    /** فیلتر مدل‌های لودشده (مثلاً دسته صوتی نود musicSfx) — باید memo شده باشد */
    filterModels?: (models: ProviderModelItem[]) => ProviderModelItem[];
    /** انتخاب نوع رسانه (تصویر/ویدیو/صوت/متن) */
    showKind?: boolean;
    /** چیپ‌های مود/دوربین/نور — فقط چت از آن‌ها پشتیبانی می‌کند */
    showDirector?: boolean;
    /** چیپ «زاویه و نور» (چت تصویری) — نود workflow بخش خودش را دارد */
    showAngles?: boolean;
    /**
     * chips: چیپ‌های کادر چت (پیش‌فرض). fields: همان کنترل‌ها به شکل فیلد فرم —
     * برچسب بالا + باکس تمام‌عرض شبیه select (سایدبار تنظیمات نود).
     */
    variant?: 'chips' | 'fields';
}) {
    const { t } = useTranslation('projects');
    const lang = useAppStore((s) => s.lang);
    const session = useOptionalChatSession();
    const toolbarSource = source ?? session;
    if (!toolbarSource) throw new Error('CompactChatToolbar needs a ChatSessionProvider or a source prop');
    const {
        mediaKind,
        setMediaKind,
        settings,
        patchSettings,
        readComposerText,
        attachments,
        connectionOk,
        setComposerBlockers,
        hasTranscript,
    } = toolbarSource;
    const toolbarDisabled = disabled || !connectionOk;
    // فقط چتِ متنی قفل است؛ در چت رسانه‌ای جابه‌جایی بین عکس/ویدیو/صوت آزاد است
    // (ولی در هیچ چتی با پیام نمی‌شود وسط کار به حالت متن رفت)
    const kindLocked = hasTranscript && mediaKind === 'text';
    const textOptionDisabled = hasTranscript;
    const [catalog, setCatalog] = useState<NodeCatalogEntry | null>(null);
    const [loadedModels, setModels] = useState<ProviderModelItem[]>([]);
    const models = useMemo(
        () => (filterModels ? filterModels(loadedModels) : loadedModels),
        [filterModels, loadedModels],
    );
    // لیست انتخاب مدل، دسته‌بندی‌شده بر اساس ارائه‌دهنده (به ترتیب اولین ظهور در لیست)
    const modelGroups = useMemo(() => {
        const groups = new Map<string, { title: string; models: ProviderModelItem[] }>();
        for (const model of models) {
            const key = String(model.providerId || model.providerName || '');
            const group = groups.get(key) ?? {
                title: model.providerDisplayName || model.providerName || '',
                models: [],
            };
            group.models.push(model);
            groups.set(key, group);
        }
        return [...groups.values()];
    }, [models]);
    const [modelsClass, setModelsClass] = useState('');
    // اسکیمای تنظیمات به همراه مدلی که برایش بارگذاری شده — بعد از عوض‌شدن مدل، تا اسکیمای
    // مدل جدید نرسیده اسکیمای قبلی نباید روی تنظیمات مدل جدید پیش‌فرض بکارد
    // (وگرنه size/quality/background مدل قبلی در modelSettings مدل جدید می‌ماند)
    const [loadedSchema, setLoadedSchema] = useState<{ modelId: string; fields: NodeSettingField[] }>({ modelId: '', fields: [] });
    const currentModelId = String(settings.modelId || '').trim();
    const schema = useMemo(
        () => (loadedSchema.modelId && loadedSchema.modelId === currentModelId ? loadedSchema.fields : []),
        [loadedSchema, currentModelId],
    );
    const [open, setOpen] = useState(false);
    const [modelOpen, setModelOpen] = useState(false);
    const [kindOpen, setKindOpen] = useState(false);
    const [cost, setCost] = useState<number | null>(null);
    const [estimateDetail, setEstimateDetail] = useState<{
        pricingMode?: string;
        unit?: string;
        breakdown?: Record<string, unknown>;
    }>({});
    const [narrowMenu, setNarrowMenu] = useState(false);
    const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
    const [modelMenuStyle, setModelMenuStyle] = useState<CSSProperties | null>(null);
    const [kindMenuStyle, setKindMenuStyle] = useState<CSSProperties | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const modelWrapRef = useRef<HTMLDivElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);
    const kindWrapRef = useRef<HTMLDivElement>(null);
    const kindMenuRef = useRef<HTMLDivElement>(null);
    const [capabilityModes, setCapabilityModes] = useState<AiModeItem[]>([]);
    const [cameraPresets, setCameraPresets] = useState<DirectorPresetItem[]>([]);
    const [lightingPresets, setLightingPresets] = useState<DirectorPresetItem[]>([]);
    const [picker, setPicker] = useState<'mode' | 'camera' | 'lighting' | null>(null);
    const [angleOpen, setAngleOpen] = useState(false);
    // «زاویه و نور»: فقط چت تصویری، وقتی مود ابزار برای مدل انتخابی فعال و سازگار است
    const angleWanted = showAngles && mediaKind === 'image' && !toolbarDisabled;
    const angleMode = useAngleStudioMode(settings.modelId, angleWanted);
    const angleOn = isAngleStudioOn(settings.angleStudio);
    const angleState = useMemo<AngleStudioState>(
        () => readAngleStudioState(settings.angleStudio) || { ...defaultAngleStudioState(), enabled: false },
        [settings.angleStudio],
    );
    const angleSourceUrl = useMemo(() => {
        const image = attachments.find((item) => !isChatFileAttachment(item) && classifyChatAttachmentKind(item) === 'image');
        return String(image?.thumbnailUrlLarge || image?.thumbnailUrl || image?.url || '') || undefined;
    }, [attachments]);
    const audioPreview = useOptionAudioPreview();
    const stopAudioPreview = audioPreview.stop;

    // منوی مدل/نوع و پنجره تنظیمات با اسکرول ظرفِ دکمه‌شان بسته می‌شوند (مثل سایدبار نود)
    useCloseOnAnchorScroll(open, wrapRef, menuRef, setOpen);
    useCloseOnAnchorScroll(modelOpen, modelWrapRef, modelMenuRef, setModelOpen);
    useCloseOnAnchorScroll(kindOpen, kindWrapRef, kindMenuRef, setKindOpen);

    // بسته شدن پاپ‌اور تنظیمات یا عوض شدن مدل، نمونه‌ی صوتی در حال پخش را قطع می‌کند
    useEffect(() => {
        if (!open) stopAudioPreview();
    }, [open, stopAudioPreview]);
    useEffect(() => stopAudioPreview, [settings.modelId, stopAudioPreview]);

    const nodeType = nodeTypeOverride || CHAT_KIND_TO_NODE[mediaKind] || 'textToImage';
    const wantsEstimate = Boolean(onEstimateChange);
    const runtimeMetrics = useMemo(() => chatAttachmentsRuntimeMetrics(attachments), [attachments]);
    // طول پرامپت در قیمت اثر دارد (فرمول‌های توکنی)؛ متن کامپوزر در ref است و state
    // ندارد، پس طولش سبک پایش می‌شود تا مبلغ کنار دکمه ارسال با متن فعلی یکی بماند.
    const [promptLength, setPromptLength] = useState(() => readComposerText().trim().length);
    useEffect(() => {
        if (!wantsEstimate) return;
        const timer = window.setInterval(() => {
            const next = readComposerText().trim().length;
            setPromptLength((prev) => (prev === next ? prev : next));
        }, 300);
        return () => window.clearInterval(timer);
    }, [wantsEstimate, readComposerText]);
    const modelsReady = Boolean(
        catalog?.type === nodeType
        && catalog?.providerClass
        && modelsClass === catalog.providerClass,
    );

    useEffect(() => {
        if (toolbarDisabled) {
            setOpen(false);
            setModelOpen(false);
            setKindOpen(false);
            setPicker(null);
        }
    }, [toolbarDisabled]);

    useEffect(() => {
        let cancelled = false;
        if (toolbarDisabled) return () => { cancelled = true; };
        setCatalog(null);
        setModels([]);
        setModelsClass('');
        setLoadedSchema({ modelId: '', fields: [] });
        nodeCatalogApi.list({ activeOnly: true })
            .then((res) => {
                if (cancelled) return;
                setCatalog((res.nodes ?? []).find((node) => node.type === nodeType) || null);
            })
            .catch(() => { if (!cancelled) setCatalog(null); });
        return () => { cancelled = true; };
    }, [nodeType, toolbarDisabled]);

    useEffect(() => {
        const providerClass = catalog?.providerClass;
        if (!providerClass || toolbarDisabled) {
            if (!providerClass) {
                setModels([]);
                setModelsClass('');
            }
            return;
        }
        let cancelled = false;
        setModels([]);
        setModelsClass('');
        providersApi.listModels({ class: providerClass })
            .then((res) => {
                if (cancelled) return;
                setModels(res.models || []);
                setModelsClass(providerClass);
            })
            .catch(() => {
                if (cancelled) return;
                setModels([]);
                setModelsClass(providerClass);
            });
        return () => { cancelled = true; };
    }, [catalog?.providerClass, toolbarDisabled]);

    useEffect(() => {
        const modelId = String(settings.modelId || '').trim();
        if (toolbarDisabled || !showDirector || !modelsReady || !modelId) {
            setCapabilityModes([]);
            setPicker((value) => (value === 'mode' ? null : value));
            return;
        }
        let cancelled = false;
        providersApi.listModesForModel(modelId)
            .then((res) => {
                if (cancelled) return;
                setCapabilityModes(res.modes || []);
                const selected = String(settings.capabilityMode || '').trim();
                if (selected && !(res.modes || []).some((mode) => mode.id === selected)) {
                    patchSettings({ capabilityMode: '' });
                }
            })
            .catch(() => {
                if (!cancelled) setCapabilityModes([]);
            });
        return () => { cancelled = true; };
    }, [modelsReady, settings.modelId, settings.capabilityMode, patchSettings, toolbarDisabled, showDirector]);

    useEffect(() => {
        if (toolbarDisabled || !showDirector || mediaKind === 'audio' || mediaKind === 'text') {
            setCameraPresets([]);
            setLightingPresets([]);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const lighting = await providersApi.listDirectorPresets('lighting');
                if (cancelled) return;
                setLightingPresets(lighting.presets || []);
                if (mediaKind === 'video') {
                    const camera = await providersApi.listDirectorPresets('camera');
                    if (!cancelled) setCameraPresets(camera.presets || []);
                } else {
                    setCameraPresets([]);
                }
            } catch {
                if (!cancelled) {
                    setCameraPresets([]);
                    setLightingPresets([]);
                }
            }
        };
        load();
        return () => { cancelled = true; };
    }, [mediaKind, toolbarDisabled, showDirector]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (event: MouseEvent) => {
            const target = event.target as Node;
            if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const timer = window.setTimeout(() => {
            document.addEventListener('mousedown', onDoc);
        }, 0);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', onDoc);
        };
    }, [open]);

    useEffect(() => {
        if (!modelOpen) return;
        const onDoc = (event: MouseEvent) => {
            const target = event.target as Node;
            if (modelWrapRef.current?.contains(target) || modelMenuRef.current?.contains(target)) return;
            setModelOpen(false);
        };
        const timer = window.setTimeout(() => {
            document.addEventListener('mousedown', onDoc);
        }, 0);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', onDoc);
        };
    }, [modelOpen]);

    useEffect(() => {
        if (!kindOpen) return;
        const onDoc = (event: MouseEvent) => {
            const target = event.target as Node;
            if (kindWrapRef.current?.contains(target) || kindMenuRef.current?.contains(target)) return;
            setKindOpen(false);
        };
        const timer = window.setTimeout(() => {
            document.addEventListener('mousedown', onDoc);
        }, 0);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', onDoc);
        };
    }, [kindOpen]);

    useLayoutEffect(() => {
        if (!kindOpen || !kindWrapRef.current) {
            setKindMenuStyle(null);
            return;
        }
        const chip = kindWrapRef.current;
        const bounds = resolvePopoverBounds(chip);
        const sync = () => {
            const chipRect = chip.getBoundingClientRect();
            setKindMenuStyle({
                position: 'fixed',
                ...menuPopoverPlacement(chipRect, Math.max(chipRect.width, 160), bounds),
                ...verticalMenuPlacement(chipRect, 320, 120),
                zIndex: 10050,
            });
        };
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
    }, [kindOpen]);

    useLayoutEffect(() => {
        if (!modelOpen || !modelWrapRef.current) {
            setModelMenuStyle(null);
            return;
        }
        const chip = modelWrapRef.current;
        const bounds = resolvePopoverBounds(chip);
        const sync = () => {
            const chipRect = chip.getBoundingClientRect();
            setModelMenuStyle({
                position: 'fixed',
                // جای توضیح زیر نام مدل
                ...menuPopoverPlacement(chipRect, Math.max(chipRect.width, 280), bounds),
                ...verticalMenuPlacement(chipRect, 320, 120),
                zIndex: 10050,
            });
        };
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
    }, [modelOpen]);

    useLayoutEffect(() => {
        if (!open || !wrapRef.current) {
            setMenuStyle(null);
            return;
        }
        const chip = wrapRef.current;
        // پنجره تنظیمات همیشه داخل صفحه‌ای که کادر در آن است می‌ماند (چت، چت کشویی explore، سایدبار نود)
        const bounds = resolvePopoverBounds(chip);

        const sync = () => {
            const chipRect = chip.getBoundingClientRect();
            const horizontal = panelPopoverPlacement(chipRect, bounds);
            setNarrowMenu(horizontal.fill);
            setMenuStyle({
                position: 'fixed',
                ...horizontal.style,
                ...verticalMenuPlacement(chipRect, 420, 160),
                zIndex: 10050,
            });
        };

        sync();
        window.addEventListener('resize', sync);
        const observer = bounds ? new ResizeObserver(sync) : null;
        if (bounds && observer) observer.observe(bounds.element);
        return () => {
            window.removeEventListener('resize', sync);
            observer?.disconnect();
        };
    }, [open]);

    useEffect(() => {
        const modelId = String(settings.modelId || '').trim();
        if (!modelsReady || !modelId) {
            setLoadedSchema({ modelId: '', fields: [] });
            return;
        }
        const listed = models.find((model) => model._id === modelId);
        if (!listed) {
            setLoadedSchema({ modelId: '', fields: [] });
            return;
        }
        if (listed.settingsSchema?.length) {
            setLoadedSchema({ modelId, fields: listed.settingsSchema });
            return;
        }
        let cancelled = false;
        providersApi.getModel(modelId)
            .then((model) => {
                if (!cancelled) setLoadedSchema({ modelId, fields: model.settingsSchema || [] });
            })
            .catch(() => {
                if (!cancelled) setLoadedSchema({ modelId, fields: listed.settingsSchema || [] });
            });
        return () => { cancelled = true; };
    }, [modelsReady, settings.modelId, models]);

    useEffect(() => {
        if (toolbarDisabled) return;
        if (!modelsReady || !schema.length || !String(settings.modelId || '').trim()) return;
        if (!models.some((model) => model._id === settings.modelId)) return;
        // فقط چت (بدون source میزبان) کلیدهای کهنه را پاک می‌کند
        const next = defaultsFromSchema(schema, settings, !source);
        if (!next) return;
        patchSettings(next);
    }, [modelsReady, models, schema, settings, patchSettings, toolbarDisabled, source]);

    // فیلدهای ترکیبی: مقدار نهایی از ترکیب فیلدهای مبدأ محاسبه و در modelSettings ست می‌شود
    const getSettingValue = useCallback(
        (key: string) => fieldValue(settings, key),
        [settings],
    );

    useEffect(() => {
        if (toolbarDisabled || !schema.length) return;
        const next = applyDerivedSettings(schema, settings.modelSettings, getSettingValue);
        if (next) patchSettings({ modelSettings: next.modelSettings });
    }, [schema, settings, getSettingValue, patchSettings, toolbarDisabled]);

    // گیت ارسال: فیلد ترکیبی که مقدار نهایی‌اش خالی بماند، ارسال را مسدود می‌کند
    const derivedBlockerMessages = useMemo(
        () => (schema.length ? deriveBlockers(schema, getSettingValue) : []),
        [schema, getSettingValue],
    );

    const angleBlocker = showAngles && mediaKind === 'image' && angleOn && Boolean(angleMode.mode) && !angleSourceUrl
        ? t('angle_needs_image')
        : '';
    useEffect(() => {
        setComposerBlockers(angleBlocker ? [...derivedBlockerMessages, angleBlocker] : derivedBlockerMessages);
        return () => setComposerBlockers([]);
    }, [setComposerBlockers, derivedBlockerMessages, angleBlocker]);

    useEffect(() => {
        if (toolbarDisabled) return;
        if (!modelsReady) return;
        const current = String(settings.modelId || '').trim();
        const match = current ? models.find((model) => model._id === current) : null;
        if (match) return;
        const selected = models[0];
        if (!selected) {
            if (current) {
                patchSettings({
                    modelId: '',
                    model: '',
                    modelName: '',
                    providerId: '',
                    modelSettings: {},
                });
            }
            return;
        }
        const nextSchema = selected.settingsSchema || [];
        const defaults = defaultsFromSchema(nextSchema, { ...DEFAULT_CHAT_SETTINGS });
        patchSettings({
            modelId: selected._id,
            model: selected.name || '',
            modelName: selected.displayName || selected.name || '',
            providerId: String(selected.providerId || ''),
            modelSettings: defaults?.modelSettings || {},
            aspectRatio: defaults?.aspectRatio || DEFAULT_CHAT_SETTINGS.aspectRatio,
            resolution: defaults?.resolution || DEFAULT_CHAT_SETTINGS.resolution,
        });
    }, [modelsReady, models, settings.modelId, patchSettings, toolbarDisabled]);

    const estimateKey = useMemo(() => {
        // بدون شنونده (مثلاً تنظیمات نود که قیمت را خودش می‌گیرد) درخواست تخمین زده نمی‌شود
        if (!wantsEstimate || mediaKind === 'text' || toolbarDisabled || !modelsReady) return '';
        const modelId = String(settings.modelId || '').trim();
        if (!modelId || !models.some((model) => model._id === modelId)) return '';
        // همان تنظیمات/تعداد/طولی که ارسال واقعی قیمت می‌گیرد (با «زاویه و نور»: تعداد نماها)
        const request = chatEstimateRequest({ settings, mediaKind, promptLength });
        return JSON.stringify({
            modelId,
            nodeType,
            modelSettings: request.modelSettings,
            metrics: runtimeMetrics,
            promptLength: request.promptLength || 0,
            unitCount: request.unitCount || 0,
        });
    }, [
        wantsEstimate,
        mediaKind,
        toolbarDisabled,
        modelsReady,
        models,
        settings,
        nodeType,
        runtimeMetrics,
        promptLength,
    ]);

    useEffect(() => {
        if (!estimateKey) {
            setCost(null);
            setEstimateDetail({});
            return;
        }
        const { modelId, modelSettings, promptLength: keyPromptLength, unitCount: keyUnitCount } = JSON.parse(estimateKey) as {
            modelId: string;
            modelSettings: Record<string, unknown>;
            promptLength: number;
            unitCount: number;
        };
        let cancelled = false;
        const timer = setTimeout(() => {
            mediaApi.estimateCost({
                modelId,
                nodeType,
                modelSettings,
                promptLength: keyPromptLength || undefined,
                ...(keyUnitCount ? { unitCount: keyUnitCount } : {}),
                runtimeMetrics: runtimeMetrics as any,
            }).then((data) => {
                if (cancelled) return;
                // همان مبلغی که با ارسال کسر می‌شود (quotedUsd سرور)
                setCost(data.quotedUsd ?? data.chargedUsd ?? data.amount ?? null);
                setEstimateDetail({
                    pricingMode: data.pricingMode,
                    unit: data.unit,
                    breakdown: data.breakdown,
                });
            }).catch(() => {
                if (!cancelled) {
                    setCost(null);
                    setEstimateDetail({});
                }
            });
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // estimateKey covers model, settings, attachments and prompt length.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estimateKey]);

    const kindMeta = KIND_META.find((item) => item.id === mediaKind) || KIND_META[0];
    const KindIcon = kindMeta.icon;
    const selectedModel = modelsReady
        ? models.find((model) => model._id === settings.modelId)
        : undefined;
    const modelLabel = selectedModel?.displayName || selectedModel?.name || t('select_model');
    // مبلغ هزینه کل همین ارسال است؛ مبنای «هر ساخت» مدل → «/ساخت»، وگرنه نوع خروجی
    const unit = mediaKind === 'text'
        ? 'message'
        : estimateUnitKey(estimateDetail, mediaKind === 'video' ? 'video' : mediaKind === 'audio' ? 'audio' : 'image');
    useEffect(() => {
        onEstimateChange?.({
            amount: cost,
            unit,
            pricingMode: estimateDetail.pricingMode,
            breakdown: estimateDetail.breakdown,
        });
    }, [cost, unit, estimateDetail, onEstimateChange]);
    const hasModel = Boolean(selectedModel);

    const chipLabel = useMemo(() => {
        // مدل متنی (LLM) تنظیم نسبت/کیفیت ندارد — نسبت و رزولوشن پیش‌فرض چت نباید در خلاصه بیاید
        if (mediaKind === 'text') return '';
        const parts: string[] = [];
        for (const field of schema) {
            if (field.type !== 'select') continue;
            const value = pickSelectValue(field, settings);
            if (!value) continue;
            const option = selectedOption(field, value);
            parts.push(option?.label || value);
        }
        if (!parts.length) {
            if (settings.aspectRatio) parts.push(settings.aspectRatio);
            if (settings.resolution) parts.push(settings.resolution);
        }
        return parts.join(' · ');
    }, [schema, settings, mediaKind]);

    const director = readDirector(settings);
    const chatPanels = readChatPanels(settings);
    const angleAvailable = angleWanted && chatPanels.angles && Boolean(angleMode.mode);
    const angleShots = angleOn ? resolveAngleShots(angleState, angleMode.config) : [];
    // مودهای ابزاری (مثل «زاویه و نور») چیپ خودشان را دارند و در فهرست مود نمی‌آیند
    const pickerModes = useMemo(() => capabilityModes.filter((mode) => !isToolMode(mode)), [capabilityModes]);
    const selectedMode = pickerModes.find((mode) => mode.id === String(settings.capabilityMode || '').trim());
    const selectedCamera = cameraPresets.filter((preset) => director.camera[preset.layer] === preset.id);
    const selectedLighting = lightingPresets.filter((preset) => director.lighting[preset.layer] === preset.id);

    const modeCards: DirectorPickerCard[] = useMemo(
        () => pickerModes.map((mode) => ({
            id: mode.id,
            title: mode.title,
            titleFa: mode.titleFa,
            description: mode.descriptionFa,
            icon: mode.icon,
            iconSvg: mode.iconSvg,
            groupKey: mode.group || 'core',
            groupTitle: MODE_GROUP_LABELS[mode.group] || mode.group || 'core',
            guide: mode.guide,
            guideImages: mode.guideImages,
        })),
        [pickerModes],
    );

    const openPicker = (next: 'mode' | 'camera' | 'lighting') => {
        if (toolbarDisabled) return;
        setOpen(false);
        setModelOpen(false);
        setPicker((value) => (value === next ? null : next));
    };

    const patchDirector = (kind: 'camera' | 'lighting', layer: string, id: string) => {
        const next = readDirector(settings);
        const current = next[kind][layer];
        if (current === id) delete next[kind][layer];
        else next[kind][layer] = id;
        patchSettings({ director: next });
    };

    const previewOption = useMemo(() => {
        for (const field of schema) {
            if (field.type !== 'select') continue;
            if (!optionIconsEnabled(field)) continue;
            const option = selectedOption(field, pickSelectValue(field, settings));
            if (option?.iconSvg) return option;
        }
        return undefined;
    }, [schema, settings]);

    const onModelChange = (modelId: string) => {
        if (toolbarDisabled) return;
        const selected = models.find((model) => model._id === modelId);
        if (!selected) {
            patchSettings({
                modelId: '',
                model: '',
                modelName: '',
                modelSettings: {},
                capabilityMode: '',
            });
            return;
        }
        const defaults = defaultsFromSchema(selected.settingsSchema || [], {
            ...settings,
            modelId: selected._id,
            modelSettings: {},
        });
        patchSettings({
            modelId: selected._id,
            model: selected.name || '',
            modelName: selected.displayName || selected.name || '',
            providerId: String(selected.providerId || settings.providerId || ''),
            modelSettings: defaults?.modelSettings || {},
            aspectRatio: defaults?.aspectRatio || settings.aspectRatio,
            resolution: defaults?.resolution || settings.resolution,
            capabilityMode: '',
        });
    };

    const onFieldChange = (key: string, value: string | number | boolean) => {
        if (toolbarDisabled) return;
        const modelSettings = { ...(settings.modelSettings || {}), [key]: value };
        const patch: Partial<StudioChatSettings> = { modelSettings };
        if (key === 'aspectRatio') patch.aspectRatio = String(value);
        if (key === 'resolution') patch.resolution = String(value);
        patchSettings(patch);
    };

    // پنجره‌ی راهنما (علامت تعجب کنار عنوان هر تنظیم) — تنها جای راهنمای تنظیم (helpFa، یا hintFa قدیمی)
    const helpInfoFor = (field: NodeSettingField): SettingHelpInfo => ({
        label: catalogLabel(field, lang) || field.label,
        helpFa: field.helpFa,
        hintFa: field.hintFa,
    });

    const renderSelectField = (field: NodeSettingField) => (
        <SelectOptionsField
            key={field.key}
            field={field}
            title={catalogLabel(field, lang) || field.label}
            value={pickSelectValue(field, settings)}
            sanitizeSvg={optionSvgHtml}
            audio={audioPreview}
            onChange={(next) => onFieldChange(field.key, next)}
        />
    );

    const renderField = (field: NodeSettingField) => {
        if (field.type === 'select') return renderSelectField(field);
        if (field.type === 'derived') {
            // پشت‌صحنه محاسبه می‌شود؛ فقط اگر ادمین اجازه داده باشد نمایش داده می‌شود
            if (field.showToUser === false) return null;
            const value = resolveDerivedValue(field, getSettingValue);
            const option = (field.options || []).find((item) => item.value === value);
            return (
                <div key={field.key} className={styles.fieldBlock}>
                    <p className={styles.popoverLabel}>
                        {catalogLabel(field, lang) || field.label}
                        <SettingHelp className={styles.helpInline} info={helpInfoFor(field)} />
                        <span
                            className={styles.derivedValue}
                            title="به‌صورت خودکار از ترکیب تنظیمات بالا محاسبه می‌شود"
                        >
                            {value ? (option?.label || value) : '—'}
                        </span>
                    </p>
                </div>
            );
        }
        if (field.type === 'checkbox') {
            const checked = fieldValue(settings, field.key) === 'true' || settings.modelSettings?.[field.key] === true;
            return (
                <label key={field.key} className={styles.checkRow}>
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => onFieldChange(field.key, event.target.checked)}
                    />
                    {catalogLabel(field, lang) || field.label}
                    <SettingHelp info={helpInfoFor(field)} />
                </label>
            );
        }
        if (field.type === 'number' || field.type === 'slider') {
            const raw = settings.modelSettings?.[field.key];
            const numeric = typeof raw === 'number' ? raw : Number(raw ?? field.min ?? 0);
            return (
                <label key={field.key} className={styles.numberRow}>
                    <span className={styles.rowLabelWrap}>
                        {catalogLabel(field, lang) || field.label}
                        <SettingHelp info={helpInfoFor(field)} />
                    </span>
                    <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        value={Number.isFinite(numeric) ? numeric : 0}
                        onChange={(event) => onFieldChange(field.key, Number(event.target.value))}
                    />
                </label>
            );
        }
        if (field.type === 'text' || field.type === 'textarea') {
            return (
                <label key={field.key} className={styles.numberRow}>
                    <span className={styles.rowLabelWrap}>
                        {catalogLabel(field, lang) || field.label}
                        <SettingHelp info={helpInfoFor(field)} />
                    </span>
                    <input
                        type="text"
                        value={fieldValue(settings, field.key)}
                        placeholder={field.placeholder || ''}
                        onChange={(event) => onFieldChange(field.key, event.target.value)}
                    />
                </label>
            );
        }
        return null;
    };

    // fields: همان کنترل‌ها با ظاهر فیلد فرم (برچسب بالا + باکس تمام‌عرض شبیه select)؛
    // رفتار، منوها و پنجره تنظیمات دقیقاً همان حالت چیپ است
    const fieldsVariant = variant === 'fields';
    const chipMobile = mobile && !fieldsVariant;
    const controlClass = (chipClass: string, isOpen: boolean) => (fieldsVariant
        ? `${styles.fieldBox} ${isOpen ? styles.fieldBoxOpen : ''}`
        : `${chipClass} ${isOpen ? styles.open : ''}`);
    const fieldChevron = fieldsVariant
        ? <LuChevronDown size={14} className={styles.fieldChevron} aria-hidden />
        : null;
    const asField = (label: string, control: ReactNode) => (fieldsVariant ? (
        <div className={styles.fieldRow}>
            <span className={styles.fieldRowLabel}>{label}</span>
            {control}
        </div>
    ) : control);

    const selectedModelSvg = optionSvgHtml(selectedModel?.iconSvg);
    const modelChip = (
        <div className={`${styles.modelSelectWrap} ${fieldsVariant ? styles.fieldWrap : ''}`} ref={modelWrapRef}>
            <button
                type="button"
                className={controlClass(`${styles.chip} ${styles.modelChip} ${mobile ? styles.chipIconOnly : ''}`, modelOpen)}
                aria-label={t('select_model')}
                aria-expanded={modelOpen}
                title={modelLabel}
                disabled={toolbarDisabled}
                onClick={() => {
                    if (toolbarDisabled) return;
                    setOpen(false);
                    setPicker(null);
                    setModelOpen((value) => !value);
                }}
            >
                {chipMobile ? (
                    // موبایل: فقط آیکون مدل — نام مدل در خط شناور بالا می‌آید
                    selectedModelSvg ? (
                        <span
                            className={styles.chipSvg}
                            aria-hidden
                            dangerouslySetInnerHTML={{ __html: selectedModelSvg }}
                        />
                    ) : (
                        <LuCpu size={16} aria-hidden />
                    )
                ) : (
                    <>
                        {selectedModelSvg ? (
                            <span
                                className={styles.chipSvg}
                                aria-hidden
                                dangerouslySetInnerHTML={{ __html: selectedModelSvg }}
                            />
                        ) : null}
                        <span className={styles.chipLabel}>{modelLabel}</span>
                        {fieldChevron}
                    </>
                )}
            </button>
            {modelOpen && modelMenuStyle && createPortal(
                <div ref={modelMenuRef} className={styles.modelMenu} style={modelMenuStyle} role="listbox">
                    {models.length === 0 ? (
                        <p className={styles.popoverLabel}>{t('select_model')}</p>
                    ) : modelGroups.map((group, groupIndex) => (
                        <div key={`${group.title}-${groupIndex}`} role="group" aria-label={group.title || undefined}>
                            {group.title ? (
                                <div className={styles.modelGroupHead} aria-hidden>
                                    <span>{group.title}</span>
                                </div>
                            ) : null}
                            {group.models.map((model) => {
                                const svg = optionSvgHtml(model.iconSvg);
                                const selected = model._id === settings.modelId;
                                const description = String(model.description || '').trim();
                                return (
                                    <button
                                        key={model._id}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        className={`${styles.modelOption} ${selected ? styles.modelOptionActive : ''}`}
                                        onClick={() => {
                                            onModelChange(model._id);
                                            setModelOpen(false);
                                        }}
                                    >
                                        {svg ? (
                                            <span
                                                className={styles.chipSvg}
                                                aria-hidden
                                                dangerouslySetInnerHTML={{ __html: svg }}
                                            />
                                        ) : (
                                            <span className={styles.chipSvg} aria-hidden />
                                        )}
                                        <span className={styles.modelOptionText}>
                                            <span className={styles.chipLabel}>{model.displayName || model.name}</span>
                                            {description ? (
                                                <span className={styles.modelOptionDesc} dir="auto">{description}</span>
                                            ) : null}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>,
                document.body,
            )}
        </div>
    );

    const modeChip = hasModel && chatPanels.mode && pickerModes.length ? (
        <button
            type="button"
            className={`${styles.chip} ${styles.modeChip} ${mobile ? styles.chipIconOnly : ''} ${picker === 'mode' ? styles.open : ''} ${selectedMode ? styles.modeChipActive : ''}`}
            aria-label="مود تولید"
            title={selectedMode ? `${selectedMode.titleFa || selectedMode.title} — ${selectedMode.descriptionFa}` : 'مود تولید'}
            aria-expanded={picker === 'mode'}
            disabled={toolbarDisabled}
            onClick={() => openPicker('mode')}
        >
            <span className={styles.modeChipIcon} aria-hidden>
                <ChipGlyph
                    iconSvg={selectedMode?.iconSvg}
                    fallback={selectedMode ? <ModeIcon name={selectedMode.icon} size={14} /> : <LuSparkles size={14} />}
                />
            </span>
            <span className={styles.chipLabel}>
                {selectedMode ? (selectedMode.titleFa || selectedMode.title) : 'مود'}
            </span>
        </button>
    ) : null;

    const cameraChip = hasModel && chatPanels.camera && mediaKind === 'video' && cameraPresets.length ? (
        <button
            type="button"
            className={`${styles.chip} ${styles.modeChip} ${mobile ? styles.chipIconOnly : ''} ${picker === 'camera' ? styles.open : ''} ${selectedCamera.length ? styles.modeChipActive : ''}`}
            aria-label="حرکت دوربین"
            title="حرکت دوربین"
            aria-expanded={picker === 'camera'}
            disabled={toolbarDisabled}
            onClick={() => openPicker('camera')}
        >
            <span className={styles.modeChipIcon} aria-hidden>
                <ChipGlyph iconSvg={selectedCamera[0]?.iconSvg} fallback={<LuCamera size={14} />} />
            </span>
            <span className={styles.chipLabel}>
                {selectedCamera.length
                    ? (selectedCamera.length === 1
                        ? (selectedCamera[0].titleFa || selectedCamera[0].title)
                        : `${selectedCamera[0].titleFa || selectedCamera[0].title} +${selectedCamera.length - 1}`)
                    : 'دوربین'}
            </span>
        </button>
    ) : null;

    const lightingChip = hasModel && chatPanels.lighting && mediaKind !== 'audio' && mediaKind !== 'text' && lightingPresets.length ? (
        <button
            type="button"
            className={`${styles.chip} ${styles.modeChip} ${mobile ? styles.chipIconOnly : ''} ${picker === 'lighting' ? styles.open : ''} ${selectedLighting.length ? styles.modeChipActive : ''}`}
            aria-label="نورپردازی"
            title="نورپردازی"
            aria-expanded={picker === 'lighting'}
            disabled={toolbarDisabled}
            onClick={() => openPicker('lighting')}
        >
            <span className={styles.modeChipIcon} aria-hidden>
                <ChipGlyph iconSvg={selectedLighting[0]?.iconSvg} fallback={<LuSun size={14} />} />
            </span>
            <span className={styles.chipLabel}>
                {selectedLighting.length
                    ? (selectedLighting.length === 1
                        ? (selectedLighting[0].titleFa || selectedLighting[0].title)
                        : `${selectedLighting[0].titleFa || selectedLighting[0].title} +${selectedLighting.length - 1}`)
                    : 'نور'}
            </span>
        </button>
    ) : null;

    // مدل/نوع چت عوض شد و ابزار در دسترس نیست: خاموشش کن تا قیمت و ارسال بدون آن باشند
    useEffect(() => {
        if (!showAngles || !angleOn || toolbarDisabled) return;
        if (mediaKind === 'image' && (!angleMode.loaded || !hasModel)) return;
        if (mediaKind === 'image' && angleAvailable) return;
        patchSettings({ angleStudio: { ...(settings.angleStudio || {}), enabled: false } });
    }, [showAngles, angleOn, toolbarDisabled, mediaKind, angleMode.loaded, hasModel, angleAvailable, settings.angleStudio, patchSettings]);

    const patchAngle = (next: AngleStudioState) => {
        patchSettings({ angleStudio: withResolvedShots(next, angleMode.config) as unknown as Record<string, unknown> });
    };

    const openAngleStudio = () => {
        if (toolbarDisabled) return;
        setOpen(false);
        setModelOpen(false);
        setPicker(null);
        if (!angleOn) patchAngle({ ...angleState, enabled: true });
        setAngleOpen(true);
    };

    const angleChip = hasModel && angleAvailable ? (
        <button
            type="button"
            className={`${styles.chip} ${styles.modeChip} ${mobile ? styles.chipIconOnly : ''} ${angleOpen ? styles.open : ''} ${angleOn ? styles.modeChipActive : ''}`}
            aria-label={t('angle_studio_title')}
            title={angleOn
                ? t('angle_chip_on_title', { n: formatAppNumber(angleShots.length, lang) })
                : t('angle_chip_title')}
            aria-haspopup="dialog"
            disabled={toolbarDisabled}
            onClick={openAngleStudio}
        >
            <span className={styles.modeChipIcon} aria-hidden>
                <AngleStudioGlyph size={14} />
            </span>
            <span className={styles.chipLabel}>
                {angleOn
                    ? t('angle_chip_on', { n: formatAppNumber(angleShots.length, lang) })
                    : t('angle_chip')}
            </span>
        </button>
    ) : null;

    const settingsChip = hasModel && mediaKind !== 'text' ? (
        <div className={`${styles.settingsWrap} ${fieldsVariant ? styles.fieldWrap : ''}`} ref={wrapRef}>
            <button
                type="button"
                className={controlClass(`${styles.chip} ${styles.settingsChip} ${mobile ? styles.chipIconOnly : ''}`, open)}
                aria-label={chipLabel || 'تنظیمات'}
                title={chipLabel || 'تنظیمات'}
                disabled={toolbarDisabled}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                    event.stopPropagation();
                    if (toolbarDisabled) return;
                    setModelOpen(false);
                    setPicker(null);
                    setOpen((value) => !value);
                }}
            >
                {chipMobile ? (
                    <LuSettings2 size={16} />
                ) : (
                    <>
                        {previewOption && optionSvgHtml(previewOption.iconSvg) ? (
                            <span
                                className={styles.chipSvg}
                                aria-hidden
                                dangerouslySetInnerHTML={{ __html: optionSvgHtml(previewOption.iconSvg) }}
                            />
                        ) : null}
                        <span className={styles.chipLabel}>{chipLabel || 'تنظیمات'}</span>
                        {fieldChevron}
                    </>
                )}
            </button>
            {open && menuStyle && createPortal(
                <div
                    ref={menuRef}
                    className={`${styles.popover} ${narrowMenu ? styles.popoverCentered : ''}`}
                    style={menuStyle}
                >
                    {previewOption && optionSvgHtml(previewOption.iconSvg) ? (
                        <div className={styles.preview}>
                            <span
                                className={styles.previewSvg}
                                aria-hidden
                                dangerouslySetInnerHTML={{ __html: optionSvgHtml(previewOption.iconSvg) }}
                            />
                            <span>{previewOption.label || previewOption.value}</span>
                        </div>
                    ) : chipLabel ? (
                        <p className={styles.popoverLabel}>{chipLabel}</p>
                    ) : null}
                    {schema.length ? schema.map((field) => renderField(field)) : (
                        <p className={styles.popoverLabel}>{t('select_model')}</p>
                    )}
                </div>,
                document.body,
            )}
        </div>
    ) : null;

    // انتخاب نوع تولید (تصویر/ویدیو/صوت/متن) — هم‌الگوی باکس انتخاب مدل: چیپ + منوی پاپ‌آپ
    const kindSelect = (
        <div className={styles.modelSelectWrap} ref={kindWrapRef}>
            <button
                type="button"
                className={`${styles.chip} ${styles.modelChip} ${kindOpen ? styles.open : ''} ${narrow ? styles.kindChipNarrow : ''}`}
                aria-label={t(kindMeta.labelKey)}
                aria-expanded={kindOpen}
                title={kindLocked ? t('chat_kind_locked_hint', { defaultValue: 'نوع این چت پس از شروع قفل است — برای نوع دیگر، چت جدید باز کنید' }) : t(kindMeta.labelKey)}
                disabled={toolbarDisabled || kindLocked}
                onClick={() => {
                    if (toolbarDisabled || kindLocked) return;
                    setOpen(false);
                    setModelOpen(false);
                    setKindOpen((value) => !value);
                }}
            >
                <KindIcon size={narrow ? 16 : 14} />
                <span className={styles.chipLabel}>{t(kindMeta.labelKey)}</span>
            </button>
            {kindOpen && kindMenuStyle && createPortal(
                <div ref={kindMenuRef} className={styles.modelMenu} style={kindMenuStyle} role="listbox">
                    {KIND_META.map((item) => {
                        const ItemIcon = item.icon;
                        const selected = item.id === mediaKind;
                        // وسط چتِ شروع‌شده نمی‌شود به حالت متن رفت — برای متن چت جدید لازم است
                        const optionDisabled = textOptionDisabled && item.id === 'text';
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                aria-disabled={optionDisabled}
                                className={`${styles.modelOption} ${selected ? styles.modelOptionActive : ''} ${optionDisabled ? styles.modelOptionDisabled : ''}`}
                                title={optionDisabled ? t('chat_kind_locked_hint', { defaultValue: 'برای چت متنی، چت جدید باز کنید' }) : undefined}
                                onClick={() => {
                                    if (optionDisabled) return;
                                    setMediaKind(item.id);
                                    setKindOpen(false);
                                }}
                            >
                                <span className={styles.modeChipIcon} aria-hidden>
                                    <ItemIcon size={14} />
                                </span>
                                <span className={styles.chipLabel}>{t(item.labelKey)}</span>
                            </button>
                        );
                    })}
                </div>,
                document.body,
            )}
        </div>
    );

    // قیمت تخمینی بالای دکمه ارسال، در ChatInput از onEstimateChange رندر می‌شود

    // موبایل: «نام مدل | خلاصه تنظیمات» در خط شناور بالای دکمه‌ها
    const mobileSummary = mobile
        ? [hasModel ? modelLabel : '', chipLabel].filter(Boolean).join(' | ')
        : '';

    return (
        <div className={fieldsVariant ? styles.toolbarFields : `${styles.toolbar} ${compact ? styles.toolbarCompact : ''}`}>
            {showKind && !compact ? kindSelect : null}
            {asField(t('toolbar_field_model'), modelChip)}
            {settingsChip ? asField(t('toolbar_field_model_settings'), settingsChip) : null}
            {showDirector ? modeChip : null}
            {showDirector ? cameraChip : null}
            {showDirector ? lightingChip : null}
            {showAngles ? angleChip : null}
            {showAngles && angleOpen ? (
                <AngleStudioDialog
                    open
                    value={angleState}
                    config={angleMode.config}
                    imageUrl={angleSourceUrl}
                    disabled={toolbarDisabled}
                    onChange={patchAngle}
                    onTurnOff={() => patchAngle({ ...angleState, enabled: false })}
                    onClose={() => setAngleOpen(false)}
                />
            ) : null}
            {/* موبایل: «نام مدل | خلاصه تنظیمات» — شناور، هم‌خط با چیپ قیمت بالای دکمه ارسال */}
            {mobileSummary ? <MarqueeText className={styles.settingsSummary} text={mobileSummary} /> : null}
            {picker === 'mode' ? (
                <DirectorPickerModal
                    open
                    title="مود تولید"
                    noneLabel="خودکار"
                    noneHint="تشخیص سیستم از روی ورودی‌ها"
                    cards={modeCards}
                    selection={selectedMode ? { [selectedMode.group || 'core']: selectedMode.id } : {}}
                    layered={false}
                    onClose={() => setPicker(null)}
                    onSelect={(_group, id) => {
                        patchSettings({ capabilityMode: id });
                        setPicker(null);
                    }}
                    onClear={() => {
                        patchSettings({ capabilityMode: '' });
                        setPicker(null);
                    }}
                />
            ) : null}
            {picker === 'camera' ? (
                <DirectorPickerModal
                    open
                    title="حرکت دوربین"
                    cards={presetCards(cameraPresets, 'LuCamera')}
                    selection={director.camera}
                    layered
                    onClose={() => setPicker(null)}
                    onSelect={(layer, id) => patchDirector('camera', layer, id)}
                    onClear={(layer) => {
                        const next = readDirector(settings);
                        if (layer) delete next.camera[layer];
                        else next.camera = {};
                        patchSettings({ director: next });
                    }}
                />
            ) : null}
            {picker === 'lighting' ? (
                <DirectorPickerModal
                    open
                    title="نورپردازی"
                    cards={presetCards(lightingPresets, 'LuSun')}
                    selection={director.lighting}
                    layered
                    onClose={() => setPicker(null)}
                    onSelect={(layer, id) => patchDirector('lighting', layer, id)}
                    onClear={(layer) => {
                        const next = readDirector(settings);
                        if (layer) delete next.lighting[layer];
                        else next.lighting = {};
                        patchSettings({ director: next });
                    }}
                />
            ) : null}
        </div>
    );
}
