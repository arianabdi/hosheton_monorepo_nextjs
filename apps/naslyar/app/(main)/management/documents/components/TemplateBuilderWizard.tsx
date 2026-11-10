'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import parentStyles from '../../../marketing/Marketing.module.scss';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import styles from '../Documents.module.scss';
import { createDocumentId } from '../documents-api';
import type { DocumentWorkflowStep, DocumentWorkflowTemplate, WorkflowAssigneeType } from '../documents.types';
import { WORKFLOW_ASSIGNEE_TYPE_LABELS } from '../../hr/hr.types';
import { formatAssigneeLabel, loadHrCatalog, type HrCatalog } from '../../hr/hr-api';
import WorkflowWizardShell, { WizardFooter } from './WorkflowWizardShell';
import { HrCatalogEmptyHint, WorkflowPathPreview } from './WorkflowPathPreview';

const STEPS = [
    { id: 'info', label: 'اطلاعات پایه' },
    { id: 'steps', label: 'مراحل تأیید' },
    { id: 'preview', label: 'پیش‌نمایش' },
    { id: 'save', label: 'ذخیره' },
];

interface DraftStep {
    id: string;
    label: string;
    instruction: string;
    assigneeType: WorkflowAssigneeType;
    assigneeId: string;
}

interface TemplateBuilderWizardProps {
    baseUrl: string;
    token: string;
    initialTemplate?: DocumentWorkflowTemplate | null;
    onSave: (template: DocumentWorkflowTemplate) => Promise<void>;
    onCancelEdit?: () => void;
}

function emptyStep(): DraftStep {
    return {
        id: createDocumentId('step'),
        label: '',
        instruction: '',
        assigneeType: 'job_role',
        assigneeId: '',
    };
}

function resolveAssigneeName(catalog: HrCatalog, type: WorkflowAssigneeType, id: string): string {
    if (!id) return '';
    if (type === 'job_role') return catalog.jobRoles.find((r) => r.id === id)?.name || '';
    if (type === 'department') return catalog.departments.find((d) => d.id === id)?.name || '';
    if (type === 'employee') return catalog.employees.find((e) => e.id === id)?.fullName || '';
    return '';
}

