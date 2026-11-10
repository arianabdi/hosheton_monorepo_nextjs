'use client';

import { useCallback, useState } from 'react';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import { useReferralAdmin, useReferralData } from '../../lib/ReferralAdminProvider';
import { formatDate, formatNumber, formatToman, userLabel } from '../../lib/format';
import {
    REVIEW_ACTION_LABELS,
    REWARD_STATUS_LABELS,
    REWARD_TYPE_LABELS,
    TRIGGER_LABELS,
    type ReferralAdminReward,
    type ReferralRewardStatus,
    type RewardReviewAction,
} from '../../lib/referral.types';
import type { ReferralAdminApi } from '../../lib/referral-api';
import Guide from '../../components/Guide';
import UserCell from '../../components/UserCell';
import { ListFilters, ListPagination, useListFilter } from '../../components/ListControls';
import styles from '../../ReferralCode.module.scss';

const STATUS_TONE: Record<ReferralRewardStatus, string> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    PAID: 'paid',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
};

/** نحوه محاسبه از snapshot پاداش — همان چیزی که موقع صدور ثبت شده */
function calculation(reward: ReferralAdminReward): string {
    const type = REWARD_TYPE_LABELS[reward.rewardType] || reward.rewardType;
    const value =
        reward.rewardType === 'FIXED_AMOUNT'
            ? formatToman(reward.rewardValue)
            : `${formatNumber(reward.rewardValue)}٪ از ${formatToman(reward.baseAmount)}`;
    const tier = reward.calculationSnapshot?.tier;
    return `${type} — ${value}${tier ? ` (پله از ${formatNumber(tier.minCount || 0)})` : ''}`;
}

const isInReview = (reward: ReferralAdminReward) => !!reward.availableAt && new Date(reward.availableAt).getTime() > Date.now();

