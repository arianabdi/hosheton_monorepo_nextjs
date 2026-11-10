'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LuChevronDown, LuCircle, LuCircleCheck, LuLoaderCircle } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { ErrorToaster, toFarsiNumber } from '@my-workspace/utils';
import { jobLabel, jobProgress, useDatabase, type RestoreRequest } from '../lib/DatabaseProvider';
import { fetchBackups, runRestore, type BackupRow, type DbTarget, type JobPhase, type RestoreMode, type RestoreResult } from '../lib/database-api';
import { explainFailure, formatCount, formatDate, formatDateShort, PURPOSE_LABEL, relativeTime, backupAt } from '../lib/format';
import CollectionPicker from './CollectionPicker';
import RestoreUpload from './RestoreUpload';
import styles from '../Database.module.scss';

type Source = 'latest' | 'older' | 'file';

const MODES: Array<{ id: RestoreMode; title: string; text: string }> = [
    { id: 'replace', title: 'بازگردانی کامل (پیشنهادی)', text: 'داده‌ها دقیقاً مثل بک‌آپ می‌شوند. قبلش از وضعیت فعلی بک‌آپ گرفته می‌شود و با «برگرداندن به قبل» قابل برگشت است.' },
    { id: 'missing', title: 'فقط داده‌های پاک‌شده را برگردان', text: 'سندهایی که الان نیستند برمی‌گردند؛ هیچ سند موجودی تغییر نمی‌کند.' },
    { id: 'test', title: 'اول در یک کپی جدا امتحان کن', text: 'داده‌ها در یک دیتابیس جدا ریخته می‌شوند تا در صفحهٔ «داده‌ها» ببینید؛ دیتابیس اصلی دست نمی‌خورد.' },
];

const STEPS: Record<RestoreMode, JobPhase[]> = {
    replace: ['safety', 'download', 'restore', 'verify'],
    missing: ['safety', 'download', 'restore'],
    test: ['download', 'restore', 'verify'],
};

const STEP_TEXT: Record<JobPhase, string> = {
    dump: 'بک‌آپ‌گیری',
    safety: 'بک‌آپ ایمنی از وضعیت فعلی',
    download: 'آماده‌کردن فایل بک‌آپ',
    restore: 'برگرداندن داده‌ها',
    verify: 'بررسی اینکه چیزی جا نمانده باشد',
};

function rowLabel(r: BackupRow) {
    return `${formatDateShort(backupAt(r))} · ${PURPOSE_LABEL[r.purpose] || ''} · ${formatCount(r.documentCount)} سند`;
}

