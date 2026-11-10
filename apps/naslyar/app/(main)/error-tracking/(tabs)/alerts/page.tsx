'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TbBellRinging, TbPlus, TbTrash, TbPencil } from 'react-icons/tb';
import { ErrorToaster, SuccessToaster, toFarsiNumber, ConvertDateToCalendarString } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import AlertsGuide from '../../components/AlertsGuide';
import TabIntro from '../../components/TabIntro';
import { useCachedState, useErrorTracking } from '../../lib/ErrorTrackingProvider';
import { deleteAlertRule, fetchAlertRules, fetchAlerts } from '../../error-tracking-api';
import {
    EtrAlert,
    EtrAlertRule,
    ETR_RULE_TYPE_LABELS,
} from '../../error-tracking.types';
import styles from '../../ErrorTracking.module.scss';

export default function ErrorTrackingAlertsPage() {
    const { baseUrl, token, projects } = useErrorTracking();

    const [rules, setRules, cached] = useCachedState<EtrAlertRule[]>('alerts:rules', []);
    const [alerts, setAlerts] = useCachedState<EtrAlert[]>('alerts:history', []);
    const [loading, setLoading] = useState(!cached);
    const [pagination, setPagination] = useState({ itemPerPage: 10, currentPage: 1, totalItems: 0 });

    const loadData = useCallback(async (page: number, limit: number) => {
        if (!token) return;
        try {
            setLoading(true);
            const [rulesData, alertsData] = await Promise.all([
                fetchAlertRules(baseUrl, token),
                fetchAlerts(baseUrl, token, undefined, page, limit),
            ]);
            setRules(rulesData.rules || []);
            setAlerts(alertsData.alerts || []);
            setPagination((prev) => ({ ...prev, totalItems: alertsData.totalItems || 0, currentPage: page }));
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, setRules, setAlerts]);

    useEffect(() => {
        void loadData(pagination.currentPage, pagination.itemPerPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.currentPage, pagination.itemPerPage, loadData]);

    const handleDelete = async (rule: EtrAlertRule) => {
        if (!token) return;
        if (!confirm(`قانون «${rule.name}» حذف شود؟`)) return;
        try {
            await deleteAlertRule(baseUrl, token, rule._id);
            SuccessToaster({ message: 'قانون حذف شد' });
            await loadData(pagination.currentPage, pagination.itemPerPage);
        } catch (err) {
            ErrorToaster(err);
        }
    };

    return (
        <>
            <TabIntro
                actions={(
                    <Link href="/error-tracking/alerts/new" className={styles.primaryBtn}>
                        <TbPlus size={16} />قانون جدید
                    </Link>
                )}
            >
                قوانین اطلاع‌رسانی مشکل جدید، بازگشت خطا یا جهش ناگهانی — تا قبل از کاربر خبردار شوید.
            </TabIntro>
            <AlertsGuide />

            {loading && !rules.length && !alerts.length ? (
                <LoadingState />
            ) : (
                <>
                    <div className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.panelTitle}><TbBellRinging size={16} />قوانین هشدار</h3>
                        </div>
                        {rules.length === 0 ? (
                            <TableEmptyState
                                icon={<TbBellRinging size={32} />}
                                title="هنوز قانونی تعریف نشده"
                                description="مثلاً قانون «مشکل جدید» بسازید تا اولین وقوع هر خطا در تلگرام بیاید."
                                primaryHref="/error-tracking/alerts/new"
                                primaryLabel="ساخت اولین قانون"
                            />
                        ) : (
                            <div className={styles.tableWrap}>
                                <table className={styles.dataTable}>
                                    <thead>
                                        <tr>
                                            <th>نام</th>
                                            <th>نوع</th>
                                            <th>پروژه</th>
                                            <th>مقصد</th>
                                            <th>Cooldown</th>
                                            <th>وضعیت</th>
                                            <th>اقدامات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rules.map((rule) => {
                                            const project = projects.find((p) => p._id === rule.projectId);
                                            return (
                                                <tr key={rule._id}>
                                                    <td data-label="نام" className={styles.issueTitleCell}>{rule.name}</td>
                                                    <td data-label="نوع" className={styles.cellMuted}>{ETR_RULE_TYPE_LABELS[rule.type]}</td>
                                                    <td data-label="پروژه" className={styles.cellMuted}>{project?.name || '—'}</td>
                                                    <td data-label="مقصد">
                                                        <span className={`${styles.statusBadge} ${styles.statusIgnored}`} dir="ltr">
                                                            {rule.destination?.type === 'telegram' ? 'Telegram' : 'Webhook'}
                                                        </span>
                                                    </td>
                                                    <td data-label="Cooldown">{toFarsiNumber(rule.cooldownMinutes)} دقیقه</td>
                                                    <td data-label="وضعیت">
                                                        <span className={`${styles.statusBadge} ${rule.isEnabled ? styles.statusResolved : styles.statusIgnored}`}>
                                                            {rule.isEnabled ? 'فعال' : 'غیرفعال'}
                                                        </span>
                                                    </td>
                                                    <td data-label="اقدامات">
                                                        <div className={styles.inlineActions}>
                                                            <Link href={`/error-tracking/alerts/${rule._id}/edit`} className={styles.smallBtn}>
                                                                <TbPencil size={13} />ویرایش
                                                            </Link>
                                                            <button type="button" className={styles.dangerBtn} onClick={() => handleDelete(rule)}>
                                                                <TbTrash size={13} />حذف
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

                    <div className={styles.panel}>
                        <div className={styles.sectionHead}>
                            <h3 className={styles.panelTitle}>تاریخچه ارسال هشدارها</h3>
                        </div>
                        {alerts.length === 0 ? (
                            <TableEmptyState
                                icon={<TbBellRinging size={32} />}
                                title="هنوز هشداری ارسال نشده"
                                description="بعد از ساخت قانون، اولین ارسال اینجا دیده می‌شود. اگر ناموفق بود ستون خطا را چک کنید."
                                primaryHref="/error-tracking/alerts/new"
                                primaryLabel="ساخت قانون"
                            />
                        ) : (
                            <>
                                <div className={styles.tableWrap}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>هشدار</th>
                                                <th>نوع قانون</th>
                                                <th>وضعیت</th>
                                                <th>خطا</th>
                                                <th>زمان ارسال</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {alerts.map((alert) => (
                                                <tr key={alert._id}>
                                                    <td data-label="هشدار" className={styles.issueTitleCell}>{alert.title}</td>
                                                    <td data-label="نوع قانون" className={styles.cellMuted}>{ETR_RULE_TYPE_LABELS[alert.ruleType]}</td>
                                                    <td data-label="وضعیت">
                                                        <span className={`${styles.statusBadge} ${alert.status === 'sent' ? styles.statusResolved : styles.statusOpen}`}>
                                                            {alert.status === 'sent' ? 'موفق' : 'ناموفق'}
                                                        </span>
                                                    </td>
                                                    <td data-label="خطا" className={styles.cellMuted} dir="ltr">{alert.error || '—'}</td>
                                                    <td data-label="زمان ارسال" className={styles.cellMuted}>
                                                        {toFarsiNumber(ConvertDateToCalendarString(alert.sentAt))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className={styles.paginationSpace}>
                                    <Pagination
                                        itemPerPage={pagination.itemPerPage}
                                        currentPage={pagination.currentPage}
                                        totalItems={pagination.totalItems}
                                        setRowsPerPage={(num) => setPagination((prev) => ({ ...prev, itemPerPage: num, currentPage: 1 }))}
                                        paginate={(page) => setPagination((prev) => ({ ...prev, currentPage: page }))}
                                        rtl
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
