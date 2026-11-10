'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import parentStyles from '../../../marketing/Marketing.module.scss';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import styles from '../Documents.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import WorkflowsGuide from '../components/WorkflowsGuide';
import TemplateBuilderWizard from '../components/TemplateBuilderWizard';
import WorkflowTemplateTable from '../components/WorkflowTemplateTable';
import StartWorkflowWizard from '../components/StartWorkflowWizard';
import {
    appendAuditLog,
    createWorkflowTemplate,
    deleteWorkflowTemplateRest,
    fetchWorkflowTemplatesPage,
    getStepAssigneeFields,
    getWorkflowStepLabel,
    isPendingForEmployee,
    loadWorkflowInstances,
    loadWorkflowTemplates,
    loadWorkflowTemplatesRest,
    normalizeWorkflowStep,
    normalizeWorkflowTemplate,
    resolveAuditActor,
    resolveStepAssigneeDisplay,
    saveWorkflowInstances,
    saveWorkflowTemplates,
    updateWorkflowTemplateRest,
} from '../documents-api';
import type { DocumentWorkflowInstance, DocumentWorkflowTemplate } from '../documents.types';
import { WORKFLOW_STATUS_LABELS } from '../documents.types';
import { findEmployeeByUserId, formatAssigneeLabel, loadHrStore } from '../../hr/hr-api';
import type { HrEmployee, HrJobRole } from '../../hr/hr.types';

const TABS = [
    { id: 'pending', label: 'در انتظار تأیید من' },
    { id: 'outbox', label: 'ارسال‌شده‌های من' },
    { id: 'completed', label: 'آرشیو تأیید' },
    { id: 'builder', label: 'طراح گردش کار' },
];

function formatDate(value?: string) {
    if (!value) return '—';
    return new Date(value).toLocaleString('fa-IR');
}

