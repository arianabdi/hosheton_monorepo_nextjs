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
import { createPartnershipId, loadDeals, loadPartners, saveDeals } from '../partnership-api';
import type { DealRequest, DealType } from '../partnership.types';
import { DEAL_TYPE_LABELS } from '../partnership.types';

const TABS = [
    { id: 'bulk_credit', label: 'شارژ گروهی' },
    { id: 'custom_coupon', label: 'کد تخفیف' },
    { id: 'cobranding', label: 'کوبرندینگ' },
    { id: 'sponsorship', label: 'اسپانسری' },
];

export default function DealsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState<DealType>('bulk_credit');
    const [loading, setLoading] = useState(true);
    const [deals, setDeals] = useState<DealRequest[]>([]);
    const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [partnerId, setPartnerId] = useState('');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const [d, p] = await Promise.all([loadDeals(baseUrl, token), loadPartners(baseUrl, token)]);
            setDeals(d.value);
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

    const filtered = useMemo(() => deals.filter((d) => d.type === tab), [deals, tab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !title.trim() || !partnerId) return;
        const partner = partners.find((p) => p.id === partnerId);
        const now = new Date().toISOString();
        const item: DealRequest = {
            id: createPartnershipId('deal'),
            partnerId,
            partnerName: partner?.name || '',
            type: tab,
            title,
            description,
            status: 'pending',
            metadata: {},
            createdAt: now,
            updatedAt: now,
        };
        const next = [item, ...deals];
        await saveDeals(baseUrl, token, next);
        setDeals(next);
        setShowForm(false);
        setTitle('');
        setDescription('');
        SuccessToaster({ message: 'درخواست ثبت شد' });
    };

    const updateStatus = async (id: string, status: DealRequest['status'], rejectReason?: string) => {
        if (!token) return;
        const now = new Date().toISOString();
        const next = deals.map((d) => (d.id === id ? { ...d, status, rejectReason, updatedAt: now } : d));
        await saveDeals(baseUrl, token, next);
        setDeals(next);
        SuccessToaster({ message: status === 'approved' ? 'تایید شد' : 'رد شد' });
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>کمپین‌ها و درخواست‌های اختصاصی</h1>
                            <p className={parentStyles.subtitle}>شارژ گروهی، کوپن، کوبرندینگ و اسپانسری</p>
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => setShowForm(true)}>+ درخواست</button>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={(id) => setTab(id as DealType)} />
                    <div className={parentStyles.connectionGrid} style={{ marginTop: '1.25rem' }}>
                        {filtered.length === 0 ? (
                            <div className={parentStyles.emptyState}>درخواستی از نوع {DEAL_TYPE_LABELS[tab]} نیست</div>
                        ) : (
                            filtered.map((d) => (
                                <div key={d.id} className={parentStyles.connectionCard}>
                                    <h3>{d.title}</h3>
                                    <p>{d.partnerName}</p>
                                    <p>{d.description}</p>
                                    <span className={`${parentStyles.badge} ${d.status === 'approved' ? parentStyles.badgeActive : d.status === 'rejected' ? parentStyles.badgeInactive : ''}`}>
                                        {d.status}
                                    </span>
                                    {d.status === 'pending' && (
                                        <div className={styles.inlineActions}>
                                            <button type="button" className={styles.smallBtn} onClick={() => void updateStatus(d.id, 'approved')}>تایید</button>
                                            <button type="button" className={parentStyles.deleteBtn} onClick={() => void updateStatus(d.id, 'rejected', 'رد توسط ادمین')}>رد</button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h2 className={styles.modalTitle}>درخواست {DEAL_TYPE_LABELS[tab]}</h2>
                                <form onSubmit={handleSubmit}>
                                    <div className={parentStyles.field}>
                                        <label>همکار</label>
                                        <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} required>
                                            <option value="">انتخاب</option>
                                            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className={parentStyles.field}><label>عنوان</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                                    <div className={parentStyles.field}><label>توضیح</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                                    <div className={parentStyles.formActions}>
                                        <button type="submit" className={parentStyles.primaryBtn}>ثبت</button>
                                        <button type="button" className={parentStyles.secondaryBtn} onClick={() => setShowForm(false)}>انصراف</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
