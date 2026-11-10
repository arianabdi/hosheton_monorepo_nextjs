import { isAxiosError } from 'axios';
import { referralApi } from '@/app/(marketplace)/lib/referral-api';
import {
    clearStoredReferralCode,
    markAttributionAttempted,
} from '@/app/lib/referral/capture';

export type AttributionOutcome = 'applied' | 'invalid' | 'retry_later';

export interface AttributionAttemptResult {
    outcome: AttributionOutcome;
    /** پیام فارسی سرور برای نمایش به کاربر */
    message?: string;
}

/**
 * یک بار تلاش برای اتصال کد دعوت به کاربر لاگین‌شده.
 *
 * - applied    → کد اعمال شد؛ کد از همه لایه‌ها پاک می‌شود.
 * - invalid    → رد قطعی سرور (کد نامعتبر، self-referral، قبلاً با کد دیگری
 *                attributed شده، کاربر قدیمی) — دیگر تلاش نمی‌شود.
 * - retry_later→ خطای موقت (شبکه/۵xx یا نبودن کمپین فعال) — کد حفظ می‌شود
 *                تا در همان نشست یا نشست بعد دوباره تلاش شود.
 */
export async function attemptReferralAttribution(code: string): Promise<AttributionAttemptResult> {
    try {
        await referralApi.attribute(code);
        markAttributionAttempted(code);
        clearStoredReferralCode();
        return { outcome: 'applied' };
    } catch (err) {
        const status = isAxiosError(err) ? err.response?.status : undefined;
        const message = isAxiosError(err)
            ? ((err.response?.data as { message?: string } | undefined)?.message || err.message)
            : (err instanceof Error ? err.message : undefined);

        // کمپین فعال نیست — موقت است؛ ادمین ممکن است بعداً کمپین را فعال کند
        if (status === 409 && message && message.includes('کمپین')) {
            return { outcome: 'retry_later', message };
        }
        if (status === 429 || (status && status >= 500) || status === undefined) {
            return { outcome: 'retry_later', message };
        }
        // 400/403/404/409 باقی‌مانده = رد قطعی
        markAttributionAttempted(code);
        clearStoredReferralCode();
        return { outcome: 'invalid', message };
    }
}
