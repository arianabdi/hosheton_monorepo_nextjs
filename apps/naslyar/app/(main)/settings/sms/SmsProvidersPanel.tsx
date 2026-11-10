'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { LoadingState } from '@my-workspace/components';
import { toFarsiNumber } from '@my-workspace/utils';
import listStyles from '../../billing/gateways/GatewaysList.module.scss';
import localStyles from './SmsSettings.module.scss';
import { getSmsProviderDefinition } from './sms-provider.definitions';
import type { SmsGeneralSettingsForm } from './sms-general-settings.definitions';
import { countEnabledAutoEvents } from './sms-general-settings.definitions';

export interface SmsProviderRow {
    _id: string;
    slug: string;
    name: string;
    description?: string;
    providerType: string;
    isActive: boolean;
    order: number;
    config?: Record<string, string>;
}

function templateSummary(config?: Record<string, string>): string {
    const c = config || {};
    if (c.patternCode?.trim()) return `پترن: ${c.patternCode.trim()}`;
    if (c.templateId?.trim()) return `قالب: ${c.templateId.trim()}`;
    if (c.bodyId?.trim()) return `قالب: ${c.bodyId.trim()}`;
    if (c.template?.trim()) return `قالب: ${c.template.trim()}`;
    return 'قالب OTP: در ویرایش پنل تنظیم کنید';
}

interface SmsProvidersPanelProps {
    loading: boolean;
    providers: SmsProviderRow[];
    settings: SmsGeneralSettingsForm;
    onDelete: (id: string, name: string) => void | Promise<void>;
    onOpenGeneralTab: () => void;
}

export default function SmsProvidersPanel({
    loading,
    providers,
    settings,
    onDelete,
    onOpenGeneralTab,
}: SmsProvidersPanelProps) {
    const activeCount = providers.filter(p => p.isActive).length;
    const autoEventsOn = countEnabledAutoEvents(settings);

    const otpPanelLabel = useMemo(() => {
        const slug = settings.activeProviderSlug?.trim();
        if (!slug) {
            const first = providers.filter(p => p.isActive).sort((a, b) => a.order - b.order)[0];
            return first?.name || 'اولین پنل فعال';
        }
        const match = providers.find(p => p.slug === slug);
        return match?.name || slug;
    }, [providers, settings.activeProviderSlug]);

    const defaultOtpSlug = useMemo(() => {
        const slug = settings.activeProviderSlug?.trim();
        if (slug) return slug;
        return providers.filter(p => p.isActive).sort((a, b) => a.order - b.order)[0]?.slug || '';
    }, [providers, settings.activeProviderSlug]);

    return (
        <>
            <div className={localStyles.providersOverview}>
                <div className={localStyles.overviewLead}>
                    <div className={localStyles.overviewIcon} aria-hidden>
                        📨
                    </div>
                    <div>
                        <h2 className={localStyles.overviewTitle}>پنل‌های ارسال شما</h2>
                        <p className={localStyles.overviewText}>
                            هر پنل یک اتصال جدا به سرویس‌دهنده است — OTP، اعلان موجودی و تیکت را از
                            تنظیمات عمومی به پنل مناسب وصل کنید.
                        </p>
                        <button type="button" className={localStyles.overviewLink} onClick={onOpenGeneralTab}>
                            رفتن به تنظیمات عمومی و پنل پیش‌فرض
                        </button>
                    </div>
                </div>
                <div className={localStyles.statGrid}>
                    <div className={localStyles.statCard}>
                        <span className={localStyles.statValue}>
                            {loading ? '…' : toFarsiNumber(String(providers.length))}
                        </span>
                        <span className={localStyles.statLabel}>پنل ثبت‌شده</span>
                    </div>
                    <div className={localStyles.statCard}>
                        <span className={localStyles.statValue}>
                            {loading ? '…' : toFarsiNumber(String(activeCount))}
                        </span>
                        <span className={localStyles.statLabel}>پنل فعال</span>
                    </div>
                    <div className={localStyles.statCard}>
                        <span className={`${localStyles.statValue} ${localStyles.statValueSmall}`}>
                            {loading ? '…' : otpPanelLabel}
                        </span>
                        <span className={localStyles.statLabel}>پنل پیش‌فرض OTP</span>
                    </div>
                </div>
            </div>

            {!loading && providers.length > 0 && autoEventsOn > 0 ? (
                <p className={listStyles.subtitle} style={{ margin: '0 0 1rem', fontSize: '0.82rem' }}>
                    {toFarsiNumber(String(autoEventsOn))} رویداد خودکار در تنظیمات عمومی فعال است.
                </p>
            ) : null}

            <div className={listStyles.gatewayGrid}>
                {loading ? (
                    <div className={listStyles.loadingState}>
                        <LoadingState />
                    </div>
                ) : providers.length === 0 ? (
                    <div className={listStyles.emptyState}>
                        هنوز پنلی ندارید — اولین اتصال پیامک را بسازید.
                        <br />
                        <Link href="/settings/sms/add" className={listStyles.primaryBtn} style={{ marginTop: 12 }}>
                            + پنل پیامک جدید
                        </Link>
                    </div>
                ) : (
                    providers.map(p => {
                        const def = getSmsProviderDefinition(p.providerType);
                        const templateHint = templateSummary(p.config);
                        const isOtpDefault = p.isActive && p.slug === defaultOtpSlug && Boolean(defaultOtpSlug);
                        return (
                            <article key={p._id} className={listStyles.gatewayCard}>
                                <div className={listStyles.gatewayCardHead}>
                                    <div className={listStyles.logoBox}>
                                        <span style={{ fontSize: '1.4rem' }}>📨</span>
                                    </div>
                                    <div className={listStyles.gatewayTitle}>
                                        <h3>{p.name}</h3>
                                        <div className={listStyles.slug}>{p.slug}</div>
                                        <p className={localStyles.providerTypeLine}>{def.label}</p>
                                        {!p.isActive ? (
                                            <span className={localStyles.statusInactive}>غیرفعال</span>
                                        ) : isOtpDefault ? (
                                            <span className={localStyles.providerTypeLine} style={{ opacity: 1 }}>
                                                پیش‌فرض OTP
                                            </span>
                                        ) : null}
                                    </div>
                                    <span className={listStyles.orderBadge}>#{toFarsiNumber(p.order)}</span>
                                </div>
                                <p className={listStyles.desc}>{p.description || '—'}</p>
                                <p className={listStyles.desc} style={{ fontSize: '0.78rem' }}>{templateHint}</p>
                                <div className={listStyles.cardActions}>
                                    <Link href={`/settings/sms/${p._id}`} className={listStyles.editLink}>
                                        ویرایش / قالب
                                    </Link>
                                    <button
                                        type="button"
                                        className={listStyles.removeBtn}
                                        onClick={() => void onDelete(p._id, p.name)}
                                    >
                                        حذف
                                    </button>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </>
    );
}
