'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { referralApi } from './referral-api';
import type { ReferralOverview } from './referral-types';

/**
 * نمای دعوت کاربر (api/marketing/referral/me) — یک منبع برای کارت hero، تب فروش و تب دعوت.
 * درخواست‌های هم‌زمان یک درخواست مشترک‌اند و برگشت به صفحه داده قبلی را فوراً نشان می‌دهد
 * و پشت صحنه تازه می‌کند. کش به توکن بسته است تا بعد از خروج/ورود حساب دیگر نشت نکند.
 */
let cached: { token: string; data: ReferralOverview } | null = null;
let inflight: { token: string; promise: Promise<ReferralOverview> } | null = null;

function fetchMyReferral(token: string): Promise<ReferralOverview> {
    if (inflight?.token === token) return inflight.promise;
    const promise = referralApi.getMyReferral().then((data) => {
        cached = { token, data };
        return data;
    });
    inflight = { token, promise };
    void promise.finally(() => {
        if (inflight?.promise === promise) inflight = null;
    }).catch(() => undefined);
    return promise;
}

export function useMyReferral(): { overview: ReferralOverview | null; failed: boolean } {
    const token = useAuthStore((state) => state.token);
    const [overview, setOverview] = useState<ReferralOverview | null>(() =>
        token && cached?.token === token ? cached.data : null,
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!token) return;
        let active = true;
        fetchMyReferral(token).then(
            (data) => {
                if (!active) return;
                setOverview(data);
                setFailed(false);
            },
            () => {
                if (active) setFailed(true);
            },
        );
        return () => {
            active = false;
        };
    }, [token]);

    return { overview: token ? overview : null, failed };
}
