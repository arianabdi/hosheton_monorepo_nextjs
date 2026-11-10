'use client';

import { LuCheck, LuMousePointerClick, LuSend } from 'react-icons/lu';
import styles from './ThreadEmptyHint.module.scss';

type Props = {
    title: string;
    text: string;
};

/** حالت خالی گفتگو — هم‌سبک موشن تنظیمات نود: پیام تایپ و «ارسال» می‌شود، با یک تیک بالا می‌رود،
    تیک دوم رنگی می‌شود (خوانده شد)، طرف مقابل (نقطهٔ سبز آنلاین) در حال نوشتن است و پاسخ می‌دهد. */
export function ThreadEmptyHint({ title, text }: Props) {
    return (
        <div className={styles.empty}>
            <div className={styles.art} aria-hidden>
                <span className={styles.card}>
                    <span className={styles.head}>
                        <span className={styles.peer}><i className={styles.online} /></span>
                        <b />
                    </span>

                    <span className={styles.myMsg}>
                        <b /><b />
                        <span className={styles.ticks}>
                            <LuCheck className={styles.tick1} />
                            <LuCheck className={styles.tick2} />
                        </span>
                    </span>
                    <span className={styles.typing}><i /><i /><i /></span>
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
            <p className={styles.title}>{title}</p>
            <p className={styles.text}>{text}</p>
        </div>
    );
}
