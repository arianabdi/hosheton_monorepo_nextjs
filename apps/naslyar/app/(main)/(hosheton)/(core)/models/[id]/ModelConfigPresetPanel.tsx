'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiBookmark, FiLoader, FiTrash2, FiCopy, FiSave, FiCheckCircle } from 'react-icons/fi';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import syncStyles from './ModelPriceSync.module.scss';
import type { ModelPricing } from './modelPricing.types';
import type { NodeSettingFieldPreview } from './ModelSettingsSync';

export type PresetPanelKind = 'settings' | 'pricing';

interface PresetItem {
    _id: string;
    name: string;
    kind: 'settings' | 'pricing' | 'both';
    notes?: string;
    sourceModelName?: string;
    settingsSchema?: NodeSettingFieldPreview[];
    pricing?: ModelPricing;
    updatedAt?: string;
}

interface ModelListItem {
    _id: string;
    name: string;
    displayName?: string;
    settingsSchema?: NodeSettingFieldPreview[];
    pricing?: ModelPricing;
}

interface Props {
    kind: PresetPanelKind;
    modelId?: string;
    modelName: string;
    token: string;
    baseUrl: string;
    /** Current form payload to save as preset */
    getCurrentPayload: () => {
        settingsSchema?: NodeSettingFieldPreview[];
        pricing?: ModelPricing;
    };
    canSave: boolean;
    onApplySettings?: (fields: NodeSettingFieldPreview[]) => void;
    onApplyPricing?: (pricing: ModelPricing) => void;
}

