'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../Support.module.scss';
import { Container, Wrapper } from '@/app/(main)/layout';
import { ConvertDateToCalendarString, ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, ModalHelper } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import SupportGuide from '../components/SupportGuide';
import TicketRowMenu from '../components/TicketRowMenu';
import {
    DEFAULT_CATEGORIES,
    SupportCategory,
    createCategory,
    deleteCategory,
    listCategories,
} from '../lib/support-api';

const SupportCategoriesPage: React.FC = () => {
    const { baseUrl } = useAppStore();
    const { token } = useAuthStore();
    const router = useRouter();

    const [categories, setCategories] = useState<SupportCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    // تأیید حذف داخل ModalHelper
    const [deleting, setDeleting] = useState<SupportCategory | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setCategories(await listCategories(baseUrl, token));
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token]);

    useEffect(() => {
        load();
    }, [load]);

    const seedDefaults = async () => {
        try {
            setSeeding(true);
            for (const item of DEFAULT_CATEGORIES) {
                await createCategory(baseUrl, token, item);
            }
            SuccessToaster('دسته‌بندی‌های پیش‌فرض (تسویه حساب، مسائل فنی، پیشنهاد و انتقاد) ایجاد شدند.');
            await load();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setSeeding(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleting || deleteBusy) return;
        try {
            setDeleteBusy(true);
            await deleteCategory(baseUrl, token, deleting._id);
            SuccessToaster('دسته‌بندی حذف شد؛ تیکت‌های آن بدون دسته شدند.');
            setDeleting(null);
            await load();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={styles.rtl}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>دسته‌بندی تیکت‌ها</h1>
                            <p className={styles.subtitle}>
                                دسته‌های موضوعی مثل «تسویه حساب» را بسازید تا فیلتر و پیگیری تیکت‌ها منظم‌تر شود.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            {categories.length === 0 && !loading ? (
                                <button type="button" className={styles.secondaryBtn} onClick={() => void seedDefaults()} disabled={seeding}>
                                  ⚡ ایجاد دسته‌های پیش‌فرض
                                </button>
                            ) : null}
                            <Link href="/support/categories/new" className={styles.filtersBtn}>
                                + دسته‌بندی جدید
                            </Link>
                        </div>
                    </header>

                    <SupportGuide variant="categories" />

                    <div>
                        {loading ? (
                            <LoadingState />
                        ) : categories.length === 0 ? (
                            <TableEmptyState
                                icon={<span style={{ fontSize: '2rem' }}>🗂️</span>}
                                title="هنوز دسته‌بندی‌ای ثبت نشده"
                                description="با تعریف دسته‌هایی مثل «تسویه حساب» و «مسائل فنی»، فیلترهای بیشتری برای تیکت‌ها خواهید داشت."
                                hint="می‌توانید با یک کلیک، دسته‌های پیش‌فرض را بسازید و بعداً ویرایش کنید."
                                secondaryLabel="ایجاد دسته‌های پیش‌فرض"
                                onSecondaryClick={() => void seedDefaults()}
                            />
                        ) : (
                            <TableTheme>
                                <table className={styles.customTable}>
                                    <thead>
                                    <tr>
                                        <th>عنوان</th>
                                        <th>رنگ نشان</th>
                                        <th>توضیحات</th>
                                        <th>تعداد تیکت</th>
                                        <th>تاریخ ایجاد</th>
                                        <th>عملیات</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {categories.map((category) => (
                                        <tr key={category._id}>
                                            <td>
                                                <span className={styles.catTitleCell}>
                                                    <span className={styles.catDotLarge} style={{ backgroundColor: category.color }} />
                                                    {category.title}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.colorPreview} style={{ backgroundColor: category.color }} />
                                            </td>
                                            <td className={styles.dateCell}>{category.description || '—'}</td>
                                            <td>
                                                <span className={styles.countBadge}>
                                                    {toFarsiNumber(category.ticketCount || 0)} تیکت
                                                </span>
                                            </td>
                                            <td className={styles.dateCell}>
                                                {category.createdAt ? toFarsiNumber(ConvertDateToCalendarString(category.createdAt)) : '—'}
                                            </td>
                                            <td>
                                                <TicketRowMenu
                                                    rowId={category._id}
                                                    ariaLabel="عملیات دسته‌بندی"
                                                    items={[
                                                        { label: '✏️ ویرایش دسته‌بندی', onClick: () => router.push(`/support/categories/${category._id}`) },
                                                        { label: '🗑️ حذف دسته‌بندی', danger: true, onClick: () => setDeleting(category) },
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </TableTheme>
                        )}
                    </div>
                </div>
            </Wrapper>

            {/* تأیید حذف */}
            <ModalHelper
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                component={
                    <div className={styles.editForm} aria-label="تأیید حذف">
                        <p style={{ lineHeight: 1.9, margin: 0 }}>
                            آیا از حذف دسته‌بندی «<strong>{deleting?.title}</strong>» مطمئن هستید؟
                            <br />
                            تیکت‌های این دسته حذف نمی‌شوند؛ فقط بدون دسته می‌شوند.
                        </p>
                        <div className={styles.filtersActions}>
                            <button type="button" className={styles.deleteConfirmBtn} onClick={() => void confirmDelete()} disabled={deleteBusy}>
                                {deleteBusy ? 'در حال حذف...' : 'حذف دسته‌بندی'}
                            </button>
                            <button type="button" className={styles.clearFiltersBtn} onClick={() => setDeleting(null)} disabled={deleteBusy}>
                                انصراف
                            </button>
                        </div>
                    </div>
                }
                sheetTitle="تأیید حذف دسته‌بندی"
                size="480px"
            />
        </Container>
    );
};

export default SupportCategoriesPage;
