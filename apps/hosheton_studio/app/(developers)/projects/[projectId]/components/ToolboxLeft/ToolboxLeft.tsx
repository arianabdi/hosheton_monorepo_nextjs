'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ToolboxLeft.module.scss';

const ToolboxLeft: React.FC = () => {
    const { t } = useTranslation('projects');
    return (
        <aside className={styles.toolboxLeft}>
            <h2>{t('toolbox')}</h2>
            <button className={styles.toolButton}>{t('tool_a')}</button>
            <button className={styles.toolButton}>{t('tool_b')}</button>
            <button className={styles.toolButton}>{t('tool_c')}</button>
        </aside>
    );
};

export default ToolboxLeft;
