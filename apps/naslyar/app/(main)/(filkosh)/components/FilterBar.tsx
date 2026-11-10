'use client';

import React from 'react';
import {toFarsiNumber} from '@my-workspace/utils';
import styles from '../Filkosh.module.scss';

export interface FilkoshFilterField {
    key: string;
    label: string;
    type: 'search' | 'select';
    placeholder?: string;
    options?: {value: string; label: string}[];
    allLabel?: string;
}

interface FilterBarProps {
    fields: FilkoshFilterField[];
    values: Record<string, string>;
    onChange: (key: string, value: string) => void;
    onApply?: () => void;
    onReset?: () => void;
    resultCount?: number;
    resultLabel?: string;
    children?: React.ReactNode;
    compact?: boolean;
}

export default function FilterBar({
    fields,
    values,
    onChange,
    onApply,
    onReset,
    resultCount,
    resultLabel = 'مورد',
    children,
    compact = false,
}: FilterBarProps) {
    const hasApplied = fields.some((field) => !!values[field.key]?.trim());

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            onApply?.();
        }
    };

    const actions = (
        <div className={`${styles.filterActions} ${compact ? styles.filterActionsCompact : ''}`}>
            {typeof resultCount === 'number' ? (
                <span className={`${styles.resultCount} ${compact ? styles.resultCountCompact : ''}`}>
                    {toFarsiNumber(resultCount)} {resultLabel}
                </span>
            ) : (
                <span />
            )}
            <div className={styles.filterActionBtns}>
                {children}
                {hasApplied && onReset ? (
                    <button
                        type="button"
                        className={`${styles.resetBtn} ${compact ? styles.resetBtnCompact : ''}`}
                        onClick={onReset}
                    >
                        حذف فیلترها
                    </button>
                ) : null}
                {!compact && onApply ? (
                    <button type="button" className={styles.primaryBtn} onClick={onApply}>
                        اعمال فیلتر
                    </button>
                ) : null}
            </div>
        </div>
    );

    return (
        <div className={`${styles.filterContainer} ${compact ? styles.filterContainerCompact : ''}`}>
            <div className={`${styles.filterGrid} ${compact ? styles.filterGridCompact : ''}`}>
                {fields.map((field) => (
                    <div
                        key={field.key}
                        className={`${styles.filterItem} ${compact ? styles.filterItemCompact : ''}`}
                    >
                        <label htmlFor={`filkosh-filter-${field.key}`}>{field.label}</label>
                        {field.type === 'search' ? (
                            <input
                                id={`filkosh-filter-${field.key}`}
                                type="text"
                                className={`${styles.filterInput} ${compact ? styles.filterInputCompact : ''}`}
                                placeholder={field.placeholder || 'جستجو...'}
                                value={values[field.key] || ''}
                                onChange={(e) => onChange(field.key, e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        ) : (
                            <select
                                id={`filkosh-filter-${field.key}`}
                                className={`${styles.filterSelect} ${compact ? styles.filterSelectCompact : ''}`}
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
                        )}
                    </div>
                ))}
                {compact ? actions : null}
            </div>
            {compact ? null : actions}
        </div>
    );
}
