'use client';

import { useEffect, useState } from 'react';
import { ErrorToaster } from '@my-workspace/utils';

/**
 * داده async یک صفحه/تب: با تغییر fetcher یا revision دوباره خوانده می‌شود و پاسخ
 * درخواست کنارگذاشته‌شده نادیده گرفته می‌شود. fetcher باید پایدار باشد (بیرون از کامپوننت
 * یا useCallback/useMemo)؛ null یعنی هنوز آماده نیست (مثلاً توکن نیامده).
 * setState فقط در callback پاسخ است (قاعده react-hooks/set-state-in-effect).
 */
export function useRevisionData<T>(fetcher: (() => Promise<T>) | null, revision = 0, initial?: () => T | null) {
    const [data, setData] = useState<T | null>(() => initial?.() ?? null);
    const [settled, setSettled] = useState<{ fetcher: unknown; revision: number } | null>(null);

    useEffect(() => {
        if (!fetcher) return;
        let active = true;
        fetcher()
            .then((next) => active && setData(next))
            .catch((e) => active && ErrorToaster(e))
            .finally(() => active && setSettled({ fetcher, revision }));
        return () => {
            active = false;
        };
    }, [fetcher, revision]);

    const loading = settled?.fetcher !== fetcher || settled?.revision !== revision;
    return { data, setData, loading };
}
