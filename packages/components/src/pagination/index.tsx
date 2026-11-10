'use client';

import React, { useMemo, useState } from 'react';
import styles from './pagination.module.scss';

export interface PaginationProps {
    itemPerPage: number;
    currentPage: number;
    totalItems: number;
    setRowsPerPage: (rows: number) => void;
    paginate: (pageNumber: number) => void;
    rtl?: boolean;
    className?: string;
    /** گزینه‌های «تعداد در صفحه» — پیش‌فرض [10, 25, 50, 100] (مقدار فعلی همیشه اضافه می‌شود) */
    rowsPerPageOptions?: number[];
    /** پنهان کردن انتخاب «تعداد در صفحه» */
    hideRowsPerPage?: boolean;
    /** همهٔ اجزا (بازه، صفحه‌ها، ابزارها) در یک ردیف — حتی در موبایل؛ شمارهٔ صفحه‌ها در صورت کمبود جا اسکرول افقی می‌گیرد */
    singleRow?: boolean;
}

const DEFAULT_OPTIONS = [10, 25, 50, 100];
/** تعداد صفحه‌های کنار صفحه فعلی */
const SIBLINGS = 1;

const toFa = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

type PageItem = number | 'gap-start' | 'gap-end';

/** ۱ … ۴ ۵ ۶ … ۲۰ — طول ثابت تا دکمه‌ها هنگام ورق زدن جابه‌جا نشوند */
function buildItems(current: number, total: number): PageItem[] {
    const slots = SIBLINGS * 2 + 5; // اول، آخر، فعلی، همسایه‌ها و دو جای خالی
    if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1);

    const left = Math.max(current - SIBLINGS, 1);
    const right = Math.min(current + SIBLINGS, total);
    const showStartGap = left > 3;
    const showEndGap = right < total - 2;
    const edgeCount = 3 + SIBLINGS * 2;

    if (!showStartGap && showEndGap) {
        return [...Array.from({ length: edgeCount }, (_, i) => i + 1), 'gap-end', total];
    }
    if (showStartGap && !showEndGap) {
        return [1, 'gap-start', ...Array.from({ length: edgeCount }, (_, i) => total - edgeCount + 1 + i)];
    }
    return [1, 'gap-start', ...Array.from({ length: right - left + 1 }, (_, i) => left + i), 'gap-end', total];
}

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
);

export const Pagination: React.FC<PaginationProps> = ({
    itemPerPage,
    currentPage,
    totalItems,
    setRowsPerPage,
    paginate,
    rtl = false,
    className = '',
    rowsPerPageOptions = DEFAULT_OPTIONS,
    hideRowsPerPage = false,
    singleRow = false,
}) => {
    const safeTotal = Math.max(totalItems, 0);
    const perPage = Math.max(itemPerPage, 1);
    const totalPages = Math.max(1, Math.ceil(safeTotal / perPage));
    const page = Math.min(Math.max(currentPage, 1), totalPages);
    const num = (n: number) => (rtl ? toFa(n) : String(n));

    const [jump, setJump] = useState('');

    const items = useMemo(() => buildItems(page, totalPages), [page, totalPages]);
    const options = useMemo(
        () => Array.from(new Set([...rowsPerPageOptions, perPage])).sort((a, b) => a - b),
        [rowsPerPageOptions, perPage],
    );

    const startItem = safeTotal === 0 ? 0 : (page - 1) * perPage + 1;
    const endItem = Math.min(page * perPage, safeTotal);

    const goTo = (target: number) => {
        if (target >= 1 && target <= totalPages && target !== page) paginate(target);
    };

    const commitJump = () => {
        const n = Math.round(Number(jump.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))));
        if (Number.isFinite(n) && n > 0) goTo(Math.min(n, totalPages));
        setJump('');
    };

    const t = rtl
        ? { prev: 'صفحه قبل', next: 'صفحه بعد', of: 'از', page: 'صفحه', perPage: 'در هر صفحه', jump: 'برو به' }
        : { prev: 'Previous page', next: 'Next page', of: 'of', page: 'Page', perPage: 'per page', jump: 'Go to' };

    return (
        <nav
            className={[styles.pagination, singleRow ? styles.singleRow : '', className].filter(Boolean).join(' ')}
            dir={rtl ? 'rtl' : 'ltr'}
            aria-label={rtl ? 'صفحه‌بندی' : 'Pagination'}
        >
            <span className={styles.range} aria-live="polite">
                {num(startItem)}–{num(endItem)} {t.of} {num(safeTotal)}
            </span>

            {totalPages > 1 && (
                <div className={styles.pages}>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.arrow}`}
                        onClick={() => goTo(page - 1)}
                        disabled={page <= 1}
                        aria-label={t.prev}
                        title={t.prev}
                    >
                        {/* در RTL «قبل» به سمت راست اشاره می‌کند */}
                        <Chevron dir={rtl ? 'right' : 'left'} />
                    </button>

                    {items.map((item) =>
                        typeof item === 'number' ? (
                            <button
                                key={item}
                                type="button"
                                className={`${styles.btn} ${item === page ? styles.active : ''}`}
                                onClick={() => goTo(item)}
                                aria-current={item === page ? 'page' : undefined}
                                aria-label={`${t.page} ${num(item)}`}
                            >
                                {num(item)}
                            </button>
                        ) : (
                            <span key={item} className={styles.gap} aria-hidden>
                                …
                            </span>
                        ),
                    )}

                    <button
                        type="button"
                        className={`${styles.btn} ${styles.arrow}`}
                        onClick={() => goTo(page + 1)}
                        disabled={page >= totalPages}
                        aria-label={t.next}
                        title={t.next}
                    >
                        <Chevron dir={rtl ? 'left' : 'right'} />
                    </button>
                </div>
            )}

            <div className={styles.tools}>
                {totalPages > 7 && (
                    <label className={styles.jump}>
                        <span>{t.jump}</span>
                        <input
                            inputMode="numeric"
                            value={jump}
                            placeholder={num(page)}
                            onChange={(e) => setJump(e.target.value)}
                            onBlur={() => jump && commitJump()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitJump();
                                }
                            }}
                            aria-label={t.jump}
                        />
                    </label>
                )}
                {!hideRowsPerPage && (
                    <label className={styles.perPage}>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                // با تغییر اندازه صفحه همیشه به صفحه اول برگرد (حتی اگر الان صفحه ۱ هستیم)
                                paginate(1);
                            }}
                            aria-label={t.perPage}
                        >
                            {options.map((option) => (
                                <option key={option} value={option}>
                                    {num(option)}
                                </option>
                            ))}
                        </select>
                        <span>{t.perPage}</span>
                    </label>
                )}
            </div>
        </nav>
    );
};
