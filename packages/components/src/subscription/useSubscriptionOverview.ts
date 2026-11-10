'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SubscriptionOverview } from './types';

export interface UseSubscriptionOverviewOptions {
    /** Base URL of the app's API, e.g. process.env.NEXT_PUBLIC_API_URL (no trailing slash needed) */
    apiBase?: string;
    /** Returns the caller's Bearer token (from whichever auth store the app uses) */
    getToken?: () => string | null | undefined | Promise<string | null | undefined>;
    /** Set false to pause the request (e.g. until the user is authenticated) */
    enabled?: boolean;
}

export interface UseSubscriptionOverviewResult {
    overview: SubscriptionOverview | null;
    loading: boolean;
    error: unknown;
    refresh: () => Promise<void>;
}

function joinUrl(base: string, path: string) {
    return `${(base || '').replace(/\/+$/, '')}${path}`;
}

/**
 * Fetches the signed-in user's current subscription and per-feature usage from
 * the shared subscription library endpoint: GET {apiBase}/api/subscription/subscriptions/me
 *
 * App-agnostic on purpose: every backend app that imports SubscriptionModule
 * serves this route, so any frontend in the workspace can call it the same way.
 */
export function useSubscriptionOverview(options: UseSubscriptionOverviewOptions): UseSubscriptionOverviewResult {
    const { apiBase, getToken, enabled = true } = options;
    const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<unknown>(null);
    const inFlight = useRef(0);
    // keep getToken in a ref so callers can pass inline closures without retriggering the fetch
    const getTokenRef = useRef(getToken);
    getTokenRef.current = getToken;

    const load = useCallback(async () => {
        const token = getTokenRef.current ? await getTokenRef.current() : null;
        if (!apiBase || !token) {
            setOverview(null);
            setLoading(false);
            return;
        }
        const callId = ++inFlight.current;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(joinUrl(apiBase, '/api/subscription/subscriptions/me'), {
                headers: { authorization: `Bearer ${token}` },
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body || (body.statusCode && body.statusCode >= 400)) {
                throw new Error(body?.message || `subscriptions/me failed with ${res.status}`);
            }
            if (inFlight.current !== callId) return; // a newer call superseded this one
            setOverview(body?.data ?? null);
        } catch (e) {
            if (inFlight.current !== callId) return;
            setError(e);
        } finally {
            if (inFlight.current === callId) setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        load();
    }, [enabled, load]);

    return { overview, loading, error, refresh: load };
}
