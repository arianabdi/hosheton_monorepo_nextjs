'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { createLoyaltyTransaction, fetchCustomers, fetchLoyaltyTransactions } from '../e-commerce-api';
import { EcCustomer, EcLoyaltyTransaction, LOYALTY_TYPE_LABELS, formatDate } from '../e-commerce.types';

const typeBadge: Record<string, string> = {
    earn: styles.badgeSuccess,
    bonus: styles.badgeInfo,
    refund: styles.badgeInfo,
    spend: styles.badgeWarning,
    expire: styles.badgeDanger,
};

export default function LoyaltyPage() {
    const [transactions, setTransactions] = useState<EcLoyaltyTransaction[]>([]);
    const [customers, setCustomers] = useState<EcCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [customerFilter, setCustomerFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ customerId: '', type: 'earn', points: '', note: '' });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [txRes, customersRes] = await Promise.all([
                fetchLoyaltyTransactions(customerFilter ? { customerId: customerFilter } : undefined) as any,
                fetchCustomers() as any,
            ]);
            setTransactions(txRes?.transactions || []);
            setCustomers(customersRes?.customers || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [customerFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const customerName = (customerId?: string) => {
        const c = customers.find((x) => x._id === customerId);
        return c ? `${c.firstName} ${c.lastName}` : customerId || '—';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createLoyaltyTransaction({
                customerId: form.customerId,
                type: form.type,
                points: Number(form.points) || 0,
                note: form.note,
            });
            SuccessToaster({ message: 'تراکنش امتیاز ثبت شد' });
            setShowForm(false);
            setForm({ customerId: '', type: 'earn', points: '', note: '' });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>امتیاز وفاداری</h1>
                            <p className={styles.subtitle}>دفتر امتیاز مشتریان — کسب، خرج، جایزه و انقضا</p>
                        </div>
                        <button className={styles.primaryBtn} onClick={() => setShowForm(true)}>+ ثبت امتیاز دستی</button>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.loyalty} />

                    <div className={styles.toolbar}>
                        <select className={styles.selectInput} value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
                            <option value="">همه مشتریان</option>
                            {customers.map((c) => (
                                <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : transactions.length === 0 ? (
                        <div className={styles.emptyState}>تراکنش امتیازی ثبت نشده است.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>مشتری</th>
                                        <th>نوع</th>
                                        <th>امتیاز</th>
                                        <th>مانده</th>
                                        <th>توضیح</th>
                                        <th>تاریخ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx) => (
                                        <tr key={tx._id}>
                                            <td style={{ fontWeight: 600 }}>{customerName(tx.customerId)}</td>
                                            <td>
                                                <span className={`${styles.badge} ${typeBadge[tx.type] || styles.badgeMuted}`}>
                                                    {LOYALTY_TYPE_LABELS[tx.type]}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700, color: (tx.points || 0) >= 0 ? '#15803d' : '#dc2626' }}>
                                                {(tx.points || 0) >= 0 ? '+' : ''}{toFarsiNumber(tx.points)}
                                            </td>
                                            <td>{toFarsiNumber(tx.balanceAfter ?? 0)}</td>
                                            <td>{tx.note || '—'}</td>
                                            <td>{formatDate(tx.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showForm && (
                        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h3 className={styles.modalTitle}>ثبت امتیاز دستی</h3>
                                <form onSubmit={handleSubmit}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label>مشتری *</label>
                                            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
                                                <option value="">انتخاب مشتری</option>
                                                {customers.map((c) => (
                                                    <option key={c._id} value={c._id}>{c.firstName} {c.lastName} — {c.mobile}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>نوع تراکنش</label>
                                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                                <option value="earn">کسب امتیاز</option>
                                                <option value="bonus">جایزه</option>
                                                <option value="spend">خرج امتیاز</option>
                                                <option value="expire">انقضا</option>
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label>تعداد امتیاز *</label>
                                            <input dir="ltr" type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} required />
                                        </div>
                                        <div className={styles.field}>
                                            <label>توضیح</label>
                                            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn}>ثبت</button>
                                        <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>انصراف</button>
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
