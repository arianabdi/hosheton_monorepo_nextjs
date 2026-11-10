'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LuBraces, LuRefreshCw, LuTable } from 'react-icons/lu';
import { SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { Pagination } from '@my-workspace/components';
import HrRowActionMenu, { type HrRowActionMenuItem } from '@/app/(main)/management/hr/components/HrRowActionMenu';
import type { QueryResult } from '../lib/database-api';
import { toShell, typeOf } from './ejson';
import DocTree, { TypedValue } from './DocTree';
import styles from './Explorer.module.scss';
import db from '../Database.module.scss';

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : toFarsiNumber(n.toLocaleString('en-US')));
const VIEW_KEY = 'dbx:view';
const PAGE_SIZES = [10, 25, 50, 100];
const MAX_COLUMNS = 40;

/** Compass type names for the table header */
export const TYPE_LABEL: Record<string, string> = {
    objectId: 'ObjectId',
    string: 'String',
    int: 'Int32',
    long: 'Int64',
    double: 'Double',
    decimal: 'Decimal128',
    bool: 'Boolean',
    date: 'Date',
    array: 'Array',
    object: 'Object',
    null: 'Null',
    regex: 'RegExp',
    timestamp: 'Timestamp',
    uuid: 'UUID',
    binData: 'Binary',
};

function readView(): 'json' | 'table' {
    try {
        return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'json';
    } catch {
        return 'json';
    }
}

