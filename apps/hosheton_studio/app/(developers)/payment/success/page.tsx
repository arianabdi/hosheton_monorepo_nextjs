'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { refreshWalletFromApi } from '@/app/zustand/store/walletStore';
import { MoneySeparator } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { usePageLoading } from '@/app/components/PageTransition';
import styles from '../PaymentStatus.module.scss';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const invoiceId = searchParams.get('invoiceId') || '';
    const { token } = useAuthStore();
    const { t, i18n } = useTranslation('payment');
    const lang = i18n.language;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    usePageLoading(loading);

    const loadStatus = useCallback(async () => {
        if (!invoiceId || !token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            try {
                const res = await axios.post(
                    `${API_URL}/api/checkout/confirm`,
                    { invoiceId },
                    { headers: { authorization: `Bearer ${token}` } },
                );
                if (res.data.statusCode === 200) {
                    setData(res.data.data);
                    return;
                }
            } catch {
                /* wallet recharge has no checkout confirm — fall back to invoice status */
            }

            const statusRes = await axios.get(
                `${API_URL}/api/billing/invoices/${invoiceId}/status`,
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (statusRes.data.statusCode === 200) {
                setData(statusRes.data.data);
            }
        } catch (e) {
            notifyError(e);
        } finally {
            setLoading(false);
        }
    }, [invoiceId, token]);

    useEffect(() => {
        loadStatus();
        // The gateway callback may land before/after this page; pull a fresh
        // wallet snapshot so the sidebar/usage views are never stale.
        void refreshWalletFromApi();
    }, [loadStatus]);

    const invoice = (data?.invoice || data) as Record<string, unknown> | undefined;
    const metadata = (invoice?.metadata || {}) as Record<string, unknown>;
    const gatewayDetails = (invoice?.gatewayDetails || {}) as Record<string, unknown>;
    const isPaid = invoice?.status === 'paid';
    const isWallet = metadata.purpose === 'wallet_recharge' || invoice?.type === 'deposit';
    const statusKey = typeof invoice?.status === 'string' ? invoice.status : '';

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>
                    <Loader2 size={32} className={styles.spinner} />
                    {t('loading')}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={`${styles.iconWrap} ${isPaid ? styles.successIcon : styles.pendingIcon}`}>
                    {isPaid ? <CheckCircle2 size={36} /> : <Loader2 size={36} className={styles.spinner} />}
                </div>

                <h1 className={styles.title}>
                    {isPaid ? t('success_title') : t('success_pending_title')}
                </h1>
                <p className={styles.subtitle}>
                    {isPaid
                        ? (isWallet ? t('success_subtitle_wallet') : t('success_subtitle_generic'))
                        : t('success_pending_subtitle')}
                </p>

                {invoice && (
                    <div className={styles.details}>
                        <div className={styles.detailRow}>
                            <span>{t('status')}</span>
                            <strong>{statusKey ? t(`status_${statusKey}`, { defaultValue: statusKey }) : '—'}</strong>
                        </div>
                        {invoice.amount != null && (
                            <div className={styles.detailRow}>
                                <span>{t('amount')}</span>
                                <strong>{formatAppNumber(MoneySeparator(Number(invoice.amount)), lang)}</strong>
                            </div>
                        )}
                        {gatewayDetails.refId != null && (
                            <div className={styles.detailRow}>
                                <span>{t('ref_id')}</span>
                                <strong>{String(gatewayDetails.refId)}</strong>
                            </div>
                        )}
                        {gatewayDetails.gatewayName != null && (
                            <div className={styles.detailRow}>
                                <span>{t('gateway')}</span>
                                <strong>{String(gatewayDetails.gatewayName)}</strong>
                            </div>
                        )}
                        <div className={styles.detailRow}>
                            <span>{t('purpose')}</span>
                            <strong>{isWallet ? t('purpose_wallet') : t('purpose_generic')}</strong>
                        </div>
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
                        {t('go_wallet')}
                    </Link>
                    <Link href="/projects" className={styles.secondaryBtn}>
                        {t('go_home')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
