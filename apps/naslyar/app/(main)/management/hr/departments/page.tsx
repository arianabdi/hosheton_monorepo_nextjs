'use client';

import React, { useCallback, useEffect, useState } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import styles from '../Hr.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { createHrId, loadDepartments, saveDepartments } from '../hr-api';
import type { HrDepartment } from '../hr.types';
import HrRowActionMenu from '../components/HrRowActionMenu';

function previewText(value?: string, max = 48) {
    if (!value?.trim()) return '—';
    const line = value.trim().split('\n')[0];
    return line.length > max ? `${line.slice(0, max)}…` : line;
}

export default function HrDepartmentsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<HrDepartment[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [membersNote, setMembersNote] = useState('');

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setCode('');
        setDescription('');
        setMembersNote('');
    };

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await loadDepartments(baseUrl, token);
            setItems(res.value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const startEdit = (item: HrDepartment) => {
        setEditingId(item.id);
        setName(item.name);
        setCode(item.code || '');
        setDescription(item.description || '');
        setMembersNote(item.membersNote || '');
    };

    const save = async () => {
        if (!token || !name.trim()) return;
        const now = new Date().toISOString();

        if (editingId) {
            const next = items.map((d) =>
                d.id === editingId
                    ? {
                          ...d,
                          name: name.trim(),
                          code: code.trim() || undefined,
                          description: description.trim() || undefined,
                          membersNote: membersNote.trim() || undefined,
                          updatedAt: now,
                      }
                    : d,
            );
            await saveDepartments(baseUrl, token, next);
            setItems(next);
            resetForm();
            SuccessToaster({ message: 'واحد ویرایش شد' });
            return;
        }

        const item: HrDepartment = {
            id: createHrId('dept'),
            name: name.trim(),
            code: code.trim() || undefined,
            description: description.trim() || undefined,
            membersNote: membersNote.trim() || undefined,
            parentId: null,
            createdAt: now,
        };
        const next = [...items, item];
        await saveDepartments(baseUrl, token, next);
        setItems(next);
        resetForm();
        SuccessToaster({ message: 'واحد اضافه شد' });
    };

    const remove = async (id: string) => {
        if (!token || !window.confirm('این واحد حذف شود؟')) return;
        const next = items.filter((d) => d.id !== id);
        await saveDepartments(baseUrl, token, next);
        setItems(next);
        if (editingId === id) resetForm();
        SuccessToaster({ message: 'حذف شد' });
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>واحدهای سازمانی</h1>
                            <p className={parentStyles.subtitle}>
                                تعریف واحدها همراه با توضیحات و فهرست اعضا/نقش‌ها برای راهنمای سازمانی
                            </p>
                        </div>
                    </header>
                    <div className={parentStyles.formCard}>
                        <h3 className={parentStyles.formSectionTitle}>
                            {editingId ? 'ویرایش واحد' : 'افزودن واحد جدید'}
                        </h3>
                        <div className={styles.formRow}>
                            <div className={parentStyles.field}>
                                <label>نام واحد *</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً فناوری اطلاعات" />
                            </div>
                            <div className={parentStyles.field}>
                                <label>کد (اختیاری)</label>
                                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="IT" />
                            </div>
                        </div>
                        <div className={parentStyles.field}>
                            <label>توضیحات</label>
                            <textarea
                                className={styles.textarea}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="شرح مسئولیت و حوزه فعالیت این واحد"
                            />
                        </div>
                        <div className={parentStyles.field}>
                            <label>اعضا و نقش‌ها</label>
                            <textarea
                                className={styles.textarea}
                                value={membersNote}
                                onChange={(e) => setMembersNote(e.target.value)}
                                placeholder={'هر خط یک نقش یا شخص — مثلاً:\nمدیر فنی: علی رضایی\nکارشناس: سارا محمدی\nکارآموز: —'}
                            />
                            <p className={styles.fieldHint}>
                                این فهرست فقط برای راهنمایی است تا مشخص باشد در هر واحد چه نقش‌هایی وجود دارد.
                            </p>
                        </div>
                        <div className={tabStyles.inlineActions}>
                            <button type="button" className={parentStyles.primaryBtn} onClick={() => void save()}>
                                {editingId ? 'ذخیره تغییرات' : 'افزودن واحد'}
                            </button>
                            {editingId ? (
                                <button type="button" className={tabStyles.smallBtn} onClick={resetForm}>
                                    انصراف
                                </button>
                            ) : null}
                        </div>
                    </div>
                    <div className={tabStyles.tableWrap}>
                        <table className={tabStyles.dataTable}>
                            <thead>
                                <tr>
                                    <th>نام</th>
                                    <th>کد</th>
                                    <th>توضیحات</th>
                                    <th>اعضا</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan={5} className={tabStyles.emptyCell} data-label="">واحدی ثبت نشده</td></tr>
                                ) : items.map((d) => (
                                    <tr key={d.id}>
                                        <td data-label="نام" className={tabStyles.cellPrimary}>{d.name}</td>
                                        <td data-label="کد">{d.code || '—'}</td>
                                        <td data-label="توضیحات" className={tabStyles.cellMuted}>{previewText(d.description)}</td>
                                        <td data-label="اعضا" className={tabStyles.cellMuted} style={{ whiteSpace: 'pre-line' }}>
                                            {previewText(d.membersNote, 64)}
                                        </td>
                                        <td data-label="عملیات" className={styles.actionCell}>
                                            <HrRowActionMenu
                                                rowId={d.id}
                                                items={[
                                                    { label: 'ویرایش', onClick: () => startEdit(d) },
                                                    { label: 'حذف', onClick: () => void remove(d.id), danger: true },
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
