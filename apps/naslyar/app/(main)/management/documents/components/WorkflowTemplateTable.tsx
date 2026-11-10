'use client';

import React from 'react';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import styles from '../Documents.module.scss';
import HrRowActionMenu from '../../hr/components/HrRowActionMenu';
import type { DocumentWorkflowTemplate } from '../documents.types';
import { resolveStepAssigneeDisplay } from '../documents-api';

function formatDate(value?: string) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fa-IR');
}

function compactSteps(template: DocumentWorkflowTemplate): string {
    const labels = template.steps.map((s) => `${s.label} (${resolveStepAssigneeDisplay(s)})`);
    if (labels.length <= 2) return labels.join(' ← ');
    return `${labels.slice(0, 2).join(' ← ')} +${labels.length - 2}`;
}

type Props = {
    templates: DocumentWorkflowTemplate[];
    onEdit: (template: DocumentWorkflowTemplate) => void;
    onDelete: (template: DocumentWorkflowTemplate) => void;
};

export default function WorkflowTemplateTable({ templates, onEdit, onDelete }: Props) {
    return (
        <div className={tabStyles.tableWrap}>
            <table className={tabStyles.dataTable}>
                <thead>
                    <tr>
                        <th>نام فرآیند</th>
                        <th>توضیح</th>
                        <th>مراحل</th>
                        <th>تاریخ ایجاد</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {templates.length === 0 ? (
                        <tr>
                            <td colSpan={5} className={tabStyles.emptyCell} data-label="">
                                هنوز فرآیندی تعریف نشده است.
                            </td>
                        </tr>
                    ) : (
                        templates.map((template) => (
                            <tr key={template.id}>
                                <td data-label="نام فرآیند" className={tabStyles.cellPrimary}>
                                    {template.name}
                                </td>
                                <td data-label="توضیح" className={tabStyles.cellMuted}>
                                    {template.description || '—'}
                                </td>
                                <td data-label="مراحل" className={styles.compactSteps}>
                                    {compactSteps(template)}
                                </td>
                                <td data-label="تاریخ ایجاد">{formatDate(template.createdAt)}</td>
                                <td data-label="عملیات">
                                    <HrRowActionMenu
                                        rowId={template.id}
                                        items={[
                                            { label: 'ویرایش', onClick: () => onEdit(template) },
                                            { label: 'حذف', onClick: () => onDelete(template), danger: true },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
