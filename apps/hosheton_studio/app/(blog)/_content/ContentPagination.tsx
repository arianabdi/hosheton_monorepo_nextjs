'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Pagination } from '@my-workspace/components';

/** صفحه‌بندی فهرست‌های عمومی — صفحه در URL (?page=) تا هر صفحه آدرس مستقل و قابل اشتراک داشته باشد. */
export function ContentPagination({ page, limit, total }: { page: number; limit: number; total: number }) {
    const router = useRouter();
    const pathname = usePathname();
    if (total <= limit) return null;
    return (
        <Pagination
            rtl
            hideRowsPerPage
            itemPerPage={limit}
            currentPage={page}
            totalItems={total}
            setRowsPerPage={() => undefined}
            paginate={(next) => router.push(next > 1 ? `${pathname}?page=${next}` : pathname)}
        />
    );
}
