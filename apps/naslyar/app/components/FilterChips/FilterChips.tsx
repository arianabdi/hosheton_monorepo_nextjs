'use client';

import { useState, type ReactNode } from 'react';
import { LuCheck, LuChevronDown, LuFilterX, LuX } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import styles from './FilterChips.module.scss';

export interface FilterChipOption {
    value: string;
    label: string;
    /** یک خط توضیح زیر گزینه */
    hint?: string;
}

export interface FilterChipDef {
    id: string;
    label: string;
    icon?: ReactNode;
    /** مقدار فعلی؛ '' = بدون فیلتر */
    value: string;
    /** متن چیپ وقتی فیلتر خالی است (مثلاً «همه کلاس‌ها») */
    allLabel: string;
    options: FilterChipOption[];
}

/**
 * نوار فیلتر چیپی: هر فیلتر یک چیپ «برچسب: مقدار» است که با کلیک یک popup کوچک باز می‌کند؛
 * ✕ روی چیپ فعال همان فیلتر را پاک می‌کند. شمارنده و «پاک کردن همه» سمت دیگر نوار است.
 */
export default function FilterChips({
    filters,
    onChange,
    onClearAll,
    summary,
    className,
}: {
    filters: FilterChipDef[];
    onChange: (id: string, value: string) => void;
    onClearAll: () => void;
    /** مثلاً «۲۴ مدل» */
    summary?: ReactNode;
    className?: string;
}) {
    const [open, setOpen] = useState<{ id: string; anchor: HTMLElement } | null>(null);
    const activeCount = filters.filter((filter) => filter.value).length;
    const current = open ? filters.find((filter) => filter.id === open.id) : undefined;

    const pick = (id: string, value: string) => {
        onChange(id, value);
        setOpen(null);
    };

    return (
        <section className={`${styles.bar} ${className || ''}`} aria-label="فیلترها">
            <div className={styles.chips}>
                {filters.map((filter) => {
                    const active = Boolean(filter.value);
                    const display = active
                        ? filter.options.find((option) => option.value === filter.value)?.label || filter.value
                        : filter.allLabel;
                    return (
                        <div key={filter.id} className={`${styles.chip} ${active ? styles.chipActive : ''}`}>
                            <button
                                type="button"
                                className={styles.chipMain}
                                aria-haspopup="dialog"
                                aria-expanded={open?.id === filter.id}
                                onClick={(event) => setOpen({ id: filter.id, anchor: event.currentTarget.parentElement || event.currentTarget })}
                            >
                                {filter.icon}
                                <span className={styles.chipLabel}>{filter.label}</span>
                                <span className={styles.chipValue}>{display}</span>
                                <LuChevronDown className={styles.chipCaret} aria-hidden />
                            </button>
                            {active ? (
                                <button
                                    type="button"
                                    className={styles.chipClear}
                                    aria-label={`حذف فیلتر ${filter.label}`}
                                    onClick={() => onChange(filter.id, '')}
                                >
                                    <LuX />
                                </button>
                            ) : null}
                        </div>
                    );
                })}
            </div>
            <div className={styles.summary}>
                {summary ? <span>{summary}</span> : null}
                {activeCount ? (
                    <button type="button" className={styles.reset} onClick={onClearAll}>
                        <LuFilterX /> پاک کردن {activeCount > 1 ? 'همه' : 'فیلتر'}
                    </button>
                ) : null}
            </div>

            <ModalHelper
                open={Boolean(open)}
                onClose={() => setOpen(null)}
                type="popup"
                targetElement={open?.anchor}
                popupPlacement="below"
                popupWidth="anchor"
                height={60}
                sheetTitle={current?.label || 'فیلتر'}
                component={current ? (
                    <div className={styles.panel}>
                        <h4 className={styles.panelTitle}>{current.label}</h4>
                        <div className={styles.options} role="listbox">
                            {[{ value: '', label: current.allLabel }, ...current.options].map((option) => {
                                const selected = current.value === option.value;
                                return (
                                    <button
                                        key={option.value || 'all'}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        className={`${styles.option} ${selected ? styles.optionActive : ''}`}
                                        onClick={() => pick(current.id, option.value)}
                                    >
                                        <span className={styles.optionText}>
                                            <strong>{option.label}</strong>
                                            {'hint' in option && option.hint ? <small>{option.hint}</small> : null}
                                        </span>
                                        {selected ? <LuCheck className={styles.optionCheck} aria-hidden /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            />
        </section>
    );
}
