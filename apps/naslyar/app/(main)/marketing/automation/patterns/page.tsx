'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from '../Automation.module.scss';
import parentStyles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { createAutomationId, loadPatterns, savePatterns } from '../automation-api';
import type { SmsPattern, VariableMapping } from '../automation.types';

const EMPTY: Omit<SmsPattern, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '',
    patternCode: '',
    body: '',
    variables: [],
    variableMappings: [],
    status: 'pending',
};

export default function PatternsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [patterns, setPatterns] = useState<SmsPattern[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState<string | null>(null);
    const [varInput, setVarInput] = useState('');
    const [mapPattern, setMapPattern] = useState('');
    const [mapDb, setMapDb] = useState('');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { value } = await loadPatterns(baseUrl, token);
            setPatterns(value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const persist = async (next: SmsPattern[]) => {
        await savePatterns(baseUrl, token!, next);
        setPatterns(next);
    };

    const addVariable = () => {
        if (!varInput.trim()) return;
        setForm({ ...form, variables: [...form.variables, varInput.trim()] });
        setVarInput('');
    };

    const addMapping = () => {
        if (!mapPattern.trim() || !mapDb.trim()) return;
        const mapping: VariableMapping = { patternVar: mapPattern.trim(), dbField: mapDb.trim() };
        setForm({ ...form, variableMappings: [...form.variableMappings, mapping] });
        setMapPattern('');
        setMapDb('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !form.name.trim()) return;
        try {
            const now = new Date().toISOString();
            if (editId) {
                await persist(patterns.map((p) => (p.id === editId ? { ...p, ...form, updatedAt: now } : p)));
                SuccessToaster({ message: 'پترن به‌روز شد' });
            } else {
                const item: SmsPattern = { ...form, id: createAutomationId('pat'), createdAt: now, updatedAt: now };
                await persist([item, ...patterns]);
                SuccessToaster({ message: 'درخواست پترن ثبت شد' });
            }
            setShowForm(false);
            setEditId(null);
            setForm(EMPTY);
        } catch (err) {
            ErrorToaster(err);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>پترن‌های پیامک</h1>
                            <p className={parentStyles.subtitle}>الگوهای تاییدشده و درخواست پترن جدید با نگاشت متغیرها</p>
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}>
                            + پترن جدید
                        </button>
                    </header>
                    <div className={styles.tableWrap}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>نام</th>
                                    <th>کد پترن</th>
                                    <th>متغیرها</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patterns.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', opacity: 0.7 }}>پترنی ثبت نشده</td></tr>
                                ) : (
                                    patterns.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.name}</td>
                                            <td dir="ltr">{p.patternCode}</td>
                                            <td>{p.variables.join(', ') || '—'}</td>
                                            <td>{p.status === 'active' ? 'فعال' : p.status === 'pending' ? 'در انتظار' : 'رد شده'}</td>
                                            <td>
                                                <button type="button" className={styles.smallBtn} onClick={() => { setEditId(p.id); setForm({ name: p.name, patternCode: p.patternCode, body: p.body, variables: p.variables, variableMappings: p.variableMappings, status: p.status }); setShowForm(true); }}>
                                                    ویرایش
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h2 className={styles.modalTitle}>{editId ? 'ویرایش پترن' : 'درخواست پترن جدید'}</h2>
                                <form onSubmit={handleSubmit}>
                                    <div className={parentStyles.field}><label>نام</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                                    <div className={parentStyles.field}><label>کد پترn</label><input value={form.patternCode} onChange={(e) => setForm({ ...form, patternCode: e.target.value })} dir="ltr" /></div>
                                    <div className={parentStyles.field}><label>متن الگو</label><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="سلام {name}، مبلغ {amount}" /></div>
                                    <div className={parentStyles.field}>
                                        <label>متغیرها</label>
                                        <div className={styles.inlineActions}>
                                            <input value={varInput} onChange={(e) => setVarInput(e.target.value)} placeholder="name" />
                                            <button type="button" className={styles.smallBtn} onClick={addVariable}>افزودن</button>
                                        </div>
                                        <p className={parentStyles.fieldHint}>{form.variables.join(', ')}</p>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label>نگاشت متغیر → فیلد DB</label>
                                        <div className={styles.inlineActions}>
                                            <input value={mapPattern} onChange={(e) => setMapPattern(e.target.value)} placeholder="{name}" />
                                            <input value={mapDb} onChange={(e) => setMapDb(e.target.value)} placeholder="user.name" />
                                            <button type="button" className={styles.smallBtn} onClick={addMapping}>افزودن</button>
                                        </div>
                                        {form.variableMappings.map((m, i) => (
                                            <div key={i} className={styles.stepItem}>{m.patternVar} → {m.dbField}</div>
                                        ))}
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label>وضعیت</label>
                                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SmsPattern['status'] })}>
                                            <option value="pending">در انتظار تایید</option>
                                            <option value="active">فعال</option>
                                            <option value="rejected">رد شده</option>
                                        </select>
                                    </div>
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
