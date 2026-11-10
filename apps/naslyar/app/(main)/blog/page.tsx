'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Blog.module.scss';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import BlogSectionGuide from './components/BlogSectionGuide';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import { BLOG_EMPTY_STATES } from './components/blogGuides';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';

interface BlogItem {
    _id: string;
    title: string;
    categoryName?: string;
    createdAt: string;
    status: string;
    hidden?: boolean;
    /** پست سیستمی قفل‌شده (قوانین/حریم خصوصی): حذف نمی‌شود، دسته و slug ثابت دارد */
    locked?: boolean;
    systemKey?: string | null;
    seo?: { keywords?: string[] };
}

const SYSTEM_POST_LABELS: Record<string, string> = {
    terms: 'صفحهٔ قوانین',
    privacy: 'صفحهٔ حریم خصوصی',
};

const STATUS_LABELS: Record<string, string> = {
    published: 'منتشر شده',
    draft: 'پیش‌نویس',
    under_review: 'در انتظار بررسی',
    editing: 'در حال ویرایش',
};

export default function BlogListPage() {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl, appName } = useAppStore();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<BlogItem[]>([]);
    const [pendingDelete, setPendingDelete] = useState<BlogItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
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
        if (!token || !appName) return;
        try {
            setIsLoading(true);
            const res = await axios.get(
                `${baseUrl}/api/blog/panel?limit=${pagination.itemPerPage}&page=${pagination.currentPage}&showHidden=true`,
                { headers: { authorization: `Bearer ${token}` } }
            );

            if (res.data.statusCode === 200) {
                const items: BlogItem[] = res.data.data.posts || res.data.data.blogs || [];
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
        if (token && appName) fetchData('initializer');
    }, [token, appName]);

    useEffect(() => {
        if (pagination.lastUpdateBy === 'pagination') fetchData('pagination');
    }, [pagination.currentPage, pagination.itemPerPage]);

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            setIsDeleting(true);
            const res = await axios.delete(`${baseUrl}/api/blog/${pendingDelete._id}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            if (res.data.statusCode === 200) {
                SuccessToaster({ message: 'مقاله با موفقیت حذف شد' });
                setPendingDelete(null);
                fetchData('pagination');
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>مدیریت بلاگ</h1>
                    <p className={styles.subtitle}>
                        ایجاد، ویرایش و انتشار مقالات برای {appName || 'اپلیکیشن'} — محتوای بلاگ از این بخش مدیریت می‌شود.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/blog/ai" className={styles.secondaryBtn}>
                        تولید با AI
                    </Link>
                    <Link href="/blog/new" className={styles.primaryBtn}>
                        + مقاله جدید
                    </Link>
                </div>
            </header>

            <BlogSectionGuide guideKey="articles" />

            {isLoading ? (
                <LoadingState />
            ) : data.length === 0 ? (
                <TableEmptyState
                    {...BLOG_EMPTY_STATES.articles}
                    primaryLabel="+ اولین مقاله"
                    primaryHref="/blog/new"
                    secondaryLabel="ساخت دسته‌بندی"
                    secondaryHref="/blog/categories/new"
                />
            ) : (
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>عنوان</th>
                            <th>دسته‌بندی</th>
                            <th>وضعیت</th>
                            <th>نمایش سایت</th>
                            <th>تاریخ</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                    {data.map((item, i) => (
                            <tr key={item._id}>
                                <td>{toFarsiNumber(((pagination.currentPage - 1) * pagination.itemPerPage) + (i + 1))}</td>
                                <td className={styles.modelName}>
                                    {item.title}
                                    {item.locked ? (
                                        <span
                                            className={styles.badgeLocked}
                                            title="پست سیستمی — حذف نمی‌شود؛ فقط متن، عنوان و سئو ویرایش می‌شود"
                                        >
                                            قفل
                                        </span>
                                    ) : null}
                                </td>
                                <td>{item.locked ? SYSTEM_POST_LABELS[item.systemKey || ''] || 'سیستمی' : item.categoryName || '—'}</td>
                                <td>
                                            <span
                                                className={item.status === 'published' ? styles.badgePublished : styles.badgeDraft}>
                                                {STATUS_LABELS[item.status] || item.status}
                                            </span>
                                </td>
                                <td>
                                    <span className={item.hidden ? styles.badgeDraft : styles.badgePublished}>
                                        {item.hidden ? 'مخفی' : 'فعال'}
                                    </span>
                                </td>
                                <td className={styles.timeText}>{formatPersianDate(item.createdAt)}</td>
                                <td data-label="عملیات" className={hrStyles.actionCell}>
                                    <HrRowActionMenu
                                        rowId={item._id}
                                        ariaLabel={`عملیات ${item.title}`}
                                        items={[
                                            { label: 'ویرایش', onClick: () => router.push(`/blog/${item._id}`) },
                                            ...(item.locked
                                                ? []
                                                : [{ label: 'حذف', danger: true, onClick: () => setPendingDelete(item) }]),
                                        ]}
                                    />
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

            <ConfirmDialog
                open={!!pendingDelete}
                title="حذف مقاله"
                confirmLabel="حذف"
                tone="danger"
                busy={isDeleting}
                onConfirm={confirmDelete}
                onClose={() => setPendingDelete(null)}
            >
                {`مقالهٔ «${pendingDelete?.title || ''}» از بلاگ و سایت‌مپ برداشته می‌شود.`}
            </ConfirmDialog>
        </div>
    );
}
