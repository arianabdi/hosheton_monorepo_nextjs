'use client';

import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { buildReferralLink } from '@/app/lib/referral/capture';
import { useMyReferral } from '../useMyReferral';
import ReferralCard from './ReferralCard';

/**
 * کارت دعوت متصل به داده واقعی (useMyReferral) — کد دعوت و مجموع پاداش پرداخت‌شده.
 * بدون داده (خطا یا هنوز بارگذاری) کارت نمایش داده نمی‌شود.
 */
export default function ReferralCardContainer({ reportHref }: { reportHref?: string }) {
    const { t, i18n } = useTranslation('marketplace');
    const { overview } = useMyReferral();
    if (!overview) return null;

    const lang = i18n.language;
    return (
        <ReferralCard
            referCode={overview.code}
            // لینک روی همین environment ساخته می‌شود — مثل تب گزارش دعوت
            referLink={buildReferralLink(overview.code) || overview.link}
            rewardAmount={`${formatAppNumber(overview.stats.paidAmount, lang)} ${t('toman')}`}
            successfulCount={formatAppNumber(overview.stats.successfulReferrals || 0, lang)}
            reportHref={reportHref}
        />
    );
}
