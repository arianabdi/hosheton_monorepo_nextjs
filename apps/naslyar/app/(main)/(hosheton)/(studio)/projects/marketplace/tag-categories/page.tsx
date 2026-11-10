'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '@/app/(main)/components/content-categories/ContentCategories.module.scss';
import { templateTagCategoryApi } from '../../../lib/template-tag-category-api';
import TagCategoriesGuide from './components/TagCategoriesGuide';
import { buildTagTree, tagPublicPath, type TagTreeNode } from './components/tag-tree';

const BASE = '/projects/marketplace/tag-categories';

/**
 * دسته‌بندی تگ‌های قالب — هم برچسب قالب‌ها و هم دسته‌های سئو صفحهٔ ایده‌ها: هر تگ صفحهٔ فرود
 * /explore/<tag> دارد و آدرس قالب زیر اولین تگش ساخته می‌شود. فهرست درختی کامل (تگ‌ها کم‌تعدادند).
 */
export default function TemplateTagCategoriesPage() {
    const router = useRouter();
    const [nodes, setNodes] = useState<TagTreeNode[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [pendingDelete, setPendingDelete] = useState<TagTreeNode | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await templateTagCategoryApi.list({ page: 1, limit: 500 });
            setNodes(buildTagTree(res.items || []));
        } catch (e) {
            ErrorToaster(e);
            setNodes((prev) => prev || []);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!nodes || !query) return nodes || [];
        return nodes.filter((node) => node.name.toLowerCase().includes(query) || node._id.includes(query));
    }, [nodes, search]);

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setBusy(true);
        try {
            await templateTagCategoryApi.remove(pendingDelete.tag._id);
            SuccessToaster({ message: 'تگ حذف شد' });
            setPendingDelete(null);
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>دسته‌بندی تگ‌ها</h1>
                            <p className={parentStyles.subtitle}>
                                برچسب قالب‌ها و دسته‌های سئو صفحهٔ ایده‌ها — هر تگ صفحهٔ فرود خودش را دارد و آدرس قالب زیر اولین تگش ساخته می‌شود.
                            </p>
                        </div>
                        <Link href={`${BASE}/new`} className={parentStyles.primaryBtn}>+ تگ جدید</Link>
                    </header>

                    <TagCategoriesGuide />

                    <div className={styles.toolbar}>
                        <TableSearch value={search} onSearch={setSearch} placeholder="جستجوی نام یا کلید…" />
                        <span className={styles.count}>{toFarsiNumber(String(visible.length))} مورد</span>
                    </div>
                    <p className={styles.tableGuide}>
                        به چه درد می‌خورد؟ هر ردیف یک صفحهٔ فرود عمومی در اکسپلور است و ستون «آدرس» همان URL روی سایت است.
                        چطور استفاده کنم؟ برای تگ‌های پرکاربرد توضیح متا و متن معرفی بنویسید؛ تگ کم‌محتوا را noindex کنید.
                    </p>

                    {!nodes ? (
                        <LoadingState />
                    ) : nodes.length === 0 ? (
                        <div className={parentStyles.emptyState}>
                            <p>هنوز تگی ساخته نشده است.</p>
                            <Link href={`${BASE}/new`} className={parentStyles.primaryBtn}>+ اولین تگ</Link>
                        </div>
                    ) : visible.length === 0 ? (
                        <div className={parentStyles.emptyState}>
                            <p>با این جستجو تگی پیدا نشد.</p>
                            <button type="button" className={tabStyles.smallBtn} onClick={() => setSearch('')}>حذف جستجو</button>
                        </div>
                    ) : (
                        <div className={`${tabStyles.tableWrap} ${refreshing ? styles.refreshing : ''}`}>
                            <table className={tabStyles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام</th>
                                        <th>کلید</th>
                                        <th>آدرس روی سایت</th>
                                        <th>ترتیب</th>
                                        <th>سئو</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((node) => (
                                        <tr key={node._id}>
                                            <td data-label="نام" className={tabStyles.cellPrimary}>
                                                <span className={styles.treeName} style={{ paddingInlineStart: `${node.depth * 18}px` }}>
                                                    {node.depth > 0 ? <span className={styles.treeBranch} aria-hidden>└</span> : null}
                                                    <Link href={`${BASE}/${node.tag._id}`}>{node.name}</Link>
                                                    {node.childCount ? (
                                                        <span className={styles.childCount}>{toFarsiNumber(String(node.childCount))} زیرتگ</span>
                                                    ) : null}
                                                </span>
                                            </td>
                                            <td data-label="کلید" dir="ltr" className={styles.urlCell}>{node._id}</td>
                                            <td data-label="آدرس" dir="ltr" className={styles.urlCell}>{tagPublicPath(node)}</td>
                                            <td data-label="ترتیب">{toFarsiNumber(String(node.sortOrder ?? 0))}</td>
                                            <td data-label="سئو">
                                                {node.noindex ? (
                                                    <span className={`${parentStyles.badge} ${parentStyles.badgeInactive}`}>noindex</span>
                                                ) : node.metaDescription ? (
                                                    <span className={`${parentStyles.badge} ${parentStyles.badgeActive}`}>کامل</span>
                                                ) : (
                                                    <span className={parentStyles.badge} title="توضیح متا ندارد — متن پیش‌فرض صفحهٔ تگ استفاده می‌شود">بدون توضیح متا</span>
                                                )}
                                            </td>
                                            <td data-label="عملیات" className={hrStyles.actionCell}>
                                                <HrRowActionMenu
                                                    rowId={node.tag._id}
                                                    ariaLabel={`عملیات ${node.name}`}
                                                    items={[
                                                        { label: 'ویرایش', onClick: () => router.push(`${BASE}/${node.tag._id}`) },
                                                        { label: 'افزودن زیرتگ', onClick: () => router.push(`${BASE}/new?parent=${node._id}`) },
                                                        ...(node.depth === 0
                                                            ? [{ label: 'قالب‌های ویژه', onClick: () => router.push(`${BASE}/featured?tag=${node.tag._id}`) }]
                                                            : []),
                                                        ...(node.childCount
                                                            ? []
                                                            : [{ label: 'حذف', danger: true, onClick: () => setPendingDelete(node) }]),
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <ConfirmDialog
                    open={!!pendingDelete}
                    title="حذف تگ"
                    confirmLabel="حذف"
                    tone="danger"
                    busy={busy}
                    onConfirm={confirmDelete}
                    onClose={() => setPendingDelete(null)}
                >
                    {`تگ «${pendingDelete?.name || ''}» از انتخابگر تگ‌ها و آدرس ${pendingDelete ? tagPublicPath(pendingDelete) : ''} از سایت و سایت‌مپ برداشته می‌شود. قالب‌هایی که این تگ را دارند حذف نمی‌شوند؛ آدرسشان به تگ بعدی‌شان (یا /explore/<slug>) منتقل می‌شود.`}
                </ConfirmDialog>
            </Wrapper>
        </Container>
    );
}
