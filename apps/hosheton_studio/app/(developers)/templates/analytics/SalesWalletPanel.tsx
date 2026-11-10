'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuWallet, LuX } from 'react-icons/lu';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import type {
    CreatorSalesWalletSnapshot,
    CreatorSettlementRequestItem,
} from '@/app/(marketplace)/lib/types';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import styles from './SalesWalletPanel.module.scss';

const SETTLEMENT_STATUS_KEY: Record<string, string> = {
    pending: 'settlement_status_pending',
    approved: 'settlement_status_approved',
    paid: 'settlement_status_paid',
    rejected: 'settlement_status_rejected',
};

const LEDGER_TYPE_KEY: Record<string, string> = {
    sale: 'ledger_sale',
    settlement_hold: 'ledger_settlement_hold',
    settlement_refund: 'ledger_settlement_refund',
    adjustment: 'ledger_adjustment',
    referral_bonus: 'ledger_referral_bonus',
};

function toman(amount: number, lang: string, unit: string): string {
    return `${formatAppNumber(Math.round(amount || 0), lang)} ${unit}`;
}

export default function SalesWalletPanel({ autoOpenRequest = false }: { autoOpenRequest?: boolean } = {}) {
    const { t, i18n } = useTranslation('marketplace');
    const lang = i18n.language;
    const unit = t('toman');

    const [wallet, setWallet] = useState<CreatorSalesWalletSnapshot | null>(null);
    const [requests, setRequests] = useState<CreatorSettlementRequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    const [amount, setAmount] = useState('');
    const [payoutMethod, setPayoutMethod] = useState<'sheba' | 'card'>('sheba');
    const [payoutDetails, setPayoutDetails] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const [w, r] = await Promise.all([
                marketplaceApi.getSalesWallet(),
                marketplaceApi.listSettlementRequests(),
            ]);
            setWallet(w);
            setRequests(r.items || []);
        } catch {
            // creator wallet is optional for viewers without sales — stay silent
            setWallet(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Deep-link support (e.g. /wallet/creator-settlement?request=1) opens the
    // request form as soon as the wallet snapshot is ready.
    useEffect(() => {
        if (!autoOpenRequest || loading || !wallet || modalOpen) return;
        setAmount(String(Math.max(0, wallet.balance || 0)));
        setModalOpen(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoOpenRequest, loading, wallet]);

    if (loading || !wallet) return null;

    const available = Math.max(0, wallet.balance || 0);
    const canRequest = available >= wallet.minSettlementAmount;

    const openModal = () => {
        setAmount(String(available));
        setPayoutMethod('sheba');
        setPayoutDetails('');
        setNote('');
        setModalOpen(true);
    };

    const submit = async () => {
        const value = Math.round(Number(amount));
        if (!Number.isFinite(value) || value <= 0) {
            notifyError(t('settlement_invalid_amount'));
            return;
        }
        if (!payoutDetails.trim()) {
            notifyError(t('settlement_details_required'));
            return;
        }
        setSubmitting(true);
        try {
            await marketplaceApi.createSettlementRequest({
                amount: value,
                payoutMethod,
                payoutDetails: payoutDetails.trim(),
                note: note.trim() || undefined,
            });
            SuccessToaster(t('settlement_submitted'));
            setModalOpen(false);
            await load();
        } catch (err) {
            notifyError(getApiErrorMessage(err, t('settlement_failed')));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className={styles.wrap}>
            <div className={styles.header}>
                <div className={styles.titleWrap}>
                    <LuWallet size={18} />
                    <h2>{t('sales_wallet_title')}</h2>
                </div>
                <div className={styles.balanceBlock}>
                    <span className={styles.balanceLabel}>{t('sales_wallet_balance')}</span>
                    <span className={styles.balanceValue}>{toman(available, lang, unit)}</span>
                </div>
            </div>

            <div className={styles.statsRow}>
                <span>{t('sales_wallet_total_earned')}: <strong>{toman(wallet.totalEarned, lang, unit)}</strong></span>
                <span>{t('sales_wallet_total_paid')}: <strong>{toman(wallet.totalPaidOut, lang, unit)}</strong></span>
                <span>{t('sales_wallet_pending')}: <strong>{toman(wallet.pendingSettlementAmount, lang, unit)}</strong></span>
                <button
                    type="button"
                    className={styles.requestBtn}
                    disabled={!canRequest}
                    title={canRequest ? undefined : t('settlement_min_note', { amount: formatAppNumber(wallet.minSettlementAmount, lang) })}
                    onClick={openModal}
                >
                    {t('request_settlement')}
                </button>
            </div>

            {wallet.totalEarned <= 0 && requests.length === 0 && (
                <p className={styles.emptyHint}>{t('no_sales_yet')}</p>
            )}

            {requests.length > 0 && (
                <div className={styles.table}>
                    {requests.map((r) => (
                        <div key={r._id} className={styles.requestRow}>
                            <span className={styles.requestAmount}>{toman(r.amount, lang, unit)}</span>
                            <span className={`${styles.statusBadge} ${styles[r.status] || ''}`}>
                                {t(SETTLEMENT_STATUS_KEY[r.status] || 'settlement_status_pending')}
                            </span>
                            <span className={styles.requestDate}>
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString(lang) : '—'}
                            </span>
                            {r.trackingCode && <span className={styles.tracking}>{r.trackingCode}</span>}
                        </div>
                    ))}
                </div>
            )}

            {wallet.recentLedger.length > 0 && (
                <div className={styles.table}>
                    {wallet.recentLedger.map((row) => (
                        <div key={row._id} className={styles.ledgerRow}>
                            <span>{t(LEDGER_TYPE_KEY[row.type] || row.type)}</span>
                            <span className={row.amount >= 0 ? styles.positive : styles.negative}>
                                {row.amount >= 0 ? '+' : ''}{formatAppNumber(row.amount, lang)}
                            </span>
                            <span className={styles.requestDate}>
                                {row.createdAt ? new Date(row.createdAt).toLocaleDateString(lang) : '—'}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div className={styles.modalOverlay} onClick={() => !submitting && setModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{t('request_settlement')}</h3>
                            <button type="button" onClick={() => setModalOpen(false)} aria-label="close">
                                <LuX size={16} />
                            </button>
                        </div>

                        <label className={styles.field}>
                            <span>{t('settlement_amount')}</span>
                            <input
                                type="number"
                                min={wallet.minSettlementAmount}
                                max={available}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            <small>{t('settlement_min_note', { amount: formatAppNumber(wallet.minSettlementAmount, lang) })}</small>
                        </label>

                        <label className={styles.field}>
                            <span>{t('payout_method')}</span>
                            <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as 'sheba' | 'card')}>
                                <option value="sheba">{t('payout_sheba')}</option>
                                <option value="card">{t('payout_card')}</option>
                            </select>
                        </label>

                        <label className={styles.field}>
                            <span>{t('payout_details')}</span>
                            <input
                                type="text"
                                value={payoutDetails}
                                placeholder={payoutMethod === 'sheba' ? 'IR______________________' : '____ ____ ____ ____'}
                                onChange={(e) => setPayoutDetails(e.target.value)}
                            />
                        </label>

                        <label className={styles.field}>
                            <span>{t('settlement_note')}</span>
                            <textarea
                                rows={2}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </label>

                        <p className={styles.ticketNote}>{t('settlement_ticket_note')}</p>

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.primaryBtn} disabled={submitting} onClick={submit}>
                                {t('settlement_submit')}
                            </button>
                            <button type="button" disabled={submitting} onClick={() => setModalOpen(false)}>
                                {t('settlement_cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
