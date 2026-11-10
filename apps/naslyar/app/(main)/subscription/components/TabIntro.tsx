'use client';

import type { ReactNode } from 'react';
import styles from '../../error-tracking/ErrorTracking.module.scss';

/** معرفی یک‌خطی تب + اکشن‌های همان تب — هدر ماژول در (tabs)/layout ثابت است */
export default function TabIntro({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
    return (
        <div className={styles.tabIntro}>
            <p className={styles.tabIntroText}>{children}</p>
            {actions ? <div className={styles.tabIntroActions}>{actions}</div> : null}
        </div>
    );
}
