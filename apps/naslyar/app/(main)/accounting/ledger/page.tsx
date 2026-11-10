'use client';

import React from 'react';
import Link from 'next/link';
import { LuBookText } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, MoneySeparator, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { AccountingContextBar, useAccountingContext } from '../components/useAccountingContext';
import HelpIcon from '../components/HelpIcon';
import AccountingGuide from '../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../components/guides';
import { accountingApi, AccountingAccount } from '../accounting-api';
import { jalaliStringToIso } from '../jalali.client';
import styles from '../Accounting.module.scss';

const PAGE_SIZE = 20;

interface LedgerRow {
    voucherId: string;
    voucherNumber: number;
    date: string;
    dateJalali?: string;
    description?: string;
    debit: number;
    credit: number;
    balance: number;
}

export default function GeneralLedgerPage() {
    const context = useAccountingContext();
    const { company, fiscalYear } = context;
    const [accounts, setAccounts] = React.useState<AccountingAccount[]>([]);
    const [accountId, setAccountId] = React.useState('');
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [searched, setSearched] = React.useState(false);
    const [account, setAccount] = React.useState<AccountingAccount | null>(null);
    const [openingBalance, setOpeningBalance] = React.useState(0);
    const [rows, setRows] = React.useState<LedgerRow[]>([]);
    const [totals, setTotals] = React.useState({ debit: 0, credit: 0, closingBalance: 0 });

    // صفحه‌بندی سمت کلاینت روی ردیف‌های دفتر
    const [itemPerPage, setItemPerPage] = React.useState(PAGE_SIZE);
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageRows = React.useMemo(
        () => rows.slice((currentPage - 1) * itemPerPage, currentPage * itemPerPage),
        [rows, currentPage, itemPerPage],
    );

    React.useEffect(() => {
        if (!company?._id) {
            setAccounts([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const result = await accountingApi.listAccounts({
                    companyId: company._id,
                    includeArchive: 'true',
                });
                if (!cancelled) setAccounts(result?.items || []);
            } catch (e) {
                ErrorToaster(e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [company?._id]);

    const load = React.useCallback(async () => {
        if (!company?._id || !accountId) {
            ErrorToaster(new Error('حساب موردنظر را انتخاب کنید'));
            return;
        }
        try {
            setLoading(true);
            const fromIso = fromDate.trim() ? jalaliStringToIso(fromDate) : undefined;
            const toIso = toDate.trim() ? jalaliStringToIso(toDate) : undefined;
            if (fromDate.trim() && !fromIso) {
                ErrorToaster(new Error('تاریخ شروع نامعتبر است'));
                return;
            }
            if (toDate.trim() && !toIso) {
                ErrorToaster(new Error('تاریخ پایان نامعتبر است'));
                return;
            }
            const result = await accountingApi.generalLedgerReport({
                companyId: company._id,
                accountId,
                fiscalYearId: fiscalYear?._id,
                fromDate: fromIso ?? undefined,
                toDate: toIso ?? undefined,
            });
            setAccount(result.account);
            setOpeningBalance(result.openingBalance || 0);
            setRows(result.rows || []);
            setTotals(result.totals || { debit: 0, credit: 0, closingBalance: 0 });
            setSearched(true);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [company?._id, accountId, fiscalYear?._id, fromDate, toDate]);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>دفتر کل</h1>
                                <HelpIcon topic="ledger" />
                            </div>
                            <p className={styles.subtitle}>
                                گردش و مانده یک حساب در بازه زمانی — با مانده اول دوره و مانده پایان دوره.
                            </p>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.ledger} />

                    <AccountingContextBar context={context} />

                    <div className={styles.reportFilters}>
                        <div className={styles.reportFilter}>
                            <label>حساب</label>
                            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                                <option value="">انتخاب حساب...</option>
                                {accounts.map((item) => (
                                    <option key={item._id} value={item._id}>
                                        {item.code} — {item.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.reportFilter}>
                            <label>از تاریخ (شمسی)</label>
                            <input
                                type="text"
                                dir="ltr"
                                placeholder="1405/01/01"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className={styles.reportFilter}>
                            <label>تا تاریخ (شمسی)</label>
                            <input
                                type="text"
                                dir="ltr"
                                placeholder="1405/12/29"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                        <button type="button" className={styles.primaryBtn} onClick={load} disabled={loading}>
                            {loading ? 'در حال محاسبه...' : 'نمایش دفتر'}
                        </button>
                    </div>

                    {loading || context.loading ? (
                        <LoadingState />
                    ) : !searched ? (
                        <TableEmptyState
                            icon={<LuBookText size={28} />}
                            title="حساب و بازه را انتخاب کنید"
                            description="برای مشاهده گردش حساب، حساب موردنظر را انتخاب و روی «نمایش دفتر» کلیک کنید."
                            hint="مانده اول دوره از گردش‌های قبل از تاریخ شروع محاسبه می‌شود."
                        />
                    ) : (
                        <>
                            <p className={styles.subtitle} style={{ margin: '0.5rem 0' }}>
                                حساب: <strong>{account?.code} — {account?.title}</strong> — مانده اول دوره:{' '}
                                <strong>{toFarsiNumber(MoneySeparator(openingBalance))}</strong> ریال
                            </p>
                            <div className={styles.tableWrapper} style={{ marginTop: 0 }}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>تاریخ</th>
                                            <th>شماره سند</th>
                                            <th>شرح</th>
                                            <th>بدهکار</th>
                                            <th>بستانکار</th>
                                            <th>مانده</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center' }}>
                                                    در این بازه گردشی برای این حساب ثبت نشده است.
                                                </td>
                                            </tr>
                                        ) : (
                                            pageRows.map((row, index) => (
                                                <tr key={`${row.voucherId}-${index}`}>
                                                    <td className={styles.num}>{row.dateJalali || '—'}</td>
                                                    <td className={styles.num}>
                                                        <Link
                                                            href={`/accounting/vouchers/${row.voucherId}`}
                                                            className={styles.linkBtn}
                                                        >
                                                            {row.voucherNumber ? toFarsiNumber(row.voucherNumber) : '—'}
                                                        </Link>
                                                    </td>
                                                    <td>{row.description || '—'}</td>
                                                    <td className={`${styles.num} ${styles.amountDebit}`}>
                                                        {row.debit ? toFarsiNumber(MoneySeparator(row.debit)) : '—'}
                                                    </td>
                                                    <td className={`${styles.num} ${styles.amountCredit}`}>
                                                        {row.credit ? toFarsiNumber(MoneySeparator(row.credit)) : '—'}
                                                    </td>
                                                    <td className={styles.num}>
                                                        {toFarsiNumber(MoneySeparator(row.balance))}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        <tr className={styles.tableFooterRow}>
                                            <td colSpan={3}>جمع دوره / مانده پایان دوره</td>
                                            <td className={styles.num}>{toFarsiNumber(MoneySeparator(totals.debit))}</td>
                                            <td className={styles.num}>{toFarsiNumber(MoneySeparator(totals.credit))}</td>
                                            <td className={styles.num}>
                                                {toFarsiNumber(MoneySeparator(totals.closingBalance))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {rows.length > 0 && (
                                <div className={styles.paginationBar}>
                                    <Pagination
                                        rtl
                                        itemPerPage={itemPerPage}
                                        currentPage={currentPage}
                                        totalItems={rows.length}
                                        paginate={(page) => setCurrentPage(page)}
                                        setRowsPerPage={(rowsPerPage) => {
                                            setItemPerPage(rowsPerPage);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
