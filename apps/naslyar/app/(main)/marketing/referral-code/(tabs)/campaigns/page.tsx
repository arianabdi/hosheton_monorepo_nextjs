'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import { useReferralAdmin, useReferralData } from '../../lib/ReferralAdminProvider';
import { referralHref } from '../../lib/sections';
import { formatDate, formatNumber } from '../../lib/format';
import { CAMPAIGN_STATUS_LABELS, type ReferralCampaign, type ReferralCampaignStatus } from '../../lib/referral.types';
import type { ReferralAdminApi } from '../../lib/referral-api';
import Guide from '../../components/Guide';
import styles from '../../ReferralCode.module.scss';

const loadCampaigns = (api: ReferralAdminApi) => api.listCampaigns();

const STATUS_TONE: Record<ReferralCampaignStatus, string> = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ENDED: 'ended',
};

/** کمپین‌ها — فهرست، تغییر وضعیت سریع و ورود به فرم افزودن/ویرایش */
export default function ReferralCampaignsPage() {
    const { api, invalidate } = useReferralAdmin();
    const { data: campaigns, loading } = useReferralData(loadCampaigns);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [ending, setEnding] = useState<ReferralCampaign | null>(null);

    const changeStatus = async (campaign: ReferralCampaign, status: ReferralCampaignStatus) => {
        if (!api) return;
        try {
            setBusyId(campaign._id);
            await api.setCampaignStatus(campaign._id, status);
            SuccessToaster({ message: `کمپین «${campaign.name}» ${CAMPAIGN_STATUS_LABELS[status]} شد.` });
            setEnding(null);
            invalidate();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <Guide
                icon="📣"
                title="کمپین‌ها چطور کار می‌کنند؟"
                intro="هر کمپین مجموعه‌ای از قوانین پاداش با بازه زمانی و شرایط خودش است. دعوت هر کاربر جدید به یک کمپین وصل می‌شود و پاداش‌های بعدی او از قوانین همان کمپین حساب می‌شود."
                cards={[
                    {
                        title: 'معنی وضعیت‌ها',
                        items: [
                            <><strong>پیش‌نویس:</strong> در حال آماده‌سازی؛ هیچ دعوتی به آن وصل نمی‌شود.</>,
                            <><strong>فعال:</strong> دعوت‌های جدید و پرداخت‌های دعوت‌شده‌ها پاداش می‌سازند.</>,
                            <><strong>متوقف:</strong> موقتاً پاداشی صادر نمی‌شود؛ با فعال‌سازی ادامه می‌یابد.</>,
                            <><strong>پایان‌یافته:</strong> کمپین بسته شده؛ پاداش‌های صادرشده همچنان قابل پرداخت‌اند.</>,
                        ],
                    },
                    {
                        title: 'قبل از فعال‌سازی',
                        items: [
                            <>حداقل یک قانون فعال داشته باشد (ستون «قوانین»).</>,
                            <>فقط یک کمپین را هم‌زمان فعال نگه دارید تا معلوم باشد دعوت‌ها به کدام وصل می‌شوند.</>,
                            <>بازه زمانی خالی یعنی بدون محدودیت تاریخ.</>,
                        ],
                    },
                ]}
            />

            {!campaigns ? (
                loading && (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                    </div>
                )
            ) : campaigns.length === 0 ? (
                <div className={styles.emptyState}>
                    هنوز کمپینی ساخته نشده — <Link href={referralHref.newCampaign}>اولین کمپین را بسازید</Link>.
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>کمپین</th>
                                <th>وضعیت</th>
                                <th>بازه زمانی</th>
                                <th>قوانین</th>
                                <th>شرایط</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((campaign) => (
                                <tr key={campaign._id}>
                                    <td data-label="کمپین">
                                        <strong>{campaign.name}</strong>
                                        {campaign.description && <div className={styles.muted}>{campaign.description}</div>}
                                    </td>
                                    <td data-label="وضعیت">
                                        <span className={`${styles.statusBadge} ${styles[STATUS_TONE[campaign.status]]}`}>
                                            {CAMPAIGN_STATUS_LABELS[campaign.status]}
                                        </span>
                                    </td>
                                    <td data-label="بازه زمانی" className={styles.muted}>
                                        {campaign.startAt || campaign.endAt
                                            ? `${formatDate(campaign.startAt)} تا ${formatDate(campaign.endAt)}`
                                            : 'بدون محدودیت'}
                                    </td>
                                    <td data-label="قوانین">{formatNumber(campaign.ruleCount ?? 0)}</td>
                                    <td data-label="شرایط" className={styles.muted}>
                                        {campaign.newCustomerOnly ? 'فقط کاربر جدید' : 'همه کاربران'} · بررسی{' '}
                                        {formatNumber(campaign.reviewPeriodDays)} روز
                                    </td>
                                    <td data-label="عملیات">
                                        <div className={styles.actionsCell}>
                                            <Link href={referralHref.editCampaign(campaign._id)} className={styles.smallBtn}>
                                                ویرایش
                                            </Link>
                                            {campaign.status !== 'ACTIVE' && (
                                                <button
                                                    type="button"
                                                    className={`${styles.smallBtn} ${styles.primary}`}
                                                    disabled={busyId === campaign._id || !campaign.ruleCount}
                                                    title={!campaign.ruleCount ? 'کمپین بدون قانون پاداشی نمی‌سازد' : undefined}
                                                    onClick={() => changeStatus(campaign, 'ACTIVE')}
                                                >
                                                    فعال‌سازی
                                                </button>
                                            )}
                                            {campaign.status === 'ACTIVE' && (
                                                <button
                                                    type="button"
                                                    className={styles.smallBtn}
                                                    disabled={busyId === campaign._id}
                                                    onClick={() => changeStatus(campaign, 'PAUSED')}
                                                >
                                                    توقف
                                                </button>
                                            )}
                                            {campaign.status !== 'ENDED' && (
                                                <button
                                                    type="button"
                                                    className={`${styles.smallBtn} ${styles.danger}`}
                                                    disabled={busyId === campaign._id}
                                                    onClick={() => setEnding(campaign)}
                                                >
                                                    پایان
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={!!ending}
                title="پایان کمپین"
                confirmLabel="پایان کمپین"
                tone="danger"
                busy={!!ending && busyId === ending._id}
                onConfirm={() => ending && changeStatus(ending, 'ENDED')}
                onClose={() => setEnding(null)}
            >
                کمپین «{ending?.name}» بسته می‌شود و دیگر پاداش جدیدی نمی‌سازد. پاداش‌های صادرشده همچنان در تب «پاداش‌ها» قابل
                تأیید و پرداخت‌اند.
            </ConfirmDialog>
        </>
    );
}
