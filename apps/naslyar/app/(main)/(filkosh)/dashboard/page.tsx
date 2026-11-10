'use client';

import React, {useCallback, useState} from 'react';
import Link from 'next/link';
import {
    LuActivity,
    LuChevronLeft,
    LuCreditCard,
    LuPlus,
    LuRefreshCw,
    LuServer,
    LuShield,
    LuUsers,
} from 'react-icons/lu';
import styles from '../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import {filkoshApi, FilkoshOverview} from '../lib/filkosh-api';
import {formatBytes, PROVISION_ACTION_LABEL, RUN_STATUS_LABEL} from '../lib/labels';
import ModuleGuide from '../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../components/guides';
import {useLoadOnMount} from '../components/useLoadOnMount';

function runTone(status: string) {
    if (status === 'success') return styles.badgeSuccess;
    if (status === 'failed') return styles.badgeDanger;
    return styles.badgeWarning;
}

export default function FilkoshDashboardPage() {
    const [overview, setOverview] = useState<FilkoshOverview | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setOverview(await filkoshApi.overview());
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const cards = [
        {
            label: 'سرورهای آنلاین',
            value: overview ? `${toFarsiNumber(overview.onlineServers)} / ${toFarsiNumber(overview.totalServers)}` : '—',
            hint: 'آنلاین / کل ناوگان',
            href: '/servers',
            icon: <LuServer size={18} />,
            accent: styles.accentBrand,
        },
        {
            label: 'کاربران آنلاین',
            value: overview ? toFarsiNumber(overview.onlineUsers) : '—',
            hint: '۵ دقیقه اخیر',
            href: '/servers',
            icon: <LuUsers size={18} />,
            accent: styles.accentInfo,
        },
        {
            label: 'اشتراک فعال',
            value: overview ? toFarsiNumber(overview.activeSubscriptions) : '—',
            hint: `از ${toFarsiNumber(overview?.totalUsers || 0)} کاربر`,
            href: '/subscriptions',
            icon: <LuCreditCard size={18} />,
            accent: styles.accentSuccess,
        },
        {
            label: 'پروتکل‌های فعال',
            value: overview ? toFarsiNumber(overview.totalInbounds) : '—',
            hint: 'روی همه سرورها',
            href: '/servers',
            icon: <LuShield size={18} />,
            accent: styles.accentWarning,
        },
        {
            label: 'ترافیک امروز',
            value: overview ? formatBytes((overview.trafficToday?.download || 0) + (overview.trafficToday?.upload || 0)) : '—',
            hint: `${toFarsiNumber(overview?.trafficToday?.sessions || 0)} سشن`,
            href: '/logs',
            icon: <LuActivity size={18} />,
            accent: styles.accentDanger,
        },
    ];

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>فیلکوش — VPN و DNS</h1>
                            <p className={styles.subtitle}>
                                مدیریت ناوگان سرورها، پروتکل‌ها، اشتراک‌ها و DNS از یک جا.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => load()} disabled={loading}>
                                <LuRefreshCw size={14} />
                                بروزرسانی
                            </button>
                            <Link href="/servers/add" className={styles.primaryBtn}>
                                <LuPlus size={16} />
                                افزودن سرور
                            </Link>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.dashboard} />

                    {loading ? (
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    ) : (
                        <>
                            <div className={styles.kpiGrid}>
                                {cards.map((c) => (
                                    <Link key={c.label} href={c.href} className={styles.kpiCard}>
                                        <div className={styles.kpiTop}>
                                            <span className={`${styles.kpiIcon} ${c.accent}`}>{c.icon}</span>
                                            <LuChevronLeft size={14} style={{opacity: 0.4}} />
                                        </div>
                                        <div className={styles.kpiValue}>{c.value}</div>
                                        <div className={styles.kpiLabel}>
                                            {c.label}
                                            <div className={styles.cellMuted}>{c.hint}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <div className={styles.panel}>
                                <h2 className={styles.panelTitle}>ترافیک هفتگی</h2>
                                {overview?.trafficWeek?.length ? (
                                    <div className={styles.chart}>
                                        {overview.trafficWeek.map((d) => {
                                            const total = (d.download || 0) + (d.upload || 0);
                                            const max = Math.max(
                                                ...overview.trafficWeek.map((x) => (x.download || 0) + (x.upload || 0)),
                                                1,
                                            );
                                            return (
                                                <div key={d._id} className={styles.chartCol} title={`${d._id}: ${formatBytes(total)}`}>
                                                    <div
                                                        className={styles.chartBar}
                                                        style={{height: `${Math.max(6, (total / max) * 120)}px`}}
                                                    />
                                                    <span className={styles.chartLabel}>{d._id.slice(5)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className={styles.emptyHint}>هنوز ترافیکی ثبت نشده است.</p>
                                )}
                            </div>

                            <div className={styles.dashGrid}>
                                <section className={styles.dashCard}>
                                    <h2>سرورهای پرمصرف</h2>
                                    {overview?.topServers?.length ? (
                                        <TableTheme>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>سرور</th>
                                                        <th>سشن</th>
                                                        <th>ترافیک</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {overview.topServers.map((s) => (
                                                        <tr key={s._id || 'نامشخص'}>
                                                            <td data-label="سرور" className={styles.cellPrimary}>
                                                                {s._id || 'نامشخص'}
                                                            </td>
                                                            <td data-label="سشن">{toFarsiNumber(s.sessions)}</td>
                                                            <td data-label="ترافیک">{formatBytes(s.traffic)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </TableTheme>
                                    ) : (
                                        <p className={styles.emptyHint}>داده‌ای نیست.</p>
                                    )}
                                </section>

                                <section className={styles.dashCard}>
                                    <h2>آخرین عملیات سرورها</h2>
                                    {overview?.recentRuns?.length ? (
                                        <TableTheme>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>وضعیت</th>
                                                        <th>عملیات</th>
                                                        <th>زمان</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {overview.recentRuns.slice(0, 8).map((r) => {
                                                        const serverName = typeof r.serverId === 'object' ? r.serverId?.name : '';
                                                        return (
                                                            <tr key={r._id}>
                                                                <td data-label="وضعیت">
                                                                    <span className={`${styles.badge} ${runTone(r.status)}`}>
                                                                        {RUN_STATUS_LABEL[r.status] || r.status}
                                                                    </span>
                                                                </td>
                                                                <td data-label="عملیات" className={styles.cellPrimary}>
                                                                    {PROVISION_ACTION_LABEL[r.action] || r.action}
                                                                    {serverName ? (
                                                                        <div className={styles.cellMuted}>{serverName}</div>
                                                                    ) : null}
                                                                </td>
                                                                <td data-label="زمان">{new Date(r.createdAt).toLocaleString('fa-IR')}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </TableTheme>
                                    ) : (
                                        <p className={styles.emptyHint}>عملیاتی ثبت نشده است.</p>
                                    )}
                                    <div className={styles.formActions}>
                                        <Link href="/logs" className={styles.backLink}>
                                            همه لاگ‌ها
                                        </Link>
                                    </div>
                                </section>
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
