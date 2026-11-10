'use client';

import { LuSave } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import type { SaveStatus } from '../../../hooks/useAutoSaveWorkflow';
import styles from './NavbarSaveButton.module.scss';

interface NavbarSaveButtonProps {
    saveStatus: SaveStatus;
    saveError: string | null;
    onClick: () => void;
}

export function NavbarSaveButton({ saveStatus, saveError, onClick }: NavbarSaveButtonProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const showRing = saveStatus === 'saving';

    const titleByStatus: Record<SaveStatus, string> = {
        idle: t('all_saved'),
        pending: t('pending_autosave'),
        saving: tc('saving'),
        saved: t('saved'),
        error: t('save_error'),
    };
    const statusTitle = titleByStatus[saveStatus];

    return (
        <button
            type="button"
            className={`${styles.btn} ${styles[saveStatus]}`}
            title={saveStatus === 'error' && saveError ? saveError : statusTitle}
            aria-label={statusTitle}
            onClick={onClick}
        >
            {showRing && <span className={`${styles.ring} ${styles.ringSaving}`} aria-hidden />}
            <LuSave className={styles.icon} />
        </button>
    );
}
