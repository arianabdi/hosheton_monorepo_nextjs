'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TbActivity, TbBug, TbCheckupList, TbFlare, TbUserExclamation, TbBellRinging, TbListNumbers } from 'react-icons/tb';
import { ErrorToaster, toFarsiNumber, ConvertDateToCalendarString } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import DashboardGuide from '../components/DashboardGuide';
import TabIntro from '../components/TabIntro';
import { useCachedState, useErrorTracking } from '../lib/ErrorTrackingProvider';
import { fetchDashboard } from '../error-tracking-api';
import { EtrDashboard, EtrLevelType, ETR_LEVEL_LABELS, ETR_RULE_TYPE_LABELS } from '../error-tracking.types';
import styles from '../ErrorTracking.module.scss';

const LEVEL_COLORS: Record<string, string> = {
    fatal: '#7f1d1d',
    error: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
    debug: '#6b7280',
};

export default function ErrorTrackingDashboardPage() {
    const { baseUrl, token, projects } = useErrorTracking();

    // دادهٔ قبلی تب از کش ماژول — برگشت به تب بدون اسپینر
    const [dashboard, setDashboard, cached] = useCachedState<EtrDashboard | null>('dashboard:data', null);
    const [projectFilter, setProjectFilter] = useCachedState('dashboard:project', '');
    const [loading, setLoading] = useState(!cached);

    const loadData = useCallback(async (projectId: string) => {
        if (!token) return;
        try {
            setLoading(true);
            setDashboard(await fetchDashboard(baseUrl, token, projectId || undefined));
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, setDashboard]);

    useEffect(() => {
        loadData(projectFilter);
    }, [projectFilter, loadData]);

    const maxTotal = Math.max(1, ...(dashboard?.series?.map((point) => point.total) || []));
    const kpis = dashboard?.kpis;

    const statCards = kpis
        ? [
            { icon: <TbFlare size={15} />, label: 'رویدادهای امروز', value: kpis.eventsToday },
            { icon: <TbActivity size={15} />, label: 'رویدادهای ۲۴ ساعت', value: kpis.events24h },
            { icon: <TbBug size={15} />, label: 'مشکلات جدید امروز', value: kpis.newIssuesToday },
            { icon: <TbListNumbers size={15} />, label: 'مشکلات باز', value: kpis.openIssues },
            { icon: <TbCheckupList size={15} />, label: 'حل‌شده‌ها', value: kpis.resolvedIssues },
            { icon: <TbUserExclamation size={15} />, label: 'کاربران متأثر', value: kpis.affectedUsers },
        ]
        : [];

    return (
        <>
            <TabIntro
                actions={(
                    <>
                        <Link href="/error-tracking/projects/new" className={styles.secondaryBtn}>پروژه جدید</Link>
                        <Link href="/error-tracking/issues" className={styles.primaryBtn}>مشکلات</Link>
                    </>
                )}
            >
                خلاصهٔ خطاهای همهٔ اپ‌ها: روند، مشکلات پرتکرار و هشدارهای اخیر.
            </TabIntro>

            <DashboardGuide />

            <div className={styles.filterContainer}>
                <div className={styles.filterGrid}>
                    <div className={styles.filterItem}>
                        <label>پروژه:</label>
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="">همه پروژه‌ها</option>
                            {projects.map((project) => (
                                <option key={project._id} value={project._id}>{project.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading && !dashboard ? (
                <LoadingState />
            ) : (
                <>
                    <div className={styles.kpiStrip}>
                        {statCards.map((card) => (
                            <div key={card.label} className={styles.kpiCell}>
                                <span className={styles.kpiLabel}>{card.icon}{card.label}</span>
                                <strong className={styles.kpiValue}>{toFarsiNumber(card.value)}</strong>
                            </div>
                        ))}
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.panelTitle}>روند رویدادها (۱۴ روز اخیر)</h3>
                        </div>
                        {dashboard?.series?.length ? (
                            <div className={styles.chartRow} dir="rtl">
                                {dashboard.series.map((point) => (
                                    <div key={point.day} className={styles.chartCol} title={`${point.day}: ${point.total} رویداد`}>
                                        <div className={styles.chartBars}>
                                            {(Object.entries(point.levels) as [EtrLevelType, number][])
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([level, count]) => (
                                                    <div
                                                        key={level}
                                                        className={styles.chartBar}
                                                        style={{
                                                            height: `${Math.max(4, (count / maxTotal) * 110)}px`,
                                                            background: LEVEL_COLORS[level] || '#6b7280',
                                                        }}
                                                        title={`${ETR_LEVEL_LABELS[level]}: ${count}`}
                                                    />
                                                ))}
                                            {point.total === 0 && <div className={styles.chartEmptyBar} />}
                                        </div>
                                        <div className={styles.chartDay}>{point.day.slice(5)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.hint}>هنوز رویدادی ثبت نشده است.</p>
                        )}
                    </div>

                    {/* هشدارهای اخیر زیر مشکلات پرتکرار — هر دو تمام‌عرض */}
                    <div className={styles.stackedPanels}>
                        <div className={styles.panel}>
                            <div className={styles.sectionHead}>
                                <h3 className={styles.panelTitle}><TbListNumbers size={16} />مشکلات پرتکرار</h3>
                            </div>
                            {dashboard?.topIssues?.length ? (
                                <div className={styles.tableWrap}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>عنوان</th>
                                                <th>سطح</th>
                                                <th>رویدادها</th>
                                                <th>کاربران</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboard.topIssues.map((issue) => (
                                                <tr key={issue._id}>
                                                    <td data-label="عنوان" className={styles.issueTitleCell}>
                                                        <Link href={`/error-tracking/issues/${issue._id}`} className={styles.issueLink}>
                                                            {issue.title}
                                                        </Link>
                                                        {issue.culprit && <div className={styles.issueCulprit}>{issue.culprit}</div>}
                                                    </td>
                                                    <td data-label="سطح">
                                                        <span className={`${styles.statusBadge} ${styles[`level${capitalize(issue.level)}`]}`}>
                                                            {ETR_LEVEL_LABELS[issue.level]}
                                                        </span>
                                                    </td>
                                                    <td data-label="رویدادها">{toFarsiNumber(issue.eventCount)}</td>
                                                    <td data-label="کاربران">{toFarsiNumber(issue.userCount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <TableEmptyState
                                    icon={<TbBug size={32} />}
                                    title="مشکل بازی وجود ندارد"
                                    description="همه خطاها حل شده‌اند یا هنوز رویدادی دریافت نشده است."
                                    primaryHref="/error-tracking/issues"
                                    primaryLabel="فهرست مشکلات"
                                    secondaryHref="/error-tracking/integration"
                                    secondaryLabel="راهنمای اتصال"
                                />
                            )}
                        </div>

                        <div className={styles.panel}>
                            <div className={styles.sectionHead}>
                                <h3 className={styles.panelTitle}><TbBellRinging size={16} />هشدارهای اخیر</h3>
                            </div>
                            {dashboard?.recentAlerts?.length ? (
                                <div className={styles.tableWrap}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>هشدار</th>
                                                <th>نوع</th>
                                                <th>وضعیت</th>
                                                <th>زمان</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboard.recentAlerts.map((alert) => (
                                                <tr key={alert._id}>
                                                    <td data-label="هشدار" className={styles.issueTitleCell}>{alert.title}</td>
                                                    <td data-label="نوع" className={styles.cellMuted}>{ETR_RULE_TYPE_LABELS[alert.ruleType]}</td>
                                                    <td data-label="وضعیت">
                                                        <span className={`${styles.statusBadge} ${alert.status === 'sent' ? styles.statusResolved : styles.statusOpen}`}>
                                                            {alert.status === 'sent' ? 'ارسال شد' : 'ناموفق'}
                                                        </span>
                                                    </td>
                                                    <td data-label="زمان" className={styles.cellMuted} dir="ltr">
                                                        {toFarsiNumber(ConvertDateToCalendarString(alert.sentAt))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <TableEmptyState
                                    icon={<TbBellRinging size={32} />}
                                    title="هنوز هشداری ارسال نشده"
                                    description="قانون بسازید تا مشکل جدید، بازگشت خطا یا جهش ناگهانی به تلگرام یا Webhook برود."
                                    primaryHref="/error-tracking/alerts/new"
                                    primaryLabel="ساخت قانون هشدار"
                                />
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

function capitalize(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
