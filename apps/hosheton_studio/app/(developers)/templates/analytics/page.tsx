'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import type { AnalyticsDashboard } from '@/app/(marketplace)/lib/types';
import SalesWalletPanel from './SalesWalletPanel';
import styles from './AnalyticsTab.module.scss';

export default function TemplateAnalyticsPage() {
    const { t, i18n } = useTranslation('templates');
    const [data, setData] = useState<AnalyticsDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lang = i18n.language;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await marketplaceApi.getAnalytics();
            setData(result);
        } catch (err) {
            setError(getApiErrorMessage(err, t('load_analytics_error')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <p className={styles.loading}>{t('loading_analytics')}</p>;
    if (error || !data) return <p className={styles.error}>{error}</p>;

    const { summary, topTemplates, salesChart, templates } = data;
    const maxRevenue = Math.max(...salesChart.map((d) => d.revenue), 1);

    return (
        <div className={styles.wrap}>
            {/* کیف پول فروش محصولات (تومانی) + درخواست تسویه — جدا از کیف پول اصلی */}
            <SalesWalletPanel />

            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{t('kpi_views')}</span>
                    <span className={styles.kpiValue}>{formatAppNumber(summary.views, lang)}</span>
                </div>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{t('kpi_sales')}</span>
                    <span className={styles.kpiValue}>{formatAppNumber(summary.sales, lang)}</span>
                </div>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{t('kpi_revenue')}</span>
                    <span className={styles.kpiValue}>{formatAppNumber(summary.revenue, lang)}</span>
                </div>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{t('kpi_conversion')}</span>
                    <span className={styles.kpiValue}>{formatAppNumber(summary.conversionRate, lang)}%</span>
                </div>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{t('kpi_avg_sale')}</span>
                    <span className={styles.kpiValue}>{formatAppNumber(summary.avgRevenuePerSale, lang)}</span>
                </div>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>{t('kpi_approved')}</span>
                    <span className={styles.kpiValue}>{formatAppNumber(summary.approvedCount, lang)} / {formatAppNumber(summary.templateCount, lang)}</span>
                </div>
            </div>

            {salesChart.length > 0 && (
                <section className={styles.section}>
                    <h2>{t('sales_30d')}</h2>
                    <div className={styles.chart}>
                        {salesChart.map((d) => (
                            <div key={d.date} className={styles.barWrap} title={`${d.date}: ${t('toman_amount', { amount: formatAppNumber(d.revenue, lang) })}`}>
                                <div className={styles.bar} style={{ height: `${(d.revenue / maxRevenue) * 100}%` }} />
                                <span className={styles.barLabel}>{d.date.slice(5)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {topTemplates.length > 0 && (
                <section className={styles.section}>
                    <h2>{t('top_templates')}</h2>
                    <div className={styles.table}>
                        {topTemplates.map((item) => (
                            <div key={item._id} className={styles.tableRow}>
                                <span className={styles.tableTitle}>{item.title}</span>
                                <span>{t('views_n', { count: formatAppNumber(item.viewCount, lang) })}</span>
                                <span>{t('sales_n', { count: formatAppNumber(item.purchaseCount, lang) })}</span>
                                <span className={styles.revenue}>{t('toman_amount', { amount: formatAppNumber(item.totalRevenue, lang) })}</span>
                                <span>{t('conversion', { rate: formatAppNumber(item.conversionRate, lang) })}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className={styles.section}>
                <h2>{t('all_templates')}</h2>
                <div className={styles.table}>
                    {templates.map((item) => (
                        <div key={item._id} className={styles.tableRow}>
                            <span className={styles.tableTitle}>{item.title}</span>
                            <span className={styles.statusBadge}>{item.status}</span>
                            <span>{t('views_n', { count: formatAppNumber(item.viewCount, lang) })}</span>
                            <span>{t('sales_n', { count: formatAppNumber(item.purchaseCount, lang) })}</span>
                            <span>{item.isForSale && item.price > 0 ? t('toman_short', { amount: formatAppNumber(item.price, lang) }) : t('free')}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
