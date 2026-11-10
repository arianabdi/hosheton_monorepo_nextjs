'use client';

import { LuCircleAlert } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';
import { HoshetonError } from '@/app/lib/errors';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import styles from './ErrorHoverPopup.module.scss';

interface ErrorHoverPopupProps {
    message: string;
    stage?: string;
    timestamp?: string;
}

export function ErrorHoverPopup({ message, stage, timestamp }: ErrorHoverPopupProps) {
    const { t } = useTranslation('projects');
    const lang = useAppStore((s) => s.lang);
    const stageLabel = stage ? t(`stage.${stage}`, { defaultValue: stage }) : '';

    return (
        <div className={styles.hoverPopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.hoverPopupHeader}>
                <LuCircleAlert />
                <span>{stageLabel ? `${t('run_error')} — ${stageLabel}` : t('run_error')}</span>
            </div>
            <HoshetonError error={message} kind="generation">
                {(e) => <p className={styles.hoverPopupMessage}>{e.message}</p>}
            </HoshetonError>
            {timestamp && (
                <span className={styles.hoverPopupTime}>
                    {formatAppDate(timestamp, lang)}
                </span>
            )}
            <span className={styles.hoverPopupHint}>{t('click_for_details')}</span>
        </div>
    );
}
