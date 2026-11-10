'use client';

import { useCallback } from 'react';
import { useReferralData } from '../../lib/ReferralAdminProvider';
import { formatDate } from '../../lib/format';
import { REFERRAL_STATUS_LABELS, type ReferralRelationStatus } from '../../lib/referral.types';
import type { ReferralAdminApi } from '../../lib/referral-api';
import Guide from '../../components/Guide';
import UserCell from '../../components/UserCell';
import { ListFilters, ListPagination, useListFilter } from '../../components/ListControls';
import styles from '../../ReferralCode.module.scss';

const STATUS_TONE: Record<ReferralRelationStatus, string> = {
    PENDING: 'pending',
    QUALIFIED: 'qualified',
    REWARDED: 'rewarded',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
};


/** دعوت‌شدگان — رابطه دعوت‌کننده ↔ دعوت‌شده با فیلتر وضعیت و کمپین */
export default function ReferralReferralsPage() {
    const filter = useListFilter();
    const { status, campaignId, page, limit } = filter;
    const loadReferrals = useCallback(
        (api: ReferralAdminApi) => api.listReferrals({ status, campaignId, page, limit }),
        [status, campaignId, page, limit],
    );
    const { data, loading } = useReferralData(loadReferrals);

    return (
        <>
            <Guide
                icon="🤝"
                title="دعوت‌شدگان"
                intro="هر ردیف یعنی کاربری با کد دعوت ثبت‌نام کرده و به دعوت‌کننده‌اش وصل شده است. هر کاربر فقط یک‌بار و فقط به یک دعوت‌کننده وصل می‌شود."
                cards={[
                    {
                        title: 'معنی وضعیت‌ها',
                        items: [
                            <><strong>واجد شرایط:</strong> اتصال ثبت شد؛ پرداخت‌های بعدی او هم برای دعوت‌کننده پاداش می‌سازد.</>,
                            <><strong>پاداش گرفته:</strong> حداقل یک پاداش برای این دعوت صادر شده است.</>,
                            <><strong>ردشده:</strong> پاداش این دعوت رد شد (مثلاً حساب جعلی).</>,
                        ],
                    },
                    {
                        title: 'ستون «اولین پرداخت»',
                        items: [
                            <>زمانی که دعوت‌شده برای اولین بار خرید کرد — معیار تبدیل واقعی دعوت.</>,
                            <>دعوت بدون پرداخت فقط پاداش «ثبت‌نام» (اگر کمپین داشته باشد) می‌سازد.</>,
                        ],
                    },
                ]}
            />

            <ListFilters filter={filter} statusLabels={REFERRAL_STATUS_LABELS} />

            {!data ? (
                loading && (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                    </div>
                )
            ) : data.items.length === 0 ? (
                <div className={styles.emptyState}>دعوتی با این فیلتر پیدا نشد.</div>
            ) : (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>دعوت‌کننده</th>
                                    <th>دعوت‌شده</th>
                                    <th>کمپین</th>
                                    <th>کد</th>
                                    <th>وضعیت</th>
                                    <th>ثبت‌نام</th>
                                    <th>اولین پرداخت</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((referral) => (
                                    <tr key={referral._id}>
                                        <td data-label="دعوت‌کننده"><UserCell user={referral.advocate} /></td>
                                        <td data-label="دعوت‌شده"><UserCell user={referral.referred} /></td>
                                        <td data-label="کمپین">{referral.campaignName || '—'}</td>
                                        <td data-label="کد" className={styles.codeCell}>{referral.referralCode}</td>
                                        <td data-label="وضعیت">
                                            <span className={`${styles.statusBadge} ${styles[STATUS_TONE[referral.status]]}`}>
                                                {REFERRAL_STATUS_LABELS[referral.status]}
                                            </span>
                                        </td>
                                        <td data-label="ثبت‌نام" className={styles.muted}>{formatDate(referral.registeredAt || referral.createdAt)}</td>
                                        <td data-label="اولین پرداخت" className={styles.muted}>{formatDate(referral.convertedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ListPagination filter={filter} total={data.total} />
                </>
            )}
        </>
    );
}
