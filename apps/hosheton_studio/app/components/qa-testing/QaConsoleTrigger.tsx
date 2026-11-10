'use client';

import React from 'react';
import { LuFlaskConical } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { hasRole } from '@/app/lib/user-roles';
import { useQaConsoleStore } from '@/app/zustand/store/useQaConsoleStore';
import styles from './QaConsoleTrigger.module.scss';

/**
 * دکمه باز کردن کنسول QA Testing در سایدبار.
 * سطح دسترسی عیناً مثل پنجره Developer در projects/[projectId]:
 * hasRole(useAppStore.roles, 'super-admin')
 */
const QaConsoleTrigger: React.FC = () => {
    const { t } = useTranslation('common');
    const userRoles = useAppStore((state) => state.roles);
    const openQaConsole = useQaConsoleStore((state) => state.openQaConsole);
    const isSuperAdmin = hasRole(userRoles, 'super-admin');

    if (!isSuperAdmin) return null;

    return (
        <button type="button" className={styles.trigger} onClick={openQaConsole} title={t('qa_title')}>
            <span className={styles.icon}>
                <LuFlaskConical size={16} />
            </span>
            <span className={styles.label}>{t('qa_trigger')}</span>
        </button>
    );
};

export default QaConsoleTrigger;
