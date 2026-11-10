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
import { loadPayouts, savePayouts } from '../partnership-api';
import type { PayoutRequest } from '../partnership.types';
import { PAYOUT_STATUS_LABELS } from '../partnership.types';

const TABS = [
    { id: 'pending', label: 'در انتظار' },
    { id: 'approved', label: 'تاریخچه' },
    { id: 'rejected', label: 'ردشده' },
];

export default function PayoutsPage() {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [tab, setTab] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [reviewId, setReviewId] = useState<string | null>(null);
    const [trackingCode, setTrackingCode] = useState('');
    const [rejectReason, setRejectReason] = useState('');

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const { value } = await loadPayouts(baseUrl, token);
            setPayouts(value);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = useMemo(() => payouts.filter((p) => p.status === tab), [payouts, tab]);

    const approve = async (id: string) => {
        if (!token) return;
        const now = new Date().toISOString();
        const next = payouts.map((p) =>
            p.id === id ? { ...p, status: 'approved' as const, trackingCode, updatedAt: now } : p,
        );
        await savePayouts(baseUrl, token, next);
        setPayouts(next);
        setReviewId(null);
        setTrackingCode('');
        SuccessToaster({ message: 'تسویه تایید شد' });
    };

    const reject = async (id: string) => {
        if (!token || !rejectReason.trim()) return;
        const now = new Date().toISOString();
        const next = payouts.map((p) =>
            p.id === id ? { ...p, status: 'rejected' as const, rejectReason, updatedAt: now } : p,
        );
        await savePayouts(baseUrl, token, next);
        setPayouts(next);
        setReviewId(null);
        setRejectReason('');
        SuccessToaster({ message: 'درخواست رد شد' });
    };

    if (loading) return <LoadingState />;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>درخواست‌های تسویه حساب</h1>
                            <p className={parentStyles.subtitle}>بررسی، تایید با فیش/کد پیگیری یا رد با علت</p>
                        </div>
                    </header>
                    <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={setTab} />
                    <div className={styles.tableWrap}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>همکار</th>
                                    <th>مبلغ</th>
                                    <th>موجودی</th>
                                    <th>روش</th>
                                    <th>جزئیات</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', opacity: 0.7 }}>درخواستی نیست</td></tr>
                                ) : (
                                    filtered.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.partnerName}</td>
                                            <td>{p.amount.toLocaleString('fa-IR')}</td>
                                            <td>{p.balance.toLocaleString('fa-IR')}</td>
                                            <td>{p.payoutMethod}</td>
                                            <td dir="ltr">{p.payoutDetails}</td>
                                            <td>{PAYOUT_STATUS_LABELS[p.status]}</td>
                                            <td>
                                                {p.status === 'pending' && (
                                                    <button type="button" className={styles.smallBtn} onClick={() => setReviewId(p.id)}>بررسی</button>
                                                )}
                                                {p.trackingCode && <span dir="ltr"> {p.trackingCode}</span>}
                                                {p.rejectReason && <span> — {p.rejectReason}</span>}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {reviewId && (
                        <div className={styles.modalOverlay} onClick={() => setReviewId(null)}>
                            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                <h2 className={styles.modalTitle}>بررسی تسویه</h2>
                                <div className={parentStyles.field}>
                                    <label>کد پیگیری / فیش</label>
                                    <input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
                                </div>
                                <div className={parentStyles.field}>
                                    <label>علت رد</label>
                                    <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                                </div>
                                <div className={parentStyles.formActions}>
                                    <button type="button" className={parentStyles.primaryBtn} onClick={() => void approve(reviewId)}>تایید</button>
                                    <button type="button" className={parentStyles.deleteBtn} onClick={() => void reject(reviewId)}>رد</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
