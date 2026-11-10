'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import ExpandableSection from '@/app/(main)/billing/settings/ExpandableSection';
import SimpleLineNav from '@/app/components/SimpleLineNav/SimpleLineNav';
import { ModeIcon, ModeIconPicker, SvgMarkup, sanitizeSvg } from './modeIcons';
import ModeGuide from './ModeGuide';
import ModeInputsEditor, { EMPTY_MODE_INPUT, inputsFromDoc, sanitizeModeInputs, type ModeInputForm } from './ModeInputsEditor';
import AllowedModelsPicker from './AllowedModelsPicker';
import styles from './ai-modes.module.scss';

export type AiModesTab = 'modes' | 'camera' | 'lighting' | 'settings';

interface AiModeDoc {
    _id: string;
    id: string;
    title: string;
    titleFa: string;
    group: string;
    icon: string;
    iconSvg?: string;
    mediaClass: string;
    providerModes: string[];
    descriptionFa: string;
    inputs: Array<Record<string, unknown>>;
    settings: Array<Record<string, unknown>>;
    supportedModels: string[];
    supportedModelIds?: string[];
    guide: string;
    guideImages: string[];
    isActive: boolean;
    isSystem: boolean;
    sortOrder: number;
}

interface DirectorPresetDoc {
    _id: string;
    kind: 'camera' | 'lighting';
    layer: string;
    layerTitleFa: string;
    category: string;
    categoryTitleFa: string;
    id: string;
    title: string;
    titleFa: string;
    summaryFa: string;
    promptText: string;
    iconSvg?: string;
    payload?: Record<string, unknown>;
    options?: Array<{ value: string; label: string; labelFa?: string; promptText?: string }>;
    guide: string;
    guideImages: string[];
    isActive: boolean;
    isSystem: boolean;
    sortOrder: number;
}

const TAB_HREF: Record<AiModesTab, string> = {
    modes: '/ai-modes',
    camera: '/ai-modes/camera',
    lighting: '/ai-modes/lighting',
    settings: '/ai-modes/settings',
};

const GROUPS: Array<{ key: string; label: string }> = [
    { key: 'core', label: 'Core — پایه' },
    { key: 'reference', label: 'Reference — مرجع' },
    { key: 'motion', label: 'Motion — حرکت' },
    { key: 'storytelling', label: 'Storytelling — روایت' },
    { key: 'editing', label: 'Editing — ویرایش' },
    { key: 'audio', label: 'Audio — صدا' },
];

const CAMERA_LAYERS: Array<{ key: string; titleFa: string }> = [
    { key: 'preset', titleFa: 'پریست حرکت' },
    { key: 'trajectory', titleFa: 'مسیر سه‌بعدی' },
    { key: 'lens', titleFa: 'لنز و اپتیک' },
    { key: 'focus', titleFa: 'فوکوس و عمق میدان' },
    { key: 'motion-dynamics', titleFa: 'دینامیک حرکت' },
    { key: 'stabilization', titleFa: 'تثبیت' },
];

const LIGHTING_LAYERS: Array<{ key: string; titleFa: string }> = [
    { key: 'preset', titleFa: 'پریست نور' },
    { key: 'sources', titleFa: 'منابع نور' },
    { key: 'direction', titleFa: 'جهت نور' },
    { key: 'color-temperature', titleFa: 'دمای رنگ' },
    { key: 'quality', titleFa: 'کیفیت نور' },
    { key: 'effects', titleFa: 'افکت‌های سینمایی' },
    { key: 'environment', titleFa: 'نور محیط' },
];

const EMPTY_MODE = {
    id: '',
    title: '',
    titleFa: '',
    group: 'core',
    icon: 'LuWand',
    iconSvg: '',
    mediaClass: 'video',
    providerModes: '',
    descriptionFa: '',
    supportedModels: '',
    supportedModelIds: [] as string[],
    guide: '',
    guideImages: '',
    isActive: true,
    isSystem: false,
    sortOrder: 100,
    inputs: [
        { ...EMPTY_MODE_INPUT, type: 'prompt', key: 'prompt', label: 'Prompt', labelFa: 'پرامپت' },
    ] as ModeInputForm[],
};

const EMPTY_PRESET = {
    kind: 'camera' as 'camera' | 'lighting',
    layer: 'preset',
    layerTitleFa: 'پریست حرکت',
    category: 'custom',
    categoryTitleFa: 'سفارشی',
    id: '',
    title: '',
    titleFa: '',
    summaryFa: '',
    promptText: '',
    iconSvg: '',
    guide: '',
    guideImages: '',
    isActive: true,
    isSystem: false,
    sortOrder: 100,
    payload: {} as Record<string, unknown>,
    options: [] as Array<{ value: string; label: string; labelFa?: string; promptText?: string }>,
};

type ModeFormState = typeof EMPTY_MODE;
type PresetFormState = typeof EMPTY_PRESET;

function toSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function mediaLabel(mediaClass: string) {
    if (mediaClass === 'any') return 'همه کلاس‌ها';
    if (mediaClass === 'image') return 'تصویر';
    if (mediaClass === 'video') return 'ویدیو';
    if (mediaClass === 'audio') return 'صوت';
    if (mediaClass === 'text') return 'متن';
    if (mediaClass === '3d') return 'سه‌بعدی';
    return mediaClass;
}

function hasGuideContent(guide?: string, images?: string[]) {
    return Boolean(String(guide || '').trim()) || Boolean((images || []).length);
}

