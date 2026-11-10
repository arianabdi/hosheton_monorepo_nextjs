'use client';

import { LuFolderOpen, LuTrash2, LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import styles from './GroupDeleteDialog.module.scss';

export type GroupDeleteMode = 'keepNodes' | 'withNodes';

interface GroupDeleteDialogProps {
    open: boolean;
    groupLabel?: string;
    onSelect: (mode: GroupDeleteMode) => void;
    onClose: () => void;
}

export function GroupDeleteDialog({ open, groupLabel, onSelect, onClose }: GroupDeleteDialogProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={onClose} role="presentation">
            <div
                className={styles.dialog}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="group-delete-title"
            >
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={tc('close')}>
                    <LuX />
                </button>
                <h3 id="group-delete-title">{t('delete_group')}</h3>
                <p>
                    {groupLabel
                        ? t('delete_group_how_named', { label: groupLabel })
                        : t('delete_group_how')}
                </p>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.primary}
                        onClick={() => onSelect('keepNodes')}
                    >
                        <LuFolderOpen />
                        <span>
                            <strong>{t('delete_group_only')}</strong>
                            <small>{t('keep_group_nodes')}</small>
                        </span>
                    </button>
                    <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => onSelect('withNodes')}
                    >
                        <LuTrash2 />
                        <span>
                            <strong>{t('delete_group_with_nodes')}</strong>
                            <small>{t('delete_all_inside')}</small>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
