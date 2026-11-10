'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type SortDir = 'asc' | 'desc';

export interface UrlTableDefaults {
    sort: string;
    dir?: SortDir;
    limit?: number;
    /** فیلترهای اختصاصی جدول با مقدار پیش‌فرض ('' = همه) */
    filters?: Record<string, string>;
    /**
     * query جایگزین وقتی URL هیچ پارامتری ندارد (مثلاً آخرین فیلترهای ذخیره‌شده در sessionStorage)؛
     * از اولین رندر اعمال می‌شود و اولین تغییر کاربر همه را در URL می‌نویسد. '' = بدون جایگزین.
     */
    fallbackQuery?: string;
}

/**
 * state جدول (صفحه، تعداد در صفحه، مرتب‌سازی، جستجو، فیلترها) در URL — لینک قابل اشتراک است،
 * با بازگشت مرورگر و برگشت به تب حفظ می‌شود. چند جدول در یک صفحه با prefix جدا (مثل 'ap_').
 *
 * هر تغییر غیر از صفحه، صفحه را به ۱ برمی‌گرداند. خروجی `query` مستقیم به API داده می‌شود
 * (page، limit، sort، dir، search و فیلترها).
 */
export function useUrlTableState(prefix: string, defaults: UrlTableDefaults, limitOptions: number[] = [10, 25, 50]) {
    const router = useRouter();
    const pathname = usePathname();
    const urlParams = useSearchParams();
    const fallbackQuery = defaults.fallbackQuery || '';
    const params = useMemo(
        () => (urlParams.toString() || !fallbackQuery ? urlParams : new URLSearchParams(fallbackQuery)),
        [urlParams, fallbackQuery],
    );

    // دو تغییر در یک tick (Pagination اول setRowsPerPage بعد paginate(1)) باید روی هم ساخته شوند
    const queryRef = useRef(params.toString());
    useEffect(() => {
        queryRef.current = params.toString();
    }, [params]);

    const key = useCallback((name: string) => `${prefix}${name}`, [prefix]);
    const defaultDir: SortDir = defaults.dir || 'desc';
    const defaultLimit = defaults.limit || limitOptions[0];

    const page = Math.max(1, Number(params.get(key('page'))) || 1);
    const rawLimit = Number(params.get(key('limit')));
    const limit = limitOptions.includes(rawLimit) ? rawLimit : defaultLimit;
    const sort = params.get(key('sort')) || defaults.sort;
    const rawDir = params.get(key('dir'));
    const dir: SortDir = rawDir === 'asc' || rawDir === 'desc' ? rawDir : defaultDir;
    const search = params.get(key('q')) || '';
    const filterDefaults = defaults.filters;
    const filterSignature = Object.keys(filterDefaults || {}).map((name) => `${name}=${params.get(key(name)) ?? ''}`).join('&');
    const filters = useMemo(() => {
        const result: Record<string, string> = {};
        for (const [name, fallback] of Object.entries(filterDefaults || {})) {
            result[name] = params.get(key(name)) ?? fallback;
        }
        return result;
        // filterSignature: فقط با عوض‌شدن مقدار همین فیلترها دوباره ساخته شود
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterSignature, key]);

    const patch = useCallback(
        (changes: Record<string, string | number | null>, resetPage = true) => {
            const next = new URLSearchParams(queryRef.current);
            for (const [name, value] of Object.entries(changes)) {
                if (value === null || value === '') next.delete(key(name));
                else next.set(key(name), String(value));
            }
            if (resetPage && !('page' in changes)) next.delete(key('page'));
            const query = next.toString();
            queryRef.current = query;
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [key, pathname, router],
    );

    const setPage = useCallback((value: number) => patch({ page: value > 1 ? value : null }, false), [patch]);
    const setLimit = useCallback((value: number) => patch({ limit: value === defaultLimit ? null : value }), [patch, defaultLimit]);
    const setSearch = useCallback((value: string) => patch({ q: value.trim() || null }), [patch]);
    const setFilter = useCallback((name: string, value: string) => patch({ [name]: value || null }), [patch]);
    /** کلیک روی ستون فعال جهت را برعکس می‌کند؛ ستون جدید با جهت پیش‌فرض شروع می‌شود */
    const toggleSort = useCallback(
        (field: string, firstDir: SortDir = 'desc') => {
            if (field === sort) patch({ sort: field, dir: dir === 'asc' ? 'desc' : 'asc' });
            else patch({ sort: field, dir: firstDir });
        },
        [dir, patch, sort],
    );
    const reset = useCallback(() => {
        const cleared: Record<string, null> = { q: null, sort: null, dir: null, page: null };
        for (const name of Object.keys(filterDefaults || {})) cleared[name] = null;
        patch(cleared);
    }, [filterDefaults, patch]);

    const query = useMemo(
        () => ({ page, limit, sort, dir, ...(search ? { search } : {}), ...filters }),
        [dir, filters, limit, page, search, sort],
    );
    const filtered = Boolean(search) || Object.entries(filters).some(([name, value]) => value !== (filterDefaults?.[name] ?? ''));

    return {
        page, limit, sort, dir, search, filters, filtered, query, limitOptions,
        setPage, setLimit, setSearch, setFilter, toggleSort, reset,
    };
}

export type UrlTableState = ReturnType<typeof useUrlTableState>;
