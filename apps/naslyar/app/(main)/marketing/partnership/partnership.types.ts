export type PartnerTier = 'bronze' | 'silver' | 'gold';
export type PartnerStatus = 'active' | 'suspended' | 'pending';

export interface Partner {
    id: string;
    name: string;
    email: string;
    phone?: string;
    tier: PartnerTier;
    status: PartnerStatus;
    referralCode: string;
    referralLink: string;
    totalClicks: number;
    totalSignups: number;
    totalSales: number;
    totalCommission: number;
    createdAt: string;
    updatedAt: string;
}

export type PayoutStatus = 'pending' | 'approved' | 'rejected';

export interface PayoutRequest {
    id: string;
    partnerId: string;
    partnerName: string;
    amount: number;
    balance: number;
    payoutMethod: 'sheba' | 'card' | 'crypto';
    payoutDetails: string;
    status: PayoutStatus;
    receiptUrl?: string;
    trackingCode?: string;
    rejectReason?: string;
    createdAt: string;
    updatedAt: string;
}

export type DealType = 'bulk_credit' | 'custom_coupon' | 'cobranding' | 'sponsorship';
export type DealStatus = 'pending' | 'approved' | 'rejected';

export interface DealRequest {
    id: string;
    partnerId: string;
    partnerName: string;
    type: DealType;
    title: string;
    description: string;
    status: DealStatus;
    metadata: Record<string, string | number>;
    rejectReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CommissionRules {
    defaultSaasRate: number;
    defaultB2bRate: number;
    cookieDays: number;
    holdPeriodDays: number;
    customRates: Array<{ partnerId: string; partnerName: string; rate: number }>;
}

export interface ReferralLog {
    id: string;
    partnerId: string;
    partnerName: string;
    ip: string;
    country?: string;
    landingPage: string;
    utmSource?: string;
    utmMedium?: string;
    createdAt: string;
}

export type CommissionState = 'pending' | 'available' | 'cancelled';

export interface CommissionLog {
    id: string;
    partnerId: string;
    partnerName: string;
    orderId: string;
    amount: number;
    commission: number;
    state: CommissionState;
    createdAt: string;
}

export interface FraudAlert {
    id: string;
    partnerId: string;
    partnerName: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: string;
}

export interface PartnershipStore {
    partners: Partner[];
    payouts: PayoutRequest[];
    deals: DealRequest[];
    commissionRules: CommissionRules;
    referralLogs: ReferralLog[];
    commissionLogs: CommissionLog[];
    fraudAlerts: FraudAlert[];
}

export const DEFAULT_COMMISSION_RULES: CommissionRules = {
    defaultSaasRate: 15,
    defaultB2bRate: 10,
    cookieDays: 30,
    holdPeriodDays: 14,
    customRates: [],
};

export const DEFAULT_PARTNERSHIP_STORE: PartnershipStore = {
    partners: [],
    payouts: [],
    deals: [],
    commissionRules: DEFAULT_COMMISSION_RULES,
    referralLogs: [],
    commissionLogs: [],
    fraudAlerts: [],
};

export const TIER_LABELS: Record<PartnerTier, string> = {
    bronze: 'برنزی',
    silver: 'نقره‌ای',
    gold: 'طلایی',
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
    bulk_credit: 'شارژ گروهی',
    custom_coupon: 'کد تخفیف سفارشی',
    cobranding: 'کوبرندینگ',
    sponsorship: 'اسپانسری',
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
    pending: 'در انتظار',
    approved: 'تایید شده',
    rejected: 'رد شده',
};

export const COMMISSION_STATE_LABELS: Record<CommissionState, string> = {
    pending: 'معلق',
    available: 'آزاد',
    cancelled: 'لغوشده',
};
