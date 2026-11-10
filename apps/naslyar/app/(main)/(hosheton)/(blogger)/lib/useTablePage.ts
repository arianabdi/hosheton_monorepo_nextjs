'use client';

import { useEffect, useState } from 'react';
import { ErrorToaster } from '@my-workspace/utils';
import type { TablePage, TableQuery } from './zernio-admin-api';

/**
 * Loads one server-side table page for `query`. Previous rows stay on screen
 * (faded via `loading`) while the next page/filter loads; bump `revision` to refetch.
 */
export function useTablePage<T>(fetcher: (query: TableQuery) => Promise<TablePage<T>>, query: TableQuery, revision = 0) {
    const [page, setPage] = useState<TablePage<T> | null>(null);
    const [loading, setLoading] = useState(true);
    const signature = JSON.stringify(query);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetcher(JSON.parse(signature))
            .then((next) => {
                if (!cancelled) setPage(next);
            })
            .catch((error) => {
                if (!cancelled) ErrorToaster(error);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [fetcher, signature, revision]);

    return { rows: page?.rows || [], total: page?.totalItems || 0, loading };
}