export default function WorkflowsPage() {
    const { baseUrl, fullname, username, email, userId } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [instances, setInstances] = useState<DocumentWorkflowInstance[]>([]);
    const [templates, setTemplates] = useState<DocumentWorkflowTemplate[]>([]);
    const [jobRoles, setJobRoles] = useState<HrJobRole[]>([]);
    const [currentEmployee, setCurrentEmployee] = useState<HrEmployee | undefined>();
    const [startWizardOpen, setStartWizardOpen] = useState(false);
    const [editTemplate, setEditTemplate] = useState<DocumentWorkflowTemplate | null>(null);
    const [builderTemplates, setBuilderTemplates] = useState<DocumentWorkflowTemplate[]>([]);
    const [builderPagination, setBuilderPagination] = useState({
        currentPage: 1,
        itemPerPage: 10,
        totalItems: 0,
    });
    const [builderLoading, setBuilderLoading] = useState(false);

    const auditActor = useMemo(
        () => resolveAuditActor({ fullname, username, email, userId }),
        [fullname, username, email, userId],
    );

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [i, t, hr] = await Promise.all([
                loadWorkflowInstances(baseUrl, token),
                loadWorkflowTemplatesRest(baseUrl, token),
                loadHrStore(baseUrl, token),
            ]);
            setInstances(i.value);
            setTemplates(t.map((tpl) => normalizeWorkflowTemplate(tpl, hr.jobRoles)));
            setJobRoles(hr.jobRoles);
            setCurrentEmployee(findEmployeeByUserId(hr.employees, userId));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, userId]);

    useEffect(() => {
        void load();
    }, [load]);

    const loadBuilderTemplates = useCallback(async () => {
        if (!token) return;
        try {
            setBuilderLoading(true);
            const result = await fetchWorkflowTemplatesPage(baseUrl, token, {
                page: builderPagination.currentPage,
                limit: builderPagination.itemPerPage,
            });
            setBuilderTemplates(result.items.map((tpl) => normalizeWorkflowTemplate(tpl, jobRoles)));
            setBuilderPagination((prev) => ({ ...prev, totalItems: result.totalItems }));
        } catch {
            const legacy = await loadWorkflowTemplates(baseUrl, token);
            const normalized = legacy.value.map((tpl) => normalizeWorkflowTemplate(tpl, jobRoles));
            const start = (builderPagination.currentPage - 1) * builderPagination.itemPerPage;
            setBuilderTemplates(normalized.slice(start, start + builderPagination.itemPerPage));
            setBuilderPagination((prev) => ({ ...prev, totalItems: normalized.length }));
        } finally {
            setBuilderLoading(false);
        }
    }, [baseUrl, token, builderPagination.currentPage, builderPagination.itemPerPage, jobRoles]);

    useEffect(() => {
        if (tab === 'builder') {
            void loadBuilderTemplates();
        }
    }, [tab, loadBuilderTemplates]);

    const saveTemplate = async (template: DocumentWorkflowTemplate) => {
        if (!token) return;
        const body = {
            name: template.name,
            description: template.description,
            steps: template.steps,
        };
        try {
            if (editTemplate?.id) {
                await updateWorkflowTemplateRest(baseUrl, token, editTemplate.id, body);
            } else {
                await createWorkflowTemplate(baseUrl, token, body);
            }
        } catch {
            const next = editTemplate?.id
                ? templates.map((item) => (item.id === editTemplate.id ? template : item))
                : [...templates, template];
            await saveWorkflowTemplates(baseUrl, token, next);
            setTemplates(next.map((tpl) => normalizeWorkflowTemplate(tpl, jobRoles)));
        }
        void appendAuditLog(baseUrl, token, {
            ...auditActor,
            action: 'workflow_template',
            fileName: template.name,
            detail: template.steps
                .map((step) => `${step.label} → ${resolveStepAssigneeDisplay(step)}`)
                .join(' | '),
        }).catch(() => {});
        SuccessToaster({ message: editTemplate ? 'فرآیند به‌روزرسانی شد' : 'فرآیند ذخیره شد' });
        setEditTemplate(null);
        await load();
        await loadBuilderTemplates();
    };

    const deleteTemplate = async (template: DocumentWorkflowTemplate) => {
        if (!token) return;
        if (!window.confirm(`فرآیند «${template.name}» حذف شود؟`)) return;
        try {
            try {
                await deleteWorkflowTemplateRest(baseUrl, token, template.id);
            } catch {
                const next = templates.filter((item) => item.id !== template.id);
                await saveWorkflowTemplates(baseUrl, token, next);
                setTemplates(next.map((tpl) => normalizeWorkflowTemplate(tpl, jobRoles)));
            }
            if (editTemplate?.id === template.id) setEditTemplate(null);
            SuccessToaster({ message: 'فرآیند حذف شد' });
            await load();
            await loadBuilderTemplates();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const filtered = useMemo(() => {
        if (tab === 'pending') {
            return instances.filter((item) => isPendingForEmployee(item, currentEmployee));
        }
        if (tab === 'outbox') {
            return instances.filter(
                (item) =>
                    (item.submittedBy === auditActor.userName || item.submittedById === userId) &&
                    item.status !== 'completed' &&
                    item.status !== 'rejected',
            );
        }
        if (tab === 'completed') {
            return instances.filter((item) => item.status === 'completed');
        }
        return [];
    }, [instances, tab, auditActor.userName, userId, currentEmployee]);

    const advance = async (id: string) => {
        if (!token) return;
        const now = new Date().toISOString();
        const instance = instances.find((i) => i.id === id);
        const tpl = templates.find((t) => t.id === instance?.templateId);
        const maxStep = (tpl?.steps.length || 1) - 1;
        const newIndex = (instance?.currentStepIndex ?? 0) + 1;
        const completed = newIndex > maxStep;
        const stepLabel = getWorkflowStepLabel(tpl, Math.min(newIndex, maxStep));
        const currentStepLabel = getWorkflowStepLabel(tpl, instance?.currentStepIndex ?? 0);
        const nextStepRaw = tpl?.steps[Math.min(newIndex, maxStep)];
        const nextAssigneeFields = completed || !nextStepRaw
            ? {}
            : getStepAssigneeFields(normalizeWorkflowStep(nextStepRaw, jobRoles));

        const next = instances.map((i) => {
            if (i.id !== id) return i;
            const history = [
                ...(i.history || []),
                {
                    stepIndex: completed ? maxStep : newIndex,
                    stepLabel: completed ? 'تکمیل' : stepLabel,
                    action: completed ? ('complete' as const) : ('advance' as const),
                    userName: auditActor.userName,
                    at: now,
                },
            ];
            if (completed) {
                return {
                    ...i,
                    status: 'completed' as const,
                    currentStepIndex: maxStep,
                    assignee: undefined,
                    assigneeType: undefined,
                    assigneeId: undefined,
                    assigneeName: undefined,
                    updatedAt: now,
                    history,
                };
            }
            return {
                ...i,
                currentStepIndex: newIndex,
                status: 'in_progress' as const,
                ...nextAssigneeFields,
                updatedAt: now,
                history,
            };
        });
        await saveWorkflowInstances(baseUrl, token, next);
        setInstances(next);
        void appendAuditLog(baseUrl, token, {
            ...auditActor,
            action: completed ? 'workflow_complete' : 'workflow_advance',
            fileId: instance?.fileId,
            fileName: instance?.fileName,
            detail: completed
                ? `گردش کار «${instance?.templateName || ''}» تکمیل شد`
                : `از «${currentStepLabel}» به «${stepLabel}» — ${instance?.templateName || ''}`,
        }).catch(() => {});
        SuccessToaster({ message: completed ? 'گردش کار تکمیل شد' : 'مرحله پیش رفت' });
    };

    if (loading) return <LoadingState />;

    const emptyMessage =
        tab === 'pending'
            ? 'سندی در انتظار تأیید شما نیست. با «شروع گردش کار» یک فایل وارد فرآیند کنید.'
            : tab === 'outbox'
              ? 'هنوز گردش کاری ارسال نکرده‌اید.'
              : 'سند تکمیل‌شده‌ای ثبت نشده است.';

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>کارتابل و گردش کار</h1>
                            <p className={parentStyles.subtitle}>تأیید، ارجاع و امضای اسناد</p>
                        </div>
                        {tab !== 'builder' && (
                            <button type="button" className={parentStyles.primaryBtn} onClick={() => setStartWizardOpen(true)}>
                                + شروع گردش کار
                            </button>
                        )}
                    </header>
                    <WorkflowsGuide />
                    {tab === 'pending' && !currentEmployee ? (
                        <p className={styles.wizardEmptyHint}>
                            پروفایل HR برای حساب شما یافت نشد — همه گردش کارهای فعال نمایش داده می‌شوند.{' '}
                            <Link href="/management/hr/employees/new">ثبت نیروی انسانی و اتصال به حساب کاربری</Link>
                        </p>
                    ) : null}
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    {tab === 'builder' ? (
                        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <TemplateBuilderWizard
                                baseUrl={baseUrl}
                                token={token || ''}
                                initialTemplate={editTemplate}
                                onSave={saveTemplate}
                                onCancelEdit={() => setEditTemplate(null)}
                            />
                            {builderLoading && builderTemplates.length === 0 ? (
                                <LoadingState />
                            ) : (
                                <>
                                    <WorkflowTemplateTable
                                        templates={builderTemplates}
                                        onEdit={setEditTemplate}
                                        onDelete={(template) => void deleteTemplate(template)}
                                    />
                                    {builderPagination.totalItems > 0 && (
                                        <div className={styles.paginationSpace}>
                                            <Pagination
                                                itemPerPage={builderPagination.itemPerPage}
                                                currentPage={builderPagination.currentPage}
                                                totalItems={builderPagination.totalItems}
                                                setRowsPerPage={(limit) =>
                                                    setBuilderPagination((prev) => ({
                                                        ...prev,
                                                        itemPerPage: limit,
                                                        currentPage: 1,
                                                    }))
                                                }
                                                paginate={(page) =>
                                                    setBuilderPagination((prev) => ({ ...prev, currentPage: page }))
                                                }
                                                rtl
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={tabStyles.tableWrap}>
                            <table className={tabStyles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>فایل</th>
                                        <th>فرآیند</th>
                                        <th>مرحله</th>
                                        <th>ارسال به</th>
                                        <th>دستورالعمل</th>
                                        <th>ارسال‌کننده</th>
                                        <th>وضعیت</th>
                                        <th>آخرین تغییر</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className={tabStyles.emptyCell} data-label="">
                                                {emptyMessage}
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((i) => {
                                            const tpl = templates.find((t) => t.id === i.templateId);
                                            const currentStep = tpl?.steps[i.currentStepIndex];
                                            const stepLabel = getWorkflowStepLabel(tpl, i.currentStepIndex);
                                            const totalSteps = tpl?.steps.length || 1;
                                            const assigneeDisplay =
                                                i.assigneeType && i.assigneeName
                                                    ? formatAssigneeLabel(i.assigneeType, i.assigneeName)
                                                    : i.assigneeName || i.assignee || '—';
                                            return (
                                                <tr key={i.id}>
                                                    <td data-label="فایل" className={tabStyles.cellPrimary}>{i.fileName}</td>
                                                    <td data-label="فرآیند">{i.templateName}</td>
                                                    <td data-label="مرحله">
                                                        {stepLabel} ({i.currentStepIndex + 1}/{totalSteps})
                                                    </td>
                                                    <td data-label="ارسال به">{assigneeDisplay}</td>
                                                    <td data-label="دستورالعمل" className={tabStyles.cellMuted}>
                                                        {currentStep?.instruction || '—'}
                                                    </td>
                                                    <td data-label="ارسال‌کننده">{i.submittedBy}</td>
                                                    <td data-label="وضعیت">
                                                        <span className={`${tabStyles.statusBadge} ${i.status === 'completed' ? tabStyles.statusBadgeSuccess : i.status === 'pending' ? tabStyles.statusBadgeWarning : ''}`}>
                                                            {WORKFLOW_STATUS_LABELS[i.status]}
                                                            {i.priority === 'urgent' ? ' · فوری' : ''}
                                                        </span>
                                                    </td>
                                                    <td data-label="آخرین تغییر" className={tabStyles.cellMuted}>{formatDate(i.updatedAt)}</td>
                                                    <td data-label="عملیات">
                                                        <div className={tabStyles.rowActions}>
                                                            {i.status !== 'completed' && i.status !== 'rejected' && (
                                                                <button type="button" className={tabStyles.smallBtn} onClick={() => void advance(i.id)}>
                                                                    مرحله بعد
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Wrapper>
            <StartWorkflowWizard
                open={startWizardOpen}
                onClose={() => setStartWizardOpen(false)}
                baseUrl={baseUrl}
                token={token || ''}
                actor={auditActor}
                onStarted={() => {
                    SuccessToaster({ message: 'سند به کارتابل ارسال شد' });
                    void load();
                    setTab('outbox');
                }}
            />
        </Container>
    );
}
