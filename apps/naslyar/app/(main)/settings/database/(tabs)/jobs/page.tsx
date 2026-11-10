'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { LuChevronLeft, LuCopy, LuRefreshCw } from 'react-icons/lu';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import HrRowActionMenu, { type HrRowActionMenuItem } from '@/app/(main)/management/hr/components/HrRowActionMenu';
import { useCachedState, useDatabase } from '../../lib/DatabaseProvider';
import { fetchBackup, fetchJobs, type BackupRow, type JobLogRow, type RestoreMode } from '../../lib/database-api';
import { explainFailure, formatCount, formatDateShort, formatDuration, formatLogTime, formatSize, fullDate } from '../../lib/format';
import BackupDetailsDialog from '../../components/BackupDetailsDialog';
import SectionIntro from '../../components/SectionIntro';
import styles from '../../Database.module.scss';

/** filters combine (AND) and are applied by the API */
const FILTERS: Array<{ key: 'status' | 'op' | 'run'; label: string; options: Array<[string, string]> }> = [
    { key: 'status', label: 'وضعیت', options: [['', 'همهٔ وضعیت‌ها'], ['failed', 'خطا'], ['completed', 'موفق'], ['active', 'در حال اجرا یا در صف']] },
    { key: 'op', label: 'کار', options: [['', 'بک‌آپ‌گیری و بازگردانی'], ['dump', 'فقط بک‌آپ‌گیری'], ['restore', 'فقط بازگردانی']] },
    { key: 'run', label: 'اجرا', options: [['', 'دستی و خودکار'], ['manual', 'فقط دستی'], ['auto', 'فقط خودکار']] },
];

const RESTORE_TITLE: Record<RestoreMode, string> = {
    replace: 'بازگردانی کامل',
    missing: 'برگرداندن داده‌های پاک‌شده',
    test: 'امتحان بازگردانی در کپی جدا',
};

const isRestore = (row: JobLogRow) => row.data?.op === 'restore' || (!!row.data?.fileId && !!row.data?.mode);

function title(row: JobLogRow): string {
    if (isRestore(row)) return RESTORE_TITLE[row.data?.mode || 'replace'];
    return row.data?.trigger === 'cron' ? 'بک‌آپ‌گیری خودکار' : 'بک‌آپ‌گیری دستی';
}

function subtitle(row: JobLogRow): string {
    const parts: string[] = [];
    if (isRestore(row)) {
        if (row.data?.sourceAt) parts.push(`از بک‌آپ ${formatDateShort(row.data.sourceAt)}`);
        else if (row.data?.sourceName) parts.push(`از ${row.data.sourceName}`);
    }
    if (row.data?.collections?.length) parts.push(`فقط ${formatCount(row.data.collections.length)} مجموعه`);
    const who = row.userName || row.data?.userName;
    if (who) parts.push(`توسط ${who}`);
    else if (row.data?.trigger === 'cron') parts.push('زمان‌بندی');
    return parts.join(' · ');
}

function resultText(row: JobLogRow): string {
    if (row.status === 'failed' || row.status === 'stalled') return explainFailure(row.failedReason || row.status);
    if (row.status === 'active' || row.status === 'waiting') return '…';
    const r = row.result;
    if (!r) return '—';
    // built from the numbers (older rows carry English/«پشتیبان» summaries)
    if (typeof r.restored === 'number') {
        if (r.mode === 'missing') return `${formatCount(r.restored)} سند پاک‌شده برگشت؛ ${formatCount(r.failed)} سند موجود دست نخورد`;
        const cols = Object.keys(r.collections || {}).length;
        return `${formatCount(cols)} مجموعه (${formatCount(r.restored)} سند) برگشت${r.verified ? ' — با فایل یکی است' : r.verified === false ? ' — تعداد بعضی مجموعه‌ها با فایل یکی نیست' : ''}`;
    }
    if (r.fileId || r.filename) {
        const cols = Array.isArray(r.collections) ? r.collections.length : 0;
        return `${cols ? `${formatCount(cols)} مجموعه (${formatCount(r.documentCount)} سند)` : `${formatCount(r.documentCount)} سند`} · ${formatSize(r.size)}`;
    }
    if (r.summary) return String(r.summary);
    return '—';
}

function durationOf(row: JobLogRow): string {
    if (row.result?.durationMs) return formatDuration(row.result.durationMs);
    if (row.processedAt && row.finishedAt) return formatDuration(new Date(row.finishedAt).getTime() - new Date(row.processedAt).getTime());
    return '—';
}

