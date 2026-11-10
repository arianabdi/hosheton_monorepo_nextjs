'use client';

import React, {useEffect, useState} from 'react';
import axios from 'axios';
import Link from 'next/link';
import {Field} from '@my-workspace/components';
import {ErrorToaster, SuccessToaster} from '@my-workspace/utils';
import {useAuthStore} from '@/app/zustand/store/authStore';
import {useAppStore} from '@/app/zustand/store/useAppStore';
import styles from '../../../blog/Blog.module.scss';
import formStyles from '../../../blog/components/BlogForm/BlogForm.module.scss';

export interface ChangeItem {
    type: string;
    title: string;
    items: string[];
}

export interface ChangelogFormState {
    version: string;
    title: string;
    releaseDate: string;
    isPublished: boolean;
    changes: ChangeItem[];
}

const CHANGE_TYPES = [
    {label: 'ویژگی جدید', value: 'feature'},
    {label: 'رفع باگ', value: 'fix'},
    {label: 'بهبود', value: 'improvement'},
    {label: 'تغییر شکننده', value: 'breaking'},
];

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function normalizeChangeItem(change: Record<string, unknown>): ChangeItem {
    const rawItems = Array.isArray(change.items)
        ? change.items
        : typeof change.description === 'string' && change.description
          ? [change.description]
          : [];

    return {
        type: typeof change.type === 'string' ? change.type : 'feature',
        title: typeof change.title === 'string' ? change.title : '',
        items: rawItems.filter((item): item is string => typeof item === 'string'),
    };
}

function createEmptyChange(): ChangeItem {
    return {type: 'feature', title: '', items: ['']};
}

interface ChangelogFormProps {
    changelogId?: string;
    onSaved?: () => void;
    cancelHref?: string;
}