function ThumbBox({ iconSvg, icon }: { iconSvg?: string; icon?: string }) {
    const svg = sanitizeSvg(iconSvg);
    return (
        <div className={styles.logoBox}>
            {svg ? <SvgMarkup svg={svg} /> : <ModeIcon name={icon || 'LuSparkles'} size={22} />}
        </div>
    );
}

function SvgPasteField({
    value,
    onChange,
    fallbackIcon,
}: {
    value: string;
    onChange: (value: string) => void;
    fallbackIcon?: string;
}) {
    return (
        <div className={styles.svgPaste}>
            <div className={styles.logoPreviewBox}>
                {sanitizeSvg(value)
                    ? <SvgMarkup svg={value} />
                    : <ModeIcon name={fallbackIcon || 'LuSparkles'} size={28} />}
            </div>
            <textarea
                className={styles.svgInput}
                dir="ltr"
                placeholder="<svg viewBox=&quot;0 0 24 24&quot;>...</svg>"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className={styles.formSection}>
            <h3>{title}</h3>
            <div className={styles.formGrid}>{children}</div>
        </section>
    );
}

type ChatPanelKey = 'mode' | 'camera' | 'lighting' | 'angles';

type ChatPanelsState = {
    mode: boolean;
    camera: boolean;
    lighting: boolean;
    angles: boolean;
};

const DEFAULT_CHAT_PANELS: ChatPanelsState = { mode: true, camera: true, lighting: true, angles: true };

const CHAT_PANEL_OPTIONS: Array<{ key: ChatPanelKey; title: string; hint: string }> = [
    { key: 'mode', title: 'مود تولید', hint: 'چیپ مود و اسلات‌های ورودی در چت' },
    { key: 'camera', title: 'حرکت دوربین', hint: 'چیپ و پنجره حرکت دوربین در چت ویدیو' },
    { key: 'lighting', title: 'نورپردازی', hint: 'چیپ و پنجره نورپردازی در چت' },
    { key: 'angles', title: 'زاویه و نور', hint: 'ابزار سه‌بعدی تغییر زاویهٔ دوربین و نور عکس در چت تصویری (مود «زاویه و نور»)' },
];

function ChatPanelsCard({
    panels,
    saving,
    onToggle,
}: {
    panels: ChatPanelsState;
    saving: boolean;
    onToggle: (key: ChatPanelKey, enabled: boolean) => void;
}) {
    return (
        <section className={styles.chatPanelsCard}>
            <div>
                <h3>نمایش در چت</h3>
                <p>هر بخش را جداگانه در نوار چت استودیو روشن یا خاموش کنید. خاموش یعنی کل آن بخش از چت حذف می‌شود.</p>
            </div>
            <div className={styles.chatPanelsList}>
                {CHAT_PANEL_OPTIONS.map((option) => (
                    <label key={option.key} className={styles.toggleLabel}>
                        <span>
                            <strong>{option.title}</strong>
                            <small>{option.hint}</small>
                        </span>
                        <input
                            type="checkbox"
                            checked={panels[option.key]}
                            disabled={saving}
                            onChange={(event) => onToggle(option.key, event.target.checked)}
                        />
                    </label>
                ))}
            </div>
        </section>
    );
}

function modeToForm(doc: AiModeDoc): ModeFormState {
    return {
        id: doc.id,
        title: doc.title || '',
        titleFa: doc.titleFa || '',
        group: doc.group || 'core',
        icon: doc.icon || 'LuSparkles',
        iconSvg: doc.iconSvg || '',
        mediaClass: doc.mediaClass || 'video',
        providerModes: (doc.providerModes || []).join(', '),
        descriptionFa: doc.descriptionFa || '',
        supportedModels: (doc.supportedModels || []).join(', '),
        supportedModelIds: (doc.supportedModelIds || []).map(String),
        guide: doc.guide || '',
        guideImages: (doc.guideImages || []).join('\n'),
        isActive: doc.isActive !== false,
        isSystem: Boolean(doc.isSystem),
        sortOrder: doc.sortOrder ?? 100,
        inputs: inputsFromDoc(doc.inputs),
    };
}

function presetToForm(doc: DirectorPresetDoc): PresetFormState {
    return {
        kind: doc.kind,
        layer: doc.layer || 'preset',
        layerTitleFa: doc.layerTitleFa || '',
        category: doc.category || 'custom',
        categoryTitleFa: doc.categoryTitleFa || 'سفارشی',
        id: doc.id,
        title: doc.title || '',
        titleFa: doc.titleFa || '',
        summaryFa: doc.summaryFa || '',
        promptText: doc.promptText || '',
        iconSvg: doc.iconSvg || '',
        guide: doc.guide || '',
        guideImages: (doc.guideImages || []).join('\n'),
        isActive: doc.isActive !== false,
        isSystem: Boolean(doc.isSystem),
        sortOrder: doc.sortOrder ?? 100,
        payload: doc.payload || {},
        options: doc.options || [],
    };
}

