'use client';

import { useTranslation } from 'react-i18next';
import { LuCopyPlus, LuGitBranch, LuX } from 'react-icons/lu';
import styles from './RunModeDialog.module.scss';

export type CloneMode = 'with-edges' | 'without-edges';

interface CloneModeDialogProps {
    open: boolean;
    nodeLabel?: string;
    onSelect: (mode: CloneMode) => void;
    onClose: () => void;
}

export function CloneModeDialog({ open, nodeLabel, onSelect, onClose }: CloneModeDialogProps) {
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
                aria-labelledby="clone-mode-title"
            >
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={tc('close')}>
                    <LuX />
                </button>
                <h3 id="clone-mode-title">{t('confirm_clone')}</h3>
                <p>
                    {nodeLabel
                        ? t('clone_named', { label: nodeLabel })
                        : t('clone_this_node')}
                </p>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.primary}
                        onClick={() => onSelect('with-edges')}
                    >
                        <LuGitBranch />
                        <span>
                            <strong>{t('clone_with_edges')}</strong>
                            <small>{t('clone_with_edges_hint')}</small>
                        </span>
                    </button>
                    <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => onSelect('without-edges')}
                    >
                        <LuCopyPlus />
                        <span>
                            <strong>{t('clone_without_edges')}</strong>
                            <small>{t('clone_without_edges_hint')}</small>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
