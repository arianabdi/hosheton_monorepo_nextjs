'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import ContentCategoryGuide from './ContentCategoryGuide';
import styles from './ContentCategories.module.scss';
import {
    buildCategoryTree,
    categoryErrorMessage,
    contentCategoryApi,
    type ContentCategoryNode,
    type ContentCategorySectionConfig,
} from './content-categories';

/**
 * فهرست درختی دسته‌های سئو یک بخش (بلاگ، مستندات، قالب‌ها، …) — مشترک بین همهٔ اپ‌ها.
 * درخت کامل یک‌جا خوانده می‌شود (دسته‌ها کم‌تعدادند و ترتیب درختی صفحه‌بندی برنمی‌دارد).
 */
export default function ContentCategoryList({ config }: { config: ContentCategorySectionConfig }) {
    const router = useRouter();
    const { token } = useAuthStore();
    const { baseUrl } = useAppStore();
    const [nodes, setNodes] = useState<ContentCategoryNode[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [pendingDelete, setPendingDelete] = useState<ContentCategoryNode | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (!token || !baseUrl) return;
        setRefreshing(true);
        try {
            setNodes(buildCategoryTree(await contentCategoryApi.list(baseUrl, token, config.section)));
        } catch (e) {
            ErrorToaster(e);
            setNodes((prev) => prev || []);
        } finally {
            setRefreshing(false);
        }
    }, [token, baseUrl, config.section]);

    useEffect(() => {
        void load();
    }, [load]);

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!nodes || !query) return nodes || [];
        return nodes.filter((node) => node.name.toLowerCase().includes(query) || node.slug.includes(query));
    }, [nodes, search]);

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setBusy(true);
        try {
            await contentCategoryApi.remove(baseUrl, token, pendingDelete._id);
            SuccessToaster({ message: 'دسته حذف شد' });
            setPendingDelete(null);
            await load();
        } catch (e) {
            const message = categoryErrorMessage(e);
            if (message) ErrorToaster({ message });
            else ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const publicPath = (node: ContentCategoryNode) =>
        `${config.urlPrefix}/${(config.hierarchical ? node.path : [node.slug]).join('/')}`;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>{config.title}</h1>
                            <p className={parentStyles.subtitle}>{config.subtitle}</p>
                        </div>
                        <Link href={`${config.basePath}/new`} className={parentStyles.primaryBtn}>
                            + {config.hierarchical ? 'دسته' : 'موضوع'} جدید
                        </Link>
                    </header>

                    <ContentCategoryGuide config={config} />

                    <div className={styles.toolbar}>
                        <TableSearch value={search} onSearch={setSearch} placeholder="جستجوی نام یا slug…" />
                        <span className={styles.count}>{toFarsiNumber(String(visible.length))} مورد</span>
                    </div>
                    <p className={styles.tableGuide}>
                        به چه درد می‌خورد؟ هر ردیف یک صفحهٔ فرود عمومی است و ستون «آدرس» دقیقاً همان URL روی سایت است.
                        چطور استفاده کنم؟ دسته‌ای که هنوز محتوای کافی ندارد را «noindex» کنید تا از سایت‌مپ کنار برود.
                    </p>

                    {!nodes ? (
                        <LoadingState />
                    ) : nodes.length === 0 ? (
                        <div className={parentStyles.emptyState}>
                            <p>هنوز دسته‌ای ساخته نشده است.</p>
                            <Link href={`${config.basePath}/new`} className={parentStyles.primaryBtn}>+ اولین دسته</Link>
                        </div>
                    ) : visible.length === 0 ? (
                        <div className={parentStyles.emptyState}>
                            <p>با این جستجو دسته‌ای پیدا نشد.</p>
                            <button type="button" className={tabStyles.smallBtn} onClick={() => setSearch('')}>حذف جستجو</button>
                        </div>
                    ) : (
                        <div className={`${tabStyles.tableWrap} ${refreshing ? styles.refreshing : ''}`}>
                            <table className={tabStyles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>نام</th>
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
                                                    <Link href={`${config.basePath}/${node._id}`}>{node.name}</Link>
                                                    {node.childCount ? (
                                                        <span className={styles.childCount}>{toFarsiNumber(String(node.childCount))} زیردسته</span>
                                                    ) : null}
                                                </span>
                                            </td>
                                            <td data-label="آدرس" dir="ltr" className={styles.urlCell}>{publicPath(node)}</td>
                                            <td data-label="ترتیب">{toFarsiNumber(String(node.sortOrder ?? 0))}</td>
                                            <td data-label="سئو">
                                                {node.noindex ? (
                                                    <span className={`${parentStyles.badge} ${parentStyles.badgeInactive}`}>noindex</span>
                                                ) : node.metaDescription ? (
                                                    <span className={`${parentStyles.badge} ${parentStyles.badgeActive}`}>کامل</span>
                                                ) : (
                                                    <span className={parentStyles.badge} title="توضیح متا ندارد — گوگل خودش از متن صفحه برمی‌دارد">بدون توضیح متا</span>
                                                )}
                                            </td>
                                            <td data-label="عملیات" className={hrStyles.actionCell}>
                                                <HrRowActionMenu
                                                    rowId={node._id}
                                                    ariaLabel={`عملیات ${node.name}`}
                                                    items={[
                                                        { label: 'ویرایش', onClick: () => router.push(`${config.basePath}/${node._id}`) },
                                                        ...(config.hierarchical
                                                            ? [{ label: 'افزودن زیردسته', onClick: () => router.push(`${config.basePath}/new?parent=${node._id}`) }]
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
                    title="حذف دسته"
                    confirmLabel="حذف"
                    tone="danger"
                    busy={busy}
                    onConfirm={confirmDelete}
                    onClose={() => setPendingDelete(null)}
                >
                    {`دستهٔ «${pendingDelete?.name || ''}» حذف می‌شود و آدرس ${pendingDelete ? publicPath(pendingDelete) : ''} از سایت و سایت‌مپ برداشته می‌شود. محتوای داخل آن حذف نمی‌شود ولی بدون دسته می‌ماند — قبلش محتوا را به دستهٔ دیگری منتقل کنید.`}
                </ConfirmDialog>
            </Wrapper>
        </Container>
    );
}
