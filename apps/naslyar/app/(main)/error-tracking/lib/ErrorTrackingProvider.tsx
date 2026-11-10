'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { fetchProjects } from '../error-tracking-api';
import type { EtrProject } from '../error-tracking.types';

interface ErrorTrackingContextValue {
    baseUrl: string;
    token: string | null;
    /** پروژه‌ها یک‌بار در layout خوانده و بین همه تب‌ها مشترک‌اند */
    projects: EtrProject[];
    /** اولین بارگذاری پروژه‌ها تمام شده (موفق یا ناموفق) */
    projectsLoaded: boolean;
    reloadProjects: () => void;
    /** آخرین دادهٔ هر تب — برگشت به تب فوراً دادهٔ قبلی را نشان می‌دهد و پشت صحنه تازه می‌کند */
    cache: Map<string, unknown>;
}

const ErrorTrackingContext = createContext<ErrorTrackingContextValue | null>(null);

export function ErrorTrackingProvider({ children }: { children: ReactNode }) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [projects, setProjects] = useState<EtrProject[]>([]);
    const [projectsLoaded, setProjectsLoaded] = useState(false);
    const [projectsRequest, setProjectsRequest] = useState(0);
    const [cache] = useState(() => new Map<string, unknown>());
    const reloadProjects = useCallback(() => setProjectsRequest((n) => n + 1), []);

    useEffect(() => {
        if (!token) return;
        let active = true;
        fetchProjects(baseUrl, token)
            .then((data) => active && setProjects(data.projects || []))
            .catch(() => null)
            .finally(() => active && setProjectsLoaded(true));
        return () => {
            active = false;
        };
    }, [baseUrl, token, projectsRequest]);

    const value = useMemo<ErrorTrackingContextValue>(
        () => ({ baseUrl, token: token || null, projects, projectsLoaded, reloadProjects, cache }),
        [baseUrl, token, projects, projectsLoaded, reloadProjects, cache],
    );

    return <ErrorTrackingContext.Provider value={value}>{children}</ErrorTrackingContext.Provider>;
}

export function useErrorTracking(): ErrorTrackingContextValue {
    const ctx = useContext(ErrorTrackingContext);
    if (!ctx) throw new Error('useErrorTracking must be used inside ErrorTrackingProvider (error-tracking/layout.tsx)');
    return ctx;
}

/**
 * state یک تب که در کش ماژول هم می‌نشیند: با برگشت به تب، آخرین داده فوراً نمایش داده می‌شود
 * (بدون اسپینر تمام‌صفحه) و درخواست تازه پشت صحنه آن را جایگزین می‌کند. key باید در ماژول یکتا باشد.
 */
export function useCachedState<T>(key: string, initial: T) {
    const { cache } = useErrorTracking();
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
