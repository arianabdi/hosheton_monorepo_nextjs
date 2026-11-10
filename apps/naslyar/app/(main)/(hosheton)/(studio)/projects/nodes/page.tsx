'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LuRefreshCw, LuSearch } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { nodeCatalogApi } from '../../lib/node-catalog-api';
import type { NodeCatalogEntry } from '../../types/node-catalog';
import { CATEGORY_LABELS_FA } from '../../types/node-catalog';
import styles from './Providers.module.scss';

export default function NodeCatalogListPage() {
    const router = useRouter();
    const [nodes, setNodes] = useState<NodeCatalogEntry[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const loadNodes = useCallback(async () => {
        try {
            setLoading(true);
            const res = await nodeCatalogApi.list({
                activeOnly: false,
                search: search.trim() || undefined,
            });
            setNodes(res.nodes ?? []);
        } catch (error) {
            setNodes([]);
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(loadNodes, 300);
        return () => clearTimeout(timer);
    }, [loadNodes]);

    const handleDelete = async (node: NodeCatalogEntry) => {
        if (!confirm(`گره «${node.labelFa}» غیرفعال شود؟`)) return;

        try {
            setLoading(true);
            await nodeCatalogApi.remove(node._id);
            SuccessToaster({ message: 'گره با موفقیت غیرفعال شد' });
            await loadNodes();
        } catch (error) {
            ErrorToaster(error);
            setLoading(false);
        }
    };

    const handleReseed = async () => {
        if (!confirm('همه گره‌های پیش‌فرض دوباره seed شوند؟')) return;

        try {
            setLoading(true);
            await nodeCatalogApi.reseed();
            SuccessToaster({ message: 'گره‌های پیش‌فرض با موفقیت seed شدند' });
            await loadNodes();
        } catch (error) {
            ErrorToaster(error);
            setLoading(false);
        }
    };

    const activeCount = nodes.filter((node) => node.isActive !== false).length;

    return (
        <div className={`${styles.container} ${styles.rtl}`}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.mainTitle}>مدیریت نود ها</h1>
                    <p className={styles.subtitle}>
                        گره‌های قابل استفاده در ویرایشگر workflow را تعریف کنید، دسته‌بندی کنید و وضعیت نمایش آن‌ها را در جعبه ابزار کاربران مدیریت نمایید.
                    </p>
                </div>
                <Link href="/projects/nodes/new" className={styles.primaryBtn}>
                    + ایجاد گره جدید
                </Link>
            </header>

            <div className={styles.noticeContainer}>
                <div className={styles.noticeHeader}>
                    <div className={styles.noticeTitleGroup}>
                        <span className={styles.noticeIcon}>🧩</span>
                        <h2 className={styles.noticeTitle}>راهنمای مدیریت کاتالوگ گره‌ها</h2>
                    </div>
                    <span className={styles.noticeBadge}>ادمین هوشتون</span>
                </div>

                <div className={styles.noticeGrid}>
                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>۱</span>
                            <h3>شناسه یکتا (type)</h3>
                        </div>
                        <p>
                            مقدار <code>type</code> باید در کل سیستم یکتا باشد و پس از ایجاد گره قابل تغییر نیست. این شناسه در سورس‌کد ویرایشگر برای رندر و اجرای گره استفاده می‌شود.
                        </p>
                    </div>

                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>۲</span>
                            <h3>دسته‌بندی و ترتیب نمایش</h3>
                        </div>
                        <p>
                            با فیلد <code>category</code> گره در تب‌های جعبه ابزار گروه‌بندی می‌شود و با <code>sortOrder</code> ترتیب نمایش آن را در هر دسته مشخص کنید.
                        </p>
                    </div>

                    <div className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>۳</span>
                            <h3>Seed مجدد</h3>
                        </div>
                        <p>
                            دکمه Seed مجدد فقط گره‌های پیش‌فرض سیستم را بازسازی می‌کند. برای گره‌های سفارشی از ایجاد یا ویرایش دستی استفاده کنید.
                        </p>
                    </div>
                </div>

                <div className={styles.noticeFooter}>
                    <p>
                        📊 <strong>وضعیت فعلی:</strong> {toFarsiNumber(activeCount)} گره فعال از {toFarsiNumber(nodes.length)} گره ثبت‌شده.
                    </p>
                </div>
            </div>

            <div className={styles.tableToolbar}>
                <div className={styles.searchBar}>
                    <LuSearch />
                    <input
                        placeholder="جستجو بر اساس نام یا type..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className={styles.secondaryBtn} onClick={handleReseed}>
                        <LuRefreshCw /> Seed مجدد
                    </button>
                    <Link href="/projects/nodes/new" className={styles.primaryBtn}>
                        + ایجاد گره جدید
                    </Link>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>type</th>
                            <th>نام فارسی</th>
                            <th>دسته</th>
                            <th>provider</th>
                            <th>وضعیت</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7}><LoadingState /></td>
                            </tr>
                        ) : nodes.length === 0 ? (
                            <tr>
                                <td colSpan={7} className={styles.emptyPlaceholder}>
                                    {search.trim()
                                        ? 'گره‌ای با این عبارت جستجو یافت نشد.'
                                        : 'هنوز گره‌ای در کاتالوگ ثبت نشده است.'}
                                    <Link href="/projects/nodes/new" className={styles.primaryBtn}>
                                        + ایجاد اولین گره
                                    </Link>
                                </td>
                            </tr>
                        ) : (
                            nodes.map((node, index) => (
                                <tr key={node._id} style={node.isActive === false ? { opacity: 0.55 } : undefined}>
                                    <td data-label="#">{toFarsiNumber(index + 1)}</td>
                                    <td data-label="type">
                                        <code className={styles.timeText}>{node.type}</code>
                                    </td>
                                    <td data-label="نام فارسی" className={styles.modelName}>{node.labelFa}</td>
                                    <td data-label="دسته">
                                        <span className={styles.badgeActive}>
                                            {CATEGORY_LABELS_FA[node.category] || node.category}
                                        </span>
                                    </td>
                                    <td data-label="provider" className={styles.timeText}>
                                        {node.providerClass || '—'}
                                    </td>
                                    <td data-label="وضعیت">
                                        {node.isActive !== false ? (
                                            <span className={styles.badgeActive}>فعال</span>
                                        ) : (
                                            <span className={styles.timeText}>غیرفعال</span>
                                        )}
                                    </td>
                                    <td data-label="عملیات">
                                        <div className={styles.actionButtonsGap}>
                                            <button
                                                type="button"
                                                className={styles.editBtn}
                                                onClick={() => router.push(`/projects/nodes/${node._id}`)}
                                            >
                                                ویرایش
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.deleteBtn}
                                                onClick={() => handleDelete(node)}
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
