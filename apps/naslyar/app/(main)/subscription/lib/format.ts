import { toFarsiNumber } from '@my-workspace/utils';
import { UNLIMITED, type FeatureResetInterval, type FeatureUsageMode, type PlanValue, type SubscriptionFeature } from './subscription-api';

export const PERIOD_LABELS: Record<string, string> = {
    monthly: 'ماهانه',
    bimonthly: 'دو ماهه',
    quarterly: 'سه ماهه',
    semiannually: 'شش ماهه',
    yearly: 'سالانه',
    biyearly: 'دو ساله',
    lifetime: 'مادام‌العمر',
};

export const PERIOD_MONTHS: Record<string, number> = {
    monthly: 1, bimonthly: 2, quarterly: 3, semiannually: 6, yearly: 12, biyearly: 24, lifetime: 1200,
};

export const CURRENCY_LABELS: Record<string, string> = { IRT: 'تومان', USD: 'دلار' };

/** نحوه سنجش — با همان کلمات مستند (subscription/docs) */
export const MODE_LABELS: Record<FeatureUsageMode, { label: string; hint: string }> = {
    switch: { label: 'روشن/خاموش', hint: 'دسترسی به یک بخش: پلن آن را باز یا قفل می‌کند.' },
    counter: { label: 'سقف زنده', hint: 'تعداد چیزهایی که الان وجود دارد (پروژه، کارت، مگابایت فایل). با حذف آزاد می‌شود.' },
    cap: { label: 'سقف هر مورد', hint: 'اندازه یک چیز (اعضای یک پروژه، حجم یک فایل).' },
    consumable: { label: 'سهمیه مصرفی', hint: 'مصرف ثبت می‌شود و در هر دوره از صفر شروع می‌شود (مثلاً پیام دستیار در ماه).' },
};

export const RESET_LABELS: Record<FeatureResetInterval, string> = {
    monthly: 'هر ماه',
    period: 'هر دوره پرداخت',
    never: 'تا پایان اشتراک',
};

export const STATUS_LABELS: Record<string, string> = {
    active: 'فعال',
    trialing: 'آزمایشی',
    expired: 'منقضی',
    canceled: 'لغو شده',
};

export function resolveMode(feature: Pick<SubscriptionFeature, 'type' | 'usageMode'>): FeatureUsageMode {
    if (feature.usageMode) return feature.usageMode;
    return feature.type === 'boolean' ? 'switch' : 'consumable';
}

export const fa = (value: number | string) => toFarsiNumber(String(value));

export function money(value: number, currency = 'IRT') {
    if (!value) return 'رایگان';
    return `${toFarsiNumber(Number(value).toLocaleString('en-US'))} ${CURRENCY_LABELS[currency] || currency}`;
}

/** مقدار یک ویژگی در پلن برای نمایش: «نامحدود»، «✓ باز»، «۵۰ مگابایت»، «— پیش‌فرض» */
export function formatPlanValue(value: PlanValue | undefined, feature: Pick<SubscriptionFeature, 'type' | 'unit'>): string {
    if (value === null || value === undefined) return '—';
    if (feature.type === 'boolean') return value === true || (value as unknown) === 'true' ? 'باز' : 'قفل';
    if (Number(value) === UNLIMITED) return 'نامحدود';
    return `${toFarsiNumber(Number(value).toLocaleString('en-US'))}${feature.unit ? ` ${feature.unit}` : ''}`;
}

/** مگابایت → «۲۰۰ مگابایت» یا «۱۰ گیگابایت» */
export function formatAmount(value: number, unit: string) {
    if (unit === 'مگابایت' && value >= 1024) {
        return `${toFarsiNumber((Math.round((value / 1024) * 10) / 10).toLocaleString('en-US'))} گیگابایت`;
    }
    const rounded = Math.round(value * 100) / 100;
    return `${toFarsiNumber(rounded.toLocaleString('en-US'))}${unit ? ` ${unit}` : ''}`;
}

export function userLabel(user?: { fullName?: string; email?: string; mobile?: string; username?: string; _id?: string } | null) {
    if (!user) return '—';
    return user.fullName || user.email || user.mobile || user.username || user._id || '—';
}
