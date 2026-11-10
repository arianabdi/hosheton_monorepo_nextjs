'use client';

import React from 'react';
import styles from '../AssetManagement.module.scss';

export interface FilterFieldConfig {
    /** کلید فیلتر — با values و onChange سراسری کار می‌کند */
    key: string;
    type: 'search' | 'select';
    placeholder?: string;
    /** برای select */
    options?: { value: string; label: string }[];
    /** عبارت گزینه «همه» — پیش‌فرض «همه»؛ رشته خالی یعنی بدون فیلتر */
    allLabel?: string;
    /** عرض دلخواه select */
    minWidth?: number;
}

interface FilterBarProps {
    fields: FilterFieldConfig[];
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
    /** ریست همه فیلترها — اگر ندهید دکمه ریست نشان داده نمی‌شود */
    onReset?: () => void;
    /** تعداد نتایج برای نمایش کنار فیلترها */
    resultCount?: number;
    resultLabel?: string;
    /** محتوای اضافی سمت راست toolbar (مثلاً دکمه) */
    children?: React.ReactNode;
}

/**
 * نوار فیلتر مشترک ماژول مدیریت اموال — یک بار تعریف می‌شود و در همه
 * صفحات لیست (دارایی‌ها، گروه‌ها، محل‌ها و ...) با کانفیگ استفاده می‌شود
 * تا کد فیلتر در هیچ صفحه‌ای تکرار نشود.
 */
export default function FilterBar({
    fields,
    values,
    onChange,
    onReset,
    resultCount,
    resultLabel = 'مورد',
    children,
}: FilterBarProps) {
    const hasValue = (field: FilterFieldConfig) => !!values[field.key]?.trim();
    const showReset = !!onReset && fields.some(hasValue);

    return (
        <div className={styles.toolbar}>
            {fields.map((field) => {
                if (field.type === 'search') {
                    return (
                        <input
                            key={field.key}
                            type="text"
                            className={styles.searchInput}
                            placeholder={field.placeholder || 'جستجو...'}
                            value={values[field.key] || ''}
                            onChange={(e) => onChange(field.key, e.target.value)}
                        />
                    );
                }
                return (
                    <select
                        key={field.key}
                        className={styles.selectInput}
                        style={field.minWidth ? { minWidth: field.minWidth } : undefined}
                        value={values[field.key] || ''}
                        onChange={(e) => onChange(field.key, e.target.value)}
                    >
                        <option value="">{field.allLabel || 'همه'}</option>
                        {(field.options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            })}

            {showReset ? (
                <button type="button" className={styles.resetBtn} onClick={onReset}>
                    حذف فیلترها ✕
                </button>
            ) : null}

            {typeof resultCount === 'number' ? (
                <span className={styles.resultCount}>
                    {resultCount.toLocaleString('fa-IR')} {resultLabel}
                </span>
            ) : null}

            {children}
        </div>
    );
}
