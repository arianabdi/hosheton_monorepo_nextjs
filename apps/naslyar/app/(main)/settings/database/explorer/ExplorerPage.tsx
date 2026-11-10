'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LuPanelRight } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import { useDatabase } from '../lib/DatabaseProvider';
import {
    explorerCollection,
    explorerCollections,
    explorerDeleteDocument,
    type CollectionDetails,
    type CollectionSummary,
    type DbTarget,
} from '../lib/database-api';
import { formatSize } from '../lib/format';
import { toShell } from './ejson';
import CollectionList from './CollectionList';
import FindPanel, { type FindPreset } from './FindPanel';
import AggregatePanel from './AggregatePanel';
import WritePanel from './WritePanel';
import IndexesPanel from './IndexesPanel';
import DocumentDialog from './DocumentDialog';
import styles from './Explorer.module.scss';
import db from '../Database.module.scss';

const TABS = [
    { id: 'find', label: 'سندها و جستجو' },
    { id: 'aggregate', label: 'گزارش (Aggregate)' },
    { id: 'write', label: 'تغییر داده' },
    { id: 'indexes', label: 'ایندکس‌ها و ساختار' },
];

/** Browse, query and edit any collection of the app's databases — state lives in the URL (?c=, ?tab=, ?db=, ?test=). */
export default function ExplorerPage() {
    const { baseUrl, token, overview } = useDatabase();
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();

    const databases = (overview?.databases || []).filter((d) => d.available);
    const dbId = (params.get('db') as DbTarget) || databases[0]?.id || 'core';
    const test = params.get('test') === '1';
    const collection = params.get('c') || '';
    const tab = params.get('tab') || 'find';
    const target = useMemo(() => ({ db: dbId, test }), [dbId, test]);

    const [list, setList] = useState<{ database: string; collections: CollectionSummary[]; stats: any } | null>(null);
    const [listError, setListError] = useState('');
    const [details, setDetails] = useState<CollectionDetails | null>(null);
    const [doc, setDoc] = useState<any | null>(null);
    const [deleteDoc, setDeleteDoc] = useState<any | null>(null);
    const [preset, setPreset] = useState<FindPreset | null>(null);
    const [indexKeys, setIndexKeys] = useState<string | undefined>();
    const [refreshKey, setRefreshKey] = useState(0);
    const [sideOpen, setSideOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const setParams = useCallback(
        (patch: Record<string, string | null>) => {
            const next = new URLSearchParams(params.toString());
            for (const [k, v] of Object.entries(patch)) {
                if (v === null || v === '') next.delete(k);
                else next.set(k, v);
            }
            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        },
        [params, pathname, router],
    );

    const loadList = useCallback(async () => {
        if (!token || !baseUrl || !overview) return;
        try {
            setListError('');
            setList(await explorerCollections(baseUrl, token, target));
        } catch (e: any) {
            setList(null);
            setListError(e?.response?.data?.message || e?.message || 'فهرست مجموعه‌ها نیامد');
        }
    }, [baseUrl, token, target, overview]);

    useEffect(() => {
        void loadList();
    }, [loadList]);

    // first visit: open the largest collection so the page is never empty
    useEffect(() => {
        if (!collection && list?.collections.length) {
            const first = [...list.collections].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
            setParams({ c: first.name });
        }
    }, [collection, list, setParams]);

    const loadDetails = useCallback(async () => {
        if (!collection || !token) return;
        try {
            setDetails(await explorerCollection(baseUrl, token, target, collection));
        } catch {
            setDetails(null);
        }
    }, [baseUrl, token, target, collection]);

    useEffect(() => {
        setDetails(null);
        void loadDetails();
    }, [loadDetails]);

    if (!overview) return <LoadingState />;

    const summary = list?.collections.find((c) => c.name === collection);
    const fields = details?.schema.fields || [];
    const exists = !!summary;

    const removeDoc = async () => {
        if (!deleteDoc) return;
        try {
            setBusy(true);
            const res = await explorerDeleteDocument(baseUrl, token, target, collection, toShell(deleteDoc._id));
            if (!res?.deleted) {
                ErrorToaster({ message: 'سندی با این _id پیدا نشد؛ شاید قبلاً حذف شده باشد.' });
                setDeleteDoc(null);
                setRefreshKey((k) => k + 1);
                return;
            }
            SuccessToaster({ message: 'سند حذف شد' });
            setDeleteDoc(null);
            setDoc(null);
            setRefreshKey((k) => k + 1);
            void loadList();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles.layout}>
            <CollectionList
                collections={list?.collections || []}
                active={collection}
                onSelect={(c) => setParams({ c })}
                database={list?.database || ''}
                stats={list?.stats || null}
                open={sideOpen}
                onClose={() => setSideOpen(false)}
            />

            <div className={styles.main}>
                <div className={styles.topBar}>
                    <button type="button" className={`${db.secondaryBtn} ${styles.menuBtn}`} onClick={() => setSideOpen(true)}>
                        <LuPanelRight /> مجموعه‌ها
                    </button>
                    <span className={styles.colTitle} dir="ltr">
                        {collection || '—'}
                    </span>
                    {summary && (
                        <span className={styles.stats} title={`میانگین هر سند ${formatSize(summary.avgObjSize || 0)} · ${toFarsiNumber(summary.indexes ?? 0)} ایندکس (${formatSize(summary.indexSize || 0)})`}>
                            <span>
                                <b>{toFarsiNumber((summary.count ?? 0).toLocaleString('en-US'))}</b> سند
                            </span>
                            <span>{formatSize(summary.size || 0)}</span>
                        </span>
                    )}
                    <span className={styles.dbPick}>
                        {databases.length > 1 && (
                            <select className={db.select} value={dbId} onChange={(e) => setParams({ db: e.target.value, c: null })} aria-label="دیتابیس">
                                {databases.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.label}
                                    </option>
                                ))}
                            </select>
                        )}
                        <select
                            className={db.select}
                            value={test ? 'test' : 'live'}
                            onChange={(e) => setParams({ test: e.target.value === 'test' ? '1' : null, c: null })}
                            aria-label="منبع داده"
                        >
                            <option value="live">داده‌های اصلی</option>
                            <option value="test">کپی آزمایشی بازگردانی</option>
                        </select>
                    </span>
                </div>

                {test && (
                    <div className={`${db.lineNote} ${db.lineNoteWarn}`}>
                        <span>
                            این‌ها داده‌های <b>کپی آزمایشی</b> هستند{list?.database ? <> (<code>{list.database}</code>)</> : null}، نه داده‌های اصلی سایت. تغییر در
                            این‌جا روی سایت اثری ندارد.
                        </span>
                        <span className={db.lineNoteActions}>
                            <button type="button" className={db.linkBtn} onClick={() => setParams({ test: null, c: null })}>
                                برگشت به داده‌های اصلی
                            </button>
                        </span>
                    </div>
                )}

                {listError ? (
                    <div className={styles.empty}>
                        {test ? 'هنوز کپی آزمایشی‌ای نیست. در «بازگردانی» ← «تنظیمات بیشتر» روش «امتحان در یک کپی جدا» را بزنید.' : listError}
                    </div>
                ) : !list ? (
                    <LoadingState />
                ) : !list.collections.length ? (
                    <div className={styles.empty}>
                        {test ? 'کپی آزمایشی خالی است یا وجود ندارد. در «بازگردانی» ← «تنظیمات بیشتر» روش «امتحان در یک کپی جدا» را بزنید.' : 'این دیتابیس هنوز مجموعه‌ای ندارد.'}
                    </div>
                ) : !collection || !exists ? (
                    <div className={styles.empty}>یک مجموعه را از فهرست انتخاب کنید.</div>
                ) : (
                    <>
                        <SimpleLineTabs tabs={TABS} activeTab={tab} onChange={(id) => setParams({ tab: id === 'find' ? null : id })} />
                        <div className={db.outlet}>
                            {tab === 'find' && (
                                <FindPanel
                                    baseUrl={baseUrl}
                                    token={token}
                                    target={target}
                                    collection={collection}
                                    fields={fields}
                                    preset={preset}
                                    refreshKey={refreshKey}
                                    onOpen={setDoc}
                                    onFilterId={(d) => setPreset({ filter: `{ _id: ${toShell(d._id)} }`, nonce: Date.now() })}
                                    onDelete={setDeleteDoc}
                                    onCreateIndex={(spec) => {
                                        setIndexKeys(spec);
                                        setParams({ tab: 'indexes' });
                                    }}
                                />
                            )}
                            {tab === 'aggregate' && (
                                <AggregatePanel baseUrl={baseUrl} token={token} target={target} collection={collection} fields={fields} onOpen={setDoc} />
                            )}
                            {tab === 'write' && (
                                <WritePanel
                                    baseUrl={baseUrl}
                                    token={token}
                                    target={target}
                                    collection={collection}
                                    database={list.database}
                                    onDone={() => {
                                        setRefreshKey((k) => k + 1);
                                        void loadList();
                                    }}
                                />
                            )}
                            {tab === 'indexes' && (
                                <IndexesPanel
                                    key={`${collection}:${indexKeys || ''}`}
                                    baseUrl={baseUrl}
                                    token={token}
                                    target={target}
                                    collection={collection}
                                    details={details}
                                    initialKeys={indexKeys}
                                    onChanged={() => {
                                        void loadDetails();
                                        void loadList();
                                    }}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            <DocumentDialog
                doc={doc}
                collection={collection}
                target={target}
                baseUrl={baseUrl}
                token={token}
                onSaved={(d) => {
                    setDoc(d);
                    setRefreshKey((k) => k + 1);
                }}
                onDelete={(d) => setDeleteDoc(d)}
                onClose={() => setDoc(null)}
            />

            <ConfirmDialog
                open={!!deleteDoc}
                title="حذف سند"
                tone="danger"
                confirmLabel="حذف"
                busy={busy}
                onClose={() => setDeleteDoc(null)}
                onConfirm={removeDoc}
            >
                سند <code dir="ltr">{deleteDoc ? toShell(deleteDoc._id) : ''}</code> از <code dir="ltr">{collection}</code> برای همیشه حذف
                می‌شود (فقط با بازگردانی بک‌آپ برمی‌گردد).
            </ConfirmDialog>
        </div>
    );
}
