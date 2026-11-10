'use client';

import type { ReactNode } from 'react';
import styles from '../ErrorTracking.module.scss';

/**
 * شل صفحه‌های پایش خطا: هدر ثابت می‌ماند و فقط محتوای صفحه (outlet) عوض می‌شود. ناوبری بین بخش‌ها
 * فقط در سایدبار است (نوار تب جدا تکراری بود). (PageTransition کل این زیرشاخه را یک کلید می‌داند — config/page-shells.)
 */
export default function ErrorTrackingTabsLayout({ children }: { children: ReactNode }) {
    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>پایش خطا</h1>
                    <p className={styles.subtitle}>
                        خطاهای همهٔ اپ‌ها (API، وب، worker تولید) قبل از اینکه کاربر خبر بدهد — گروه‌بندی، روند، هشدار و پوشش رصد.
                    </p>
                </div>
            </header>

            <div className={styles.outlet}>{children}</div>
        </div>
    );
}
