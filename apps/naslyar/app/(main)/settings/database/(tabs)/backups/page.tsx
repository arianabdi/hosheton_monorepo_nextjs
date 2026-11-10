'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuCalendarClock, LuCheck, LuDatabaseBackup, LuShieldCheck, LuUpload, LuX } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import HrRowActionMenu, { type HrRowActionMenuItem } from '@/app/(main)/management/hr/components/HrRowActionMenu';
import { useCachedState, useDatabase } from '../../lib/DatabaseProvider';
import { deleteBackup, dropTestDb, fetchBackup, fetchBackups, fetchLatestFullBackup, notifyBackup, type BackupRow, type DbTarget } from '../../lib/database-api';
import { backupAt, backupTitle, formatCount, formatDate, formatDateShort, formatSize, fullDate, PURPOSE_LABEL, relativeTime } from '../../lib/format';
import SectionIntro from '../../components/SectionIntro';
import AutoBackupSettings from '../../components/AutoBackupSettings';
import BackupDetailsDialog from '../../components/BackupDetailsDialog';
import styles from '../../Database.module.scss';

type ListData = { items: BackupRow[]; totalItems: number };

/** automatic = the schedule or the safety copy a restore takes by itself; manual = taken or uploaded by an admin */
const isAuto = (row: BackupRow) => row.trigger === 'cron' || row.purpose === 'pre-restore';
const RUN_DETAIL: Record<string, string> = {
    cron: 'زمان‌بندی‌شده',
    'pre-restore': 'ایمنی قبل از بازگردانی',
    manual: 'با دکمهٔ بک‌آپ‌گیری',
    uploaded: 'فایل آپلودشده',
};

