'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TbVersions } from 'react-icons/tb';
import styles from '../../blog/Blog.module.scss';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';

interface ChangelogVersion {
    _id: string;
    version: string;
    title?: string;
    releaseDate: string;
    isPublished: boolean;
}

export default function ChangelogListPage() {
    const router = useRouter();
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<ChangelogVersion[]>([]);
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
                `${baseUrl}/api/changelog?limit=${pagination.itemPerPage}&page=${pagination.currentPage}`,
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                const items = res.data.data.items || [];
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
        if (!token || !window.confirm('این نسخه حذف شود؟')) return;
        try {
            await axios.delete(`${baseUrl}/api/changelog/${id}`, { headers: { authorization: `Bearer ${token}` } });
            SuccessToaster({ message: 'حذف شد' });
            fetchData('pagination');
        } catch (e) {
            ErrorToaster(e);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>گزارش تغییرات</h1>
                    <p className={styles.subtitle}>مدیریت نسخه‌ها و changelog لندینگ</p>
                </div>
                <Link href="/settings/changelog/new" className={styles.primaryBtn}>+ نسخه جدید</Link>
            </header>

            {isLoading ? (
                <LoadingState />
            ) : data.length === 0 ? (
                <TableEmptyState
                    icon={<TbVersions size={32} />}
                    title="هنوز نسخه‌ای ثبت نشده"
                    description="اولین نسخه changelog را بسازید تا در صفحه تغییرات اخیر لندینگ نمایش داده شود."
                    primaryLabel="+ نسخه جدید"
                    primaryHref="/settings/changelog/new"
                />
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>نسخه</th>
                                <th>عنوان</th>
                                <th>تاریخ</th>
                                <th>وضعیت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, i) => (
                                <tr key={item._id}>
                                    <td>{toFarsiNumber(((pagination.currentPage - 1) * pagination.itemPerPage) + (i + 1))}</td>
                                    <td className={styles.modelName}>{item.version}</td>
                                    <td>{item.title || '—'}</td>
                                    <td className={styles.timeText}>
                                        {item.releaseDate ? new Date(item.releaseDate).toLocaleDateString('fa-IR') : '—'}
                                    </td>
                                    <td>
                                        <span className={item.isPublished ? styles.badgePublished : styles.badgeDraft}>
                                            {item.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionButtonsGap}>
                                            <button className={styles.editBtn} onClick={() => router.push(`/settings/changelog/${item._id}`)}>
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
