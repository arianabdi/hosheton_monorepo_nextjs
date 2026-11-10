'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from './ModelCapabilityModes.module.scss';
import { ModeIcon } from '../../ai-modes/modeIcons';

interface AiModeForModel {
    _id: string;
    id: string;
    title: string;
    titleFa: string;
    group: string;
    icon?: string;
    mediaClass: string;
    providerModes: string[];
    descriptionFa: string;
    compatibility: { compatible: boolean; reason: string; detailFa?: string };
    binding: { modeId: string; providerModeId?: string; isActive?: boolean } | null;
    enabled: boolean;
}

interface CapabilityBinding {
    modeId: string;
    providerModeId?: string;
    isActive?: boolean;
}

const GROUP_LABELS: Record<string, string> = {
    core: 'پایه',
    reference: 'مرجع',
    motion: 'حرکت',
    storytelling: 'روایت',
    editing: 'ویرایش',
    audio: 'صدا',
};

const REASON_LABELS: Record<string, string> = {
    media_class: 'کلاس مدل با این mode نمی‌خواند',
    provider_mode: 'mode اجرایی لازم روی این مدل تعریف نشده',
    model_pattern: 'این قابلیت مخصوص مدل‌های دیگری است',
    inactive: 'غیرفعال',
};

/**
 * تعیین حالت‌های قابلیتی (Capability Modes) که این مدل پشتیبانی می‌کند +
 * اینکه هر حالت از کدام mode سطح مدل (مثل reference_to_video) اجرا شود.
 * ذخیره در فیلد capabilityModes مدل — مستقل از دکمه‌ی ذخیره‌ی اصلی صفحه.
 */
export default function ModelCapabilityModes({ modelId }: { modelId: string }) {
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const [modes, setModes] = useState<AiModeForModel[]>([]);
    const [bindings, setBindings] = useState<Record<string, CapabilityBinding>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const load = useCallback(async () => {
        if (!token || !modelId) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/ai-modes/for-model/${modelId}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            const list: AiModeForModel[] = res.data?.data || [];
            setModes(list);
            const next: Record<string, CapabilityBinding> = {};
            for (const mode of list) {
                if (mode.binding) next[mode.id] = { ...mode.binding };
            }
            setBindings(next);
            setDirty(false);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, modelId, token]);

    useEffect(() => { load(); }, [load]);

    const grouped = useMemo(() => {
        const map: Record<string, AiModeForModel[]> = {};
        for (const mode of modes) (map[mode.group] = map[mode.group] || []).push(mode);
        return map;
    }, [modes]);

    const isEnabled = (mode: AiModeForModel) => {
        const binding = bindings[mode.id];
        if (binding) return binding.isActive !== false;
        return mode.enabled;
    };

    const boundProviderMode = (mode: AiModeForModel) => bindings[mode.id]?.providerModeId || '';

    const toggle = (mode: AiModeForModel) => {
        setBindings((prev) => {
            const next = { ...prev };
            const current = next[mode.id];
            if (current && current.isActive === false) {
                next[mode.id] = { ...current, isActive: true };
            } else if (current) {
                next[mode.id] = { ...current, isActive: false };
            } else {
                next[mode.id] = { modeId: mode.id, providerModeId: '', isActive: true };
            }
            return next;
        });
        setDirty(true);
    };

    const setProviderMode = (mode: AiModeForModel, providerModeId: string) => {
        setBindings((prev) => ({
            ...prev,
            [mode.id]: { modeId: mode.id, providerModeId, isActive: prev[mode.id]?.isActive !== false },
        }));
        setDirty(true);
    };

    const save = async () => {
        try {
            setSaving(true);
            const capabilityModes = Object.values(bindings).map((binding) => ({
                modeId: binding.modeId,
                ...(binding.providerModeId ? { providerModeId: binding.providerModeId } : {}),
                isActive: binding.isActive !== false,
            }));
            await axios.put(
                `${baseUrl}/api/provider-models/${modelId}`,
                { capabilityModes },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster('حالت‌های قابلیتی این مدل ذخیره شد');
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const enabledCount = modes.filter(isEnabled).length;

    return (
        <div className={styles.section}>
            <div className={styles.head}>
                <div>
                    <h3>حالت‌های قابلیتی (Capability Modes)</h3>
                    <p>
                        کدام حالت‌های کاتالوگ برای این مدل قابل استفاده باشند و هر کدام از کدام mode اجرایی استفاده کند.
                        اگر چیزی تنظیم نکنی، تشخیص خودکار بر اساس سازگاری انجام می‌شود
                        ({enabledCount} حالت سازگار شناسایی شد).
                    </p>
                </div>
                <button type="button" className={styles.saveBtn} onClick={save} disabled={saving || !dirty}>
                    {saving ? '...' : dirty ? 'ذخیره حالت‌ها' : 'ذخیره شده'}
                </button>
            </div>

            {loading ? <div className={styles.hint}>در حال بارگذاری…</div> : null}

            {Object.entries(grouped).map(([group, list]) => (
                <div key={group}>
                    <h4 className={styles.groupTitle}>{GROUP_LABELS[group] || group}</h4>
                    <div className={styles.list}>
                        {list.map((mode) => (
                            <div className={`${styles.row} ${isEnabled(mode) ? styles.rowOn : ''}`} key={mode.id}>
                                <label className={styles.toggle}>
                                    <input type="checkbox" checked={isEnabled(mode)} onChange={() => toggle(mode)} />
                                    <span className={styles.modeIcon} aria-hidden>
                                        <ModeIcon name={mode.icon} size={16} />
                                    </span>
                                    <div>
                                        <strong>{mode.titleFa}</strong>
                                        <span>{mode.title} · {mode.descriptionFa}</span>
                                        {!mode.compatibility.compatible ? (
                                            <em className={styles.warn}>
                                                ⚠ {mode.compatibility.detailFa || REASON_LABELS[mode.compatibility.reason] || 'ناسازگار'}
                                            </em>
                                        ) : null}
                                    </div>
                                </label>
                                {(mode.providerModes || []).length > 0 ? (
                                    <select
                                        className={styles.providerMode}
                                        value={boundProviderMode(mode)}
                                        onChange={(e) => setProviderMode(mode, e.target.value)}
                                        title="از کدام mode اجرایی این مدل استفاده شود"
                                    >
                                        <option value="">تشخیص خودکار</option>
                                        {mode.providerModes.map((pm) => <option value={pm} key={pm}>{pm}</option>)}
                                    </select>
                                ) : (
                                    <span className={styles.overlayTag}>overlay</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
