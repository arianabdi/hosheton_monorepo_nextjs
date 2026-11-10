'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../blog/Blog.module.scss';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';

interface DocItem {
    _id: string;
    title: string;
    slug: string;
    categoryName?: string;
    status: string;
    order?: number;
    isPopular?: boolean;
    createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
    published: 'منتشر شده',
    draft: 'پیش‌نویس',
};

export default function DocsListPage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<DocItem[]>([]);
    const [pagination, setPagination] = useState({
        itemPerPage: 10,
        currentPage: 1,
        totalItems: 0,
        lastUpdateBy: '',
    });

    const fetchData = async (updater: string) => {
        if (!token) return;
        try {
            setIsLoading(true);
            const res = await axios.get(
                `${baseUrl}/api/docs/panel?limit=${pagination.itemPerPage}&page=${pagination.currentPage}`,
                { headers: { authorization: `Bearer ${token}` } },
            );

            if (res.data.statusCode === 200) {
                const items: DocItem[] = res.data.data.items || [];
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
        if (!window.confirm('آیا از حذف این صفحه مستندات مطمئن هستید؟')) return;
        try {
            setIsLoading(true);
            const res = await axios.delete(`${baseUrl}/api/docs/panel/${id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                SuccessToaster({ message: 'صفحه حذف شد' });
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
                    <h1 className={styles.mainTitle}>مستندات و آموزش‌ها</h1>
                    <p className={styles.subtitle}>صفحه‌های آموزشی و مستندات سایت هر اپ — آدرس: /docs/موضوع/صفحه</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link href="/docs/categories" className={styles.secondaryBtn}>دسته‌بندی‌ها</Link>
                    <Link href="/docs/new" className={styles.primaryBtn}>+ صفحه جدید</Link>
                </div>
            </header>

            {isLoading && data.length === 0 ? (
                <LoadingState />
            ) : data.length === 0 ? (
                <TableEmptyState
                    title="هنوز صفحه مستنداتی ثبت نشده"
                    description="اولین صفحه راهنما را بسازید تا در بخش docs لندینگ نمایش داده شود."
                    primaryLabel="ایجاد صفحه"
                    primaryHref="/docs/new"
                    secondaryLabel="مدیریت دسته‌ها"
                    secondaryHref="/docs/categories"
                />
            ) : (
                <>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>عنوان</th>
                                    <th>دسته</th>
                                    <th>وضعیت</th>
                                    <th>ترتیب</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, index) => (
                                    <tr key={item._id}>
                                        <td>{toFarsiNumber(String((pagination.currentPage - 1) * pagination.itemPerPage + index + 1))}</td>
                                        <td>{item.title}</td>
                                        <td>{item.categoryName || '—'}</td>
                                        <td>{STATUS_LABELS[item.status] || item.status}</td>
                                        <td>{toFarsiNumber(String(item.order ?? 0))}</td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button className={styles.editBtn} onClick={() => router.push(`/docs/${item._id}`)}>
                                                    ویرایش
                                                </button>
                                                <button className={styles.deleteBtn} onClick={() => handleDelete(item._id)}>
                                                    حذف
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

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
                                itemPerPage: parseInt(e, 10),
                            }))
                        }
                    />
                </>
            )}
        </div>
    );
}
