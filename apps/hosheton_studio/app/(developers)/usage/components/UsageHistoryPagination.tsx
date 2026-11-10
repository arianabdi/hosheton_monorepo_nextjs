'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './UsageHistoryPagination.module.scss';

export interface UsageHistoryPaginationProps {
    itemPerPage: number;
    currentPage: number;
    totalItems: number;
    setRowsPerPage: (rows: number) => void;
    paginate: (pageNumber: number) => void;
}

const PER_PAGE_OPTIONS = [10, 25, 50];

export function UsageHistoryPagination({
    itemPerPage,
    currentPage,
    totalItems,
    setRowsPerPage,
    paginate,
}: UsageHistoryPaginationProps) {
    const { t, i18n } = useTranslation('common');
    const { t: tu } = useTranslation('usage');
    const rtl = i18n.dir() === 'rtl';
    const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 0) / Math.max(itemPerPage, 1)));
    const [pageInput, setPageInput] = useState(String(currentPage));

    useEffect(() => {
        setPageInput(String(currentPage));
    }, [currentPage]);

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemPerPage + 1;
    const endItem = Math.min(currentPage * itemPerPage, totalItems);

    const pageItems = useMemo(() => {
        const items: (number | 'ellipsis')[] = [];
        if (totalPages <= 1) return [1];

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) items.push(i);
            return items;
        }

        if (currentPage <= 3) {
            for (let i = 1; i <= 3; i++) items.push(i);
            items.push('ellipsis', totalPages);
        } else if (currentPage >= totalPages - 2) {
            items.push(1, 'ellipsis');
            for (let i = totalPages - 2; i <= totalPages; i++) items.push(i);
        } else {
            items.push(1, 'ellipsis', currentPage, 'ellipsis', totalPages);
        }
        return items;
    }, [currentPage, totalPages]);

    const goTo = (page: number) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            paginate(page);
        }
    };

    const commitPageInput = () => {
        const n = Number(pageInput);
        if (!Number.isFinite(n)) {
            setPageInput(String(currentPage));
            return;
        }
        const clamped = Math.min(totalPages, Math.max(1, Math.round(n)));
        setPageInput(String(clamped));
        goTo(clamped);
    };

    if (totalItems <= 0) return null;

    const PrevIcon = rtl ? FiChevronRight : FiChevronLeft;
    const NextIcon = rtl ? FiChevronLeft : FiChevronRight;

    return (
        <nav className={styles.root} aria-label={tu('pagination')}>
            <span className={styles.range}>
                {t('range_of', {
                    start: formatAppNumber(startItem, i18n.language),
                    end: formatAppNumber(endItem, i18n.language),
                    total: formatAppNumber(totalItems, i18n.language),
                })}
            </span>

            <div className={styles.perPage} role="group" aria-label={t('per_page')}>
                {PER_PAGE_OPTIONS.map((n) => (
                    <button
                        key={n}
                        type="button"
                        className={`${styles.perPageBtn} ${itemPerPage === n ? styles.perPageBtnActive : ''}`}
                        onClick={() => {
                            if (n !== itemPerPage) setRowsPerPage(n);
                        }}
                        aria-pressed={itemPerPage === n}
                    >
                        {formatAppNumber(n, i18n.language)}
                    </button>
                ))}
            </div>

            <div className={styles.controls}>
                <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => goTo(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label={t('prev_page')}
                >
                    <PrevIcon size={14} aria-hidden />
                </button>

                <div className={styles.pages}>
                    {pageItems.map((item, index) =>
                        item === 'ellipsis' ? (
                            <span key={`e-${index}`} className={styles.ellipsis} aria-hidden>
                                …
                            </span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                className={`${styles.pageBtn} ${item === currentPage ? styles.active : ''}`}
                                onClick={() => goTo(item)}
                                aria-current={item === currentPage ? 'page' : undefined}
                                aria-label={t('page_n', { page: formatAppNumber(item, i18n.language) })}
                            >
                                {formatAppNumber(item, i18n.language)}
                            </button>
                        ),
                    )}
                </div>

                <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => goTo(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label={t('next_page')}
                >
                    <NextIcon size={14} aria-hidden />
                </button>
            </div>

            <label className={styles.goto}>
                <span>{t('page')}</span>
                <input
                    type="number"
                    min={1}
                    max={totalPages}
                    inputMode="numeric"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={commitPageInput}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            commitPageInput();
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    aria-label={t('go_to_page')}
                />
                <span className={styles.gotoTotal}>/ {formatAppNumber(totalPages, i18n.language)}</span>
            </label>
        </nav>
    );
}