export default function TemplateBuilderWizard({
    baseUrl,
    token,
    initialTemplate,
    onSave,
    onCancelEdit,
}: TemplateBuilderWizardProps) {
    const isEditMode = Boolean(initialTemplate?.id);

    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [catalog, setCatalog] = useState<HrCatalog>({ departments: [], jobRoles: [], employees: [] });
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [draftSteps, setDraftSteps] = useState<DraftStep[]>([
        { id: createDocumentId('step'), label: 'ثبت', instruction: 'بررسی اولیه و تکمیل فرم', assigneeType: 'job_role', assigneeId: '' },
        { id: createDocumentId('step'), label: 'بررسی', instruction: 'بررسی محتوا و تأیید فنی', assigneeType: 'job_role', assigneeId: '' },
        { id: createDocumentId('step'), label: 'امضا', instruction: 'امضای نهایی و بستن پرونده', assigneeType: 'job_role', assigneeId: '' },
    ]);
    const [saving, setSaving] = useState(false);

    const loadCatalog = useCallback(async () => {
        if (!token) return;
        setCatalogLoading(true);
        try {
            const data = await loadHrCatalog(baseUrl, token);
            setCatalog(data);
        } finally {
            setCatalogLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void loadCatalog();
    }, [loadCatalog]);

    useEffect(() => {
        if (!initialTemplate) return;
        setStep(1);
        setName(initialTemplate.name);
        setDescription(initialTemplate.description || '');
        setDraftSteps(
            initialTemplate.steps.length > 0
                ? initialTemplate.steps.map((s) => ({
                      id: s.id,
                      label: s.label,
                      instruction: s.instruction || '',
                      assigneeType: s.assigneeType || 'job_role',
                      assigneeId: s.assigneeId || '',
                  }))
                : [emptyStep()],
        );
    }, [initialTemplate]);

    const previewSteps = useMemo(
        () =>
            draftSteps
                .filter((item) => item.label.trim())
                .map((item) => ({
                    label: item.label.trim(),
                    assigneeDisplay: item.assigneeId
                        ? formatAssigneeLabel(item.assigneeType, resolveAssigneeName(catalog, item.assigneeType, item.assigneeId))
                        : undefined,
                    instruction: item.instruction.trim() || undefined,
                })),
        [draftSteps, catalog],
    );

    const canGoNext = useMemo(() => {
        if (step === 1) return name.trim().length > 0;
        if (step === 2) {
            return draftSteps.some(
                (item) => item.label.trim().length > 0 && item.assigneeId.trim().length > 0,
            );
        }
        return true;
    }, [step, name, draftSteps]);

    const updateStep = (index: number, patch: Partial<DraftStep>) => {
        setDraftSteps((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    const moveStep = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= draftSteps.length) return;
        setDraftSteps((prev) => {
            const next = [...prev];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const assigneeOptions = (type: WorkflowAssigneeType) => {
        if (type === 'job_role') return catalog.jobRoles.map((r) => ({ id: r.id, name: r.name }));
        if (type === 'department') return catalog.departments.map((d) => ({ id: d.id, name: d.name }));
        return catalog.employees.map((e) => ({ id: e.id, name: e.fullName }));
    };

    const handleSave = async () => {
        const valid = draftSteps.filter((item) => item.label.trim() && item.assigneeId);
        if (!name.trim() || valid.length === 0) return;

        setSaving(true);
        try {
            const steps: DocumentWorkflowStep[] = valid.map((item, order) => {
                const assigneeName = resolveAssigneeName(catalog, item.assigneeType, item.assigneeId);
                return {
                    id: item.id,
                    label: item.label.trim(),
                    instruction: item.instruction.trim() || undefined,
                    assigneeType: item.assigneeType,
                    assigneeId: item.assigneeId,
                    assigneeName,
                    roleLabel: assigneeName,
                    order,
                };
            });

            const template: DocumentWorkflowTemplate = {
                id: initialTemplate?.id || createDocumentId('wft'),
                name: name.trim(),
                description: description.trim() || undefined,
                steps,
                createdAt: initialTemplate?.createdAt || new Date().toISOString(),
            };
            await onSave(template);
            if (!isEditMode) {
                setStep(1);
                setName('');
                setDescription('');
                setDraftSteps([
                    { id: createDocumentId('step'), label: 'ثبت', instruction: '', assigneeType: 'job_role', assigneeId: '' },
                    { id: createDocumentId('step'), label: 'بررسی', instruction: '', assigneeType: 'job_role', assigneeId: '' },
                    { id: createDocumentId('step'), label: 'امضا', instruction: '', assigneeType: 'job_role', assigneeId: '' },
                ]);
            }
        } finally {
            setSaving(false);
        }
    };

    const hasCatalog =
        catalog.jobRoles.length > 0 || catalog.departments.length > 0 || catalog.employees.length > 0;

    return (
        <WorkflowWizardShell
            steps={STEPS}
            currentStep={step}
            title={isEditMode ? 'ویرایش فرآیند' : 'ساخت فرآیند جدید'}
            subtitle="برای هر مرحله مشخص کنید چه کاری انجام شود و به چه سمت/واحد/شخصی ارجاع شود."
            footer={
                <WizardFooter
                    showBack={step > 1}
                    onBack={() => setStep((prev) => Math.max(1, prev - 1))}
                    onCancel={
                        step === 1
                            ? isEditMode
                                ? onCancelEdit
                                : undefined
                            : () => setStep(1)
                    }
                    showCancel={step > 1 || isEditMode}
                    onNext={
                        step < 4
                            ? () => setStep((prev) => Math.min(4, prev + 1))
                            : () => void handleSave()
                    }
                    nextLabel={step === 4 ? (saving ? 'در حال ذخیره...' : isEditMode ? 'ذخیره تغییرات' : 'ذخیره قالب') : 'بعدی'}
                    nextDisabled={!canGoNext || (step === 4 && saving)}
                />
            }
        >
            {step === 1 && (
                <>
                    <div className={parentStyles.field}>
                        <label>نام فرآیند *</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً تأیید قرارداد" />
                    </div>
                    <div className={parentStyles.field}>
                        <label>توضیح (اختیاری)</label>
                        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="برای چه نوع سندی استفاده می‌شود؟" />
                    </div>
                </>
            )}

            {step === 2 && (
                <>
                    {catalogLoading ? (
                        <p className={styles.wizardEmptyHint}>در حال بارگذاری منابع انسانی...</p>
                    ) : !hasCatalog ? (
                        <HrCatalogEmptyHint />
                    ) : (
                        <p className={styles.wizardEmptyHint}>
                            هر مرحله: نام، توضیح کار، و مقصد ارجاع (از{' '}
                            <Link href="/management/hr">منابع انسانی</Link>).
                        </p>
                    )}
                    {draftSteps.map((item, index) => {
                        const assigneeName = resolveAssigneeName(catalog, item.assigneeType, item.assigneeId);
                        const options = assigneeOptions(item.assigneeType);
                        return (
                            <div key={item.id} className={styles.wizardStepCard}>
                                <div className={styles.wizardStepCardHeader}>
                                    <span>مرحله {index + 1}</span>
                                    <div className={styles.wizardStepRowActions}>
                                        <button type="button" className={styles.wizardIconBtn} disabled={index === 0} onClick={() => moveStep(index, -1)}>↑</button>
                                        <button type="button" className={styles.wizardIconBtn} disabled={index === draftSteps.length - 1} onClick={() => moveStep(index, 1)}>↓</button>
                                        <button type="button" className={styles.wizardIconBtn} disabled={draftSteps.length <= 1} onClick={() => setDraftSteps((prev) => prev.filter((_, i) => i !== index))}>×</button>
                                    </div>
                                </div>
                                <div className={parentStyles.field}>
                                    <label>نام مرحله *</label>
                                    <input value={item.label} onChange={(e) => updateStep(index, { label: e.target.value })} placeholder="مثلاً بررسی مدیر" />
                                </div>
                                <div className={parentStyles.field}>
                                    <label>توضیح / دستورالعمل</label>
                                    <input value={item.instruction} onChange={(e) => updateStep(index, { instruction: e.target.value })} placeholder="چه کاری در این مرحله انجام شود؟" />
                                </div>
                                <div className={styles.formRow}>
                                    <div className={parentStyles.field}>
                                        <label>ارسال به</label>
                                        <select
                                            value={item.assigneeType}
                                            onChange={(e) => updateStep(index, { assigneeType: e.target.value as WorkflowAssigneeType, assigneeId: '' })}
                                        >
                                            {Object.entries(WORKFLOW_ASSIGNEE_TYPE_LABELS).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={parentStyles.field}>
                                        <label>مقصد *</label>
                                        <select
                                            value={item.assigneeId}
                                            onChange={(e) => updateStep(index, { assigneeId: e.target.value })}
                                        >
                                            <option value="">انتخاب کنید</option>
                                            {options.map((opt) => (
                                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {assigneeName ? (
                                    <p className={styles.wizardStepAssigneeHint}>
                                        → {formatAssigneeLabel(item.assigneeType, assigneeName)}
                                    </p>
                                ) : null}
                            </div>
                        );
                    })}
                    <button type="button" className={tabStyles.smallBtn} onClick={() => setDraftSteps((prev) => [...prev, emptyStep()])}>
                        + افزودن مرحله
                    </button>
                </>
            )}

            {step === 3 && (
                <>
                    <p className={styles.wizardEmptyHint}>مسیر تأیید به این شکل اجرا خواهد شد:</p>
                    <WorkflowPathPreview steps={previewSteps} />
                </>
            )}

            {step === 4 && (
                <ul className={styles.wizardSummaryList}>
                    <li><span>نام فرآیند</span><strong>{name.trim()}</strong></li>
                    <li><span>توضیح</span><strong>{description.trim() || '—'}</strong></li>
                    <li><span>تعداد مراحل</span><strong>{previewSteps.length.toLocaleString('fa-IR')}</strong></li>
                    <li>
                        <span>مسیر</span>
                        <strong>
                            {previewSteps.map((s) => `${s.label}${s.assigneeDisplay ? ` (${s.assigneeDisplay})` : ''}`).join(' ← ')}
                        </strong>
                    </li>
                </ul>
            )}
        </WorkflowWizardShell>
    );
}
