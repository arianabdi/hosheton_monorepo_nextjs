'use client';

import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { LuGift } from 'react-icons/lu';
import { getStoredReferralCode, wasAttributionAttempted } from '@/app/lib/referral/capture';
import styles from './ReferralInviteNotice.module.scss';

const noopSubscribe = () => () => undefined;

/** کد دعوتی که هنوز اعمال نشده (سمت سرور همیشه خالی تا hydration یکسان بماند) */
function pendingInviteCode(): string {
    const code = getStoredReferralCode();
    return code && !wasAttributionAttempted(code) ? code : '';
}

/**
 * یادآوری کد دعوت در صفحات ورود — کاربری که با لینک ?ref= آمده، قبل از ثبت‌نام می‌بیند
 * کدش حفظ شده و بعد از ورود خودکار اعمال می‌شود.
 */
export default function ReferralInviteNotice() {
    const { t } = useTranslation('auth');
    const code = useSyncExternalStore(noopSubscribe, pendingInviteCode, () => '');
    if (!code) return null;
    return (
        <p className={styles.notice} role="status">
            <LuGift aria-hidden className={styles.icon} />
            <span>
                {t('referral_invite_notice_before')} <bdi className={styles.code}>{code}</bdi> {t('referral_invite_notice_after')}
            </span>
        </p>
    );
}
