'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { ModalHelper, Pagination } from '@my-workspace/components';
import parentStyles from '../../marketing/Marketing.module.scss';
import hrStyles from '../../management/hr/Hr.module.scss';
import styles from './StorageSettings.module.scss';
import { formatBytes } from './storage-format';
import {
    getTransferCandidates,
    rollbackFileTransfer,
    startTransfer,
    type StorageSettingsView,
    type TransferCandidatesPage,
} from './storage-api';

const KINDS = [
    { value: '', label: 'همه نوع‌ها' },
    { value: 'images', label: 'تصویر' },
    { value: 'videos', label: 'ویدیو' },
    { value: 'audios', label: 'صوت' },
];

interface Props {
    view: StorageSettingsView;
    baseUrl: string;
    token: string;
    onJobStarted: () => void;
}

type Confirm = { mode: 'selected'; count: number } | { mode: 'all'; count: number; bytes: number } | null;

/**
 * انتقال امن فایل‌های قدیمی از یک استوریج بک‌آپ به استوریج فعال — تک‌به‌تک (انتخاب) یا همه.
 * کپی تأییدشده، بدون حذف از مبدأ، با امکان بازگرداندن آدرس هر فایل.
 */
export default function StorageTransferPanel({ view, baseUrl, token, onJobStarted }: Props) {
    const fallbacks = view.runtime.fallbacks;
    const [sourceId, setSourceId] = useState(fallbacks[0]?.id || '');
    const [kind, setKind] = useState('');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [data, setData] = useState<TransferCandidatesPage | null>(null);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirm, setConfirm] = useState<Confirm>(null);
    const [starting, setStarting] = useState(false);
    const [rollbackId, setRollbackId] = useState('');

    useEffect(() => {
        if (!fallbacks.some((item) => item.id === sourceId)) setSourceId(fallbacks[0]?.id || '');
    }, [fallbacks, sourceId]);

    const load = useCallback(async () => {
        if (!token || !sourceId) return;
        try {
            setLoading(true);
            setData(await getTransferCandidates(baseUrl, token, { sourceId, kind, search: query, page, limit }));
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setLoading(false);
        }
    }, [baseUrl, token, sourceId, kind, query, page, limit]);

    useEffect(() => {
        void load();
    }, [load]);

    if (!fallbacks.length) {
        return (
            <div className={parentStyles.formCard}>
                <h3 className={parentStyles.formSectionTitle}>انتقال فایل‌ها به استوریج فعال</h3>
                <p className={hrStyles.fieldHint}>استوریج پشتیبانی وجود ندارد؛ همهٔ فایل‌ها روی استوریج فعال‌اند.</p>
            </div>
        );
    }

    const rows = data?.rows || [];
    const allOnPage = rows.length > 0 && rows.every((row) => selected.has(row._id));
    const toggle = (id: string) => setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
    const togglePage = () => setSelected((current) => {
        const next = new Set(current);
        rows.forEach((row) => (allOnPage ? next.delete(row._id) : next.add(row._id)));
        return next;
    });

    const run = async () => {
        if (!confirm) return;
        try {
            setStarting(true);
            await startTransfer(baseUrl, token, {
                sourceId,
                kind: kind || undefined,
                ...(confirm.mode === 'selected' ? { fileIds: [...selected] } : {}),
            });
            SuccessToaster({ message: 'انتقال شروع شد — پیشرفت را در «کارهای استوریج» ببینید' });
            setSelected(new Set());
            setConfirm(null);
            onJobStarted();
        } catch (error) {
            ErrorToaster(error);
        } finally {
            setStarting(false);
        }
    };

    const rollback = async () => {
        if (!rollbackId.trim()) return;
        try {
            const result = await rollbackFileTransfer(baseUrl, token, rollbackId.trim());
            SuccessToaster({ message: `آدرس فایل برگشت: ${result.path}` });
            setRollbackId('');
            void load();
        } catch (error) {
            ErrorToaster(error);
        }
    };

    return (
        <div className={parentStyles.formCard}>
            <h3 className={parentStyles.formSectionTitle}>انتقال فایل‌ها به استوریج فعال</h3>
            <p className={hrStyles.fieldHint}>
                <strong>به چه درد می‌خورد؟</strong> فایل‌های قدیمی را از استوریج بک‌آپ به استوریج فعال (مثلاً پارس‌پک) کپی می‌کند تا
                دیگر به استوریج قبلی وابسته نباشند. هر فایل بعد از کپی با حجم و چک‌سام و خواندن عمومی تأیید می‌شود و فقط بعد از
                تأیید، آدرس رکوردش عوض می‌شود. از مبدأ هیچ‌چیز پاک نمی‌شود.
            </p>
            <p className={hrStyles.fieldHint}>
                <strong>چطور استفاده کنم؟</strong> اول چند فایل را انتخاب و منتقل کنید و نتیجه را ببینید؛ بعد «انتقال همه». کار
                قابل مکث و ادامه است و اگر سرور ری‌استارت شود از همان‌جا ادامه می‌دهد.
            </p>

            <div className={styles.toolbar}>
                <label>
                    <span>مبدأ</span>
                    <select value={sourceId} onChange={(event) => { setSourceId(event.target.value); setPage(1); setSelected(new Set()); }}>
                        {fallbacks.map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>نوع</span>
                    <select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); setSelected(new Set()); }}>
                        {KINDS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>
                </label>
                <label className={styles.toolbarGrow}>
                    <span>جستجو</span>
                    <input
                        value={search}
                        placeholder="نام فایل یا کلید"
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') { setQuery(search.trim()); setPage(1); }
                        }}
                        onBlur={() => { if (search.trim() !== query) { setQuery(search.trim()); setPage(1); } }}
                    />
                </label>
                <span className={styles.toolbarCount}>
                    {(data?.totalItems || 0).toLocaleString('fa-IR')} فایل · <span dir="ltr">{formatBytes(data?.totalBytes || 0)}</span>
                </span>
            </div>

            <div className={`${styles.fallbackTable} ${loading && data ? styles.tableLoading : ''}`}>
                <table>
                    <thead>
                        <tr>
                            <th><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="انتخاب همهٔ این صفحه" /></th>
                            <th>فایل</th>
                            <th>نوع</th>
                            <th>حجم</th>
                            <th>آدرس فعلی</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!rows.length && (
                            <tr>
                                <td colSpan={5} className={styles.mutedCell}>
                                    {loading ? 'در حال بارگذاری…' : query || kind ? 'با این فیلتر فایلی نیست.' : 'فایلی روی این استوریج نمانده است.'}
                                </td>
                            </tr>
                        )}
                        {rows.map((row) => (
                            <tr key={row._id}>
                                <td data-label="انتخاب">
                                    <input type="checkbox" checked={selected.has(row._id)} onChange={() => toggle(row._id)} aria-label="انتخاب فایل" />
                                </td>
                                <td data-label="فایل">
                                    <span className={styles.ltrText}>{row.originalname || row.name || row.key}</span>
                                    {row.isThumbnail && <span className={hrStyles.fieldHint}> (تامبنیل)</span>}
                                </td>
                                <td data-label="نوع" dir="ltr">{row.mimetype || '—'}</td>
                                <td data-label="حجم" dir="ltr">{formatBytes(row.size || 0)}</td>
                                <td data-label="آدرس فعلی" className={styles.urlCell} title={row.path}>
                                    <a href={row.path} target="_blank" rel="noreferrer" dir="ltr">{row.path}</a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {(data?.totalItems || 0) > limit && (
                <div className={styles.paginationRow}>
                    <Pagination
                        rtl
                        itemPerPage={limit}
                        currentPage={page}
                        totalItems={data?.totalItems || 0}
                        setRowsPerPage={(value) => { setLimit(value); setPage(1); }}
                        paginate={setPage}
                        rowsPerPageOptions={[20, 50, 100]}
                    />
                </div>
            )}

            <div className={parentStyles.formActions}>
                <button
                    type="button"
                    className={parentStyles.primaryBtn}
                    disabled={!selected.size}
                    onClick={() => setConfirm({ mode: 'selected', count: selected.size })}
                >
                    انتقال انتخاب‌شده‌ها ({selected.size.toLocaleString('fa-IR')})
                </button>
                <button
                    type="button"
                    className={parentStyles.secondaryBtn}
                    disabled={!data?.totalItems}
                    onClick={() => setConfirm({ mode: 'all', count: data?.totalItems || 0, bytes: data?.totalBytes || 0 })}
                >
                    انتقال همه ({(data?.totalItems || 0).toLocaleString('fa-IR')})
                </button>
            </div>

            <h3 className={`${parentStyles.formSectionTitle} ${styles.sectionGap}`}>بازگرداندن آدرس یک فایل</h3>
            <div className={parentStyles.field}>
                <label htmlFor="storage-rollback">شناسهٔ فایل</label>
                <input id="storage-rollback" dir="ltr" value={rollbackId} placeholder="6ace6a5d…" onChange={(event) => setRollbackId(event.target.value)} />
                <p className={hrStyles.fieldHint}>
                    رکورد را به آدرس قبل از آخرین انتقال برمی‌گرداند (هر دو کپی سر جایشان می‌مانند). برای وقتی است که فایلی بعد از انتقال
                    درست نمایش داده نمی‌شود.
                </p>
            </div>
            <div className={styles.inlineActions}>
                <button type="button" className={parentStyles.secondaryBtn} disabled={!rollbackId.trim()} onClick={() => void rollback()}>
                    بازگرداندن آدرس
                </button>
            </div>

            <ModalHelper
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                size="md"
                sheetTitle="تأیید انتقال"
                component={confirm ? (
                    <div className={styles.confirmBody}>
                        <h3>{confirm.mode === 'all' ? 'انتقال همهٔ فایل‌ها؟' : 'انتقال فایل‌های انتخاب‌شده؟'}</h3>
                        <p>
                            {confirm.count.toLocaleString('fa-IR')} فایل
                            {confirm.mode === 'all' && <> (<span dir="ltr">{formatBytes(confirm.bytes)}</span>)</>}
                            {' '}از <span dir="ltr" className={styles.ltrText}>{fallbacks.find((item) => item.id === sourceId)?.label}</span> به
                            {' '}استوریج فعال کپی می‌شود (تامبنیل‌های هر فایل هم همراهش).
                        </p>
                        <ul>
                            <li>از مبدأ چیزی حذف نمی‌شود؛ هر وقت لازم شد آدرس هر فایل قابل برگشت است.</li>
                            <li>فایلی که با محتوای متفاوت در مقصد باشد بازنویسی نمی‌شود و در خطاها می‌آید.</li>
                            <li>لینک‌هایی که قبلاً در چت‌ها/پروژه‌ها ذخیره شده‌اند همان آدرس قبلی را دارند و تا وقتی استوریج قبلی روشن است باز می‌شوند.</li>
                        </ul>
                        <div className={parentStyles.formActions}>
                            <button type="button" className={parentStyles.primaryBtn} disabled={starting} onClick={() => void run()}>
                                {starting ? 'در حال شروع…' : 'شروع انتقال'}
                            </button>
                            <button type="button" className={parentStyles.secondaryBtn} onClick={() => setConfirm(null)}>انصراف</button>
                        </div>
                    </div>
                ) : null}
            />
        </div>
    );
}
