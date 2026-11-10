'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiBookmark, FiLoader, FiLink2, FiXCircle, FiSave, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import syncStyles from './ModelPriceSync.module.scss';

export interface FormulaTutorialItem {
    _id: string;
    name: string;
    notes?: string;
    notesMarkdown: string;
    sourceModelName?: string;
    updatedAt?: string;
}

export interface FormulaTutorialRef {
    tutorialId: string;
    name: string;
}

interface Props {
    token: string;
    baseUrl: string;
    modelId?: string;
    modelName: string;
    /** ارجاع فعلی مدل به آموزش مشترک (در صورت اتصال) */
    linkedRef: FormulaTutorialRef | null;
    /** محتوای فعلی ویرایشگر توضیحات */
    currentNotes: string;
    onLink: (tutorial: FormulaTutorialItem) => void;
    onUnlink: () => void;
}

/**
 * قالب‌های آموزش فرمول هزینه — مثل قالب‌های قیمت‌گذاری، اما با تفاوت مهم:
 * مدل به آموزش «ارجاع» می‌دهد نه کپی. پس ویرایش آموزش فقط یک‌جا انجام و
 * روی همه مدل‌های متصل اعمال می‌شود.
 */
export default function FormulaTutorialPanel({
    token,
    baseUrl,
    modelId,
    modelName,
    linkedRef,
    currentNotes,
    onLink,
    onUnlink,
}: Props) {
    const [open, setOpen] = useState(false);
    const [tutorials, setTutorials] = useState<FormulaTutorialItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const panelRef = useRef<HTMLDivElement>(null);

    const headers = { authorization: `Bearer ${token}` };

    const loadTutorials = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${baseUrl}/api/provider-model-formula-tutorials`, { headers });
            if (res.data?.statusCode === 200) {
                const list: FormulaTutorialItem[] = res.data.data?.tutorials || [];
                setTutorials(list);
                if (list.length && !selectedId) setSelectedId(linkedRef?.tutorialId || list[0]._id);
            }
        } catch {
            ErrorToaster({ message: 'بارگذاری آموزش‌ها ناموفق بود' });
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseUrl, token, linkedRef?.tutorialId]);

    useEffect(() => {
        if (!open) return;
        loadTutorials();
    }, [open, loadTutorials]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    /** ذخیره محتوای فعلی به‌عنوان آموزش جدید و اتصال همین مدل به آن */
    const handleSaveAsNew = async () => {
        const name = newName.trim() || `آموزش ${modelName || 'مدل'}`.trim();
        if (!currentNotes.trim()) {
            ErrorToaster({ message: 'محتوای توضیحات خالی است' });
            return;
        }
        setSaving(true);
        try {
            const res = await axios.post(
                `${baseUrl}/api/provider-model-formula-tutorials`,
                {
                    name,
                    notesMarkdown: currentNotes,
                    sourceModelName: modelName || undefined,
                    sourceModelId: modelId || undefined,
                },
                { headers },
            );
            if (res.data?.statusCode === 200 || res.data?.statusCode === 201) {
                const created: FormulaTutorialItem = res.data.data;
                SuccessToaster({ message: 'آموزش ذخیره و به این مدل متصل شد' });
                setNewName('');
                await loadTutorials();
                if (created?._id) {
                    onLink(created);
                    setSelectedId(created._id);
                }
            } else {
                ErrorToaster({ message: res.data?.message || 'ذخیره آموزش ناموفق بود' });
            }
        } catch (e: any) {
            ErrorToaster({ message: e?.response?.data?.message || 'ذخیره آموزش ناموفق بود' });
        } finally {
            setSaving(false);
        }
    };

    /** اتصال مدل به آموزش موجود — محتوای اصلی جایگزین توضیحات فعلی می‌شود */
    const handleLink = async () => {
        if (!selectedId) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${baseUrl}/api/provider-model-formula-tutorials/${selectedId}`,
                { headers },
            );
            if (res.data?.statusCode !== 200) {
                ErrorToaster({ message: 'آموزش یافت نشد' });
                return;
            }
            const tutorial: FormulaTutorialItem = res.data.data;
            onLink(tutorial);
            SuccessToaster({
                message: `آموزش «${tutorial.name}» متصل شد — قبل از ذخیره مدل بررسی کنید`,
            });
            setOpen(false);
        } catch {
            ErrorToaster({ message: 'اتصال آموزش ناموفق بود' });
        } finally {
            setLoading(false);
        }
    };

    /** به‌روزرسانی مستقیم محتوای آموزش مشترک از روی ویرایشگر فعلی */
    const handleUpdateShared = async () => {
        if (!linkedRef) return;
        if (!window.confirm(
            `محتوای آموزش مشترک «${linkedRef.name}» به‌روز شود؟ این تغییر روی همه مدل‌های متصل اعمال می‌شود.`,
        )) return;
        setSaving(true);
        try {
            const res = await axios.put(
                `${baseUrl}/api/provider-model-formula-tutorials/${linkedRef.tutorialId}`,
                { notesMarkdown: currentNotes },
                { headers },
            );
            if (res.data?.statusCode === 200) {
                SuccessToaster({ message: 'آموزش مشترک به‌روز شد و روی همه مدل‌های متصل اعمال شد' });
            } else {
                ErrorToaster({ message: res.data?.message || 'به‌روزرسانی آموزش ناموفق بود' });
            }
        } catch (e: any) {
            ErrorToaster({ message: e?.response?.data?.message || 'به‌روزرسانی آموزش ناموفق بود' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTutorial = async () => {
        if (!selectedId) return;
        if (!window.confirm('این آموزش حذف شود؟ مدل‌های متصل، ارجاع خود را از دست می‌دهند و توضیحات فعلی‌شان باقی می‌ماند.')) return;
        setSaving(true);
        try {
            await axios.delete(`${baseUrl}/api/provider-model-formula-tutorials/${selectedId}`, { headers });
            SuccessToaster({ message: 'آموزش حذف شد' });
            setSelectedId('');
            await loadTutorials();
        } catch {
            ErrorToaster({ message: 'حذف آموزش ناموفق بود' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={syncStyles.wrapper} ref={panelRef}>
            <div className={syncStyles.bar}>
                <div className={syncStyles.barInfo}>
                    <FiBookmark className={syncStyles.barIcon} size={18} />
                    <div>
                        <div className={syncStyles.barTitle}>آموزش مشترک فرمول</div>
                        <div className={syncStyles.barHint}>
                            {linkedRef
                                ? `متصل به «${linkedRef.name}» — ویرایش محتوا روی همه مدل‌های متصل اعمال می‌شود`
                                : 'آموزش فرمول را یک‌بار ذخیره کنید و روی مدل‌های مشابه به آن ارجاع بدهید'}
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className={syncStyles.triggerBtn}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? 'بستن' : 'آموزش‌ها'}
                </button>
            </div>

            {open && (
                <div className={syncStyles.panel}>
                    {/* اتصال به آموزش موجود */}
                    <div className={syncStyles.searchRow}>
                        <select
                            className={syncStyles.sourceSelect}
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            disabled={loading || tutorials.length === 0}
                        >
                            <option value="">
                                {tutorials.length === 0 ? 'آموزشی ذخیره نشده' : 'انتخاب آموزش مشترک'}
                            </option>
                            {tutorials.map((t) => (
                                <option key={t._id} value={t._id}>
                                    {t.name}
                                    {t.sourceModelName ? ` ← ${t.sourceModelName}` : ''}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className={syncStyles.searchBtn}
                            disabled={!selectedId || loading}
                            onClick={handleLink}
                            title="اتصال این مدل به آموزش انتخابی (محتوای اصلی جایگزین می‌شود)"
                        >
                            {loading ? <FiLoader className={syncStyles.spin} /> : <FiLink2 />}
                            {linkedRef && selectedId === linkedRef.tutorialId ? 'اتصال مجدد' : 'اتصال'}
                        </button>
                        {tutorials.length > 0 && (
                            <button
                                type="button"
                                className={syncStyles.triggerBtn}
                                disabled={saving || loading}
                                onClick={handleDeleteTutorial}
                                title="حذف آموزش انتخابی"
                            >
                                <FiTrash2 />
                            </button>
                        )}
                    </div>

                    {/* ذخیره به‌عنوان آموزش جدید */}
                    <div className={syncStyles.searchRow}>
                        <input
                            className={syncStyles.sourceSelect}
                            placeholder="نام آموزش جدید (مثلاً: فرمول مگاپیکسلی FLUX)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button
                            type="button"
                            className={syncStyles.searchBtn}
                            disabled={saving}
                            onClick={handleSaveAsNew}
                        >
                            {saving ? <FiLoader className={syncStyles.spin} /> : <FiSave />}
                            ذخیره آموزش جدید
                        </button>
                    </div>
                    <p className={syncStyles.searchHint}>
                        آموزش در دیتابیس یک‌بار ذخیره می‌شود و مدل‌های بعدی به همین سند ارجاع می‌دهند؛
                        پس ویرایش بعدی آن، همه مدل‌ها را یک‌جا به‌روز می‌کند.
                    </p>

                    {/* به‌روزرسانی مستقیم آموزش متصل */}
                    {linkedRef && (
                        <div className={syncStyles.searchRow}>
                            <button
                                type="button"
                                className={syncStyles.searchBtn}
                                disabled={saving}
                                onClick={handleUpdateShared}
                                title="محتوای فعلی ویرایشگر را روی آموزش مشترک ذخیره می‌کند"
                            >
                                {saving ? <FiLoader className={syncStyles.spin} /> : <FiRefreshCw />}
                                به‌روزرسانی آموزش مشترک از محتوای فعلی
                            </button>
                            <button
                                type="button"
                                className={syncStyles.triggerBtn}
                                onClick={() => {
                                    onUnlink();
                                    setOpen(false);
                                }}
                                title="جدا کردن از آموزش؛ توضیحات فعلی به‌صورت محلی باقی می‌ماند"
                            >
                                <FiXCircle />
                                جدا کردن
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