function Choose({ req, onStarted, onClose }: { req: RestoreRequest; onStarted: (jobId: string, row: BackupRow, mode: RestoreMode) => void; onClose: () => void }) {
    const { baseUrl, token, overview, trackJob, jobRunning } = useDatabase();
    const databases = (overview?.databases || []).filter((d) => d.available);
    const fixed = req.row || null;
    const [source, setSource] = useState<Source>(req.source || 'latest');
    const [candidates, setCandidates] = useState<BackupRow[] | null>(null);
    const [olderId, setOlderId] = useState('');
    const [uploaded, setUploaded] = useState<BackupRow | null>(null);
    const [mode, setMode] = useState<RestoreMode>(req.mode || 'replace');
    const [more, setMore] = useState(!!req.mode && req.mode !== 'replace');
    const [scope, setScope] = useState<'all' | 'some'>('all');
    const [collections, setCollections] = useState<string[]>([]);
    const [db, setDb] = useState<DbTarget>((fixed?.db as DbTarget) || databases[0]?.id || 'core');
    const [confirmName, setConfirmName] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (fixed) return;
        fetchBackups(baseUrl, token, { full: 1, limit: 30, page: 1, sort: 'createdAt', dir: 'desc' })
            .then((res) => {
                setCandidates(res.items);
                if (res.items[1]) setOlderId(res.items[1]._id);
                if (!res.items.length && !req.source) setSource('file');
            })
            .catch(() => setCandidates([]));
    }, [baseUrl, token, fixed, req.source]);

    const row: BackupRow | null = fixed || (source === 'latest' ? candidates?.[0] || null : source === 'older' ? candidates?.find((c) => c._id === olderId) || null : uploaded);
    const target = databases.find((d) => d.id === db);
    const liveName = target?.database || '';
    const foreign = !!row?.database && !!liveName && row.database !== liveName;
    const chosen = scope === 'some' ? collections : [];

    useEffect(() => {
        setScope('all');
        setCollections([]);
        setConfirmName('');
    }, [row?._id]);

    const sentence = useMemo(() => {
        if (!row) return '';
        const when = formatDate(backupAt(row));
        const what = chosen.length ? `${toFarsiNumber(chosen.length)} مجموعهٔ انتخاب‌شده` : target?.label || 'دیتابیس';
        if (mode === 'replace') return `${what} به وضعیت ${when} برمی‌گردد و تغییرات بعد از آن پاک می‌شود.`;
        if (mode === 'missing') return `سندهایی که از ${when} به بعد پاک شده‌اند برمی‌گردند؛ داده‌های فعلی دست نمی‌خورند.`;
        return `بک‌آپ ${when} در یک کپی جدا ریخته می‌شود تا قبل از بازگردانی واقعی ببینیدش.`;
    }, [row, mode, chosen.length, target?.label]);

    const canStart = !!row && row.format === 'bson' && !busy && !jobRunning && (!foreign || mode !== 'replace' || confirmName.trim() === liveName) && (scope === 'all' || collections.length > 0);

    const start = async () => {
        if (!row) return;
        try {
            setBusy(true);
            const { jobId } = await runRestore(baseUrl, token, row._id, {
                db,
                mode,
                collections: chosen.length ? chosen : undefined,
                safetyBackup: mode === 'missing' ? true : undefined,
                confirm: mode === 'replace' ? (foreign ? confirmName.trim() : true) : undefined,
            });
            trackJob({ jobId, op: 'restore', mode, db, fileId: row._id, sourceAt: backupAt(row), label: jobLabel('restore', mode, backupAt(row)) });
            onStarted(jobId, row, mode);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const primary = !row ? 'بازگردانی' : mode === 'replace' ? `بازگردانی به ${formatDateShort(backupAt(row))}` : mode === 'missing' ? 'برگرداندن داده‌های پاک‌شده' : 'امتحان در کپی جدا';

    return (
        <div className={styles.dialog}>
            <div className={styles.dialogHead}>
                <h2>{fixed ? `بازگردانی به ${formatDate(backupAt(fixed))}` : 'بازگردانی'}</h2>
                <p>{fixed ? `بک‌آپ ${PURPOSE_LABEL[fixed.purpose] || ''} · ${formatCount(fixed.documentCount)} سند · ${relativeTime(backupAt(fixed))}` : 'به کدام نسخه برگردیم؟'}</p>
            </div>
            <div className={styles.dialogBody}>
                {!fixed && (
                    <div className={styles.stepBlock}>
                        <div className={styles.choices}>
                            <label className={`${styles.choice} ${source === 'latest' ? styles.choiceActive : ''}`}>
                                <input type="radio" name="src" checked={source === 'latest'} onChange={() => setSource('latest')} disabled={!candidates?.length} />
                                <span className={styles.choiceBody}>
                                    <strong>آخرین بک‌آپ کامل</strong>
                                    <span>{candidates === null ? 'در حال خواندن…' : candidates[0] ? `${rowLabel(candidates[0])} · ${relativeTime(backupAt(candidates[0]))}` : 'هنوز بک‌آپ کاملی روی سرور نیست'}</span>
                                </span>
                            </label>
                            {(candidates?.length || 0) > 1 && (
                                <label className={`${styles.choice} ${source === 'older' ? styles.choiceActive : ''}`}>
                                    <input type="radio" name="src" checked={source === 'older'} onChange={() => setSource('older')} />
                                    <span className={styles.choiceBody}>
                                        <strong>یک نسخهٔ قدیمی‌تر</strong>
                                        {source === 'older' ? (
                                            <select className={styles.select} value={olderId} onChange={(e) => setOlderId(e.target.value)} onClick={(e) => e.stopPropagation()}>
                                                {candidates!.slice(1).map((c) => (
                                                    <option key={c._id} value={c._id}>
                                                        {rowLabel(c)}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span>{toFarsiNumber(candidates!.length - 1)} نسخهٔ دیگر</span>
                                        )}
                                    </span>
                                </label>
                            )}
                            <label className={`${styles.choice} ${source === 'file' ? styles.choiceActive : ''}`}>
                                <input type="radio" name="src" checked={source === 'file'} onChange={() => setSource('file')} />
                                <span className={styles.choiceBody}>
                                    <strong>فایلی که دانلود کرده‌ام</strong>
                                    {uploaded ? (
                                        <>
                                            <span>
                                                بک‌آپ {formatDateShort(backupAt(uploaded))} · {formatCount(uploaded.documentCount)} سند
                                            </span>
                                            {uploaded.originalName && (
                                                <span className={styles.fileName} dir="ltr" title={uploaded.originalName}>
                                                    {uploaded.originalName}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span>از همین پنل یا تلگرام/بله</span>
                                    )}
                                </span>
                            </label>
                        </div>
                        {source === 'file' && !uploaded && (
                            <div className={styles.pickerWrap}>
                                <RestoreUpload onReady={setUploaded} />
                            </div>
                        )}
                        {source === 'file' && uploaded && (
                            <p className={`${styles.lineNote} ${styles.lineNoteOk}`}>
                                فایل سالم است: بک‌آپ دیتابیس <code>{uploaded.database}</code> · {formatCount(uploaded.collectionCount)} مجموعه · {formatCount(uploaded.documentCount)} سند
                                <span className={styles.lineNoteActions}>
                                    <button type="button" className={styles.linkBtn} onClick={() => setUploaded(null)}>
                                        فایل دیگر
                                    </button>
                                </span>
                            </p>
                        )}
                    </div>
                )}

                {row && (
                    <>
                        <p className={styles.lead}>{sentence}</p>
                        {mode === 'replace' && (
                            <p className={`${styles.lineNote} ${styles.lineNoteBrand}`}>
                                قبل از شروع، خودکار از وضعیت فعلی بک‌آپ می‌گیریم؛ اگر نتیجه را نخواستید با «برگرداندن به قبل» همه‌چیز برمی‌گردد.
                            </p>
                        )}
                        {row.partial && (
                            <p className={`${styles.lineNote} ${styles.lineNoteWarn}`}>
                                این بک‌آپ فقط {formatCount(row.collectionCount)} مجموعه دارد؛ فقط همان‌ها برمی‌گردند و بقیهٔ داده‌ها دست نمی‌خورند.
                            </p>
                        )}
                        {foreign && (
                            <div className={`${styles.lineNote} ${styles.lineNoteDanger} ${styles.stepBlock}`}>
                                <span>
                                    این فایل مال دیتابیس <code>{row.database}</code> است، نه <code>{liveName}</code>.
                                    {mode === 'replace' && <> اگر عمداً داده را از آنجا می‌آورید، نام <code>{liveName}</code> را بنویسید:</>}
                                </span>
                                {mode === 'replace' && (
                                    <input className={styles.confirmInput} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={liveName} autoComplete="off" spellCheck={false} />
                                )}
                            </div>
                        )}

                        <button type="button" className={`${styles.disclosureBtn} ${more ? styles.disclosureOpen : ''}`} onClick={() => setMore((v) => !v)} aria-expanded={more}>
                            تنظیمات بیشتر <LuChevronDown aria-hidden />
                        </button>
                        {more && (
                            <div className={styles.disclosureBody}>
                                <div className={styles.stepBlock}>
                                    <span className={styles.stepLabel}>روش</span>
                                    <div className={styles.choices}>
                                        {MODES.map((m) => (
                                            <label key={m.id} className={`${styles.choice} ${mode === m.id ? styles.choiceActive : ''}`}>
                                                <input type="radio" name="mode" checked={mode === m.id} onChange={() => setMode(m.id)} />
                                                <span className={styles.choiceBody}>
                                                    <strong>{m.title}</strong>
                                                    <span>{m.text}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.stepBlock}>
                                    <span className={styles.stepLabel}>کدام مجموعه‌ها</span>
                                    <div className={styles.choices}>
                                        <label className={`${styles.choice} ${scope === 'all' ? styles.choiceActive : ''}`}>
                                            <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
                                            <span className={styles.choiceBody}>
                                                <strong>همه</strong>
                                                <span>{formatCount(row.collectionCount)} مجموعهٔ این بک‌آپ</span>
                                            </span>
                                        </label>
                                        <label className={`${styles.choice} ${scope === 'some' ? styles.choiceActive : ''}`}>
                                            <input type="radio" name="scope" checked={scope === 'some'} onChange={() => setScope('some')} />
                                            <span className={styles.choiceBody}>
                                                <strong>فقط چند مجموعه</strong>
                                                <span>مثلاً فقط «cards» که اشتباهی پاک شده؛ بقیه دست نمی‌خورند.</span>
                                            </span>
                                        </label>
                                    </div>
                                    {scope === 'some' && (
                                        <div className={styles.pickerWrap}>
                                            <CollectionPicker options={row.collections} value={collections} onChange={setCollections} counts={row.collectionStats} />
                                        </div>
                                    )}
                                </div>
                                {databases.length > 1 && (
                                    <div className={styles.stepBlock}>
                                        <span className={styles.stepLabel}>در کدام دیتابیس</span>
                                        <select className={styles.select} value={db} onChange={(e) => setDb(e.target.value as DbTarget)}>
                                            {databases.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className={styles.dialogFoot}>
                <button type="button" className={styles.primaryBtn} onClick={start} disabled={!canStart}>
                    {busy ? 'در حال شروع…' : jobRunning ? 'یک کار دیگر در حال اجراست' : primary}
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                    انصراف
                </button>
            </div>
        </div>
    );
}

function Running({ row, mode, onAgain, onClose }: { row: BackupRow; mode: RestoreMode; onAgain: (mode: RestoreMode) => void; onClose: () => void }) {
    const { job, requestUndo } = useDatabase();
    const [tech, setTech] = useState(false);
    const [details, setDetails] = useState(false);
    const state = job?.state?.state;
    const done = state === 'completed';
    const failed = state === 'failed';
    const p = jobProgress(job);
    const log = job?.state?.log;
    const result = (done ? log?.result : null) as RestoreResult | null;
    const restoreInfo = failed ? log?.result?.restoreInfo : null;
    const steps = STEPS[mode];
    const current = p ? steps.indexOf(p.phase) : 0;
    const mismatches = result ? Object.entries(result.collections || {}).filter(([, c]) => c.expected !== undefined && c.countAfter !== undefined && c.countAfter !== c.expected) : [];
    const safetyId = result?.safetyBackupFileId || restoreInfo?.safetyBackupFileId;

    const title = done
        ? mode === 'test'
            ? 'امتحان تمام شد — داده‌ها در یک کپی جدا آماده‌اند'
            : mode === 'missing'
              ? 'تمام شد — داده‌های پاک‌شده برگشت'
              : `تمام شد — دیتابیس به ${formatDateShort(backupAt(row))} برگشت`
        : failed
          ? 'بازگردانی کامل نشد'
          : 'در حال بازگردانی…';

    return (
        <div className={styles.dialog}>
            <div className={styles.dialogHead}>
                <h2>{title}</h2>
                <p>{jobLabel('restore', mode, backupAt(row))}</p>
            </div>
            <div className={styles.dialogBody}>
                {!done && !failed && (
                    <>
                        <ol className={styles.steps}>
                            {steps.map((s, i) => {
                                const isDone = i < current;
                                const active = i === current;
                                return (
                                    <li key={s} className={`${styles.step} ${active ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}>
                                        {isDone ? <LuCircleCheck /> : active ? <LuLoaderCircle className={styles.spin} /> : <LuCircle />}
                                        {STEP_TEXT[s]}
                                        {active && p && p.total > 0 && (s === 'restore' || s === 'safety') && ` — ${toFarsiNumber(p.done)} از ${toFarsiNumber(p.total)} مجموعه`}
                                    </li>
                                );
                            })}
                        </ol>
                        <p className={styles.hint}>می‌توانید این پنجره را ببندید؛ پیشرفت بالای صفحه هم دیده می‌شود.</p>
                    </>
                )}

                {done && result && (
                    <>
                        <p className={styles.lead}>{toFarsiNumber(result.summary)}</p>
                        {mismatches.length > 0 && (
                            <>
                                <button type="button" className={`${styles.disclosureBtn} ${details ? styles.disclosureOpen : ''}`} onClick={() => setDetails((v) => !v)}>
                                    دیدن مجموعه‌هایی که تعدادشان فرق دارد <LuChevronDown aria-hidden />
                                </button>
                                {details && (
                                    <table className={styles.miniTable}>
                                        <thead>
                                            <tr>
                                                <th>مجموعه</th>
                                                <th>در بک‌آپ</th>
                                                <th>بعد از بازگردانی</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mismatches.map(([name, c]) => (
                                                <tr key={name}>
                                                    <td>{name}</td>
                                                    <td>{formatCount(c.expected)}</td>
                                                    <td>{formatCount(c.countAfter)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </>
                        )}
                        {mode === 'test' && (
                            <p className={`${styles.lineNote} ${styles.lineNoteBrand}`}>
                                داده‌های برگشته را در صفحهٔ «داده‌ها» ببینید؛ اگر درست بود، همین بک‌آپ را واقعی برگردانید.
                            </p>
                        )}
                    </>
                )}

                {failed && (
                    <>
                        <p className={styles.lead} title={log?.failedReason}>
                            {explainFailure(log?.failedReason)}
                        </p>
                        <p className={`${styles.lineNote} ${restoreInfo?.liveTouched ? styles.lineNoteWarn : styles.lineNoteOk}`}>
                            {mode === 'test' || !restoreInfo?.liveTouched
                                ? 'هیچ تغییری در دیتابیس اصلی داده نشد.'
                                : 'بخشی از داده‌ها ممکن است تغییر کرده باشد؛ وضعیت قبل از شروع ذخیره شده و با «برگرداندن به قبل» برمی‌گردد.'}
                        </p>
                    </>
                )}

                {(p?.lines?.length || failed) && (
                    <>
                        <button type="button" className={`${styles.disclosureBtn} ${tech ? styles.disclosureOpen : ''}`} onClick={() => setTech((v) => !v)}>
                            جزئیات فنی <LuChevronDown aria-hidden />
                        </button>
                        {tech && <pre className={styles.techLog}>{[failed ? log?.failedReason : '', ...(p?.lines || [])].filter(Boolean).join('\n')}</pre>}
                    </>
                )}
            </div>
            <div className={styles.dialogFoot}>
                {done && mode === 'test' && (
                    <>
                        <button type="button" className={styles.primaryBtn} onClick={() => onAgain('replace')}>
                            بازگردانی واقعی همین بک‌آپ
                        </button>
                        <Link className={styles.secondaryBtn} href={`/settings/database?test=1${job?.db && job.db !== 'core' ? `&db=${job.db}` : ''}`} onClick={onClose}>
                            دیدن داده‌های تست
                        </Link>
                    </>
                )}
                {(done || failed) && mode !== 'test' && safetyId && (done || restoreInfo?.liveTouched) && (
                    <button
                        type="button"
                        className={failed ? styles.primaryBtn : styles.secondaryBtn}
                        onClick={() => {
                            requestUndo({ safetyBackupFileId: safetyId, db: job?.db || 'core', at: log?.updatedAt });
                            onClose();
                        }}
                    >
                        برگرداندن به قبل
                    </button>
                )}
                <button type="button" className={`${styles.secondaryBtn} ${styles.footEnd}`} onClick={onClose}>
                    بستن
                </button>
            </div>
        </div>
    );
}

function Content({ req, onClose }: { req: RestoreRequest; onClose: () => void }) {
    const [started, setStarted] = useState<{ jobId: string; row: BackupRow; mode: RestoreMode } | null>(null);
    const [again, setAgain] = useState<RestoreRequest | null>(null);
    if (started) {
        return (
            <Running
                row={started.row}
                mode={started.mode}
                onAgain={(mode) => {
                    setAgain({ row: started.row, mode });
                    setStarted(null);
                }}
                onClose={onClose}
            />
        );
    }
    return <Choose key={again ? 'again' : 'first'} req={again || req} onStarted={(jobId, row, mode) => setStarted({ jobId, row, mode })} onClose={onClose} />;
}

/** One dialog for every restore: from a row, from the header (latest / older / downloaded file) and «بازگردانی واقعی» after a test. */
export default function RestoreDialog() {
    const { restoreRequest, closeRestore } = useDatabase();
    return (
        <ModalHelper
            open={!!restoreRequest}
            onClose={closeRestore}
            size="md"
            sheetTitle="بازگردانی"
            closeOnOverlayClick={false}
            component={restoreRequest ? <Content req={restoreRequest} onClose={closeRestore} /> : null}
        />
    );
}
