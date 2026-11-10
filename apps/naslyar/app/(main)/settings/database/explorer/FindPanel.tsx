'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuChevronDown, LuHistory, LuLightbulb, LuSave, LuSearch, LuX } from 'react-icons/lu';
import { toFarsiNumber } from '@my-workspace/utils';
import { explorerQuery, type ExplorerTargetQuery, type QueryResult } from '../lib/database-api';
import { findTemplates, type SchemaField } from './suggestions';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import ResultsView from './ResultsView';
import SuggestionsDialog, { type SuggestionGroup } from './SuggestionsDialog';
import styles from './Explorer.module.scss';
import db from '../Database.module.scss';

export interface FindPreset {
    filter: string;
    sort?: string;
    projection?: string;
    nonce: number;
}

interface SavedQuery {
    name: string;
    collection: string;
    filter: string;
    sort: string;
    projection: string;
}

type Query = { filter: string; sort: string; projection: string };
type Box = 'filter' | 'sort' | 'projection';

const DEFAULT_SORT = '{ _id: -1 }';
const DEFAULT_LIMIT = 25;
const BOX_LABEL: Record<Box, string> = { filter: 'فیلتر', sort: 'مرتب‌سازی', projection: 'فیلدهای خروجی' };
const isEmptyObj = (s: string) => !s.trim() || /^\{\s*\}$/.test(s.trim());

function readLs<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function writeLs(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // private window / blocked storage — history is only a convenience
    }
}

