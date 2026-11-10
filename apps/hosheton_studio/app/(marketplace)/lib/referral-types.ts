/** تایپ‌های سیستم دعوت (Referral) — قرارداد با api/marketing/referral (ماژول عمومی core) */

export type ReferralRewardStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type ReferralRelationStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REJECTED' | 'EXPIRED';

export interface ReferralTierProgress {
    tiered: boolean;
    metric: string;
    metricValue: number;
    currentTier: { minCount: number; maxCount: number | null } | null;
    currentTierIndex: number;
    nextTier: { minCount: number; maxCount: number | null } | null;
    remainingToNextTier: number;
}

export interface ReferralRewardItem {
    _id: string;
    referralId: string;
    campaignId: string;
    ruleId: string;
    advocateUserId: string;
    eventId: string;
    eventType: string;
    rewardType: string;
    rewardValue: number;
    baseAmount: number;
    calculatedAmount: number;
    currency: string;
    status: ReferralRewardStatus;
    availableAt: string | null;
    approvedAt: string | null;
    paidAt: string | null;
    rejectionReason: string;
    calculationSnapshot: Record<string, unknown>;
    createdAt: string;
}

export interface ReferralHistoryItem {
    _id: string;
    campaignId: string;
    advocateUserId: string;
    referredUserId: string;
    referralCode: string;
    status: ReferralRelationStatus;
    registeredAt: string | null;
    convertedAt: string | null;
    createdAt: string;
    /** نام دعوت‌شده (یا موبایل ماسک‌شده) — اطلاعات تماس به دعوت‌کننده داده نمی‌شود */
    referredName?: string;
}

export interface ReferralOverview {
    code: string;
    link: string;
    stats: {
        totalReferrals: number;
        successfulReferrals: number;
        pendingAmount: number;
        approvedAmount: number;
        paidAmount: number;
        totalRewards: number;
    };
    tierProgress: ReferralTierProgress | null;
    /** پاداش معتبر ماه‌های دارای داده (YYYY-MM به وقت تهران) در ۱۲ ماه اخیر */
    monthly: Array<{ month: string; amount: number }>;
}

/** پاسخ attribute — ثبت موفق کد دعوت بعد از ثبت‌نام */
export interface ReferralAttributionResult {
    referralId: string;
    campaignName: string;
}
