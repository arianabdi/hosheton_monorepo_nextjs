'use client';

import React from 'react';
import Link from 'next/link';
import { LuBookOpen } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, MoneySeparator, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { AccountingContextBar, useAccountingContext } from '../components/useAccountingContext';
import HelpIcon from '../components/HelpIcon';
import AccountingGuide from '../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../components/guides';
import { accountingApi, AccountingVoucher } from '../accounting-api';
import { jalaliStringToIso } from '../jalali.client';
import styles from '../Accounting.module.scss';

const PAGE_SIZE = 10;

export default function JournalPage() {
    const context = useAccountingContext();
    const { company, fiscalYear } = context;
    const [loading, setLoading] = React.useState(true);
    const [vouchers, setVouchers] = React.useState<AccountingVoucher[]>([]);
    const [totals, setTotals] = React.useState({ totalDebit: 0, totalCredit: 0 });
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');

    // صفحه‌بندی سمت کلاینت روی گروه اسناد
    const [itemPerPage, setItemPerPage] = React.useState(PAGE_SIZE);
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageItems = React.useMemo(
        () => vouchers.slice((currentPage - 1) * itemPerPage, currentPage * itemPerPage),
        [vouchers, currentPage, itemPerPage],
    );

    React.useEffect(() => {
        setCurrentPage(1);
    }, [fromDate, toDate]);

    const load = React.useCallback(async () => {
        if (!company?._id) {
            setVouchers([]);
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
            const result = await accountingApi.journalReport({
                companyId: company._id,
                fiscalYearId: fiscalYear?._id,
                fromDate: fromIso ?? undefined,
                toDate: toIso ?? undefined,
                limit: 200,
            });
            setVouchers(result?.items || []);
            setTotals(result?.totals || { totalDebit: 0, totalCredit: 0 });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [company?._id, fiscalYear?._id, fromDate, toDate]);

    React.useEffect(() => {
        load();
    }, [load]);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>دفتر روزنامه</h1>
                                <HelpIcon topic="journal" />
                            </div>
                            <p className={styles.subtitle}>
                                فهرست زمانی همه اسناد قطعی — اسناد پیش‌نویس در این گزارش دیده نمی‌شوند.
                            </p>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.journal} />

                    <AccountingContextBar context={context} />

                    <div className={styles.reportFilters}>
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
                        <button type="button" className={styles.primaryBtn} onClick={load}>
                            اعمال فیلتر
                        </button>
                    </div>

                    {loading || context.loading ? (
                        <LoadingState />
                    ) : !company ? (
                        <TableEmptyState
                            icon={<LuBookOpen size={28} />}
                            title="شرکتی انتخاب نشده"
                            description="برای مشاهده دفتر روزنامه، ابتدا شرکت را انتخاب کنید."
                            primaryLabel="مدیریت شرکت‌ها"
                            primaryHref="/accounting/companies"
                        />
                    ) : vouchers.length === 0 ? (
                        <TableEmptyState
                            icon={<LuBookOpen size={28} />}
                            title="سندي برای نمایش نیست"
                            description="در این بازه، سند قطعی وجود ندارد. اسناد پس از «ثبت قطعی» در دفتر روزنامه ظاهر می‌شوند."
                            primaryLabel="ثبت سند جدید"
                            primaryHref="/accounting/vouchers/new"
                        />
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>تاریخ</th>
                                        <th>شماره سند</th>
                                        <th>کد حساب</th>
                                        <th>شرح</th>
                                        <th>بدهکار</th>
                                        <th>بستانکار</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.map((voucher) => (
                                        <React.Fragment key={voucher._id}>
                                            <tr className={styles.journalGroup}>
                                                <td className={styles.num}>{voucher.dateJalali || '—'}</td>
                                                <td className={styles.num} colSpan={2}>
                                                    <Link
                                                        href={`/accounting/vouchers/${voucher._id}`}
                                                        className={styles.linkBtn}
                                                    >
                                                        سند {voucher.number ? toFarsiNumber(voucher.number) : '—'}
                                                    </Link>
                                                </td>
                                                <td>{voucher.description || '—'}</td>
                                                <td className={`${styles.num} ${styles.amountDebit}`}>
                                                    {toFarsiNumber(MoneySeparator(voucher.totalDebit))}
                                                </td>
                                                <td className={`${styles.num} ${styles.amountCredit}`}>
                                                    {toFarsiNumber(MoneySeparator(voucher.totalCredit))}
                                                </td>
                                            </tr>
                                            {voucher.entries.map((entry, index) => (
                                                <tr key={`${voucher._id}-${index}`}>
                                                    <td className={styles.num}>{voucher.dateJalali || '—'}</td>
                                                    <td className={styles.num} />
                                                    <td className={styles.num}>{entry.accountCode}</td>
                                                    <td>{entry.description || voucher.description || '—'}</td>
                                                    <td className={`${styles.num} ${styles.amountDebit}`}>
                                                        {entry.debit ? toFarsiNumber(MoneySeparator(entry.debit)) : '—'}
                                                    </td>
                                                    <td className={`${styles.num} ${styles.amountCredit}`}>
                                                        {entry.credit ? toFarsiNumber(MoneySeparator(entry.credit)) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                    <tr className={styles.tableFooterRow}>
                                        <td colSpan={4}>جمع کل دفتر روزنامه (ریال)</td>
                                        <td className={styles.num}>{toFarsiNumber(MoneySeparator(totals.totalDebit))}</td>
                                        <td className={styles.num}>{toFarsiNumber(MoneySeparator(totals.totalCredit))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {vouchers.length > 0 && (
                        <>
                            <div className={styles.paginationBar}>
                                <Pagination
                                    rtl
                                    itemPerPage={itemPerPage}
                                    currentPage={currentPage}
                                    totalItems={vouchers.length}
                                    paginate={(page) => setCurrentPage(page)}
                                    setRowsPerPage={(rows) => {
                                        setItemPerPage(rows);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>
                            <p className={styles.subtitle} style={{ marginTop: '0.5rem' }}>
                                نمایش صفحه {toFarsiNumber(currentPage)} از {toFarsiNumber(Math.max(1, Math.ceil(vouchers.length / itemPerPage)))} — جمع کل روی همه صفحات محاسبه شده است.
                            </p>
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
