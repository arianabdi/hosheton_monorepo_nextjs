'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from '../Automation.module.scss';
import parentStyles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { createAutomationId, loadPatterns, loadTriggers, loadWorkflows, saveWorkflows } from '../automation-api';
import type { MarketingWorkflow, WorkflowStep, WorkflowStepType } from '../automation.types';

const STEP_LABELS: Record<WorkflowStepType, string> = {
    trigger: 'تریگر',
    delay: 'تأخیر',
    pattern: 'پترن',
    segment: 'بخش‌بندی',
};

export default function WorkflowsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [workflows, setWorkflows] = useState<MarketingWorkflow[]>([]);
    const [triggers, setTriggers] = useState<{ id: string; name: string }[]>([]);
    const [patterns, setPatterns] = useState<{ id: string; name: string }[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [editId, setEditId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [wf, tr, pat] = await Promise.all([
                loadWorkflows(baseUrl, token),
                loadTriggers(baseUrl, token),
                loadPatterns(baseUrl, token),
            ]);
            setWorkflows(wf.value);
            setTriggers(tr.value.map((t) => ({ id: t.id, name: t.name })));
            setPatterns(pat.value.map((p) => ({ id: p.id, name: p.name })));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const addStep = (type: WorkflowStepType) => {
        setSteps([...steps, { id: createAutomationId('step'), type }]);
    };

    const updateStep = (id: string, patch: Partial<WorkflowStep>) => {
        setSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    };

    const removeStep = (id: string) => setSteps(steps.filter((s) => s.id !== id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !name.trim()) return;
        try {
            const now = new Date().toISOString();
            if (editId) {
                const next = workflows.map((w) =>
                    w.id === editId ? { ...w, name, description, steps, updatedAt: now } : w,
                );
                await saveWorkflows(baseUrl, token, next);
                setWorkflows(next);
            } else {
                const item: MarketingWorkflow = {
                    id: createAutomationId('wf'),
                    name,
                    description,
                    steps,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                };
                const next = [item, ...workflows];
                await saveWorkflows(baseUrl, token, next);
                setWorkflows(next);
            }
            SuccessToaster({ message: 'سناریو ذخیره شد' });
            setShowForm(false);
            setName('');
            setDescription('');
            setSteps([]);
            setEditId(null);
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const startEdit = (w: MarketingWorkflow) => {
        setEditId(w.id);
        setName(w.name);
        setDescription(w.description || '');
        setSteps(w.steps);
        setShowForm(true);
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>سناریوها و گردش‌کار</h1>
                            <p className={parentStyles.subtitle}>کمپین‌های چندمرحله‌ای با تریگر، تأخیر، پترن و بخش‌بندی</p>
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => { setShowForm(true); setEditId(null); setName(''); setDescription(''); setSteps([]); }}>
                            + سناریو جدید
                        </button>
                    </header>
                    <div className={parentStyles.connectionGrid}>
                        {workflows.length === 0 ? (
                            <div className={parentStyles.emptyState}>سناریویی ثبت نشده</div>
                        ) : (
                            workflows.map((w) => (
                                <div key={w.id} className={parentStyles.connectionCard}>
                                    <h3>{w.name}</h3>
                                    <p>{w.description || '—'}</p>
                                    <div className={styles.stepList}>
                                        {w.steps.map((s) => (
                                            <div key={s.id} className={styles.stepItem}>{STEP_LABELS[s.type]}</div>
                                        ))}
                                    </div>
                                    <span className={`${parentStyles.badge} ${w.isActive ? parentStyles.badgeActive : parentStyles.badgeInactive}`}>
                                        {w.isActive ? 'فعال' : 'غیرفعال'}
                                    </span>
                                    <button type="button" className={styles.smallBtn} onClick={() => startEdit(w)}>ویرایش</button>
                                </div>
                            ))
                        )}
                    </div>
                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                                <h2 className={styles.modalTitle}>سازنده سناریو</h2>
                                <form onSubmit={handleSubmit}>
                                    <div className={parentStyles.field}><label>نام</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                                    <div className={parentStyles.field}><label>توضیح</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                                    <div className={styles.inlineActions}>
                                        {(Object.keys(STEP_LABELS) as WorkflowStepType[]).map((t) => (
                                            <button key={t} type="button" className={styles.smallBtn} onClick={() => addStep(t)}>+ {STEP_LABELS[t]}</button>
                                        ))}
                                    </div>
                                    <div className={styles.stepList}>
                                        {steps.map((s) => (
                                            <div key={s.id} className={styles.stepItem}>
                                                <strong>{STEP_LABELS[s.type]}</strong>
                                                {s.type === 'trigger' && (
                                                    <select value={s.triggerId || ''} onChange={(e) => updateStep(s.id, { triggerId: e.target.value })}>
                                                        <option value="">انتخاب تریگر</option>
                                                        {triggers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                )}
                                                {s.type === 'pattern' && (
                                                    <select value={s.patternId || ''} onChange={(e) => updateStep(s.id, { patternId: e.target.value })}>
                                                        <option value="">انتخاب پترن</option>
                                                        {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                )}
                                                {s.type === 'delay' && (
                                                    <input type="number" placeholder="دقیقه" value={s.delayMinutes ?? 0} onChange={(e) => updateStep(s.id, { delayMinutes: Number(e.target.value) })} />
                                                )}
                                                {s.type === 'segment' && (
                                                    <input placeholder="segment query" value={s.segmentQuery || ''} onChange={(e) => updateStep(s.id, { segmentQuery: e.target.value })} />
                                                )}
                                                <button type="button" className={parentStyles.deleteBtn} onClick={() => removeStep(s.id)}>حذف</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={parentStyles.formActions}>
                                        <button type="submit" className={parentStyles.primaryBtn}>ذخیره سناریو</button>
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
