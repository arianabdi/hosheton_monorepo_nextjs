'use client';

import React from 'react';
import { LuFolderTree } from 'react-icons/lu';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, ModalHelper } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { AccountingContextBar, useAccountingContext } from '../components/useAccountingContext';
import HelpIcon from '../components/HelpIcon';
import AccountingGuide from '../components/AccountingGuide';
import { ACCOUNTING_GUIDES } from '../components/guides';
import AccountTree from '../components/AccountTree';
import { accountingApi, AccountingAccountNode } from '../accounting-api';
import { ACCOUNT_TYPE_LABELS, AccountingAccountType } from '../accounting.utils';
import styles from '../Accounting.module.scss';

interface AccountFormState {
    code: string;
    title: string;
    type: AccountingAccountType | '';
    parentId: string;
    parentTitle: string;
    isControl: boolean;
    description: string;
}

export default function AccountingAccountsPage() {
    const context = useAccountingContext();
    const { company } = context;
    const [loading, setLoading] = React.useState(true);
    const [tree, setTree] = React.useState<AccountingAccountNode[]>([]);
    const [search, setSearch] = React.useState('');
    const [typeFilter, setTypeFilter] = React.useState('');

    // مودال ساخت حساب
    const [createOpen, setCreateOpen] = React.useState(false);
    const [form, setForm] = React.useState<AccountFormState | null>(null);
    const [saving, setSaving] = React.useState(false);

    // مودال ویرایش حساب
    const [editOpen, setEditOpen] = React.useState(false);
    const [editForm, setEditForm] = React.useState<{ id: string; title: string; isControl: boolean; description: string } | null>(null);

    const load = React.useCallback(async () => {
        if (!company?._id) {
            setTree([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const result = await accountingApi.getAccountTree(company._id);
            setTree(result?.items || []);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, [company?._id]);

    React.useEffect(() => {
        load();
    }, [load]);

    /** باز کردن مودال ساخت حساب — با یا بدون والد */
    const openCreate = async (parent?: AccountingAccountNode) => {
        if (!company) return;
        try {
            const suggested = await accountingApi.getNextAccountCode(company._id, parent?._id);
            setForm({
                code: suggested.code,
                title: '',
                type: parent ? parent.type : '',
                parentId: parent?._id || '',
                parentTitle: parent ? `${parent.code} — ${parent.title}` : 'ریشه درخت (گروه اصلی)',
                isControl: false,
                description: '',
            });
            setCreateOpen(true);
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const openCreateRoot = () => openCreate(undefined);

    const saveCreate = async () => {
        if (!company || !form) return;
        if (!form.code.trim() || !form.title.trim() || !form.type) {
            ErrorToaster(new Error('کد، نام و نوع حساب الزامی است'));
            return;
        }
        try {
            setSaving(true);
            await accountingApi.createAccount({
                companyId: company._id,
                code: form.code.trim(),
                title: form.title.trim(),
                type: form.type,
                parentId: form.parentId || null,
                isControl: form.isControl,
                description: form.description.trim() || null,
            });
            SuccessToaster({ message: 'حساب جدید ایجاد شد' });
            setCreateOpen(false);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (node: AccountingAccountNode) => {
        setEditForm({
            id: node._id,
            title: node.title,
            isControl: Boolean(node.isControl),
            description: node.description || '',
        });
        setEditOpen(true);
    };

    const saveEdit = async () => {
        if (!editForm) return;
        try {
            setSaving(true);
            await accountingApi.updateAccount(editForm.id, {
                title: editForm.title,
                isControl: editForm.isControl,
                description: editForm.description || null,
            });
            SuccessToaster({ message: 'حساب بروزرسانی شد' });
            setEditOpen(false);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const archive = async (node: AccountingAccountNode) => {
        if (!confirm(`حساب «${node.code} — ${node.title}» حذف شود؟`)) return;
        try {
            await accountingApi.archiveAccount(node._id);
            SuccessToaster({ message: 'حساب حذف/آرشیو شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    /** فیلتر محلی درخت بر اساس جستجو و نوع حساب */
    const filteredTree = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        const filterNodes = (nodes: AccountingAccountNode[]): AccountingAccountNode[] => {
            const result: AccountingAccountNode[] = [];
            for (const node of nodes) {
                const children = filterNodes(node.children || []);
                const matches =
                    (!query ||
                        node.title.toLowerCase().includes(query) ||
                        node.code.includes(query)) &&
                    (!typeFilter || node.type === typeFilter);
                if (matches || children.length > 0) {
                    result.push({ ...node, children });
                }
            }
            return result;
        };
        return filterNodes(tree);
    }, [tree, search, typeFilter]);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.page} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <div className={styles.titleRow}>
                                <h1 className={styles.mainTitle}>کدینگ حساب‌ها</h1>
                                <HelpIcon topic="accounts" />
                            </div>
                            <p className={styles.subtitle}>
                                درخت حساب‌های شرکت فعال — فقط حساب‌های معین (بدون زیرمجموعه) در اسناد قابل استفاده‌اند.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.primaryBtn} onClick={openCreateRoot} disabled={!company}>
                                + حساب جدید
                            </button>
                        </div>
                    </header>

                    <AccountingGuide guide={ACCOUNTING_GUIDES.accounts} />

                    <AccountingContextBar context={context} showFiscalYear={false} />

                    {loading || context.loading ? (
                        <LoadingState />
                    ) : !company ? (
                        <TableEmptyState
                            icon={<LuFolderTree size={28} />}
                            title="شرکتی انتخاب نشده"
                            description="برای مدیریت کدینگ حساب‌ها، ابتدا یک شرکت بسازید یا انتخاب کنید."
                            primaryLabel="مدیریت شرکت‌ها"
                            primaryHref="/accounting/companies"
                        />
                    ) : filteredTree.length === 0 ? (
                        <TableEmptyState
                            icon={<LuFolderTree size={28} />}
                            title={search ? 'حسابی با این جستجو پیدا نشد' : 'درخت حساب خالی است'}
                            description={
                                search
                                    ? 'عبارت جستجو را تغییر دهید.'
                                    : 'کدینگ پیش‌فرض هنگام ساخت شرکت ایجاد می‌شود؛ در غیر این صورت اولین گروه اصلی را اضافه کنید.'
                            }
                            primaryLabel="افزودن حساب"
                            onPrimaryClick={openCreateRoot}
                        />
                    ) : (
                        <>
                            <div className={styles.reportFilters}>
                                <div className={styles.reportFilter}>
                                    <label>جستجو (کد یا نام)</label>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="مثال: صندوق یا 1101"
                                    />
                                </div>
                                <div className={styles.reportFilter}>
                                    <label>نوع حساب</label>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                    >
                                        <option value="">همه انواع</option>
                                        {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <AccountTree
                                nodes={filteredTree}
                                onAddChild={(node) => openCreate(node)}
                                onEdit={openEdit}
                                onArchive={archive}
                            />
                        </>
                    )}
                </div>
            </Wrapper>

            {/* مودال ساخت حساب */}
            <ModalHelper
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                component={
                    form ? (
                        <div className={styles.rtl} style={{ padding: '4px' }}>
                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>۱. محل حساب در درخت</h3>
                                <p className={styles.formSectionSubtitle}>
                                    حساب جدید به‌عنوان فرزندِ حساب والد زیر ساخته می‌شود؛ کد پیشنهادی سیستم را می‌توانید تغییر دهید.
                                </p>
                                <div className={styles.rowGroup}>
                                    <div className={styles.field}>
                                        <label>حساب والد</label>
                                        <input type="text" value={form.parentTitle} disabled />
                                    </div>
                                    <div className={styles.field}>
                                        <label>کد حساب *</label>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={form.code}
                                            onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        />
                                        <span className={styles.helperText}>
                                            کد فرزند باید با کد والد شروع شود (مثلاً فرزندِ 1101 با 1101).
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>۲. مشخصات حساب</h3>
                                <div className={styles.rowGroup}>
                                    <div className={styles.field}>
                                        <label>نام حساب *</label>
                                        <input
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            placeholder="مثال: صندوق شماره ۲"
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label>نوع حساب *</label>
                                        <select
                                            value={form.type}
                                            onChange={(e) => setForm({ ...form, type: e.target.value as AccountingAccountType })}
                                        >
                                            <option value="">انتخاب کنید...</option>
                                            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        <span className={styles.helperText}>
                                            ماهیت (بدهکار/بستانکار) از روی نوع تعیین می‌شود — دارایی و هزینه: بدهکار، بقیه: بستانکار.
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.rowGroup}>
                                    <div className={`${styles.field} ${styles.fullWidth}`}>
                                        <label className={styles.checkboxRow}>
                                            <input
                                                type="checkbox"
                                                checked={form.isControl}
                                                onChange={(e) => setForm({ ...form, isControl: e.target.checked })}
                                            />
                                            <span>حساب کنترلی (تفصیلی اجباری)</span>
                                        </label>
                                        <span className={styles.helperText}>
                                            در حساب کنترلی، ثبت سند مستلزم انتخاب تفصیلی است (در فازهای بعدی ماژول).
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <h3 className={styles.formSectionTitle}>۳. توضیحات (اختیاری)</h3>
                                <div className={styles.rowGroup}>
                                    <div className={`${styles.field} ${styles.fullWidth}`}>
                                        <input
                                            type="text"
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            placeholder="توضیح دلخواه درباره کاربرد این حساب"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" className={styles.primaryBtn} disabled={saving} onClick={saveCreate}>
                                    {saving ? 'در حال ذخیره...' : 'ایجاد حساب'}
                                </button>
                                <button type="button" className={styles.secondaryBtn} onClick={() => setCreateOpen(false)}>
                                    انصراف
                                </button>
                            </div>
                        </div>
                    ) : null
                }
                sheetTitle="حساب جدید"
                size="640px"
            />

            {/* مودال ویرایش حساب */}
            <ModalHelper
                open={editOpen}
                onClose={() => setEditOpen(false)}
                component={
                    editForm ? (
                        <div className={styles.rtl} style={{ padding: '4px' }}>
                            <div className={styles.formGrid}>
                                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                    <label>نام حساب *</label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.checkboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={editForm.isControl}
                                            onChange={(e) => setEditForm({ ...editForm, isControl: e.target.checked })}
                                        />
                                        <span>حساب کنترلی (تفصیلی اجباری)</span>
                                    </label>
                                </div>
                                <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                                    <label>توضیحات</label>
                                    <input
                                        type="text"
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p className={styles.subtitle} style={{ marginTop: '0.7rem' }}>
                                ⓘ کد و نوع حساب پس از ساخت قابل تغییر نیست تا ارتباط اسناد حفظ شود.
                            </p>
                            <div className={styles.headerActions} style={{ marginTop: '0.8rem' }}>
                                <button type="button" className={styles.primaryBtn} disabled={saving} onClick={saveEdit}>
                                    {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                                </button>
                                <button type="button" className={styles.secondaryBtn} onClick={() => setEditOpen(false)}>
                                    انصراف
                                </button>
                            </div>
                        </div>
                    ) : null
                }
                sheetTitle="ویرایش حساب"
                size="560px"
            />
        </Container>
    );
}
