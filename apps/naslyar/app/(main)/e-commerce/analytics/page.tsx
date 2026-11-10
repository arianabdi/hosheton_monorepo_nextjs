'use client';

import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';

import React, { useCallback, useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import { fetchDashboard } from '../e-commerce-api';
import { EcDashboardData, formatToman } from '../e-commerce.types';

export default function AnalyticsPage() {
    const [data, setData] = useState<EcDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res: any = await fetchDashboard();
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

    const chartData = (data?.salesSeries || []).map((point) => ({
        date: point._id?.slice(5),
        'فروش (تومان)': point.revenue,
        'تعداد سفارش': point.count,
    }));

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>گزارش فروش</h1>
                            <p className={styles.subtitle}>روند فروش ۳۰ روز گذشته و پرفروش‌ترین محصولات</p>
                        </div>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.analytics} />

                    <div className={styles.sectionCard}>
                        <h3>فروش روزانه (۳۰ روز گذشته)</h3>
                        {chartData.length === 0 ? (
                            <div className={styles.emptyState}>داده فروشی برای نمایش وجود ندارد.</div>
                        ) : (
                            <div dir="ltr" style={{ width: '100%', height: 320 }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                        <Tooltip
                                            formatter={((value: any, name: string) =>
                                                name === 'فروش (تومان)' ? formatToman(Number(value)) : toFarsiNumber(Number(value))) as any}
                                        />
                                        <Bar dataKey="فروش (تومان)" fill="var(--brand-color)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className={styles.sectionCard}>
                        <h3>پرفروش‌ترین محصولات</h3>
                        {(data?.topProducts?.length || 0) === 0 ? (
                            <div className={styles.emptyState}>داده‌ای برای نمایش وجود ندارد.</div>
                        ) : (
                            <div className={styles.tableWrap}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>محصول</th>
                                            <th>تعداد فروش</th>
                                            <th>درآمد (تومان)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data?.topProducts.map((p, index) => (
                                            <tr key={p._id || index}>
                                                <td>{toFarsiNumber(index + 1)}</td>
                                                <td style={{ fontWeight: 600 }}>{p.title || '—'}</td>
                                                <td>{toFarsiNumber(p.totalQuantity)}</td>
                                                <td>{formatToman(p.totalRevenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </Wrapper>
        </Container>
    );
}
