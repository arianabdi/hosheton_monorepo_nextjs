'use client';

import React from 'react';
import { LuBuilding2 } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, ModalHelper, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { accountingApi, AccountingCompany } from '../accounting-api';
import { isoToJalaliString } from '../jalali.client';
import HelpIcon from '../components/HelpIcon';
import AccountingGuide from '../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../components/guides';
import styles from '../Accounting.module.scss';

const PAGE_SIZE = 8;

interface CompanyFormState {
    title: string;
    nationalId: string;
    economicCode: string;
    nationalCode: string;
    registrationNumber: string;
    postalCode: string;
    address: string;
    phone: string;
}

const emptyForm = (): CompanyFormState => ({
    title: '',
    nationalId: '',
    economicCode: '',
    nationalCode: '',
    registrationNumber: '',
    postalCode: '',
    address: '',
    phone: '',
});

export default function AccountingCompaniesPage() {
    const [loading, setLoading] = React.useState(true);
    const [companies, setCompanies] = React.useState<AccountingCompany[]>([]);
    const [modalOpen, setModalOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<AccountingCompany | null>(null);
    const [form, setForm] = React.useState<CompanyFormState>(emptyForm);
    const [saving, setSaving] = React.useState(false);

    // فیلتر و صفحه‌بندی سمت کلاینت
    const [search, setSearch] = React.useState('');
    const [itemPerPage, setItemPerPage] = React.useState(PAGE_SIZE);
    const [currentPage, setCurrentPage] = React.useState(1);

    const load = React.useCallback(async () => {
        try {
            setLoading(true);
            const result = await accountingApi.listCompanies({ limit: 100 });
            setCompanies(result?.items || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
    }, [load]);

    const filtered = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return companies;
        return companies.filter(
            (company) =>
                company.title?.toLowerCase().includes(query) ||
                company.nationalId?.includes(query) ||
                company.economicCode?.includes(query) ||
                company.nationalCode?.includes(query),
        );
    }, [companies, search]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / itemPerPage));
    const pageItems = React.useMemo(
        () => filtered.slice((currentPage - 1) * itemPerPage, currentPage * itemPerPage),
        [filtered, currentPage, itemPerPage],
    );

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setModalOpen(true);
    };

    const openEdit = (company: AccountingCompany) => {
        setEditing(company);
        setForm({
            title: company.title || '',
            nationalId: company.nationalId || '',
            economicCode: company.economicCode || '',
            nationalCode: company.nationalCode || '',
            registrationNumber: company.registrationNumber || '',
            postalCode: company.postalCode || '',
            address: company.address || '',
            phone: company.phone || '',
        });
        setModalOpen(true);
    };

    const save = async () => {
        if (!form.title.trim()) {
            ErrorToaster(new Error('نام شرکت الزامی است'));
            return;
        }
        try {
            setSaving(true);
            if (editing) {
                await accountingApi.updateCompany(editing._id, { ...form });
                SuccessToaster({ message: 'اطلاعات شرکت بروزرسانی شد' });
            } else {
                await accountingApi.createCompany({ ...form });
                SuccessToaster({ message: 'شرکت ساخته شد — کدینگ حساب‌ها و سال مالی جاری به‌صورت خودکار ایجاد شد' });
            }
            setModalOpen(false);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (company: AccountingCompany) => {
        if (!confirm(`شرکت «${company.title}» حذف شود؟ دسترسی به کدینگ و اسناد آن غیرفعال می‌شود.`)) return;
        try {
            await accountingApi.deleteCompany(company._id);
            SuccessToaster({ message: 'شرکت حذف شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    // ---------- فرم مودال — دسته‌بندی‌شده مثل فرم درگاه پرداخت ----------
    const formContent = (
        <div className={styles.rtl} style={{ padding: '4px' }}>
            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>۱. اطلاعات پایه شرکت</h3>
                <p className={styles.formSectionSubtitle}>
                    نام شرکت در همه صفحات و گزارش‌ها نمایش داده می‌شود؛ با ساخت شرکت، کدینگ و سال مالی خودکار ساخته می‌شود.
                </p>
                <div className={styles.rowGroup}>
                    <div className={styles.field}>
                        <label>نام شرکت *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="مثال: شرکت نمونه پارس"
                        />
                    </div>
                    <div className={styles.field}>
                        <label>تلفن</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="02112345678"
                        />
                        <span className={styles.helperText}>شماره تماس شرکت — اختیاری</span>
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>۲. اطلاعات ثبتی و مالیاتی</h3>
                <p className={styles.formSectionSubtitle}>
                    برای سازگاری با سامانه مودیان و گزارش‌های مالیاتی تکمیل می‌شود — همه فیلدها اختیاری‌اند.
                </p>
                <div className={styles.rowGroup}>
                    <div className={styles.field}>
                        <label>شناسه ملی</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={form.nationalId}
                            onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                            placeholder="۱۱ رقم — اشخاص حقوقی"
                        />
                    </div>
                    <div className={styles.field}>
                        <label>کد اقتصادی</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={form.economicCode}
                            onChange={(e) => setForm({ ...form, economicCode: e.target.value })}
                            placeholder="کد سازمان امور مالیاتی"
                        />
                    </div>
                </div>
                <div className={styles.rowGroup}>
                    <div className={styles.field}>
                        <label>کد ملی</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={form.nationalCode}
                            onChange={(e) => setForm({ ...form, nationalCode: e.target.value })}
                            placeholder="۱۰ رقم — اشخاص حقیقی"
                        />
                    </div>
                    <div className={styles.field}>
                        <label>شماره ثبت</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={form.registrationNumber}
                            onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                        />
                    </div>
                </div>
                <div className={styles.rowGroup}>
                    <div className={styles.field}>
                        <label>کد پستی</label>
                        <input
                            type="text"
                            dir="ltr"
                            value={form.postalCode}
                            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>۳. آدرس</h3>
                <div className={styles.rowGroup}>
                    <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label>آدرس</label>
                        <input
                            type="text"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            placeholder="نشانی کامل محل شرکت"
                        />
                    </div>
                </div>
            </div>

            <div className={styles.formActions}>
                <button type="button" className={styles.primaryBtn} disabled={saving} onClick={save}>
                    {saving ? 'در حال ذخیره...' : editing ? 'ذخیره تغییرات' : 'ساخت شرکت'}
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={() => setModalOpen(false)}>
                    انصراف
                </button>
            </div>
        </div>
    );

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>شرکت‌ها</h1>
                                <HelpIcon topic="companies" />
                            </div>
                            <p className={styles.subtitle}>
                                مدیریت شرکت‌های شما — هر شرکت کدینگ حساب و سال مالی مستقل دارد.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.primaryBtn} onClick={openCreate}>
                                + شرکت جدید
                            </button>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.companies} />

                    {loading ? (
                        <LoadingState />
                    ) : companies.length === 0 ? (
                        <TableEmptyState
                            icon={<LuBuilding2 size={28} />}
                            title="هنوز شرکتی نساخته‌اید"
                            description="برای شروع کار با سیستم حسابداری، اولین شرکت خود را بسازید."
                            hint="با ساخت شرکت، کدینگ حساب‌ها و سال مالی جاری به‌صورت خودکار ساخته می‌شود."
                            primaryLabel="ساخت اولین شرکت"
                            onPrimaryClick={openCreate}
                            secondaryLabel="بروزرسانی لیست"
                            onSecondaryClick={load}
                        />
                    ) : (
                        <>
                            <div className={styles.reportFilters}>
                                <div className={styles.reportFilter}>
                                    <label>جستجو (نام، شناسه ملی یا کد اقتصادی)</label>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="مثال: پارس"
                                    />
                                </div>
                                <span className={styles.resultCountNote}>
                                    {toFarsiNumber(filtered.length)} شرکت
                                </span>
                            </div>

                            {pageItems.length === 0 ? (
                                <TableEmptyState
                                    icon={<LuBuilding2 size={28} />}
                                    title="نتیجه‌ای پیدا نشد"
                                    description="عبارت جستجو را تغییر دهید."
                                />
                            ) : (
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>نام شرکت</th>
                                                <th>شناسه ملی</th>
                                                <th>کد اقتصادی</th>
                                                <th>تلفن</th>
                                                <th>تاریخ ایجاد</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageItems.map((company) => (
                                                <tr key={company._id}>
                                                    <td style={{ fontWeight: 600 }}>{company.title}</td>
                                                    <td className={styles.num}>{company.nationalId || '—'}</td>
                                                    <td className={styles.num}>{company.economicCode || '—'}</td>
                                                    <td className={styles.num}>
                                                        {company.phone ? toFarsiNumber(company.phone) : '—'}
                                                    </td>
                                                    <td className={styles.num}>{isoToJalaliString(company.createdAt)}</td>
                                                    <td>
                                                        <div className={styles.rowActions}>
                                                            <button
                                                                type="button"
                                                                className={styles.linkBtn}
                                                                onClick={() => openEdit(company)}
                                                            >
                                                                ویرایش
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={styles.deleteBtn}
                                                                onClick={() => remove(company)}
                                                            >
                                                                حذف
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

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
                component={formContent}
                sheetTitle={editing ? 'ویرایش شرکت' : 'شرکت جدید'}
                size="680px"
            />
        </Container>
    );
}