export default function ResultsView({
    result,
    collection,
    onOpen,
    onFilterId,
    onDelete,
    onCreateIndex,
    onPage,
    onRefresh,
    editable = true,
}: {
    result: QueryResult;
    collection: string;
    onOpen: (doc: any) => void;
    onFilterId?: (doc: any) => void;
    onDelete?: (doc: any) => void;
    onCreateIndex?: (spec: string) => void;
    /** server paging (find): ask for another page; without it the result is paged in the browser (aggregate, distinct) */
    onPage?: (skip: number, limit: number) => void;
    onRefresh?: () => void;
    editable?: boolean;
}) {
    const [view, setView] = useState<'table' | 'json'>('json');
    useEffect(() => setView(readView()), []);
    const switchView = (v: 'table' | 'json') => {
        setView(v);
        try {
            localStorage.setItem(VIEW_KEY, v);
        } catch {
            // a remembered view is only a convenience
        }
    };

    // browser paging for results that come in one piece
    const [localPage, setLocalPage] = useState(1);
    const [localLimit, setLocalLimit] = useState(25);
    useEffect(() => setLocalPage(1), [result]);

    // Pagination calls setRowsPerPage and then paginate(1): keep the new size until paginate asks for the page
    const nextLimit = useRef(result.limit);
    useEffect(() => {
        nextLimit.current = result.limit;
    }, [result.limit]);

    const server = !!onPage && result.op === 'find';
    const allDocs = result.docs;
    const docs = server ? allDocs : allDocs.slice((localPage - 1) * localLimit, localPage * localLimit);
    const offset = server ? result.skip : (localPage - 1) * localLimit;
    // countDocuments can time out (total null): still allow «next» while pages come back full
    const totalItems = server ? (result.total ?? result.skip + allDocs.length + (allDocs.length === result.limit ? 1 : 0)) : allDocs.length;

    const columns = useMemo(() => {
        const seen = new Map<string, { order: number; types: Map<string, number> }>();
        for (const d of docs) {
            Object.keys(d).forEach((k, i) => {
                const entry = seen.get(k) || { order: i, types: new Map() };
                entry.order = Math.min(entry.order, i);
                const t = typeOf(d[k]);
                entry.types.set(t, (entry.types.get(t) || 0) + 1);
                seen.set(k, entry);
            });
        }
        return [...seen.entries()]
            .sort((a, b) => (a[0] === '_id' ? -1 : b[0] === '_id' ? 1 : a[1].order - b[1].order))
            .slice(0, MAX_COLUMNS)
            .map(([name, e]) => ({ name, type: [...e.types.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'null' }));
    }, [docs]);

    const copy = async (text: string) => {
        await navigator.clipboard?.writeText(text).catch(() => undefined);
        SuccessToaster({ message: 'کپی شد' });
    };

    const rowActions = (d: any): HrRowActionMenuItem[] => [
        { label: 'مشاهده و ویرایش', onClick: () => onOpen(d) },
        ...(d._id !== undefined ? [{ label: 'کپی _id', onClick: () => copy(toShell(d._id)) }] : []),
        ...(d._id !== undefined && onFilterId ? [{ label: 'فیلتر روی همین سند', onClick: () => onFilterId(d) }] : []),
        ...(d._id !== undefined && onDelete ? [{ label: 'حذف سند', danger: true, onClick: () => onDelete(d) }] : []),
    ];
    const readOnlyActions = (d: any): HrRowActionMenuItem[] => [
        { label: 'مشاهدهٔ کامل', onClick: () => onOpen(d) },
        { label: 'کپی', onClick: () => copy(toShell(d)) },
    ];

    const plan = result.plan;
    // index advice only matters when the query really did work: a scan of a few hundred documents is fine
    const examined = plan?.docsExamined ?? 0;
    const slow = !!plan && (examined > 2000 || result.durationMs > 150) && (plan.collscan || plan.inMemorySort || examined > (result.total ?? allDocs.length) * 4);

    return (
        <div className={styles.results}>
            <div className={styles.resultBar}>
                {result.op === 'count' ? (
                    <span>
                        تعداد: <b>{fmt(result.total)}</b> سند
                    </span>
                ) : (
                    <span>
                        {allDocs.length ? (
                            <>
                                <b>{fmt(totalItems)}</b> سند{result.total === null && server ? ' (یا بیشتر)' : ''}
                            </>
                        ) : (
                            'نتیجه‌ای نیست'
                        )}
                    </span>
                )}
                <span className={styles.muted}>{fmt(result.durationMs)} میلی‌ثانیه</span>
                {plan && slow && (
                    <span className={plan.collscan || plan.inMemorySort ? styles.planWarn : styles.planOk} title={plan.stages.join(' → ')}>
                        کند: {plan.collscan ? 'بدون ایندکس' : `ایندکس ${plan.indexes.join('، ') || '—'}`}
                        {plan.inMemorySort ? ' · مرتب‌سازی در حافظه' : ''} · {fmt(plan.docsExamined)} سند بررسی شد
                    </span>
                )}
                <span className={styles.resultTools}>
                    {onRefresh && (
                        <button type="button" className={styles.iconBtn} onClick={onRefresh} title="تازه‌سازی" aria-label="تازه‌سازی">
                            <LuRefreshCw />
                        </button>
                    )}
                    {allDocs.length > 0 && result.op !== 'count' && (
                        <span className={styles.viewSwitch} role="group" aria-label="نوع نمایش">
                            <button type="button" className={view === 'json' ? styles.viewOn : ''} onClick={() => switchView('json')} aria-pressed={view === 'json'}>
                                <LuBraces /> JSON
                            </button>
                            <button type="button" className={view === 'table' ? styles.viewOn : ''} onClick={() => switchView('table')} aria-pressed={view === 'table'}>
                                <LuTable /> جدول
                            </button>
                        </span>
                    )}
                </span>
            </div>

            {slow &&
                result.suggestions.map((s) => (
                    <div key={s.spec} className={styles.hintBox}>
                        <span className={styles.hintText}>
                            <b>پیشنهاد سرعت:</b> {toFarsiNumber(s.reason)} ایندکس <code>{s.spec}</code> این کوئری را مستقیم پیدا می‌کند (ترتیب: برابری ← مرتب‌سازی ←
                            بازه).
                        </span>
                        <button type="button" className={db.secondaryBtn} onClick={() => copy(`db.getCollection(${JSON.stringify(collection)}).createIndex(${s.spec})`)}>
                            کپی دستور
                        </button>
                        {onCreateIndex && editable && (
                            <button type="button" className={db.secondaryBtn} onClick={() => onCreateIndex(s.spec)}>
                                ساخت این ایندکس…
                            </button>
                        )}
                    </div>
                ))}

            {result.op === 'count' ? null : !allDocs.length ? (
                <div className={styles.empty}>سندی با این شرط پیدا نشد. فیلتر را ساده‌تر کنید یا «پاک کردن فیلتر» را بزنید.</div>
            ) : view === 'json' ? (
                <div className={styles.jsonList}>
                    {docs.map((d, i) => (
                        <DocTree
                            key={`${offset}-${i}`}
                            doc={d}
                            actions={
                                <HrRowActionMenu
                                    rowId={`j${offset + i}`}
                                    ariaLabel={`عملیات سند ${toFarsiNumber(offset + i + 1)}`}
                                    items={editable ? rowActions(d) : readOnlyActions(d)}
                                />
                            }
                        />
                    ))}
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.rowNum} aria-label="ردیف" />
                                {columns.map((c) => (
                                    <th key={c.name}>
                                        <bdi className={styles.colKey}>{c.name}</bdi> <span className={styles.colType}>{TYPE_LABEL[c.type] || c.type}</span>
                                    </th>
                                ))}
                                <th className={styles.actionCell}>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.map((d, i) => (
                                <tr key={`${offset}-${i}`} onClick={() => onOpen(d)}>
                                    <td className={styles.rowNum}>{toFarsiNumber(offset + i + 1)}</td>
                                    {columns.map((c) => (
                                        <td key={c.name} data-label={c.name} title={c.name in d ? toShell(d[c.name]).slice(0, 400) : 'این سند این فیلد را ندارد'}>
                                            {c.name in d ? (
                                                <bdi>
                                                    <TypedValue v={d[c.name]} />
                                                </bdi>
                                            ) : (
                                                <span className={styles.missing}>بدون فیلد</span>
                                            )}
                                        </td>
                                    ))}
                                    <td className={styles.actionCell} onClick={(e) => e.stopPropagation()}>
                                        <HrRowActionMenu
                                            rowId={`t${offset + i}`}
                                            ariaLabel={`عملیات سند ${toFarsiNumber(offset + i + 1)}`}
                                            items={editable ? rowActions(d) : readOnlyActions(d)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {result.op !== 'count' && totalItems > 0 && (
                <div className={styles.pagerWrap}>
                    {server ? (
                        <Pagination
                            rtl
                            itemPerPage={result.limit}
                            currentPage={Math.floor(result.skip / result.limit) + 1}
                            totalItems={totalItems}
                            setRowsPerPage={(n) => {
                                nextLimit.current = n;
                            }}
                            paginate={(p) => onPage?.((p - 1) * nextLimit.current, nextLimit.current)}
                            rowsPerPageOptions={PAGE_SIZES}
                        />
                    ) : (
                        <Pagination
                            rtl
                            itemPerPage={localLimit}
                            currentPage={localPage}
                            totalItems={totalItems}
                            setRowsPerPage={setLocalLimit}
                            paginate={setLocalPage}
                            rowsPerPageOptions={PAGE_SIZES}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
