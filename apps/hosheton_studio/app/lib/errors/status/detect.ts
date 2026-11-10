import i18n from '@/app/lib/i18n';
import { isAxiosLike, isCleanHoshetonText, resolveHoshetonError } from '../hoshetonErrors';
import type { StatusIssueId } from './issues';

/** درخواستی که خود کد لغوش کرده (unmount، تایپ جدید در جستجو) — مشکل اتصال نیست */
function isCancelled(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const record = error as { code?: string; name?: string; __CANCEL__?: boolean };
    return record.__CANCEL__ === true
        || record.code === 'ERR_CANCELED'
        || record.name === 'CanceledError'
        || record.name === 'AbortError';
}

/** timeout خود کلاینت = درخواست طولانی، نه قطعی کل اپ */
function isClientTimeout(error: { code?: string }): boolean {
    return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
}

function offlineOr(id: StatusIssueId): StatusIssueId {
    return typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : id;
}

/** خطای fetch مرورگر وقتی هیچ پاسخی نیامد */
const FETCH_FAILURE = /failed to fetch|load failed|networkerror when attempting|network request failed/i;

/** پیام کاتالوگ هوشتون که از یک خطای شبکه ساخته شده (کد قدیمی که خطا را اول به متن تبدیل می‌کند) */
function isNetworkCatalogText(text: string): boolean {
    const value = text.trim();
    if (!value) return false;
    return value === String(i18n.getFixedT(null, 'errors')('network.message'));
}

/**
 * آیا این خطا یک «مشکل سراسری» است؟ (بنر به‌جای toast)
 * null = خطای عادی همان درخواست — مثل قبل toast/پیام صفحه.
 */
export function detectStatusIssue(error: unknown): StatusIssueId | null {
    if (error == null || isCancelled(error)) return null;

    if (typeof error === 'string') return isNetworkCatalogText(error) ? offlineOr('network') : null;

    if (isAxiosLike(error)) {
        if (isClientTimeout(error)) return null;
        const response = error.response;
        if (!response) return offlineOr('network');
        const status = response.status ?? 0;
        if (status === 502 || status === 503 || status === 504) {
            // 503 با پیام تمیز خود API (مثل «این مدل موقتاً غیرفعال است») مال همان درخواست است
            const data = response.data as { message?: unknown } | undefined;
            if (status === 503 && typeof data?.message === 'string' && isCleanHoshetonText(data.message)) return null;
            return 'service';
        }
        return null;
    }

    if (error instanceof TypeError && FETCH_FAILURE.test(error.message)) return offlineOr('network');

    // { message: '...' } = متن آماده؛ فقط اگر دقیقاً پیام «اتصال برقرار نشد» باشد
    if (typeof error === 'object' && !(error instanceof Error)) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && !('statusCode' in (error as object))) {
            return isNetworkCatalogText(message) ? offlineOr('network') : null;
        }
    }

    // Error('Connection lost') و مشابه — دسته‌بندی کاتالوگ
    return resolveHoshetonError(error).code === 'network' ? offlineOr('network') : null;
}
