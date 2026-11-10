'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCopy } from 'react-icons/lu';
import { Pagination } from '@my-workspace/components';
import { copyToClipboard } from '@my-workspace/utils';
import { referralApi } from '@/app/(marketplace)/lib/referral-api';
import { useMyReferral } from '@/app/(marketplace)/lib/useMyReferral';
import type {
    ReferralHistoryItem,
    ReferralRewardItem,
    ReferralRewardStatus,
    ReferralRelationStatus,
} from '@/app/(marketplace)/lib/referral-types';
import { buildReferralLink } from '@/app/lib/referral/capture';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { formatAppAmount, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './ReferralPanels.module.scss';

const REWARD_STATUS: Record<ReferralRewardStatus, { tone: string; label: string }> = {
    PENDING: { tone: 'pending', label: 'referral_reward_pending' },
    APPROVED: { tone: 'approved', label: 'referral_reward_approved' },
    PAID: { tone: 'paid', label: 'referral_reward_paid' },
    REJECTED: { tone: 'rejected', label: 'referral_reward_rejected' },
    CANCELLED: { tone: 'cancelled', label: 'referral_reward_cancelled' },
};

const RELATION_STATUS: Record<ReferralRelationStatus, { tone: string; label: string }> = {
    PENDING: { tone: 'pending', label: 'referral_status_pending' },
    QUALIFIED: { tone: 'approved', label: 'referral_status_qualified' },
    REWARDED: { tone: 'paid', label: 'referral_status_rewarded' },
    REJECTED: { tone: 'rejected', label: 'referral_status_rejected' },
    EXPIRED: { tone: 'expired', label: 'referral_status_expired' },
};

const PAGE_SIZE_OPTIONS = [8, 16, 32];

/** لیست صفحه‌بندی‌شده سمت کلاینت (داده‌ها حداکثر ۱۰۰ ردیف از API می‌آیند) — صفحه‌بندی مشترک پروژه */
function PagedList<T>({ items, renderRow, empty }: { items: T[]; renderRow: (item: T) => ReactNode; empty: string }) {
    const { i18n } = useTranslation();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
    if (items.length === 0) return <p className={styles.empty}>{empty}</p>;
    const current = Math.min(page, Math.max(1, Math.ceil(items.length / pageSize)));
    return (
        <>
            <div className={styles.table}>{items.slice((current - 1) * pageSize, current * pageSize).map(renderRow)}</div>
            {items.length > PAGE_SIZE_OPTIONS[0] && (
                <div className={styles.pager}>
                    <Pagination
                        rtl={isRtlLanguage(i18n.language)}
                        itemPerPage={pageSize}
                        currentPage={current}
                        totalItems={items.length}
                        paginate={setPage}
                        setRowsPerPage={setPageSize}
                        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                    />
                </div>
            )}
        </>
    );
}

/**
 * تب گزارش دعوت در صفحه creator (فقط صاحب حساب): لینک دعوت، آمار، پیشرفت سطح،
 * تاریخچه دعوت‌ها و پاداش‌ها. پاداش‌ها به کیف پول فروش (تومانی) واریز می‌شوند.
 */
export default function CreatorReferralPanel() {
    const { t, i18n } = useTranslation('marketplace');
    const lang = i18n.language;
    const { overview, failed } = useMyReferral();
    const [lists, setLists] = useState<{ referrals: ReferralHistoryItem[]; rewards: ReferralRewardItem[] } | null>(null);
    const [listsFailed, setListsFailed] = useState(false);

    useEffect(() => {
        let active = true;
        Promise.all([referralApi.getMyHistory(), referralApi.getMyRewards()]).then(
            ([history, rewards]) => {
                if (active) setLists({ referrals: history.items || [], rewards: rewards.items || [] });
            },
            () => {
                if (active) setListsFailed(true);
            },
        );
        return () => {
            active = false;
        };
    }, []);

    const progressPercent = useMemo(() => {
        const tier = overview?.tierProgress;
        if (!tier?.nextTier) return 100;
        const from = Number(tier.currentTier?.minCount) || 0;
        const to = Number(tier.nextTier.minCount) || from + 1;
        const value = Number(tier.metricValue) || 0;
        if (to <= from) return 100;
        return Math.min(100, Math.max(0, ((value - from) / (to - from)) * 100));
    }, [overview]);

    if (failed || listsFailed) return <p className={styles.empty}>{t('referral_load_error')}</p>;
    if (!overview || !lists) return <p className={styles.empty}>{t('loading')}...</p>;

    // لینک روی همین environment ساخته می‌شود — در dev روی localhost، در prod روی دامنه اصلی
    const link = buildReferralLink(overview.code) || overview.link;
    const { stats, tierProgress: tier } = overview;
    const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(lang) : '—');

    return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <h3>{t('referral_hero_title')}</h3>
                <div className={styles.linkRow}>
                    <input className={styles.linkInput} readOnly value={link} dir="ltr" onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" className={styles.copyBtn} onClick={() => copyToClipboard(link)}>
                        <LuCopy size={12} /> {t('referral_copy')}
                    </button>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                    <strong>{formatAppNumber(stats.successfulReferrals, lang)}</strong>
                    <span>{t('referral_successful')}</span>
                </div>
                <div className={styles.statBox}>
                    <strong>{formatAppAmount(stats.pendingAmount, lang)}</strong>
                    <span>{t('referral_pending_rewards')}</span>
                </div>
                <div className={styles.statBox}>
                    <strong>{formatAppAmount(stats.approvedAmount, lang)}</strong>
                    <span>{t('referral_available_rewards')}</span>
                </div>
                <div className={styles.statBox}>
                    <strong>{formatAppAmount(stats.paidAmount, lang)}</strong>
                    <span>{t('referral_reward_paid')}</span>
                </div>
            </div>

            {tier?.tiered && (
                <div className={styles.card}>
                    <h3>{t('referral_progress_title')}</h3>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className={styles.progressMeta}>
                        <span>
                            {t('referral_current_tier')}: {formatAppNumber(tier.currentTierIndex, lang)}
                        </span>
                        {tier.nextTier && (
                            <span>
                                {t('referral_next_tier')}:{' '}
                                {tier.metric === 'SUCCESSFUL_REFERRALS'
                                    ? `${formatAppNumber(tier.remainingToNextTier, lang)} ${t('referral_metric_referrals')}`
                                    : `${formatAppAmount(tier.remainingToNextTier, lang)} ${t('referral_metric_amount')}`}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.card}>
                <h3>{t('referral_history_title')}</h3>
                <PagedList
                    items={lists.referrals}
                    empty={t('referral_no_history')}
                    renderRow={(item) => (
                        <div key={item._id} className={styles.row}>
                            <div>
                                <p>{item.referredName || t('referral_unknown_user')}</p>
                                <small>{date(item.createdAt)}</small>
                            </div>
                            <span className={`${styles.badge} ${styles[RELATION_STATUS[item.status]?.tone] || ''}`}>
                                {t(RELATION_STATUS[item.status]?.label || item.status)}
                            </span>
                        </div>
                    )}
                />
            </div>

            <div className={styles.card}>
                <h3>{t('referral_rewards_title')}</h3>
                <PagedList
                    items={lists.rewards}
                    empty={t('referral_no_rewards')}
                    renderRow={(item) => (
                        <div key={item._id} className={styles.row}>
                            <div>
                                <p>
                                    +{formatAppAmount(item.calculatedAmount, lang)} {t('toman')}
                                </p>
                                <small>{date(item.createdAt)}</small>
                            </div>
                            <span className={`${styles.badge} ${styles[REWARD_STATUS[item.status]?.tone] || ''}`}>
                                {t(REWARD_STATUS[item.status]?.label || item.status)}
                            </span>
                        </div>
                    )}
                />
            </div>
        </div>
    );
}
