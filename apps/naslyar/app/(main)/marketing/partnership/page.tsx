'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from '../automation/Automation.module.scss';
import parentStyles from '../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { loadPartnershipStore } from './partnership-api';
import { TIER_LABELS } from './partnership.types';

export default function PartnershipOverviewPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<Awaited<ReturnType<typeof loadPartnershipStore>> | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setStore(await loadPartnershipStore(baseUrl, token));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const kpi = useMemo(() => {
        if (!store) return null;
        const clicks = store.referralLogs.length;
        const signups = store.partners.reduce((s, p) => s + p.totalSignups, 0);
        const sales = store.partners.reduce((s, p) => s + p.totalSales, 0);
        const commission = store.partners.reduce((s, p) => s + p.totalCommission, 0);
        const conversion = clicks > 0 ? Math.round((signups / clicks) * 100) : 0;
        return { clicks, signups, sales, commission, conversion };
    }, [store]);

    const topPerformers = useMemo(() => {
        if (!store) return [];
        return [...store.partners].sort((a, b) => b.totalCommission - a.totalCommission).slice(0, 5);
    }, [store]);

    if (loading || !kpi) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>سیستم همکاری</h1>
                            <p className={parentStyles.subtitle}>مدیریت بازاریابان، اینفلوئنسرها و پارتنرهای B2B</p>
                        </div>
                        <Link href="/marketing/partnership/partners" className={parentStyles.primaryBtn}>
                            + همکار جدید
                        </Link>
                    </header>
                    <div className={parentStyles.statsBar}>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{kpi.clicks}</div><div className={parentStyles.statLabel}>کلیک ورودی</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{kpi.signups}</div><div className={parentStyles.statLabel}>ثبت‌نام</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{kpi.conversion}%</div><div className={parentStyles.statLabel}>نرخ تبدیل</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{kpi.sales.toLocaleString('fa-IR')}</div><div className={parentStyles.statLabel}>فروش کل</div></div>
                        <div className={parentStyles.statCard}><div className={parentStyles.statValue}>{kpi.commission.toLocaleString('fa-IR')}</div><div className={parentStyles.statLabel}>پورسانت</div></div>
                    </div>
                    <div className={parentStyles.overviewGrid}>
                        <div className={parentStyles.overviewCard}>
                            <h3>برترین همکاران</h3>
                            {topPerformers.length === 0 ? (
                                <p>همکاری ثبت نشده</p>
                            ) : (
                                topPerformers.map((p) => (
                                    <div key={p.id} className={styles.stepItem}>
                                        {p.name} — {TIER_LABELS[p.tier]} — {p.totalCommission.toLocaleString('fa-IR')} تومان
                                    </div>
                                ))
                            )}
                        </div>
                        <div className={parentStyles.overviewCard}>
                            <h3>هشدارهای تخلف ({store?.fraudAlerts.length ?? 0})</h3>
                            {(store?.fraudAlerts ?? []).slice(0, 5).map((a) => (
                                <div key={a.id} className={styles.stepItem}>
                                    <strong>{a.partnerName}</strong>: {a.description}
                                </div>
                            ))}
                            {(store?.fraudAlerts.length ?? 0) === 0 && <p>هشداری ثبت نشده</p>}
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
