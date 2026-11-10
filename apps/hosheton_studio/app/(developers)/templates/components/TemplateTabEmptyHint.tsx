'use client';

import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuBookmark,
    LuCheck,
    LuLock,
    LuLockOpen,
    LuMousePointerClick,
    LuSend,
    LuShieldCheck,
} from 'react-icons/lu';
import styles from './TemplateTabEmptyHint.module.scss';

export type TemplateEmptyTab = 'pending' | 'saved' | 'purchased';

const ROWS = [0, 1, 2] as const;

/** در حال بررسی: «ارسال برای بررسی» → برچسب «در انتظار» با اسپینر → چک‌لیست بررسی تیک می‌خورد → «تأیید شد» */
function PendingArt() {
    return (
        <>
            <span className={`${styles.card} ${styles.pdCard}`}>
                <span className={styles.cover} />
                <span className={styles.pdPill}>
                    <i className={styles.pdSpin} />
                    <span className={styles.pdOk}><LuCheck /></span>
                    <b />
                </span>
                <b className={styles.cardTitle} />
                <b className={styles.cardDesc} />
                <span className={`${styles.btn} ${styles.pdSubmit}`}><LuSend /><b /></span>
            </span>
            <span className={`${styles.card} ${styles.pdReview}`}>
                <span className={styles.pdHead}><LuShieldCheck /><b /></span>
                {ROWS.map((i) => (
                    <span key={i} className={styles.pdRow}>
                        <span className={styles.pdCheck}><LuCheck /></span>
                        <b />
                    </span>
                ))}
            </span>
        </>
    );
}

/** نشان‌شده‌ها: کلیک روی نشان یک قالب → نشان پر می‌شود و کپی کارت به سینی «نشان‌شده‌ها» می‌رود */
function SavedArt() {
    return (
        <>
            {ROWS.map((i) => (
                <span key={i} className={`${styles.card} ${styles.svCard}`}>
                    <span className={styles.cover} />
                    <b className={styles.cardTitle} />
                    <span className={styles.svMark}><LuBookmark /></span>
                </span>
            ))}
            <span className={styles.svFly}><span className={styles.cover} /></span>
            <span className={styles.svTray}>
                <LuBookmark />
                <span className={styles.svCount}><em>0</em><em>1</em></span>
            </span>
        </>
    );
}

/** خریداری‌شده‌ها: کلیک روی «خرید» → قفل باز و کاور نمایان می‌شود، دکمه تیک سبز می‌شود و رسید بیرون می‌آید */
function PurchasedArt() {
    return (
        <>
            <span className={styles.puReceipt}>
                <b /><b /><b />
                <em>$5</em>
                <span className={styles.puStamp}><LuCheck /></span>
            </span>
            <span className={`${styles.card} ${styles.puCard}`}>
                <span className={styles.cover} />
                <span className={styles.puVeil} />
                <span className={styles.puLock}>
                    <LuLock className={styles.puLocked} />
                    <LuLockOpen className={styles.puOpen} />
                </span>
                <b className={styles.cardTitle} />
                <span className={`${styles.btn} ${styles.puBuy}`}><LuLock /><b>$5</b></span>
                <span className={`${styles.btn} ${styles.puDone}`}><LuCheck /></span>
            </span>
        </>
    );
}

const ARTS: Record<TemplateEmptyTab, ComponentType> = {
    pending: PendingArt,
    saved: SavedArt,
    purchased: PurchasedArt,
};

/** حالت خالی تب‌های «در حال بررسی»، «نشان‌شده» و «خریداری‌شده» قالب‌ها — هم‌سبک موشن تنظیمات نود،
    وسط صفحه با عنوان و یک خط راهنما */
export function TemplateTabEmptyHint({ tab, title }: { tab: TemplateEmptyTab; title: string }) {
    const { t } = useTranslation('templates');
    const Art = ARTS[tab];

    return (
        <div className={styles.empty}>
            <div className={`${styles.art} ${styles[`art_${tab}`]}`} aria-hidden>
                <Art />
                <span className={styles.ripple} />
                <span className={styles.burst}><i /><i /><i /><i /><i /><i /><i /><i /></span>
                <LuMousePointerClick className={styles.cursor} />
            </div>
            <p className={styles.title}>{title}</p>
            <p className={styles.text}>{t(`${tab}_empty_hint`)}</p>
        </div>
    );
}
