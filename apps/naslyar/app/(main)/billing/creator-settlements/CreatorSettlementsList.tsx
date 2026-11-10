'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FormCard } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, MoneySeparator, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import styles from '../Billing.module.scss';

type StatusFilter = 'pending' | 'approved' | 'paid' | 'rejected' | 'all';

interface SettlementItem {
    _id: string;
    userId: string;
    amount: number;
    status: string;
    payoutMethod: string;
    payoutDetails: string;
    note: string;
    ticketId: string;
    adminNote: string;
    trackingCode: string;
    createdAt?: string;
    reviewedAt?: string | null;
}

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'pending', label: 'در انتظار بررسی' },
    { id: 'approved', label: 'تأیید شده' },
    { id: 'paid', label: 'پرداخت‌شده' },
    { id: 'rejected', label: 'رد شده' },
    { id: 'all', label: 'همه' },
];

const STATUS_LABEL: Record<string, string> = {
    pending: 'در انتظار بررسی',
    approved: 'تأیید شده',
    paid: 'پرداخت‌شده',
    rejected: 'رد شده',
};

export default function CreatorSettlementsList({ embedded = false }: { embedded?: boolean }) {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [items, setItems] = useState<SettlementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/studio/marketplace/creator-wallet/admin/settlement-requests`, {
                headers: { authorization: `Bearer ${token}` },
                params: statusFilter === 'all' ? undefined : { status: statusFilter },
            });
            if (res.data?.statusCode === 200) {
                setItems(res.data.data?.items || []);
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

    const review = async (item: SettlementItem, action: 'approve' | 'reject' | 'mark_paid') => {
        let trackingCode = '';
        if (action === 'mark_paid') {
            trackingCode = (window.prompt('کد رهگیری واریز (اختیاری):') || '').trim();
        }
        let adminNote = '';
        if (action === 'reject') {
            adminNote = (window.prompt('دلیل رد (برای تیکت creator ثبت می‌شود):') || '').trim();
        }
        try {
            setBusyId(item._id);
            const res = await axios.put(
                `${baseUrl}/api/studio/marketplace/creator-wallet/admin/settlement-requests/${item._id}`,
                { action, adminNote: adminNote || undefined, trackingCode: trackingCode || undefined },
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data?.statusCode === 200) {
                SuccessToaster({ message: 'وضعیت درخواست به‌روزرسانی شد.' });
                await load();
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            {!embedded && (
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.mainTitle}>تسویه کیف پول فروش creators</h1>
                        <p className={styles.subtitle}>
                            درخواست‌های تسویه creatorها از کیف پول فروش محصولات (تومانی). مبلغ درخواست از زمان ثبت تا تسویه از موجودی رزرو می‌شود.
                        </p>
                    </div>
                    <button type="button" className={styles.secondaryBtn} onClick={load}>بروزرسانی</button>
                </header>
            )}

            {embedded && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button type="button" className={styles.secondaryBtn} onClick={load}>بروزرسانی</button>
                </div>
            )}

            <SimpleLineTabs
                tabs={STATUS_TABS}
                activeTab={statusFilter}
                onChange={(id) => setStatusFilter(id as StatusFilter)}
            />

            <FormCard>
                <div className={styles.tableWrapper} style={{ marginTop: 0, border: 'none' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>شناسه</th>
                                <th>کاربر</th>
                                <th>مبلغ (تومان)</th>
                                <th>شبا / کارت</th>
                                <th>وضعیت</th>
                                <th>تاریخ</th>
                                <th>تیکت</th>
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
                                        {item._id.slice(0, 10)}…
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {typeof item.userId === 'string' ? item.userId.slice(0, 12) : '—'}…
                                    </td>
                                    <td>{toFarsiNumber(MoneySeparator(item.amount))}</td>
                                    <td style={{ direction: 'ltr', fontSize: '0.75rem' }}>
                                        {item.payoutMethod === 'card' ? 'کارت' : 'شبا'}: {item.payoutDetails || '—'}
                                    </td>
                                    <td>
                                        <span className={
                                            item.status === 'pending'
                                                ? styles.badgeWaiting
                                                : item.status === 'paid' || item.status === 'approved'
                                                    ? styles.badgeActive
                                                    : styles.badgeInactive
                                        }>
                                            {STATUS_LABEL[item.status] || item.status}
                                        </span>
                                    </td>
                                    <td>
                                        {item.createdAt ? new Date(item.createdAt).toLocaleString('fa-IR') : '—'}
                                    </td>
                                    <td>
                                        {item.ticketId ? (
                                            <Link href={`/support/${item.ticketId}`} className={styles.editLink}>
                                                مشاهده
                                            </Link>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        {(item.status === 'pending' || item.status === 'approved') && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {item.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        className={styles.secondaryBtn}
                                                        disabled={busyId === item._id}
                                                        onClick={() => review(item, 'approve')}
                                                    >
                                                        تأیید
                                                    </button>
                                                )}
                                                {item.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        className={styles.secondaryBtn}
                                                        disabled={busyId === item._id}
                                                        onClick={() => review(item, 'reject')}
                                                    >
                                                        رد
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className={styles.secondaryBtn}
                                                    disabled={busyId === item._id}
                                                    onClick={() => review(item, 'mark_paid')}
                                                >
                                                    پرداخت شد
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </FormCard>
        </div>
    );
}
