'use client';

import React from 'react';
import Link from 'next/link';
import { LuNotebookPen } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, MoneySeparator, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { AccountingContextBar, useAccountingContext } from '../components/useAccountingContext';
import HelpIcon from '../components/HelpIcon';
import AccountingGuide from '../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../components/guides';
import { accountingApi, AccountingVoucher } from '../accounting-api';
import { jalaliStringToIso } from '../jalali.client';
import { VOUCHER_STATUS_LABELS, AccountingVoucherStatus } from '../accounting.utils';
import styles from '../Accounting.module.scss';

const PAGE_SIZE = 15;

const STATUS_BADGE: Record<string, string> = {
    draft: styles.badgeDraft,
    posted: styles.badgePosted,
    reversed: styles.badgeReversed,
};

const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: '', label: 'همه' },
    { value: 'draft', label: 'پیش‌نویس' },
    { value: 'posted', label: 'قطعی' },
    { value: 'reversed', label: 'معکوس‌شده' },
];

export default function AccountingVouchersPage() {
    const context = useAccountingContext();
    const { company, fiscalYear } = context;
    const [loading, setLoading] = React.useState(true);
    const [vouchers, setVouchers] = React.useState<AccountingVoucher[]>([]);
    const [totalItems, setTotalItems] = React.useState(0);
    const [status, setStatus] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [searchInput, setSearchInput] = React.useState('');
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');

    // صفحه‌بندی سمت کلاینت
    const [itemPerPage, setItemPerPage] = React.useState(PAGE_SIZE);
    const [currentPage, setCurrentPage] = React.useState(1);

    const load = React.useCallback(async () => {
        if (!company?._id) {
            setVouchers([]);
            setLoading(false);
            return;
        }
        const fromIso = fromDate.trim() ? jalaliStringToIso(fromDate) : undefined;
        const toIso = toDate.trim() ? jalaliStringToIso(toDate) : undefined;
        if (fromDate.trim() && !fromIso) {
            ErrorToaster(new Error('تاریخ شروع نامعتبر است — قالب: 1405/01/01'));
            return;
        }
        if (toDate.trim() && !toIso) {
            ErrorToaster(new Error('تاریخ پایان نامعتبر است — قالب: 1405/12/29'));
            return;
        }
        try {
            setLoading(true);
            const result = await accountingApi.listVouchers({
                companyId: company._id,
                fiscalYearId: fiscalYear?._id,
                status: status || undefined,
                search: search || undefined,
                fromDate: fromIso ?? undefined,
                toDate: toIso ?? undefined,
                limit: 100,
            });
            setVouchers(result?.items || []);
            setTotalItems(result?.totalItems || 0);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [company?._id, fiscalYear?._id, status, search, fromDate, toDate]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [status, search, fromDate, toDate]);

    React.useEffect(() => {
        load();
    }, [load]);

    const pageItems = React.useMemo(
        () => vouchers.slice((currentPage - 1) * itemPerPage, currentPage * itemPerPage),
        [vouchers, currentPage, itemPerPage],
    );

    const remove = async (voucher: AccountingVoucher) => {
        if (!confirm(`سند «${voucher.description || 'بدون شرح'}» حذف شود؟`)) return;
        try {
            await accountingApi.deleteVoucher(voucher._id);
            SuccessToaster({ message: 'سند حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>اسناد حسابداری</h1>
                                <HelpIcon topic="vouchers" />
                            </div>
                            <p className={styles.subtitle}>
                                همه اسناد مالی — پیش‌نویس‌ها قابل ویرایش و اسناد قطعی فقط با سند معکوس قابل اصلاح‌اند.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <Link href="/accounting/vouchers/new" className={styles.primaryBtn}>
                                + سند جدید
                            </Link>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.vouchers} />

                    <AccountingContextBar context={context} />

                    <div className={styles.reportFilters}>
                        <div className={styles.reportFilter}>
                            <label>وضعیت</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                {STATUS_FILTERS.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
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
                        <div className={styles.reportFilter}>
                            <label>جستجو (شرح یا شماره سند)</label>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setSearch(searchInput.trim());
                                }}
                                placeholder="مثال: فروش یا 12"
                            />
                        </div>
                        <button type="button" className={styles.secondaryBtn} onClick={() => setSearch(searchInput.trim())}>
                            جستجو
                        </button>
                    </div>

                    {loading || context.loading ? (
                        <LoadingState />
                    ) : !company ? (
                        <TableEmptyState
                            icon={<LuNotebookPen size={28} />}
                            title="شرکتی انتخاب نشده"
                            description="برای مشاهده اسناد، ابتدا یک شرکت بسازید یا انتخاب کنید."
                            primaryLabel="مدیریت شرکت‌ها"
                            primaryHref="/accounting/companies"
                        />
                    ) : vouchers.length === 0 ? (
                        <TableEmptyState
                            icon={<LuNotebookPen size={28} />}
                            title={search || status ? 'نتیجه‌ای پیدا نشد' : 'هنوز سندي ثبت نشده'}
                            description={
                                search || status
                                    ? 'فیلترها را تغییر دهید یا پاک کنید.'
                                    : 'اولین سند حسابداری خود را ثبت کنید.'
                            }
                            primaryLabel="ثبت سند جدید"
                            primaryHref="/accounting/vouchers/new"
                        />
                    ) : (
                        <>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>شماره</th>
                                            <th>تاریخ</th>
                                            <th>شرح</th>
                                            <th>بدهکار</th>
                                            <th>بستانکار</th>
                                            <th>وضعیت</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageItems.map((voucher) => (
                                            <tr key={voucher._id}>
                                                <td className={styles.num}>
                                                    {voucher.number ? toFarsiNumber(voucher.number) : '—'}
                                                </td>
                                                <td className={styles.num}>{voucher.dateJalali || '—'}</td>
                                                <td>{voucher.description || '—'}</td>
                                                <td className={`${styles.num} ${styles.amountDebit}`}>
                                                    {toFarsiNumber(MoneySeparator(voucher.totalDebit))}
                                                </td>
                                                <td className={`${styles.num} ${styles.amountCredit}`}>
                                                    {toFarsiNumber(MoneySeparator(voucher.totalCredit))}
                                                </td>
                                                <td>
                                                    <span className={STATUS_BADGE[voucher.status] || ''}>
                                                        {VOUCHER_STATUS_LABELS[voucher.status as AccountingVoucherStatus]}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <Link
                                                            href={`/accounting/vouchers/${voucher._id}`}
                                                            className={styles.linkBtn}
                                                        >
                                                            مشاهده
                                                        </Link>
                                                        {voucher.status === 'draft' && (
                                                            <button
                                                                type="button"
                                                                className={styles.deleteBtn}
                                                                onClick={() => remove(voucher)}
                                                            >
                                                                حذف
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

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

                            {totalItems > 0 && (
                                <p className={styles.subtitle} style={{ marginTop: '0.5rem' }}>
                                    تعداد کل اسناد یافت‌شده: {toFarsiNumber(totalItems)} سند
                                    {totalItems > vouchers.length ? ' (نمایش ۱۰۰ مورد اخیر)' : ''}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
