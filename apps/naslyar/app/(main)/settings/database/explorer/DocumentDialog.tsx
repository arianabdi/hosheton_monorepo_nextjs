'use client';

import { useEffect, useState } from 'react';
import { ModalHelper } from '@my-workspace/components';
import { SuccessToaster } from '@my-workspace/utils';
import { explorerQuery, explorerSaveDocument, type ExplorerTargetQuery } from '../lib/database-api';
import { toShell, typeOf } from './ejson';
import CodeEditor from './CodeEditor';
import styles from './Explorer.module.scss';
import db from '../Database.module.scss';

/**
 * A result row is not always the stored document: «فیلدهای خروجی» (projection) drops fields and a
 * report (aggregate) builds new rows. Saving such a row would replace the real document with the
 * partial one, so the dialog always reads the stored document by `_id` first and only that one is
 * editable / deletable. A row without a stored document stays read-only.
 */
type Stored = { state: 'loading' } | { state: 'found'; doc: any } | { state: 'none' };

function Content({
    doc,
    collection,
    target,
    baseUrl,
    token,
    onSaved,
    onDelete,
    onClose,
}: {
    doc: any;
    collection: string;
    target: ExplorerTargetQuery;
    baseUrl: string;
    token: string;
    onSaved: (doc: any) => void;
    onDelete?: (doc: any) => void;
    onClose: () => void;
}) {
    const hasId = doc._id !== undefined;
    const [stored, setStored] = useState<Stored>(hasId ? { state: 'loading' } : { state: 'none' });
    const shown = stored.state === 'found' ? stored.doc : doc;
    const original = toShell(shown);
    const [text, setText] = useState(original);
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const canEdit = stored.state === 'found';
    const rowIsPartial = stored.state === 'found' && Object.keys(stored.doc).length !== Object.keys(doc).length;

    useEffect(() => {
        if (!hasId) return;
        let alive = true;
        explorerQuery(baseUrl, token, target, { collection, op: 'find', filter: `{ _id: ${toShell(doc._id)} }`, limit: 1 })
            .then((res) => {
                if (!alive) return;
                const found = res.docs[0];
                setStored(found ? { state: 'found', doc: found } : { state: 'none' });
                if (found) setText(toShell(found));
            })
            .catch(() => alive && setStored({ state: 'none' }));
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const save = async () => {
        try {
            setBusy(true);
            setError('');
            const res = await explorerSaveDocument(baseUrl, token, target, collection, text);
            SuccessToaster({ message: res.modified ? 'سند ذخیره شد' : 'تغییری نبود' });
            setStored({ state: 'found', doc: res.doc });
            setText(toShell(res.doc));
            onSaved(res.doc);
            setEditing(false);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'ذخیره ناموفق بود');
        } finally {
            setBusy(false);
        }
    };

    const created = typeOf(shown._id) === 'objectId' ? new Date(parseInt(shown._id.$oid.slice(0, 8), 16) * 1000) : null;

    return (
        <div className={db.dialog}>
            <div className={db.dialogHead}>
                <h2>{editing ? 'ویرایش سند' : 'سند'}</h2>
                <p>
                    <span dir="ltr">{collection}</span> · {Object.keys(shown).length.toLocaleString('fa-IR')} فیلد
                    {created && <> · ساخته‌شده {created.toLocaleString('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'medium', timeStyle: 'short' })}</>}
                </p>
            </div>
            <div className={db.dialogBody}>
                {error && <div className={styles.error}>{error}</div>}
                {stored.state === 'none' && (
                    <p className={`${db.lineNote} ${db.lineNoteWarn}`}>
                        {hasId ? 'این ردیف خروجی گزارش است و سندی با این _id ذخیره نشده؛ فقط دیدنی است.' : 'این ردیف _id ندارد (خروجی گزارش)؛ فقط دیدنی است.'}
                    </p>
                )}
                {rowIsPartial && !editing && (
                    <p className={`${db.lineNote} ${db.lineNoteBrand}`}>سند کامل از دیتابیس خوانده شد (ردیف جدول فقط بعضی فیلدها را نشان می‌داد).</p>
                )}
                {editing ? (
                    <>
                        <p className={db.hint}>
                            نوع‌ها را همان‌طور نگه دارید: <code dir="ltr">ObjectId("…")</code>، <code dir="ltr">ISODate("…")</code>، عدد صحیح ={' '}
                            <code dir="ltr">5</code>، اعشاری = <code dir="ltr">Double(5)</code> یا <code dir="ltr">5.5</code>،{' '}
                            <code dir="ltr">NumberLong("…")</code>. سند با همین _id کامل جایگزین می‌شود.
                        </p>
                        <CodeEditor value={text} onChange={setText} onRun={save} rows={22} className={styles.docEditor} ariaLabel="متن سند" />
                    </>
                ) : (
                    <pre className={`${styles.jsonDoc} ${styles.docView}`}>{original}</pre>
                )}
            </div>
            <div className={db.dialogFoot}>
                {editing ? (
                    <>
                        <button type="button" className={db.primaryBtn} onClick={save} disabled={busy || text === original}>
                            {busy ? 'در حال ذخیره…' : 'ذخیره'}
                        </button>
                        <button
                            type="button"
                            className={db.secondaryBtn}
                            onClick={() => {
                                setText(original);
                                setEditing(false);
                                setError('');
                            }}
                            disabled={busy}
                        >
                            انصراف از ویرایش
                        </button>
                    </>
                ) : (
                    <>
                        {hasId && (
                            <button type="button" className={db.primaryBtn} onClick={() => setEditing(true)} disabled={!canEdit} title={canEdit ? undefined : 'فقط سند ذخیره‌شده ویرایش می‌شود'}>
                                {stored.state === 'loading' ? 'در حال خواندن سند…' : 'ویرایش'}
                            </button>
                        )}
                        <button
                            type="button"
                            className={db.secondaryBtn}
                            onClick={async () => {
                                await navigator.clipboard?.writeText(original).catch(() => undefined);
                                SuccessToaster({ message: 'کپی شد' });
                            }}
                        >
                            کپی
                        </button>
                        {canEdit && onDelete && (
                            <button type="button" className={`${db.secondaryBtn} ${db.footEnd}`} onClick={() => onDelete(stored.doc)}>
                                حذف سند…
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function DocumentDialog(props: {
    doc: any | null;
    collection: string;
    target: ExplorerTargetQuery;
    baseUrl: string;
    token: string;
    onSaved: (doc: any) => void;
    onDelete?: (doc: any) => void;
    onClose: () => void;
}) {
    const { doc, onClose } = props;
    return (
        <ModalHelper
            open={!!doc}
            onClose={onClose}
            size="lg"
            sheetTitle="سند"
            closeOnOverlayClick={false}
            component={doc ? <Content key={JSON.stringify(doc._id ?? null)} {...props} doc={doc} /> : null}
        />
    );
}
