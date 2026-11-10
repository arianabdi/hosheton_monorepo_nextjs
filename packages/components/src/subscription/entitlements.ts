'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SubscriptionFeatureUsage } from './types';

/**
 * Codes of the 403 body thrown by the backend entitlement layer
 * (my-workspace-api/libs/core/src/subscription/subscription-errors.ts).
 */
export const SUBSCRIPTION_ERROR_CODES = [
    'SUBSCRIPTION_REQUIRED',
    'SUBSCRIPTION_FEATURE_LOCKED',
    'SUBSCRIPTION_LIMIT_REACHED',
] as const;

export type SubscriptionErrorCode = (typeof SUBSCRIPTION_ERROR_CODES)[number];

export interface SubscriptionDenial {
    code: SubscriptionErrorCode;
    message: string;
    details: {
        feature: string;
        featureName: string;
        unit: string;
        limit: number | boolean | null;
        used?: number;
        requested?: number;
        upgradeUrl: string;
    } | null;
}

/** Reads a subscription denial from an axios/fetch error (or a response body); null for any other error */
export function readSubscriptionDenial(error: unknown): SubscriptionDenial | null {
    const anyError = error as { response?: { data?: any }; code?: string; message?: string; details?: any } | null;
    const body = anyError?.response?.data ?? anyError;
    if (!body || !SUBSCRIPTION_ERROR_CODES.includes(body.code)) return null;
    return { code: body.code, message: String(body.message || ''), details: body.details ?? null };
}

export interface EntitlementsState {
    hasSubscription: boolean;
    /** admins: every check passes on the server */
    bypass: boolean;
    subscription: {
        _id: string;
        status: string;
        startsAt: string;
        endsAt: string;
        isTest: boolean;
        plan: { _id: string; name: string; slug?: string; isDefault?: boolean } | null;
        price: { _id: string; billingPeriod: string; price: number; currency: string } | null;
    } | null;
    entitlements: Record<string, SubscriptionFeatureUsage & { allowed: boolean }>;
}

export interface UseEntitlementsOptions {
    apiBase?: string;
    getToken?: () => string | null | undefined;
    enabled?: boolean;
}

/**
 * Gate UI by plan: GET {apiBase}/api/subscription/entitlements/me →
 *   const { can, entitlement } = useEntitlements(...);
 *   can('sprints')                      // switch on?
 *   entitlement('max_projects')?.remaining
 * Unknown features and admins are allowed (the server decides anyway).
 */
export function useEntitlements({ apiBase, getToken, enabled = true }: UseEntitlementsOptions) {
    const [state, setState] = useState<EntitlementsState | null>(null);
    const [loading, setLoading] = useState(enabled);
    const getTokenRef = useRef(getToken);
    getTokenRef.current = getToken;

    const refresh = useCallback(async () => {
        const token = getTokenRef.current?.();
        if (!apiBase || !token) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiBase.replace(/\/+$/, '')}/api/subscription/entitlements/me`, {
                headers: { authorization: `Bearer ${token}` },
            });
            const body = await res.json().catch(() => null);
            if (res.ok && body?.data) setState(body.data);
        } catch {
            // keep the last state; the server still enforces every limit
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        if (enabled) void refresh();
    }, [enabled, refresh]);

    const entitlement = useCallback((code: string) => state?.entitlements?.[code], [state]);
    const can = useCallback(
        (code: string) => {
            if (!state || state.bypass) return true;
            const row = state.entitlements?.[code];
            return !row || row.allowed !== false;
        },
        [state],
    );

    return { state, loading, refresh, can, entitlement };
}
