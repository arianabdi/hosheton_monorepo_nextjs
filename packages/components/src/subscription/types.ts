// Types shared with the backend subscription library
// (my-workspace-api/libs/core/src/subscription — GET /api/subscription/subscriptions/me)

export type SubscriptionFeatureType = 'boolean' | 'quantity' | (string & {});

export interface SubscriptionFeatureUsage {
    code: string;
    name?: string;
    unit?: string;
    type?: SubscriptionFeatureType;
    allowed?: boolean;
    /** number for quantity features, boolean for on/off features */
    limit?: number | boolean;
    used?: number;
    remaining?: number | null;
    /** plan value is unlimited (limit = -1) */
    unlimited?: boolean;
    /** switch | consumable | counter | cap — see subscription docs in the admin panel */
    mode?: 'switch' | 'consumable' | 'counter' | 'cap' | (string & {});
    /** consumable allowances: when usage starts again from zero */
    resetsAt?: string | Date | null;
    group?: { title: string; slug: string } | null;
}

export interface SubscriptionPlanInfo {
    _id?: string;
    name?: string;
    description?: string;
    status?: string;
    isMostPopular?: boolean;
    order?: number;
}

export interface SubscriptionPlanPriceInfo {
    _id?: string;
    billingPeriod?: string;
    price?: number;
    currency?: string;
}

export interface SubscriptionInfo {
    _id?: string;
    status?: string;
    startsAt?: string | Date;
    endsAt?: string | Date;
    isTest?: boolean;
    planId?: SubscriptionPlanInfo | string;
    planPriceId?: SubscriptionPlanPriceInfo | string;
}

export interface SubscriptionOverview {
    hasSubscription: boolean;
    subscription: SubscriptionInfo | null;
    usage: SubscriptionFeatureUsage[];
}

/** Normalizes a possibly-string (unpopulated) ref to its object form. */
export function resolvePlanRef<T>(ref: T | string | undefined): T | undefined {
    return ref && typeof ref === 'object' ? (ref as T) : undefined;
}
