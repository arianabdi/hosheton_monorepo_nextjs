'use client';

import { useState } from 'react';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import { useDatabase } from '../lib/DatabaseProvider';
import { explorerWrite, runBackup, type ExplorerTargetQuery, type WriteOp } from '../lib/database-api';
import { toShell } from './ejson';
import CodeEditor from './CodeEditor';
import styles from './Explorer.module.scss';
import db from '../Database.module.scss';

const OPS: Array<{ id: WriteOp; label: string; verb: string; hint: string; placeholder?: string; needsUpdate?: boolean; needsDocs?: boolean }> = [
    { id: 'updateOne', label: 'تغییر یک سند', verb: 'تغییر', hint: 'اولین سندی که با فیلتر جور است', placeholder: '{ $set: { status: "done" } }', needsUpdate: true },
    { id: 'updateMany', label: 'تغییر چند سند', verb: 'تغییر', hint: 'همهٔ سندهایی که با فیلتر جورند', placeholder: '{ $set: { archived: true } }', needsUpdate: true },
    { id: 'replaceOne', label: 'جایگزینی کامل یک سند', verb: 'جایگزینی', hint: 'سند کامل جدید، بدون $', placeholder: '{ title: "…", status: "todo" }', needsUpdate: true },
    { id: 'insertMany', label: 'افزودن سند جدید', verb: 'افزودن', hint: 'یک سند یا آرایه‌ای از سندها؛ _id را ننویسید تا خودکار ساخته شود', placeholder: '{ title: "…", createdAt: ISODate("2026-01-01T00:00:00Z") }', needsDocs: true },
    { id: 'deleteOne', label: 'حذف یک سند', verb: 'حذف', hint: 'اولین سندی که با فیلتر جور است' },
    { id: 'deleteMany', label: 'حذف چند سند', verb: 'حذف', hint: 'همهٔ سندهایی که با فیلتر جورند' },
];

