'use client';

import { useMemo, useState } from 'react';
import { LuGauge, LuListTree, LuPlus } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import { explorerIndex, type CollectionDetails, type ExplorerTargetQuery } from '../lib/database-api';
import { toShell } from './ejson';
import { TYPE_LABEL } from './ResultsView';
import CodeEditor from './CodeEditor';
import { Bidi } from './SuggestionsDialog';
import styles from './Explorer.module.scss';
import db from '../Database.module.scss';

type View = 'indexes' | 'schema';
type FieldFilter = 'all' | 'mixed' | 'optional' | 'indexed';

const DIRECTION: Record<string, string> = { '1': 'صعودی', '-1': 'نزولی', text: 'متنی', hashed: 'hashed', '2dsphere': 'جغرافیایی' };
const pct = (p: number) => `${toFarsiNumber(Math.round(p * 100))}٪`;
const keyText = (v: unknown) => (typeof v === 'object' && v && '$numberInt' in (v as any) ? (v as any).$numberInt : String(v));

/** «what does this index speed up» in one short line */
function indexPurpose(ix: any): string {
    if (ix.name === '_id_') return 'پیش‌فرض MongoDB — پیدا کردن سند با _id؛ حذف‌شدنی نیست.';
    const fields = Object.keys(ix.key || {});
    const parts = [`جستجو و مرتب‌سازی روی ${fields.join(' + ')}`];
    if (ix.unique) parts.push('و جلوی مقدار تکراری را می‌گیرد');
    if (ix.expireAfterSeconds !== undefined) parts.push('و سندها را بعد از مدت مشخص خودکار پاک می‌کند');
    return `${parts.join(' ')}.`;
}

