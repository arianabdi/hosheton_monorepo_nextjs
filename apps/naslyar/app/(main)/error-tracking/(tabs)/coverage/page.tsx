'use client';

import React, { Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    TbRadar,
    TbHeartbeat,
    TbAppWindow,
    TbFileCode,
    TbServer2,
    TbFlask,
    TbRefresh,
    TbCircleCheck,
    TbCircleX,
    TbActivity,
    TbClockHour4,
    TbListDetails,
    TbFilterOff,
} from 'react-icons/tb';
import { ErrorToaster } from '@my-workspace/utils';
import { Pagination } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import { useRevisionData } from '@/app/hooks/useRevisionData';
import { useUrlTableState, type UrlTableState } from '@/app/hooks/useUrlTableState';
import TabIntro from '../../components/TabIntro';
import { useErrorTracking } from '../../lib/ErrorTrackingProvider';
import { formatCount, fullDate, relativeTime } from '../../lib/format';
import { fetchCoverageSummary, fetchCoverageTable, runSelfTest } from '../../error-tracking-api';
import {
    ETR_LEVEL_LABELS,
    type EtrCoverage,
    type EtrCoverageAppRow,
    type EtrCoverageCulpritRow,
    type EtrCoverageDimension,
    type EtrCoverageEventRow,
    type EtrCoverageSourceRow,
    type EtrLevelType,
    type EtrSelfTest,
    type EtrTablePage,
} from '../../error-tracking.types';
import styles from '../../ErrorTracking.module.scss';

const RANGES = [
    { id: '', label: 'همه زمان‌ها' },
    { id: '24', label: '۲۴ ساعت اخیر' },
    { id: '168', label: '۷ روز اخیر' },
    { id: '720', label: '۳۰ روز اخیر' },
];

const LEVELS: EtrLevelType[] = ['fatal', 'error', 'warning', 'info', 'debug'];

const SOURCE_TABS: { id: Extract<EtrCoverageDimension, 'environments' | 'servers' | 'screens'>; label: string; column: string; hint: string; eventFilter: 'environment' | 'server' | 'screen' }[] = [
    {
        id: 'environments',
        label: 'محیط‌ها',
        column: 'محیط',
        eventFilter: 'environment',
        hint: 'production یعنی کاربران واقعی درگیرند؛ خطایی که فقط در development است هنوز به کاربر نرسیده.',
    },
    {
        id: 'servers',
        label: 'سرورها',
        column: 'سرور',
        eventFilter: 'server',
        hint: 'اگر یک سرور خیلی بیشتر از بقیه خطا دارد، مشکل از همان ماشین است (حافظه، env، نسخهٔ deploy شده).',
    },
    {
        id: 'screens',
        label: 'صفحات کلاینت',
        column: 'صفحه',
        eventFilter: 'screen',
        hint: 'صفحه‌هایی از وب‌اپ که کاربران در آن خطا دیده‌اند — اولویت تست دستی و رفع.',
    },
];

