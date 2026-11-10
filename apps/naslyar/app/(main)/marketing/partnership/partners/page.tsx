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
import { createPartnershipId, loadPartners, savePartners } from '../partnership-api';
import type { Partner, PartnerStatus, PartnerTier } from '../partnership.types';
import { TIER_LABELS } from '../partnership.types';

const TABS = [
    { id: 'all', label: 'همه' },
    { id: 'tiers', label: 'سطح‌بندی' },
    { id: 'pending', label: 'درخواست عضویت' },
];

const EMPTY: Omit<Partner, 'id' | 'createdAt' | 'updatedAt' | 'totalClicks' | 'totalSignups' | 'totalSales' | 'totalCommission'> = {
    name: '',
    email: '',
    phone: '',
    tier: 'bronze',
    status: 'pending',
    referralCode: '',
    referralLink: '',
};

export default function PartnersPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { value } = await loadPartners(baseUrl, token);
            setPartners(value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = useMemo(() => {
        let list = partners;
        if (tab === 'pending') list = list.filter((p) => p.status === 'pending');
        if (tab === 'tiers') list = [...list].sort((a, b) => ({ gold: 3, silver: 2, bronze: 1 }[b.tier] - { gold: 3, silver: 2, bronze: 1 }[a.tier]));
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
        }
        return list;
    }, [partners, tab, search]);

    const persist = async (next: Partner[]) => {
        await savePartners(baseUrl, token!, next);
        setPartners(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !form.name.trim()) return;
        try {
            const now = new Date().toISOString();
            const code = form.referralCode || createPartnershipId('ref').slice(-8).toUpperCase();
            if (editId) {
                await persist(partners.map((p) => (p.id === editId ? { ...p, ...form, referralCode: code, updatedAt: now } : p)));
            } else {
                const item: Partner = {
                    ...form,
                    id: createPartnershipId('ptr'),
                    referralCode: code,
                    referralLink: `https://naslyar.io/r/${code}`,
                    totalClicks: 0,
                    totalSignups: 0,
                    totalSales: 0,
                    totalCommission: 0,
                    createdAt: now,
                    updatedAt: now,
                };
                await persist([item, ...partners]);
            }
            SuccessToaster({ message: 'ذخیره شد' });
            setShowForm(false);
            setForm(EMPTY);
            setEditId(null);
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const toggleSuspend = async (p: Partner) => {
        const status: PartnerStatus = p.status === 'suspended' ? 'active' : 'suspended';
        await persist(partners.map((x) => (x.id === p.id ? { ...x, status, updatedAt: new Date().toISOString() } : x)));
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>مدیریت همکاران</h1>
                            <p className={parentStyles.subtitle}>لیست اعضا، سطح‌بندی VIP و درخواست‌های عضویت</p>
                        </div>
                        <button type="button" className={parentStyles.primaryBtn} onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }}>
                            + همکار
                        </button>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    <div className={parentStyles.field} style={{ maxWidth: 320, marginTop: '1rem' }}>
                        <input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>نام</th>
                                    <th>ایمیل</th>
                                    <th>سطح</th>
                                    <th>لینک</th>
                                    <th>فروش</th>
                                    <th>پورسانت</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', opacity: 0.7 }}>همکاری نیست</td></tr>
                                ) : (
                                    filtered.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.name}</td>
                                            <td dir="ltr">{p.email}</td>
                                            <td>{TIER_LABELS[p.tier]}</td>
                                            <td dir="ltr">{p.referralLink}</td>
                                            <td>{p.totalSales.toLocaleString('fa-IR')}</td>
                                            <td>{p.totalCommission.toLocaleString('fa-IR')}</td>
                                            <td>{p.status}</td>
                                            <td>
                                                <div className={styles.inlineActions}>
                                                    <button type="button" className={styles.smallBtn} onClick={() => { setEditId(p.id); setForm({ name: p.name, email: p.email, phone: p.phone, tier: p.tier, status: p.status, referralCode: p.referralCode, referralLink: p.referralLink }); setShowForm(true); }}>ویرایش</button>
                                                    <button type="button" className={styles.smallBtn} onClick={() => void toggleSuspend(p)}>{p.status === 'suspended' ? 'فعال' : 'تعلیق'}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h2 className={styles.modalTitle}>{editId ? 'ویرایش همکار' : 'همکار جدید'}</h2>
                                <form onSubmit={handleSubmit}>
                                    <div className={parentStyles.field}><label>نام</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                                    <div className={parentStyles.field}><label>ایمیل</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></div>
                                    <div className={parentStyles.field}><label>سطح</label>
                                        <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as PartnerTier })}>
                                            {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div className={parentStyles.field}><label>وضعیت</label>
                                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PartnerStatus })}>
                                            <option value="pending">در انتظار</option>
                                            <option value="active">فعال</option>
                                            <option value="suspended">تعلیق</option>
                                        </select>
                                    </div>
                                    <div className={parentStyles.formActions}>
                                        <button type="submit" className={parentStyles.primaryBtn}>ذخیره</button>
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