export default function WritePanel({
    baseUrl,
    token,
    target,
    collection,
    database,
    onDone,
}: {
    baseUrl: string;
    token: string;
    target: ExplorerTargetQuery;
    collection: string;
    database: string;
    onDone: () => void;
}) {
    const { trackJob, jobRunning } = useDatabase();
    const [op, setOp] = useState<WriteOp>('updateOne');
    const [filter, setFilter] = useState('');
    const [update, setUpdate] = useState('');
    const [documents, setDocuments] = useState('');
    const [upsert, setUpsert] = useState(false);
    const [matched, setMatched] = useState<number | null>(null);
    const [sample, setSample] = useState<any[]>([]);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [result, setResult] = useState<Record<string, any> | null>(null);
    const [error, setError] = useState('');
    const meta = OPS.find((o) => o.id === op)!;
    const destructive = op === 'deleteMany' || op === 'deleteOne' || op === 'updateMany' || op === 'replaceOne';
    const isDelete = op.startsWith('delete');

    const reset = () => {
        setMatched(null);
        setSample([]);
        setResult(null);
        setError('');
    };

    const body = () => ({ collection, op, filter: filter.trim() || '{}', update, documents, upsert });

    const check = async () => {
        if (!meta.needsDocs && !filter.trim()) return setError('فیلتر را بنویسید؛ مثلاً { _id: ObjectId("…") }. برای همهٔ سندها {} بنویسید.');
        if (meta.needsUpdate && !update.trim()) return setError(op === 'replaceOne' ? 'سند جدید را بنویسید.' : 'تغییر را بنویسید؛ مثلاً { $set: { status: "done" } }');
        if (meta.needsDocs && !documents.trim()) return setError('سند جدید را بنویسید.');
        try {
            setBusy(true);
            setError('');
            setResult(null);
            const res = await explorerWrite(baseUrl, token, target, { ...body(), dryRun: true });
            setMatched(op === 'insertMany' ? res.wouldInsert : res.matched);
            setSample(Array.isArray(res.sample) ? res.sample : []);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'بررسی ناموفق بود');
        } finally {
            setBusy(false);
        }
    };

    const execute = async () => {
        try {
            setBusy(true);
            const res = await explorerWrite(baseUrl, token, target, { ...body(), expectedCount: matched });
            setResult(res);
            setConfirming(false);
            setMatched(null);
            setSample([]);
            SuccessToaster({ message: 'انجام شد' });
            onDone();
        } catch (e: any) {
            setConfirming(false);
            setError(e?.response?.data?.message || e?.message || 'اجرا نشد');
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const backupThis = async () => {
        try {
            setBackingUp(true);
            const { jobId } = await runBackup(baseUrl, token, { db: target.db, collections: [collection] });
            trackJob({ jobId, op: 'dump', db: target.db, label: `بک‌آپ‌گیری از ${collection}` });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBackingUp(false);
        }
    };

    const affected = op === 'insertMany' ? matched : op === 'deleteOne' || op === 'updateOne' || op === 'replaceOne' ? Math.min(1, matched ?? 0) : matched;

    return (
        <div>
            <div className={`${db.lineNote} ${target.test ? db.lineNoteBrand : db.lineNoteWarn}`}>
                <span>
                    {target.test ? (
                        <>تغییرها روی کپی آزمایشی اعمال می‌شوند و به داده‌های اصلی کاری ندارند.</>
                    ) : (
                        <>
                            تغییرها مستقیم روی داده‌های اصلی <code dir="ltr">{collection}</code> اعمال و ثبت می‌شوند. اول «بررسی» بزنید تا ببینید کدام سندها درگیرند.
                        </>
                    )}
                </span>
                {!target.test && (
                    <span className={db.lineNoteActions}>
                        <button type="button" className={db.linkBtn} onClick={backupThis} disabled={backingUp || jobRunning}>
                            {backingUp ? 'در حال شروع…' : 'اول از همین مجموعه بک‌آپ بگیر'}
                        </button>
                    </span>
                )}
            </div>

            <div className={styles.panel}>
            <div className={styles.panelHead}>
                <div>
                    <h3 className={styles.panelTitle}>تغییر داده</h3>
                    <p className={styles.panelLead}>نوع کار را انتخاب کنید، سندها را مشخص کنید و اول «بررسی» بزنید تا تعداد و نمونهٔ سندهای درگیر را ببینید.</p>
                </div>
            </div>
            <div className={styles.editorGrid}>
                <label className={styles.editorBox}>
                    <span className={styles.editorLabel}>
                        <b>چه کاری؟</b>
                    </span>
                    <select
                        className={db.select}
                        value={op}
                        onChange={(e) => {
                            setOp(e.target.value as WriteOp);
                            reset();
                        }}
                    >
                        {OPS.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                    <span className={db.hint}>{meta.hint}</span>
                </label>
                {meta.needsUpdate && op !== 'replaceOne' && (
                    <label className={db.checkRow}>
                        <input
                            type="checkbox"
                            checked={upsert}
                            onChange={(e) => {
                                setUpsert(e.target.checked);
                                reset();
                            }}
                        />
                        <span>اگر سندی پیدا نشد، یک سند جدید بساز</span>
                    </label>
                )}
            </div>

            {!meta.needsDocs && (
                <label className={styles.editorBox}>
                    <span className={styles.editorLabel}>
                        <b>کدام سندها؟</b> (فیلتر)
                    </span>
                    <CodeEditor
                        value={filter}
                        onChange={(v) => {
                            setFilter(v);
                            reset();
                        }}
                        onRun={check}
                        rows={2}
                        placeholder='{ _id: ObjectId("…") }'
                        ariaLabel="فیلتر"
                    />
                </label>
            )}
            {meta.needsUpdate && (
                <label className={styles.editorBox}>
                    <span className={styles.editorLabel}>
                        <b>{op === 'replaceOne' ? 'سند جدید' : 'چه تغییری؟'}</b>
                    </span>
                    <CodeEditor
                        value={update}
                        onChange={(v) => {
                            setUpdate(v);
                            reset();
                        }}
                        onRun={check}
                        rows={4}
                        placeholder={meta.placeholder}
                        ariaLabel="تغییر"
                    />
                </label>
            )}
            {meta.needsDocs && (
                <label className={styles.editorBox}>
                    <span className={styles.editorLabel}>
                        <b>سند جدید</b>
                    </span>
                    <CodeEditor
                        value={documents}
                        onChange={(v) => {
                            setDocuments(v);
                            reset();
                        }}
                        onRun={check}
                        rows={8}
                        placeholder={meta.placeholder}
                        ariaLabel="سندها"
                    />
                </label>
            )}

            <div className={styles.runRow}>
                <button type="button" className={db.secondaryBtn} onClick={check} disabled={busy}>
                    {busy && matched === null ? 'در حال بررسی…' : 'بررسی'}
                </button>
                <button
                    type="button"
                    className={destructive ? db.dangerBtn : db.primaryBtn}
                    disabled={busy || matched === null || (!upsert && op !== 'insertMany' && matched === 0)}
                    onClick={() => setConfirming(true)}
                    title={matched === null ? 'اول «بررسی» را بزنید' : undefined}
                >
                    {meta.verb}…
                </button>
                {matched !== null && (
                    <span className={db.hint}>
                        {op === 'insertMany'
                            ? `${toFarsiNumber(matched)} سند اضافه می‌شود.`
                            : matched === 0
                              ? upsert
                                  ? 'سندی پیدا نشد؛ یک سند جدید ساخته می‌شود.'
                                  : 'هیچ سندی با این فیلتر جور نیست.'
                              : `${toFarsiNumber(matched)} سند جور است؛ ${toFarsiNumber(affected ?? 0)} سند ${isDelete ? 'حذف می‌شود' : 'تغییر می‌کند'}.`}
                    </span>
                )}
            </div>
            </div>

            {sample.length > 0 && (
                <div className={styles.jsonList}>
                    <span className={db.hint}>
                        {matched !== null && matched > sample.length ? `${toFarsiNumber(sample.length)} سند اول از ${toFarsiNumber(matched)}:` : 'سندهایی که درگیرند:'}
                    </span>
                    {sample.map((d, i) => (
                        <pre key={i} className={styles.jsonDoc}>
                            {toShell(d)}
                        </pre>
                    ))}
                </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
            {result && (
                <div className={styles.writeResult}>
                    {'inserted' in result && <>{toFarsiNumber(result.inserted)} سند اضافه شد.</>}
                    {'deleted' in result && <>{toFarsiNumber(result.deleted)} سند حذف شد.</>}
                    {'modified' in result && (
                        <>
                            {toFarsiNumber(result.matched)} سند جور بود، {toFarsiNumber(result.modified)} سند تغییر کرد
                            {result.upserted ? ' و یک سند جدید ساخته شد' : ''}.
                        </>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={confirming}
                title={`${meta.label} در ${collection}`}
                tone={destructive ? 'danger' : 'primary'}
                confirmLabel={isDelete ? 'حذف کن' : 'انجام بده'}
                busy={busy}
                onClose={() => setConfirming(false)}
                onConfirm={execute}
            >
                {op === 'insertMany'
                    ? `${toFarsiNumber(matched ?? 0)} سند به ${collection} اضافه می‌شود.`
                    : `${toFarsiNumber(affected ?? 0)} سند از ${collection} ${isDelete ? 'برای همیشه حذف می‌شود' : 'تغییر می‌کند'}.`}{' '}
                {target.test ? 'این کپی آزمایشی است.' : 'از داخل پنل برگشت ندارد؛ فقط با بازگردانی بک‌آپ.'} <span dir="ltr">({database})</span>
            </ConfirmDialog>
        </div>
    );
}
