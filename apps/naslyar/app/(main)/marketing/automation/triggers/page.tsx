'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../Automation.module.scss';
import parentStyles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { createAutomationId, loadTriggers, saveTriggers } from '../automation-api';
import type { AutomationTrigger, TriggerType } from '../automation.types';
import { TRIGGER_TYPE_LABELS } from '../automation.types';

const TABS = [
    { id: 'all', label: 'همه' },
    { id: 'transactional', label: 'تراکنشی' },
    { id: 'behavioral', label: 'رفتاری' },
    { id: 'scheduled', label: 'زمان‌بندی' },
];

const EMPTY: Omit<AutomationTrigger, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '',
    type: 'transactional',
    condition: '',
    delayMinutes: 0,
    scheduleCron: '',
    isActive: true,
};

export default function TriggersPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const [triggers, setTriggers] = useState<AutomationTrigger[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { value } = await loadTriggers(baseUrl, token);
            setTriggers(value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = useMemo(() => {
        if (tab === 'all') return triggers;
        return triggers.filter((t) => t.type === tab);
    }, [triggers, tab]);

    const persist = async (next: AutomationTrigger[]) => {
        await saveTriggers(baseUrl, token!, next);
        setTriggers(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !form.name.trim()) return;
        try {
            const now = new Date().toISOString();
            if (editId) {
                const next = triggers.map((t) =>
                    t.id === editId ? { ...t, ...form, updatedAt: now } : t,
                );
                await persist(next);
                SuccessToaster({ message: 'تریگر به‌روز شد' });
            } else {
                const item: AutomationTrigger = {
                    ...form,
                    id: createAutomationId('trg'),
                    createdAt: now,
                    updatedAt: now,
                };
                await persist([item, ...triggers]);
                SuccessToaster({ message: 'تریگر ایجاد شد' });
            }
            setShowForm(false);
            setEditId(null);
            setForm(EMPTY);
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('حذف این تریگر؟')) return;
        try {
            await persist(triggers.filter((t) => t.id !== id));
            SuccessToaster({ message: 'حذف شد' });
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const startEdit = (t: AutomationTrigger) => {
        setEditId(t.id);
        setForm({
            name: t.name,
            type: t.type,
            condition: t.condition,
            delayMinutes: t.delayMinutes,
            scheduleCron: t.scheduleCron,
            isActive: t.isActive,
        });
        setShowForm(true);
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>رویدادها و تریگرها</h1>
                            <p className={parentStyles.subtitle}>رویدادهای تراکنشی، رفتاری و زمان‌بندی‌شده</p>
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}>
                            + تریگر جدید
                        </button>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    <div className={styles.tabContent}>
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام</th>
                                        <th>نوع</th>
                                        <th>شرط</th>
                                        <th>تأخیر/زمان</th>
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', opacity: 0.7 }}>تریگری ثبت نشده</td></tr>
                                    ) : (
                                        filtered.map((t) => (
                                            <tr key={t.id}>
                                                <td>{t.name}</td>
                                                <td>{TRIGGER_TYPE_LABELS[t.type]}</td>
                                                <td>{t.condition}</td>
                                                <td>{t.type === 'scheduled' ? t.scheduleCron : `${t.delayMinutes ?? 0} دقیقه`}</td>
                                                <td>{t.isActive ? 'فعال' : 'غیرفعال'}</td>
                                                <td>
                                                    <div className={styles.inlineActions}>
                                                        <button type="button" className={styles.smallBtn} onClick={() => startEdit(t)}>ویرایش</button>
                                                        <button type="button" className={parentStyles.deleteBtn} onClick={() => handleDelete(t.id)}>حذف</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h2 className={styles.modalTitle}>{editId ? 'ویرایش تریگر' : 'تریگر جدید'}</h2>
                                <form onSubmit={handleSubmit}>
                                    <div className={parentStyles.field}>
                                        <label>نام</label>
                                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label>نوع</label>
                                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TriggerType })}>
                                            {Object.entries(TRIGGER_TYPE_LABELS).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label>شرط</label>
                                        <input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} placeholder="مثلاً: cart_abandoned" />
                                    </div>
                                    {form.type === 'scheduled' ? (
                                        <div className={parentStyles.field}>
                                            <label>Cron / زمان‌بندی</label>
                                            <input value={form.scheduleCron} onChange={(e) => setForm({ ...form, scheduleCron: e.target.value })} placeholder="0 9 * * *" />
                                        </div>
                                    ) : (
                                        <div className={parentStyles.field}>
                                            <label>تأخیر (دقیقه)</label>
                                            <input type="number" value={form.delayMinutes ?? 0} onChange={(e) => setForm({ ...form, delayMinutes: Number(e.target.value) })} />
                                        </div>
                                    )}
                                    <label className={parentStyles.toggleLabel}>
                                        <span>فعال</span>
                                        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                                    </label>
                                    <div className={parentStyles.formActions}>
                                        <button type="submit" className={parentStyles.primaryBtn}>ذخیره</button>
                                        <button type="button" className={parentStyles.secondaryBtn} onClick={() => setShowForm(false)}>انصراف</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
