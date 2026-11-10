'use client';

import toast from 'react-hot-toast';
import { etr } from '@my-workspace/utils';
import { isAxiosLike, type HoshetonErrorKind } from './hoshetonErrors';
import { getHoshetonErrorView } from './HoshetonError';
import { detectStatusIssue, hasActiveStatusIssue, reportStatusIssue } from './status';
import { isGuestActionBlocked } from '@/app/components/guest/guestAccess';

interface NotifyErrorOptions {
    kind?: HoshetonErrorKind;
    /** پیام زمینه‌ای (ترجمه‌شده) برای خطاهای عمومی */
    fallback?: string;
    /** کانتکست اضافه برای پایش خطا (مثل { projectId }) */
    context?: Record<string, unknown>;
}

/** `{ message: t('...') }` یا رشته = متنی که خود فرانت ساخته (اعتبارسنجی فرم و…) — همان نمایش داده می‌شود */
function trustedNotice(error: unknown): string | null {
    if (typeof error === 'string') return error.trim() || null;
    if (!error || typeof error !== 'object' || error instanceof Error || isAxiosLike(error)) return null;
    const record = error as Record<string, unknown>;
    // بدنهٔ پاسخ API ({ statusCode, message }) متن سرور است، نه متن فرانت
    if ('statusCode' in record) return null;
    return typeof record.message === 'string' && record.message.trim() ? record.message : null;
}

/** `{ message: '' }` — مثلاً getApiErrorMessage برای اقدام مسدود مهمان؛ چیزی برای گفتن نیست */
function isEmptyNotice(error: unknown): boolean {
    if (!error || typeof error !== 'object' || error instanceof Error || isAxiosLike(error)) return false;
    const record = error as Record<string, unknown>;
    return Object.keys(record).length === 1 && record.message === '';
}

/**
 * خطاهایی که سرور هرگز ندیده (خطای زمان اجرای فرانت، قطع شبکه، timeout کلاینت) به پایش خطا می‌روند.
 * خطای HTTP با پاسخ را خود API در errorHelper ثبت کرده است — دوباره فرستاده نمی‌شود.
 */
function reportClientFailure(error: unknown, code: string, context?: Record<string, unknown>): void {
    try {
        if (isAxiosLike(error)) {
            if (error.response) return;
            etr.capture(error, 'warning', { hoshetonCode: code, ...context });
            return;
        }
        if (error instanceof Error && error.name !== 'Error') {
            etr.capture(error, 'error', { hoshetonCode: code, ...context });
        }
    } catch {
        // پایش خطا هرگز نباید خودش خطا ایجاد کند
    }
}

/** پیام یکسان فقط یک toast — تکرار همان پیام، toast قبلی را تازه می‌کند نه اینکه زیرش اضافه شود */
function showErrorToast(message: string): void {
    toast.error(message, { id: `hosheton-error:${message}` });
}

/**
 * جایگزین ErrorToaster در استودیو: toast با پیام هوشتون (هرگز متن خام ارائه‌دهنده) + ثبت خطاهای سمت کلاینت.
 * خطاهای سراسری (قطع اینترنت، سرور در دسترس نیست) toast نمی‌شوند؛ بنر وضعیت (app/lib/errors/status) نشانشان می‌دهد.
 *
 * notifyError(err)                                  // خطای API / exception
 * notifyError(err, { fallback: t('save_error') })   // پیام زمینه‌ای برای خطاهای عمومی
 * notifyError({ message: t('name_required') })      // متن خود فرانت — بدون تغییر
 */
export function notifyError(error: unknown, options: NotifyErrorOptions = {}): void {
    // مهمان کاری نوشتنی خواست: پنجره‌ی ورود باز شده — toast خطا نه
    if (isGuestActionBlocked(error) || isEmptyNotice(error)) return;

    const notice = trustedNotice(error);
    const view = notice ? null : getHoshetonErrorView(error, options);
    const message = notice ?? view!.message;
    const code = view?.code ?? 'message';
    if (view && process.env.NODE_ENV !== 'production') {
        console.error('[hosheton:error]', view.code, error);
    }

    const issue = detectStatusIssue(error);
    if (issue) {
        // بنر همین الان باز است: همه‌ی خطاهای بعدی همان قطعی بی‌صدا
        if (hasActiveStatusIssue()) {
            void reportStatusIssue(issue);
            return;
        }
        // اول چک سرور: اگر واقعاً قطع است بنر، اگر خطای تکی بود همان toast عادی
        void reportStatusIssue(issue).then((shown) => {
            if (shown) return;
            showErrorToast(message);
            reportClientFailure(error, code, options.context);
        });
        return;
    }

    showErrorToast(message);
    if (view) reportClientFailure(error, code, options.context);
}
