'use client';

import React from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { ErrorToaster, MoneySeparator, toFarsiNumber } from '@my-workspace/utils';
import type { AccountingAccount, AccountingVoucherEntry, VoucherPayloadEntry } from '../accounting-api';
import {
    computeVoucherTotals,
    validateVoucherRows,
    VoucherRowInput,
} from '../accounting.utils';
import { isoToJalaliString, jalaliStringToIso, todayTehranIso } from '../jalali.client';
import styles from '../Accounting.module.scss';

export interface VoucherFormInitial {
    date?: string;
    description?: string;
    entries?: AccountingVoucherEntry[];
}

interface VoucherFormProps {
    accounts: AccountingAccount[];
    initial?: VoucherFormInitial;
    submitting: boolean;
    submitLabel?: string;
    onSubmit: (payload: { date: string; description: string; entries: VoucherPayloadEntry[] }) => void | Promise<void>;
    onCancel?: () => void;
}

interface RowState {
    accountId: string;
    description: string;
    debit: string;
    credit: string;
}

const emptyRow = (): RowState => ({ accountId: '', description: '', debit: '', credit: '' });

/**
 * فرم ثبت/ویرایش سند حسابداری با کنترل لحظه‌ای توازن بدهکار/بستانکار
 */
export default function VoucherForm({
    accounts,
    initial,
    submitting,
    submitLabel = 'ذخیره پیش‌نویس',
    onSubmit,
    onCancel,
}: VoucherFormProps) {
    const [dateJalali, setDateJalali] = React.useState(
        () => initial?.date ? isoToJalaliString(initial.date) : isoToJalaliString(todayTehranIso()),
    );
    const [description, setDescription] = React.useState(initial?.description || '');
    const [rows, setRows] = React.useState<RowState[]>(() => {
        if (initial?.entries?.length) {
            return initial.entries.map((entry) => ({
                accountId: entry.accountId,
                description: entry.description || '',
                debit: entry.debit ? String(entry.debit) : '',
                credit: entry.credit ? String(entry.credit) : '',
            }));
        }
        return [emptyRow(), emptyRow()];
    });

    const totals = React.useMemo(() => computeVoucherTotals(rows as VoucherRowInput[]), [rows]);
    const validationError = React.useMemo(() => validateVoucherRows(rows as VoucherRowInput[]), [rows]);

    const updateRow = (index: number, patch: Partial<RowState>) => {
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const handleSubmit = async () => {
        const iso = jalaliStringToIso(dateJalali);
        if (!iso) {
            ErrorToaster(new Error('تاریخ سند نامعتبر است — قالب صحیح: 1405/04/12'));
            return;
        }
        if (validationError) {
            ErrorToaster(new Error(validationError));
            return;
        }
        await onSubmit({
            date: iso,
            description: description.trim(),
            entries: rows
                .filter((row) => row.accountId)
                .map((row) => ({
                    accountId: row.accountId,
                    description: row.description.trim() || null,
                    debit: Number(row.debit.replace(/[,٬\s]/g, '')) || 0,
                    credit: Number(row.credit.replace(/[,٬\s]/g, '')) || 0,
                })),
        });
    };

    return (
        <div className={styles.formLayout}>
            <div className={styles.formMain}>
                <div className={styles.formSection}>
                    <h3 className={styles.formSectionTitle}>
                        <span className={styles.formSectionIcon}>🧾</span>
                        ۱. اطلاعات سرسند
                    </h3>
                    <p className={styles.formSectionSubtitle}>
                        تاریخ سند باید داخل سال مالی انتخابی باشد؛ شرح خوب، یافتن سند را در گزارش‌ها آسان می‌کند.
                    </p>
                    <div className={styles.rowGroup}>
                        <div className={styles.field}>
                            <label>تاریخ سند (شمسی) *</label>
                            <input
                                type="text"
                                dir="ltr"
                                placeholder="1405/04/12"
                                value={dateJalali}
                                onChange={(e) => setDateJalali(e.target.value)}
                            />
                            <span className={styles.helperText}>قالب: 1405/04/12</span>
                        </div>
                        <div className={styles.field}>
                            <label>شرح سند *</label>
                            <input
                                type="text"
                                placeholder="مثال: فروش نقدی طبق فاکتور ۲۴۵"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.formSection}>
                    <h3 className={styles.formSectionTitle}>
                        <span className={styles.formSectionIcon}>⚖️</span>
                        ۲. ردیف‌های بدهکار / بستانکار
                    </h3>
                    <p className={styles.formSectionSubtitle}>
                        برای هر ردیف مبلغ را فقط در یکی از دو ستون بدهکار یا بستانکار وارد کنید. حداقل دو ردیف لازم است.
                    </p>
                    <div className={styles.tableWrapper} style={{ marginTop: 0 }}>
                        <table className={styles.entriesTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: '30%' }}>حساب معین</th>
                                    <th>شرح ردیف</th>
                                    <th style={{ width: '15%' }}>بدهکار</th>
                                    <th style={{ width: '15%' }}>بستانکار</th>
                                    <th style={{ width: '44px' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={index}>
                                        <td>
                                            <select
                                                value={row.accountId}
                                                onChange={(e) => updateRow(index, { accountId: e.target.value })}
                                            >
                                                <option value="">انتخاب حساب...</option>
                                                {accounts.map((account) => (
                                                    <option key={account._id} value={account._id}>
                                                        {account.code} — {account.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={row.description}
                                                onChange={(e) => updateRow(index, { description: e.target.value })}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                dir="ltr"
                                                placeholder="0"
                                                value={row.debit}
                                                onChange={(e) => updateRow(index, { debit: e.target.value, credit: '' })}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                dir="ltr"
                                                placeholder="0"
                                                value={row.credit}
                                                onChange={(e) => updateRow(index, { credit: e.target.value, debit: '' })}
                                            />
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={styles.deleteBtn}
                                                title="حذف ردیف"
                                                disabled={rows.length <= 2}
                                                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                                            >
                                                <LuTrash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '0.6rem' }}>
                        <button type="button" className={styles.secondaryBtn} onClick={() => setRows((prev) => [...prev, emptyRow()])}>
                            <LuPlus size={14} style={{ verticalAlign: '-2px' }} /> افزودن ردیف
                        </button>
                    </div>

                    <div className={`${styles.balanceBar} ${totals.isBalanced ? styles.balanceOk : styles.balanceBad}`}>
                        <span>جمع بدهکار: {toFarsiNumber(MoneySeparator(totals.totalDebit))}</span>
                        <span>جمع بستانکار: {toFarsiNumber(MoneySeparator(totals.totalCredit))}</span>
                        {totals.difference !== 0 && (
                            <span>اختلاف: {toFarsiNumber(MoneySeparator(Math.abs(totals.difference)))}</span>
                        )}
                        <span style={{ marginRight: 'auto' }}>
                            {totals.isBalanced ? '✓ سند متوازن است' : 'سند هنوز متوازن نیست'}
                        </span>
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button type="button" className={styles.primaryBtn} disabled={submitting || !totals.isBalanced} onClick={handleSubmit}>
                        {submitting ? 'در حال ذخیره...' : submitLabel}
                    </button>
                    {onCancel && (
                        <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
                            انصراف
                        </button>
                    )}
                </div>
            </div>

            <aside className={styles.formSidebar}>
                <div className={styles.sidebarCard}>
                    <h3>✅ قواعد اعتبارسنجی سند</h3>
                    <ul>
                        <li>هر ردیف فقط در یکی از دو ستون بدهکار یا بستانکار مقدار می‌گیرد.</li>
                        <li>مبلغ صفر یا منفی مجاز نیست.</li>
                        <li>جمع بدهکار باید دقیقاً با جمع بستانکار برابر شود.</li>
                        <li>فقط حساب‌های معین (بدون زیرمجموعه) قابل انتخاب هستند.</li>
                    </ul>
                </div>
                <div className={styles.sidebarCard}>
                    <h3>💡 نکته</h3>
                    <p>
                        سند ذخیره‌شده «پیش‌نویس» است و در گزارش‌های مالی اثری ندارد؛ پس از بازبینی، از صفحه جزئیات سند
                        آن را «ثبت قطعی» کنید تا شماره بگیرد.
                    </p>
                </div>
            </aside>
        </div>
    );
}
