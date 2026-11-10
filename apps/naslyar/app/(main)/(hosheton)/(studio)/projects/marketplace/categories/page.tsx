'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '@/app/(main)/blog/Blog.module.scss';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';

interface CategoryItem {
    _id: string;
    name: string;
    slug: string;
    section: string;
    createdAt: string;
}

export default function MarketplaceCategoriesPage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<CategoryItem[]>([]);
    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0,
        lastUpdateBy: '',
    });

    const formatPersianDate = (dateString: string) => {
        try {
            return new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(new Date(dateString));
        } catch {
            return '---';
        }
    };

    const fetchData = async (updater: string) => {
        if (!token) return;
        try {
            setIsLoading(true);
            const res = await axios.get(
                `${baseUrl}/api/categories/panel?section=marketplace&limit=${pagination.itemPerPage}&page=${pagination.currentPage}`,
                { headers: { authorization: `Bearer ${token}` } },
            );

            if (res.data.statusCode === 200) {
                const items: CategoryItem[] = res.data.data.categories || [];
                setData(items);
                setPagination((prev) => ({
                    ...prev,
                    totalItems: res.data.data.totalItems || items.length,
                    ...(updater === 'filter' ? { currentPage: 1, lastUpdateBy: updater } : { lastUpdateBy: updater }),
                }));
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchData('initializer');
    }, [token, baseUrl]);

    useEffect(() => {
        if (pagination.lastUpdateBy === 'pagination') fetchData('pagination');
    }, [pagination.currentPage, pagination.itemPerPage]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('آیا از حذف این دسته‌بندی مطمئن هستید؟')) return;
        try {
            setIsLoading(true);
            const res = await axios.delete(`${baseUrl}/api/categories/panel/${id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                SuccessToaster({ message: 'دسته‌بندی با موفقیت حذف شد' });
                fetchData('pagination');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>دسته‌بندی‌ها</h1>
                    <p className={styles.subtitle}>
                        مدیریت دسته‌بندی‌های صفحه ایده‌ها — کارت‌های افقی زیر جستجو از اینجا تغذیه می‌شوند.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/projects/templates/review" className={styles.secondaryBtn}>بررسی قالب‌ها</Link>
                    <Link href="/projects/marketplace/categories/new" className={styles.primaryBtn}>+ دسته‌بندی جدید</Link>
                </div>
            </header>

            {isLoading ? (
                <LoadingState />
            ) : data.length === 0 ? (
                <TableEmptyState
                    title="هنوز دسته‌بندی ندارید"
                    description="اولین دسته را بسازید تا در صفحه ایده‌ها نمایش داده شود."
                    primaryLabel="+ اولین دسته‌بندی"
                    primaryHref="/projects/marketplace/categories/new"
                    secondaryLabel="بررسی قالب‌ها"
                    secondaryHref="/projects/templates/review"
                />
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>نام</th>
                                <th>شناسه (slug)</th>
                                <th>بخش</th>
                                <th>تاریخ</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, i) => (
                                <tr key={item._id}>
                                    <td>{toFarsiNumber(((pagination.currentPage - 1) * pagination.itemPerPage) + (i + 1))}</td>
                                    <td className={styles.modelName}>{item.name}</td>
                                    <td>{item.slug}</td>
                                    <td>{item.section}</td>
                                    <td className={styles.timeText}>{formatPersianDate(item.createdAt)}</td>
                                    <td>
                                        <div className={styles.actionButtonsGap}>
                                            <button
                                                type="button"
                                                className={styles.editBtn}
                                                onClick={() => router.push(`/projects/marketplace/categories/${item._id}`)}
                                            >
                                                ویرایش
                                            </button>
                                            <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(item._id)}>
                                                حذف
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!isLoading && data.length > 0 && (
                <Pagination
                    itemPerPage={pagination.itemPerPage}
                    totalItems={pagination.totalItems}
                    currentPage={pagination.currentPage}
                    paginate={(pageNumber) =>
                        setPagination((prev) => ({ ...prev, currentPage: pageNumber, lastUpdateBy: 'pagination' }))
                    }
                    setRowsPerPage={(e) =>
                        setPagination((prev) => ({
                            ...prev,
                            lastUpdateBy: 'pagination',
                            currentPage: 1,
                            itemPerPage: parseInt(e),
                        }))
                    }
                />
            )}
        </div>
    );
}
