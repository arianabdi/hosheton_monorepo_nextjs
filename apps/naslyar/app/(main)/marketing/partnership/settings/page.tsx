'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from '../../automation/Automation.module.scss';
import parentStyles from '../../Marketing.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { loadCommissionRules, loadPartners, saveCommissionRules } from '../partnership-api';
import type { CommissionRules } from '../partnership.types';
import { DEFAULT_COMMISSION_RULES } from '../partnership.types';

export default function PartnershipSettingsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState<CommissionRules>(DEFAULT_COMMISSION_RULES);
    const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
    const [customPartnerId, setCustomPartnerId] = useState('');
    const [customRate, setCustomRate] = useState(20);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [r, p] = await Promise.all([loadCommissionRules(baseUrl, token), loadPartners(baseUrl, token)]);
            setRules(r.value);
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

    const save = async () => {
        if (!token) return;
        try {
            await saveCommissionRules(baseUrl, token, rules);
            SuccessToaster({ message: 'تنظیمات ذخیره شد' });
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const addCustomRate = () => {
        const p = partners.find((x) => x.id === customPartnerId);
        if (!p) return;
        setRules({
            ...rules,
            customRates: [
                ...rules.customRates.filter((c) => c.partnerId !== customPartnerId),
                { partnerId: customPartnerId, partnerName: p.name, rate: customRate },
            ],
        });
        setCustomPartnerId('');
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>تنظیمات پورسانت و قوانین</h1>
                            <p className={parentStyles.subtitle}>نرخ پیش‌فرض، VIP، کوکی و دوره hold</p>
                        </div>
                    </header>
                    <div className={parentStyles.formCard}>
                        <div className={parentStyles.field}>
                            <label>نرخ SaaS (%)</label>
                            <input type="number" value={rules.defaultSaasRate} onChange={(e) => setRules({ ...rules, defaultSaasRate: Number(e.target.value) })} />
                        </div>
                        <div className={parentStyles.field}>
                            <label>نرخ B2B (%)</label>
                            <input type="number" value={rules.defaultB2bRate} onChange={(e) => setRules({ ...rules, defaultB2bRate: Number(e.target.value) })} />
                        </div>
                        <div className={parentStyles.field}>
                            <label>عمر کوکی (روز)</label>
                            <input type="number" value={rules.cookieDays} onChange={(e) => setRules({ ...rules, cookieDays: Number(e.target.value) })} />
                        </div>
                        <div className={parentStyles.field}>
                            <label>دوره hold (روز)</label>
                            <input type="number" value={rules.holdPeriodDays} onChange={(e) => setRules({ ...rules, holdPeriodDays: Number(e.target.value) })} />
                        </div>
                        <h3 className={parentStyles.formSectionTitle}>نرخ VIP اختصاصی</h3>
                        <div className={styles.inlineActions}>
                            <select value={customPartnerId} onChange={(e) => setCustomPartnerId(e.target.value)}>
                                <option value="">همکار</option>
                                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" value={customRate} onChange={(e) => setCustomRate(Number(e.target.value))} />
                            <button type="button" className={styles.smallBtn} onClick={addCustomRate}>افزودن</button>
                        </div>
                        {rules.customRates.map((c) => (
                            <div key={c.partnerId} className={styles.stepItem}>{c.partnerName}: {c.rate}%</div>
                        ))}
                        <div className={parentStyles.formActions}>
                            <button type="button" className={parentStyles.primaryBtn} onClick={() => void save()}>ذخیره</button>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
