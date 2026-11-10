/**
 * تایپ‌های ماژول کد معرف (Referral) — قرارداد با api/marketing/referral/admin
 * (ماژول عمومی core: my-workspace-api/libs/core/src/referral). موتور سمت API هوشتون استودیو اجرا می‌شود.
 */

export type ReferralCampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export type ReferralTriggerType = 'SIGNUP' | 'FIRST_PAYMENT' | 'PAYMENT';
export type ReferralRewardType = 'FIXED_AMOUNT' | 'PERCENTAGE_OF_PAYMENT' | 'PERCENTAGE_OF_FIRST_PAYMENT' | 'PERCENTAGE_OF_PROFIT';
export type ReferralTierMetric = 'SUCCESSFUL_REFERRALS' | 'TOTAL_REFERRAL_REVENUE' | 'TOTAL_REFERRAL_PROFIT';
export type ReferralRewardStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type ReferralRelationStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REJECTED' | 'EXPIRED';
export type RewardReviewAction = 'approve' | 'reject' | 'pay' | 'cancel';

export interface ReferralTier {
    minCount: number;
    maxCount: number | null;
    rewardType: ReferralRewardType;
    rewardValue: number;
}

export interface ReferralRuleForm {
    /** شناسه قانون موجود — قانون بدون _id هنگام ذخیره ساخته می‌شود */
    _id?: string;
    name: string;
    triggerType: ReferralTriggerType;
    rewardType: ReferralRewardType;
    rewardValue: number;
    rewardCap: number;
    minimumTransactionAmount: number;
    tiered: boolean;
    tierMetric: ReferralTierMetric;
    tiers: ReferralTier[];
    priority: number;
    isActive: boolean;
}

export interface ReferralRule extends Required<Pick<ReferralRuleForm, '_id'>>, Omit<ReferralRuleForm, '_id'> {
    campaignId: string;
    createdAt: string;
    updatedAt: string;
}

export interface ReferralCampaign {
    _id: string;
    name: string;
    description: string;
    status: ReferralCampaignStatus;
    startAt: string | null;
    endAt: string | null;
    maxRewardsPerCustomer: number;
    newCustomerOnly: boolean;
    minimumOrderAmount: number;
    reviewPeriodDays: number;
    allowMultipleRewards: boolean;
    ruleCount?: number;
    createdAt: string;
    updatedAt: string;
}

export type ReferralCampaignForm = Omit<ReferralCampaign, '_id' | 'ruleCount' | 'createdAt' | 'updatedAt'>;

export interface ReferralAdminOverview {
    campaignCount: number;
    activeCampaignCount: number;
    totalReferrals: number;
    successfulReferrals: number;
    referralByStatus: Record<string, number>;
    rewardByStatus: Record<string, { total: number; count: number }>;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
}

/** خلاصه کاربر در جدول‌های ادمین (به‌جای شناسه خام) */
export interface AdminUserSummary {
    _id: string;
    fullName: string;
    mobile: string;
}

export interface ReferralAdminReward {
    _id: string;
    referralId: string;
    campaignId: string;
    campaignName: string;
    ruleId: string;
    advocateUserId: string;
    advocate: AdminUserSummary | null;
    eventId: string;
    eventType: string;
    rewardType: ReferralRewardType;
    rewardValue: number;
    baseAmount: number;
    calculatedAmount: number;
    currency: string;
    status: ReferralRewardStatus;
    availableAt: string | null;
    approvedAt: string | null;
    paidAt: string | null;
    rejectionReason: string;
    calculationSnapshot: { tier?: { minCount?: number; maxCount?: number | null } | null; rule?: { name?: string } } & Record<string, unknown>;
    createdAt: string;
}

export interface ReferralAdminReferral {
    _id: string;
    campaignId: string;
    campaignName: string;
    advocateUserId: string;
    referredUserId: string;
    advocate: AdminUserSummary | null;
    referred: AdminUserSummary | null;
    referralCode: string;
    status: ReferralRelationStatus;
    registeredAt: string | null;
    convertedAt: string | null;
    createdAt: string;
}

export interface Paged<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

export interface ReferralAuditLog {
    _id: string;
    actorId: string;
    actorName: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
}

export const CAMPAIGN_STATUS_LABELS: Record<ReferralCampaignStatus, string> = {
    DRAFT: 'پیش‌نویس',
    ACTIVE: 'فعال',
    PAUSED: 'متوقف',
    ENDED: 'پایان‌یافته',
};

export const TRIGGER_LABELS: Record<ReferralTriggerType, string> = {
    SIGNUP: 'ثبت‌نام',
    FIRST_PAYMENT: 'اولین پرداخت',
    PAYMENT: 'هر پرداخت',
};

export const REWARD_TYPE_LABELS: Record<ReferralRewardType, string> = {
    FIXED_AMOUNT: 'مبلغ ثابت',
    PERCENTAGE_OF_PAYMENT: 'درصد از پرداخت',
    PERCENTAGE_OF_FIRST_PAYMENT: 'درصد از اولین پرداخت',
    PERCENTAGE_OF_PROFIT: 'درصد از سود',
};

export const TIER_METRIC_LABELS: Record<ReferralTierMetric, string> = {
    SUCCESSFUL_REFERRALS: 'تعداد دعوت‌های موفق',
    TOTAL_REFERRAL_REVENUE: 'مجموع پرداخت دعوت‌شدگان (تومان)',
    TOTAL_REFERRAL_PROFIT: 'مجموع سود دعوت‌شدگان (تومان)',
};

export const REWARD_STATUS_LABELS: Record<ReferralRewardStatus, string> = {
    PENDING: 'در دوره بررسی',
    APPROVED: 'آماده پرداخت',
    PAID: 'پرداخت‌شده',
    REJECTED: 'ردشده',
    CANCELLED: 'لغوشده',
};

export const REFERRAL_STATUS_LABELS: Record<ReferralRelationStatus, string> = {
    PENDING: 'در انتظار',
    QUALIFIED: 'واجد شرایط',
    REWARDED: 'پاداش گرفته',
    REJECTED: 'ردشده',
    EXPIRED: 'منقضی',
};

export const REVIEW_ACTION_LABELS: Record<RewardReviewAction, string> = {
    approve: 'تأیید پاداش',
    reject: 'رد پاداش',
    pay: 'پرداخت به کیف پول فروش',
    cancel: 'لغو پاداش',
};

export const EMPTY_CAMPAIGN_FORM: ReferralCampaignForm = {
    name: '',
    description: '',
    status: 'DRAFT',
    startAt: null,
    endAt: null,
    maxRewardsPerCustomer: 20,
    newCustomerOnly: true,
    minimumOrderAmount: 0,
    reviewPeriodDays: 7,
    allowMultipleRewards: false,
};

export const EMPTY_RULE_FORM: ReferralRuleForm = {
    name: '',
    triggerType: 'SIGNUP',
    rewardType: 'FIXED_AMOUNT',
    rewardValue: 50000,
    rewardCap: 0,
    minimumTransactionAmount: 0,
    tiered: false,
    tierMetric: 'SUCCESSFUL_REFERRALS',
    tiers: [],
    priority: 10,
    isActive: true,
};