export default function ChangelogForm({changelogId, onSaved, cancelHref = '/settings/changelog'}: ChangelogFormProps) {
    const {baseUrl} = useAppStore();
    const {token} = useAuthStore();
    const isEditing = Boolean(changelogId);

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<ChangelogFormState>({
        version: '',
        title: '',
        releaseDate: new Date().toISOString().slice(0, 10),
        isPublished: true,
        changes: [createEmptyChange()],
    });

    useEffect(() => {
        if (!isEditing || !token) return;
        setLoading(true);
        axios
            .get(`${baseUrl}/api/changelog/${changelogId}`, {headers: {authorization: `Bearer ${token}`}})
            .then((res) => {
                if (res.data.statusCode === 200) {
                    const data = res.data.data;
                    setForm({
                        version: data.version || '',
                        title: data.title || '',
                        releaseDate: data.releaseDate ? data.releaseDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
                        isPublished: data.isPublished ?? true,
                        changes: data.changes?.length
                            ? data.changes.map((change: Record<string, unknown>) => normalizeChangeItem(change))
                            : [createEmptyChange()],
                    });
                }
            })
            .catch(ErrorToaster)
            .finally(() => setLoading(false));
    }, [isEditing, changelogId, token, baseUrl]);

    const updateChange = (index: number, patch: Partial<ChangeItem>) => {
        setForm((prev) => ({
            ...prev,
            changes: prev.changes.map((c, i) => (i === index ? {...c, ...patch} : c)),
        }));
    };

    const updateChangeItem = (changeIndex: number, itemIndex: number, value: string) => {
        setForm((prev) => ({
            ...prev,
            changes: prev.changes.map((change, i) =>
                i === changeIndex
                    ? {
                          ...change,
                          items: change.items.map((item, j) => (j === itemIndex ? value : item)),
                      }
                    : change,
            ),
        }));
    };

    const addChangeItem = (changeIndex: number) => {
        setForm((prev) => ({
            ...prev,
            changes: prev.changes.map((change, i) =>
                i === changeIndex ? {...change, items: [...change.items, '']} : change,
            ),
        }));
    };

    const removeChangeItem = (changeIndex: number, itemIndex: number) => {
        setForm((prev) => ({
            ...prev,
            changes: prev.changes.map((change, i) =>
                i === changeIndex
                    ? {...change, items: change.items.filter((_, j) => j !== itemIndex)}
                    : change,
            ),
        }));
    };

    const handleSave = async () => {
        if (!token) return;

        const version = form.version.trim();
        if (!VERSION_PATTERN.test(version)) {
            ErrorToaster({message: 'شماره نسخه باید با فرمت x.x.x باشد (مثال: 1.0.0)'});
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...form,
                version,
                releaseDate: new Date(form.releaseDate),
                changes: form.changes
                    .filter((change) => change.title.trim())
                    .map((change) => ({
                        type: change.type,
                        title: change.title.trim(),
                        items: change.items.map((item) => item.trim()).filter(Boolean),
                    })),
            };
            const res = isEditing
                ? await axios.put(`${baseUrl}/api/changelog/${changelogId}`, payload, {
                    headers: {authorization: `Bearer ${token}`},
                })
                : await axios.post(`${baseUrl}/api/changelog`, payload, {
                    headers: {authorization: `Bearer ${token}`},
                });
            if (res.data.statusCode === 200) {
                SuccessToaster({message: 'نسخه changelog ذخیره شد'});
                onSaved?.();
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>در حال بارگذاری...</p>;

    return (
        <div className={formStyles.section}>
            <label className={formStyles.field}>
                شماره نسخه
                <Field
                    value={form.version}
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="1.0.0"
                    onChange={(v) => setForm((p) => ({...p, version: v}))}
                />
            </label>
            <label className={formStyles.field}>
                عنوان
                <Field
                    value={form.title}
                    type="text"
                    className="form-control form-control-sm"
                    onChange={(v) => setForm((p) => ({...p, title: v}))}
                />
            </label>
            <label className={formStyles.field}>
                تاریخ انتشار
                <Field
                    value={form.releaseDate}
                    type="text"
                    className="form-control form-control-sm"
                    onChange={(v) => setForm((p) => ({...p, releaseDate: v}))}
                />
            </label>
            <label className={formStyles.field} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm((p) => ({...p, isPublished: e.target.checked}))}
                />
                منتشر شده در لندینگ
            </label>

            <h4>تغییرات</h4>
            {form.changes.map((change, index) => (
                <div key={index} className={formStyles.field} style={{
                    borderBottom: '1px solid var(--plan-card-border-color)',
                    paddingBottom: '0.75rem',
                    marginBottom: '0.75rem'
                }}>
                    <Field
                        value={change.type}
                        type="select"
                        options={CHANGE_TYPES}
                        onChange={(v) => updateChange(index, {type: v})}
                    />
                    <Field
                        label={'عنوان'}
                        value={change.title}
                        type="text"
                        onChange={(v) => updateChange(index, {title: v})}
                    />

                    <div style={{marginTop: '0.5rem'}}>
                        <span style={{display: 'block', marginBottom: '0.35rem'}}>آیتم‌ها</span>
                        {change.items.map((item, itemIndex) => (
                            <div key={itemIndex} style={{display: 'flex', gap: '0.5rem', marginBottom: '0.35rem'}}>
                                <Field
                                    value={item}
                                    type="text"
                                    className="form-control form-control-sm"
                                    onChange={(v) => updateChangeItem(index, itemIndex, v)}
                                />
                                <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={() => removeChangeItem(index, itemIndex)}
                                >
                                    حذف
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => addChangeItem(index)}
                        >
                            + افزودن آیتم
                        </button>
                    </div>

                    <button type="button" className={styles.deleteBtn} onClick={() => setForm((p) => ({
                        ...p,
                        changes: p.changes.filter((_, i) => i !== index)
                    }))}>حذف تغییر
                    </button>
                </div>
            ))}

            <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setForm((p) => ({
                    ...p,
                    changes: [...p.changes, createEmptyChange()]
                }))}>
                    + افزودن تغییر
                </button>
                <button type="button" className={formStyles.submit} disabled={saving} onClick={handleSave}>
                    {isEditing ? 'ذخیره تغییرات' : 'ایجاد نسخه'}
                </button>
                <Link href={cancelHref} className={styles.secondaryBtn}>انصراف</Link>
            </div>
        </div>
    );
}