function capitalize(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** فیلترهای مشترک همهٔ جدول‌ها (پروژه و بازهٔ زمانی) — در URL */
function useCoverageScope() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const projectId = params.get('project') || '';
    const range = params.get('range') || '';

    const setScope = useCallback(
        (patch: { project?: string; range?: string }) => {
            const next = new URLSearchParams(params.toString());
            for (const [name, value] of Object.entries(patch)) {
                if (value) next.set(name, value);
                else next.delete(name);
            }
            // دامنه عوض شد → همهٔ جدول‌ها از صفحه ۱
            for (const name of [...next.keys()]) {
                if (name.endsWith('page')) next.delete(name);
            }
            const query = next.toString();
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [params, pathname, router],
    );

    return { projectId, range, setScope };
}

/** ردیف‌های یک جدول با کش ماژول — برگشت به تب/صفحه فوراً دادهٔ قبلی را نشان می‌دهد */
function useCoverageRows<T>(dimension: EtrCoverageDimension, query: Record<string, string | number | undefined>, revision: number) {
    const { baseUrl, token, cache } = useErrorTracking();
    const cacheKey = `coverage:${dimension}:${JSON.stringify(query)}`;
    const fetcher = useMemo(
        () =>
            token
                ? () =>
                      fetchCoverageTable<T>(baseUrl, token, dimension, query).then((page) => {
                          cache.set(cacheKey, page);
                          return page;
                      })
                : null,
        // cacheKey همان query سریال‌شده است
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [baseUrl, token, dimension, cacheKey, cache],
    );
    const { data, loading } = useRevisionData<EtrTablePage<T>>(fetcher, revision, () => (cache.get(cacheKey) as EtrTablePage<T> | undefined) ?? null);
    return { page: data, loading };
}

// ============================================================ اجزای مشترک جدول‌ها

function TablePanel({
    id,
    icon,
    title,
    purpose,
    howTo,
    toolbar,
    children,
}: {
    id?: string;
    icon: ReactNode;
    title: string;
    /** این جدول به چه درد می‌خورد */
    purpose: ReactNode;
    /** چطور کمک می‌کند / قدم بعدی */
    howTo: ReactNode;
    toolbar: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={styles.panel} id={id}>
            <h3 className={styles.panelTitle}>{icon}{title}</h3>
            <div className={styles.panelGuide}>
                <p><strong>به چه درد می‌خورد؟</strong> {purpose}</p>
                <p><strong>چطور استفاده کنم؟</strong> {howTo}</p>
            </div>
            <div className={styles.tableToolbar}>{toolbar}</div>
            {children}
        </section>
    );
}

function TableFooter({ table, total }: { table: UrlTableState; total: number }) {
    if (total <= table.limitOptions[0]) return null;
    return (
        <div className={styles.tablePagination}>
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
    );
}

function TableBody({
    loading,
    empty,
    filtered,
    onReset,
    emptyText,
    children,
}: {
    loading: boolean;
    empty: boolean;
    filtered: boolean;
    onReset: () => void;
    emptyText: string;
    children: ReactNode;
}) {
    if (empty) {
        return (
            <div className={styles.tableEmpty}>
                {loading ? 'در حال بارگذاری…' : filtered ? 'موردی با این جستجو/فیلتر پیدا نشد.' : emptyText}
                {!loading && filtered ? (
                    <button type="button" className={styles.linkBtn} onClick={onReset}>
                        <TbFilterOff size={14} /> حذف فیلترها
                    </button>
                ) : null}
            </div>
        );
    }
    return <div className={`${styles.tableWrap} ${styles.tableWrapFlat} ${loading ? styles.tableLoading : ''}`}>{children}</div>;
}

function TotalLabel({ total, unit }: { total: number; unit: string }) {
    return <span className={styles.toolbarCount}>{formatCount(total)} {unit}</span>;
}

// ============================================================ جدول‌ها

function AppsTable({ scope, revision, onShowEvents }: { scope: Record<string, string>; revision: number; onShowEvents: (app: string) => void }) {
    const table = useUrlTableState('ap_', { sort: 'events', filters: { platform: '' } });
    const { page, loading } = useCoverageRows<EtrCoverageAppRow>('apps', { ...scope, ...table.query }, revision);
    const rows = page?.rows || [];
    const total = page?.totalItems || 0;

    return (
        <TablePanel
            icon={<TbAppWindow size={16} />}
            title="اپ‌هایی که رویداد فرستاده‌اند"
            purpose="فهرست هر اپ/سرویسی که SDK یا ترنسپورت پایش خطا رویش فعال است و تا حالا چیزی فرستاده (نام از ETR_APP_NAME / appName)."
            howTo="اپی که انتظار دارید اینجا نیست = نقطهٔ کور؛ اتصالش را در «اتصال» چک کنید. «آخرین رویداد» خیلی قدیمی یعنی یا اپ سالم است یا ارسالش قطع شده — با «تست سلامت خط لوله» مطمئن شوید. «رویدادها» همان اپ را در جدول پایین فیلتر می‌کند."
            toolbar={(
                <>
                    <TableSearch className={styles.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder="جستجوی نام اپ" dir="ltr" />
                    <select className={styles.filterSelect} value={table.filters.platform} onChange={(e) => table.setFilter('platform', e.target.value)} aria-label="پلتفرم">
                        <option value="">همه پلتفرم‌ها</option>
                        <option value="node">سرور (node)</option>
                        <option value="javascript">مرورگر (javascript)</option>
                    </select>
                    <TotalLabel total={total} unit="اپ" />
                </>
            )}
        >
            <TableBody loading={loading} empty={!rows.length} filtered={table.filtered} onReset={table.reset} emptyText="هنوز هیچ اپی رویداد نفرستاده — پروژه بسازید، کلید را در env اپ بگذارید و تست سلامت بگیرید.">
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <SortHeader label="اپ" field="app" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                            <th>پلتفرم</th>
                            <SortHeader label="۲۴ ساعت" field="events24h" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="رویدادهای ۲۴ ساعت اخیر — عدد بالا یعنی همین الان مشکل دارد" />
                            <SortHeader label="کل رویدادها" field="events" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <SortHeader label="مشکلات" field="issues" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="تعداد خطاهای متمایز (گروه‌بندی‌شده)" />
                            <SortHeader label="آخرین رویداد" field="lastEventAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <th aria-label="اقدام" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={`${row.app}-${row.platform}`}>
                                <td data-label="اپ" dir="ltr" className={styles.issueTitleCell}>{row.app}</td>
                                <td data-label="پلتفرم" className={styles.cellMuted}>{row.platform === 'node' ? 'سرور' : row.platform === 'javascript' ? 'مرورگر' : row.platform}</td>
                                <td data-label="۲۴ ساعت" className={row.events24h ? styles.cellStrong : styles.cellMuted}>{formatCount(row.events24h)}</td>
                                <td data-label="کل رویدادها">{formatCount(row.events)}</td>
                                <td data-label="مشکلات">{formatCount(row.issues)}</td>
                                <td data-label="آخرین رویداد" className={styles.cellMuted} title={fullDate(row.lastEventAt)}>{relativeTime(row.lastEventAt)}</td>
                                <td data-label="اقدام">
                                    <button type="button" className={styles.smallBtn} onClick={() => onShowEvents(row.app)}>
                                        <TbListDetails size={13} /> رویدادها
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableBody>
            <TableFooter table={table} total={total} />
        </TablePanel>
    );
}

function CulpritsTable({ scope, revision }: { scope: Record<string, string>; revision: number }) {
    const table = useUrlTableState('cu_', { sort: 'events', filters: { status: 'open' } });
    const { page, loading } = useCoverageRows<EtrCoverageCulpritRow>('culprits', { ...scope, ...table.query }, revision);
    const rows = page?.rows || [];
    const total = page?.totalItems || 0;
    const issuesHref = (culprit: string) => {
        const params = new URLSearchParams({ q: culprit });
        if (scope.projectId) params.set('projectId', scope.projectId);
        if (table.filters.status === 'open') params.set('status', 'open,regressed');
        return `/error-tracking/issues?${params.toString()}`;
    };

    return (
        <TablePanel
            icon={<TbFileCode size={16} />}
            title="پرتکرارترین نقاط وقوع خطا (کجای کد)"
            purpose="هر ردیف یک فایل/تابع است که خطا از آن پرتاب شده — نقشهٔ «داغ‌ترین» جاهای کد."
            howTo="از بالای فهرست شروع کنید: بیشترین رویداد یعنی بیشترین کاربر درگیر و بیشترین سود از رفع. روی نام فایل بزنید تا مشکلات همان نقطه با Stack Trace باز شود."
            toolbar={(
                <>
                    <TableSearch className={styles.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder="جستجوی فایل یا تابع" dir="ltr" />
                    <select className={styles.filterSelect} value={table.filters.status} onChange={(e) => table.setFilter('status', e.target.value)} aria-label="وضعیت">
                        <option value="open">فقط مشکلات باز</option>
                        <option value="all">همه (با حل‌شده‌ها)</option>
                    </select>
                    <TotalLabel total={total} unit="نقطه" />
                </>
            )}
        >
            <TableBody loading={loading} empty={!rows.length} filtered={table.filtered} onReset={table.reset} emptyText="هنوز مشکلی با محل وقوع (culprit) ثبت نشده است.">
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <SortHeader label="فایل / تابع" field="culprit" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                            <SortHeader label="مشکلات باز" field="openIssues" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <SortHeader label="کل مشکلات" field="issues" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <SortHeader label="رویدادها" field="events" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <SortHeader label="آخرین وقوع" field="lastSeenAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.culprit}>
                                <td data-label="فایل / تابع" dir="ltr" className={styles.culpritCell}>
                                    <Link href={issuesHref(row.culprit)} className={styles.issueLink} title="مشاهده مشکلات این نقطه">
                                        {row.culprit}
                                    </Link>
                                </td>
                                <td data-label="مشکلات باز" className={row.openIssues ? styles.cellStrong : styles.cellMuted}>{formatCount(row.openIssues)}</td>
                                <td data-label="کل مشکلات">{formatCount(row.issues)}</td>
                                <td data-label="رویدادها">{formatCount(row.events)}</td>
                                <td data-label="آخرین وقوع" className={styles.cellMuted} title={fullDate(row.lastSeenAt)}>{relativeTime(row.lastSeenAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableBody>
            <TableFooter table={table} total={total} />
        </TablePanel>
    );
}

function SourcesTable({ scope, revision, onShowEvents }: {
    scope: Record<string, string>;
    revision: number;
    onShowEvents: (filter: 'environment' | 'server' | 'screen', value: string) => void;
}) {
    const table = useUrlTableState('sr_', { sort: 'events', filters: { dim: 'environments' } });
    const source = SOURCE_TABS.find((tab) => tab.id === table.filters.dim) || SOURCE_TABS[0];
    const query = { ...table.query } as Record<string, string | number>;
    delete query.dim;
    const { page, loading } = useCoverageRows<EtrCoverageSourceRow>(source.id, { ...scope, ...query }, revision);
    const rows = page?.rows || [];
    const total = page?.totalItems || 0;

    return (
        <TablePanel
            icon={<TbServer2 size={16} />}
            title="منبع خطاها: محیط، سرور و صفحه"
            purpose="خطاها از کجا می‌آیند — به تفکیک محیط اجرا، سروری که API رویش است و صفحه‌ای از وب‌اپ که کاربر در آن بود."
            howTo={source.hint}
            toolbar={(
                <>
                    <SimpleLineTabs
                        className={styles.inlineTabs}
                        tabs={SOURCE_TABS.map(({ id, label }) => ({ id, label }))}
                        activeTab={source.id}
                        onChange={(id) => table.setFilter('dim', id === 'environments' ? '' : id)}
                    />
                    <TableSearch className={styles.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder={`جستجوی ${source.column}`} dir="ltr" />
                    <TotalLabel total={total} unit={source.column} />
                </>
            )}
        >
            <TableBody loading={loading} empty={!rows.length} filtered={Boolean(table.search)} onReset={() => table.setSearch('')} emptyText="برای این منبع هنوز رویدادی ثبت نشده است.">
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <SortHeader label={source.column} field="value" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                            <SortHeader label="۲۴ ساعت" field="events24h" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <SortHeader label="کل رویدادها" field="events" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <SortHeader label="مشکلات" field="issues" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <SortHeader label="آخرین رویداد" field="lastEventAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <th aria-label="اقدام" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.value}>
                                <td data-label={source.column} dir="ltr" className={styles.issueTitleCell}>{row.value}</td>
                                <td data-label="۲۴ ساعت" className={row.events24h ? styles.cellStrong : styles.cellMuted}>{formatCount(row.events24h)}</td>
                                <td data-label="کل رویدادها">{formatCount(row.events)}</td>
                                <td data-label="مشکلات">{formatCount(row.issues)}</td>
                                <td data-label="آخرین رویداد" className={styles.cellMuted} title={fullDate(row.lastEventAt)}>{relativeTime(row.lastEventAt)}</td>
                                <td data-label="اقدام">
                                    <button type="button" className={styles.smallBtn} onClick={() => onShowEvents(source.eventFilter, row.value)}>
                                        <TbListDetails size={13} /> رویدادها
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableBody>
            <TableFooter table={table} total={total} />
        </TablePanel>
    );
}

function EventsTable({ table, scope, revision }: { table: UrlTableState; scope: Record<string, string>; revision: number }) {
    const { page, loading } = useCoverageRows<EtrCoverageEventRow>('events', { ...scope, ...table.query }, revision);
    const rows = page?.rows || [];
    const total = page?.totalItems || 0;
    const sourceFilter = (['app', 'environment', 'server', 'screen'] as const).find((name) => table.filters[name]);

    return (
        <TablePanel
            id="coverage-events"
            icon={<TbActivity size={16} />}
            title="آخرین رویدادهای دریافتی"
            purpose="جریان خام رویدادها همان‌طور که رسیده‌اند — ببینید همین الان دقیقاً چه چیزی ثبت می‌شود (بعد از deploy، بعد از تست، یا وقتی کاربری خطا گزارش داد)."
            howTo="سطح «خطا» و «بحرانی» را فیلتر کنید تا نویز حذف شود؛ روی پیام بزنید تا مشکل کامل با Stack Trace، کاربر و breadcrumb باز شود."
            toolbar={(
                <>
                    <TableSearch className={styles.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder="جستجو در پیام / نوع خطا" />
                    <select className={styles.filterSelect} value={table.filters.level} onChange={(e) => table.setFilter('level', e.target.value)} aria-label="سطح">
                        <option value="">همه سطوح</option>
                        {LEVELS.map((level) => (
                            <option key={level} value={level}>{ETR_LEVEL_LABELS[level]}</option>
                        ))}
                    </select>
                    {sourceFilter ? (
                        <button type="button" className={styles.filterChip} onClick={() => table.setFilter(sourceFilter, '')} title="حذف این فیلتر">
                            <span dir="ltr">{table.filters[sourceFilter]}</span>
                            <TbCircleX size={14} />
                        </button>
                    ) : null}
                    <TotalLabel total={total} unit="رویداد" />
                </>
            )}
        >
            <TableBody loading={loading} empty={!rows.length} filtered={table.filtered} onReset={table.reset} emptyText="هنوز رویدادی دریافت نشده است.">
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th>پیام</th>
                            <th>سطح</th>
                            <th>اپ</th>
                            <th>صفحه</th>
                            <th>محیط</th>
                            <SortHeader label="زمان" field="timestamp" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((event) => (
                            <tr key={event.eventId}>
                                <td data-label="پیام" dir="ltr" className={styles.eventMessageCell}>
                                    <Link href={`/error-tracking/issues/${event.issueId}`} className={styles.issueLink} title="مشاهده مشکل کامل">
                                        {event.exceptionType ? <span className={styles.eventType}>{event.exceptionType}</span> : null}
                                        {event.message || '—'}
                                    </Link>
                                </td>
                                <td data-label="سطح">
                                    <span className={`${styles.statusBadge} ${styles[`level${capitalize(event.level)}`]}`}>{ETR_LEVEL_LABELS[event.level]}</span>
                                </td>
                                <td data-label="اپ" dir="ltr" className={styles.cellMuted}>{event.app || '—'}</td>
                                <td data-label="صفحه" dir="ltr" className={styles.cellMuted}>{event.screen || '—'}</td>
                                <td data-label="محیط" dir="ltr" className={styles.cellMuted}>{event.environment || '—'}</td>
                                <td data-label="زمان" className={styles.cellMuted} title={fullDate(event.timestamp)}>{relativeTime(event.timestamp)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableBody>
            <TableFooter table={table} total={total} />
        </TablePanel>
    );
}

// ============================================================ صفحه

function KpiStrip({ coverage }: { coverage: Pick<EtrCoverage, 'kpis' | 'localTransport'> | null }) {
    const transport = coverage?.localTransport;
    const lastEventAt = coverage?.kpis?.lastEventAt || null;
    const cells = [
        {
            key: 'transport',
            icon: <TbHeartbeat size={15} />,
            label: 'ترنسپورت سرور',
            value: transport ? (
                <span className={transport.configured ? styles.kpiOk : styles.kpiBad}>
                    {transport.configured ? <TbCircleCheck size={17} /> : <TbCircleX size={17} />}
                    {transport.configured ? 'فعال' : 'غیرفعال'}
                </span>
            ) : '—',
            hint: transport?.configured ? transport.appName : 'ETR_PUBLIC_KEY روی API ست نشده',
        },
        {
            key: 'apps',
            icon: <TbAppWindow size={15} />,
            label: 'اپ تحت رصد',
            value: formatCount(coverage?.kpis?.appsMonitored),
            hint: 'اپ‌هایی که رویداد فرستاده‌اند',
        },
        {
            key: 'events24h',
            icon: <TbActivity size={15} />,
            label: 'رویدادهای ۲۴ ساعت',
            value: formatCount(coverage?.kpis?.events24h),
            hint: 'همهٔ سطوح، همهٔ اپ‌ها',
        },
        {
            key: 'last',
            icon: <TbClockHour4 size={15} />,
            label: 'آخرین رویداد',
            value: relativeTime(lastEventAt),
            hint: lastEventAt ? fullDate(lastEventAt) : 'هنوز رویدادی نرسیده',
        },
    ];

    return (
        <div className={styles.kpiStrip}>
            {cells.map((cell) => (
                <div key={cell.key} className={styles.kpiCell}>
                    <span className={styles.kpiLabel}>{cell.icon}{cell.label}</span>
                    <span className={styles.kpiValue}>{cell.value}</span>
                    <span className={styles.kpiHint} dir="auto">{cell.hint}</span>
                </div>
            ))}
        </div>
    );
}

function CoverageContent() {
    const { baseUrl, token, projects, cache } = useErrorTracking();
    const { projectId, range, setScope } = useCoverageScope();
    const [revision, setRevision] = useState(0);
    const [testing, setTesting] = useState(false);
    const [selfTest, setSelfTest] = useState<EtrSelfTest | null>(null);
    const eventsTable = useUrlTableState('ev_', {
        sort: 'timestamp',
        limit: 25,
        filters: { level: '', app: '', environment: '', server: '', screen: '' },
    }, [25, 50, 100]);

    const scope = useMemo(() => ({ ...(projectId ? { projectId } : {}), ...(range ? { range } : {}) }), [projectId, range]);
    const summaryKey = `coverage:summary:${projectId}`;
    const summaryFetcher = useMemo(
        () =>
            token
                ? () =>
                      fetchCoverageSummary(baseUrl, token, projectId || undefined).then((data) => {
                          cache.set(summaryKey, data);
                          return data;
                      })
                : null,
        [baseUrl, token, projectId, cache, summaryKey],
    );
    const { data: summary, loading: summaryLoading } = useRevisionData(summaryFetcher, revision, () =>
        (cache.get(summaryKey) as Pick<EtrCoverage, 'kpis' | 'localTransport'> | undefined) ?? null,
    );

    const showEvents = useCallback(
        (filter: 'app' | 'environment' | 'server' | 'screen', value: string) => {
            // فقط یک فیلتر منبع در هر زمان
            for (const name of ['app', 'environment', 'server', 'screen'] as const) {
                if (name !== filter && eventsTable.filters[name]) eventsTable.setFilter(name, '');
            }
            eventsTable.setFilter(filter, value);
            document.getElementById('coverage-events')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        [eventsTable],
    );

    const handleSelfTest = async () => {
        const project = projects.find((p) => !projectId || p._id === projectId);
        if (!project) return;
        try {
            setTesting(true);
            setSelfTest(null);
            setSelfTest(await runSelfTest(baseUrl, project.publicKey));
            setRevision((n) => n + 1);
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setTesting(false);
        }
    };

    return (
        <>
            <TabIntro
                actions={(
                    <>
                        <button type="button" className={styles.secondaryBtn} onClick={handleSelfTest} disabled={testing || !projects.length}>
                            <TbFlask size={16} />
                            {testing ? 'در حال تست…' : 'تست سلامت خط لوله'}
                        </button>
                        <button type="button" className={styles.primaryBtn} onClick={() => setRevision((n) => n + 1)} disabled={summaryLoading && !!summary}>
                            <TbRefresh size={16} />
                            به‌روزرسانی
                        </button>
                    </>
                )}
            >
                جواب سه سؤال: <strong>خط لولهٔ ثبت خطا سالم است؟</strong> <strong>کدام اپ‌ها و صفحه‌ها گزارش می‌دهند (و کدام نه)؟</strong>{' '}
                <strong>بیشترین خطا از کجای کد می‌آید؟</strong> — بر پایهٔ رویدادهای واقعی دریافتی.
            </TabIntro>

            <KpiStrip coverage={summary} />

            {selfTest && (
                <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>
                        <TbFlask size={16} />
                        نتیجهٔ تست سلامت{' '}
                        {selfTest.healthy
                            ? <span className={`${styles.statusBadge} ${styles.statusResolved}`}>سالم</span>
                            : <span className={`${styles.statusBadge} ${styles.statusOpen}`}>ناسالم</span>}
                    </h3>
                    <div className={`${styles.tableWrap} ${styles.tableWrapFlat}`}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>مسیر</th>
                                    <th>نتیجه</th>
                                    <th>جزئیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td data-label="مسیر">ingestion مستقیم (store → دیتابیس)</td>
                                    <td data-label="نتیجه">
                                        <span className={`${styles.statusBadge} ${selfTest.directIngest.ok ? styles.statusResolved : styles.statusOpen}`}>
                                            {selfTest.directIngest.ok ? 'موفق' : 'ناموفق'}
                                        </span>
                                    </td>
                                    <td data-label="جزئیات" className={styles.cellMuted} dir="ltr">
                                        {selfTest.directIngest.ok ? `eventId: ${selfTest.directIngest.eventId}` : selfTest.directIngest.error}
                                    </td>
                                </tr>
                                <tr>
                                    <td data-label="مسیر">حلقهٔ ترنسپورت (captureException → HTTP → دیتابیس)</td>
                                    <td data-label="نتیجه">
                                        <span className={`${styles.statusBadge} ${selfTest.transportLoop.ok ? styles.statusResolved : styles.statusOpen}`}>
                                            {selfTest.transportLoop.ok ? 'موفق' : 'ناموفق'}
                                        </span>
                                    </td>
                                    <td data-label="جزئیات" className={styles.cellMuted} dir="ltr">
                                        {selfTest.transportLoop.note || selfTest.transportLoop.error
                                            || `${selfTest.transportLoop.appName} — received: ${selfTest.transportLoop.received}`}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <section className={styles.panel}>
                <h3 className={styles.panelTitle}><TbRadar size={16} />چه چیزهایی خودکار رصد می‌شوند</h3>
                <ul className={styles.autoList}>
                    <li>خطاهای مسیرهای API (همهٔ کنترلرها از طریق <code className={styles.code}>SharedService.errorHelper</code>) و استثناهای مدیریت‌نشدهٔ 5xx</li>
                    <li><code className={styles.code}>unhandledRejection</code> و <code className={styles.code}>uncaughtException</code> فرایند API</li>
                    <li>خطاهای تولید استودیو در worker صف (هر گره ناموفق یک رویداد با ارائه‌دهنده، مدل، HTTP status و بدنهٔ پاسخ — <code className={styles.code}>service: studio-generation</code>)</li>
                    <li>خطاهای مرورگر: <code className={styles.code}>window.onerror</code>، <code className={styles.code}>unhandledrejection</code>، Error Boundary و خطاهای شبکه/کلاینتی که به کاربر نشان داده می‌شوند</li>
                </ul>
            </section>

            <div className={styles.scopeBar}>
                <label className={styles.scopeField}>
                    <span>پروژه</span>
                    <select className={styles.filterSelect} value={projectId} onChange={(e) => setScope({ project: e.target.value })}>
                        <option value="">همه پروژه‌ها</option>
                        {projects.map((project) => (
                            <option key={project._id} value={project._id}>{project.name}</option>
                        ))}
                    </select>
                </label>
                <label className={styles.scopeField}>
                    <span>بازهٔ زمانی جدول‌ها</span>
                    <select className={styles.filterSelect} value={range} onChange={(e) => setScope({ range: e.target.value })}>
                        {RANGES.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                    </select>
                </label>
                <span className={styles.scopeHint}>این دو فیلتر روی همهٔ جدول‌های پایین اعمال می‌شوند؛ هر جدول جستجو، فیلتر و مرتب‌سازی خودش را هم دارد.</span>
            </div>

            <AppsTable scope={scope} revision={revision} onShowEvents={(app) => showEvents('app', app)} />
            <CulpritsTable scope={scope} revision={revision} />
            <SourcesTable scope={scope} revision={revision} onShowEvents={showEvents} />
            <EventsTable table={eventsTable} scope={scope} revision={revision} />
        </>
    );
}

export default function ErrorTrackingCoveragePage() {
    return (
        <Suspense fallback={null}>
            <CoverageContent />
        </Suspense>
    );
}
