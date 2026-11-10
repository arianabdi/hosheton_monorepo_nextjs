'use client';

import React from 'react';
import Link from 'next/link';
import { LuLayoutDashboard, LuBuilding2 } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, MoneySeparator, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { accountingApi, AccountingVoucher } from './accounting-api';
import { VOUCHER_STATUS_LABELS, AccountingVoucherStatus } from './accounting.utils';
import { AccountingContextBar, useAccountingContext } from './components/useAccountingContext';
import HelpIcon from './components/HelpIcon';
import AccountingGuide from './components/AccountingGuide';
import { ACCOUNTING_GUIDES } from './components/guides';
import styles from './Accounting.module.scss';

const STATUS_BADGE: Record<string, string> = {
    draft: styles.badgeDraft,
    posted: styles.badgePosted,
    reversed: styles.badgeReversed,
};

const BALANCE_CLASS: Record<string, string> = {
    asset: styles.statAsset,
    liability: styles.statLiability,
    equity: styles.statEquity,
    income: styles.statIncome,
    expense: styles.statExpense,
};

export default function AccountingDashboardPage() {
    const context = useAccountingContext();
    const { company, fiscalYear } = context;
    const [loading, setLoading] = React.useState(false);
    const [balances, setBalances] = React.useState<Record<string, number>>({});
    const [balanceLabels, setBalanceLabels] = React.useState<Record<string, string>>({});
    const [voucherStats, setVoucherStats] = React.useState<Record<string, number>>({});
    const [recentVouchers, setRecentVouchers] = React.useState<AccountingVoucher[]>([]);

    const load = React.useCallback(async () => {
        if (!company?._id) return;
        try {
            setLoading(true);
            const result = await accountingApi.dashboardReport({
                companyId: company._id,
                fiscalYearId: fiscalYear?._id,
            });
            setBalances(result.balances || {});
            setBalanceLabels(result.balanceLabels || {});
            setVoucherStats(result.voucherStats || {});
            setRecentVouchers(result.recentVouchers || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [company?._id, fiscalYear?._id]);

    React.useEffect(() => {
        load();
    }, [load]);

    const balanceKeys = ['asset', 'liability', 'equity', 'income', 'expense'];

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>داشبورد حسابداری</h1>
                                <HelpIcon topic="dashboard" />
                            </div>
                            <p className={styles.subtitle}>
                                نمای کلی وضعیت مالی شرکت فعال — مانده گروه‌های حساب، وضعیت اسناد و آخرین ثبت‌ها.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <HelpIcon topic="overview" title="راهنمای کلی سیستم" />
                            <Link href="/accounting/vouchers/new" className={styles.primaryBtn}>
                                سند جدید
                            </Link>
                            <button type="button" className={styles.secondaryBtn} onClick={load} disabled={loading}>
                                بروزرسانی
                            </button>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.dashboard} />

                    <AccountingContextBar context={context} />

                    {!company ? (
                        context.loading ? (
                            <LoadingState />
                        ) : (
                            <TableEmptyState
                                icon={<LuBuilding2 size={28} />}
                                title="هنوز شرکتی نساخته‌اید"
                                description="برای شروع کار با سیستم حسابداری، ابتدا شرکت خود را بسازید. کدینگ حساب‌ها و سال مالی به‌صورت خودکار ایجاد می‌شود."
                                primaryLabel="ساخت اولین شرکت"
                                primaryHref="/accounting/companies"
                            />
                        )
                    ) : loading ? (
                        <LoadingState />
                    ) : (
                        <>
                            <div className={styles.statsGrid}>
                                {balanceKeys.map((key) => (
                                    <div key={key} className={`${styles.statCard} ${BALANCE_CLASS[key] || ''}`}>
                                        <strong>{toFarsiNumber(MoneySeparator(Number(balances[key]) || 0))}</strong>
                                        <span>
                                            مانده {balanceLabels[key] || key} (ریال)
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.statsGrid}>
                                {(['draft', 'posted', 'reversed'] as AccountingVoucherStatus[]).map((status) => (
                                    <div key={status} className={styles.statCard}>
                                        <strong>{toFarsiNumber(voucherStats[status] || 0)}</strong>
                                        <span>سند {VOUCHER_STATUS_LABELS[status]}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.titleRow} style={{ marginTop: '1.5rem' }}>
                                <h2 className={styles.mainTitle} style={{ fontSize: '1.15rem' }}>آخرین اسناد</h2>
                                <Link href="/accounting/vouchers" className={styles.linkBtn}>
                                    مشاهده همه اسناد
                                </Link>
                            </div>

                            {recentVouchers.length === 0 ? (
                                <TableEmptyState
                                    icon={<LuLayoutDashboard size={28} />}
                                    title="هنوز سندي ثبت نشده"
                                    description="اولین سند حسابداری خود را ثبت کنید تا گزارش‌های مالی شکل بگیرند."
                                    primaryLabel="ثبت سند جدید"
                                    primaryHref="/accounting/vouchers/new"
                                    hint="برای آشنایی با مفاهیم بدهکار/بستانکار، روی آیکون «؟» کنار عنوان صفحه کلیک کنید."
                                />
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>شماره</th>
                                                <th>تاریخ</th>
                                                <th>شرح</th>
                                                <th>مبلغ</th>
                                                <th>وضعیت</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentVouchers.map((voucher) => (
                                                <tr key={voucher._id}>
                                                    <td className={styles.num}>
                                                        {voucher.number ? toFarsiNumber(voucher.number) : '—'}
                                                    </td>
                                                    <td className={styles.num}>{voucher.dateJalali || '—'}</td>
                                                    <td>{voucher.description || '—'}</td>
                                                    <td className={styles.num}>
                                                        {toFarsiNumber(MoneySeparator(voucher.totalDebit))}
                                                    </td>
                                                    <td>
                                                        <span className={STATUS_BADGE[voucher.status] || ''}>
                                                            {VOUCHER_STATUS_LABELS[voucher.status]}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <Link
                                                            href={`/accounting/vouchers/${voucher._id}`}
                                                            className={styles.linkBtn}
                                                        >
                                                            مشاهده
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
