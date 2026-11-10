'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MdArrowDownward,
    MdArrowUpward,
    MdOutlineAccountBalanceWallet,
    MdOutlineHistory,
    MdOutlineRefresh,
} from 'react-icons/md';
import { SuccessToaster } from '@my-workspace/utils';
import { notifyError } from '@/app/lib/errors';
import { mediaApi } from '../lib/media-api';
import { useWalletStore, refreshWalletFromApi } from '@/app/zustand/store/walletStore';
import type {
    MediaProjectBudgetLog,
    MediaProjectBudgetSummary,
} from '../types/media-api';
import styles from './ProjectBudgetPanel.module.scss';

const usd = (value: number | null | undefined) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

const LOG_TYPE_KEYS: Record<string, string> = {
    allocate: 'budget_log_type_allocate',
    refund: 'budget_log_type_refund',
    consume: 'budget_log_type_consume',
    adjust: 'budget_log_type_adjust',
};

/**
 * Project budget escrow panel (project settings → info).
 * The owner moves money in from their wallet / pulls the remainder back;
 * every project member can watch the escrow state, and only the creator
 * sees the consumption ledger.
 */
export function ProjectBudgetPanel({ projectId }: { projectId: string }) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const wallet = useWalletStore();

    const [summary, setSummary] = useState<MediaProjectBudgetSummary | null>(null);
    const [logs, setLogs] = useState<MediaProjectBudgetLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState<'allocate' | 'refund' | null>(null);

    const load = useCallback(async () => {
        if (!projectId) return;
        try {
            const data = await mediaApi.getProjectBudget(projectId);
            setSummary(data);
            if (data.isOwner) {
                const ledger = await mediaApi.getProjectBudgetLogs(projectId, { limit: 30 });
                setLogs(ledger.logs ?? []);
            }
        } catch {
            // Panel stays collapsed for readers without access
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    const handleAllocate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            notifyError({ message: t('budget_allocate_invalid') });
            return;
        }
        setBusy('allocate');
        try {
            const data = await mediaApi.allocateProjectBudget(projectId, value);
            setSummary(data);
            setAmount('');
            void refreshWalletFromApi();
            const ledger = await mediaApi.getProjectBudgetLogs(projectId, { limit: 30 });
            setLogs(ledger.logs ?? []);
            SuccessToaster({ message: t('budget_allocated_toast') });
        } catch (err) {
            notifyError(err, { fallback: t('budget_allocate_error') });
        } finally {
            setBusy(null);
        }
    };

    const handleRefund = async () => {
        if (busy || !summary) return;
        if (!confirm(t('budget_refund_confirm', { amount: usd(summary.remaining) }))) return;
        setBusy('refund');
        try {
            const data = await mediaApi.refundProjectBudget(projectId);
            setSummary(data);
            void refreshWalletFromApi();
            const ledger = await mediaApi.getProjectBudgetLogs(projectId, { limit: 30 });
            setLogs(ledger.logs ?? []);
            SuccessToaster({ message: t('budget_refunded') });
        } catch (err) {
            notifyError(err, { fallback: t('budget_refund_error') });
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return <p className={styles.loading}>{tc('loading')}</p>;
    }
    if (!summary) return null;

    const isOwner = summary.isOwner;
    const usagePercent = summary.budget > 0
        ? Math.min(100, Math.max(0, (summary.budgetSpent / summary.budget) * 100))
        : 0;

    return (
        <section className={styles.panel}>
            <header className={styles.header}>
                <div className={styles.headerIcon}>
                    <MdOutlineAccountBalanceWallet size={22} />
                </div>
                <div>
                    <h3>{t('budget_panel_title')}</h3>
                    <p>{t(isOwner ? 'budget_panel_lead_owner' : 'budget_panel_lead_member')}</p>
                </div>
                <button type="button" className={styles.refreshBtn} onClick={load} title={tc('refresh')}>
                    <MdOutlineRefresh size={16} />
                </button>
            </header>

            <div className={styles.statGrid}>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>{t('budget_allocated')}</span>
                    <strong className={styles.statValue}>{usd(summary.budget)}</strong>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>{t('budget_spent')}</span>
                    <strong className={`${styles.statValue} ${styles.spent}`}>{usd(summary.budgetSpent)}</strong>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>{t('budget_reserved')}</span>
                    <strong className={styles.statValue}>{usd(summary.budgetReserved)}</strong>
                </div>
                <div className={`${styles.stat} ${styles.remaining}`}>
                    <span className={styles.statLabel}>{t('budget_remaining')}</span>
                    <strong className={styles.statValue}>{usd(summary.remaining)}</strong>
                </div>
            </div>

            {summary.budget > 0 && (
                <div className={styles.usageBar}>
                    <div className={styles.usageFill} style={{ width: `${usagePercent}%` }} />
                </div>
            )}

            {isOwner && (
                <div className={styles.ownerActions}>
                    <form onSubmit={handleAllocate} className={styles.allocateRow}>
                        <div className={styles.amountField}>
                            <input
                                className={styles.amountInput}
                                type="number"
                                min={0}
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={t('budget_allocate_placeholder')}
                            />
                            <span className={styles.walletHint}>
                                {t('budget_wallet_balance')}: <strong>{usd(wallet.availableBalance)}</strong>
                            </span>
                        </div>
                        <button type="submit" className={styles.primaryBtn} disabled={busy !== null}>
                            <MdArrowDownward size={16} />
                            {busy === 'allocate' ? tc('saving') : t('budget_allocate')}
                        </button>
                    </form>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleRefund}
                        disabled={busy !== null || summary.remaining <= 0}
                        title={summary.remaining <= 0 ? t('budget_nothing_to_refund') : undefined}
                    >
                        <MdArrowUpward size={16} />
                        {busy === 'refund' ? tc('saving') : t('budget_refund_remaining')}
                    </button>
                    <p className={styles.fieldHint}>{t('budget_panel_hint')}</p>
                </div>
            )}

            {isOwner && (
                <div className={styles.ledger}>
                    <h4 className={styles.ledgerTitle}>
                        <MdOutlineHistory size={16} />
                        {t('budget_logs_title')}
                    </h4>
                    {logs.length === 0 ? (
                        <p className={styles.empty}>{t('budget_logs_empty')}</p>
                    ) : (
                        <ul className={styles.logList}>
                            {logs.map((log) => {
                                const negative = log.type === 'consume';
                                return (
                                    <li key={log._id} className={styles.logItem}>
                                        <span className={`${styles.badge} ${negative ? styles.badgeConsume : styles.badgeFund}`}>
                                            {t(LOG_TYPE_KEYS[log.type] || 'budget_log_type_adjust')}
                                        </span>
                                        <div className={styles.logBody}>
                                            <span className={styles.logDesc}>
                                                {log.description || t(LOG_TYPE_KEYS[log.type] || 'budget_log_type_adjust')}
                                                {log.nodeId ? ` — ${log.nodeId}` : ''}
                                            </span>
                                            <span className={styles.logMeta}>
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                                                {' · '}
                                                {t('budget_remaining_after')}: {usd(log.remainingAfter)}
                                            </span>
                                        </div>
                                        <strong className={`${styles.logAmount} ${negative ? styles.negative : styles.positive}`}>
                                            {negative ? '−' : '+'}{usd(log.amount)}
                                        </strong>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
}

export default ProjectBudgetPanel;
