'use client';

import { useTranslation } from 'react-i18next';
import { LuCheck, LuHeadphones, LuMousePointerClick, LuSend, LuTicket } from 'react-icons/lu';
import styles from './SupportEmptyHint.module.scss';

/** حالت خالی تیکت‌ها — هم‌سبک موشن تنظیمات نود: کاربر پیامش را می‌نویسد و «ارسال» را می‌زند،
    تیکت «باز» می‌شود، پشتیبانی در حال نوشتن است و پاسخ می‌دهد و وضعیت «پاسخ داده شد» می‌شود. */
export function SupportEmptyHint() {
    const { t } = useTranslation('support');

    return (
        <div className={styles.empty}>
            <div className={styles.art} aria-hidden>
                <span className={styles.card}>
                    <span className={styles.head}>
                        <LuTicket className={styles.ticketIcon} />
                        <b />
                        <span className={styles.status}>
                            <i className={styles.statusOpen} />
                            <span className={styles.statusDone}><LuCheck /></span>
                            <b />
                        </span>
                    </span>

                    <span className={styles.userMsg}><b /><b /></span>
                    <span className={styles.typing}><i /><i /><i /></span>
                    <span className={styles.agent}><LuHeadphones /></span>
                    <span className={styles.reply}><b /><b /></span>

                    <span className={styles.composer}>
                        <i className={styles.typed} />
                        <span className={styles.send}><LuSend /></span>
                    </span>
                </span>

                <span className={styles.ripple} />
                <span className={styles.burst}><i /><i /><i /><i /><i /><i /><i /><i /></span>
                <LuMousePointerClick className={styles.cursor} />
            </div>
            <p className={styles.title}>{t('empty')}</p>
            <p className={styles.text}>{t('empty_hint')}</p>
        </div>
    );
}
