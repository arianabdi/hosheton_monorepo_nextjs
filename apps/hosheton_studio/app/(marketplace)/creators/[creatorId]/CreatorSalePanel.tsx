'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuInfo, LuLightbulb } from 'react-icons/lu';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    YAxis,
} from 'recharts';
import { formatAppAmount, formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { useMyReferral } from '@/app/(marketplace)/lib/useMyReferral';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import type { AnalyticsDashboard } from '@/app/(marketplace)/lib/types';
import styles from './CreatorProfile.module.scss';

function formatToman(amount: number, tomanLabel: string) {
    // جداکننده هزارگان لاتین — اعداد صفحه فروش همیشه انگلیسی
    return `${formatAppAmount(Math.round(amount), 'en')} ${tomanLabel}`;
}

/** سری ۱۲ ماه اخیر (YYYY-MM) از نقشه ماه ← مقدار؛ ماه‌های بدون داده صفر */
function lastTwelveMonths(byMonth: Map<string, number>): Array<{ label: string; value: number }> {
    const now = new Date();
    const out: Array<{ label: string; value: number }> = [];
    for (let i = 11; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        out.push({ label: date.toLocaleString('en', { month: 'narrow' }), value: byMonth.get(monthKey) || 0 });
    }
    return out;
}

/** سری ماهانه‌ی یک کلید از نمودار روزانه فروش */
function buildMonthlySeries(
    rows: Array<{ date: string; sales: number; revenue: number }>,
    key: 'sales' | 'revenue',
): Array<{ label: string; value: number }> {
    const byMonth = new Map<string, number>();
    for (const row of rows || []) {
        const parts = String(row.date || '').split('-');
        if (parts.length < 2) continue;
        const monthKey = `${parts[0]}-${parts[1]}`;
        byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + (Number(row[key]) || 0));
    }
    return lastTwelveMonths(byMonth);
}

