'use client';

import { Fragment, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import i18n from '@/app/lib/i18n';
import {
    GENERIC_ERROR_CODES,
    resolveHoshetonError,
    type HoshetonErrorCode,
    type HoshetonErrorKind,
    type ResolvedHoshetonError,
} from './hoshetonErrors';

export interface HoshetonErrorView {
    code: HoshetonErrorCode;
    /** عنوان کوتاه (۲ تا ۴ کلمه) برای هدر کارت/پاپ‌آپ */
    title: string;
    /** یک جمله: چه شد و کاربر چه کند */
    message: string;
    retryable: boolean;
    action?: ResolvedHoshetonError['action'];
    /** توضیح «چرا» برای پنجره «بیشتر بدانید» — برای پیام آزاد API خالی است */
    why: string;
    /** قدم‌های پیشنهادی (هر کدام یک خط) */
    steps: string[];
}

export interface HoshetonErrorOptions {
    kind?: HoshetonErrorKind;
    /** پیام زمینه‌ای صفحه (ترجمه‌شده) برای خطاهای عمومی مثل «ذخیره تنظیمات ناموفق بود» */
    fallback?: string;
}

export function describeHoshetonError(
    resolved: ResolvedHoshetonError,
    t: TFunction,
    fallback?: string,
): HoshetonErrorView {
    const code = resolved.code;
    const useFallback = Boolean(fallback) && GENERIC_ERROR_CODES.has(code);
    const catalogKey = code === 'message' ? 'unknown' : code;
    return {
        code,
        title: t(`${code === 'message' ? 'message' : catalogKey}.title`),
        message: resolved.text || (useFallback ? fallback! : t(`${catalogKey}.message`)),
        retryable: resolved.retryable,
        action: resolved.action,
        why: code === 'message' ? '' : t(`${catalogKey}.why`, { defaultValue: '' }),
        steps: code === 'message'
            ? []
            : String(t(`${catalogKey}.steps`, { defaultValue: '' }))
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
    };
}

/** پیام نهایی خطا خارج از React (toast، getApiErrorMessage) — زبان فعلی i18n */
export function getHoshetonErrorView(error: unknown, options: HoshetonErrorOptions = {}): HoshetonErrorView {
    const t = i18n.getFixedT(null, 'errors');
    return describeHoshetonError(resolveHoshetonError(error, { kind: options.kind }), t, options.fallback);
}

export function getHoshetonErrorMessage(error: unknown, options: HoshetonErrorOptions = {}): string {
    return getHoshetonErrorView(error, options).message;
}

export function useHoshetonError(error: unknown, options: HoshetonErrorOptions = {}): HoshetonErrorView {
    const { t, i18n: instance } = useTranslation('errors');
    const { kind, fallback } = options;
    const lang = instance.language;
    return useMemo(
        () => describeHoshetonError(resolveHoshetonError(error, { kind }), t, fallback),
        // lang: با تغییر زبان دوباره ترجمه شود
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [error, kind, fallback, t, lang],
    );
}

interface HoshetonErrorProps extends HoshetonErrorOptions {
    error: unknown;
    /** فقط قالب کار را می‌سازد؛ ظاهر کاملاً با خود صفحه است */
    children: (view: HoshetonErrorView) => ReactNode;
}

/**
 * نمایش واحد خطا در استودیو — بدون هیچ استایل و DOM اضافه (headless).
 *
 * ```tsx
 * <HoshetonError error={turn.errorMessage} kind="generation">
 *     {(e) => <span className={styles.failedMessage} title={e.title}>{e.message}</span>}
 * </HoshetonError>
 * ```
 */
export function HoshetonError({ error, kind, fallback, children }: HoshetonErrorProps) {
    const view = useHoshetonError(error, { kind, fallback });
    return <Fragment>{children(view)}</Fragment>;
}
