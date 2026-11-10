'use client';

import ModuleGuide from './components/ModuleGuide';
import { ECOMMERCE_GUIDES } from './components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster } from '@my-workspace/utils';
import styles from './Ecommerce.module.scss';
import { fetchDashboard } from './e-commerce-api';
import { EcDashboardData, EcOrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_TONE, formatDate, formatToman } from './e-commerce.types';

const toneClass: Record<string, string> = {
    success: styles.badgeSuccess,
    info: styles.badgeInfo,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    muted: styles.badgeMuted,
};

export default function EcommerceDashboardPage() {
    const [data, setData] = useState<EcDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchDashboard();
            setData(res as any);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <LoadingState />
                    </div>
                </Wrapper>
            </Container>
        );
    }

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>ای‌کامرس</h1>
                            <p className={styles.subtitle}>
                                نمای کلی فروشگاه — فروش، سفارشات، موجودی و عملکرد محصولات
                            </p>
                        </div>
                        <Link className={styles.primaryBtn} href="/e-commerce/products">
                            مدیریت محصولات
                        </Link>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.dashboard} />

                    <div className={styles.statsBar}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{formatToman(data?.stats.totalRevenue)}</div>
                            <div className={styles.statLabel}>فروش کل (تومان)</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{formatToman(data?.stats.ordersCount)}</div>
                            <div className={styles.statLabel}>کل سفارشات</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{formatToman(data?.stats.customersCount)}</div>
                            <div className={styles.statLabel}>مشتریان</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{formatToman(data?.stats.productsCount)}</div>
                            <div className={styles.statLabel}>محصولات</div>
                        </div>
                    </div>

                    <div className={styles.overviewGrid}>
                        <div className={styles.sectionCard}>
                            <h3>آخرین سفارشات</h3>
                            {(data?.recentOrders?.length || 0) === 0 ? (
                                <div className={styles.emptyState}>هنوز سفارشی ثبت نشده است.</div>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>شماره سفارش</th>
                                                <th>مشتری</th>
                                                <th>مبلغ</th>
                                                <th>وضعیت</th>
                                                <th>تاریخ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data?.recentOrders.map((order) => (
                                                <tr key={order._id}>
                                                    <td>
                                                        <Link
                                                            href={`/e-commerce/orders/${order._id}`}
                                                            style={{ color: 'var(--brand-color)', textDecoration: 'none', fontWeight: 600 }}
                                                        >
                                                            <span className={styles.cellLtr}>{order.orderNumber}</span>
                                                        </Link>
                                                    </td>
                                                    <td>{order.customerName || '—'}</td>
                                                    <td>{formatToman(order.grandTotal)}</td>
                                                    <td>
                                                        <span className={`${styles.badge} ${toneClass[ORDER_STATUS_TONE[order.status as EcOrderStatus]] || styles.badgeMuted}`}>
                                                            {ORDER_STATUS_LABELS[order.status as EcOrderStatus]}
                                                        </span>
                                                    </td>
                                                    <td>{formatDate(order.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>هشدار موجودی کم</h3>
                            {(data?.lowStockItems?.length || 0) === 0 ? (
                                <div className={styles.emptyState}>موجودی همه محصولات مناسب است.</div>
                            ) : (
                                <div>
                                    {data?.lowStockItems.map((item) => (
                                        <div key={item._id} className={styles.infoRow}>
                                            <span className={styles.infoLabel}>
                                                {item.productTitle || item.sku || 'محصول'} — {item.warehouseName || 'انبار'}
                                            </span>
                                            <span className={`${styles.badge} ${styles.badgeDanger}`}>
                                                {formatToman((item.quantity || 0) - (item.reserved || 0))} عدد
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>پرفروش‌ترین محصولات</h3>
                            {(data?.topProducts?.length || 0) === 0 ? (
                                <div className={styles.emptyState}>داده‌ای برای نمایش وجود ندارد.</div>
                            ) : (
                                <div>
                                    {data?.topProducts.map((p, index) => (
                                        <div key={p._id || index} className={styles.infoRow}>
                                            <span className={styles.infoLabel}>
                                                {formatToman(index + 1)}. {p.title || '—'}
                                            </span>
                                            <span className={styles.infoValue}>
                                                {formatToman(p.totalQuantity)} عدد — {formatToman(p.totalRevenue)} تومان
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={styles.sectionCard}>
                            <h3>دسترسی سریع</h3>
                            <div className={styles.cellActions}>
                                <Link className={styles.secondaryBtn} href="/e-commerce/products/add">+ محصول جدید</Link>
                                <Link className={styles.secondaryBtn} href="/e-commerce/orders">سفارشات</Link>
                                <Link className={styles.secondaryBtn} href="/e-commerce/inventory">انبار</Link>
                                <Link className={styles.secondaryBtn} href="/e-commerce/coupons">کوپن‌ها</Link>
                                <Link className={styles.secondaryBtn} href="/e-commerce/analytics">گزارش فروش</Link>
                                <Link className={styles.secondaryBtn} href="/e-commerce/settings">تنظیمات</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