/** درصد تغییر دوره — null یعنی داده‌ی دوره قبل نیست */
function pctChange(cur: number, prev: number): number | null {
    if (prev <= 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
}

export default function CreatorSalePanel() {
    const { t } = useTranslation('marketplace');
    const [data, setData] = useState<AnalyticsDashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    // درآمد دعوت برای نوار خلاصه — همان داده کارت hero و تب دعوت (یک درخواست مشترک)
    const { overview: referral } = useMyReferral();

    useEffect(() => {
        marketplaceApi.getAnalytics()
            .then(setData)
            .catch((err) => setError(getApiErrorMessage(err, t('load_profile_error'))));
    }, [t]);

    const chartRows = useMemo(() => data?.salesChart || [], [data]);
    const monthlyRevenue = useMemo(() => buildMonthlySeries(chartRows, 'revenue'), [chartRows]);
    // سری ماهانه پاداش‌های معتبر از سرور (نه فقط چند پاداش اخیر)
    const monthlyReferral = useMemo(
        () => lastTwelveMonths(new Map((referral?.monthly || []).map((row) => [row.month, row.amount]))),
        [referral],
    );

    if (error) return <p className={styles.error}>{error}</p>;
    if (!data) return <p className={styles.loading}>{t('loading_templates')}</p>;

    const { summary, recentSales, templates, topTemplates } = data;
    const titleById = Object.fromEntries(templates.map((item) => [item._id, item.title]));

    // نوار خلاصه درآمد — مشتقات سری‌های ماهانه
    const monthlyTotal = monthlyRevenue.map((row, i) => ({
        label: row.label,
        value: row.value + (monthlyReferral[i]?.value || 0),
    }));
    const monthRevCur = monthlyRevenue[monthlyRevenue.length - 1]?.value ?? 0;
    const monthRevPrev = monthlyRevenue[monthlyRevenue.length - 2]?.value ?? 0;
    const monthTotalCur = monthlyTotal[monthlyTotal.length - 1]?.value ?? 0;
    const monthTotalPrev = monthlyTotal[monthlyTotal.length - 2]?.value ?? 0;
    const monthAvgRevenue = Math.round(monthlyRevenue.reduce((sum, row) => sum + row.value, 0) / 12);

    // دلتای رنگ‌شده — سبز/قرمز؛ بدون داده‌ی دوره قبل «—»
    const renderDelta = (cur: number, prev: number, vsKey: string) => {
        const pct = pctChange(cur, prev);
        if (pct == null) return <span className={styles.summaryStatValue}>—</span>;
        const cls = pct > 0 ? styles.summaryUp : pct < 0 ? styles.summaryDown : '';
        const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
        return (
            <span className={`${styles.summaryStatValue} ${cls}`}>
                {sign}{formatAppNumber(Math.abs(pct), 'en')}% {t(vsKey)}
            </span>
        );
    };

    const tips = [t('sale_tip_1'), t('sale_tip_2'), t('sale_tip_3')];

    return (
        <div className={styles.saleWrap}>
            {/* نوار خلاصه درآمد — فروش / کد دعوت / کل (ماهانه) */}
            <section className={styles.summaryStrip}>
                <div className={styles.summaryCell}>
                    <h4 className={styles.summaryTitle}>{t('income_tab_templates')}</h4>
                    <div className={styles.summaryMain}>
                        <div className={styles.summaryValue}>
                            {formatToman(summary.revenue, t('toman'))}
                        </div>
                        <div className={styles.summarySpark}>
                            <ResponsiveContainer width="100%" height={64}>
                                <BarChart data={monthlyRevenue} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                    <Tooltip formatter={(value) => formatToman(Number(value) || 0, t('toman'))} />
                                    <YAxis hide domain={[0, 'dataMax + 1']} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className={styles.summaryStats}>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('sale_count')}</span>
                            <span className={styles.summaryStatValue}>{formatAppAmount(summary.sales, 'en')}</span>
                        </div>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('sale_summary_month_avg')}</span>
                            <span className={styles.summaryStatValue}>{formatToman(monthAvgRevenue, t('toman'))}</span>
                        </div>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('sale_vs_prev_month')}</span>
                            {renderDelta(monthRevCur, monthRevPrev, 'sale_vs_prev_month')}
                        </div>
                    </div>
                </div>

                <div className={styles.summaryCell}>
                    <h4 className={styles.summaryTitle}>{t('income_tab_referral')}</h4>
                    <div className={styles.summaryMain}>
                        <div className={styles.summaryValue}>
                            {referral ? formatToman(referral.stats?.totalRewards ?? 0, t('toman')) : '—'}
                        </div>
                        <div className={styles.summarySpark}>
                            <ResponsiveContainer width="100%" height={64}>
                                <BarChart data={monthlyReferral} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                    <Tooltip formatter={(value) => formatToman(Number(value) || 0, t('toman'))} />
                                    <YAxis hide domain={[0, 'dataMax + 1']} />
                                    <Bar dataKey="value" fill="var(--brand-color)" radius={[2, 2, 0, 0]} maxBarSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className={styles.summaryStats}>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('income_wallet_reward_paid')}</span>
                            <span className={styles.summaryStatValue}>
                                {referral ? formatToman(referral.stats?.paidAmount ?? 0, t('toman')) : '—'}
                            </span>
                        </div>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('income_wallet_reward_pending')}</span>
                            <span className={styles.summaryStatValue}>
                                {referral ? formatToman(referral.stats?.pendingAmount ?? 0, t('toman')) : '—'}
                            </span>
                        </div>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('income_wallet_successful_referrals')}</span>
                            <span className={styles.summaryStatValue}>
                                {referral ? formatAppNumber(referral.stats?.successfulReferrals ?? 0, 'en') : '—'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.summaryCell}>
                    <h4 className={styles.summaryTitle}>{t('sale_summary_total')}</h4>
                    <div className={styles.summaryMain}>
                        <div className={styles.summaryValue}>
                            {formatToman(monthTotalCur, t('toman'))}
                        </div>
                        <div className={styles.summarySpark}>
                            <ResponsiveContainer width="100%" height={64}>
                                <BarChart data={monthlyTotal} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                    <Tooltip formatter={(value) => formatToman(Number(value) || 0, t('toman'))} />
                                    <YAxis hide domain={[0, 'dataMax + 1']} />
                                    <Bar dataKey="value" fill="#ec4899" radius={[2, 2, 0, 0]} maxBarSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className={styles.summaryStats}>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('sale_income_month_sales')}</span>
                            <span className={styles.summaryStatValue}>{formatToman(monthRevCur, t('toman'))}</span>
                        </div>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('sale_income_month_referral')}</span>
                            <span className={styles.summaryStatValue}>
                                {formatToman(monthlyReferral[monthlyReferral.length - 1]?.value ?? 0, t('toman'))}
                            </span>
                        </div>
                        <div className={styles.summaryStat}>
                            <span className={styles.summaryStatLabel}>{t('sale_vs_prev_month')}</span>
                            {renderDelta(monthTotalCur, monthTotalPrev, 'sale_vs_prev_month')}
                        </div>
                    </div>
                </div>
            </section>

            {/* پرفروش‌ترین قالب‌ها */}
            <section className={styles.saleCard}>
                <h3>{t('sale_top')}</h3>
                <p className={styles.cardHint}>{t('sale_top_hint')}</p>
                {topTemplates.length === 0 ? (
                    <div className={styles.saleEmptyState}>
                        <LuInfo size={18} />
                        <span>{t('sale_empty')}</span>
                    </div>
                ) : (
                    <div className={styles.saleTable}>
                        {topTemplates.map((item) => (
                            <div key={item._id} className={styles.saleRow}>
                                <div>
                                    <p>{item.title}</p>
                                    <small>
                                        {t('sale_template_meta', { count: formatAppAmount(item.purchaseCount || 0, 'en') })}
                                        {' · '}
                                        {t('sale_template_views', { count: formatAppNumber(item.viewCount || 0, 'en') })}
                                    </small>
                                </div>
                                <span>{formatToman(item.totalRevenue || 0, t('toman'))}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* فروش‌های اخیر */}
            <section className={styles.saleCard}>
                <h3>{t('sale_recent')}</h3>
                <p className={styles.cardHint}>{t('sale_recent_hint')}</p>
                {recentSales.length === 0 ? (
                    <div className={styles.saleEmptyState}>
                        <LuInfo size={18} />
                        <span>{t('sale_recent_empty')}</span>
                    </div>
                ) : (
                    <div className={styles.saleTable}>
                        {recentSales.map((sale) => (
                            <div key={sale._id} className={styles.saleRow}>
                                <div>
                                    <p>{titleById[sale.templateId] || t('sale_order')}</p>
                                    <small>{new Date(sale.createdAt).toLocaleDateString('en')}</small>
                                </div>
                                <span>{formatToman(sale.amount, t('toman'))}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* راهنمای فروش بیشتر */}
            <section className={styles.tipsCard}>
                <div className={styles.tipsHead}>
                    <LuLightbulb size={16} />
                    <span>{t('sale_tips_title')}</span>
                </div>
                <ol className={styles.tipsList}>
                    {tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                    ))}
                </ol>
            </section>
        </div>
    );
}
