'use client';

import { useTranslation } from 'react-i18next';
import { LuArrowUp, LuMousePointerClick } from 'react-icons/lu';
import styles from './ChatHistoryEmptyHint.module.scss';

/** حالت خالی تاریخچه چت — هم‌سبک موشن تنظیمات نود: پیامی در کامپوزر تایپ می‌شود، نشانگر روی
    «ارسال» کلیک می‌کند (بوم + پرتوها) و همان گفتگو به‌صورت یک آیتم تاریخچه در جای خالی بالا می‌نشیند. */
export function ChatHistoryEmptyHint() {
    const { t } = useTranslation('projects');

    return (
        <div className={styles.empty}>
            <div className={styles.art} aria-hidden>
                <span className={`${styles.slot} ${styles.slotNew}`} />
                <span className={`${styles.slot} ${styles.slot2}`} />
                <span className={`${styles.slot} ${styles.slot3}`} />

                <span className={styles.item}>
                    <span className={styles.itemHead}><b /><i /></span>
                    <span className={styles.thumbs}><i /><i /><i /></span>
                </span>

                <span className={styles.composer}>
                    <span className={styles.typed} />
                    <span className={styles.send}><LuArrowUp /></span>
                </span>

                <span className={styles.ripple} />
                <span className={styles.burst}>
                    <i /><i /><i /><i /><i /><i /><i /><i />
                </span>
                <LuMousePointerClick className={styles.cursor} />
            </div>
            <p className={styles.title}>{t('empty_chat_history')}</p>
            <p className={styles.text}>{t('empty_chat_history_hint')}</p>
        </div>
    );
}
