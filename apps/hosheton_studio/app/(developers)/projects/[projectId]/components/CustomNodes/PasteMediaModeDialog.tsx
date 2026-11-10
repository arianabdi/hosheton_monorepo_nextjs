'use client';

import { useTranslation } from 'react-i18next';
import { LuLayers, LuLayoutGrid, LuX } from 'react-icons/lu';
import styles from './RunModeDialog.module.scss';

export type PasteMediaMode = 'separate' | 'combined';

interface PasteMediaModeDialogProps {
    open: boolean;
    count: number;
    onSelect: (mode: PasteMediaMode) => void;
    onClose: () => void;
}

export function PasteMediaModeDialog({ open, count, onSelect, onClose }: PasteMediaModeDialogProps) {
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
                aria-labelledby="paste-media-title"
            >
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={tc('close')}>
                    <LuX />
                </button>
                <h3 id="paste-media-title">{t('paste_media_title')}</h3>
                <p>{t('paste_media_body', { count })}</p>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.primary}
                        onClick={() => onSelect('separate')}
                    >
                        <LuLayoutGrid />
                        <span>
                            <strong>{t('paste_media_separate')}</strong>
                            <small>{t('paste_media_separate_hint')}</small>
                        </span>
                    </button>
                    <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => onSelect('combined')}
                    >
                        <LuLayers />
                        <span>
                            <strong>{t('paste_media_combined')}</strong>
                            <small>{t('paste_media_combined_hint')}</small>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
