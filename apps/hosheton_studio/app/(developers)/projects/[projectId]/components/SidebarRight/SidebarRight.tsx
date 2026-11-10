'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SidebarRight.module.scss';

interface SidebarRightProps {
    collapsed: boolean;
    onToggle: () => void;
}

const SidebarRight: React.FC<SidebarRightProps> = ({ collapsed, onToggle }) => {
    const { t } = useTranslation('projects');
    return (
        <aside className={`${styles.sidebarRight} ${collapsed ? styles.collapsed : ''}`}>
            <header className={styles.sidebarHeader}>
                <button className={styles.toggleButton} onClick={onToggle}>
                    {collapsed ? <i className="fas fa-chevron-left" /> : <i className="fas fa-chevron-right" />}
                </button>
            </header>
            <div className={styles.sidebarContent}>
                <h2>{t('sidebar_right')}</h2>
                <p>{t('sidebar_right_body')}</p>
            </div>
        </aside>
    );
};

export default SidebarRight;
