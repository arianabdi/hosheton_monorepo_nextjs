'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { deleteProduct, fetchProducts } from '../e-commerce-api';
import {
    EcProduct,
    EcProductStatus,
    PRODUCT_STATUS_LABELS,
    PRODUCT_TYPE_LABELS,
    formatToman,
} from '../e-commerce.types';

const statusBadge: Record<EcProductStatus, string> = {
    draft: styles.badgeWarning,
    published: styles.badgeSuccess,
    archived: styles.badgeMuted,
    hidden: styles.badgeInfo,
};

export default function ProductsPage() {
    const [products, setProducts] = useState<EcProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchProducts({ search: search || undefined, status: statusFilter || undefined, limit: 200 });
            setProducts(res?.products || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const handleDelete = async (product: EcProduct) => {
        if (!window.confirm(`محصول «${product.titleFa}» حذف شود؟`)) return;
        try {
            await deleteProduct(product._id);
            SuccessToaster({ message: 'محصول حذف شد' });
            load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    const stats = useMemo(() => {
        const published = products.filter((p) => p.status === 'published').length;
        const outOfStock = products.filter((p) => (p as any).totalStock === 0).length;
        return { total: products.length, published, outOfStock };
    }, [products]);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>محصولات</h1>
                            <p className={styles.subtitle}>مدیریت کاتالوگ محصولات، واریانت‌ها و قیمت‌ها</p>
                        </div>
                        <Link className={styles.primaryBtn} href="/e-commerce/products/add">+ افزودن محصول</Link>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.products} />

                    <div className={styles.toolbar}>
                        <input
                            className={styles.searchInput}
                            placeholder="جستجو بر اساس نام یا اسلاگ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                            className={styles.selectInput}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">همه وضعیت‌ها</option>
                            {(Object.keys(PRODUCT_STATUS_LABELS) as EcProductStatus[]).map((s) => (
                                <option key={s} value={s}>{PRODUCT_STATUS_LABELS[s]}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                            {toFarsiNumber(stats.total)} محصول — {toFarsiNumber(stats.published)} منتشر شده
                        </span>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : products.length === 0 ? (
                        <div className={styles.emptyState}>محصولی یافت نشد. اولین محصول خود را بسازید.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>محصول</th>
                                        <th>نوع</th>
                                        <th>برند</th>
                                        <th>قیمت (تومان)</th>
                                        <th>وضعیت</th>
                                        <th>تاریخ ایجاد</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => {
                                        const price = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
                                        return (
                                            <tr key={product._id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        {product.images?.[0] ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={product.images[0]}
                                                                alt={product.titleFa}
                                                                style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                                                            />
                                                        ) : null}
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{product.titleFa}</div>
                                                            <div className={styles.cellLtr} style={{ opacity: 0.6, fontSize: '0.75rem' }}>
                                                                {product.slug}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{PRODUCT_TYPE_LABELS[product.productType] || product.productType}</td>
                                                <td>{product.brandName || '—'}</td>
                                                <td>{formatToman(price)}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${statusBadge[product.status] || styles.badgeMuted}`}>
                                                        {PRODUCT_STATUS_LABELS[product.status] || product.status}
                                                    </span>
                                                </td>
                                                <td>{toFarsiNumber(new Date(product.createdAt || '').toLocaleDateString('fa-IR'))}</td>
                                                <td>
                                                    <div className={styles.cellActions}>
                                                        <Link
                                                            className={styles.smallBtn}
                                                            href={`/e-commerce/products/${product._id}`}
                                                        >
                                                            ویرایش
                                                        </Link>
                                                        <button className={styles.deleteBtn} onClick={() => handleDelete(product)}>
                                                            حذف
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