export default function FindPanel({
    baseUrl,
    token,
    target,
    collection,
    fields,
    preset,
    refreshKey,
    onOpen,
    onFilterId,
    onDelete,
    onCreateIndex,
}: {
    baseUrl: string;
    token: string;
    target: ExplorerTargetQuery;
    collection: string;
    fields: SchemaField[];
    preset: FindPreset | null;
    refreshKey: number;
    onOpen: (doc: any) => void;
    onFilterId: (doc: any) => void;
    onDelete: (doc: any) => void;
    onCreateIndex: (spec: string) => void;
}) {
    const [filter, setFilter] = useState('{}');
    const [projection, setProjection] = useState('');
    const [sort, setSort] = useState(DEFAULT_SORT);
    const [limit, setLimit] = useState(DEFAULT_LIMIT);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [naming, setNaming] = useState<string | null>(null);
    const [suggestOpen, setSuggestOpen] = useState(false);
    const [box, setBox] = useState<Box>('filter');
    const filterRef = useRef<CodeEditorHandle>(null);
    const projRef = useRef<CodeEditorHandle>(null);
    const sortRef = useRef<CodeEditorHandle>(null);
    // paging and refresh repeat the query that produced the results, not unsent edits in the boxes
    const lastQuery = useRef<Query>({ filter: '{}', sort: DEFAULT_SORT, projection: '' });

    const historyKey = `dbx:history:${baseUrl}:${target.db}:${collection}`;
    const savedKey = `dbx:saved:${baseUrl}`;
    const [history, setHistory] = useState<Query[]>([]);
    const [saved, setSaved] = useState<SavedQuery[]>([]);

    useEffect(() => {
        setHistory(readLs(historyKey, []));
        setSaved(readLs<SavedQuery[]>(savedKey, []).filter((q) => q.collection === collection));
    }, [historyKey, savedKey, collection]);

    const run = useCallback(
        async (skip = 0, q?: Query, pageSize = limit) => {
            const query = q || { filter, sort, projection };
            lastQuery.current = query;
            try {
                setLoading(true);
                setError('');
                setLimit(pageSize);
                const res = await explorerQuery(baseUrl, token, target, { collection, op: 'find', ...query, skip, limit: pageSize });
                setResult(res);
                if (skip === 0) {
                    const next = [query, ...readLs<Query[]>(historyKey, []).filter((h) => JSON.stringify(h) !== JSON.stringify(query))].slice(0, 15);
                    writeLs(historyKey, next);
                    setHistory(next);
                }
            } catch (e: any) {
                setError(e?.response?.data?.message || e?.message || 'جستجو اجرا نشد');
            } finally {
                setLoading(false);
            }
        },
        [baseUrl, token, target, collection, filter, sort, projection, limit, historyKey],
    );

    // new collection → newest documents right away
    useEffect(() => {
        setFilter('{}');
        setProjection('');
        setSort(DEFAULT_SORT);
        setResult(null);
        void run(0, { filter: '{}', sort: DEFAULT_SORT, projection: '' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collection, target.db, target.test]);

    useEffect(() => {
        if (!preset) return;
        setFilter(preset.filter);
        if (preset.sort !== undefined) setSort(preset.sort);
        if (preset.projection !== undefined) setProjection(preset.projection);
        void run(0, { filter: preset.filter, sort: preset.sort ?? sort, projection: preset.projection ?? projection });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset?.nonce]);

    useEffect(() => {
        if (refreshKey && result) void run(result.skip, lastQuery.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    const templates = useMemo(() => findTemplates(fields), [fields]);
    const filterActive = !isEmptyObj(filter);
    const optionsChanged = sort.trim() !== DEFAULT_SORT || !!projection.trim();

    const insertField = (path: string) => {
        const f = fields.find((x) => x.path === path);
        if (!f) return;
        const key = /^[A-Za-z_$][\w$]*$/.test(path) ? path : JSON.stringify(path);
        const type = f.types[0];
        if (box === 'projection') return projRef.current?.insert(`${key}: 1, `);
        if (box === 'sort') return sortRef.current?.insert(`${key}: -1`);
        const sample =
            type === 'objectId'
                ? 'ObjectId("")'
                : type === 'date'
                  ? `ISODate("${new Date().toISOString().slice(0, 10)}")`
                  : type === 'bool'
                    ? 'true'
                    : type === 'int' || type === 'double' || type === 'long'
                      ? '0'
                      : '""';
        // a fresh filter box: replace «{}» instead of producing «{}key: …»
        if (isEmptyObj(filter)) {
            setFilter(`{ ${key}: ${sample} }`);
            setTimeout(() => filterRef.current?.focus(), 0);
        } else filterRef.current?.insert(`, ${key}: ${sample}`);
    };

    const clearFilter = () => {
        setFilter('{}');
        void run(0, { filter: '{}', sort, projection });
    };

    const saveQuery = () => {
        const name = naming;
        setNaming(null);
        if (!name?.trim()) return;
        const all = readLs<SavedQuery[]>(savedKey, []).filter((q) => !(q.collection === collection && q.name === name.trim()));
        const next = [{ name: name.trim(), collection, filter, sort, projection }, ...all].slice(0, 100);
        writeLs(savedKey, next);
        setSaved(next.filter((q) => q.collection === collection));
    };

    const groups: SuggestionGroup[] = [
        {
            title: 'پیشنهادهای این مجموعه',
            lead: 'از روی فیلدهای همین مجموعه ساخته شده‌اند. آن‌هایی که «نیاز به مقدار» دارند در کادر فیلتر می‌نشینند تا جای خالی را پر کنید و «جستجو» بزنید.',
            items: templates.map((t) => {
                const needsInput = t.filter.includes('("")') || t.filter.includes('/متن/');
                return {
                    key: t.label,
                    label: t.label,
                    hint: t.hint,
                    code: t.sort ? `${t.filter}  ·  sort ${t.sort}` : t.filter,
                    needsInput,
                    onPick: () => {
                        setFilter(t.filter);
                        if (t.sort !== undefined) setSort(t.sort);
                        if (!needsInput) void run(0, { filter: t.filter, sort: t.sort ?? sort, projection });
                        else setTimeout(() => filterRef.current?.focus(), 0);
                    },
                };
            }),
        },
        {
            title: 'کوئری‌های ذخیره‌شدهٔ شما',
            lead: 'با «ذخیره» در کادر جستجو ساخته می‌شوند و فقط در همین مرورگر می‌مانند.',
            items: saved.map((q) => ({
                key: `s-${q.name}`,
                label: q.name,
                hint: 'کوئری ذخیره‌شده',
                code: q.sort ? `${q.filter}  ·  sort ${q.sort}` : q.filter,
                onPick: () => {
                    setFilter(q.filter);
                    setSort(q.sort);
                    setProjection(q.projection);
                    void run(0, q);
                },
            })),
        },
    ];

    return (
        <div>
            <section className={styles.search} aria-label="جستجو در سندها">
                <div className={styles.searchHead}>
                    <div className={styles.searchHeadText}>
                        <h3 className={styles.panelTitle}>
                            جستجو در <bdi className={styles.mono}>{collection}</bdi>
                        </h3>
                        <p className={styles.panelLead}>بنویسید کدام سندها را می‌خواهید و «جستجو» بزنید. اگر مطمئن نیستید از «پیشنهادها» شروع کنید.</p>
                    </div>
                    <button type="button" className={`${db.secondaryBtn} ${styles.suggestBtn}`} onClick={() => setSuggestOpen(true)}>
                        <LuLightbulb /> پیشنهادها ({toFarsiNumber(templates.length + saved.length)})
                    </button>
                </div>

                <label htmlFor="dbx-filter" className={`${styles.boxTitle} ${styles.filterTitle}`}>
                    <b>فیلتر</b> — کدام سندها؟ <span className={styles.muted}>خالی یعنی همه</span>
                </label>
                <div className={styles.filterRow}>
                    <div className={styles.filterField}>
                        <CodeEditor
                            id="dbx-filter"
                            ref={filterRef}
                            value={filter}
                            onChange={setFilter}
                            onRun={() => run(0)}
                            rows={2}
                            placeholder='{ status: "active" }'
                            onFocus={() => setBox('filter')}
                            ariaLabel="فیلتر"
                        />
                    </div>
                    <div className={styles.filterActions}>
                        <button type="button" className={`${db.primaryBtn} ${styles.searchBtn}`} onClick={() => run(0)} disabled={loading}>
                            <LuSearch /> {loading ? 'در حال جستجو…' : 'جستجو'}
                        </button>
                        {filterActive && (
                            <button type="button" className={`${db.secondaryBtn} ${styles.searchBtn}`} onClick={clearFilter} disabled={loading}>
                                <LuX /> پاک کردن فیلتر
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.toolRow}>
                    {fields.length > 0 && (
                        <select
                            className={`${db.select} ${styles.fieldPick}`}
                            value=""
                            onChange={(e) => insertField(e.target.value)}
                            aria-label={`افزودن فیلد به ${BOX_LABEL[box]}`}
                        >
                            <option value="">+ افزودن فیلد به {BOX_LABEL[box]}</option>
                            {fields.map((f) => (
                                <option key={f.path} value={f.path}>
                                    {f.path} ({f.types[0]})
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        className={`${styles.toolBtn} ${optionsOpen ? styles.toolBtnOn : ''}`}
                        onClick={() => setOptionsOpen((o) => !o)}
                        aria-expanded={optionsOpen}
                    >
                        مرتب‌سازی و فیلدها{optionsChanged ? ' •' : ''} <LuChevronDown className={optionsOpen ? styles.rotate : ''} />
                    </button>
                    {history.length > 0 && (
                        <button type="button" className={`${styles.toolBtn} ${showHistory ? styles.toolBtnOn : ''}`} onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}>
                            <LuHistory /> تاریخچه ({toFarsiNumber(history.length)})
                        </button>
                    )}
                    <button type="button" className={styles.toolBtn} onClick={() => setNaming((n) => (n === null ? '' : null))}>
                        <LuSave /> ذخیره
                    </button>
                    <span className={styles.kbdHint}>
                        <span className={styles.kbd}>Ctrl + Enter</span> جستجو
                    </span>
                </div>

                {optionsOpen && (
                    <div className={styles.optionsGrid}>
                        <label className={styles.editorBox}>
                            <span className={styles.boxTitle}>
                                <b>مرتب‌سازی</b> <span className={styles.muted}>۱ = صعودی، ۱- = نزولی</span>
                            </span>
                            <CodeEditor ref={sortRef} value={sort} onChange={setSort} onRun={() => run(0)} rows={1} placeholder={DEFAULT_SORT} onFocus={() => setBox('sort')} ariaLabel="مرتب‌سازی" />
                        </label>
                        <label className={styles.editorBox}>
                            <span className={styles.boxTitle}>
                                <b>فیلدهای خروجی</b> <span className={styles.muted}>خالی = همهٔ فیلدها</span>
                            </span>
                            <CodeEditor
                                ref={projRef}
                                value={projection}
                                onChange={setProjection}
                                onRun={() => run(0)}
                                rows={1}
                                placeholder="{ title: 1, status: 1 }"
                                onFocus={() => setBox('projection')}
                                ariaLabel="فیلدهای خروجی"
                            />
                        </label>
                    </div>
                )}

                {naming !== null && (
                    <div className={styles.saveRow}>
                        <input
                            className={styles.input}
                            autoFocus
                            value={naming}
                            placeholder="نام کوئری، مثلاً کاربران تأییدنشده"
                            onChange={(e) => setNaming(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveQuery();
                                if (e.key === 'Escape') setNaming(null);
                            }}
                        />
                        <button type="button" className={db.secondaryBtn} onClick={saveQuery} disabled={!naming.trim()}>
                            ذخیره
                        </button>
                    </div>
                )}

                {showHistory && (
                    <div className={styles.historyList}>
                        {history.map((h, i) => (
                            <button
                                key={i}
                                type="button"
                                className={styles.historyItem}
                                onClick={() => {
                                    setFilter(h.filter);
                                    setSort(h.sort);
                                    setProjection(h.projection);
                                    setShowHistory(false);
                                    void run(0, h);
                                }}
                            >
                                <span>{h.filter.replace(/\s+/g, ' ')}</span>
                                {h.sort && <span className={db.hint}>sort {h.sort.replace(/\s+/g, ' ')}</span>}
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {error && <div className={styles.error}>{error}</div>}
            {result && (
                <div className={loading ? db.tableLoading : ''}>
                    <ResultsView
                        result={result}
                        collection={collection}
                        onOpen={onOpen}
                        onFilterId={onFilterId}
                        onDelete={onDelete}
                        onCreateIndex={onCreateIndex}
                        onPage={(skip, pageSize) => run(skip, lastQuery.current, pageSize)}
                        onRefresh={() => run(result.skip, lastQuery.current)}
                    />
                </div>
            )}

            <SuggestionsDialog
                open={suggestOpen}
                onClose={() => setSuggestOpen(false)}
                title="کوئری‌های آماده"
                lead={`برای مجموعهٔ ${collection}؛ روی هر مورد بزنید تا در کادر فیلتر بنشیند.`}
                groups={groups}
            />
        </div>
    );
}
