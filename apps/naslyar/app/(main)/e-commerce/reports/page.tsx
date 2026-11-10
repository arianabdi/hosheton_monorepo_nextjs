'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Container, Wrapper } from '@/app/(main)/layout';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import styles from '../Ecommerce.module.scss';
import ModuleGuide from '../components/ModuleGuide';
import { ECOMMERCE_GUIDES } from '../components/guides';
import {
    fetchReportCustomers,
    fetchReportFinance,
    fetchReportMarketing,
    fetchReportOperations,
    fetchReportOverview,
    fetchReportProducts,
    fetchReportSales,
} from '../e-commerce-api';
import { formatToman } from '../e-commerce.types';

type Tab = 'overview' | 'sales' | 'customers' | 'products' | 'marketing' | 'finance' | 'operations';

const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'نمای کلی' },
    { id: 'sales', label: 'فروش' },
    { id: 'customers', label: 'مشتریان' },
    { id: 'products', label: 'محصولات' },
    { id: 'marketing', label: 'بازاریابی' },
    { id: 'finance', label: 'مالی' },
    { id: 'operations', label: 'عملیات' },
];

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#0891b2', '#e11d48', '#65a30d'];

const fmt = (v: number) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}م` : v >= 1000 ? `${Math.round(v / 1000)}ه` : String(v));

function KpiCard({ label, value, delta }: { label: string; value: string; delta?: number }) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>
                {label}
                {delta !== undefined && (
                    <span style={{ marginRight: '0.5rem', color: delta >= 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                        ({delta >= 0 ? '+' : ''}
                        {toFarsiNumber(delta)}٪)
                    </span>
                )}
            </div>
        </div>
    );
}

function InsightCard({ type, title, body }: { type: string; title: string; body: string }) {
    const tone = type === 'success' ? styles.badgeSuccess : type === 'warning' ? styles.badgeWarning : styles.badgeInfo;
    return (
        <div className={styles.sectionCard} style={{ padding: '1rem 1.25rem', marginBottom: 0 }}>
            <span className={`${styles.badge} ${tone}`}>{title}</span>
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', lineHeight: 1.9 }}>{body}</p>
        </div>
    );
}

const tooltipFormatter = (value: any) => formatToman(Number(value));

export default function ReportsPage() {
    const [tab, setTab] = useState<Tab>('overview');
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Record<string, any>>({});

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [overview, sales, customers, products, marketing, finance, operations] = await Promise.all([
                fetchReportOverview(days),
                fetchReportSales(days),
                fetchReportCustomers(90),
                fetchReportProducts(Math.max(days, 60)),
                fetchReportMarketing(Math.max(days, 60)),
                fetchReportFinance(Math.max(days, 60)),
                fetchReportOperations(Math.max(days, 60)),
            ]);
            setData({ overview, sales, customers, products, marketing, finance, operations });
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        load();
    }, [load]);

    const ov = data.overview;
    const sa = data.sales;
    const cu = data.customers;
    const pr = data.products;
    const ma = data.marketing;
    const fi = data.finance;
    const op = data.operations;

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`} style={{ maxWidth: 'none' }}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>گزارش‌های فروشگاه</h1>
                            <p className={styles.subtitle}>تصمیم‌گیری با داده — فروش، مشتری، محصول، بازاریابی، مالی و عملیات</p>
                        </div>
                        <select className={styles.selectInput} value={days} onChange={(e) => setDays(Number(e.target.value))}>
                            <option value={7}>۷ روز اخیر</option>
                            <option value={30}>۳۰ روز اخیر</option>
                            <option value={60}>۶۰ روز اخیر</option>
                            <option value={90}>۹۰ روز اخیر</option>
                        </select>
                    </header>

                    <ModuleGuide guide={ECOMMERCE_GUIDES.reports} />

                    <div className={styles.tabs}>
                        {TABS.map((t) => (
                            <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.active : ''}`} onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : (
                        <>
                            {/* ============================ نمای کلی ============================ */}
                            {tab === 'overview' && ov && (
                                <>
                                    <div className={styles.statsBar}>
                                        <KpiCard label="فروش دوره (تومان)" value={formatToman(ov.kpis.revenue)} delta={ov.kpis.revenueDelta} />
                                        <KpiCard label="تعداد سفارش" value={toFarsiNumber(ov.kpis.orders)} delta={ov.kpis.ordersDelta} />
                                        <KpiCard label="میانگین سبد (تومان)" value={formatToman(ov.kpis.aov)} delta={ov.kpis.aovDelta} />
                                        <KpiCard label="مشتریان" value={toFarsiNumber(ov.kpis.customers)} />
                                    </div>

                                    <div className={styles.sectionCard}>
                                        <h3>روند فروش و سفارش</h3>
                                        <div dir="ltr" style={{ width: '100%', height: 320 }}>
                                            <ResponsiveContainer>
                                                <ComposedChart data={ov.series || []} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                                    <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                                                    <Tooltip formatter={tooltipFormatter} />
                                                    <Legend />
                                                    <Bar yAxisId="l" dataKey="revenue" name="فروش (تومان)" fill="var(--brand-color)" radius={[4, 4, 0, 0]} />
                                                    <Line yAxisId="r" dataKey="orders" name="سفارش" stroke="#16a34a" strokeWidth={2} />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className={styles.overviewGrid}>
                                        <div className={styles.sectionCard}>
                                            <h3>قیف فروش</h3>
                                            {(ov.funnel || []).map((step: any) => (
                                                <div key={step.key} style={{ marginBottom: '0.9rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                                                        <span style={{ fontWeight: 600 }}>{step.label}</span>
                                                        <span>
                                                            {toFarsiNumber(step.value)}
                                                            {step.fromPrev !== undefined && step.key !== 'customers' && (
                                                                <span style={{ opacity: 0.6 }}> ({toFarsiNumber(step.fromPrev)}٪ از مرحله قبل)</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div style={{ height: 14, borderRadius: 7, background: 'rgba(0,0,0,0.06)' }}>
                                                        <div
                                                            style={{
                                                                height: '100%',
                                                                width: `${Math.max(step.percentOfTop, 3)}%`,
                                                                borderRadius: 7,
                                                                background: 'var(--brand-color)',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            <p className={styles.fieldHint}>قیف واقعی پلتفرم: مشتریان ثبت‌شده ← سبد خرید ← سفارش ← خرید موفق</p>
                                        </div>

                                        <div>
                                            <h3 style={{ margin: '0 0 1rem', fontWeight: 700 }}>تحلیل‌های هوشمند</h3>
                                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                {(ov.insights || []).map((card: any, i: number) => (
                                                    <InsightCard key={i} type={card.type} title={card.title} body={card.body} />
                                                ))}
                                                {(ov.insights || []).length === 0 && <div className={styles.emptyState}>فعلاً تحلیل خودکاری ثبت نشده.</div>}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ============================ فروش ============================ */}
                            {tab === 'sales' && sa && (
                                <>
                                    <div className={styles.sectionCard}>
                                        <h3>فروش روزانه</h3>
                                        <div dir="ltr" style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <LineChart data={sa.daily || []}>
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                    <Tooltip formatter={tooltipFormatter} />
                                                    <Line dataKey="revenue" name="فروش (تومان)" stroke="var(--brand-color)" strokeWidth={2} dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className={styles.overviewGrid}>
                                        <div className={styles.sectionCard}>
                                            <h3>فروش بر اساس دسته‌بندی</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 280 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={sa.byCategory || []} layout="vertical">
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                                                        <Tooltip formatter={tooltipFormatter} />
                                                        <Bar dataKey="revenue" name="فروش (تومان)" fill="#2563eb" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>فروش بر اساس برند</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 280 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={sa.byBrand || []} layout="vertical">
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                                                        <Tooltip formatter={tooltipFormatter} />
                                                        <Bar dataKey="revenue" name="فروش (تومان)" fill="#16a34a" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>میانگین ارزش سبد (AOV)</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 260 }}>
                                                <ResponsiveContainer>
                                                    <LineChart data={sa.aovTrend || []}>
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                        <Tooltip formatter={tooltipFormatter} />
                                                        <Line dataKey="aov" name="میانگین سبد" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>فروش بر اساس شهر</h3>
                                            {(sa.byProvince || []).map((row: any) => (
                                                <div key={row.city} className={styles.infoRow}>
                                                    <span className={styles.infoLabel}>{row.city}</span>
                                                    <span className={styles.infoValue}>
                                                        {formatToman(row.revenue)} تومان — {toFarsiNumber(row.orders)} سفارش
                                                    </span>
                                                </div>
                                            ))}
                                            {(sa.byProvince || []).length === 0 && <div className={styles.emptyState}>داده‌ای نیست.</div>}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ============================ مشتریان ============================ */}
                            {tab === 'customers' && cu && (
                                <>
                                    <div className={styles.overviewGrid}>
                                        <div className={styles.sectionCard}>
                                            <h3>مشتری جدید vs تکراری</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 280 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={cu.newVsReturning || []}>
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Bar dataKey="newC" name="مشتری جدید" stackId="a" fill="#2563eb" />
                                                        <Bar dataKey="returning" name="مشتری تکراری" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>توزیع ارزش طول عمر مشتری (LTV)</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 280 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={cu.ltvDistribution || []}>
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="count" name="تعداد مشتری" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.overviewGrid}>
                                        <div className={styles.sectionCard}>
                                            <h3>سگمنت‌های مشتریان (RFM)</h3>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>💎 VIP (خرید بالا + فعال)</span>
                                                <span className={styles.infoValue}>
                                                    {toFarsiNumber(cu.rfm?.vip?.count || 0)} نفر — {toFarsiNumber(cu.rfm?.vip?.revenueShare || 0)}٪ درآمد
                                                </span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>💙 وفادار (بیش از یک خرید)</span>
                                                <span className={styles.infoValue}>{toFarsiNumber(cu.rfm?.loyal?.count || 0)} نفر</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>🤍 بالقوه</span>
                                                <span className={styles.infoValue}>{toFarsiNumber(cu.rfm?.potential?.count || 0)} نفر</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>⚠️ در خطر ریزش (بیش از ۴۵ روز غیبت)</span>
                                                <span className={styles.infoValue}>{toFarsiNumber(cu.rfm?.atRisk?.count || 0)} نفر</span>
                                            </div>
                                            {(cu.rfm?.vip?.top || []).length > 0 && (
                                                <div style={{ borderTop: '1px dashed var(--plan-card-border-color)', marginTop: '0.75rem', paddingTop: '0.5rem' }}>
                                                    {cu.rfm.vip.top.map((c: any, i: number) => (
                                                        <div key={i} className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>{c.name}</span>
                                                            <span className={styles.infoValue}>{formatToman(c.revenue)} تومان</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>پرتکرارترین مشتریان (LTV)</h3>
                                            <div className={styles.tableWrap}>
                                                <table className={styles.dataTable} style={{ minWidth: 0 }}>
                                                    <thead>
                                                        <tr>
                                                            <th>مشتری</th>
                                                            <th>سفارش‌ها</th>
                                                            <th>مجموع خرید</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(cu.topCustomers || []).map((c: any, i: number) => (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: 600 }}>{c.name}</td>
                                                                <td>{toFarsiNumber(c.orders)}</td>
                                                                <td>{formatToman(c.revenue)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ============================ محصولات ============================ */}
                            {tab === 'products' && pr && (
                                <>
                                    <div className={styles.overviewGrid}>
                                        <div className={styles.sectionCard}>
                                            <h3>پرفروش‌ترین محصولات</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 300 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={pr.topByRevenue || []} layout="vertical">
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                        <YAxis type="category" dataKey="title" width={140} tick={{ fontSize: 10 }} />
                                                        <Tooltip formatter={tooltipFormatter} />
                                                        <Bar dataKey="revenue" name="فروش (تومان)" fill="#2563eb" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>سودده‌ترین محصولات (تخمینی)</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 300 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={pr.topByProfit || []} layout="vertical">
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                        <YAxis type="category" dataKey="title" width={140} tick={{ fontSize: 10 }} />
                                                        <Tooltip formatter={tooltipFormatter} />
                                                        <Bar dataKey="profit" name="سود (تومان)" fill="#16a34a" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.overviewGrid}>
                                        <div className={styles.sectionCard}>
                                            <h3>قانون پارتو (۸۰/۲۰)</h3>
                                            <p className={styles.fieldHint} style={{ marginTop: 0 }}>
                                                چند درصد درآمد از چند محصول اول می‌آید؟
                                            </p>
                                            {(pr.pareto || []).map((row: any, i: number) => (
                                                <div key={i} className={styles.infoRow}>
                                                    <span className={styles.infoLabel}>
                                                        {toFarsiNumber(i + 1)}. {row.title}
                                                    </span>
                                                    <span className={styles.infoValue}>
                                                        {toFarsiNumber(row.cumulativeShare)}٪ درآمد تجمعی
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>پیش‌بینی اتمام موجودی</h3>
                                            <div className={styles.tableWrap}>
                                                <table className={styles.dataTable} style={{ minWidth: 0 }}>
                                                    <thead>
                                                        <tr>
                                                            <th>محصول</th>
                                                            <th>SKU</th>
                                                            <th>قابل فروش</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(pr.inventoryForecast || []).map((row: any, i: number) => (
                                                            <tr key={i}>
                                                                <td>{row.productTitle || '—'}</td>
                                                                <td className={styles.cellLtr}>{row.sku}</td>
                                                                <td>
                                                                    <span className={`${styles.badge} ${row.available <= 5 ? styles.badgeDanger : styles.badgeWarning}`}>
                                                                        {toFarsiNumber(row.available)} عدد
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {(pr.inventoryForecast || []).length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} style={{ textAlign: 'center' }}>موجودی همه محصولات مناسب است.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ============================ بازاریابی ============================ */}
                            {tab === 'marketing' && ma && (
                                <div className={styles.overviewGrid}>
                                    <div className={styles.sectionCard}>
                                        <h3>درآمد بر اساس کانال ورود</h3>
                                        <div dir="ltr" style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={ma.bySource || []}
                                                        dataKey="revenue"
                                                        nameKey="name"
                                                        outerRadius={110}
                                                        label={(entry: any) => entry.name}
                                                    >
                                                        {(ma.bySource || []).map((entry: any, i: number) => (
                                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={tooltipFormatter} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className={styles.sectionCard}>
                                        <h3>سفارش بر اساس دستگاه</h3>
                                        <div dir="ltr" style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={ma.byDevice || []}
                                                        dataKey="orders"
                                                        nameKey="device"
                                                        innerRadius={60}
                                                        outerRadius={110}
                                                        label={(entry: any) => (entry.device === 'mobile' ? 'موبایل' : 'دسکتاپ')}
                                                    >
                                                        {(ma.byDevice || []).map((entry: any, i: number) => (
                                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className={styles.sectionCard}>
                                        <h3>عملکرد کوپن‌ها</h3>
                                        <div className={styles.tableWrap}>
                                            <table className={styles.dataTable} style={{ minWidth: 0 }}>
                                                <thead>
                                                    <tr>
                                                        <th>کد</th>
                                                        <th>عنوان</th>
                                                        <th>مصرف</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(ma.coupons || []).map((c: any) => (
                                                        <tr key={c.code}>
                                                            <td className={styles.cellLtr} style={{ fontWeight: 700 }}>{c.code}</td>
                                                            <td>{c.title || '—'}</td>
                                                            <td>{toFarsiNumber(c.usedCount)} بار</td>
                                                        </tr>
                                                    ))}
                                                    {(ma.coupons || []).length === 0 && (
                                                        <tr>
                                                            <td colSpan={3} style={{ textAlign: 'center' }}>کوپنی استفاده نشده.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ============================ مالی ============================ */}
                            {tab === 'finance' && fi && (
                                <>
                                    <div className={styles.sectionCard}>
                                        <h3>درآمد vs سود ناخالص</h3>
                                        <div dir="ltr" style={{ width: '100%', height: 320 }}>
                                            <ResponsiveContainer>
                                                <ComposedChart data={fi.trend || []}>
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                    <Tooltip formatter={tooltipFormatter} />
                                                    <Legend />
                                                    <Bar dataKey="revenue" name="درآمد" fill="#2563eb" radius={[3, 3, 0, 0]} />
                                                    <Bar dataKey="cost" name="قیمت تمام‌شده" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                                                    <Line dataKey="grossProfit" name="سود ناخالص" stroke="#16a34a" strokeWidth={2} />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <p className={styles.fieldHint}>سود بر اساس قیمت خرید (costPrice) واریانت‌ها تخمین زده می‌شود.</p>
                                    </div>

                                    <div className={styles.overviewGrid}>
                                        <div className={styles.sectionCard}>
                                            <h3>روند بازپرداخت‌ها</h3>
                                            {(fi.refunds || []).length === 0 ? (
                                                <div className={styles.emptyState}>بازپرداختی در این دوره نیست.</div>
                                            ) : (
                                                (fi.refunds || []).map((r: any) => (
                                                    <div key={r.date} className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>{r.date}</span>
                                                        <span className={styles.infoValue}>
                                                            {formatToman(r.amount)} — {toFarsiNumber(r.count)} مورد
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>اثر تخفیف‌ها</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 260 }}>
                                                <ResponsiveContainer>
                                                    <ComposedChart data={fi.discountTrend || []}>
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                                                        <Tooltip formatter={tooltipFormatter} />
                                                        <Legend />
                                                        <Bar dataKey="discounts" name="تخفیف" fill="#dc2626" radius={[3, 3, 0, 0]} />
                                                        <Line dataKey="revenue" name="فروش" stroke="#2563eb" strokeWidth={2} />
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ============================ عملیات ============================ */}
                            {tab === 'operations' && op && (
                                <>
                                    <div className={styles.statsBar}>
                                        <KpiCard label="میانگین زمان پرداخت سفارش" value={`${toFarsiNumber(op.avgFulfillmentHours || 0)} ساعت`} />
                                        <KpiCard label="سفارش‌های لغوشده" value={toFarsiNumber(op.cancelCount || 0)} />
                                        <KpiCard label="درخواست مرجوعی" value={toFarsiNumber(op.returnsCount || 0)} />
                                    </div>

                                    <div className={styles.overviewGrid}>
                                        <div className={styles.sectionCard}>
                                            <h3>توزیع وضعیت سفارش‌ها</h3>
                                            <div dir="ltr" style={{ width: '100%', height: 300 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={op.statusDistribution || []} layout="vertical">
                                                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                                        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="count" name="تعداد" fill="#2563eb" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className={styles.sectionCard}>
                                            <h3>دلایل مرجوعی</h3>
                                            {(op.returnsByReason || []).length === 0 ? (
                                                <div className={styles.emptyState}>مرجوعی‌ای در این دوره ثبت نشده.</div>
                                            ) : (
                                                (op.returnsByReason || []).map((row: any, i: number) => (
                                                    <div key={i} className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>{row.reason}</span>
                                                        <span className={styles.infoValue}>{toFarsiNumber(row.count)} مورد</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
