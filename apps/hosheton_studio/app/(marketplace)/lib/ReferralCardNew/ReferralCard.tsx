'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuCheck, LuChevronLeft, LuCopy, LuGift, LuLink2 } from 'react-icons/lu';
import { copyToClipboard } from '@my-workspace/utils';
import styles from './ReferralCard.module.scss';

export interface ReferralCardProps {
    /** کد دعوت واقعی کاربر از api/marketing/referral/me */
    referCode: string;
    /** لینک کامل دعوت (روی همین environment) */
    referLink: string;
    /** مبلغ پاداش نمایش‌داده‌شده (فرمت‌شده با واحد) */
    rewardAmount: string;
    /** تعداد دعوت‌های موفق (فرمت‌شده) */
    successfulCount?: string;
    /** لینک تب گزارش دعوت */
    reportHref?: string;
}

export default function ReferralCard({
    referCode,
    referLink,
    rewardAmount,
    successfulCount,
    reportHref,
}: ReferralCardProps) {
    const { t } = useTranslation('marketplace');
    const [copied, setCopied] = useState<'code' | 'link' | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
    }, []);

    const copy = (text: string, kind: 'code' | 'link') => {
        copyToClipboard(text);
        setCopied(kind);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(null), 1800);
    };

    return (
        <section className={styles.card} aria-label={t('referral_hero_title')}>
            <LuGift className={styles.watermark} aria-hidden />

            <div className={styles.top}>
                <h2 className={styles.title}>{t('referral_card_title')}</h2>
                {reportHref ? (
                    <Link href={reportHref} className={styles.report} scroll={false}>
                        {t('referral_tab')}
                        <LuChevronLeft size={14} aria-hidden className={styles.reportIcon} />
                    </Link>
                ) : null}
            </div>

            <span className={styles.earnedLabel}>{t('referral_card_earned_label')}</span>
            <div className={styles.earnings}>
                <strong className={styles.amount}>{rewardAmount}</strong>
                {successfulCount ? (
                    <span className={styles.stat}>
                        {successfulCount} {t('referral_successful')}
                    </span>
                ) : null}
            </div>

            <div className={styles.codeBox}>
                <div className={styles.codeSection}>
                    <span className={styles.codeLabel}>{t('referral_card_your_code')}</span>
                    <span className={styles.codeValue} dir="ltr">{referCode}</span>
                </div>
                <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => copy(referCode, 'code')}
                    aria-label={t('referral_card_copy_code')}
                    title={t('referral_card_copy_code')}
                >
                    {copied === 'code' ? <LuCheck size={16} /> : <LuCopy size={16} />}
                </button>
            </div>

            <button
                type="button"
                className={`${styles.linkButton} ${copied === 'link' ? styles.linkButtonDone : ''}`}
                onClick={() => copy(referLink, 'link')}
            >
                {copied === 'link' ? <LuCheck size={15} aria-hidden /> : <LuLink2 size={15} aria-hidden />}
                {copied === 'link' ? t('referral_card_copied') : t('referral_card_copy_link')}
            </button>
        </section>
    );
}
