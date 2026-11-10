'use client';

import React from 'react';
import styles from './PlanUsagePanel.module.scss';
import {resolvePlanRef, SubscriptionFeatureUsage, SubscriptionOverview} from './types';

export interface PlanUsagePanelLabels {
    loading?: string;
    currentPlan?: string;
    noActiveSubscription?: string;
    viewPlans?: string;
    upgradePlan?: string;
    usageTitle?: string;
    noUsageFeatures?: string;
    enabledLabel?: string;
    disabledLabel?: string;
    /** connector between used and limit, e.g. "of" */
    ofLabel?: string;
    unlimitedLabel?: string;
    trialBadge?: string;
    /** prefix of per-item caps, e.g. "up to" (cap mode: size of one file / members of one project) */
    capLabel?: string;
    /** shown before the refill date of monthly allowances, e.g. "refills on" */
    resetsLabel?: string;
    startsAtLabel?: string;
    endsAtLabel?: string;
    /** status value -> display label */
    statusLabels?: Record<string, string>;
}

export interface PlanUsagePanelProps {
    overview: SubscriptionOverview | null;
    loading?: boolean;
    labels?: PlanUsagePanelLabels;
    /** format an ISO date for display (e.g. jalali conversion in fa apps) */
    formatDate?: (value: string | Date) => string;
    /** localize numbers (e.g. persian digits) */
    formatNumber?: (value: number | string) => string;
    /** render the plan price; defaults to plain number + currency */
    formatPrice?: (price: number, currency?: string) => string;
    /** called by the "upgrade / view plans" actions */
    onUpgrade?: () => void;
    /** hide the usage list and only show the plan card */
    showUsage?: boolean;
    className?: string;
}

const DEFAULT_LABELS: Required<Omit<PlanUsagePanelLabels, 'statusLabels'>> = {
    loading: 'Loading...',
    currentPlan: 'Current plan',
    noActiveSubscription: 'You have no active subscription.',
    viewPlans: 'View plans',
    upgradePlan: 'Upgrade plan',
    usageTitle: 'Usage',
    noUsageFeatures: 'No usage information available for this plan.',
    enabledLabel: 'Enabled',
    disabledLabel: 'Disabled',
    ofLabel: 'of',
    unlimitedLabel: 'Unlimited',
    trialBadge: 'Trial',
    capLabel: 'Up to',
    resetsLabel: 'Refills on',
    startsAtLabel: 'Start',
    endsAtLabel: 'End',
};

