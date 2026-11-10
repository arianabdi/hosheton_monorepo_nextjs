'use client';

import type { ReactNode } from 'react';
import { TbFilterOff } from 'react-icons/tb';
import { Pagination } from '@my-workspace/components';
import type { UrlTableState } from '@/app/hooks/useUrlTableState';
import { formatCount } from '@/app/(main)/error-tracking/lib/format';
import styles from '@/app/(main)/error-tracking/ErrorTracking.module.scss';

/** Panel around one table: title + «به چه درد می‌خورد / چطور استفاده کنم» + toolbar (same as error-tracking coverage). */
export function TablePanel({
    icon,
    title,
    purpose,
    howTo,
    toolbar,
    children,
}: {
    icon: ReactNode;
    title: string;
    purpose: ReactNode;
    howTo: ReactNode;
    toolbar: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={styles.panel}>
            <h3 className={styles.panelTitle}>{icon}{title}</h3>
            <div className={styles.panelGuide}>
                <p><strong>به چه درد می‌خورد؟</strong> {purpose}</p>
                <p><strong>چطور استفاده کنم؟</strong> {howTo}</p>
            </div>
            <div className={styles.tableToolbar}>{toolbar}</div>
            {children}
        </section>
    );
}

/** Empty states («داده‌ای نیست» vs «با این فیلتر چیزی نیست») and faded rows while refreshing. */
export function TableBody({
    loading,
    empty,
    filtered,
    onReset,
    emptyText,
    children,
}: {
    loading: boolean;
    empty: boolean;
    filtered: boolean;
    onReset: () => void;
    emptyText: ReactNode;
    children: ReactNode;
}) {
    if (empty) {
        return (
            <div className={styles.tableEmpty}>
                {loading ? 'در حال بارگذاری…' : filtered ? 'موردی با این جستجو/فیلتر پیدا نشد.' : emptyText}
                {!loading && filtered ? (
                    <button type="button" className={styles.linkBtn} onClick={onReset}>
                        <TbFilterOff size={14} /> حذف فیلترها
                    </button>
                ) : null}
            </div>
        );
    }
    return <div className={`${styles.tableWrap} ${styles.tableWrapFlat} ${loading ? styles.tableLoading : ''}`}>{children}</div>;
}

export function TableFooter({ table, total }: { table: UrlTableState; total: number }) {
    if (total <= table.limitOptions[0]) return null;
    return (
        <div className={styles.tablePagination}>
            <Pagination
                rtl
                itemPerPage={table.limit}
                currentPage={table.page}
                totalItems={total}
                setRowsPerPage={table.setLimit}
                paginate={table.setPage}
                rowsPerPageOptions={table.limitOptions}
            />
        </div>
    );
}

export function TotalLabel({ total, unit }: { total: number; unit: string }) {
    return <span className={styles.toolbarCount}>{formatCount(total)} {unit}</span>;
}
