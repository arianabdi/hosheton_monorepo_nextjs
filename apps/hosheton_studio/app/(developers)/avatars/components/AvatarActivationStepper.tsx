'use client';

import { useTranslation } from 'react-i18next';
import type { AiAvatarStatus } from '@/app/(developers)/projects/types/ai-avatar-api';
import { ACTIVATION_STEPS, resolveActivationStepIndex } from '../avatar-activation-steps';
import { STATUS_LABELS } from '../avatar-status';
import styles from '../avatars.module.scss';

export function AvatarActivationStepper({ status }: { status: AiAvatarStatus }) {
    const { t } = useTranslation('avatars');
    const current = resolveActivationStepIndex(status);

    return (
        <nav className={styles.stepper} aria-label={t('activation_steps')}>
            <ol className={styles.stepperList}>
                {ACTIVATION_STEPS.map((step, index) => {
                    const done = index < current;
                    const active = index === current;
                    return (
                        <li
                            key={step.id}
                            className={[
                                styles.stepperItem,
                                done ? styles.stepperItemDone : '',
                                active ? styles.stepperItemActive : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            <span className={styles.stepperIndex}>{index + 1}</span>
                            <div className={styles.stepperCopy}>
                                <span className={styles.stepperTitle}>{t(step.title)}</span>
                                <span className={styles.stepperDesc}>{t(step.description)}</span>
                            </div>
                        </li>
                    );
                })}
            </ol>
            <p className={styles.stepperStatusNote}>
                {t('current_status')}{' '}
                <strong>{STATUS_LABELS[status] ? t(STATUS_LABELS[status]) : status}</strong>
            </p>
        </nav>
    );
}