export default function DatabaseJobsPage() {
    const router = useRouter();
    const { baseUrl, token, overview, revision, job, summary, openRestore, openBackupNow, requestUndo, download, jobRunning } = useDatabase();
    const table = useUrlTableState('', { sort: 'updatedAt', filters: { status: '', op: '', run: '', db: '' } }, [10, 25, 50]);
    const databases = overview?.databases || [];
    const queryKey = JSON.stringify(table.query);
    const [data, setData, cached] = useCachedState<{ jobs: JobLogRow[]; totalItems: number } | null>(`jobs:${queryKey}`, null);
    const [loading, setLoading] = useState(!cached);
    const [detailsRow, setDetailsRow] = useState<BackupRow | null>(null);
    const [openIds, setOpenIds] = useState<Set<string>>(new Set());
    const jobState = job?.state?.state;

    const load = useCallback(async () => {
        if (!token || !baseUrl) return;
        try {
            setLoading(true);
            setData(await fetchJobs(baseUrl, token, JSON.parse(queryKey)));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseUrl, token, queryKey]);

    useEffect(() => {
        void load();
    }, [load, revision, jobState]);

    /** the backup a row points at, or a toast when it was deleted since */
    const withBackup = async (fileId: string | undefined, then: (row: BackupRow) => void) => {
        if (!fileId) return;
        try {
            const row = await fetchBackup(baseUrl, token, fileId);
            if (!row) return ErrorToaster({ message: 'این بک‌آپ دیگر وجود ندارد (حذف شده).' });
            then(row);
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const actions = (row: JobLogRow): HrRowActionMenuItem[] => {
        const items: HrRowActionMenuItem[] = [];
        const restore = isRestore(row);
        const mode = row.data?.mode;
        const done = row.status === 'completed';
        const failed = row.status === 'failed' || row.status === 'stalled';
        const raw = row.failedReason;
        const safety = row.result?.safetyBackupFileId || row.result?.restoreInfo?.safetyBackupFileId;
        const isLatestRestore = summary?.lastRestore?.jobId === row.jobId;

        if (!restore && done && row.result?.fileId) {
            if (!jobRunning) items.push({ label: 'بازگردانی به همین بک‌آپ', onClick: () => withBackup(row.result.fileId, (b) => openRestore({ row: b })) });
            items.push({ label: 'دیدن بک‌آپ', onClick: () => withBackup(row.result.fileId, setDetailsRow) });
            items.push({ label: 'دانلود', onClick: () => withBackup(row.result.fileId, (b) => download(b)) });
        }
        if (restore && done && mode === 'test') {
            if (summary?.testCopies.some((c) => c.db === (row.data?.db || 'core'))) {
                items.push({ label: 'دیدن داده‌های کپی آزمایشی', onClick: () => router.push('/settings/database?test=1') });
            }
            if (!jobRunning) items.push({ label: 'بازگردانی واقعی همین بک‌آپ', onClick: () => withBackup(row.data?.fileId, (b) => openRestore({ row: b, mode: 'replace' })) });
        }
        if (restore && safety && isLatestRestore && !jobRunning && (done ? mode !== 'test' : !!row.result?.restoreInfo?.liveTouched)) {
            items.push({
                label: 'برگرداندن به قبل از این بازگردانی',
                onClick: () => requestUndo({ safetyBackupFileId: safety, db: row.data?.db || 'core', at: row.finishedAt || row.updatedAt }),
            });
        }
        if (restore && row.data?.fileId && (done || failed)) {
            items.push({ label: 'دیدن بک‌آپ استفاده‌شده', onClick: () => withBackup(row.data?.fileId, setDetailsRow) });
        }
        if (failed && !jobRunning) {
            items.push({
                label: 'تلاش دوباره',
                onClick: () => (restore ? withBackup(row.data?.fileId, (b) => openRestore({ row: b, mode })) : openBackupNow()),
            });
        }
        if (failed && raw) {
            items.push({
                label: 'کپی متن خطا',
                onClick: () =>
                    navigator.clipboard
                        .writeText(raw)
                        .then(() => SuccessToaster({ message: 'متن خطا کپی شد' }))
                        .catch(() => ErrorToaster({ message: 'کپی نشد؛ متن خطا را از ستون «نتیجه» بردارید.' })),
            });
        }
        return items;
    };


    const rows = data?.jobs || [];
    const toggle = (id: string) => setOpenIds((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    return (
        <>
            <SectionIntro topic="tabs">
                <b>به چه درد می‌خورد؟</b> لاگ هر بک‌آپ‌گیری و بازگردانی (دستی یا خودکار): کی شروع شد، چقدر طول کشید، چه کسی اجرا کرد و دقیقاً چه شد.
                <br />
                <b>چطور استفاده کنم؟</b> روی هر خط بزنید تا جزئیات کامل (زمان‌ها، فایل، مجموعه‌ها، متن خطا) باز شود؛ از منوی ⋯ همان کار را دوباره اجرا کنید.
            </SectionIntro>

            <section className={styles.logCard} aria-label="لاگ‌ها">
                <div className={styles.logToolbar}>
                    <div className={styles.logFilters}>
                        {FILTERS.map((f) => (
                            <select
                                key={f.key}
                                className={`${styles.select} ${table.filters[f.key] ? styles.selectActive : ''}`}
                                value={table.filters[f.key]}
                                onChange={(e) => table.setFilter(f.key, e.target.value)}
                                aria-label={f.label}
                            >
                                {f.options.map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        ))}
                        {databases.length > 1 && (
                            <select
                                className={`${styles.select} ${table.filters.db ? styles.selectActive : ''}`}
                                value={table.filters.db}
                                onChange={(e) => table.setFilter('db', e.target.value)}
                                aria-label="دیتابیس"
                            >
                                <option value="">همهٔ دیتابیس‌ها</option>
                                {databases.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.label}
                                    </option>
                                ))}
                            </select>
                        )}
                        {table.filtered && (
                            <button type="button" className={styles.linkBtn} onClick={table.reset}>
                                حذف فیلترها
                            </button>
                        )}
                    </div>
                    <span className={styles.logToolbarEnd}>
                        {jobRunning && (
                            <span className={styles.liveBadge}>
                                <span className={styles.livePulse} /> زنده
                            </span>
                        )}
                        <span className={styles.count}>{formatCount(data?.totalItems || 0)} رویداد</span>
                        <button type="button" className={styles.logIconBtn} onClick={() => void load()} title="تازه‌سازی" aria-label="تازه‌سازی">
                            <LuRefreshCw className={loading ? styles.spin : ''} />
                        </button>
                    </span>
                </div>

                {loading && !data ? (
                    <LoadingState />
                ) : rows.length === 0 ? (
                    <div className={styles.empty}>
                        {table.filtered ? (
                            <>
                                <h3>{table.filters.status === 'failed' ? 'با این فیلترها خطایی ثبت نشده' : 'با این فیلترها رویدادی نیست'}</h3>
                                <div className={styles.emptyActions}>
                                    <button type="button" className={styles.secondaryBtn} onClick={table.reset}>
                                        نمایش همه
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3>هنوز لاگی ثبت نشده</h3>
                                <p>اولین بک‌آپ را بگیرید؛ هر بک‌آپ‌گیری و بازگردانی اینجا ثبت می‌شود.</p>
                                <div className={styles.emptyActions}>
                                    <button type="button" className={styles.primaryBtn} onClick={openBackupNow} disabled={jobRunning}>
                                        بک‌آپ‌گیری الان
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className={`${styles.logList} ${loading ? styles.tableLoading : ''}`} role="list">
                        <div className={styles.logHeadRow} aria-hidden>
                            <span />
                            <SortHeaderButton label="زمان" active={table.sort === 'updatedAt'} dir={table.dir} onClick={() => table.toggleSort('updatedAt')} />
                            <span>سطح</span>
                            <span>رویداد</span>
                            <span>مدت</span>
                            <span />
                        </div>
                        {rows.map((row) => (
                            <LogEntry
                                key={row._id}
                                row={row}
                                open={openIds.has(row._id)}
                                onToggle={() => toggle(row._id)}
                                actions={actions(row)}
                                dbLabel={overview?.databases.find((d) => d.id === (row.data?.db || 'core'))?.label}
                            />
                        ))}
                    </div>
                )}

                {(data?.totalItems || 0) > 0 && (
                    <div className={styles.paginationSpace}>
                        <Pagination
                            rtl
                            itemPerPage={table.limit}
                            currentPage={table.page}
                            totalItems={data?.totalItems || 0}
                            setRowsPerPage={table.setLimit}
                            paginate={table.setPage}
                            rowsPerPageOptions={table.limitOptions}
                        />
                    </div>
                )}
            </section>

            <BackupDetailsDialog row={detailsRow} onClose={() => setDetailsRow(null)} />
        </>
    );
}

function SortHeaderButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: string; onClick: () => void }) {
    return (
        <button type="button" className={styles.logSortBtn} onClick={onClick} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
            {label} {active ? (dir === 'asc' ? '↑' : '↓') : ''}
        </button>
    );
}

type Level = 'ok' | 'error' | 'warn' | 'run' | 'wait';
const LEVEL: Record<JobLogRow['status'], { level: Level; label: string }> = {
    completed: { level: 'ok', label: 'موفق' },
    failed: { level: 'error', label: 'خطا' },
    stalled: { level: 'warn', label: 'نیمه‌کاره' },
    active: { level: 'run', label: 'در حال اجرا' },
    waiting: { level: 'wait', label: 'در صف' },
};
const LEVEL_CLASS: Record<Level, string> = {
    ok: styles.lvOk,
    error: styles.lvError,
    warn: styles.lvWarn,
    run: styles.lvRun,
    wait: styles.lvWait,
};

const ms = (a?: string, b?: string) => (a && b ? new Date(b).getTime() - new Date(a).getTime() : undefined);

/** one log line; opening it shows every detail the job recorded */
function LogEntry({ row, open, onToggle, actions, dbLabel }: { row: JobLogRow; open: boolean; onToggle: () => void; actions: HrRowActionMenuItem[]; dbLabel?: string }) {
    const lv = LEVEL[row.status] || LEVEL.waiting;
    const restore = isRestore(row);
    const r = row.result || {};
    const at = row.finishedAt || row.processedAt || row.createdAt || row.updatedAt;
    const who = row.userName || row.data?.userName || (row.data?.trigger === 'cron' ? 'زمان‌بندی خودکار' : 'نامشخص');
    const failed = row.status === 'failed' || row.status === 'stalled';

    // per-collection numbers: dump → collectionStats; restore → collections { expected, restored, failed, countAfter }
    const perCollection: Array<{ name: string; expected?: number; restored?: number; failed?: number; after?: number; count?: number }> = restore
        ? Object.entries(r.collections || {}).map(([name, v]: [string, any]) => ({ name, expected: v.expected, restored: v.restored, failed: v.failed, after: v.countAfter }))
        : Object.entries(r.collectionStats || {}).map(([name, count]) => ({ name, count: Number(count) }));
    perCollection.sort((a, b) => (b.count ?? b.restored ?? 0) - (a.count ?? a.restored ?? 0));

    const fields: Array<[string, ReactNode]> = [
        ['شناسهٔ کار', <bdi key="id" className={styles.mono}>{row.jobId}</bdi>],
        ['نوع', title(row)],
        ['اجراکننده', who],
        ['دیتابیس', r.targetDatabase || r.database || dbLabel || '—'],
    ];
    if (restore) {
        fields.push(['روش', RESTORE_TITLE[row.data?.mode || 'replace']]);
        if (row.data?.sourceAt || r.sourceAt) fields.push(['بک‌آپ مبدأ', formatDateShort(row.data?.sourceAt || r.sourceAt)]);
        if (row.data?.sourceName) fields.push(['فایل مبدأ', <bdi key="src" className={styles.mono}>{row.data.sourceName}</bdi>]);
        if (typeof r.restored === 'number') fields.push(['سند برگشته', formatCount(r.restored)]);
        if (typeof r.failed === 'number' && r.failed > 0) fields.push(['سند دست‌نخورده', formatCount(r.failed)]);
        if (r.verified !== undefined) fields.push(['بررسی نهایی', r.verified ? 'تعداد همهٔ مجموعه‌ها با فایل یکی است' : 'تعداد بعضی مجموعه‌ها با فایل یکی نیست']);
        if (r.safetyBackupFileId || r.restoreInfo?.safetyBackupFileId) fields.push(['بک‌آپ ایمنی', 'گرفته شد (برای «برگرداندن به قبل»)']);
    } else {
        if (r.filename) fields.push(['فایل', <bdi key="file" className={styles.mono}>{r.filename}</bdi>]);
        if (r.size) fields.push(['حجم', formatSize(r.size)]);
        if (r.documentCount !== undefined) fields.push(['محتوا', `${formatCount(r.documentCount)} سند در ${formatCount((r.collections || []).length || Object.keys(r.collectionStats || {}).length)} مجموعه`]);
    }
    if (row.data?.collections?.length) fields.push(['محدوده', `فقط ${formatCount(row.data.collections.length)} مجموعه`]);

    // a queue wait over a day means the log record outlived a queue reset (job ids start again) — not a real wait
    const wait = ms(row.createdAt, row.processedAt);
    const queuedKnown = wait === undefined || (wait >= 0 && wait < 86400000);
    const steps = [
        ...(queuedKnown ? [{ label: 'در صف', at: row.createdAt, gap: undefined as number | undefined }] : []),
        { label: 'شروع', at: row.processedAt, gap: queuedKnown ? wait : undefined },
        { label: failed ? 'متوقف شد' : row.status === 'completed' ? 'پایان' : 'هنوز تمام نشده', at: row.finishedAt, gap: ms(row.processedAt, row.finishedAt) },
    ];

    const copy = (text: string, what: string) =>
        navigator.clipboard
            .writeText(text)
            .then(() => SuccessToaster({ message: `${what} کپی شد` }))
            .catch(() => ErrorToaster({ message: 'کپی نشد' }));

    return (
        <div className={`${styles.logRow} ${LEVEL_CLASS[lv.level]} ${open ? styles.logRowOpen : ''}`} role="listitem">
            <div className={styles.logLine}>
                <button type="button" className={styles.logMain} onClick={onToggle} aria-expanded={open}>
                    <LuChevronLeft className={styles.logCaret} aria-hidden />
                    <time className={styles.logTime} dateTime={at} title={fullDate(at)}>
                        {formatLogTime(at)}
                    </time>
                    <span className={styles.logLevel}>{lv.label}</span>
                    <span className={styles.logMsg}>
                        <span className={styles.logTitle}>{title(row)}</span>
                        <span className={failed ? styles.logResultBad : styles.logResult}>{resultText(row)}</span>
                        {subtitle(row) && <span className={styles.logMeta}>{subtitle(row)}</span>}
                    </span>
                    <span className={styles.logDuration}>{durationOf(row)}</span>
                </button>
                <span className={styles.logActions}>{actions.length > 0 && <HrRowActionMenu rowId={row._id} items={actions} ariaLabel={`عملیات ${title(row)}`} />}</span>
            </div>

            {open && (
                <div className={styles.logDetail}>
                    <ol className={styles.logSteps}>
                        {steps.map((s, i) => (
                            <li key={i} className={s.at ? styles.stepDone : ''}>
                                <span className={styles.stepDot} />
                                <span className={styles.stepLabel2}>{s.label}</span>
                                <span className={styles.stepTime}>{s.at ? formatLogTime(s.at) : '—'}</span>
                                {s.gap !== undefined && s.gap >= 0 && <span className={styles.stepGap}>{formatDuration(s.gap)} بعد</span>}
                            </li>
                        ))}
                    </ol>

                    <dl className={styles.logFields}>
                        {fields.map(([k, v]) => (
                            <div key={k}>
                                <dt>{k}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>

                    {failed && (
                        <div className={styles.logError}>
                            <div className={styles.logErrorHead}>
                                <b>{explainFailure(row.failedReason || row.status)}</b>
                                {row.failedReason && (
                                    <button type="button" className={styles.linkBtn} onClick={() => copy(row.failedReason!, 'متن خطا')}>
                                        <LuCopy /> کپی
                                    </button>
                                )}
                            </div>
                            {row.failedReason && (
                                <pre className={styles.logPre} dir="ltr">
                                    {row.failedReason}
                                </pre>
                            )}
                        </div>
                    )}

                    {perCollection.length > 0 && (
                        <details className={styles.logBlock}>
                            <summary>مجموعه‌ها ({formatCount(perCollection.length)})</summary>
                            <div className={styles.logTableWrap}>
                                <table className={styles.logTable}>
                                    <thead>
                                        <tr>
                                            <th>مجموعه</th>
                                            {restore ? (
                                                <>
                                                    <th>در فایل</th>
                                                    <th>برگشت</th>
                                                    <th>دست‌نخورده</th>
                                                    <th>الان در دیتابیس</th>
                                                </>
                                            ) : (
                                                <th>سند</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {perCollection.map((c) => (
                                            <tr key={c.name}>
                                                <td>
                                                    <bdi className={styles.mono}>{c.name}</bdi>
                                                </td>
                                                {restore ? (
                                                    <>
                                                        <td>{c.expected !== undefined ? formatCount(c.expected) : '—'}</td>
                                                        <td>{formatCount(c.restored || 0)}</td>
                                                        <td>{c.failed ? formatCount(c.failed) : '—'}</td>
                                                        <td className={c.after !== undefined && c.expected !== undefined && c.after !== c.expected ? styles.warnText : ''}>
                                                            {c.after !== undefined ? formatCount(c.after) : '—'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <td>{formatCount(c.count || 0)}</td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    )}

                    <details className={styles.logBlock}>
                        <summary>داده خام (JSON)</summary>
                        <div className={styles.logRawHead}>
                            <button type="button" className={styles.linkBtn} onClick={() => copy(JSON.stringify(row, null, 2), 'داده خام')}>
                                <LuCopy /> کپی
                            </button>
                        </div>
                        <pre className={styles.logPre} dir="ltr">
                            {JSON.stringify(row, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
}
