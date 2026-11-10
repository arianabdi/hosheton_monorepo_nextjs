'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../users/users.module.scss';
import vStyles from './verification.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState, Pagination } from '@my-workspace/components';
import { ConvertDateToCalendarString, ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import { TbShieldCheck } from 'react-icons/tb';
import { useAuthStore } from '@/app/zustand/store/authStore';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import VerificationGuide from './VerificationGuide';
import {
    fetchVerificationList,
    fetchVerificationProviders,
    type VerificationRecord,
} from './verification-api';

const STATUS_LABELS: Record<string, string> = {
    verified: 'احراز شده',
    failed: 'ناموفق',
};

const VerificationsList: React.FC = () => {
    const router = useRouter();
    const { token } = useAuthStore();

    const [records, setRecords] = useState<VerificationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [providerOptions, setProviderOptions] = useState<Array<{ key: string; name: string }>>([]);

    const [localFilters, setLocalFilters] = useState({ query: '', status: '', providerKey: '' });
    const [appliedFilters, setAppliedFilters] = useState({ query: '', status: '', providerKey: '' });
    const [pagination, setPagination] = useState({ itemPerPage: 10, currentPage: 1, totalItems: 0 });

    const fetchRecords = useCallback(
        async (page: number, limit: number) => {
            if (!token) return;
            try {
                setLoading(true);
                const data = await fetchVerificationList({
                    page,
                    limit,
                    status: appliedFilters.status || undefined,
                    providerKey: appliedFilters.providerKey || undefined,
                    query: appliedFilters.query || undefined,
                });
                setRecords(data.verifications);
                setPagination((prev) => ({ ...prev, totalItems: data.totalItems, currentPage: page, itemPerPage: limit }));
            } catch (err) {
                ErrorToaster(err);
            } finally {
                setLoading(false);
            }
        },
        [token, appliedFilters],
    );

    useEffect(() => {
        void fetchRecords(pagination.currentPage, pagination.itemPerPage);
    }, [pagination.currentPage, pagination.itemPerPage, fetchRecords]);

    // گزینه‌های فیلتر پلتفرم از لیست پلتفرم‌های پیکربندی‌شده
    useEffect(() => {
        if (!token) return;
        fetchVerificationProviders()
            .then((data) => setProviderOptions(data.providers.map((p) => ({ key: p.providerKey, name: p.displayName }))))
            .catch(() => setProviderOptions([]));
    }, [token]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalFilters((prev) => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setAppliedFilters(localFilters);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const hasActiveFilters = !!(appliedFilters.query || appliedFilters.status || appliedFilters.providerKey);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.header} ${styles.rtl}`}>
                    <div>
                        <h1 className={styles.mainTitle}>احراز هویت کاربران</h1>
                        <p className={styles.subtitle}>
                            سابقه احراز هویت کاربران از طریق پلتفرم‌های شخص ثالث (شاهکار: تطبیق موبایل و کد ملی).
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <Link href="/verification/settings" className={styles.primaryBtn} style={{ background: 'transparent', color: 'var(--brand-color)', border: '1px solid var(--brand-color)' }}>
                            تنظیمات پلتفرم
                        </Link>
                    </div>
                </div>

                <VerificationGuide />

                <div className={`${styles.filterContainer} ${vStyles.compactFilters} ${styles.rtl}`}>
                    <div className={vStyles.compactFilterRow}>
                        <div className={vStyles.compactField} style={{ flexGrow: 2 }}>
                            <label>جستجو (نام / موبایل / کد ملی):</label>
                            <input
                                type="text"
                                name="query"
                                placeholder="جستجو..."
                                value={localFilters.query}
                                onChange={handleFilterChange}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                className={styles.filterInput}
                            />
                        </div>
                        <div className={vStyles.compactField}>
                            <label>وضعیت:</label>
                            <select
                                name="status"
                                value={localFilters.status}
                                onChange={handleFilterChange}
                                className={styles.filterSelect}
                            >
                                <option value="">همه</option>
                                <option value="verified">احراز شده</option>
                                <option value="failed">ناموفق</option>
                            </select>
                        </div>
                        <div className={vStyles.compactField}>
                            <label>پلتفرم:</label>
                            <select
                                name="providerKey"
                                value={localFilters.providerKey}
                                onChange={handleFilterChange}
                                className={styles.filterSelect}
                            >
                                <option value="">همه</option>
                                {providerOptions.map((p) => (
                                    <option key={p.key} value={p.key}>
                                        {p.key}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={vStyles.compactField} style={{ alignSelf: 'flex-end' }}>
                            <button type="button" onClick={applyFilters} className={styles.primaryBtn} style={{ padding: '0 22px', height: '38px', whiteSpace: 'nowrap' }}>
                                اعمال فیلتر
                            </button>
                        </div>
                    </div>
                    {(hasActiveFilters || pagination.totalItems > 0) && (
                        <div className={vStyles.filterSummary}>
                            {pagination.totalItems > 0 && <span>مجموع: {toFarsiNumber(pagination.totalItems)} رکورد</span>}
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    className={vStyles.clearFiltersBtn}
                                    onClick={() => {
                                        const reset = { query: '', status: '', providerKey: '' };
                                        setLocalFilters(reset);
                                        setAppliedFilters(reset);
                                        setPagination((prev) => ({ ...prev, currentPage: 1 }));
                                    }}
                                >
                                    پاک کردن فیلترها ✕
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.rtl}>
                    {loading ? (
                        <LoadingState />
                    ) : records.length === 0 ? (
                        <TableEmptyState
                            icon={<TbShieldCheck size={32} />}
                            title={hasActiveFilters ? 'رکوردی یافت نشد' : 'هنوز احراز هویتی ثبت نشده'}
                            description={hasActiveFilters ? 'فیلترها را تغییر دهید.' : 'با احراز هویت کاربران در سایت، سابقه اینجا نمایش داده می‌شود.'}
                            secondaryLabel={hasActiveFilters ? 'پاک کردن فیلترها' : undefined}
                            onSecondaryClick={
                                hasActiveFilters
                                    ? () => {
                                          const reset = { query: '', status: '', providerKey: '' };
                                          setLocalFilters(reset);
                                          setAppliedFilters(reset);
                                          setPagination((prev) => ({ ...prev, currentPage: 1 }));
                                      }
                                    : undefined
                            }
                        />
                    ) : (
                        <TableTheme>
                            <table className={styles.customTable}>
                                <thead>
                                    <tr>
                                        <th>نام و نام خانوادگی</th>
                                        <th>موبایل</th>
                                        <th>کد ملی</th>
                                        <th>پلتفرم</th>
                                        <th>نتیجه استعلام</th>
                                        <th>حساب کاربر</th>
                                        <th>تاریخ</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((record) => (
                                        <tr key={record._id}>
                                            <td>{record.fullName || record.username || '—'}</td>
                                            <td style={{ direction: 'ltr', textAlign: 'right' }}>
                                                {record.mobile ? toFarsiNumber(record.mobile) : '—'}
                                            </td>
                                            <td style={{ direction: 'ltr', textAlign: 'right' }}>
                                                {record.nationalCode ? toFarsiNumber(record.nationalCode) : '—'}
                                            </td>
                                            <td>
                                                <span className={vStyles.providerTag}>{record.providerKey}</span>
                                                {record.simulated && <span className={vStyles.simulatedTag}>آزمایشی</span>}
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${record.status === 'verified' ? styles.approved : styles.pending}`}>
                                                    {STATUS_LABELS[record.status] || record.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${record.userVerified ? styles.approved : styles.pending}`}>
                                                    {record.userVerified ? 'احراز شده' : 'احراز نشده'}
                                                </span>
                                            </td>
                                            <td className={styles.dateCell}>
                                                {record.createdAt ? toFarsiNumber(ConvertDateToCalendarString(record.createdAt)) : '—'}
                                            </td>
                                            <td>
                                                <HrRowActionMenu
                                                    rowId={record._id}
                                                    items={[
                                                        {
                                                            label: 'جزئیات',
                                                            onClick: () => router.push(`/verification/${record._id}`),
                                                        },
                                                        ...(record.userId
                                                            ? [
                                                                  {
                                                                      label: 'پروفایل کاربر',
                                                                      onClick: () => router.push(`/users/profile/${record.userId}`),
                                                                  },
                                                              ]
                                                            : []),
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableTheme>
                    )}

                    {records.length > 0 && (
                        <div className={styles.paginationSpace}>
                            <Pagination
                                itemPerPage={pagination.itemPerPage}
                                currentPage={pagination.currentPage}
                                totalItems={pagination.totalItems}
                                setRowsPerPage={(n: number) =>
                                    setPagination((prev) => ({ ...prev, itemPerPage: n, currentPage: 1 }))
                                }
                                paginate={(page: number) => setPagination((prev) => ({ ...prev, currentPage: page }))}
                                rtl={true}
                            />
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
};

export default VerificationsList;