export default function AiModesStudio({ tab }: { tab: AiModesTab }) {
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [modes, setModes] = useState<AiModeDoc[]>([]);
    const [presets, setPresets] = useState<DirectorPresetDoc[]>([]);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('');
    const [layerFilter, setLayerFilter] = useState('');
    const [pagination, setPagination] = useState({ itemPerPage: 6, currentPage: 1 });
    const itemPerPageRef = useRef(pagination.itemPerPage);
    itemPerPageRef.current = pagination.itemPerPage;

    const [modeForm, setModeForm] = useState<ModeFormState | null>(null);
    const [presetForm, setPresetForm] = useState<PresetFormState | null>(null);
    const [modeFormIsNew, setModeFormIsNew] = useState(false);
    const [presetFormIsNew, setPresetFormIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [openGuideKey, setOpenGuideKey] = useState('');
    const [chatPanels, setChatPanels] = useState<ChatPanelsState>(DEFAULT_CHAT_PANELS);
    const [savingPanels, setSavingPanels] = useState(false);

    const isSettingsTab = tab === 'settings';
    const isPresetTab = tab === 'camera' || tab === 'lighting';
    const layers = tab === 'lighting' ? LIGHTING_LAYERS : CAMERA_LAYERS;

    const load = useCallback(async () => {
        if (!token || tab === 'settings') return;
        try {
            setLoading(true);
            if (tab === 'modes') {
                const res = await axios.get(`${baseUrl}/api/ai-modes?includeInactive=true`, {
                    headers: { authorization: `Bearer ${token}` },
                });
                setModes(res.data?.data || []);
            } else {
                const res = await axios.get(
                    `${baseUrl}/api/ai-modes/presets?kind=${tab}&includeInactive=true`,
                    { headers: { authorization: `Bearer ${token}` } },
                );
                setPresets(res.data?.data || []);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, tab, token]);

    useEffect(() => {
        load();
    }, [load]);

    const loadChatPanels = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${baseUrl}/api/ai-modes/chat-panels`, {
                headers: { authorization: `Bearer ${token}` },
            });
            const data = res.data?.data || {};
            setChatPanels({
                mode: data.mode !== false,
                camera: data.camera !== false,
                lighting: data.lighting !== false,
                angles: data.angles !== false,
            });
        } catch (e) {
            ErrorToaster(e);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        if (tab === 'settings') loadChatPanels();
    }, [tab, loadChatPanels]);

    const toggleChatPanel = async (key: ChatPanelKey, enabled: boolean) => {
        const next = { ...chatPanels, [key]: enabled };
        setChatPanels(next);
        try {
            setSavingPanels(true);
            await axios.put(`${baseUrl}/api/ai-modes/chat-panels`, next, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'نمایش بخش‌های چت ذخیره شد' });
        } catch (e) {
            setChatPanels(chatPanels);
            ErrorToaster(e);
        } finally {
            setSavingPanels(false);
        }
    };

    useEffect(() => {
        setSearch('');
        setGroupFilter('');
        setLayerFilter('');
        setOpenGuideKey('');
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
        setModeForm(null);
        setPresetForm(null);
    }, [tab]);

    useEffect(() => {
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, [search, groupFilter, layerFilter]);

    const filteredModes = useMemo(() => {
        const q = search.trim().toLowerCase();
        return modes.filter((mode) => {
            if (groupFilter && mode.group !== groupFilter) return false;
            if (!q) return true;
            return [mode.title, mode.titleFa, mode.id, mode.descriptionFa].join(' ').toLowerCase().includes(q);
        });
    }, [modes, search, groupFilter]);

    const filteredPresets = useMemo(() => {
        const q = search.trim().toLowerCase();
        return presets.filter((preset) => {
            if (layerFilter && preset.layer !== layerFilter) return false;
            if (!q) return true;
            return [preset.title, preset.titleFa, preset.id, preset.summaryFa, preset.layerTitleFa, preset.promptText]
                .join(' ')
                .toLowerCase()
                .includes(q);
        });
    }, [presets, search, layerFilter]);

    const filteredCount = isPresetTab ? filteredPresets.length : filteredModes.length;

    const pagedModes = useMemo(() => {
        const start = (pagination.currentPage - 1) * pagination.itemPerPage;
        return filteredModes.slice(start, start + pagination.itemPerPage);
    }, [filteredModes, pagination.currentPage, pagination.itemPerPage]);

    const pagedPresets = useMemo(() => {
        const start = (pagination.currentPage - 1) * pagination.itemPerPage;
        return filteredPresets.slice(start, start + pagination.itemPerPage);
    }, [filteredPresets, pagination.currentPage, pagination.itemPerPage]);

    const goToPage = (page: number) => {
        const totalPages = Math.max(1, Math.ceil(filteredCount / itemPerPageRef.current));
        const safePage = Math.min(Math.max(1, page), totalPages);
        setPagination((prev) => ({ ...prev, currentPage: safePage }));
    };

    const openCreate = () => {
        if (tab === 'settings') return;
        if (tab === 'modes') {
            setModeFormIsNew(true);
            setModeForm({ ...EMPTY_MODE });
            return;
        }
        const defaultLayer = layers[0];
        setPresetFormIsNew(true);
        setPresetForm({
            ...EMPTY_PRESET,
            kind: tab,
            layer: defaultLayer.key,
            layerTitleFa: defaultLayer.titleFa,
        });
    };

    const saveMode = async () => {
        if (!modeForm) return;
        const id = toSlug(modeForm.id || modeForm.title);
        if (!id) {
            ErrorToaster({ message: 'شناسه یا عنوان انگلیسی الزامی است' });
            return;
        }
        try {
            setSaving(true);
            await axios.post(
                `${baseUrl}/api/ai-modes`,
                {
                    ...modeForm,
                    id,
                    providerModes: modeForm.providerModes.split(',').map((s) => s.trim()).filter(Boolean),
                    supportedModels: modeForm.supportedModels.split(',').map((s) => s.trim()).filter(Boolean),
                    supportedModelIds: modeForm.supportedModelIds || [],
                    guideImages: modeForm.guideImages.split('\n').map((s) => s.trim()).filter(Boolean),
                    inputs: sanitizeModeInputs(modeForm.inputs || []),
                    sortOrder: Number(modeForm.sortOrder) || 100,
                    isSystem: modeFormIsNew ? false : modeForm.isSystem,
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'مود ذخیره شد' });
            setModeForm(null);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const savePreset = async () => {
        if (!presetForm) return;
        const id = toSlug(presetForm.id || presetForm.title);
        if (!id) {
            ErrorToaster({ message: 'شناسه یا عنوان انگلیسی الزامی است' });
            return;
        }
        try {
            setSaving(true);
            await axios.post(
                `${baseUrl}/api/ai-modes/presets`,
                {
                    ...presetForm,
                    id,
                    kind: tab === 'camera' || tab === 'lighting' ? tab : presetForm.kind,
                    guideImages: presetForm.guideImages.split('\n').map((s) => s.trim()).filter(Boolean),
                    sortOrder: Number(presetForm.sortOrder) || 100,
                    isSystem: presetFormIsNew ? false : presetForm.isSystem,
                    payload: presetForm.payload || {},
                    options: presetForm.options || [],
                },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'آیتم ذخیره شد' });
            setPresetForm(null);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const toggleModeActive = async (mode: AiModeDoc) => {
        try {
            await axios.post(
                `${baseUrl}/api/ai-modes`,
                { ...mode, isActive: !mode.isActive },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'ذخیره شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const togglePresetActive = async (preset: DirectorPresetDoc) => {
        try {
            await axios.post(
                `${baseUrl}/api/ai-modes/presets`,
                { ...preset, isActive: !preset.isActive },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'ذخیره شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const deleteMode = async (mode: AiModeDoc) => {
        if (!confirm(`حذف مود «${mode.titleFa || mode.title}»؟`)) return;
        try {
            await axios.delete(`${baseUrl}/api/ai-modes/${encodeURIComponent(mode.id)}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            SuccessToaster({ message: 'مود حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const deletePreset = async (preset: DirectorPresetDoc) => {
        if (!confirm(`حذف «${preset.titleFa || preset.title}»؟`)) return;
        try {
            await axios.delete(
                `${baseUrl}/api/ai-modes/presets/${preset.kind}/${encodeURIComponent(preset.id)}`,
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({ message: 'آیتم حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const addLabel =
        tab === 'modes' ? '+ مود جدید' : tab === 'camera' ? '+ حرکت دوربین جدید' : '+ نورپردازی جدید';

    const applyLayer = (layerKey: string) => {
        const known = layers.find((layer) => layer.key === layerKey);
        setPresetForm((prev) =>
            prev
                ? {
                      ...prev,
                      layer: layerKey,
                      layerTitleFa: known?.titleFa || prev.layerTitleFa,
                  }
                : prev,
        );
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>مودها</h1>
                            <p className={styles.subtitle}>
                                کاتالوگ حالت‌های تولید، حرکت دوربین و نورپردازی برای مدل‌های هوش مصنوعی. آیتم‌ها را
                                اضافه، ویرایش یا حذف کنید؛ نمایش هر بخش در چت از تب تنظیمات کنترل می‌شود.
                            </p>
                        </div>
                        {isSettingsTab ? null : (
                            <button type="button" className={styles.primaryBtn} onClick={openCreate}>
                                {addLabel}
                            </button>
                        )}
                    </header>

                    <div className={styles.noticeWrap}>
                        <ExpandableSection
                            title="آموزش مود تولید، حرکت دوربین و نورپردازی"
                            subtitle="تب‌ها، افزودن آیتم، تصویر کارت و اتصال به مدل‌ها"
                            defaultOpen
                            badge={<span className={styles.noticeBadge}>مرجع: همین صفحه</span>}
                        >
                            <div className={styles.noticeGrid}>
                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۱</span>
                                        <h3>چهار تب در یک صفحه</h3>
                                    </div>
                                    <p>
                                        منوی سایدبار فقط <strong>مودها</strong> را نشان می‌دهد. حرکت دوربین،
                                        نورپردازی و تنظیمات نمایش در چت همین‌جا با تب‌های بالا در دسترس‌اند. در موبایل
                                        تب‌ها را افقی بکشید؛ ظاهرشان لینک خطی است نه دکمه.
                                    </p>
                                </div>
                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۲</span>
                                        <h3>مود تولید</h3>
                                    </div>
                                    <p>
                                        هر مود مشخص می‌کند ورودی چیست (متن، عکس، رفرنس، …) و روی کدام{' '}
                                        <code>providerModes</code> اجرا می‌شود. در صفحه هر مدل تعیین می‌کنید کدام مودها
                                        برای آن فعال باشد.
                                    </p>
                                </div>
                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۳</span>
                                        <h3>حرکت دوربین و نورپردازی</h3>
                                    </div>
                                    <p>
                                        پریست‌ها متن انگلیسی را به پرامپت مدل تزریق می‌کنند. می‌توانید برای هر لایه
                                        (پریست حرکت، لنز، فوکوس، پریست نور، دمای رنگ و …) آیتم تازه بسازید یا موارد
                                        موجود را حذف کنید.
                                    </p>
                                </div>
                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۴</span>
                                        <h3>آیکون SVG کارت</h3>
                                    </div>
                                    <p>
                                        مثل درگاه‌های پرداخت، محتوای SVG را در فرم paste کنید؛ اگر خالی باشد آیکون
                                        پیش‌فرض نمایش داده می‌شود. تصاویر راهنما فقط داخل پنل آموزشی می‌آیند.
                                    </p>
                                </div>
                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeCardHead}>
                                        <span className={styles.stepNumber}>۵</span>
                                        <h3>تنظیمات نمایش در چت</h3>
                                    </div>
                                    <p>
                                        از تب <strong>تنظیمات</strong> می‌توانید کل بخش مود تولید، حرکت دوربین یا
                                        نورپردازی را در نوار چت استودیو خاموش یا روشن کنید. خاموش یعنی آن بخش برای همه
                                        کاربران از چت حذف می‌شود.
                                    </p>
                                </div>
                            </div>
                            <div className={styles.noticeFooter}>
                                <p>
                                    شناسه فقط حروف کوچک انگلیسی، عدد و خط تیره است (مثلاً <code>orbit-right</code>). بعد
                                    از ذخیره، آیتم در چت و نودهای ورک‌فلو قابل انتخاب می‌شود.
                                </p>
                            </div>
                        </ExpandableSection>
                    </div>

                    <SimpleLineNav
                        items={[
                            { href: '/ai-modes', label: 'مود تولید' },
                            { href: '/ai-modes/camera', label: 'حرکت دوربین' },
                            { href: '/ai-modes/lighting', label: 'نورپردازی' },
                            { href: '/ai-modes/settings', label: 'تنظیمات' },
                        ]}
                        activeHref={TAB_HREF[tab]}
                    />

                    {isSettingsTab ? (
                        <ChatPanelsCard panels={chatPanels} saving={savingPanels} onToggle={toggleChatPanel} />
                    ) : (
                    <>
                    <div className={styles.toolbar}>
                        <input
                            className={styles.searchInput}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={tab === 'modes' ? 'جستجو در مودها' : 'جستجو در آیتم‌ها'}
                        />
                        {tab === 'modes' ? (
                            <select
                                className={styles.selectInput}
                                value={groupFilter}
                                onChange={(e) => setGroupFilter(e.target.value)}
                            >
                                <option value="">همه گروه‌ها</option>
                                {GROUPS.map((group) => (
                                    <option value={group.key} key={group.key}>
                                        {group.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select
                                className={styles.selectInput}
                                value={layerFilter}
                                onChange={(e) => setLayerFilter(e.target.value)}
                            >
                                <option value="">همه لایه‌ها</option>
                                {layers.map((layer) => (
                                    <option value={layer.key} key={layer.key}>
                                        {layer.titleFa}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className={styles.itemGrid}>
                        {loading ? (
                            <div className={styles.loadingState}>
                                <LoadingState />
                            </div>
                        ) : tab === 'modes' ? (
                            pagedModes.length === 0 ? (
                                <div className={styles.emptyState}>
                                    {modes.length === 0
                                        ? 'مودی ثبت نشده — یک مود جدید اضافه کنید یا API را ری‌استارت کنید تا seed اجرا شود.'
                                        : 'مودی با این فیلترها یافت نشد.'}
                                    <br />
                                    <button type="button" className={styles.primaryBtn} style={{ marginTop: 12 }} onClick={openCreate}>
                                        {addLabel}
                                    </button>
                                </div>
                            ) : (
                                pagedModes.map((mode) => (
                                    <article
                                        key={mode._id}
                                        className={`${styles.itemCard} ${mode.isActive ? '' : styles.inactive}`}
                                    >
                                        <div className={styles.itemCardHead}>
                                            <ThumbBox iconSvg={mode.iconSvg} icon={mode.icon} />
                                            <div className={styles.itemTitle}>
                                                <h3>{mode.titleFa || mode.title}</h3>
                                                <div className={styles.slug}>{mode.id}</div>
                                            </div>
                                            <span className={styles.orderBadge}>#{toFarsiNumber(mode.sortOrder ?? 0)}</span>
                                        </div>
                                        <p className={styles.desc}>{mode.descriptionFa || '—'}</p>
                                        <div className={styles.metaRow}>
                                            <span className={`${styles.badge} ${styles.badgePrimary}`}>
                                                {mediaLabel(mode.mediaClass)}
                                            </span>
                                            <span className={styles.badge}>
                                                {GROUPS.find((g) => g.key === mode.group)?.label || mode.group}
                                            </span>
                                            {(mode.inputs || []).filter((input) => input && input.type !== 'prompt').length ? (
                                                <span className={styles.badge}>
                                                    {(mode.inputs || [])
                                                        .filter((input) => String(input.type || '') !== 'prompt')
                                                        .map((input) => String(input.labelFa || input.label || input.key))
                                                        .join(' + ')}
                                                </span>
                                            ) : (
                                                <span className={`${styles.badge} ${styles.badgeMuted}`}>فقط پرامپت</span>
                                            )}
                                        </div>
                                        <div className={styles.toggleRow}>
                                            <label className={styles.toggleLabel}>
                                                <span>فعال</span>
                                                <input
                                                    type="checkbox"
                                                    checked={mode.isActive !== false}
                                                    onChange={() => toggleModeActive(mode)}
                                                />
                                            </label>
                                        </div>
                                        <div className={styles.cardActions}>
                                            {hasGuideContent(mode.guide, mode.guideImages) ? (
                                                <button
                                                    type="button"
                                                    className={styles.editLink}
                                                    onClick={() => setOpenGuideKey(openGuideKey === mode._id ? '' : mode._id)}
                                                >
                                                    {openGuideKey === mode._id ? 'بستن راهنما' : 'راهنما'}
                                                </button>
                                            ) : null}
                                            <button
                                                type="button"
                                                className={styles.editLink}
                                                onClick={() => {
                                                    setModeFormIsNew(false);
                                                    setModeForm(modeToForm(mode));
                                                }}
                                            >
                                                ویرایش
                                            </button>
                                            <button type="button" className={styles.removeBtn} onClick={() => deleteMode(mode)}>
                                                حذف
                                            </button>
                                        </div>
                                        {openGuideKey === mode._id ? (
                                            <ModeGuide value={mode.guide} images={mode.guideImages} />
                                        ) : null}
                                    </article>
                                ))
                            )
                        ) : pagedPresets.length === 0 ? (
                            <div className={styles.emptyState}>
                                {presets.length === 0
                                    ? 'آیتمی ثبت نشده — مورد جدید اضافه کنید یا API را ری‌استارت کنید تا seed اجرا شود.'
                                    : 'آیتمی با این فیلترها یافت نشد.'}
                                <br />
                                <button type="button" className={styles.primaryBtn} style={{ marginTop: 12 }} onClick={openCreate}>
                                    {addLabel}
                                </button>
                            </div>
                        ) : (
                            pagedPresets.map((preset) => (
                                <article
                                    key={preset._id}
                                    className={`${styles.itemCard} ${preset.isActive ? '' : styles.inactive}`}
                                >
                                    <div className={styles.itemCardHead}>
                                        <ThumbBox
                                            iconSvg={preset.iconSvg}
                                            icon={tab === 'camera' ? 'LuCamera' : 'LuSun'}
                                        />
                                        <div className={styles.itemTitle}>
                                            <h3>{preset.titleFa || preset.title}</h3>
                                            <div className={styles.slug}>{preset.id}</div>
                                        </div>
                                        <span className={styles.orderBadge}>#{toFarsiNumber(preset.sortOrder ?? 0)}</span>
                                    </div>
                                    <p className={styles.desc}>{preset.summaryFa || preset.promptText || '—'}</p>
                                    <div className={styles.metaRow}>
                                        <span className={`${styles.badge} ${styles.badgePrimary}`}>
                                            {preset.layerTitleFa || preset.layer}
                                        </span>
                                        {preset.categoryTitleFa ? (
                                            <span className={styles.badge}>{preset.categoryTitleFa}</span>
                                        ) : null}
                                    </div>
                                    <div className={styles.toggleRow}>
                                        <label className={styles.toggleLabel}>
                                            <span>فعال</span>
                                            <input
                                                type="checkbox"
                                                checked={preset.isActive !== false}
                                                onChange={() => togglePresetActive(preset)}
                                            />
                                        </label>
                                    </div>
                                    <div className={styles.cardActions}>
                                        {hasGuideContent(preset.guide, preset.guideImages) ? (
                                            <button
                                                type="button"
                                                className={styles.editLink}
                                                onClick={() => setOpenGuideKey(openGuideKey === preset._id ? '' : preset._id)}
                                            >
                                                {openGuideKey === preset._id ? 'بستن راهنما' : 'راهنما'}
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className={styles.editLink}
                                            onClick={() => {
                                                setPresetFormIsNew(false);
                                                setPresetForm(presetToForm(preset));
                                            }}
                                        >
                                            ویرایش
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.removeBtn}
                                            onClick={() => deletePreset(preset)}
                                        >
                                            حذف
                                        </button>
                                    </div>
                                    {openGuideKey === preset._id ? (
                                        <ModeGuide value={preset.guide} images={preset.guideImages} />
                                    ) : null}
                                </article>
                            ))
                        )}
                    </div>

                    {!loading && (
                        <Pagination
                            rtl
                            className={styles.paginationBar}
                            itemPerPage={pagination.itemPerPage}
                            totalItems={filteredCount}
                            currentPage={pagination.currentPage}
                            paginate={goToPage}
                            setRowsPerPage={(next) => {
                                itemPerPageRef.current = next;
                                setPagination((prev) => ({
                                    ...prev,
                                    itemPerPage: next,
                                    currentPage: 1,
                                }));
                            }}
                        />
                    )}
                    </>
                    )}
                </div>
            </Wrapper>

            {modeForm ? (
                <div
                    className={styles.overlay}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setModeForm(null);
                    }}
                >
                    <div className={styles.modal}>
                        <div className={styles.modalTitle}>
                            <h2>{modeFormIsNew ? 'مود جدید' : `ویرایش مود: ${modeForm.titleFa || modeForm.id}`}</h2>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setModeForm(null)}>
                                بستن
                            </button>
                        </div>
                        <div className={styles.formSections}>
                            <FormSection title="هویت مود">
                            <label className={styles.field}>
                                شناسه (id)
                                <input
                                    value={modeForm.id}
                                    disabled={!modeFormIsNew}
                                    onChange={(e) => setModeForm({ ...modeForm, id: e.target.value })}
                                    dir="ltr"
                                    placeholder="text-to-video"
                                />
                                <small>
                                    {modeFormIsNew
                                        ? 'حروف کوچک انگلیسی، عدد و خط تیره'
                                        : 'غیرقابل تغییر — مدل‌ها به همین شناسه ارجاع می‌دهند'}
                                </small>
                            </label>
                            <label className={styles.field}>
                                گروه
                                <select
                                    value={modeForm.group}
                                    onChange={(e) => setModeForm({ ...modeForm, group: e.target.value })}
                                >
                                    {GROUPS.map((g) => (
                                        <option value={g.key} key={g.key}>
                                            {g.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.field}>
                                عنوان انگلیسی
                                <input
                                    value={modeForm.title}
                                    onChange={(e) => setModeForm({ ...modeForm, title: e.target.value })}
                                    dir="ltr"
                                />
                            </label>
                            <label className={styles.field}>
                                عنوان فارسی
                                <input
                                    value={modeForm.titleFa}
                                    onChange={(e) => setModeForm({ ...modeForm, titleFa: e.target.value })}
                                />
                            </label>
                            <label className={styles.field}>
                                ترتیب نمایش
                                <input
                                    type="number"
                                    value={modeForm.sortOrder}
                                    onChange={(e) => setModeForm({ ...modeForm, sortOrder: Number(e.target.value) })}
                                />
                            </label>
                            <label className={styles.field}>
                                وضعیت
                                <select
                                    value={modeForm.isActive ? '1' : '0'}
                                    onChange={(e) => setModeForm({ ...modeForm, isActive: e.target.value === '1' })}
                                >
                                    <option value="1">فعال</option>
                                    <option value="0">غیرفعال</option>
                                </select>
                            </label>
                            </FormSection>

                            <FormSection title="آیکون کارت">
                            <label className={`${styles.field} ${styles.full}`}>
                                آیکون SVG (مثل درگاه پرداخت — paste کنید)
                                <SvgPasteField
                                    value={modeForm.iconSvg}
                                    onChange={(iconSvg) => setModeForm({ ...modeForm, iconSvg })}
                                    fallbackIcon={modeForm.icon}
                                />
                                <small>اگر SVG خالی باشد از آیکون پیش‌فرض زیر استفاده می‌شود</small>
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                آیکون پیش‌فرض
                                <ModeIconPicker
                                    value={modeForm.icon}
                                    onChange={(icon) => setModeForm({ ...modeForm, icon })}
                                />
                            </label>
                            </FormSection>

                            <FormSection title="سازگاری با مدل">
                            <label className={styles.field}>
                                کلاس رسانه
                                <select
                                    value={modeForm.mediaClass}
                                    onChange={(e) => setModeForm({ ...modeForm, mediaClass: e.target.value })}
                                >
                                    <option value="video">ویدیو</option>
                                    <option value="image">تصویر</option>
                                    <option value="audio">صوت</option>
                                    <option value="text">متن</option>
                                    <option value="3d">سه‌بعدی</option>
                                    <option value="any">همه کلاس‌ها</option>
                                </select>
                            </label>
                            <label className={styles.field}>
                                mode های سطح مدل (جداشده با کاما)
                                <input
                                    value={modeForm.providerModes}
                                    onChange={(e) => setModeForm({ ...modeForm, providerModes: e.target.value })}
                                    dir="ltr"
                                />
                                <small>مثل: text-to-video, reference_to_video, reference_to_image — خالی = overlay پرامپت‌محور</small>
                            </label>
                            <div className={`${styles.field} ${styles.full}`}>
                                مدل‌های مجاز
                                <AllowedModelsPicker
                                    value={modeForm.supportedModelIds || []}
                                    onChange={(supportedModelIds) => setModeForm({ ...modeForm, supportedModelIds })}
                                    token={token}
                                    baseUrl={baseUrl}
                                    mediaClass={modeForm.mediaClass}
                                />
                            </div>
                            </FormSection>

                            <FormSection title="ورودی‌های چت">
                            <div className={`${styles.field} ${styles.full}`}>
                                <ModeInputsEditor
                                    value={modeForm.inputs}
                                    onChange={(inputs) => setModeForm({ ...modeForm, inputs })}
                                />
                            </div>
                            </FormSection>

                            <FormSection title="توضیح و راهنما">
                            <label className={`${styles.field} ${styles.full}`}>
                                توضیح کوتاه فارسی
                                <textarea
                                    value={modeForm.descriptionFa}
                                    onChange={(e) => setModeForm({ ...modeForm, descriptionFa: e.target.value })}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                راهنمای آموزشی (Markdown)
                                <textarea
                                    className={styles.guide}
                                    value={modeForm.guide}
                                    onChange={(e) => setModeForm({ ...modeForm, guide: e.target.value })}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                تصاویر راهنما (هر خط یک مسیر)
                                <textarea
                                    value={modeForm.guideImages}
                                    onChange={(e) => setModeForm({ ...modeForm, guideImages: e.target.value })}
                                    dir="ltr"
                                />
                                {modeForm.guideImages ? (
                                    <div className={styles.previewImages}>
                                        {modeForm.guideImages
                                            .split('\n')
                                            .filter(Boolean)
                                            .slice(0, 6)
                                            .map((src) => (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={src.trim()} alt="preview" key={src} />
                                            ))}
                                    </div>
                                ) : null}
                            </label>
                            </FormSection>
                        </div>
                        <div className={styles.modalActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setModeForm(null)}>
                                انصراف
                            </button>
                            <button type="button" className={styles.primaryBtn} onClick={saveMode} disabled={saving}>
                                {saving ? 'در حال ذخیره...' : 'ذخیره'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {presetForm ? (
                <div
                    className={styles.overlay}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setPresetForm(null);
                    }}
                >
                    <div className={styles.modal}>
                        <div className={styles.modalTitle}>
                            <h2>
                                {presetFormIsNew
                                    ? tab === 'camera'
                                        ? 'حرکت دوربین جدید'
                                        : 'نورپردازی جدید'
                                    : `ویرایش: ${presetForm.titleFa || presetForm.id}`}
                            </h2>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setPresetForm(null)}>
                                بستن
                            </button>
                        </div>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                شناسه (id)
                                <input
                                    value={presetForm.id}
                                    disabled={!presetFormIsNew}
                                    onChange={(e) => setPresetForm({ ...presetForm, id: e.target.value })}
                                    dir="ltr"
                                    placeholder="orbit-right"
                                />
                            </label>
                            <label className={styles.field}>
                                لایه
                                <select value={presetForm.layer} onChange={(e) => applyLayer(e.target.value)}>
                                    {layers.map((layer) => (
                                        <option value={layer.key} key={layer.key}>
                                            {layer.titleFa}
                                        </option>
                                    ))}
                                    {!layers.some((layer) => layer.key === presetForm.layer) ? (
                                        <option value={presetForm.layer}>{presetForm.layerTitleFa || presetForm.layer}</option>
                                    ) : null}
                                </select>
                            </label>
                            <label className={styles.field}>
                                کلید لایه (انگلیسی)
                                <input
                                    value={presetForm.layer}
                                    onChange={(e) =>
                                        setPresetForm({
                                            ...presetForm,
                                            layer: e.target.value,
                                        })
                                    }
                                    dir="ltr"
                                    placeholder="preset"
                                />
                                <small>برای لایه جدید یک کلید تازه بنویسید</small>
                            </label>
                            <label className={styles.field}>
                                عنوان لایه (فارسی)
                                <input
                                    value={presetForm.layerTitleFa}
                                    onChange={(e) => setPresetForm({ ...presetForm, layerTitleFa: e.target.value })}
                                />
                                <small>برای لایه جدید می‌توانید عنوان دلخواه بگذارید</small>
                            </label>
                            <label className={styles.field}>
                                دسته
                                <input
                                    value={presetForm.categoryTitleFa}
                                    onChange={(e) =>
                                        setPresetForm({
                                            ...presetForm,
                                            categoryTitleFa: e.target.value,
                                            category: toSlug(e.target.value) || presetForm.category,
                                        })
                                    }
                                />
                            </label>
                            <label className={styles.field}>
                                عنوان انگلیسی
                                <input
                                    value={presetForm.title}
                                    onChange={(e) => setPresetForm({ ...presetForm, title: e.target.value })}
                                    dir="ltr"
                                />
                            </label>
                            <label className={styles.field}>
                                عنوان فارسی
                                <input
                                    value={presetForm.titleFa}
                                    onChange={(e) => setPresetForm({ ...presetForm, titleFa: e.target.value })}
                                />
                            </label>
                            <label className={styles.field}>
                                ترتیب نمایش
                                <input
                                    type="number"
                                    value={presetForm.sortOrder}
                                    onChange={(e) => setPresetForm({ ...presetForm, sortOrder: Number(e.target.value) })}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                آیکون SVG (مثل درگاه پرداخت — paste کنید)
                                <SvgPasteField
                                    value={presetForm.iconSvg}
                                    onChange={(iconSvg) => setPresetForm({ ...presetForm, iconSvg })}
                                    fallbackIcon={tab === 'camera' ? 'LuCamera' : 'LuSun'}
                                />
                                <small>اگر SVG خالی باشد از آیکون پیش‌فرض دوربین/نور استفاده می‌شود</small>
                            </label>
                            <label className={styles.field}>
                                وضعیت
                                <select
                                    value={presetForm.isActive ? '1' : '0'}
                                    onChange={(e) => setPresetForm({ ...presetForm, isActive: e.target.value === '1' })}
                                >
                                    <option value="1">فعال</option>
                                    <option value="0">غیرفعال</option>
                                </select>
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                خلاصه فارسی
                                <textarea
                                    value={presetForm.summaryFa}
                                    onChange={(e) => setPresetForm({ ...presetForm, summaryFa: e.target.value })}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                متن پرامپت (انگلیسی — به پرامپت کاربر تزریق می‌شود)
                                <textarea
                                    value={presetForm.promptText}
                                    onChange={(e) => setPresetForm({ ...presetForm, promptText: e.target.value })}
                                    dir="ltr"
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                راهنمای آموزشی (Markdown)
                                <textarea
                                    className={styles.guide}
                                    value={presetForm.guide}
                                    onChange={(e) => setPresetForm({ ...presetForm, guide: e.target.value })}
                                />
                            </label>
                            <label className={`${styles.field} ${styles.full}`}>
                                تصاویر راهنما (هر خط یک مسیر — خط اول = تصویر کارت)
                                <textarea
                                    value={presetForm.guideImages}
                                    onChange={(e) => setPresetForm({ ...presetForm, guideImages: e.target.value })}
                                    dir="ltr"
                                />
                                {presetForm.guideImages ? (
                                    <div className={styles.previewImages}>
                                        {presetForm.guideImages
                                            .split('\n')
                                            .filter(Boolean)
                                            .slice(0, 6)
                                            .map((src) => (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={src.trim()} alt="preview" key={src} />
                                            ))}
                                    </div>
                                ) : null}
                            </label>
                        </div>
                        <div className={styles.modalActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setPresetForm(null)}>
                                انصراف
                            </button>
                            <button type="button" className={styles.primaryBtn} onClick={savePreset} disabled={saving}>
                                {saving ? 'در حال ذخیره...' : 'ذخیره'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </Container>
    );
}
