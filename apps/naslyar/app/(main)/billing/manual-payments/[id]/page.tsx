'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Container, Wrapper, FormCard } from '@/app/(main)/layout';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ErrorToaster, MoneySeparator, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../../Billing.module.scss';

interface ManualPaymentDetail {
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
    note?: string;
    adminNote?: string;
    receiptUrl?: string;
    receiptFileKey?: string;
    bankDetails?: {
        cardNumber?: string;
        sheba?: string;
        accountHolder?: string;
        bankName?: string;
    };
    createdAt?: string;
    reviewedAt?: string;
}

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

export default function ManualPaymentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = String(params?.id || '');
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const [item, setItem] = useState<ManualPaymentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [adminNote, setAdminNote] = useState('');
    const [acting, setActing] = useState(false);

    const load = useCallback(async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const res = await axios.get(`${baseUrl}/api/billing/manual-payments/${id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data?.statusCode === 200) {
                setItem(res.data.data);
                setAdminNote(res.data.data?.adminNote || '');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, id]);

    useEffect(() => {
        load();
    }, [load]);

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!token || !id) return;
        if (action === 'approve' && !confirm('تأیید واریز و شارژ کیف پول کاربر؟')) return;
        if (action === 'reject' && !confirm('رد این درخواست؟')) return;

        try {
            setActing(true);
            await axios.post(
                `${baseUrl}/api/billing/manual-payments/${id}/${action}`,
                { note: adminNote || undefined },
                { headers: { authorization: `Bearer ${token}` } },
            );
            SuccessToaster({
                message: action === 'approve'
                    ? 'واریز تأیید و کیف پول شارژ شد'
                    : 'درخواست رد شد',
            });
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setActing(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <p className={styles.container}>در حال بارگذاری...</p>
                </Wrapper>
            </Container>
        );
    }

    if (!item) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <p>مورد یافت نشد.</p>
                        <Link href="/billing/manual-payments" className={styles.secondaryBtn}>بازگشت</Link>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    const canReview = ['awaiting_review', 'pending'].includes(item.status);
    const receiptSrc = item.receiptUrl || (
        item.receiptFileKey && process.env.NEXT_PUBLIC_S3_ENDPOINT
            ? `${process.env.NEXT_PUBLIC_S3_ENDPOINT}/${item.receiptFileKey}`
            : ''
    );

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <Link href="/billing/manual-payments" className={styles.editLink}>← بازگشت به لیست</Link>
                            <h1 className={styles.mainTitle}>بررسی واریز کارت‌به‌کارت</h1>
                            <p className={styles.subtitle}>
                                وضعیت: {STATUS_LABEL[item.status] || item.status}
                            </p>
                        </div>
                    </header>

                    <div className={styles.detailGrid}>
                        <FormCard>
                            <h3 className={styles.detailTitle}>اطلاعات درخواست</h3>
                            <dl className={styles.detailList}>
                                <div><dt>شناسه</dt><dd style={{ fontFamily: 'monospace' }}>{item.invoiceId || item._id}</dd></div>
                                <div><dt>کاربر</dt><dd>{item.userName || item.userEmail || item.userId || '—'}</dd></div>
                                {item.userEmail ? <div><dt>ایمیل</dt><dd>{item.userEmail}</dd></div> : null}
                                <div><dt>مبلغ</dt><dd>{toFarsiNumber(MoneySeparator(item.amount))} تومان</dd></div>
                                <div><dt>درگاه</dt><dd>{item.gatewayName || item.gatewaySlug || 'کارت‌به‌کارت'}</dd></div>
                                <div><dt>کد پیگیری کاربر</dt><dd>{item.trackingCode || '—'}</dd></div>
                                <div><dt>یادداشت کاربر</dt><dd>{item.note || '—'}</dd></div>
                                <div><dt>تاریخ ثبت</dt><dd>{item.createdAt ? new Date(item.createdAt).toLocaleString('fa-IR') : '—'}</dd></div>
                                {item.reviewedAt ? (
                                    <div><dt>تاریخ بررسی</dt><dd>{new Date(item.reviewedAt).toLocaleString('fa-IR')}</dd></div>
                                ) : null}
                            </dl>

                            {item.bankDetails ? (
                                <div className={styles.helpBox} style={{ marginTop: 16 }}>
                                    <strong>حساب مقصد نمایش‌داده‌شده به کاربر</strong>
                                    <div style={{ marginTop: 8 }}>
                                        {item.bankDetails.bankName && <div>بانک: {item.bankDetails.bankName}</div>}
                                        {item.bankDetails.accountHolder && <div>صاحب حساب: {item.bankDetails.accountHolder}</div>}
                                        {item.bankDetails.cardNumber && <div>کارت: {item.bankDetails.cardNumber}</div>}
                                        {item.bankDetails.sheba && <div>شبا: {item.bankDetails.sheba}</div>}
                                    </div>
                                </div>
                            ) : null}
                        </FormCard>

                        <FormCard>
                            <h3 className={styles.detailTitle}>رسید پرداخت</h3>
                            {receiptSrc ? (
                                <a href={receiptSrc} target="_blank" rel="noreferrer" className={styles.receiptPreview}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={receiptSrc} alt="رسید پرداخت" />
                                </a>
                            ) : (
                                <p className={styles.subtitle}>رسیدی آپلود نشده است.</p>
                            )}

                            {canReview ? (
                                <div className={styles.form} style={{ marginTop: 20 }}>
                                    <div className={styles.field}>
                                        <label>یادداشت ادمین</label>
                                        <textarea
                                            rows={3}
                                            value={adminNote}
                                            onChange={(e) => setAdminNote(e.target.value)}
                                            placeholder="اختیاری — دلیل رد یا توضیح تأیید"
                                        />
                                    </div>
                                    <div className={styles.actionRow}>
                                        <button
                                            type="button"
                                            className={styles.primaryBtn}
                                            disabled={acting}
                                            onClick={() => handleAction('approve')}
                                        >
                                            {acting ? '...' : 'تأیید و شارژ کیف پول'}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.dangerBtn}
                                            disabled={acting}
                                            onClick={() => handleAction('reject')}
                                        >
                                            رد درخواست
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.helpBox} style={{ marginTop: 16 }}>
                                    این درخواست قبلاً بررسی شده است.
                                    {item.adminNote ? <div style={{ marginTop: 8 }}>یادداشت: {item.adminNote}</div> : null}
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        style={{ marginTop: 12 }}
                                        onClick={() => router.push('/billing/manual-payments')}
                                    >
                                        بازگشت به صف
                                    </button>
                                </div>
                            )}
                        </FormCard>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
