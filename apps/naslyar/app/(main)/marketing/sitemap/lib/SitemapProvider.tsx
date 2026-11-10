'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useRevisionData } from '@/app/hooks/useRevisionData';
import { createSitemapApi, type SitemapApi } from './sitemap-api';
import { formatNumber } from './format';
import type { SitemapConfig, SitemapConfigPatch } from './sitemap.types';

interface SitemapContextValue {
    api: SitemapApi | null;
    /** تنظیمات یک‌بار در layout خوانده و بین همه تب‌ها مشترک است */
    config: SitemapConfig | null;
    configFailed: boolean;
    reloadConfig: () => void;
    saveConfig: (patch: SitemapConfigPatch, successMessage: string) => Promise<boolean>;
    /** بعد از هر تغییر داده (ذخیره، تولید، حذف…) زیاد می‌شود؛ useSitemapData با آن دوباره می‌خواند */
    revision: number;
    invalidate: () => void;
    regenerating: boolean;
    regenerateAll: () => Promise<void>;
    /** آخرین داده هر fetcher — برگشت به یک تب فوراً داده قبلی را نشان می‌دهد و پشت صحنه تازه می‌کند */
    dataCache: Map<unknown, unknown>;
}

const SitemapContext = createContext<SitemapContextValue | null>(null);

export function SitemapProvider({ children }: { children: ReactNode }) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const api = useMemo(() => (token ? createSitemapApi(baseUrl, token) : null), [baseUrl, token]);

    const [config, setConfig] = useState<SitemapConfig | null>(null);
    const [configFailed, setConfigFailed] = useState(false);
    const [configRequest, setConfigRequest] = useState(0);
    const [revision, setRevision] = useState(0);
    const [regenerating, setRegenerating] = useState(false);
    const [dataCache] = useState(() => new Map<unknown, unknown>());
    const invalidate = useCallback(() => setRevision((r) => r + 1), []);
    const reloadConfig = useCallback(() => setConfigRequest((n) => n + 1), []);

    useEffect(() => {
        if (!api) return;
        let active = true;
        api.getConfig().then(
            (next) => {
                if (!active) return;
                setConfig(next);
                setConfigFailed(false);
            },
            (e) => {
                if (!active) return;
                setConfigFailed(true);
                ErrorToaster(e);
            },
        );
        return () => {
            active = false;
        };
    }, [api, configRequest]);

    const saveConfig = useCallback(
        async (patch: SitemapConfigPatch, successMessage: string) => {
            if (!api) return false;
            try {
                setConfig(await api.updateConfig(patch));
                invalidate();
                SuccessToaster({ message: successMessage });
                return true;
            } catch (e) {
                ErrorToaster(e);
                return false;
            }
        },
        [api, invalidate],
    );

    const regenerateAll = useCallback(async () => {
        if (!api) return;
        try {
            setRegenerating(true);
            const result = await api.regenerateAll();
            if (result.failed?.length) {
                ErrorToaster(new Error(`تولید گروه‌های ${result.failed.map((f) => f.group).join('، ')} ناموفق بود — تاریخچه تولید را ببینید.`));
            } else {
                SuccessToaster({ message: `سایت‌مپ با ${formatNumber(result.fileCount)} فایل و ${formatNumber(result.urlsCount)} URL بازتولید شد.` });
            }
            invalidate();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setRegenerating(false);
        }
    }, [api, invalidate]);

    const value = useMemo<SitemapContextValue>(
        () => ({ api, config, configFailed, reloadConfig, saveConfig, revision, invalidate, regenerating, regenerateAll, dataCache }),
        [api, config, configFailed, reloadConfig, saveConfig, revision, invalidate, regenerating, regenerateAll, dataCache],
    );

    return <SitemapContext.Provider value={value}>{children}</SitemapContext.Provider>;
}

export function useSitemap(): SitemapContextValue {
    const ctx = useContext(SitemapContext);
    if (!ctx) throw new Error('useSitemap must be used inside SitemapProvider (marketing/sitemap/layout.tsx)');
    return ctx;
}

/**
 * داده یک تب (useRevisionData مشترک پنل) + کش بین تب‌ها: برگشت به تب، داده قبلی را فوراً نشان می‌دهد.
 * fetcher باید تابع ثابت (بیرون از کامپوننت یا useCallback) باشد؛ کلید کش هم همان است.
 */
export function useSitemapData<T>(fetcher: (api: SitemapApi) => Promise<T>) {
    const { api, revision, dataCache } = useSitemap();
    const load = useMemo(
        () =>
            api
                ? () =>
                      fetcher(api).then((next) => {
                          dataCache.set(fetcher, next);
                          return next;
                      })
                : null,
        [api, fetcher, dataCache],
    );
    const { data, setData: setState, loading } = useRevisionData<T>(load, revision, () => (dataCache.get(fetcher) as T | undefined) ?? null);

    // تغییر محلی (مثل بستن یک یافته) هم در کش می‌نشیند
    const setData = useCallback(
        (update: (current: T | null) => T | null) =>
            setState((current) => {
                const value = update(current);
                dataCache.set(fetcher, value);
                return value;
            }),
        [dataCache, fetcher, setState],
    );

    return { data, setData, loading };
}

/**
 * پیش‌نویس محلی بخشی از تنظیمات برای فرم‌های تب‌ها: با هر تغییر تنظیمات سرور (ذخیره/بارگذاری)
 * از نو ساخته می‌شود و فقط کلیدهای همان بخش ذخیره می‌شوند. keys باید آرایه ثابت باشد.
 */
export function useConfigDraft<K extends keyof SitemapConfigPatch>(keys: readonly K[]) {
    const { config, saveConfig } = useSitemap();
    const source = useMemo(() => {
        if (!config) return null;
        const picked = {} as Pick<SitemapConfig, K>;
        for (const key of keys) picked[key] = config[key];
        return picked;
    }, [config, keys]);

    const [draft, setDraft] = useState(source);
    const [draftSource, setDraftSource] = useState(source);
    if (source !== draftSource) {
        setDraftSource(source);
        setDraft(source);
    }

    const [saving, setSaving] = useState(false);
    const dirty = !!draft && !!source && JSON.stringify(draft) !== JSON.stringify(source);

    const update = useCallback((patch: Partial<Pick<SitemapConfig, K>>) => {
        setDraft((current) => (current ? { ...current, ...patch } : current));
    }, []);

    const save = useCallback(
        async (successMessage: string) => {
            if (!draft) return;
            setSaving(true);
            await saveConfig(draft, successMessage);
            setSaving(false);
        },
        [draft, saveConfig],
    );

    return { draft, update, dirty, saving, save, reset: () => setDraft(source) };
}
