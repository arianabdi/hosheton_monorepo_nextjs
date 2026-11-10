'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../automation/Automation.module.scss';
import parentStyles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import {
    createPartnershipId,
    loadCommissionLogs,
    loadPartners,
    loadReferralLogs,
    saveCommissionLogs,
    saveReferralLogs,
} from '../partnership-api';
import { COMMISSION_STATE_LABELS } from '../partnership.types';

const TABS = [
    { id: 'referrals', label: 'کلیک‌ها' },
    { id: 'commissions', label: 'پورسانت‌ها' },
    { id: 'traffic', label: 'منابع ترافیک' },
];

export default function TrackingPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('referrals');
    const [loading, setLoading] = useState(true);
    const [referrals, setReferrals] = useState<Awaited<ReturnType<typeof loadReferralLogs>>['value']>([]);
    const [commissions, setCommissions] = useState<Awaited<ReturnType<typeof loadCommissionLogs>>['value']>([]);
    const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [r, c, p] = await Promise.all([
                loadReferralLogs(baseUrl, token),
                loadCommissionLogs(baseUrl, token),
                loadPartners(baseUrl, token),
            ]);
            setReferrals(r.value);
            setCommissions(c.value);
            setPartners(p.value.map((x) => ({ id: x.id, name: x.name })));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const trafficSummary = useMemo(() => {
        const map = new Map<string, number>();
        referrals.forEach((r) => {
            const src = r.utmSource || 'direct';
            map.set(src, (map.get(src) || 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [referrals]);

    const addReferralSample = async () => {
        if (!token || partners.length === 0) return;
        const p = partners[0];
        const now = new Date().toISOString();
        const item = {
            id: createPartnershipId('reflog'),
            partnerId: p.id,
            partnerName: p.name,
            ip: '127.0.0.1',
            country: 'IR',
            landingPage: '/',
            utmSource: 'telegram',
            utmMedium: 'social',
            createdAt: now,
        };
        const next = [item, ...referrals];
        await saveReferralLogs(baseUrl, token, next);
        setReferrals(next);
        SuccessToaster({ message: 'لاگ نمونه اضافه شد' });
    };

    const addCommissionSample = async () => {
        if (!token || partners.length === 0) return;
        const p = partners[0];
        const now = new Date().toISOString();
        const item = {
            id: createPartnershipId('cmlog'),
            partnerId: p.id,
            partnerName: p.name,
            orderId: `ORD-${Date.now()}`,
            amount: 500000,
            commission: 75000,
            state: 'pending' as const,
            createdAt: now,
        };
        const next = [item, ...commissions];
        await saveCommissionLogs(baseUrl, token, next);
        setCommissions(next);
        SuccessToaster({ message: 'پورسانت نمونه اضافه شد' });
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>ردیابی و گزارشات مالی</h1>
                            <p className={parentStyles.subtitle}>کلیک، پورسانت و تحلیل منابع ترافیک</p>
                        </div>
                        <div className={styles.inlineActions}>
                            <button type="button" className={parentStyles.secondaryBtn} onClick={() => void addReferralSample()}>+ کلیک نمونه</button>
                            <button type="button" className={parentStyles.secondaryBtn} onClick={() => void addCommissionSample()}>+ پورسانت نمونه</button>
                        </div>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    {tab === 'referrals' && (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead><tr><th>همکار</th><th>IP</th><th>کشور</th><th>صفحه</th><th>UTM</th><th>زمان</th></tr></thead>
                                <tbody>
                                    {referrals.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center' }}>—</td></tr> : referrals.map((r) => (
                                        <tr key={r.id}><td>{r.partnerName}</td><td dir="ltr">{r.ip}</td><td>{r.country}</td><td>{r.landingPage}</td><td>{r.utmSource}/{r.utmMedium}</td><td>{new Date(r.createdAt).toLocaleString('fa-IR')}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {tab === 'commissions' && (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead><tr><th>همکار</th><th>سفارش</th><th>مبلغ</th><th>پورسانت</th><th>وضعیت</th><th>زمان</th></tr></thead>
                                <tbody>
                                    {commissions.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center' }}>—</td></tr> : commissions.map((c) => (
                                        <tr key={c.id}><td>{c.partnerName}</td><td dir="ltr">{c.orderId}</td><td>{c.amount.toLocaleString('fa-IR')}</td><td>{c.commission.toLocaleString('fa-IR')}</td><td>{COMMISSION_STATE_LABELS[c.state]}</td><td>{new Date(c.createdAt).toLocaleString('fa-IR')}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {tab === 'traffic' && (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead><tr><th>منبع</th><th>کلیک</th></tr></thead>
                                <tbody>
                                    {trafficSummary.length === 0 ? <tr><td colSpan={2} style={{ textAlign: 'center' }}>—</td></tr> : trafficSummary.map(([src, count]) => (
                                        <tr key={src}><td>{src}</td><td>{count}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
