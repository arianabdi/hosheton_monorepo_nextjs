import { createApiClient, unwrapApiData } from '@/app/(developers)/projects/lib/api-client';
import type {
    ReferralAttributionResult,
    ReferralHistoryItem,
    ReferralOverview,
    ReferralRewardItem,
} from './referral-types';

const BASE = '/api/marketing/referral';

/** کلاینت API سیستم دعوت — کد و لینک، آمار، تاریخچه و پاداش‌ها */
export const referralApi = {
    /** نمای کامل دعوت کاربر: کد، لینک، آمار، پیشرفت سطح و سری ماهانه — مصرف از طریق useMyReferral */
    async getMyReferral(): Promise<ReferralOverview> {
        const res = await createApiClient().get(`${BASE}/me`);
        return unwrapApiData(res);
    },

    async getMyHistory(): Promise<{ items: ReferralHistoryItem[] }> {
        const res = await createApiClient().get(`${BASE}/me/history`);
        return unwrapApiData(res);
    },

    async getMyRewards(): Promise<{ items: ReferralRewardItem[] }> {
        const res = await createApiClient().get(`${BASE}/me/rewards`);
        return unwrapApiData(res);
    },

    /** اتصال کاربر لاگین‌شده به دعوت‌کننده با کد — فقط بعد از ثبت‌نام موفق معتبر می‌ماند */
    async attribute(code: string): Promise<ReferralAttributionResult> {
        const res = await createApiClient().post(`${BASE}/attribute`, { code });
        return unwrapApiData(res);
    },
};
