'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Pagination } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { useReferralData } from '../lib/ReferralAdminProvider';
import { formatNumber } from '../lib/format';
import type { ListFilter, ReferralAdminApi } from '../lib/referral-api';
import styles from '../ReferralCode.module.scss';

const loadCampaigns = (api: ReferralAdminApi) => api.listCampaigns();
const ROWS_PER_PAGE = [25, 50, 100];

/**
 * وضعیت فیلتر/صفحه فهرست‌های دعوت‌شدگان و پاداش‌ها — وضعیت در ?status= نگه داشته می‌شود
 * تا لینک «۳ پاداش آماده پرداخت» مستقیم به همان فیلتر برسد.
 */
export function useListFilter(): ListFilter & {
    setStatus: (status: string) => void;
    setCampaignId: (id: string) => void;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
} {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const status = searchParams.get('status') || 'all';
    const [campaignId, setCampaign] = useState('all');
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(ROWS_PER_PAGE[0]);

    const setStatus = useCallback(
        (next: string) => {
            setPage(1);
            router.replace(next === 'all' ? pathname : `${pathname}?status=${next}`, { scroll: false });
        },
        [pathname, router],
    );

    return {
        status,
        campaignId,
        page,
        limit,
        setStatus,
        setCampaignId: (id) => {
            setCampaign(id);
            setPage(1);
        },
        setPage,
        setLimit: (next) => {
            setLimitState(next);
            setPage(1);
        },
    };
}

/** فیلتر وضعیت (تب خطی) + انتخاب کمپین */
export function ListFilters({
    filter,
    statusLabels,
}: {
    filter: ReturnType<typeof useListFilter>;
    statusLabels: Record<string, string>;
}) {
    const { data: campaigns } = useReferralData(loadCampaigns);
    const tabs = [{ id: 'all', label: 'همه' }, ...Object.entries(statusLabels).map(([id, label]) => ({ id, label }))];
    return (
        <div className={styles.filterBar}>
            <SimpleLineTabs tabs={tabs} activeTab={filter.status || 'all'} onChange={filter.setStatus} />
            <label className={styles.campaignSelect}>
                کمپین
                <select value={filter.campaignId} onChange={(e) => filter.setCampaignId(e.target.value)}>
                    <option value="all">همه کمپین‌ها</option>
                    {campaigns?.map((campaign) => (
                        <option key={campaign._id} value={campaign._id}>
                            {campaign.name}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

/** شمارنده + صفحه‌بندی مشترک پروژه */
export function ListPagination({ filter, total }: { filter: ReturnType<typeof useListFilter>; total: number }) {
    if (total <= ROWS_PER_PAGE[0]) {
        return <p className={styles.muted}>{formatNumber(total)} مورد</p>;
    }
    return (
        <div className={styles.pagination}>
            <Pagination
                rtl
                itemPerPage={filter.limit || ROWS_PER_PAGE[0]}
                currentPage={filter.page || 1}
                totalItems={total}
                paginate={filter.setPage}
                setRowsPerPage={filter.setLimit}
                rowsPerPageOptions={ROWS_PER_PAGE}
            />
        </div>
    );
}
