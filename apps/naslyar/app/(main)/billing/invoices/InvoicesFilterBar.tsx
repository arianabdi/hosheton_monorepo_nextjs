'use client';

import React, { useId } from 'react';
import { TbFilter } from 'react-icons/tb';
import { toFarsiNumber } from '@my-workspace/utils';
import styles from './InvoicesFilterBar.module.scss';
import UserFilterField from '@/app/(main)/users/UserFilterField';
import type { AdminUserListItem } from '@/app/(main)/users/user-list-api';
import { formatAdminUserLabel } from '@/app/(main)/users/user-list-api';
import {
    countActiveInvoiceFilterDimensions,
    DEFAULT_INVOICE_FILTERS,
    getInvoiceFilterChips,
    hasActiveInvoiceFilters,
    InvoiceListFilters,
} from './invoices-filter.utils';
import { INVOICE_PURPOSE_LABEL, INVOICE_TYPE_LABEL } from './invoice-labels';

interface InvoicesFilterBarProps {
    filters: InvoiceListFilters;
    onChange: (next: InvoiceListFilters) => void;
    filteredCount: number;
    totalCount: number;
    filterSelectedUser: AdminUserListItem | null;
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'همه وضعیت‌ها' },
    { value: 'pending', label: 'در انتظار پرداخت' },
    { value: 'paid', label: 'پرداخت شده' },
    { value: 'failed', label: 'ناموفق' },
    { value: 'canceled', label: 'لغو شده' },
    { value: 'expired', label: 'منقضی شده' },
    { value: 'awaiting_receipt', label: 'منتظر رسید' },
    { value: 'awaiting_review', label: 'در انتظار بررسی' },
    { value: 'rejected', label: 'رد شده' },
];

const TYPE_OPTIONS = [
    { value: 'all', label: 'همه انواع' },
    ...Object.entries(INVOICE_TYPE_LABEL).map(([value, label]) => ({ value, label })),
];

const PURPOSE_OPTIONS = [
    { value: 'all', label: 'همه منابع' },
    ...Object.entries(INVOICE_PURPOSE_LABEL).map(([value, label]) => ({ value, label })),
];

export default function InvoicesFilterBar({
    filters,
    onChange,
    filteredCount,
    totalCount,
    filterSelectedUser,
}: InvoicesFilterBarProps) {
    const searchId = useId();
    const activeDims = countActiveInvoiceFilterDimensions(filters);
    const userChipLabel = filterSelectedUser ? formatAdminUserLabel(filterSelectedUser) : undefined;
    const chips = getInvoiceFilterChips(filters, { userLabel: userChipLabel });
    const showReset = hasActiveInvoiceFilters(filters);

    const clearChip = (key: keyof InvoiceListFilters) => {
        if (key === 'status' || key === 'type' || key === 'purpose') {
            onChange({ ...filters, [key]: 'all' });
        } else {
            onChange({ ...filters, [key]: '' });
        }
    };

    return (
        <section className={styles.panel} aria-label="فیلتر فاکتورها">
            <div className={styles.panelHead}>
                <div className={styles.headTitle}>
                    <span className={styles.headIcon} aria-hidden>
                        <TbFilter size={18} />
                    </span>
                    <div>
                        <h2 className={styles.title}>فیلتر و جستجو</h2>
                        <p className={styles.subtitle}>
                            ابتدا همه فاکتورها نمایش داده می‌شوند؛ در صورت نیاز فیلتر کنید.
                        </p>
                    </div>
                </div>
                <div className={styles.headMeta}>
                    <div className={styles.resultPill}>
                        <strong>{toFarsiNumber(String(filteredCount))}</strong>
                        <span>از {toFarsiNumber(String(totalCount))} فاکتور</span>
                    </div>
                    {activeDims > 0 ? (
                        <span className={styles.filterBadge}>{toFarsiNumber(String(activeDims))} فیلتر فعال</span>
                    ) : null}
                </div>
            </div>

            <div className={styles.searchRow}>
                <div className={styles.searchBox}>
                    <input
                        id={searchId}
                        type="search"
                        placeholder="جستجو در نام، ایمیل، توضیح…"
                        value={filters.query}
                        onChange={e => onChange({ ...filters, query: e.target.value })}
                    />
                </div>
            </div>

            <div className={styles.grid}>
                <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor={`${searchId}-status`}>وضعیت</label>
                    <div className={styles.selectShell}>
                        <select
                            id={`${searchId}-status`}
                            className={styles.select}
                            value={filters.status}
                            onChange={e => onChange({ ...filters, status: e.target.value })}
                        >
                            {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor={`${searchId}-type`}>نوع فاکتور</label>
                    <div className={styles.selectShell}>
                        <select
                            id={`${searchId}-type`}
                            className={styles.select}
                            value={filters.type}
                            onChange={e => onChange({ ...filters, type: e.target.value })}
                        >
                            {TYPE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor={`${searchId}-purpose`}>منبع / purpose</label>
                    <div className={styles.selectShell}>
                        <select
                            id={`${searchId}-purpose`}
                            className={styles.select}
                            value={filters.purpose}
                            onChange={e => onChange({ ...filters, purpose: e.target.value })}
                        >
                            {PURPOSE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>کاربر</label>
                    <UserFilterField
                        selectedUser={filterSelectedUser}
                        onSelect={user => onChange({ ...filters, userId: user?._id ?? '' })}
                    />
                </div>
            </div>

            {chips.length > 0 ? (
                <div className={styles.chipsRow}>
                    {chips.map(chip => (
                        <span key={chip.key} className={styles.chip}>
                            {chip.label}
                            <button type="button" aria-label="حذف فیلتر" onClick={() => clearChip(chip.key)}>×</button>
                        </span>
                    ))}
                </div>
            ) : null}

            <div className={styles.footer}>
                <span className={styles.hint}>فیلتر فقط روی لیست بارگذاری‌شده اعمال می‌شود (سمت مرورگر).</span>
                {showReset ? (
                    <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() => onChange({ ...DEFAULT_INVOICE_FILTERS })}
                    >
                        پاک کردن فیلترها
                    </button>
                ) : null}
            </div>
        </section>
    );
}