function defaultFormatDate(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export function PlanUsagePanel({
    overview,
    loading = false,
    labels,
    formatDate = defaultFormatDate,
    formatNumber = (v) => String(v),
    formatPrice,
    onUpgrade,
    showUsage = true,
    className = '',
}: PlanUsagePanelProps) {
    const renderUsage = (usage: SubscriptionFeatureUsage[], tt: typeof t, fmtNumber: typeof formatNumber) =>
        renderUsageRows(usage, tt, fmtNumber, formatDate);
    const t = { ...DEFAULT_LABELS, ...labels };

    if (loading) {
        return <div className={`${styles.container} ${className}`}>{t.loading}</div>;
    }

    const hasSubscription = !!overview?.hasSubscription && !!overview?.subscription;
    const subscription = overview?.subscription ?? null;
    const plan = resolvePlanRef(subscription?.planId);
    const price = resolvePlanRef(subscription?.planPriceId);
    const usage = overview?.usage ?? [];
    const statusText = subscription?.status
        ? (t.statusLabels?.[subscription.status] ?? subscription.status)
        : '';

    if (!hasSubscription) {
        return (
            <div className={`${styles.container} ${className}`}>
                <div className={styles.emptyCard}>
                    <p>{t.noActiveSubscription}</p>
                    {onUpgrade && (
                        <button type="button" className={styles.primaryBtn} onClick={onUpgrade}>
                            {t.viewPlans}
                        </button>
                    )}
                </div>
                {showUsage && usage.length > 0 && renderUsage(usage, t, formatNumber)}
            </div>
        );
    }

    return (
        <div className={`${styles.container} ${className}`}>
            <section className={styles.planCard} aria-label={t.currentPlan}>
                <div className={styles.planInfo}>
                    <div className={styles.planTitleRow}>
                        <h3 className={styles.planName}>{plan?.name || '—'}</h3>
                        {statusText && (
                            <span className={styles.statusBadge} data-status={subscription?.status}>
                                {statusText}
                            </span>
                        )}
                        {subscription?.isTest && t.trialBadge && (
                            <span className={styles.testBadge}>{t.trialBadge}</span>
                        )}
                    </div>
                    {typeof price?.price === 'number' && (
                        <p className={styles.planPrice}>
                            {formatPrice
                                ? formatPrice(price.price, price.currency)
                                : `${formatNumber(price.price.toLocaleString())} ${price.currency ?? ''}`}
                        </p>
                    )}
                    {(subscription?.startsAt || subscription?.endsAt) && (
                        <p className={styles.planMeta}>
                            {subscription?.startsAt && (
                                <span>
                                    {t.startsAtLabel}: {formatDate(subscription.startsAt)}
                                </span>
                            )}
                            {subscription?.endsAt && (
                                <span>
                                    {t.endsAtLabel}: {formatDate(subscription.endsAt)}
                                </span>
                            )}
                        </p>
                    )}
                </div>
                {onUpgrade && (
                    <div className={styles.planActions}>
                        <button type="button" className={styles.primaryBtn} onClick={onUpgrade}>
                            {t.upgradePlan}
                        </button>
                    </div>
                )}
            </section>

            {showUsage && renderUsage(usage, t, formatNumber)}
        </div>
    );
}

function renderUsageRows(
    usage: SubscriptionFeatureUsage[],
    t: Required<Omit<PlanUsagePanelLabels, 'statusLabels'>> & PlanUsagePanelLabels,
    formatNumber: (value: number | string) => string,
    formatDate: (value: string | Date) => string,
) {
    return (
        <>
            <h4 className={styles.usageTitle}>{t.usageTitle}</h4>
            <div className={styles.usageList}>
                {usage.length === 0 && <p className={styles.noUsage}>{t.noUsageFeatures}</p>}
                {usage.map((item, index) => {
                    const isQuantity = item.type !== 'boolean';
                    const unlimited = !!item.unlimited || item.limit === -1;
                    const isCap = item.mode === 'cap';
                    const limit = typeof item.limit === 'number' && !unlimited ? item.limit : null;
                    const used = item.used ?? 0;
                    const percent =
                        limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                    const warn = limit != null && limit > 0 && percent > 80;

                    return (
                        <div key={item.code || index} className={styles.usageRow}>
                            <div className={styles.usageMeta}>
                                <span className={styles.usageName}>{item.name || item.code}</span>
                                <span className={styles.usageValue}>
                                    {isQuantity && isCap ? (
                                        unlimited ? <strong>{t.unlimitedLabel}</strong> : (
                                            <>
                                                {t.capLabel} <strong>{formatNumber(limit ?? 0)}</strong>
                                                {item.unit ? ` ${item.unit}` : ''}
                                            </>
                                        )
                                    ) : isQuantity ? (
                                        limit != null ? (
                                            <>
                                                <strong>{formatNumber(used)}</strong>
                                                {' '}{t.ofLabel} {formatNumber(limit)}
                                                {item.unit ? ` ${item.unit}` : ''}
                                            </>
                                        ) : (
                                            <>
                                                <strong>{formatNumber(used)}</strong>
                                                {item.unit ? ` ${item.unit}` : ''}
                                                {' · '}{t.unlimitedLabel}
                                            </>
                                        )
                                    ) : (
                                        <strong data-allowed={!!item.allowed}>
                                            {item.allowed ? t.enabledLabel : t.disabledLabel}
                                        </strong>
                                    )}
                                </span>
                            </div>
                            {isQuantity && !isCap && limit != null && item.resetsAt && (
                                <span className={styles.usageReset}>{t.resetsLabel} {formatDate(item.resetsAt)}</span>
                            )}
                            {isQuantity && !isCap && limit != null && (
                                <div
                                    className={styles.progressTrack}
                                    role="progressbar"
                                    aria-valuenow={percent}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                >
                                    <div
                                        className={`${styles.progressFill} ${warn ? styles.warn : ''}`}
                                        style={{ inlineSize: `${percent}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
