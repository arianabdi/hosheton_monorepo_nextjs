'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuRefreshCw } from 'react-icons/lu';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import { avatarReviewApi, type AvatarReviewItem } from '../../lib/avatar-review-api';
import styles from '../../projects/nodes/Providers.module.scss';

type StatusFilter = 'pending' | 'rejected' | 'approved' | 'all';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'pending', label: 'در انتظار' },
    { id: 'rejected', label: 'رد شده' },
    { id: 'approved', label: 'تایید شده' },
    { id: 'all', label: 'همه' },
];

const REVIEW_STATUS_LABEL: Record<string, string> = {
    pending: 'در انتظار تایید API Key',
    approved: 'تایید شده',
    rejected: 'رد شده',
};

function formatDate(value?: string) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('fa-IR');
    } catch {
        return value;
    }
}

export default function AvatarReviewListPage({ embedded = false }: { embedded?: boolean }) {
    const router = useRouter();
    const [items, setItems] = useState<AvatarReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0,
        lastUpdateBy: '',
    });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await avatarReviewApi.listReviewQueue({
                status: statusFilter,
                page: pagination.currentPage,
                limit: pagination.itemPerPage,
            });
            setItems(res.avatars ?? []);
            setPagination((prev) => ({
                ...prev,
                totalItems: res.total ?? 0,
            }));
        } catch (error) {
            setItems([]);
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, pagination.currentPage, pagination.itemPerPage]);

    useEffect(() => {
        load();
    }, [load]);

    const handleStatusChange = (status: StatusFilter) => {
        setStatusFilter(status);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            {!embedded && (
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.mainTitle}>بررسی احراز هویت آواتارها</h1>
                        <p className={styles.subtitle}>
                            وقتی BytePlus به‌خاطر API Key یا دسترسی Portrait پاسخ نمی‌دهد، درخواست اینجا می‌آید.
                            API Key را در حساب‌های provider بررسی کنید، سپس تایید کنید.
                        </p>
                    </div>
                    <button type="button" className={styles.secondaryBtn} onClick={() => load()}>
                        <LuRefreshCw size={16} /> بروزرسانی
                    </button>
                </header>
            )}

            {embedded && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button type="button" className={styles.secondaryBtn} onClick={() => load()}>
                        <LuRefreshCw size={16} /> بروزرسانی
                    </button>
                </div>
            )}

            <SimpleLineTabs
                tabs={STATUS_TABS}
                activeTab={statusFilter}
                onChange={(id) => handleStatusChange(id as StatusFilter)}
            />

            {loading ? (
                <LoadingState />
            ) : items.length === 0 ? (
                <div className={styles.emptyStateBox}>درخواستی با این فیلتر یافت نشد.</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>آواتار</th>
                                <th>کاربر</th>
                                <th>وضعیت بررسی</th>
                                <th>خطای BytePlus</th>
                                <th>ارسال</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.name}</td>
                                    <td>
                                        {item.owner?.fullName || item.owner?.email || item.owner?.username || '—'}
                                    </td>
                                    <td>{REVIEW_STATUS_LABEL[item.adminReviewStatus] || item.adminReviewStatus}</td>
                                    <td style={{ maxWidth: 280, whiteSpace: 'normal' }}>
                                        {item.lastByteplusError || '—'}
                                    </td>
                                    <td>{formatDate(item.submittedForAdminAt)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={styles.primaryBtn}
                                            onClick={() => router.push(`/avatars/review/${item._id}`)}
                                        >
                                            {item.adminReviewStatus === 'pending' ? 'بررسی' : 'جزئیات'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div
                style={{
                    marginTop: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                }}
            >
                <p className={styles.subtitle} style={{ margin: 0 }}>
                    {toFarsiNumber(pagination.totalItems)} درخواست
                </p>
                <Pagination
                    itemPerPage={pagination.itemPerPage}
                    currentPage={pagination.currentPage}
                    totalItems={pagination.totalItems}
                    rtl
                    paginate={(pageNumber) =>
                        setPagination((prev) => ({ ...prev, currentPage: pageNumber }))
                    }
                    setRowsPerPage={(rows) =>
                        setPagination((prev) => ({
                            ...prev,
                            itemPerPage: rows,
                            currentPage: 1,
                        }))
                    }
                />
            </div>
        </div>
    );
}
