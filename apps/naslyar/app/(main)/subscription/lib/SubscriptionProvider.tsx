'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { subscriptionApi, type PlanPrice, type SubscriptionFeature, type SubscriptionPlan } from './subscription-api';

interface SubscriptionContextValue {
    /** پلن‌ها، ویژگی‌ها و قیمت‌ها یک‌بار در layout خوانده و بین تب‌ها و فرم‌ها مشترک‌اند */
    plans: SubscriptionPlan[];
    features: SubscriptionFeature[];
    prices: PlanPrice[];
    /** اولین بارگذاری تمام شده (موفق یا ناموفق) */
    loaded: boolean;
    /** بعد از ذخیره در فرم‌ها صدا بزنید تا فهرست‌های مشترک تازه شوند */
    reload: () => void;
    /** آخرین دادهٔ هر تب — برگشت به تب فوراً دادهٔ قبلی را نشان می‌دهد */
    cache: Map<string, unknown>;
    /** با عوض شدن اپ (baseUrl) کش و داده تازه می‌شود */
    appKey: string;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
    const [prices, setPrices] = useState<PlanPrice[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [revision, setRevision] = useState(0);
    const [cache] = useState(() => new Map<string, unknown>());
    const reload = useCallback(() => setRevision((n) => n + 1), []);

    useEffect(() => {
        if (!token) return;
        let active = true;
        Promise.allSettled([subscriptionApi.plans(), subscriptionApi.features(), subscriptionApi.prices()])
            .then(([p, f, pr]) => {
                if (!active) return;
                if (p.status === 'fulfilled') setPlans(p.value || []);
                if (f.status === 'fulfilled') setFeatures(f.value || []);
                if (pr.status === 'fulfilled') setPrices(pr.value || []);
            })
            .finally(() => active && setLoaded(true));
        return () => {
            active = false;
        };
    }, [baseUrl, token, revision]);

    useEffect(() => {
        cache.clear();
    }, [baseUrl, cache]);

    const value = useMemo<SubscriptionContextValue>(
        () => ({ plans, features, prices, loaded, reload, cache, appKey: baseUrl || '' }),
        [plans, features, prices, loaded, reload, cache, baseUrl],
    );

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscriptionModule(): SubscriptionContextValue {
    const ctx = useContext(SubscriptionContext);
    if (!ctx) throw new Error('useSubscriptionModule must be used inside SubscriptionProvider (subscription/layout.tsx)');
    return ctx;
}

/** state یک تب که در کش ماژول هم می‌نشیند (الگوی useCachedState پایش خطا) */
export function useCachedState<T>(key: string, initial: T) {
    const { cache } = useSubscriptionModule();
    const [value, setValue] = useState<T>(() => (cache.has(key) ? (cache.get(key) as T) : initial));
    const update = useCallback(
        (next: T | ((current: T) => T)) =>
            setValue((current) => {
                const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next;
                cache.set(key, resolved);
                return resolved;
            }),
        [cache, key],
    );
    return [value, update, cache.has(key)] as const;
}