/** پاداش‌ها — بررسی، تأیید، پرداخت به کیف پول فروش، رد و لغو */
export default function ReferralRewardsPage() {
    const { api, invalidate } = useReferralAdmin();
    const filter = useListFilter();
    const { status, campaignId, page, limit } = filter;
    const loadRewards = useCallback(
        (client: ReferralAdminApi) => client.listRewards({ status, campaignId, page, limit }),
        [status, campaignId, page, limit],
    );
    const { data, loading } = useReferralData(loadRewards);
    const [pending, setPending] = useState<{ reward: ReferralAdminReward; action: RewardReviewAction } | null>(null);
    const [busy, setBusy] = useState(false);

    const review = async (reason: string) => {
        if (!api || !pending) return;
        try {
            setBusy(true);
            await api.reviewReward(pending.reward._id, pending.action, reason);
            SuccessToaster({ message: `${REVIEW_ACTION_LABELS[pending.action]} ثبت شد.` });
            setPending(null);
            invalidate();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const ask = (reward: ReferralAdminReward, action: RewardReviewAction) => setPending({ reward, action });
    const needsReason = pending?.action === 'reject' || pending?.action === 'cancel';

    return (
        <>
            <Guide
                icon="💰"
                title="چرخه پاداش"
                intro="هر پاداش بعد از صدور، مبلغ و نحوه محاسبه‌اش را ثابت نگه می‌دارد (snapshot)؛ تغییر بعدی کمپین روی آن اثری ندارد."
                cards={[
                    {
                        title: 'ترتیب اقدام',
                        ordered: true,
                        items: [
                            <><strong>در دوره بررسی:</strong> تا پایان دوره کمپین صبر کنید (ستون «قابل تأیید از»).</>,
                            <><strong>تأیید:</strong> پاداش «آماده پرداخت» می‌شود.</>,
                            <><strong>پرداخت:</strong> مبلغ به کیف پول فروش (تومانی) دعوت‌کننده با نوع «پاداش دعوت» واریز می‌شود.</>,
                        ],
                    },
                    {
                        title: 'رد و لغو',
                        items: [
                            <><strong>رد:</strong> برای پاداش مشکوک (حساب جعلی، دعوت خود) — دلیل الزامی است.</>,
                            <><strong>لغو:</strong> برای پاداش در دوره بررسی که خریدش بازگشت داده شد.</>,
                            <>پاداش پرداخت‌شده قابل رد یا لغو نیست.</>,
                        ],
                    },
                ]}
            />

            <ListFilters filter={filter} statusLabels={REWARD_STATUS_LABELS} />

            {!data ? (
                loading && (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                    </div>
                )
            ) : data.items.length === 0 ? (
                <div className={styles.emptyState}>پاداشی با این فیلتر پیدا نشد.</div>
            ) : (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>دعوت‌کننده</th>
                                    <th>رویداد</th>
                                    <th>محاسبه</th>
                                    <th>مبلغ</th>
                                    <th>وضعیت</th>
                                    <th>تاریخ‌ها</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((reward) => (
                                    <tr key={reward._id}>
                                        <td data-label="دعوت‌کننده">
                                            <UserCell user={reward.advocate} />
                                        </td>
                                        <td data-label="رویداد">
                                            {TRIGGER_LABELS[reward.eventType as keyof typeof TRIGGER_LABELS] || reward.eventType}
                                            <div className={styles.muted}>{reward.campaignName}</div>
                                        </td>
                                        <td data-label="محاسبه" className={styles.muted}>{calculation(reward)}</td>
                                        <td data-label="مبلغ" className={styles.amountCell}>{formatToman(reward.calculatedAmount)}</td>
                                        <td data-label="وضعیت">
                                            <span className={`${styles.statusBadge} ${styles[STATUS_TONE[reward.status]]}`}>
                                                {REWARD_STATUS_LABELS[reward.status]}
                                            </span>
                                            {reward.rejectionReason && <div className={styles.muted}>{reward.rejectionReason}</div>}
                                        </td>
                                        <td data-label="تاریخ‌ها" className={styles.muted}>
                                            صدور: {formatDate(reward.createdAt)}
                                            {reward.status === 'PENDING' && reward.availableAt && <div>قابل تأیید از: {formatDate(reward.availableAt)}</div>}
                                            {reward.paidAt && <div>پرداخت: {formatDate(reward.paidAt)}</div>}
                                        </td>
                                        <td data-label="عملیات">
                                            <div className={styles.actionsCell}>
                                                {reward.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className={`${styles.smallBtn} ${styles.primary}`}
                                                            disabled={isInReview(reward)}
                                                            title={isInReview(reward) ? `دوره بررسی تا ${formatDate(reward.availableAt)}` : undefined}
                                                            onClick={() => ask(reward, 'approve')}
                                                        >
                                                            تأیید
                                                        </button>
                                                        <button type="button" className={styles.smallBtn} onClick={() => ask(reward, 'cancel')}>
                                                            لغو
                                                        </button>
                                                    </>
                                                )}
                                                {reward.status === 'APPROVED' && (
                                                    <button type="button" className={`${styles.smallBtn} ${styles.primary}`} onClick={() => ask(reward, 'pay')}>
                                                        پرداخت
                                                    </button>
                                                )}
                                                {(reward.status === 'PENDING' || reward.status === 'APPROVED') && (
                                                    <button type="button" className={`${styles.smallBtn} ${styles.danger}`} onClick={() => ask(reward, 'reject')}>
                                                        رد
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ListPagination filter={filter} total={data.total} />
                </>
            )}

            <ConfirmDialog
                open={!!pending}
                title={pending ? REVIEW_ACTION_LABELS[pending.action] : ''}
                confirmLabel={pending ? REVIEW_ACTION_LABELS[pending.action] : ''}
                tone={pending?.action === 'reject' || pending?.action === 'cancel' ? 'danger' : 'primary'}
                busy={busy}
                reasonLabel={needsReason ? 'دلیل (به‌عنوان سابقه ثبت می‌شود)' : undefined}
                onConfirm={review}
                onClose={() => !busy && setPending(null)}
            >
                {pending && (
                    <>
                        پاداش <strong>{formatToman(pending.reward.calculatedAmount)}</strong> برای{' '}
                        <strong>{userLabel(pending.reward.advocate).name}</strong>
                        {pending.action === 'pay' && ' به کیف پول فروش (تومانی) او واریز می‌شود. این عملیات برگشت‌پذیر نیست.'}
                        {pending.action === 'approve' && ' تأیید و آماده پرداخت می‌شود.'}
                        {needsReason && ' کنار گذاشته می‌شود و در آمار دعوت‌کننده حساب نمی‌شود.'}
                    </>
                )}
            </ConfirmDialog>
        </>
    );
}
