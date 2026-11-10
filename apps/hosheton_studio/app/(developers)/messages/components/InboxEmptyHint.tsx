'use client';

import { useTranslation } from 'react-i18next';
import { LuInbox, LuMessageSquare, LuMousePointerClick } from 'react-icons/lu';
import styles from './InboxEmptyHint.module.scss';

/** حالت خالی فهرست گفتگوها — هم‌سبک موشن تنظیمات نود: پیامی از بالا می‌رسد، یک ردیف گفتگو
    با نشان قرمز «خوانده‌نشده» در جای خالی می‌نشیند و نشانگر رویش کلیک می‌کند (بوم + پرتوها)؛
    نشان قرمز محو و ردیف انتخاب می‌شود. */
export function InboxEmptyHint() {
    const { t } = useTranslation('messages');

    return (
        <div className={styles.empty}>
            <div className={styles.art} aria-hidden>
                <span className={styles.card}>
                    <span className={styles.head}>
                        <LuInbox className={styles.inboxIcon} />
                        <b />
                    </span>

                    <span className={`${styles.slot} ${styles.slot1}`} />
                    <span className={`${styles.slot} ${styles.slot2}`} />
                    <span className={`${styles.slot} ${styles.slot3}`} />

                    <span className={styles.row}>
                        <span className={styles.rowActive} />
                        <i className={styles.avatar} />
                        <span className={styles.lines}><b /><b /></span>
                        <span className={styles.badge} />
                    </span>
                </span>

                <span className={styles.incoming}><LuMessageSquare /></span>

                <span className={styles.ripple} />
                <span className={styles.burst}><i /><i /><i /><i /><i /><i /><i /><i /></span>
                <LuMousePointerClick className={styles.cursor} />
            </div>
            <p className={styles.title}>{t('list_empty_title')}</p>
            <p className={styles.text}>{t('list_empty_hint')}</p>
        </div>
    );
}
