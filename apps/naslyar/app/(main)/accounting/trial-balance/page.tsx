'use client';

import React from 'react';
import { LuScale } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, MoneySeparator, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { AccountingContextBar, useAccountingContext } from '../components/useAccountingContext';
import HelpIcon from '../components/HelpIcon';
import AccountingGuide from '../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../components/guides';
import { accountingApi } from '../accounting-api';
import { ACCOUNT_TYPE_LABELS, AccountingAccountType } from '../accounting.utils';
import { jalaliStringToIso } from '../jalali.client';
import styles from '../Accounting.module.scss';

const PAGE_SIZE = 15;

interface TrialBalanceRow {
    accountId: string;
    accountCode: string;
    accountTitle: string;
    accountType: AccountingAccountType;
    debit: number;
    credit: number;
    balanceDebit: number;
    balanceCredit: number;
}

export default function TrialBalancePage() {
    const context = useAccountingContext();
    const { company, fiscalYear } = context;
    const [loading, setLoading] = React.useState(true);
    const [rows, setRows] = React.useState<TrialBalanceRow[]>([]);
    const [totals, setTotals] = React.useState({ debit: 0, credit: 0, balanceDebit: 0, balanceCredit: 0 });
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');
    const [fourColumn, setFourColumn] = React.useState(true);

    // فیلتر جستجو و صفحه‌بندی سمت کلاینت (جمع کل همیشه روی همه حساب‌ها است)
    const [search, setSearch] = React.useState('');
    const [typeFilter, setTypeFilter] = React.useState('');
    const [itemPerPage, setItemPerPage] = React.useState(PAGE_SIZE);
    const [currentPage, setCurrentPage] = React.useState(1);

    const filteredRows = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        return rows.filter(
            (row) =>
                (!query || row.accountTitle.toLowerCase().includes(query) || row.accountCode.includes(query)) &&
                (!typeFilter || row.accountType === typeFilter),
        );
    }, [rows, search, typeFilter]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, typeFilter, fromDate, toDate]);

    const pageRows = React.useMemo(
        () => filteredRows.slice((currentPage - 1) * itemPerPage, currentPage * itemPerPage),
        [filteredRows, currentPage, itemPerPage],
    );

    const load = React.useCallback(async () => {
        if (!company?._id) {
            setRows([]);
            setLoading(false);
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
            const result = await accountingApi.trialBalanceReport({
                companyId: company._id,
                fiscalYearId: fiscalYear?._id,
                fromDate: fromIso ?? undefined,
                toDate: toIso ?? undefined,
            });
            setRows(result?.items || []);
            setTotals(result?.totals || { debit: 0, credit: 0, balanceDebit: 0, balanceCredit: 0 });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [company?._id, fiscalYear?._id, fromDate, toDate]);

    React.useEffect(() => {
        load();
    }, [load]);

    const isBalanced =
        totals.debit === totals.credit && totals.balanceDebit === totals.balanceCredit;

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>تراز آزمایشی</h1>
                                <HelpIcon topic="trialBalance" />
                            </div>
                            <p className={styles.subtitle}>
                                گردش و مانده همه حساب‌ها — مهم‌ترین گزارش کنترلی سلامت داده‌های مالی.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setFourColumn((prev) => !prev)}>
                                {fourColumn ? 'نمایش دو ستونه' : 'نمایش چهار ستونه'}
                            </button>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.trialBalance} />

                    <AccountingContextBar context={context} />

                    <div className={styles.reportFilters}>
                        <div className={styles.reportFilter}>
                            <label>از تاریخ (شمسی — اختیاری)</label>
                            <input
                                type="text"
                                dir="ltr"
                                placeholder="1405/01/01"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className={styles.reportFilter}>
                            <label>تا تاریخ (شمسی — اختیاری)</label>
                            <input
                                type="text"
                                dir="ltr"
                                placeholder="1405/12/29"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                        <button type="button" className={styles.primaryBtn} onClick={load}>
                            اعمال فیلتر
                        </button>
                        <span
                            className={`${isBalanced ? styles.badgePosted : styles.badgeReversed}`}
                            style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                        >
                            {isBalanced ? '✓ تراز متوازن است' : '✗ تراز نامتوازن است!'}
                        </span>
                    </div>

                    <div className={styles.reportFilters}>
                        <div className={styles.reportFilter}>
                            <label>جستجو (کد یا نام حساب)</label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="مثال: صندوق یا 1101"
                            />
                        </div>
                        <div className={styles.reportFilter}>
                            <label>نوع حساب</label>
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                                <option value="">همه انواع</option>
                                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className={styles.resultCountNote}>
                            {toFarsiNumber(filteredRows.length)} حساب
                        </span>
                    </div>

                    {loading || context.loading ? (
                        <LoadingState />
                    ) : !company ? (
                        <TableEmptyState
                            icon={<LuScale size={28} />}
                            title="شرکتی انتخاب نشده"
                            description="برای مشاهده تراز آزمایشی، ابتدا شرکت را انتخاب کنید."
                            primaryLabel="مدیریت شرکت‌ها"
                            primaryHref="/accounting/companies"
                        />
                    ) : rows.length === 0 ? (
                        <TableEmptyState
                            icon={<LuScale size={28} />}
                            title="گردشی برای نمایش نیست"
                            description="هنوز سند قطعی ثبت نشده یا در بازه انتخابی گردشی وجود ندارد."
                            primaryLabel="ثبت سند جدید"
                            primaryHref="/accounting/vouchers/new"
                        />
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>کد</th>
                                        <th>نام حساب</th>
                                        <th>نوع</th>
                                        <th>گردش بدهکار</th>
                                        <th>گردش بستانکار</th>
                                        {fourColumn && <th>مانده بدهکار</th>}
                                        {fourColumn && <th>مانده بستانکار</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={fourColumn ? 7 : 5} style={{ textAlign: 'center' }}>
                                                با این فیلتر حسابی یافت نشد.
                                            </td>
                                        </tr>
                                    ) : (
                                        pageRows.map((row) => (
                                        <tr key={row.accountId}>
                                            <td className={styles.num}>{row.accountCode}</td>
                                            <td>{row.accountTitle}</td>
                                            <td>
                                                <span className={styles.badgeType}>
                                                    {ACCOUNT_TYPE_LABELS[row.accountType]}
                                                </span>
                                            </td>
                                            <td className={`${styles.num} ${styles.amountDebit}`}>
                                                {toFarsiNumber(MoneySeparator(row.debit))}
                                            </td>
                                            <td className={`${styles.num} ${styles.amountCredit}`}>
                                                {toFarsiNumber(MoneySeparator(row.credit))}
                                            </td>
                                            {fourColumn && (
                                                <td className={styles.num}>
                                                    {row.balanceDebit ? toFarsiNumber(MoneySeparator(row.balanceDebit)) : '—'}
                                                </td>
                                            )}
                                            {fourColumn && (
                                                <td className={styles.num}>
                                                    {row.balanceCredit ? toFarsiNumber(MoneySeparator(row.balanceCredit)) : '—'}
                                                </td>
                                            )}
                                        </tr>
                                        ))
                                    )}
                                    <tr className={styles.tableFooterRow}>
                                        <td colSpan={3}>جمع کل (ریال)</td>
                                        <td className={styles.num}>{toFarsiNumber(MoneySeparator(totals.debit))}</td>
                                        <td className={styles.num}>{toFarsiNumber(MoneySeparator(totals.credit))}</td>
                                        {fourColumn && (
                                            <td className={styles.num}>
                                                {toFarsiNumber(MoneySeparator(totals.balanceDebit))}
                                            </td>
                                        )}
                                        {fourColumn && (
                                            <td className={styles.num}>
                                                {toFarsiNumber(MoneySeparator(totals.balanceCredit))}
                                            </td>
                                        )}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {filteredRows.length > 0 && (
                        <div className={styles.paginationBar}>
                            <Pagination
                                rtl
                                itemPerPage={itemPerPage}
                                currentPage={currentPage}
                                totalItems={filteredRows.length}
                                paginate={(page) => setCurrentPage(page)}
                                setRowsPerPage={(rowsPerPage) => {
                                    setItemPerPage(rowsPerPage);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
