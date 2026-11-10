'use client';

import React from 'react';
import HrRowActionMenu from '../../hr/components/HrRowActionMenu';
import styles from '../Documents.module.scss';
import { buildPublicFileUrl } from '../documents-api';
import type { ExploreFile } from '../documents-api';

type Props = {
    rowId: string;
    file: ExploreFile;
    isStarred: boolean;
    hasActiveWorkflow: boolean;
    onEdit: () => void;
    onStartWorkflow: () => void;
    onToggleStar: () => void;
    onDelete: () => void;
};

export default function DocumentRowActions({
    rowId,
    file,
    isStarred,
    hasActiveWorkflow,
    onEdit,
    onStartWorkflow,
    onToggleStar,
    onDelete,
}: Props) {
    const downloadUrl = buildPublicFileUrl(file.key, file.path);

    return (
        <div className={styles.rowActions}>
            <button type="button" className={styles.rowActionBtn} onClick={onEdit}>
                ویرایش
            </button>
            {downloadUrl ? (
                <a
                    className={styles.rowActionBtn}
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                >
                    دانلود
                </a>
            ) : null}
            <HrRowActionMenu
                rowId={rowId}
                items={[
                    ...(!hasActiveWorkflow
                        ? [{ label: 'شروع گردش کار', onClick: onStartWorkflow }]
                        : []),
                    {
                        label: isStarred ? 'حذف ستاره' : 'ستاره‌دار کردن',
                        onClick: onToggleStar,
                    },
                    { label: 'حذف', onClick: onDelete, danger: true },
                ]}
            />
        </div>
    );
}
