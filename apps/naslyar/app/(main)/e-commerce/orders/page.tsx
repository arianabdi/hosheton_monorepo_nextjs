'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { fetchOrders } from '../e-commerce-api';
import { EcOrder, EcOrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_TONE, PAYMENT_STATUS_LABELS, formatDate, formatToman } from '../e-commerce.types';

const toneClass: Record<string, string> = {
    success: styles.badgeSuccess,
    info: styles.badgeInfo,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    muted: styles.badgeMuted,
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<EcOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchOrders({ search: search || undefined, status: statusFilter || undefined, limit: 200 });
            setOrders(res?.orders || []);
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>سفارشات</h1>
                            <p className={styles.subtitle}>مدیریت چرخه کامل سفارش‌ها از پرداخت تا تحویل</p>
                        </div>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.orders} />

                    <div className={styles.toolbar}>
                        <input
                            className={styles.searchInput}
                            placeholder="جستجو بر اساس شماره سفارش..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select className={styles.selectInput} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">همه وضعیت‌ها</option>
                            {(Object.keys(ORDER_STATUS_LABELS) as EcOrderStatus[]).map((s) => (
                                <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{toFarsiNumber(orders.length)} سفارش</span>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : orders.length === 0 ? (
                        <div className={styles.emptyState}>سفارشی یافت نشد.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th>شماره سفارش</th>
                                        <th>مشتری</th>
                                        <th>اقلام</th>
                                        <th>مبلغ کل (تومان)</th>
                                        <th>پرداخت</th>
                                        <th>وضعیت</th>
                                        <th>تاریخ</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order._id}>
                                            <td className={styles.cellLtr} style={{ fontWeight: 700 }}>{order.orderNumber}</td>
                                            <td>{order.customerName || '—'}</td>
                                            <td>{toFarsiNumber(order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0)} عدد</td>
                                            <td>{formatToman(order.grandTotal)}</td>
                                            <td>
                                                <span className={`${styles.badge} ${order.paymentStatus === 'paid' ? styles.badgeSuccess : order.paymentStatus === 'refunded' ? styles.badgeMuted : styles.badgeWarning}`}>
                                                    {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${toneClass[ORDER_STATUS_TONE[order.status]] || styles.badgeMuted}`}>
                                                    {ORDER_STATUS_LABELS[order.status] || order.status}
                                                </span>
                                            </td>
                                            <td>{formatDate(order.createdAt)}</td>
                                            <td>
                                                <Link className={styles.smallBtn} href={`/e-commerce/orders/${order._id}`} style={{ textDecoration: 'none' }}>
                                                    جزئیات
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
