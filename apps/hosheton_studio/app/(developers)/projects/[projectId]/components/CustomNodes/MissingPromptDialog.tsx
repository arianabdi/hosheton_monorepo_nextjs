'use client';

import { useTranslation } from 'react-i18next';
import { LuFileText, LuX } from 'react-icons/lu';
import styles from './RunModeDialog.module.scss';

interface MissingPromptDialogProps {
    open: boolean;
    nodeLabel?: string;
    onClose: () => void;
}

export function MissingPromptDialog({ open, nodeLabel, onClose }: MissingPromptDialogProps) {
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
                aria-labelledby="missing-prompt-title"
            >
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={tc('close')}>
                    <LuX />
                </button>
                <h3 id="missing-prompt-title">{t('prompt_required_title')}</h3>
                <p>
                    {nodeLabel
                        ? t('prompt_required_named', { label: nodeLabel })
                        : t('prompt_required_body')}
                </p>
                <div className={styles.actions}>
                    <button type="button" className={styles.primary} onClick={onClose}>
                        <LuFileText />
                        <span>
                            <strong>{t('prompt_required_ok')}</strong>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
