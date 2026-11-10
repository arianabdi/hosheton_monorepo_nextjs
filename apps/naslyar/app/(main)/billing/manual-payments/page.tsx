'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Container, Wrapper, FormCard } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, MoneySeparator, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Billing.module.scss';

type StatusFilter = 'awaiting_review' | 'awaiting_receipt' | 'approved' | 'rejected' | 'all';

interface ManualPaymentItem {
    _id: string;
    invoiceId?: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    amount: number;
    status: string;
    gatewayName?: string;
    gatewaySlug?: string;
    trackingCode?: string;
    receiptUrl?: string;
    createdAt?: string;
    reviewedAt?: string;
}

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'awaiting_review', label: 'در انتظار بررسی' },
    { id: 'awaiting_receipt', label: 'منتظر رسید' },
    { id: 'approved', label: 'تأیید شده' },
    { id: 'rejected', label: 'رد شده' },
    { id: 'all', label: 'همه' },
];

const STATUS_LABEL: Record<string, string> = {
    awaiting_review: 'در انتظار بررسی',
    awaiting_receipt: 'منتظر رسید',
    pending: 'در انتظار',
    approved: 'تأیید شده',
    paid: 'پرداخت‌شده',
    rejected: 'رد شده',
    failed: 'ناموفق',
    canceled: 'لغو شده',
};

export default function ManualPaymentsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [items, setItems] = useState<ManualPaymentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('awaiting_review');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/billing/manual-payments`, {
                headers: { authorization: `Bearer ${token}` },
                params: statusFilter === 'all' ? undefined : { status: statusFilter },
            });
            if (res.data?.statusCode === 200) {
                setItems(res.data.data?.items || res.data.data || []);
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>واریزهای کارت‌به‌کارت</h1>
                            <p className={styles.subtitle}>
                                درخواست‌های شارژ کیف پول با واریز دستی را بررسی کنید. پس از تأیید، موجودی کاربر شارژ می‌شود.
                            </p>
                        </div>
                        <button type="button" className={styles.secondaryBtn} onClick={load}>بروزرسانی</button>
                    </header>

                    <div className={styles.tabs}>
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`${styles.tab} ${statusFilter === tab.id ? styles.tabActive : ''}`}
                                onClick={() => setStatusFilter(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <FormCard>
                        <div className={styles.tableWrapper} style={{ marginTop: 0, border: 'none' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>شناسه</th>
                                        <th>کاربر</th>
                                        <th>مبلغ (تومان)</th>
                                        <th>درگاه</th>
                                        <th>کد پیگیری</th>
                                        <th>وضعیت</th>
                                        <th>تاریخ</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={8}>در حال بارگذاری...</td></tr>
                                    ) : items.length === 0 ? (
                                        <tr><td colSpan={8}>موردی یافت نشد.</td></tr>
                                    ) : items.map((item) => (
                                        <tr key={item._id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {(item.invoiceId || item._id).slice(0, 10)}…
                                            </td>
                                            <td>
                                                <div>{item.userName || item.userEmail || item.userId || '—'}</div>
                                                {item.userEmail && item.userName ? (
                                                    <small style={{ opacity: 0.7 }}>{item.userEmail}</small>
                                                ) : null}
                                            </td>
                                            <td>{toFarsiNumber(MoneySeparator(item.amount))}</td>
                                            <td>{item.gatewayName || item.gatewaySlug || 'کارت‌به‌کارت'}</td>
                                            <td>{item.trackingCode || '—'}</td>
                                            <td>
                                                <span className={
                                                    item.status === 'awaiting_review' || item.status === 'pending'
                                                        ? styles.badgeWaiting
                                                        : item.status === 'approved' || item.status === 'paid'
                                                            ? styles.badgeActive
                                                            : styles.badgeInactive
                                                }>
                                                    {STATUS_LABEL[item.status] || item.status}
                                                </span>
                                            </td>
                                            <td>
                                                {item.createdAt
                                                    ? new Date(item.createdAt).toLocaleString('fa-IR')
                                                    : '—'}
                                            </td>
                                            <td>
                                                <Link
                                                    href={`/billing/manual-payments/${item._id}`}
                                                    className={styles.editLink}
                                                >
                                                    بررسی
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </FormCard>
                </div>
            </Wrapper>
        </Container>
    );
}
