'use client';

import React, { useId } from 'react';
import styles from './GatewaysFilterBar.module.scss';
import { toFarsiNumber } from '@my-workspace/utils';
import {
    countGatewayFilterDimensions,
    DEFAULT_GATEWAY_FILTERS,
    GatewayListFilters,
    getGatewayFilterChips,
    hasActiveGatewayFilters,
} from './gateways-filter.utils';

interface GatewaysFilterBarProps {
    filters: GatewayListFilters;
    onChange: (next: GatewayListFilters) => void;
    filteredCount: number;
    totalCount: number;
}

type SelectFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
    const id = useId();
    return (
        <div className={styles.field}>
            <label htmlFor={id} className={styles.fieldLabel}>
                {label}
            </label>
            <div className={styles.selectShell}>
                <select
                    id={id}
                    className={styles.select}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export default function GatewaysFilterBar({
    filters,
    onChange,
    filteredCount,
    totalCount,
}: GatewaysFilterBarProps) {
    const showReset = hasActiveGatewayFilters(filters);
    const chips = getGatewayFilterChips(filters);
    const activeDims = countGatewayFilterDimensions(filters);
    const searchId = useId();

    const applyPatch = (patch: Partial<GatewayListFilters>) => {
        onChange({ ...filters, ...patch });
    };

    return (
        <section className={styles.panel} aria-label="فیلتر درگاه‌ها">
            <div className={styles.panelHead}>
                <div className={styles.headTitle}>
                    <span className={styles.headIcon} aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M4 6h16M7 12h10m-3 6h-4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </span>
                    <div>
                        <h2 className={styles.title}>فیلتر درگاه‌ها</h2>
                        <p className={styles.subtitle}>جستجو کنید یا با فیلترها نتیجه را محدود کنید</p>
                    </div>
                </div>
                <div className={styles.headMeta}>
                    <span className={styles.resultPill}>
                        <strong>{toFarsiNumber(filteredCount)}</strong>
                        <span>از {toFarsiNumber(totalCount)}</span>
                    </span>
                    {activeDims > 0 && (
                        <span className={styles.filterBadge}>{toFarsiNumber(activeDims)} فیلتر</span>
                    )}
                </div>
            </div>

            <div className={styles.searchRow}>
                <label htmlFor={searchId} className={styles.srOnly}>
                    جستجوی درگاه
                </label>
                <div className={styles.searchBox}>
                    <span className={styles.searchLead} aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </span>
                    <input
                        id={searchId}
                        type="search"
                        className={styles.searchInput}
                        placeholder="جستجو درگاه پرداخت"
                        value={filters.q}
                        onChange={(e) => applyPatch({ q: e.target.value })}
                        autoComplete="off"
                    />
                    {filters.q && (
                        <button
                            type="button"
                            className={styles.searchClear}
                            onClick={() => applyPatch({ q: '' })}
                            aria-label="پاک کردن جستجو"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.fieldsRow}>
                <SelectField
                    label="دسته پرداخت"
                    value={filters.category}
                    onChange={(category) =>
                        applyPatch({ category: category as GatewayListFilters['category'] })
                    }
                    options={[
                        { value: 'all', label: 'همه دسته‌ها' },
                        { value: 'direct', label: 'مستقیم (بانکی)' },
                        { value: 'installment', label: 'اقساطی' },
                    ]}
                />
                <SelectField
                    label="نوع درگاه"
                    value={filters.kind}
                    onChange={(kind) => applyPatch({ kind: kind as GatewayListFilters['kind'] })}
                    options={[
                        { value: 'all', label: 'همه انواع' },
                        { value: 'online', label: 'آنلاین / درگاه' },
                        { value: 'card2card', label: 'کارت‌به‌کارت' },
                    ]}
                />
                <SelectField
                    label="وضعیت فعال"
                    value={filters.active}
                    onChange={(active) => applyPatch({ active: active as GatewayListFilters['active'] })}
                    options={[
                        { value: 'all', label: 'همه' },
                        { value: 'yes', label: 'فقط فعال' },
                        { value: 'no', label: 'فقط غیرفعال' },
                    ]}
                />
                <SelectField
                    label="نمایش checkout"
                    value={filters.checkout}
                    onChange={(checkout) =>
                        applyPatch({ checkout: checkout as GatewayListFilters['checkout'] })
                    }
                    options={[
                        { value: 'all', label: 'همه' },
                        { value: 'yes', label: 'نمایش داده می‌شود' },
                        { value: 'no', label: 'مخفی' },
                    ]}
                />
            </div>

            {(chips.length > 0 || showReset) && (
                <div className={styles.footerRow}>
                    {chips.length > 0 && (
                        <div className={styles.chipList}>
                            {chips.map((chip) => (
                                <button
                                    key={chip.id}
                                    type="button"
                                    className={styles.chip}
                                    onClick={() => applyPatch(chip.patch)}
                                >
                                    <span>{chip.label}</span>
                                    <span className={styles.chipRemove} aria-hidden>
                                        ×
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    {showReset && (
                        <button
                            type="button"
                            className={styles.resetLink}
                            onClick={() => onChange({ ...DEFAULT_GATEWAY_FILTERS })}
                        >
                            بازنشانی همه
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
