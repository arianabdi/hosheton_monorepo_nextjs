'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { XCircle } from 'lucide-react';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { MoneySeparator } from '@my-workspace/utils';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from '../PaymentStatus.module.scss';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function PaymentFailedPage() {
    const searchParams = useSearchParams();
    const reason = searchParams.get('reason') || 'verification_failed';
    const invoiceId = searchParams.get('invoiceId') || '';
    const { token } = useAuthStore();
    const { t, i18n } = useTranslation('payment');
    const lang = i18n.language;

    const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null);

    const loadInvoice = useCallback(async () => {
        if (!invoiceId || !token) return;
        try {
            const res = await axios.get(
                `${API_URL}/api/billing/invoices/${invoiceId}/status`,
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                setInvoice(res.data.data);
            }
        } catch {
            /* optional */
        }
    }, [invoiceId, token]);

    useEffect(() => {
        loadInvoice();
    }, [loadInvoice]);

    const reasonKey = `reason_${reason}`;
    const message = t(reasonKey, { defaultValue: reason });
    const statusKey = typeof invoice?.status === 'string' ? invoice.status : '';

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={`${styles.iconWrap} ${styles.failedIcon}`}>
                    <XCircle size={36} />
                </div>

                <h1 className={styles.title}>{t('failed_title')}</h1>
                <p className={styles.subtitle}>{message}</p>

                {(invoice || invoiceId) && (
                    <div className={styles.details}>
                        {statusKey && (
                            <div className={styles.detailRow}>
                                <span>{t('status')}</span>
                                <strong>{t(`status_${statusKey}`, { defaultValue: statusKey })}</strong>
                            </div>
                        )}
                        {invoice?.amount != null && (
                            <div className={styles.detailRow}>
                                <span>{t('amount')}</span>
                                <strong>{formatAppNumber(MoneySeparator(Number(invoice.amount)), lang)}</strong>
                            </div>
                        )}
                        {invoiceId && (
                            <div className={styles.detailRow}>
                                <span>{t('invoice_id')}</span>
                                <strong>{invoiceId}</strong>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.actions}>
                    <Link href="/wallet" className={styles.primaryBtn}>
                        {t('retry')}
                    </Link>
                    <Link href="/projects" className={styles.secondaryBtn}>
                        {t('go_home')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
