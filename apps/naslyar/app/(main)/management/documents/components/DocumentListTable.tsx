'use client';

import React from 'react';
import tabStyles from '../../../marketing/automation/Automation.module.scss';
import styles from '../Documents.module.scss';
import type { DocumentListRow } from '../documents-api';
import { WORKFLOW_STATUS_LABELS } from '../documents.types';
import DocumentRowActions from './DocumentRowActions';

function formatDate(value?: string) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('fa-IR');
}

function statusLabel(status: DocumentListRow['workflowStatus']) {
    if (status === 'draft') return 'پیش‌نویس';
    return WORKFLOW_STATUS_LABELS[status] ?? status;
}

type Props = {
    rows: DocumentListRow[];
    accessRoles: AccessRoleItem[];
    roleNameById: Map<string, string>;
    selectedIds: Set<string>;
    onToggleSelect: (fileId: string) => void;
    onToggleSelectAll: () => void;
    onEdit: (row: DocumentListRow) => void;
    onStartWorkflow: (row: DocumentListRow) => void;
    onToggleStar: (row: DocumentListRow) => void;
    onDelete: (row: DocumentListRow) => void;
};

export default function DocumentListTable({
    rows,
    roleNameById,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onEdit,
    onStartWorkflow,
    onToggleStar,
    onDelete,
}: Props) {
    const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.fileId));

    return (
        <div className={tabStyles.tableWrap}>
            <table className={tabStyles.dataTable}>
                <thead>
                    <tr>
                        <th style={{ width: 36 }}>
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={onToggleSelectAll}
                                aria-label="انتخاب همه"
                            />
                        </th>
                        <th>تاریخ ایجاد</th>
                        <th>نام سند</th>
                        <th>نقش‌های مجاز</th>
                        <th>وضعیت</th>
                        <th>مالک</th>
                        <th>انقضا</th>
                        <th>عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={8} className={tabStyles.emptyCell} data-label="">
                                سندی یافت نشد.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr key={row.fileId}>
                                <td data-label="">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(row.fileId)}
                                        onChange={() => onToggleSelect(row.fileId)}
                                        aria-label={`انتخاب ${row.title}`}
                                    />
                                </td>
                                <td data-label="تاریخ ایجاد">{formatDate(row.createdAt)}</td>
                                <td data-label="نام سند" className={tabStyles.cellPrimary}>
                                    {row.isStarred ? '★ ' : ''}
                                    {row.title}
                                </td>
                                <td data-label="نقش‌های مجاز">
                                    {row.allowedAccessRoleIds.length === 0 ? (
                                        <span className={styles.roleBadgeEmpty}>همه / تعریف نشده</span>
                                    ) : (
                                        <div className={styles.roleBadges}>
                                            {row.allowedAccessRoleIds.map((roleId) => (
                                                <span key={roleId} className={styles.roleBadge}>
                                                    {roleNameById.get(roleId) || 'نقش حذف‌شده'}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td data-label="وضعیت">
                                    <span
                                        className={`${tabStyles.statusBadge} ${
                                            row.workflowStatus === 'completed'
                                                ? tabStyles.statusBadgeSuccess
                                                : row.workflowStatus === 'pending' || row.workflowStatus === 'in_progress'
                                                  ? tabStyles.statusBadgeWarning
                                                  : ''
                                        }`}
                                    >
                                        {statusLabel(row.workflowStatus)}
                                    </span>
                                </td>
                                <td data-label="مالک">{row.owner || '—'}</td>
                                <td data-label="انقضا">{formatDate(row.expiresAt)}</td>
                                <td data-label="عملیات">
                                    <DocumentRowActions
                                        rowId={row.fileId}
                                        file={row.file}
                                        isStarred={row.isStarred}
                                        hasActiveWorkflow={row.workflowStatus !== 'draft'}
                                        onEdit={() => onEdit(row)}
                                        onStartWorkflow={() => onStartWorkflow(row)}
                                        onToggleStar={() => onToggleStar(row)}
                                        onDelete={() => onDelete(row)}
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
