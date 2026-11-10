'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../Blog.module.scss';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import BlogSectionGuide from '../components/BlogSectionGuide';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { BLOG_EMPTY_STATES } from '../components/blogGuides';

interface PromptItem {
    _id: string;
    name: string;
    slug: string;
    createdAt: string;
}

export default function PromptsPage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<PromptItem[]>([]);
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
                `${baseUrl}/api/prompts/panel?section=post&limit=${pagination.itemPerPage}&page=${pagination.currentPage}`,
                { headers: { authorization: `Bearer ${token}` } },
            );
            if (res.data.statusCode === 200) {
                const items: PromptItem[] = res.data.data.prompts || [];
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
        if (!window.confirm('آیا از حذف این پرامپت مطمئن هستید؟')) return;
        try {
            const res = await axios.delete(`${baseUrl}/api/prompts/panel/${id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                SuccessToaster({ message: 'پرامپت حذف شد' });
                fetchData('pagination');
            }
        } catch (e) {
            ErrorToaster(e);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>پرامپت‌ها</h1>
                    <p className={styles.subtitle}>مدیریت پرامپت‌های تولید مقاله با AI.</p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/blog" className={styles.secondaryBtn}>بازگشت به بلاگ</Link>
                    <Link href="/blog/prompts/new" className={styles.primaryBtn}>+ پرامپت جدید</Link>
                </div>
            </header>

            <BlogSectionGuide guideKey="prompts" />

            {isLoading ? (
                <LoadingState />
            ) : data.length === 0 ? (
                <TableEmptyState
                    {...BLOG_EMPTY_STATES.prompts}
                    primaryLabel="+ اولین پرامپت"
                    primaryHref="/blog/prompts/new"
                    secondaryLabel="رفتن به AI"
                    secondaryHref="/blog/ai"
                />
            ) : (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>عنوان</th>
                            <th>شناسه</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                    {data.map((item, i) => (
                            <tr key={item._id}>
                                <td>{toFarsiNumber(((pagination.currentPage - 1) * pagination.itemPerPage) + (i + 1))}</td>
                                <td className={styles.modelName}>{item.name}</td>
                                <td>{item.slug}</td>
                                <td>
                                    <div className={styles.actionButtonsGap}>
                                        <button className={styles.editBtn}
                                                onClick={() => router.push(`/blog/prompts/${item._id}`)}>ویرایش
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
                paginate={(pageNumber) => setPagination((prev) => ({ ...prev, currentPage: pageNumber, lastUpdateBy: 'pagination' }))}
                setRowsPerPage={(e) => setPagination((prev) => ({ ...prev, lastUpdateBy: 'pagination', currentPage: 1, itemPerPage: parseInt(e) }))}
            />
            )}
        </div>
    );
}
