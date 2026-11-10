'use client';

import React, { useEffect, useMemo, useState } from 'react';
import parentStyles from '../../../marketing/Marketing.module.scss';
import styles from '../Documents.module.scss';
import { ErrorToaster } from '@my-workspace/utils';
import {
    appendAuditLog,
    exploreFiles,
    getActiveWorkflowForFile,
    isDocumentExploreFile,
    loadFileMetaMap,
    loadWorkflowInstances,
    loadWorkflowTemplatesRest,
    normalizeFileId,
    normalizeWorkflowTemplate,
    resolveAuditActor,
    resolveStepAssigneeDisplay,
    startWorkflowInstance,
    type ExploreFile,
} from '../documents-api';
import { loadJobRoles } from '../../hr/hr-api';
import type { DocumentWorkflowTemplate, WorkflowPriority } from '../documents.types';
import WorkflowWizardShell, { WizardFooter, WorkflowPathPreview } from './WorkflowWizardShell';

const STEPS_WITH_FILE = [
    { id: 'template', label: 'انتخاب فرآیند' },
    { id: 'details', label: 'جزئیات' },
    { id: 'review', label: 'تأیید' },
];

const STEPS_FULL = [
    { id: 'file', label: 'انتخاب سند' },
    ...STEPS_WITH_FILE,
];

interface PreselectedFile {
    id: string;
    name: string;
}

interface StartWorkflowWizardProps {
    open: boolean;
    onClose: () => void;
    baseUrl: string;
    token: string;
    actor: ReturnType<typeof resolveAuditActor>;
    preselectedFile?: PreselectedFile;
    onStarted?: () => void;
}

