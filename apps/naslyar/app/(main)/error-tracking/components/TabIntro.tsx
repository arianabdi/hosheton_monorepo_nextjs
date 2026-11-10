'use client';

import type { ReactNode } from 'react';
import styles from '../ErrorTracking.module.scss';

/** معرفی یک‌خطی تب (این تب چه کاری می‌کند) + اکشن‌های همان تب — هدر ماژول در (tabs)/layout ثابت است */
export default function TabIntro({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
    return (
        <div className={styles.tabIntro}>
            <p className={styles.tabIntroText}>{children}</p>
            {actions ? <div className={styles.tabIntroActions}>{actions}</div> : null}
        </div>
    );
}