export default function ModelConfigPresetPanel({
    kind,
    modelId,
    modelName,
    token,
    baseUrl,
    getCurrentPayload,
    canSave,
    onApplySettings,
    onApplyPricing,
}: Props) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'presets' | 'copy'>('presets');
    const [presets, setPresets] = useState<PresetItem[]>([]);
    const [models, setModels] = useState<ModelListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [selectedPresetId, setSelectedPresetId] = useState('');
    const [selectedModelId, setSelectedModelId] = useState('');
    const [modelSearch, setModelSearch] = useState('');
    const panelRef = useRef<HTMLDivElement>(null);

    const headers = { authorization: `Bearer ${token}` };

    const loadPresets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${baseUrl}/api/provider-model-presets`, {
                headers,
                params: { kind },
            });
            if (res.data?.statusCode === 200) {
                const list: PresetItem[] = res.data.data?.presets || [];
                setPresets(list);
                if (list.length && !selectedPresetId) setSelectedPresetId(list[0]._id);
            }
        } catch {
            ErrorToaster({ message: 'بارگذاری قالب‌ها ناموفق بود' });
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseUrl, token, kind]);

    const loadModels = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${baseUrl}/api/provider-models`, {
                headers,
                params: { limit: 200, page: 1, search: modelSearch || undefined },
            });
            if (res.data?.statusCode === 200) {
                const list: ModelListItem[] = (res.data.data?.models || []).filter(
                    (m: ModelListItem) => m._id !== modelId,
                );
                setModels(list);
            }
        } catch {
            ErrorToaster({ message: 'بارگذاری مدل‌ها ناموفق بود' });
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseUrl, token, modelId, modelSearch]);

    useEffect(() => {
        if (!open) return;
        if (tab === 'presets') loadPresets();
        else loadModels();
    }, [open, tab, loadPresets, loadModels]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleSave = async () => {
        const name = presetName.trim() || `${modelName || 'model'} — ${kind === 'settings' ? 'تنظیمات' : 'قیمت'}`;
        const payload = getCurrentPayload();

        if (kind === 'settings' && (!payload.settingsSchema || payload.settingsSchema.length === 0)) {
            ErrorToaster({ message: 'حداقل یک فیلد تنظیمات لازم است' });
            return;
        }
        if (kind === 'pricing' && !payload.pricing) {
            ErrorToaster({ message: 'ساختار قیمت‌گذاری خالی است' });
            return;
        }

        setSaving(true);
        try {
            const res = await axios.post(
                `${baseUrl}/api/provider-model-presets`,
                {
                    name,
                    kind,
                    sourceModelName: modelName || undefined,
                    sourceModelId: modelId || undefined,
                    settingsSchema: kind === 'settings' ? payload.settingsSchema : undefined,
                    pricing: kind === 'pricing' ? payload.pricing : undefined,
                },
                { headers },
            );
            if (res.data?.statusCode === 200 || res.data?.statusCode === 201) {
                SuccessToaster({ message: 'قالب ذخیره شد' });
                setPresetName('');
                await loadPresets();
                const created = res.data.data;
                if (created?._id) setSelectedPresetId(created._id);
            } else {
                ErrorToaster({ message: res.data?.message || 'ذخیره قالب ناموفق بود' });
            }
        } catch (e: any) {
            ErrorToaster({ message: e?.response?.data?.message || 'ذخیره قالب ناموفق بود' });
        } finally {
            setSaving(false);
        }
    };

    const handleApplyPreset = async () => {
        if (!selectedPresetId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${baseUrl}/api/provider-model-presets/${selectedPresetId}`, { headers });
            if (res.data?.statusCode !== 200) {
                ErrorToaster({ message: 'قالب یافت نشد' });
                return;
            }
            const preset: PresetItem = res.data.data;
            if (kind === 'settings') {
                if (!preset.settingsSchema?.length) {
                    ErrorToaster({ message: 'این قالب فیلد تنظیمات ندارد' });
                    return;
                }
                onApplySettings?.(preset.settingsSchema);
            } else {
                if (!preset.pricing) {
                    ErrorToaster({ message: 'این قالب قیمت‌گذاری ندارد' });
                    return;
                }
                onApplyPricing?.(preset.pricing as ModelPricing);
            }
            SuccessToaster({ message: `قالب «${preset.name}» اعمال شد — قبل از ذخیره بررسی کنید` });
            setOpen(false);
        } catch {
            ErrorToaster({ message: 'اعمال قالب ناموفق بود' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePreset = async () => {
        if (!selectedPresetId) return;
        if (!window.confirm('این قالب حذف شود؟')) return;
        try {
            await axios.delete(`${baseUrl}/api/provider-model-presets/${selectedPresetId}`, { headers });
            SuccessToaster({ message: 'قالب حذف شد' });
            setSelectedPresetId('');
            await loadPresets();
        } catch {
            ErrorToaster({ message: 'حذف قالب ناموفق بود' });
        }
    };

    const handleCopyFromModel = async () => {
        if (!selectedModelId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${baseUrl}/api/provider-models/${selectedModelId}`, { headers });
            if (res.data?.statusCode !== 200) {
                ErrorToaster({ message: 'مدل یافت نشد' });
                return;
            }
            const source: ModelListItem = res.data.data;
            if (kind === 'settings') {
                if (!source.settingsSchema?.length) {
                    ErrorToaster({ message: 'مدل مبدا تنظیماتی ندارد' });
                    return;
                }
                onApplySettings?.(source.settingsSchema);
            } else {
                if (!source.pricing) {
                    ErrorToaster({ message: 'مدل مبدا قیمت‌گذاری ندارد' });
                    return;
                }
                onApplyPricing?.(source.pricing);
            }
            SuccessToaster({
                message: `از «${source.displayName || source.name}» کپی شد — قبل از ذخیره بررسی کنید`,
            });
            setOpen(false);
        } catch {
            ErrorToaster({ message: 'کپی از مدل ناموفق بود' });
        } finally {
            setLoading(false);
        }
    };

    const title = kind === 'settings' ? 'قالب تنظیمات مدل' : 'قالب قیمت‌گذاری';
    const hint =
        kind === 'settings'
            ? 'تنظیمات فعلی را ذخیره کنید یا از قالب / مدل مشابه اعمال کنید'
            : 'قیمت‌گذاری فعلی را ذخیره کنید یا از قالب / مدل مشابه اعمال کنید';

    return (
        <div className={syncStyles.wrapper} ref={panelRef}>
            <div className={syncStyles.bar}>
                <div className={syncStyles.barInfo}>
                    <FiBookmark className={syncStyles.barIcon} size={18} />
                    <div>
                        <div className={syncStyles.barTitle}>{title}</div>
                        <div className={syncStyles.barHint}>{hint}</div>
                    </div>
                </div>
                <button
                    type="button"
                    className={syncStyles.triggerBtn}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? 'بستن' : 'قالب‌ها'}
                </button>
            </div>

            {open && (
                <div className={syncStyles.panel}>
                    <div className={syncStyles.searchRow}>
                        <button
                            type="button"
                            className={syncStyles.triggerBtn}
                            style={{ opacity: tab === 'presets' ? 1 : 0.55 }}
                            onClick={() => setTab('presets')}
                        >
                            قالب‌های ذخیره‌شده
                        </button>
                        <button
                            type="button"
                            className={syncStyles.triggerBtn}
                            style={{ opacity: tab === 'copy' ? 1 : 0.55 }}
                            onClick={() => setTab('copy')}
                        >
                            کپی از مدل دیگر
                        </button>
                    </div>

                    {tab === 'presets' ? (
                        <>
                            <div className={syncStyles.searchRow}>
                                <input
                                    className={syncStyles.sourceSelect}
                                    placeholder="نام قالب جدید (مثلاً Seedance 2.0 Fast)"
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className={syncStyles.searchBtn}
                                    disabled={!canSave || saving}
                                    onClick={handleSave}
                                >
                                    {saving ? <FiLoader className={syncStyles.spin} /> : <FiSave />}
                                    ذخیره قالب
                                </button>
                            </div>
                            <p className={syncStyles.searchHint}>
                                از تنظیمات/قیمت فعلی همین صفحه یک قالب می‌سازد تا روی مدل‌های مشابه اعمال شود.
                            </p>

                            <div className={syncStyles.searchRow}>
                                <select
                                    className={syncStyles.sourceSelect}
                                    value={selectedPresetId}
                                    onChange={(e) => setSelectedPresetId(e.target.value)}
                                    disabled={loading || presets.length === 0}
                                >
                                    {presets.length === 0 ? (
                                        <option value="">قالبی ذخیره نشده</option>
                                    ) : (
                                        presets.map((p) => (
                                            <option key={p._id} value={p._id}>
                                                {p.name}
                                                {p.sourceModelName ? ` ← ${p.sourceModelName}` : ''}
                                                {p.kind === 'both' ? ' (هر دو)' : ''}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <button
                                    type="button"
                                    className={syncStyles.searchBtn}
                                    disabled={!selectedPresetId || loading}
                                    onClick={handleApplyPreset}
                                >
                                    {loading ? <FiLoader className={syncStyles.spin} /> : <FiCheckCircle />}
                                    اعمال
                                </button>
                                <button
                                    type="button"
                                    className={syncStyles.triggerBtn}
                                    disabled={!selectedPresetId || loading}
                                    onClick={handleDeletePreset}
                                    title="حذف قالب"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={syncStyles.searchRow}>
                                <input
                                    className={syncStyles.sourceSelect}
                                    placeholder="جستجوی نام مدل مبدا…"
                                    value={modelSearch}
                                    onChange={(e) => setModelSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') loadModels();
                                    }}
                                />
                                <button
                                    type="button"
                                    className={syncStyles.searchBtn}
                                    disabled={loading}
                                    onClick={loadModels}
                                >
                                    {loading ? <FiLoader className={syncStyles.spin} /> : <FiCopy />}
                                    جستجو
                                </button>
                            </div>
                            <div className={syncStyles.searchRow}>
                                <select
                                    className={syncStyles.sourceSelect}
                                    value={selectedModelId}
                                    onChange={(e) => setSelectedModelId(e.target.value)}
                                    disabled={loading || models.length === 0}
                                >
                                    <option value="">
                                        {models.length === 0 ? 'مدلی یافت نشد' : 'انتخاب مدل مبدا'}
                                    </option>
                                    {models.map((m) => (
                                        <option key={m._id} value={m._id}>
                                            {m.displayName || m.name}
                                            {kind === 'settings'
                                                ? ` (${m.settingsSchema?.length || 0} فیلد)`
                                                : m.pricing?.mode
                                                  ? ` (${m.pricing.mode})`
                                                  : ''}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className={syncStyles.searchBtn}
                                    disabled={!selectedModelId || loading}
                                    onClick={handleCopyFromModel}
                                >
                                    {loading ? <FiLoader className={syncStyles.spin} /> : <FiCopy />}
                                    کپی و اعمال
                                </button>
                            </div>
                            <p className={syncStyles.searchHint}>
                                مثلاً از <code>dreamina-seedance-2-0-fast-260128</code> روی مدل مشابه کپی کنید،
                                بعد تغییرات جزئی بدهید و ذخیره کنید.
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
