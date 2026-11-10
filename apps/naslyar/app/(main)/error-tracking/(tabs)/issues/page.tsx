'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TbBug, TbFilterOff } from 'react-icons/tb';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu, { type HrRowActionMenuItem } from '@/app/(main)/management/hr/components/HrRowActionMenu';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import { useRevisionData } from '@/app/hooks/useRevisionData';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import IssuesGuide from '../../components/IssuesGuide';
import TabIntro from '../../components/TabIntro';
import { useErrorTracking } from '../../lib/ErrorTrackingProvider';
import { formatCount, fullDate, relativeTime } from '../../lib/format';
import { fetchIssues, setIssueStatus } from '../../error-tracking-api';
import {
    EtrIssue,
    EtrLevelType,
    EtrIssueStatusType,
    ETR_LEVEL_LABELS,
    ETR_STATUS_LABELS,
} from '../../error-tracking.types';
import styles from '../../ErrorTracking.module.scss';

const LEVELS: EtrLevelType[] = ['fatal', 'error', 'warning', 'info', 'debug'];
const STATUSES: EtrIssueStatusType[] = ['open', 'resolved', 'ignored', 'regressed'];

type IssuesPage = { issues: EtrIssue[]; totalItems: number; services?: string[] };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function ErrorTrackingIssuesContent() {
    const { baseUrl, token, projects, cache } = useErrorTracking();
    const router = useRouter();
    // لینک‌های پوشش رصد/داشبورد فیلتر را در URL می‌فرستند (?q=…&projectId=…&status=…)
    const table = useUrlTableState('', { sort: 'lastSeenAt', filters: { projectId: '', level: '', status: '', service: '' } });
    const [revision, setRevision] = useState(0);

    const cacheKey = `issues:${JSON.stringify(table.query)}`;
    const fetcher = useMemo(
        () =>
            token
                ? () =>
                      fetchIssues(
                          baseUrl,
                          token,
                          {
                              projectId: table.filters.projectId || undefined,
                              level: table.filters.level || undefined,
                              status: table.filters.status || undefined,
                              service: table.filters.service || undefined,
                              search: table.search || undefined,
                              sort: table.sort,
                              dir: table.dir,
                          },
                          table.page,
                          table.limit,
                      ).then((data) => {
                          cache.set(cacheKey, data);
                          return data;
                      })
                : null,
        // cacheKey همان query سریال‌شده است
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [baseUrl, token, cacheKey, cache],
    );
    const { data, loading } = useRevisionData<IssuesPage>(fetcher, revision, () => (cache.get(cacheKey) as IssuesPage | undefined) ?? null);
    const issues = data?.issues || [];
    const total = data?.totalItems || 0;
    // گزینه‌ها از خود داده؛ سرویس انتخاب‌شده حتی اگر دیگر مسئله‌ای نداشته باشد در فهرست می‌ماند
    const services = Array.from(new Set([...(data?.services || []), ...(table.filters.service ? [table.filters.service] : [])]));

    const changeStatus = async (issue: EtrIssue, status: EtrIssueStatusType) => {
        if (!token) return;
        try {
            await setIssueStatus(baseUrl, token, issue._id, status);
            SuccessToaster({ message: `وضعیت به «${ETR_STATUS_LABELS[status]}» تغییر کرد` });
            setRevision((value) => value + 1);
        } catch (err) {
            ErrorToaster(err);
        }
    };

    const rowActions = (issue: EtrIssue): HrRowActionMenuItem[] => {
        const items: HrRowActionMenuItem[] = [
            { label: 'مشاهده جزئیات', onClick: () => router.push(`/error-tracking/issues/${issue._id}`) },
        ];
        if (issue.status !== 'resolved') items.push({ label: 'علامت‌زدن به‌عنوان حل‌شده', onClick: () => void changeStatus(issue, 'resolved') });
        if (issue.status !== 'ignored') items.push({ label: 'نادیده‌گرفتن', onClick: () => void changeStatus(issue, 'ignored') });
        if (issue.status === 'resolved' || issue.status === 'ignored') items.push({ label: 'بازگشایی', onClick: () => void changeStatus(issue, 'open') });
        return items;
    };

    const sortProps = { sort: table.sort, dir: table.dir, onSort: table.toggleSort };
    const sortAsc = (field: string) => table.toggleSort(field, 'asc');

    return (
        <>
            <TabIntro>خطاهای مشابه در یک ردیف جمع می‌شوند — پیش‌فرض بر اساس آخرین وقوع؛ با کلیک روی هر سرستون مرتب کنید.</TabIntro>

            <IssuesGuide />

            <section className={styles.searchSegment}>
                <TableSearch
                    className={styles.searchSegmentInput}
                    value={table.search}
                    onSearch={table.setSearch}
                    placeholder="جستجو در عنوان، پیام یا محل وقوع — مثلاً TypeError یا payment"
                    dir="rtl"
                />
            </section>

            <div className={styles.issuesFilterBar}>
                <label className={styles.issuesFilter}>
                    <span>پروژه</span>
                    <select className={styles.filterSelect} value={table.filters.projectId} onChange={(e) => table.setFilter('projectId', e.target.value)}>
                        <option value="">همه پروژه‌ها</option>
                        {projects.map((project) => (
                            <option key={project._id} value={project._id}>{project.name}</option>
                        ))}
                    </select>
                </label>
                <label className={styles.issuesFilter}>
                    <span>سطح</span>
                    <select className={styles.filterSelect} value={table.filters.level} onChange={(e) => table.setFilter('level', e.target.value)}>
                        <option value="">همه سطوح</option>
                        {LEVELS.map((level) => (
                            <option key={level} value={level}>{ETR_LEVEL_LABELS[level]}</option>
                        ))}
                    </select>
                </label>
                <label className={styles.issuesFilter}>
                    <span>وضعیت</span>
                    <select className={styles.filterSelect} value={table.filters.status} onChange={(e) => table.setFilter('status', e.target.value)}>
                        <option value="">همه وضعیت‌ها</option>
                        <option value="open,regressed">باز + برگشته (نیازمند رسیدگی)</option>
                        {STATUSES.map((status) => (
                            <option key={status} value={status}>{ETR_STATUS_LABELS[status]}</option>
                        ))}
                    </select>
                </label>
                <label className={styles.issuesFilter} title="مقدار tags.service رویدادها — هر اپ سرویس‌های خودش را می‌فرستد (مثلاً ai-provider، payment-gateway، sms)">
                    <span>سرویس</span>
                    <select className={styles.filterSelect} value={table.filters.service} onChange={(e) => table.setFilter('service', e.target.value)}>
                        <option value="">همه سرویس‌ها</option>
                        {services.map((service) => (
                            <option key={service} value={service}>{service}</option>
                        ))}
                    </select>
                </label>
                <div className={styles.issuesFilterMeta}>
                    {table.filtered ? (
                        <button type="button" className={styles.linkBtn} onClick={table.reset}>
                            <TbFilterOff size={14} /> حذف فیلترها
                        </button>
                    ) : null}
                    <span className={styles.toolbarCount}>{formatCount(total, 'latn')} مشکل</span>
                </div>
            </div>

            {loading && !data ? (
                <LoadingState />
            ) : issues.length === 0 ? (
                <TableEmptyState
                    icon={<TbBug size={32} />}
                    title={table.filtered ? 'موردی با این فیلترها یافت نشد' : 'هنوز مشکلی ثبت نشده'}
                    description={
                        table.filtered
                            ? 'فیلترها را تغییر دهید یا جستجو را پاک کنید.'
                            : 'پس از اتصال اولین اپلیکیشن، خطاها به‌صورت خودکار اینجا گروه‌بندی می‌شوند.'
                    }
                    {...(table.filtered
                        ? { secondaryLabel: 'حذف فیلترها', onSecondaryClick: table.reset }
                        : {
                            primaryLabel: 'راهنمای اتصال',
                            primaryHref: '/error-tracking/integration',
                            secondaryLabel: 'پروژه‌ها',
                            secondaryHref: '/error-tracking/projects',
                        })}
                />
            ) : (
                <div className={`${styles.tableWrap} ${styles.issuesTableWrap} ${loading ? styles.tableLoading : ''}`}>
                    <table className={`${styles.dataTable} ${styles.issuesTable}`}>
                        <colgroup>
                            <col />
                            <col className={styles.colBadge} />
                            <col className={styles.colBadge} />
                            <col className={styles.colNumber} />
                            <col className={styles.colNumber} />
                            <col className={styles.colDate} />
                            <col className={styles.colDate} />
                            <col className={styles.colActions} />
                        </colgroup>
                        <thead>
                            <tr>
                                <SortHeader label="عنوان" field="title" sort={table.sort} dir={table.dir} onSort={sortAsc} />
                                <SortHeader label="سطح" field="level" {...sortProps} hint="ترتیب اهمیت: بحرانی ← خطا ← هشدار ← اطلاعات ← دیباگ" />
                                <SortHeader label="وضعیت" field="status" {...sortProps} hint="ترتیب: برگشته ← باز ← نادیده ← حل‌شده" />
                                <SortHeader label="رویدادها" field="events" {...sortProps} hint="چند بار این خطا رخ داده" />
                                <SortHeader label="کاربران" field="users" {...sortProps} hint="چند کاربر متمایز درگیر شده‌اند" />
                                <SortHeader label="اولین مشاهده" field="firstSeenAt" {...sortProps} />
                                <SortHeader label="آخرین مشاهده" field="lastSeenAt" {...sortProps} />
                                <th className={styles.actionsHead}>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {issues.map((issue) => (
                                <tr key={issue._id}>
                                    <td data-label="عنوان" className={styles.issueTitleCell}>
                                        <Link href={`/error-tracking/issues/${issue._id}`} className={styles.issueLink}>
                                            {issue.title}
                                        </Link>
                                        {issue.culprit && <div className={styles.issueCulprit} title={issue.culprit}>{issue.culprit}</div>}
                                        {issue.release && (
                                            <span className={styles.cellMuted}>نسخه: <span dir="ltr">{issue.release}</span></span>
                                        )}
                                    </td>
                                    <td data-label="سطح">
                                        <span className={`${styles.statusBadge} ${styles[`level${capitalize(issue.level)}`]}`}>
                                            {ETR_LEVEL_LABELS[issue.level]}
                                        </span>
                                    </td>
                                    <td data-label="وضعیت">
                                        <span className={`${styles.statusBadge} ${styles[`status${capitalize(issue.status)}`]}`}>
                                            {ETR_STATUS_LABELS[issue.status]}
                                        </span>
                                    </td>
                                    <td data-label="رویدادها" className={styles.cellNumber}>{formatCount(issue.eventCount, 'latn')}</td>
                                    <td data-label="کاربران" className={styles.cellNumber}>{formatCount(issue.userCount, 'latn')}</td>
                                    <td data-label="اولین مشاهده" className={styles.cellMuted} title={fullDate(issue.firstSeenAt, 'latn')}>{relativeTime(issue.firstSeenAt, 'latn')}</td>
                                    <td data-label="آخرین مشاهده" className={styles.cellMuted} title={fullDate(issue.lastSeenAt, 'latn')}>{relativeTime(issue.lastSeenAt, 'latn')}</td>
                                    <td data-label="عملیات" className={styles.actionsCell}>
                                        <HrRowActionMenu rowId={issue._id} items={rowActions(issue)} ariaLabel={`عملیات ${issue.title}`} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {issues.length > 0 && (
                <div className={styles.paginationSpace}>
                    <Pagination
                        rtl
                        itemPerPage={table.limit}
                        currentPage={table.page}
                        totalItems={total}
                        setRowsPerPage={table.setLimit}
                        paginate={table.setPage}
                        rowsPerPageOptions={table.limitOptions}
                    />
                </div>
            )}
        </>
    );
}

export default function ErrorTrackingIssuesPage() {
    return (
        <Suspense fallback={null}>
            <ErrorTrackingIssuesContent />
        </Suspense>
    );
}