export default function StartWorkflowWizard({
    open,
    onClose,
    baseUrl,
    token,
    actor,
    preselectedFile,
    onStarted,
}: StartWorkflowWizardProps) {
    const hasPreselected = Boolean(preselectedFile?.id);
    const steps = hasPreselected ? STEPS_WITH_FILE : STEPS_FULL;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [templates, setTemplates] = useState<DocumentWorkflowTemplate[]>([]);
    const [instances, setInstances] = useState<Awaited<ReturnType<typeof loadWorkflowInstances>>['value']>([]);
    const [files, setFiles] = useState<ExploreFile[]>([]);
    const [fileSearch, setFileSearch] = useState('');
    const [selectedFileId, setSelectedFileId] = useState(preselectedFile?.id || '');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [note, setNote] = useState('');
    const [priority, setPriority] = useState<WorkflowPriority>('normal');

    useEffect(() => {
        if (!open || !token) return;
        setStep(1);
        setSelectedFileId(preselectedFile?.id || '');
        setSelectedTemplateId('');
        setNote('');
        setPriority('normal');
        setFileSearch('');

        void (async () => {
            setLoading(true);
            try {
                const [rolesRes, tpl, inst, meta, explore] = await Promise.all([
                    loadJobRoles(baseUrl, token),
                    loadWorkflowTemplatesRest(baseUrl, token),
                    loadWorkflowInstances(baseUrl, token),
                    loadFileMetaMap(baseUrl, token),
                    exploreFiles(baseUrl, token, { limit: 200 }),
                ]);
                setTemplates(tpl.map((t) => normalizeWorkflowTemplate(t, rolesRes.value)));
                setInstances(inst.value);
                setFiles(explore.files.filter((file) => isDocumentExploreFile(file, meta)));
            } finally {
                setLoading(false);
            }
        })();
    }, [open, token, baseUrl, preselectedFile?.id]);

    const selectedFile = useMemo(() => {
        if (preselectedFile?.id) {
            return {
                id: preselectedFile.id,
                name: preselectedFile.name,
            };
        }
        const file = files.find((item) => normalizeFileId(item) === selectedFileId);
        return file
            ? { id: normalizeFileId(file)!, name: file.originalname || file.name || 'فایل' }
            : null;
    }, [files, preselectedFile, selectedFileId]);

    const selectedTemplate = templates.find((item) => item.id === selectedTemplateId);

    const filteredFiles = useMemo(() => {
        const q = fileSearch.trim().toLowerCase();
        if (!q) return files;
        return files.filter((file) => (file.originalname || file.name || '').toLowerCase().includes(q));
    }, [files, fileSearch]);

    const activeWorkflow = selectedFile ? getActiveWorkflowForFile(instances, selectedFile.id) : undefined;

    const templateStepIndex = hasPreselected ? 1 : 2;
    const detailsStepIndex = hasPreselected ? 2 : 3;
    const reviewStepIndex = hasPreselected ? 3 : 4;

    const canGoNext = useMemo(() => {
        if (step === 1 && !hasPreselected) return Boolean(selectedFileId) && !activeWorkflow;
        if (step === templateStepIndex) return Boolean(selectedTemplateId);
        return true;
    }, [step, hasPreselected, selectedFileId, activeWorkflow, templateStepIndex, selectedTemplateId]);

    const handleSubmit = async () => {
        if (!token || !selectedFile || !selectedTemplate) return;
        setSubmitting(true);
        try {
            await startWorkflowInstance(baseUrl, token, {
                fileId: selectedFile.id,
                fileName: selectedFile.name,
                template: selectedTemplate,
                submittedBy: actor.userName,
                submittedById: actor.userId,
                note,
                priority,
            });
            void appendAuditLog(baseUrl, token, {
                ...actor,
                action: 'workflow_start',
                fileId: selectedFile.id,
                fileName: selectedFile.name,
                detail: `فرآیند: ${selectedTemplate.name}`,
            }).catch(() => {});
            onStarted?.();
            onClose();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    const currentStepContent = () => {
        if (loading) {
            return <p className={styles.wizardEmptyHint}>در حال بارگذاری...</p>;
        }

        if (step === 1 && !hasPreselected) {
            return (
                <>
                    <div className={parentStyles.field}>
                        <label>جستجوی سند</label>
                        <input value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} placeholder="نام فایل..." />
                    </div>
                    <div className={styles.wizardFileList}>
                        {filteredFiles.length === 0 ? (
                            <p className={styles.wizardEmptyHint}>فایلی در مخزن یافت نشد. ابتدا از بخش مخزن اسناد آپلود کنید.</p>
                        ) : (
                            filteredFiles.map((file) => {
                                const id = normalizeFileId(file)!;
                                const inWorkflow = Boolean(getActiveWorkflowForFile(instances, id));
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`${styles.wizardFileOption} ${selectedFileId === id ? styles.selected : ''}`}
                                        onClick={() => setSelectedFileId(id)}
                                        disabled={inWorkflow}
                                    >
                                        {file.originalname || file.name}
                                        {inWorkflow ? ' (در گردش کار فعال)' : ''}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </>
            );
        }

        if (step === templateStepIndex) {
            if (templates.length === 0) {
                return (
                    <p className={styles.wizardEmptyHint}>
                        هنوز فرآیندی تعریف نشده. از تب «طراح گردش کار» یک قالب بسازید.
                    </p>
                );
            }

            return (
                <>
                    {activeWorkflow ? (
                        <p className={styles.wizardEmptyHint}>این فایل در حال حاضر در گردش کار «{activeWorkflow.templateName}» است.</p>
                    ) : null}
                    <div className={styles.wizardTemplateCards}>
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                className={`${styles.wizardTemplateCard} ${selectedTemplateId === template.id ? styles.selected : ''}`}
                                onClick={() => setSelectedTemplateId(template.id)}
                            >
                                <h4>{template.name}</h4>
                                <p>{template.description || `${template.steps.length} مرحله تأیید`}</p>
                            </button>
                        ))}
                    </div>
                    {selectedTemplate ? (
                        <div style={{ marginTop: '1rem' }}>
                            <WorkflowPathPreview
                                steps={selectedTemplate.steps.map((item) => ({
                                    label: item.label,
                                    assigneeDisplay: resolveStepAssigneeDisplay(item),
                                    instruction: item.instruction,
                                }))}
                            />
                        </div>
                    ) : null}
                </>
            );
        }

        if (step === detailsStepIndex) {
            return (
                <>
                    <div className={parentStyles.field}>
                        <label>اولویت</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as WorkflowPriority)}>
                            <option value="normal">عادی</option>
                            <option value="urgent">فوری</option>
                        </select>
                    </div>
                    <div className={parentStyles.field}>
                        <label>توضیح برای تأییدکننده (اختیاری)</label>
                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً لطفاً تا فردا بررسی شود" />
                    </div>
                </>
            );
        }

        return (
            <>
                <ul className={styles.wizardSummaryList}>
                    <li><span>سند</span><strong>{selectedFile?.name || '—'}</strong></li>
                    <li><span>فرآیند</span><strong>{selectedTemplate?.name || '—'}</strong></li>
                    <li><span>اولویت</span><strong>{priority === 'urgent' ? 'فوری' : 'عادی'}</strong></li>
                    <li><span>توضیح</span><strong>{note.trim() || '—'}</strong></li>
                </ul>
                {selectedTemplate ? (
                    <div style={{ marginTop: '1rem' }}>
                        <p className={styles.wizardEmptyHint}>مسیر کامل تأیید:</p>
                        <WorkflowPathPreview
                            steps={selectedTemplate.steps.map((item) => ({
                                label: item.label,
                                assigneeDisplay: resolveStepAssigneeDisplay(item),
                                instruction: item.instruction,
                            }))}
                        />
                    </div>
                ) : null}
            </>
        );
    };

    const isReviewStep = step === reviewStepIndex;

    return (
        <div className={styles.wizardModalOverlay} onClick={onClose} role="presentation">
            <div className={styles.wizardModal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="start-workflow-title">
                <div className={styles.wizardModalHeader}>
                    <div>
                        <h2 id="start-workflow-title" className={styles.wizardTitle}>شروع گردش کار</h2>
                        <p className={styles.wizardSubtitle}>سند را وارد مسیر تأیید کنید.</p>
                    </div>
                    <button type="button" className={styles.wizardModalClose} onClick={onClose} aria-label="بستن">×</button>
                </div>
                <div className={styles.wizardModalBody}>
                    <WorkflowWizardShell
                        steps={steps}
                        currentStep={step}
                        footer={
                            <WizardFooter
                                showBack={step > 1}
                                onBack={() => setStep((prev) => Math.max(1, prev - 1))}
                                onCancel={onClose}
                                onNext={isReviewStep ? () => void handleSubmit() : () => setStep((prev) => Math.min(steps.length, prev + 1))}
                                nextLabel={isReviewStep ? (submitting ? 'در حال ارسال...' : 'ارسال به کارتابل') : 'بعدی'}
                                nextDisabled={!canGoNext || (isReviewStep && submitting) || Boolean(activeWorkflow)}
                            />
                        }
                    >
                        {currentStepContent()}
                    </WorkflowWizardShell>
                </div>
            </div>
        </div>
    );
}
