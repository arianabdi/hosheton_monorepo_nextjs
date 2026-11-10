'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import styles from '../../home/home.module.scss';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    CartesianGrid,
    Rectangle,
} from 'recharts';

export default function HomeStatsPanel({ embedded = false }: { embedded?: boolean }) {
    const { t, i18n } = useTranslation('usage');
    const dateLocale = i18n.language === 'ar' ? 'ar' : isRtlLanguage(i18n.language) ? 'fa-IR' : i18n.language;
    const formatChartDay = (date: Date) =>
        date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
    const lineData = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        requests: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0][i],
        tokens: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0][i],
    }));

    const mostUsedDaysByType = [
        {
            name: formatChartDay(new Date(2025, 10, 2)),
            uv: 0,
            pv: 0,
            sv: 0,
            cv: 0,
            amt: 0,
        },
        {
            name: formatChartDay(new Date(2025, 10, 3)),
            uv: 0,
            pv: 0,
            sv: 0,
            cv: 0,
            amt: 0,
        },
    ];

    const tokenUsage = [
        { name: 'Page A', uv: 0, pv: 0, amt: 0 },
        { name: 'Page B', uv: 0, pv: 0, amt: 0 },
        { name: 'Page C', uv: 0, pv: 0, amt: 0 },
        { name: 'Page D', uv: 0, pv: 0, amt: 0 },
        { name: 'Page E', uv: 0, pv: 0, amt: 0 },
        { name: 'Page F', uv: 0, pv: 0, amt: 0 },
        { name: 'Page G', uv: 0, pv: 0, amt: 0 },
    ];

    const statistics = {
        image: 0.0,
        text: 0.0,
        video: 0.0,
        sound: 0.0,

        agent: 0.0,
        portal: 0.0,
        workflow: 0.0,
        test: 0.0,

        numOfAgens: 0,
        numOfDatasets: 0,
        numOfApiTokens: 0,
        numOfWorkflows: 0,

        chunks: 0.0,
        retrieval: 0.0,
        embedding: 0.0,
        reRanking: 0.0,
    };

    function StatisticsRenderer({ statis, start, end }: { statis: typeof statistics; start: number; end: number }) {
        return (
            <>
                {Object.entries(statis)
                    .slice(start, end)
                    .map(([key, value]) => (
                        <div className={styles.cardRow} key={key}>
                            <div className={styles.key}>{key}</div>
                            <div className={styles.value}>{formatAppNumber(value, i18n.language)}</div>
                        </div>
                    ))}
            </>
        );
    }

    const data = {
        totalUsedToken: 0,
        costOfUsedToken: 0,
    };

    return (
        <div className={`${styles.homeWrapper} ${embedded ? styles.embedded : ''}`}>
            <div className={styles.home}>
                <header className={styles.header}>
                    <h4>{t('home')}</h4>
                    <div className={styles.statsTop}>
                        <div>
                            <span>{t('total_tokens')}</span>
                            <h2>{formatAppNumber(data.totalUsedToken, i18n.language)}</h2>
                        </div>
                        <div>
                            <span>{t('total_cost')}</span>
                            <h2>${formatAppNumber(data.costOfUsedToken, i18n.language)}</h2>
                        </div>
                    </div>
                </header>

                <section className={styles.chartSection}>
                    <h5>{t('cost_chart')}</h5>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={lineData}>
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="tokens" stroke="#ec4899" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </section>

                <section className={styles.cardsGrid}>
                    <div className={styles.card}>
                        <StatisticsRenderer statis={statistics} start={0} end={4} />
                    </div>
                    <div className={styles.card}>
                        <StatisticsRenderer statis={statistics} start={4} end={8} />
                    </div>
                    <div className={styles.card}>
                        <StatisticsRenderer statis={statistics} start={8} end={12} />
                    </div>
                    <div className={styles.card}>
                        <StatisticsRenderer statis={statistics} start={12} end={16} />
                    </div>
                </section>

                <section className={styles.bottomCharts}>
                    <div className={styles.chartBox}>
                        <h5>{t('busiest_days')}</h5>
                        <div className={styles.cardRow}>
                            <div className={styles.card} style={{ width: '50%' }}>
                                <StatisticsRenderer statis={statistics} start={12} end={16} />
                            </div>
                            <BarChart
                                height={200}
                                style={{ width: '50%', maxWidth: '700px', aspectRatio: 1.618 }}
                                responsive
                                data={mostUsedDaysByType}
                                margin={{
                                    top: 20,
                                    right: 0,
                                    left: 0,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="4 4" />
                                <XAxis dataKey="name" />
                                <YAxis width="auto" />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="pv" stackId="a" fill="#B76964" background />
                                <Bar dataKey="uv" stackId="a" fill="#62B3B5" background />
                                <Bar dataKey="sv" stackId="a" fill="#6266B5" background />
                                <Bar dataKey="cv" stackId="a" fill="#B59B62" background />
                            </BarChart>
                        </div>
                    </div>

                    <div className={styles.chartBox}>
                        <h5>{t('token_usage')}</h5>
                        <BarChart
                            height={200}
                            style={{ width: '100%', maxWidth: '700px', aspectRatio: 1.618 }}
                            responsive
                            data={tokenUsage}
                            margin={{
                                top: 5,
                                right: 0,
                                left: 0,
                                bottom: 5,
                            }}
                        >
                            <defs>
                                <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#a78bfa" />
                                    <stop offset="100%" stopColor="#7c3aed" />
                                </linearGradient>

                                <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6ee7b7" />
                                    <stop offset="100%" stopColor="#34d399" />
                                </linearGradient>

                                <linearGradient id="activePv" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#f472b6" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>

                                <linearGradient id="activeUv" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#facc15" />
                                    <stop offset="100%" stopColor="#eab308" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis width="auto" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="pv" fill="url(#pvGradient)" activeBar={<Rectangle fill="url(#activePv)" />} />
                            <Bar dataKey="uv" fill="url(#uvGradient)" activeBar={<Rectangle fill="url(#activeUv)" />} />
                        </BarChart>
                    </div>
                </section>
            </div>
        </div>
    );
}