export default function DatabaseBackupsPage() {
    const { baseUrl, token, overview, summary, revision, bump, reloadSummary, openRestore, openBackupNow, requestUndo, download, jobRunning } = useDatabase();
    const table = useUrlTableState('', { sort: 'createdAt', filters: { db: '' } }, [10, 25, 50]);
    const apiQuery: Record<string, string | number> = {
        page: table.page,
        limit: table.limit,
        sort: table.sort,
        dir: table.dir,
        ...(table.search ? { search: table.search } : {}),
        ...(table.filters.db ? { db: table.filters.db } : {}),
    };
    const queryKey = JSON.stringify(apiQuery);
    const [data, setData, cached] = useCachedState<ListData | null>(`backups:${queryKey}`, null);
    const [latest, setLatest] = useCachedState<BackupRow | null>('backups:latest', null);
    const [loading, setLoading] = useState(!cached);
    const [detailsRow, setDetailsRow] = useState<BackupRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<BackupRow | null>(null);
    const [dropCopy, setDropCopy] = useState<DbTarget | null>(null);
    const [busy, setBusy] = useState(false);
    const multiDb = (overview?.databases.length || 0) > 1;

    const load = useCallback(async () => {
        if (!token || !baseUrl) return;
        try {
            setLoading(true);
            const [res, last] = await Promise.all([fetchBackups(baseUrl, token, JSON.parse(queryKey)), fetchLatestFullBackup(baseUrl, token).catch(() => null)]);
            setData({ items: res.items, totalItems: res.totalItems });
            setLatest(last);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseUrl, token, queryKey]);

    useEffect(() => {
        void load();
    }, [load, revision]);

    const run = async (fn: () => Promise<void>) => {
        try {
            setBusy(true);
            await fn();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const actions = (row: BackupRow): HrRowActionMenuItem[] => [
        ...(row.format === 'bson'
            ? [{ label: row.purpose === 'pre-restore' ? 'برگرداندن به این وضعیت' : 'بازگردانی به این نسخه', onClick: () => openRestore({ row }) }]
            : []),
        { label: 'دانلود', onClick: () => download(row) },
        { label: 'جزئیات', onClick: () => setDetailsRow(row) },
        {
            label: 'ارسال به تلگرام/بله',
            onClick: () =>
                run(async () => {
                    SuccessToaster({ message: 'در حال ارسال…' });
                    const res = await notifyBackup(baseUrl, token, row._id);
                    (res.sent ? SuccessToaster : ErrorToaster)({ message: res.message });
                    bump();
                }),
        },
        { label: 'حذف', danger: true, onClick: () => setDeleteRow(row) },
    ];

    const rows = data?.items || [];
    const lastRestore = summary?.lastRestore;
    const copies = summary?.testCopies || [];

    const openCopyForReal = async (fileId: string | null) => {
        if (!fileId) return openRestore();
        const row = await fetchBackup(baseUrl, token, fileId);
        if (row) openRestore({ row, mode: 'replace' });
        else ErrorToaster({ message: 'بک‌آپ این کپی دیگر وجود ندارد.' });
    };

    return (
        <>
            <SectionIntro topic="trouble">
                <b>به چه درد می‌خورد؟</b> همهٔ بک‌آپ‌ها — خودکار و دستی — در یک جدول؛ هر وقت مشکلی پیش آمد به یکی از نسخه‌ها برگردید.
                <br />
                <b>چطور استفاده کنم؟</b> بک‌آپ خودکار را روشن نگه دارید؛ برای برگشتن «بازگردانی» را بزنید (قبلش خودکار از وضعیت فعلی بک‌آپ گرفته می‌شود).
            </SectionIntro>

            {(latest || lastRestore || copies.length > 0) && (
                <section className={styles.statusCard} aria-label="وضعیت فعلی">
                    {latest && (
                        <div className={styles.statusRow}>
                            <span className={`${styles.dot} ${styles.dotOk}`} />
                            <span className={styles.statusText}>
                                آخرین بک‌آپ کامل: <b>{formatDate(latest.createdAt)}</b> ({relativeTime(latest.createdAt)}) · {formatCount(latest.documentCount)} سند
                            </span>
                            <span className={styles.lineNoteActions}>
                                <button type="button" className={styles.linkBtn} onClick={() => openRestore({ row: latest })} disabled={jobRunning}>
                                    بازگردانی
                                </button>
                                <button type="button" className={styles.linkBtn} onClick={() => download(latest)}>
                                    دانلود
                                </button>
                            </span>
                        </div>
                    )}

                    {lastRestore && (
                        <div className={styles.statusRow}>
                            <span className={`${styles.dot} ${lastRestore.status === 'failed' ? styles.dotBad : styles.dotBrand}`} />
                            <span className={styles.statusText}>
                                {lastRestore.status === 'failed' ? 'بازگردانی ' : 'آخرین بازگردانی: '}
                                {relativeTime(lastRestore.at)}
                                {lastRestore.sourceAt ? ` (به ${formatDateShort(lastRestore.sourceAt)})` : ''}
                                {lastRestore.status === 'failed' ? ' کامل نشد' : ''}
                            </span>
                            <span className={styles.lineNoteActions}>
                                <button
                                    type="button"
                                    className={styles.linkBtn}
                                    disabled={jobRunning}
                                    onClick={() => requestUndo({ safetyBackupFileId: lastRestore.safetyBackupFileId, db: lastRestore.db, at: lastRestore.at })}
                                >
                                    برگرداندن به قبل
                                </button>
                            </span>
                        </div>
                    )}

                    {copies.map((c) => (
                        <div key={c.db} className={styles.statusRow}>
                            <span className={`${styles.dot} ${styles.dotWarn}`} />
                            <span className={styles.statusText}>
                                یک کپی آزمایشی{c.sourceAt ? ` از بک‌آپ ${formatDateShort(c.sourceAt)}` : ''} هست ({formatCount(c.collections)} مجموعه، {formatCount(c.documents)} سند).
                            </span>
                            <span className={styles.lineNoteActions}>
                                <Link className={styles.linkBtn} href={`/settings/database?test=1${c.db !== 'core' ? `&db=${c.db}` : ''}`}>
                                    دیدن داده‌ها
                                </Link>
                                <button type="button" className={styles.linkBtn} onClick={() => openCopyForReal(c.fileId)} disabled={jobRunning}>
                                    اعمال روی دیتابیس اصلی
                                </button>
                                <button type="button" className={styles.dangerLink} onClick={() => setDropCopy(c.db)}>
                                    حذف کپی
                                </button>
                            </span>
                        </div>
                    ))}
                </section>
            )}

            <AutoBackupSettings />

            <section className={styles.listCard} aria-label="فهرست بک‌آپ‌ها">
                <div className={styles.listHead}>
                    <h3 className={styles.cardTitle}>همهٔ بک‌آپ‌ها</h3>
                </div>

                <div className={styles.toolbar}>
                    <TableSearch className={styles.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder="جستجوی نام فایل یا مجموعه" />
                    {multiDb && (
                        <select className={styles.select} value={table.filters.db} onChange={(e) => table.setFilter('db', e.target.value)} aria-label="دیتابیس">
                            <option value="">همهٔ دیتابیس‌ها</option>
                            {overview?.databases.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    )}
                    <span className={styles.count}>{formatCount(data?.totalItems || 0)} بک‌آپ</span>
                </div>

                {loading && !data ? (
                    <LoadingState />
                ) : rows.length === 0 ? (
                    <div className={styles.empty}>
                        {table.filtered ? (
                            <>
                                <h3>با این فیلترها بک‌آپی نیست</h3>
                                <p>جستجو یا فیلتر را عوض کنید.</p>
                                <button type="button" className={styles.secondaryBtn} onClick={table.reset}>
                                    حذف فیلترها
                                </button>
                            </>
                        ) : (
                            <>
                                <h3>هنوز بک‌آپی اینجا ثبت نشده</h3>
                                <p>اگر فایل بک‌آپ را دانلود کرده‌اید یا از تلگرام/بله دارید، از «بازگردانی از فایل» برگردانید؛ وگرنه اولین بک‌آپ را بگیرید.</p>
                                <span className={styles.emptyActions}>
                                    <button type="button" className={styles.primaryBtn} onClick={() => openRestore({ source: 'file' })}>
                                        بازگردانی از فایل
                                    </button>
                                    <button type="button" className={styles.secondaryBtn} onClick={openBackupNow}>
                                        بک‌آپ‌گیری الان
                                    </button>
                                </span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className={`${styles.tableWrap} ${loading ? styles.tableLoading : ''}`}>
                        <table className={`${styles.dataTable} ${styles.backupTable}`}>
                            <thead>
                                <tr>
                                    <SortHeader label="نسخه" field="createdAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="زمانی که داده‌ها برداشته شده‌اند" />
                                    <th title="خودکار = زمان‌بندی یا ایمنی قبل از بازگردانی؛ دستی = با دکمه یا فایل آپلودی">نوع</th>
                                    <th title="آیا می‌شود با این نسخه بازگردانی کرد">وضعیت</th>
                                    <SortHeader label="محتوا" field="documents" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="تعداد مجموعه‌ها (collection) و سندهای داخل فایل؛ مرتب‌سازی بر اساس تعداد سند" />
                                    <SortHeader label="حجم" field="size" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="حجم فشردهٔ فایل" />
                                    <th title="نسخه‌ای بیرون از این سرور (تلگرام/بله) — اگر سرور از دست برود">نسخهٔ بیرونی</th>
                                    <th className={styles.actionsCol}>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const results = row.notified?.results || [];
                                    const sentTo = [...new Set(results.filter((r) => r.ok).map((r) => (r.channel === 'bale' ? 'بله' : 'تلگرام')))];
                                    const sentFail = results.length > 0 && sentTo.length === 0;
                                    const auto = isAuto(row);
                                    const health =
                                        row.format === 'json'
                                            ? { cls: styles.healthBad, label: 'قابل بازگردانی نیست', hint: 'با روش قدیمی ساخته شده؛ شناسه‌ها و تاریخ‌ها در آن متن شده‌اند.' }
                                            : row.partial
                                              ? { cls: styles.healthWarn, label: 'بخشی از داده‌ها', hint: `فقط ${formatCount(row.collectionCount)} مجموعه در این فایل است.` }
                                              : { cls: styles.healthOk, label: 'آمادهٔ بازگردانی', hint: 'نسخهٔ کامل و دقیق (BSON)؛ با یک کلیک برمی‌گردد.' };
                                    const Icon = row.purpose === 'uploaded' ? LuUpload : row.purpose === 'pre-restore' ? LuShieldCheck : auto ? LuCalendarClock : LuDatabaseBackup;
                                    const dbLabel = multiDb ? overview?.databases.find((d) => d.id === row.db)?.label || row.db : '';
                                    // «۳ ساعت پیش» helps for recent versions; older ones already read clearly from the date
                                    const recent = Date.now() - new Date(backupAt(row) || 0).getTime() < 30 * 86400000;
                                    return (
                                        <tr key={row._id} className={styles.backupRow} onClick={() => setDetailsRow(row)}>
                                            <td data-label="نسخه">
                                                <div className={styles.versionCell}>
                                                    <span className={`${styles.versionIcon} ${auto ? styles.versionAuto : ''}`} aria-hidden>
                                                        <Icon />
                                                    </span>
                                                    <span className={styles.versionText}>
                                                        <span className={styles.versionTitle}>{backupTitle(row)}</span>
                                                        {(recent || dbLabel) && (
                                                            <span className={styles.cellMuted} title={fullDate(backupAt(row))}>
                                                                {[recent ? relativeTime(backupAt(row)) : '', dbLabel].filter(Boolean).join(' · ')}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td data-label="نوع">
                                                <div className={styles.cellStack}>
                                                    <span className={`${styles.runBadge} ${auto ? styles.runAuto : styles.runManual}`}>{auto ? 'خودکار' : 'دستی'}</span>
                                                    <span className={styles.cellMuted} title={row.purpose === 'uploaded' ? row.originalName || undefined : undefined}>
                                                        {RUN_DETAIL[row.trigger === 'cron' ? 'cron' : row.purpose] || PURPOSE_LABEL[row.purpose] || 'دستی'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td data-label="وضعیت">
                                                <span className={`${styles.healthPill} ${health.cls}`} title={health.hint}>
                                                    <span className={styles.healthDot} />
                                                    {health.label}
                                                </span>
                                            </td>
                                            <td data-label="محتوا">
                                                <div className={styles.cellStack}>
                                                    <span>
                                                        <span className={styles.num}>{formatCount(row.collectionCount)}</span> مجموعه
                                                    </span>
                                                    <span className={styles.cellMuted}>{formatCount(row.documentCount)} سند</span>
                                                </div>
                                            </td>
                                            <td data-label="حجم">
                                                <span className={styles.num}>{formatSize(row.size)}</span>
                                            </td>
                                            <td data-label="نسخهٔ بیرونی">
                                                {sentTo.length ? (
                                                    <span className={styles.offsiteOk} title={row.notified?.at ? `ارسال: ${fullDate(row.notified.at)}` : undefined}>
                                                        <LuCheck /> {sentTo.join(' و ')}
                                                    </span>
                                                ) : sentFail ? (
                                                    <span className={styles.offsiteBad} title={results.map((r) => r.error).filter(Boolean).join(' | ')}>
                                                        <LuX /> ارسال نشد
                                                    </span>
                                                ) : (
                                                    <span className={styles.cellMuted}>فقط روی سرور</span>
                                                )}
                                            </td>
                                            <td data-label="عملیات" className={styles.actionsCol} onClick={(e) => e.stopPropagation()}>
                                                <HrRowActionMenu rowId={row._id} items={actions(row)} ariaLabel={`عملیات بک‌آپ ${formatDateShort(row.createdAt)}`} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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

            <ConfirmDialog
                open={!!deleteRow}
                title="حذف بک‌آپ"
                tone="danger"
                confirmLabel="حذف"
                busy={busy}
                onClose={() => setDeleteRow(null)}
                onConfirm={() =>
                    run(async () => {
                        if (!deleteRow) return;
                        await deleteBackup(baseUrl, token, deleteRow._id);
                        SuccessToaster({ message: 'بک‌آپ حذف شد' });
                        setDeleteRow(null);
                        bump();
                        void reloadSummary();
                    })
                }
            >
                بک‌آپ {deleteRow ? formatDate(deleteRow.createdAt) : ''} از استوریج پاک می‌شود و قابل برگشت نیست.
                {deleteRow?.purpose === 'pre-restore' && ' این بک‌آپ ایمنیِ یک بازگردانی است؛ بعد از حذف، «برگرداندن به قبل» ممکن نیست.'}
            </ConfirmDialog>

            <ConfirmDialog
                open={!!dropCopy}
                title="حذف کپی آزمایشی"
                tone="danger"
                confirmLabel="حذف کپی"
                busy={busy}
                onClose={() => setDropCopy(null)}
                onConfirm={() =>
                    run(async () => {
                        if (!dropCopy) return;
                        await dropTestDb(baseUrl, token, dropCopy);
                        SuccessToaster({ message: 'کپی آزمایشی حذف شد' });
                        setDropCopy(null);
                        void reloadSummary();
                    })
                }
            >
                فقط کپی آزمایشی پاک می‌شود؛ دیتابیس اصلی و بک‌آپ‌ها دست نمی‌خورند.
            </ConfirmDialog>
        </>
    );
}
