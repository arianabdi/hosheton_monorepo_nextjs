'use client';

import React from 'react';
import { LuCalendarDays } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, ModalHelper, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { AccountingContextBar, useAccountingContext } from '../components/useAccountingContext';
import HelpIcon from '../components/HelpIcon';
import AccountingGuide from '../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../components/guides';
import { accountingApi, AccountingFiscalYear } from '../accounting-api';
import { currentJalaliYear } from '../jalali.client';
import { FISCAL_YEAR_STATUS_LABELS } from '../accounting.utils';
import styles from '../Accounting.module.scss';

const PAGE_SIZE = 8;

export default function AccountingFiscalYearsPage() {
    const context = useAccountingContext();
    const { company } = context;
    const [loading, setLoading] = React.useState(true);
    const [fiscalYears, setFiscalYears] = React.useState<AccountingFiscalYear[]>([]);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [year, setYear] = React.useState<string>('');
    const [title, setTitle] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    // فیلتر وضعیت و صفحه‌بندی سمت کلاینت
    const [statusFilter, setStatusFilter] = React.useState('');
    const [itemPerPage, setItemPerPage] = React.useState(PAGE_SIZE);
    const [currentPage, setCurrentPage] = React.useState(1);

    const load = React.useCallback(async () => {
        if (!company?._id) {
            setFiscalYears([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const result = await accountingApi.listFiscalYears(company._id);
            setFiscalYears(result?.items || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [company?._id]);

    React.useEffect(() => {
        load();
    }, [load]);

    const filtered = React.useMemo(
        () => (statusFilter ? fiscalYears.filter((fy) => fy.status === statusFilter) : fiscalYears),
        [fiscalYears, statusFilter],
    );

    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter]);

    const pageItems = React.useMemo(
        () => filtered.slice((currentPage - 1) * itemPerPage, currentPage * itemPerPage),
        [filtered, currentPage, itemPerPage],
    );

    const openCreate = () => {
        setYear(String(currentJalaliYear() + 1));
        setTitle('');
        setModalOpen(true);
    };

    const save = async () => {
        const parsedYear = Number(year);
        if (!parsedYear || parsedYear < 1300 || parsedYear > 1500) {
            ErrorToaster(new Error('سال شمسی معتبر وارد کنید (مثال: 1405)'));
            return;
        }
        try {
            setSaving(true);
            await accountingApi.createFiscalYear({
                companyId: company!._id,
                year: parsedYear,
                title: title.trim() || undefined,
            });
            SuccessToaster({ message: 'سال مالی ایجاد شد' });
            setModalOpen(false);
            await load();
            await context.reload();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const toggleClose = async (fy: AccountingFiscalYear) => {
        const closing = fy.status === 'open';
        if (
            !confirm(
                closing
                    ? `«${fy.title}» بسته شود؟ پس از بستن، ثبت سند جدید در این سال ممنوع است.`
                    : `«${fy.title}» بازگشایی شود؟ امکان ثبت سند دوباره فعال می‌شود.`,
            )
        )
            return;
        try {
            if (closing) await accountingApi.closeFiscalYear(fy._id);
            else await accountingApi.reopenFiscalYear(fy._id);
            SuccessToaster({ message: closing ? 'سال مالی بسته شد' : 'سال مالی بازگشایی شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const remove = async (fy: AccountingFiscalYear) => {
        if (!confirm(`«${fy.title}» حذف شود؟ (فقط سال بدون سند قابل حذف است)`)) return;
        try {
            await accountingApi.deleteFiscalYear(fy._id);
            SuccessToaster({ message: 'سال مالی حذف شد' });
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
                                <h1 className={styles.mainTitle}>سال‌های مالی</h1>
                                <HelpIcon topic="fiscalYears" />
                            </div>
                            <p className={styles.subtitle}>
                                دوره‌های مالی شرکت فعال — پس از بستن دوره، ثبت سند در آن ممنوع می‌شود.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.primaryBtn} onClick={openCreate} disabled={!company}>
                                + سال مالی جدید
                            </button>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.fiscalYears} />

                    <AccountingContextBar context={context} />

                    {loading || context.loading ? (
                        <LoadingState />
                    ) : !company ? (
                        <TableEmptyState
                            icon={<LuCalendarDays size={28} />}
                            title="شرکتی انتخاب نشده"
                            description="برای مدیریت سال‌های مالی، ابتدا یک شرکت بسازید یا انتخاب کنید."
                            primaryLabel="مدیریت شرکت‌ها"
                            primaryHref="/accounting/companies"
                        />
                    ) : fiscalYears.length === 0 ? (
                        <TableEmptyState
                            icon={<LuCalendarDays size={28} />}
                            title="سال مالی تعریف نشده"
                            description="برای این شرکت هنوز سال مالی تعریف نشده است."
                            primaryLabel="افزودن سال مالی"
                            onPrimaryClick={openCreate}
                        />
                    ) : (
                        <>
                            <div className={styles.reportFilters}>
                                <div className={styles.reportFilter}>
                                    <label>وضعیت دوره</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="">همه</option>
                                        <option value="open">باز</option>
                                        <option value="closed">بسته</option>
                                    </select>
                                </div>
                                <span className={styles.resultCountNote}>
                                    {toFarsiNumber(filtered.length)} سال مالی
                                </span>
                            </div>

                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>عنوان</th>
                                            <th>سال</th>
                                            <th>از تاریخ</th>
                                            <th>تا تاریخ</th>
                                            <th>وضعیت</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center' }}>
                                                    با این فیلتر دوره‌ای وجود ندارد.
                                                </td>
                                            </tr>
                                        ) : (
                                            pageItems.map((fy) => (
                                                <tr key={fy._id}>
                                                    <td style={{ fontWeight: 600 }}>{fy.title}</td>
                                                    <td className={styles.num}>{fy.year}</td>
                                                    <td className={styles.num}>{fy.startDateJalali || '—'}</td>
                                                    <td className={styles.num}>{fy.endDateJalali || '—'}</td>
                                                    <td>
                                                        <span className={fy.status === 'open' ? styles.badgeOpen : styles.badgeClosed}>
                                                            {FISCAL_YEAR_STATUS_LABELS[fy.status]}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className={styles.rowActions}>
                                                            <button type="button" className={styles.linkBtn} onClick={() => toggleClose(fy)}>
                                                                {fy.status === 'open' ? 'بستن دوره' : 'بازگشایی'}
                                                            </button>
                                                            <button type="button" className={styles.deleteBtn} onClick={() => remove(fy)}>
                                                                حذف
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.paginationBar}>
                                <Pagination
                                    rtl
                                    itemPerPage={itemPerPage}
                                    currentPage={currentPage}
                                    totalItems={filtered.length}
                                    paginate={(page) => setCurrentPage(page)}
                                    setRowsPerPage={(rows) => {
                                        setItemPerPage(rows);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>

            <ModalHelper
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                component={
                    <div className={styles.rtl} style={{ padding: '4px' }}>
                        <div className={styles.formSection}>
                            <h3 className={styles.formSectionTitle}>اطلاعات دوره مالی</h3>
                            <p className={styles.formSectionSubtitle}>
                                فقط سال شمسی را وارد کنید؛ بازه ۱ فروردین تا آخر اسفند همان سال به‌صورت خودکار محاسبه و ذخیره می‌شود.
                            </p>
                            <div className={styles.rowGroup}>
                                <div className={styles.field}>
                                    <label>سال شمسی *</label>
                                    <input
                                        type="text"
                                        dir="ltr"
                                        placeholder="1405"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                    />
                                    <span className={styles.helperText}>مثال: 1405 — بین ۱۳۰۰ تا ۱۵۰۰</span>
                                </div>
                                <div className={styles.field}>
                                    <label>عنوان (اختیاری)</label>
                                    <input
                                        type="text"
                                        placeholder="سال مالی ۱۴۰۵"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                    <span className={styles.helperText}>در صورت خالی بودن، به‌صورت خودکار ساخته می‌شود.</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.formSection}>
                            <h3 className={styles.formSectionTitle}>نکته‌ها</h3>
                            <p className={styles.formSectionSubtitle}>
                                ⓘ هنگام ساخت شرکت، سال مالی جاری به‌صورت خودکار ایجاد می‌شود. پس از پایان فعالیت سال، دوره را «بسته» کنید تا ثبت سند در آن ممنوع شود.
                            </p>
                        </div>
                        <div className={styles.formActions}>
                            <button type="button" className={styles.primaryBtn} disabled={saving} onClick={save}>
                                {saving ? 'در حال ذخیره...' : 'ایجاد سال مالی'}
                            </button>
                            <button type="button" className={styles.secondaryBtn} onClick={() => setModalOpen(false)}>
                                انصراف
                            </button>
                        </div>
                    </div>
                }
                sheetTitle="سال مالی جدید"
                size="560px"
            />
        </Container>
    );
}
