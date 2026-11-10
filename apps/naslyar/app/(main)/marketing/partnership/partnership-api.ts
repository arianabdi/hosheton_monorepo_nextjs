import { createId, loadSetting, saveSetting } from '@/app/utils/system-setting-api';
import type {
    CommissionRules,
    DealRequest,
    FraudAlert,
    Partner,
    PartnershipStore,
    PayoutRequest,
    ReferralLog,
    CommissionLog,
} from './partnership.types';
import { DEFAULT_COMMISSION_RULES } from './partnership.types';

const KEYS = {
    partners: 'marketing.partnership.partners',
    payouts: 'marketing.partnership.payouts',
    deals: 'marketing.partnership.deals',
    commissionRules: 'marketing.partnership.commissionRules',
    referralLogs: 'marketing.partnership.trackingLogs.referrals',
    commissionLogs: 'marketing.partnership.trackingLogs.commissions',
    fraudAlerts: 'marketing.partnership.fraudAlerts',
} as const;

const META = {
    group: 'marketing',
    label: 'همکاری و پارتنرشیپ',
    description: 'مدیریت همکاران، پورسانت و تسویه حساب.',
};

function normalizeArray<T>(payload: unknown): T[] {
    return Array.isArray(payload) ? (payload as T[]) : [];
}

function normalizeRules(payload: unknown): CommissionRules {
    if (payload && typeof payload === 'object') {
        return { ...DEFAULT_COMMISSION_RULES, ...(payload as CommissionRules) };
    }
    return { ...DEFAULT_COMMISSION_RULES };
}

export async function loadPartners(baseUrl: string, token: string) {
    return loadSetting<Partner[]>(baseUrl, token, KEYS.partners, META, [], normalizeArray);
}

export async function savePartners(baseUrl: string, token: string, partners: Partner[]) {
    await saveSetting(baseUrl, token, KEYS.partners, partners);
}

export async function loadPayouts(baseUrl: string, token: string) {
    return loadSetting<PayoutRequest[]>(baseUrl, token, KEYS.payouts, META, [], normalizeArray);
}

export async function savePayouts(baseUrl: string, token: string, payouts: PayoutRequest[]) {
    await saveSetting(baseUrl, token, KEYS.payouts, payouts);
}

export async function loadDeals(baseUrl: string, token: string) {
    return loadSetting<DealRequest[]>(baseUrl, token, KEYS.deals, META, [], normalizeArray);
}

export async function saveDeals(baseUrl: string, token: string, deals: DealRequest[]) {
    await saveSetting(baseUrl, token, KEYS.deals, deals);
}

export async function loadCommissionRules(baseUrl: string, token: string) {
    return loadSetting<CommissionRules>(
        baseUrl,
        token,
        KEYS.commissionRules,
        META,
        DEFAULT_COMMISSION_RULES,
        normalizeRules,
    );
}

export async function saveCommissionRules(baseUrl: string, token: string, rules: CommissionRules) {
    await saveSetting(baseUrl, token, KEYS.commissionRules, rules);
}

export async function loadReferralLogs(baseUrl: string, token: string) {
    return loadSetting<ReferralLog[]>(baseUrl, token, KEYS.referralLogs, META, [], normalizeArray);
}

export async function saveReferralLogs(baseUrl: string, token: string, logs: ReferralLog[]) {
    await saveSetting(baseUrl, token, KEYS.referralLogs, logs);
}

export async function loadCommissionLogs(baseUrl: string, token: string) {
    return loadSetting<CommissionLog[]>(baseUrl, token, KEYS.commissionLogs, META, [], normalizeArray);
}

export async function saveCommissionLogs(baseUrl: string, token: string, logs: CommissionLog[]) {
    await saveSetting(baseUrl, token, KEYS.commissionLogs, logs);
}

export async function loadFraudAlerts(baseUrl: string, token: string) {
    return loadSetting<FraudAlert[]>(baseUrl, token, KEYS.fraudAlerts, META, [], normalizeArray);
}

export async function saveFraudAlerts(baseUrl: string, token: string, alerts: FraudAlert[]) {
    await saveSetting(baseUrl, token, KEYS.fraudAlerts, alerts);
}

export async function loadPartnershipStore(baseUrl: string, token: string): Promise<PartnershipStore> {
    const [partners, payouts, deals, commissionRules, referralLogs, commissionLogs, fraudAlerts] =
        await Promise.all([
            loadPartners(baseUrl, token),
            loadPayouts(baseUrl, token),
            loadDeals(baseUrl, token),
            loadCommissionRules(baseUrl, token),
            loadReferralLogs(baseUrl, token),
            loadCommissionLogs(baseUrl, token),
            loadFraudAlerts(baseUrl, token),
        ]);
    return {
        partners: partners.value,
        payouts: payouts.value,
        deals: deals.value,
        commissionRules: commissionRules.value,
        referralLogs: referralLogs.value,
        commissionLogs: commissionLogs.value,
        fraudAlerts: fraudAlerts.value,
    };
}

export { createId as createPartnershipId };
