'use client';

import React, {useEffect, useState} from 'react';
import axios from 'axios';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import styles from '../Blog.module.scss';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import {useAuthStore} from '@/app/zustand/store/authStore';
import {useAppStore} from '@/app/zustand/store/useAppStore';
import BlogSectionGuide from '../components/BlogSectionGuide';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import {BLOG_EMPTY_STATES} from '../components/blogGuides';

interface SeriesItem {
    _id: string;
    title: string;
    slug: string;
    createdAt: string;
    ids?: Array<{ _id: string; title: string; order: string }>;
}

export default function SeriesPage() {
    const router = useRouter();
    const {token} = useAuthStore();
    const {baseUrl} = useAppStore();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<SeriesItem[]>([]);
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
                `${baseUrl}/api/series?limit=${pagination.itemPerPage}&page=${pagination.currentPage}`,
                {headers: {authorization: `Bearer ${token}`}},
            );
            if (res.data.statusCode === 200) {
                const items: SeriesItem[] = res.data.data.series || [];
                setData(items);
                setPagination((prev) => ({
                    ...prev,
                    totalItems: res.data.data.totalItems || items.length,
                    ...(updater === 'filter' ? {currentPage: 1, lastUpdateBy: updater} : {lastUpdateBy: updater}),
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
        if (!window.confirm('آیا از حذف این سری مطمئن هستید؟')) return;
        try {
            const res = await axios.delete(`${baseUrl}/api/series/${id}`, {
                headers: {authorization: `Bearer ${token}`},
            });
            if (res.data.statusCode === 200) {
                SuccessToaster({message: 'سری حذف شد'});
                fetchData('pagination');
            }
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(new Date(dateString));
        } catch {
            return '---';
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>سری مقالات</h1>
                    <p className={styles.subtitle}>گروه‌بندی مقالات مرتبط در قالب سری.</p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/blog" className={styles.secondaryBtn}>بازگشت به بلاگ</Link>
                    <Link href="/blog/series/new" className={styles.primaryBtn}>+ سری جدید</Link>
                </div>
            </header>

            <BlogSectionGuide guideKey="series"/>

            {isLoading ? (
                <LoadingState/>
            ) : data.length === 0 ? (
                <TableEmptyState
                    {...BLOG_EMPTY_STATES.series}
                    primaryLabel="+ اولین سری"
                    primaryHref="/blog/series/new"
                    secondaryLabel="مشاهده مقالات"
                    secondaryHref="/blog"
                />
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>عنوان</th>
                            <th>تعداد مقالات</th>
                            <th>تاریخ</th>
                            <th>عملیات</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((item, i) => (
                            <tr key={item._id}>
                                <td>{toFarsiNumber(((pagination.currentPage - 1) * pagination.itemPerPage) + (i + 1))}</td>
                                <td className={styles.modelName}>{item.title}</td>
                                <td>{toFarsiNumber(item.ids?.length || 0)}</td>
                                <td className={styles.timeText}>{formatDate(item.createdAt)}</td>
                                <td>
                                    <div className={styles.actionButtonsGap}>
                                        <button className={styles.editBtn}
                                                onClick={() => router.push(`/blog/series/${item._id}`)}>ویرایش
                                        </button>
                                        <button className={styles.deleteBtn} onClick={() => handleDelete(item._id)}>حذف
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                        }
                        </tbody>
                    </table>
                </div>
            )}

            {!isLoading && data.length > 0 && (
                <Pagination
                    itemPerPage={pagination.itemPerPage}
                    totalItems={pagination.totalItems}
                    currentPage={pagination.currentPage}
                    paginate={(pageNumber) => setPagination((prev) => ({
                        ...prev,
                        currentPage: pageNumber,
                        lastUpdateBy: 'pagination'
                    }))}
                    setRowsPerPage={(e) => setPagination((prev) => ({
                        ...prev,
                        lastUpdateBy: 'pagination',
                        currentPage: 1,
                        itemPerPage: parseInt(e)
                    }))}
                />
            )}
        </div>
    );
}
