'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { captureReferralCode, getStoredReferralCode, wasAttributionAttempted } from '@/app/lib/referral/capture';
import { attemptReferralAttribution } from '@/app/lib/referral/attribute';

/** حداقل فاصله بین دو تلاش attribution — جلوگیری از فشار روی API در قطعی‌ها */
const RETRY_COOLDOWN_MS = 60_000;
const COMPLETE_PROFILE_PATH = '/complete-profile';

/**
 * نگهبان لینک دعوت در کل اپ — سوار در root layout و روی همه صفحه‌ها زنده:
 *
 * ۱) کپچر: هر مسیری با ?ref= یا ?referral= باز شود کد در localStorage +
 *    sessionStorage + کوکی ذخیره می‌شود (proxy.ts هم سمت سرور کوکی را ست می‌کند).
 *
 * ۲) حفظ در URL: اگر کاربر بدون ?ref= بین صفحه‌ها route کند، همان کد ذخیره‌شده
 *    به query صفحه اضافه می‌شود (router.replace بدون scroll) تا کد دعوت همیشه در
 *    نوار آدرس همه صفحه‌ها دیده شود تا لحظه لاگین. پارامترهای دیگر query حفظ می‌شوند.
 *
 * ۳) اتصال: به محض لاگین/ثبت‌نام یک بار attribute می‌زند؛ خطای موقت (شبکه/۵xx/
 *    نبودن کمپین فعال) کد را نگه می‌دارد و بعداً دوباره تلاش می‌کند، رد قطعی فقط یک بار.
 *
 * سرور تضمین می‌کند اگر کاربر قبلاً با کد دیگری attributed شده باشد پاداش جدیدی
 * صادر نشود (unique روی referredUserId + فیلد invite).
 */
export default function ReferralAttributor() {
    const { t } = useTranslation('marketplace');
    const token = useAuthStore((state) => state.token);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const inFlight = useRef(false);
    const lastAttemptAt = useRef(0);

    /** حذف فوری ref/referral از URL — بعد از اعمال یا رد قطعی کد.
     *  مسیر از window.location خوانده می‌شود تا اگر بین شروع attribute و نتیجه‌اش
     *  صفحه عوض شد، کاربر به صفحه قبلی برگردانده نشود. */
    const stripRefFromUrl = useCallback(() => {
        if (typeof window === 'undefined') return;
        const currentQuery = new URLSearchParams(window.location.search);
        if (!currentQuery.has('ref') && !currentQuery.has('referral')) return;
        currentQuery.delete('ref');
        currentQuery.delete('referral');
        const qs = currentQuery.toString();
        router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }, [router]);

    // ۱) کپچر روی هر تغییر مسیر/کوئری — هر صفحه‌ای می‌تواند نقطه ورود لینک دعوت باشد
    useEffect(() => {
        const captured = captureReferralCode();
        if (captured) {
            SuccessToaster({ message: t('referral_captured_toast') });
        }
    }, [pathname, searchParams, t]);

    // ۲) حفظ ?ref= در URL همه صفحه‌ها تا لحظه لاگین
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const currentQuery = new URLSearchParams(window.location.search);
        const urlCode = (currentQuery.get('ref') || currentQuery.get('referral') || '').trim().toUpperCase();

        if (urlCode) {
            // کد تسویه‌شده/رد‌قطعی نباید در URL بماند (رفرش دوباره کپچرش نکند)
            if (!getStoredReferralCode() && wasAttributionAttempted(urlCode)) {
                currentQuery.delete('ref');
                currentQuery.delete('referral');
                const qs = currentQuery.toString();
                router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
            }
            return;
        }

        const code = getStoredReferralCode();
        if (!code) return;
        currentQuery.set('ref', code);
        const qs = currentQuery.toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }, [pathname, searchParams, router]);

    // ۳) اتصال کد به محض presence توکن (لاگین/ثبت‌نام موفق)
    useEffect(() => {
        // کاربر جدید در «تکمیل پروفایل» کد را می‌بیند/ویرایش می‌کند و همان فرم اتصال را انجام می‌دهد
        // (وگرنه اینجا زودتر از فرم کد ذخیره‌شده را اعمال می‌کرد و ویرایش کاربر بی‌اثر می‌شد)
        if (pathname === COMPLETE_PROFILE_PATH) return;
        if (!token || inFlight.current) return;
        if (Date.now() - lastAttemptAt.current < RETRY_COOLDOWN_MS) return;
        const code = getStoredReferralCode();
        if (!code || wasAttributionAttempted(code)) return;

        inFlight.current = true;
        lastAttemptAt.current = Date.now();
        attemptReferralAttribution(code)
            .then((result) => {
                if (result.outcome === 'applied') {
                    // ثبت‌نام با کد با موفقیت انجام شد — کد از همین لحظه از URL هم پاک می‌شود
                    SuccessToaster({ message: t('referral_applied_toast') });
                    stripRefFromUrl();
                } else if (result.outcome === 'invalid') {
                    notifyError({ message: result.message || t('referral_invalid_toast') });
                    stripRefFromUrl();
                }
                // retry_later — ساکت می‌ماند؛ کد در URL و storage حفظ می‌شود تا دوباره تلاش شود
            })
            .finally(() => {
                inFlight.current = false;
            });
    }, [token, pathname, t, stripRefFromUrl]);

    return null;
}
