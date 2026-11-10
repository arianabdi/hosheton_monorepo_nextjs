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
import { createHrId, loadDepartments, loadJobRoles, resolveDepartmentName, saveJobRoles } from '../hr-api';
import type { HrDepartment, HrJobRole } from '../hr.types';
import HrRowActionMenu from '../components/HrRowActionMenu';

export default function HrRolesPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState<HrJobRole[]>([]);
    const [departments, setDepartments] = useState<HrDepartment[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [departmentId, setDepartmentId] = useState('');

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setDescription('');
        setDepartmentId('');
    };

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [r, d] = await Promise.all([loadJobRoles(baseUrl, token), loadDepartments(baseUrl, token)]);
            setRoles(r.value);
            setDepartments(d.value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const startEdit = (item: HrJobRole) => {
        setEditingId(item.id);
        setName(item.name);
        setDescription(item.description || '');
        setDepartmentId(item.departmentId || '');
    };

    const save = async () => {
        if (!token || !name.trim()) return;
        const now = new Date().toISOString();

        if (editingId) {
            const next = roles.map((r) =>
                r.id === editingId
                    ? {
                          ...r,
                          name: name.trim(),
                          description: description.trim() || undefined,
                          departmentId: departmentId || null,
                          updatedAt: now,
                      }
                    : r,
            );
            await saveJobRoles(baseUrl, token, next);
            setRoles(next);
            resetForm();
            SuccessToaster({ message: 'سمت ویرایش شد' });
            return;
        }

        const item: HrJobRole = {
            id: createHrId('role'),
            name: name.trim(),
            description: description.trim() || undefined,
            departmentId: departmentId || null,
            createdAt: now,
        };
        const next = [...roles, item];
        await saveJobRoles(baseUrl, token, next);
        setRoles(next);
        resetForm();
        SuccessToaster({ message: 'سمت اضافه شد' });
    };

    const remove = async (id: string) => {
        if (!token || !window.confirm('این سمت حذف شود؟')) return;
        const next = roles.filter((r) => r.id !== id);
        await saveJobRoles(baseUrl, token, next);
        setRoles(next);
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
                            <h1 className={parentStyles.mainTitle}>سمت‌های سازمانی</h1>
                            <p className={parentStyles.subtitle}>نقش‌هایی که در گردش کار به آن‌ها ارجاع می‌شود</p>
                        </div>
                    </header>
                    <div className={parentStyles.formCard}>
                        <h3 className={parentStyles.formSectionTitle}>
                            {editingId ? 'ویرایش سمت' : 'افزودن سمت جدید'}
                        </h3>
                        <div className={styles.formRow}>
                            <div className={parentStyles.field}>
                                <label>نام سمت *</label>
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً مدیر فنی" />
                            </div>
                            <div className={parentStyles.field}>
                                <label>واحد مرتبط</label>
                                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                                    <option value="">—</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={parentStyles.field}>
                            <label>توضیح</label>
                            <textarea
                                className={styles.textarea}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="مسئولیت و حوزه فعالیت این سمت"
                            />
                        </div>
                        <div className={tabStyles.inlineActions}>
                            <button type="button" className={parentStyles.primaryBtn} onClick={() => void save()}>
                                {editingId ? 'ذخیره تغییرات' : 'افزودن سمت'}
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
                            <thead><tr><th>سمت</th><th>واحد</th><th>توضیح</th><th>عملیات</th></tr></thead>
                            <tbody>
                                {roles.length === 0 ? (
                                    <tr><td colSpan={4} className={tabStyles.emptyCell} data-label="">سمتی ثبت نشده</td></tr>
                                ) : roles.map((r) => (
                                    <tr key={r.id}>
                                        <td data-label="سمت" className={tabStyles.cellPrimary}>{r.name}</td>
                                        <td data-label="واحد">{resolveDepartmentName(departments, r.departmentId)}</td>
                                        <td data-label="توضیح" className={tabStyles.cellMuted}>{r.description || '—'}</td>
                                        <td data-label="عملیات" className={styles.actionCell}>
                                            <HrRowActionMenu
                                                rowId={r.id}
                                                items={[
                                                    { label: 'ویرایش', onClick: () => startEdit(r) },
                                                    { label: 'حذف', onClick: () => void remove(r.id), danger: true },
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
