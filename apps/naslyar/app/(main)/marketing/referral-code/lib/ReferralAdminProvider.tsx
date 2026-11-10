'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useRevisionData } from '@/app/hooks/useRevisionData';
import { createReferralAdminApi, type ReferralAdminApi } from './referral-api';

interface ReferralAdminContextValue {
    api: ReferralAdminApi | null;
    /** بعد از هر تغییر (وضعیت کمپین، تصمیم روی پاداش، ذخیره فرم) زیاد می‌شود تا تب‌ها دوباره بخوانند */
    revision: number;
    invalidate: () => void;
}

const ReferralAdminContext = createContext<ReferralAdminContextValue | null>(null);

export function ReferralAdminProvider({ children }: { children: ReactNode }) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const api = useMemo(() => (token ? createReferralAdminApi(baseUrl, token) : null), [baseUrl, token]);
    const [revision, setRevision] = useState(0);
    const invalidate = useCallback(() => setRevision((r) => r + 1), []);
    const value = useMemo(() => ({ api, revision, invalidate }), [api, revision, invalidate]);
    return <ReferralAdminContext.Provider value={value}>{children}</ReferralAdminContext.Provider>;
}

export function useReferralAdmin(): ReferralAdminContextValue {
    const ctx = useContext(ReferralAdminContext);
    if (!ctx) throw new Error('useReferralAdmin must be used inside ReferralAdminProvider (referral-code/layout.tsx)');
    return ctx;
}

/**
 * داده یک تب/فرم؛ بعد از هر invalidate دوباره خوانده می‌شود.
 * fetcher باید پایدار باشد (بیرون از کامپوننت یا useCallback).
 */
export function useReferralData<T>(fetcher: (api: ReferralAdminApi) => Promise<T>) {
    const { api, revision } = useReferralAdmin();
    const load = useMemo(() => (api ? () => fetcher(api) : null), [api, fetcher]);
    return useRevisionData<T>(load, revision);
}