export default function IndexesPanel({
    baseUrl,
    token,
    target,
    collection,
    details,
    initialKeys,
    onChanged,
}: {
    baseUrl: string;
    token: string;
    target: ExplorerTargetQuery;
    collection: string;
    details: CollectionDetails | null;
    /** filled from a query's index suggestion */
    initialKeys?: string;
    onChanged: () => void;
}) {
    const [view, setView] = useState<View>('indexes');
    const [keys, setKeys] = useState(initialKeys || '');
    const [unique, setUnique] = useState(false);
    const [confirmCreate, setConfirmCreate] = useState(false);
    const [dropName, setDropName] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [fieldQuery, setFieldQuery] = useState('');
    const [fieldFilter, setFieldFilter] = useState<FieldFilter>('all');

    const act = async (fn: () => Promise<unknown>, msg: string) => {
        try {
            setBusy(true);
            await fn();
            SuccessToaster({ message: msg });
            onChanged();
            setKeys('');
            setUnique(false);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
            setConfirmCreate(false);
            setDropName(null);
        }
    };

    const indexes = details?.indexes || [];
    const fields = details?.schema.fields || [];
    const indexedFields = useMemo(() => new Set(indexes.flatMap((ix: any) => Object.keys(ix.key || {}))), [indexes]);

    const mixedCount = fields.filter((f) => f.types.length > 1).length;
    const optionalCount = fields.filter((f) => f.presence < 0.95).length;
    const shownFields = fields.filter((f) => {
        if (fieldQuery.trim() && !f.path.toLowerCase().includes(fieldQuery.trim().toLowerCase())) return false;
        if (fieldFilter === 'mixed') return f.types.length > 1;
        if (fieldFilter === 'optional') return f.presence < 0.95;
        if (fieldFilter === 'indexed') return indexedFields.has(f.path);
        return true;
    });

    const addKey = (path: string, dir: string) => {
        const k = /^[A-Za-z_$][\w$.]*$/.test(path) && !path.includes('.') ? path : JSON.stringify(path);
        const inner = keys.trim().replace(/^\{\s*|\s*\}$/g, '');
        setKeys(inner ? `{ ${inner}, ${k}: ${dir} }` : `{ ${k}: ${dir} }`);
    };
    const [pickField, setPickField] = useState('');
    const [pickDir, setPickDir] = useState('1');
    const keysReady = !!keys.trim() && !/^\{\s*\}$/.test(keys.trim());

    return (
        <div>
            <SimpleLineTabs
                tabs={[
                    { id: 'indexes', label: `ایندکس‌ها (${toFarsiNumber(indexes.length)})` },
                    { id: 'schema', label: `ساختار فیلدها (${toFarsiNumber(fields.length)})` },
                ]}
                activeTab={view}
                onChange={(id) => setView(id as View)}
            />

            {view === 'indexes' ? (
                <>
                    <div className={styles.panel}>
                        <div className={styles.panelHead}>
                            <div className={styles.explainHead}>
                                <span className={styles.explainIcon} aria-hidden>
                                    <LuGauge />
                                </span>
                                <div>
                                    <h3 className={styles.panelTitle}>ایندکس — تا جستجو سریع بماند</h3>
                                    <p className={styles.panelLead}>
                                        ایندکس مثل فهرست آخر کتاب است: بدون آن MongoDB برای هر جستجو همهٔ سندهای <bdi className={styles.mono}>{collection}</bdi> را
                                        می‌خواند. هر ایندکس اضافه هم جا می‌گیرد و نوشتن را کمی کند می‌کند، پس فقط برای جستجوهای پرتکرار بسازید.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <ul className={styles.whenList}>
                            <li>
                                <b>جستجو کند است؟</b> در «سندها و جستجو» اگر پیام «کند: بدون ایندکس» آمد، دکمهٔ «ساخت این ایندکس…» همین فرم را پر می‌کند.
                            </li>
                            <li>
                                <b>مقدار باید یکتا باشد؟</b> مثلاً ایمیل یا موبایل کاربر — ایندکس را با گزینهٔ «یکتا» بسازید.
                            </li>
                        </ul>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ایندکس</th>
                                    <th>فیلدها</th>
                                    <th>به چه کار می‌آید</th>
                                    <th className={styles.actionCell}>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {indexes.map((ix: any) => (
                                    <tr key={ix.name} className={styles.staticRow}>
                                        <td data-label="ایندکس">
                                            <bdi className={styles.colKey}>{ix.name}</bdi>
                                            <div className={styles.badgeRow}>
                                                {ix.name === '_id_' && <span className={styles.badge}>پیش‌فرض</span>}
                                                {ix.unique && <span className={`${styles.badge} ${styles.badgeBrand}`}>یکتا</span>}
                                                {ix.expireAfterSeconds !== undefined && (
                                                    <span className={styles.badge} title="سندها بعد از این مدت خودکار پاک می‌شوند">
                                                        حذف خودکار · {toFarsiNumber(keyText(ix.expireAfterSeconds))} ثانیه
                                                    </span>
                                                )}
                                                {ix.partialFilterExpression && (
                                                    <span className={styles.badge} title={toShell(ix.partialFilterExpression)}>
                                                        فقط بخشی از سندها
                                                    </span>
                                                )}
                                                {ix.sparse && <span className={styles.badge}>فقط سندهای دارای فیلد</span>}
                                            </div>
                                        </td>
                                        <td data-label="فیلدها">
                                            <div className={styles.badgeRow}>
                                                {Object.entries(ix.key || {}).map(([k, v]) => (
                                                    <span key={k} className={styles.keyChip}>
                                                        <bdi className={styles.mono}>{k}</bdi>
                                                        <small>{DIRECTION[keyText(v)] || keyText(v)}</small>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td data-label="به چه کار می‌آید" className={styles.wrapCell}>
                                            <Bidi text={indexPurpose(ix)} />
                                        </td>
                                        <td className={styles.actionCell}>
                                            {ix.name !== '_id_' && (
                                                <HrRowActionMenu
                                                    rowId={ix.name}
                                                    ariaLabel={`عملیات ${ix.name}`}
                                                    items={[{ label: 'حذف ایندکس', danger: true, onClick: () => setDropName(ix.name) }]}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <section className={styles.search}>
                        <h3 className={styles.panelTitle}>
                            <LuPlus /> ساخت ایندکس جدید
                        </h3>
                        <p className={styles.panelLead}>
                            فیلدی را که در جستجو یا مرتب‌سازی استفاده می‌کنید اضافه کنید. برای چند فیلد ترتیب مهم است: اول فیلدهای «برابر» (مثل status)،
                            بعد فیلد مرتب‌سازی، آخر فیلدهای بازه (مثل تاریخ از… تا…).
                        </p>

                        <div className={styles.keyBuilder}>
                            <select className={`${db.select} ${styles.fieldPick}`} value={pickField} onChange={(e) => setPickField(e.target.value)} aria-label="فیلد">
                                <option value="">انتخاب فیلد…</option>
                                {fields
                                    .filter((f) => f.path !== '_id')
                                    .map((f) => (
                                        <option key={f.path} value={f.path}>
                                            {f.path}
                                        </option>
                                    ))}
                            </select>
                            <select className={db.select} value={pickDir} onChange={(e) => setPickDir(e.target.value)} aria-label="جهت">
                                <option value="1">صعودی (۱)</option>
                                <option value="-1">نزولی (۱-)</option>
                            </select>
                            <button
                                type="button"
                                className={styles.toolBtn}
                                disabled={!pickField}
                                onClick={() => {
                                    addKey(pickField, pickDir);
                                    setPickField('');
                                }}
                            >
                                <LuPlus /> افزودن به ایندکس
                            </button>
                        </div>

                        <label className={`${styles.boxTitle} ${styles.filterTitle}`} htmlFor="dbx-index-keys">
                            <b>فیلدهای ایندکس</b> <span className={styles.muted}>— با فهرست بالا پر می‌شود؛ می‌توانید مستقیم هم بنویسید</span>
                        </label>
                        <CodeEditor id="dbx-index-keys" value={keys} onChange={setKeys} rows={2} placeholder="{ status: 1, createdAt: -1 }" ariaLabel="کلیدهای ایندکس" />

                        <label className={`${db.checkRow} ${styles.uniqueRow}`}>
                            <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} />
                            <span>
                                <b>یکتا</b> — دو سند با مقدار یکسان مجاز نباشد. اگر همین الان مقدار تکراری هست، ساخت خطا می‌دهد.
                            </span>
                        </label>

                        <div className={styles.createRow}>
                            <button type="button" className={db.primaryBtn} disabled={busy || !keysReady} onClick={() => setConfirmCreate(true)}>
                                ساخت ایندکس…
                            </button>
                            <span className={db.hint}>روی مجموعهٔ بزرگ ممکن است چند دقیقه طول بکشد؛ در این مدت سایت کار می‌کند.</span>
                        </div>
                    </section>
                </>
            ) : (
                <>
                    <div className={styles.panel}>
                        <div className={styles.explainHead}>
                            <span className={styles.explainIcon} aria-hidden>
                                <LuListTree />
                            </span>
                            <div>
                                <h3 className={styles.panelTitle}>ساختار فیلدها — داده‌ها یکدست‌اند؟</h3>
                                <p className={styles.panelLead}>
                                    از {toFarsiNumber(details?.schema.sampled || 0)} سند نمونه: هر فیلد چه نوعی دارد و در چند درصد سندها هست. فیلدی که «چند نوع» دارد
                                    یعنی بعضی سندها با بقیه فرق دارند و ممکن است جستجو یا کد اپ روی آن‌ها درست کار نکند.
                                </p>
                            </div>
                        </div>
                        <div className={styles.summaryRow}>
                            <button type="button" className={`${styles.summaryItem} ${fieldFilter === 'all' ? styles.summaryOn : ''}`} onClick={() => setFieldFilter('all')}>
                                <b>{toFarsiNumber(fields.length)}</b> فیلد
                            </button>
                            <button
                                type="button"
                                className={`${styles.summaryItem} ${mixedCount ? styles.summaryWarn : ''} ${fieldFilter === 'mixed' ? styles.summaryOn : ''}`}
                                onClick={() => setFieldFilter('mixed')}
                            >
                                <b>{toFarsiNumber(mixedCount)}</b> با چند نوع
                            </button>
                            <button type="button" className={`${styles.summaryItem} ${fieldFilter === 'optional' ? styles.summaryOn : ''}`} onClick={() => setFieldFilter('optional')}>
                                <b>{toFarsiNumber(optionalCount)}</b> در همهٔ سندها نیست
                            </button>
                            <button type="button" className={`${styles.summaryItem} ${fieldFilter === 'indexed' ? styles.summaryOn : ''}`} onClick={() => setFieldFilter('indexed')}>
                                <b>{toFarsiNumber(fields.filter((f) => indexedFields.has(f.path)).length)}</b> ایندکس‌دار
                            </button>
                            <input
                                className={`${styles.input} ${styles.fieldSearch}`}
                                value={fieldQuery}
                                onChange={(e) => setFieldQuery(e.target.value)}
                                placeholder="جستجوی نام فیلد…"
                                aria-label="جستجوی نام فیلد"
                            />
                        </div>
                    </div>

                    {shownFields.length === 0 ? (
                        <div className={styles.empty}>فیلدی با این فیلتر نیست.</div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>فیلد</th>
                                        <th>نوع</th>
                                        <th title="در چند درصد سندهای نمونه این فیلد هست">حضور در سندها</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownFields.map((f) => {
                                        const depth = f.path.split('.').length - 1;
                                        const mixed = f.types.length > 1;
                                        return (
                                            <tr key={f.path} className={styles.staticRow}>
                                                <td data-label="فیلد">
                                                    <span className={styles.fieldName} style={{ paddingInlineStart: `${depth * 14}px` }}>
                                                        <bdi className={styles.colKey}>{depth ? f.path.split('.').pop() : f.path}</bdi>
                                                        {depth > 0 && <bdi className={styles.colType}>{f.path}</bdi>}
                                                    </span>
                                                    {indexedFields.has(f.path) && <span className={`${styles.badge} ${styles.badgeBrand}`}>ایندکس</span>}
                                                </td>
                                                <td data-label="نوع">
                                                    <div className={styles.badgeRow}>
                                                        {f.types.map((t) => (
                                                            <span key={t} className={`${styles.badge} ${mixed ? styles.badgeWarn : ''}`}>
                                                                {TYPE_LABEL[t] || t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {mixed && <div className={styles.warnNote}>چند نوع — سندها یکدست نیستند</div>}
                                                </td>
                                                <td data-label="حضور در سندها">
                                                    <span className={styles.presence}>
                                                        <i style={{ width: `${Math.round(f.presence * 100)}%` }} />
                                                    </span>
                                                    <span className={styles.muted}>{pct(f.presence)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            <ConfirmDialog
                open={confirmCreate}
                title="ساخت ایندکس"
                confirmLabel="بساز"
                busy={busy}
                onClose={() => setConfirmCreate(false)}
                onConfirm={() => act(() => explorerIndex(baseUrl, token, target, { collection, action: 'create', keys, unique }), 'ایندکس ساخته شد')}
            >
                ایندکس <code dir="ltr">{keys}</code>
                {unique ? ' (یکتا)' : ''} روی <code dir="ltr">{collection}</code> ساخته می‌شود.
            </ConfirmDialog>

            <ConfirmDialog
                open={!!dropName}
                title="حذف ایندکس"
                tone="danger"
                confirmLabel="حذف ایندکس"
                busy={busy}
                onClose={() => setDropName(null)}
                onConfirm={() => act(() => explorerIndex(baseUrl, token, target, { collection, action: 'drop', name: dropName || '' }), 'ایندکس حذف شد')}
            >
                ایندکس <code dir="ltr">{dropName}</code> حذف می‌شود؛ جستجوهایی که از آن استفاده می‌کردند کند می‌شوند.
            </ConfirmDialog>
        </div>
    );
}
