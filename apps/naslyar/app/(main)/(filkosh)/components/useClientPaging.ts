'use client';

import {useCallback, useMemo, useState} from 'react';

export function useClientPaging<T>(items: T[], defaultPerPage = 10) {
    const [itemPerPage, setItemPerPage] = useState(defaultPerPage);
    const [currentPage, setCurrentPage] = useState(1);

    const totalItems = items.length;
    const maxPage = Math.max(1, Math.ceil(totalItems / itemPerPage) || 1);
    const safePage = Math.min(currentPage, maxPage);

    const pageItems = useMemo(() => {
        const start = (safePage - 1) * itemPerPage;
        return items.slice(start, start + itemPerPage);
    }, [items, safePage, itemPerPage]);

    const setRowsPerPage = useCallback((rows: number) => {
        setItemPerPage(rows);
        setCurrentPage(1);
    }, []);

    const paginate = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const resetPage = useCallback(() => {
        setCurrentPage(1);
    }, []);

    return {
        itemPerPage,
        currentPage: safePage,
        totalItems,
        pageItems,
        setRowsPerPage,
        paginate,
        resetPage,
    };
}
