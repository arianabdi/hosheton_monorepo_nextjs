'use client';

import React from 'react';
import styles from '../Documents.module.scss';
import type { DocumentFolder, DocumentWorkflowStatus } from '../documents.types';
import { ROOT_FOLDER_ID, WORKFLOW_STATUS_LABELS } from '../documents.types';

type Props = {
    folders: DocumentFolder[];
    selectedFolderId: string;
    onFolderChange: (folderId: string) => void;
    starredOnly: boolean;
    onStarredChange: (value: boolean) => void;
    workflowStatus: DocumentWorkflowStatus | '';
    onWorkflowStatusChange: (value: DocumentWorkflowStatus | '') => void;
};

function FolderBranch({
    folders,
    parentId,
    depth,
    selectedFolderId,
    onSelect,
}: {
    folders: DocumentFolder[];
    parentId: string | null;
    depth: number;
    selectedFolderId: string;
    onSelect: (id: string) => void;
}) {
    const children = folders.filter((f) => f.parentId === parentId && f.id !== ROOT_FOLDER_ID);
    if (children.length === 0) return null;
    return (
        <>
            {children.map((folder) => (
                <React.Fragment key={folder.id}>
                    <button
                        type="button"
                        className={`${styles.filterOption} ${selectedFolderId === folder.id ? styles.active : ''}`}
                        style={{ paddingInlineStart: `${0.55 + depth * 0.65}rem` }}
                        onClick={() => onSelect(folder.id)}
                    >
                        {folder.name}
                    </button>
                    <FolderBranch
                        folders={folders}
                        parentId={folder.id}
                        depth={depth + 1}
                        selectedFolderId={selectedFolderId}
                        onSelect={onSelect}
                    />
                </React.Fragment>
            ))}
        </>
    );
}

export default function DocumentFilterSidebar({
    folders,
    selectedFolderId,
    onFolderChange,
    starredOnly,
    onStarredChange,
    workflowStatus,
    onWorkflowStatusChange,
}: Props) {
    const statusOptions: Array<{ value: DocumentWorkflowStatus | ''; label: string }> = [
        { value: '', label: 'همه وضعیت‌ها' },
        { value: 'draft', label: 'پیش‌نویس' },
        ...Object.entries(WORKFLOW_STATUS_LABELS).map(([value, label]) => ({
            value: value as DocumentWorkflowStatus,
            label,
        })),
    ];

    return (
        <aside className={styles.filterSidebar}>
            <p className={styles.filterTitle}>فیلتر</p>

            <div className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>پوشه</p>
                <button
                    type="button"
                    className={`${styles.filterOption} ${selectedFolderId === ROOT_FOLDER_ID ? styles.active : ''}`}
                    onClick={() => onFolderChange(ROOT_FOLDER_ID)}
                >
                    همه اسناد
                </button>
                <FolderBranch
                    folders={folders}
                    parentId={ROOT_FOLDER_ID}
                    depth={0}
                    selectedFolderId={selectedFolderId}
                    onSelect={onFolderChange}
                />
            </div>

            <div className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>وضعیت گردش کار</p>
                {statusOptions.map((opt) => (
                    <button
                        key={opt.value || 'all'}
                        type="button"
                        className={`${styles.filterOption} ${workflowStatus === opt.value ? styles.active : ''}`}
                        onClick={() => onWorkflowStatusChange(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <div className={styles.filterSection}>
                <p className={styles.filterSectionLabel}>سایر</p>
                <button
                    type="button"
                    className={`${styles.filterOption} ${starredOnly ? styles.active : ''}`}
                    onClick={() => onStarredChange(!starredOnly)}
                >
                    {starredOnly ? '★ فقط ستاره‌دار' : '☆ ستاره‌دار'}
                </button>
            </div>
        </aside>
    );
}
