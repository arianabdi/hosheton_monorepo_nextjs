'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {LuPlus, LuRefreshCw, LuSend, LuUpload} from 'react-icons/lu';
import styles from '../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import {filkoshApi, FilkoshMtProxyNode, FilkoshMtProxyPool, FilkoshMtProxyOverview} from '../lib/filkosh-api';
import {MT_PROXY_NODE_STATUS_LABEL, MT_PROXY_NODE_STATUS_TONE} from '../lib/labels';
import ModuleGuide from '../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../components/guides';
import FilterBar from '../components/FilterBar';
import {useClientPaging} from '../components/useClientPaging';
import {useLoadOnMount} from '../components/useLoadOnMount';

const EMPTY_FILTERS = {q: '', status: '', poolId: ''};

function badgeClass(tone: string) {
    if (tone === 'success') return styles.badgeSuccess;
    if (tone === 'danger') return styles.badgeDanger;
    if (tone === 'warning') return styles.badgeWarning;
    if (tone === 'info') return styles.badgeInfo;
    return styles.badgeMuted;
}

/** toFarsiNumber برای 0 رشته خالی برمی‌گرداند — اینجا صفر باید دیده شود */
function fa(value: string | number) {
    return toFarsiNumber(String(value ?? 0));
}

export default function FilkoshMtProxyPage() {
    const router = useRouter();
    const [nodes, setNodes] = useState<FilkoshMtProxyNode[]>([]);
    const [pools, setPools] = useState<FilkoshMtProxyPool[]>([]);
    const [overview, setOverview] = useState<FilkoshMtProxyOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [importOpen, setImportOpen] = useState(false);
    const [importPoolId, setImportPoolId] = useState('');
    const [importText, setImportText] = useState('');
    const [importProvision, setImportProvision] = useState(false);
    const [importing, setImporting] = useState(false);
    const [provisioningAll, setProvisioningAll] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [n, p, o] = await Promise.all([
                filkoshApi.listMtProxyNodes(),
                filkoshApi.listMtProxyPools(),
                filkoshApi.mtProxyOverview(),
            ]);
            setNodes(n);
            setPools(p);
            setOverview(o);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const filtered = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        return nodes.filter((n) => {
            if (filters.status && n.status !== filters.status) return false;
            if (filters.poolId) {
                const poolKey = typeof n.poolId === 'object' ? (n.poolId as {_id: string})._id : n.poolId;
                if (poolKey !== filters.poolId) return false;
            }
            if (!q) return true;
            return (
                n.name.toLowerCase().includes(q) ||
                n.host.toLowerCase().includes(q) ||
                (n.country || '').toLowerCase().includes(q)
            );
        });
    }, [nodes, filters]);

    const paging = useClientPaging(filtered);

    const changeFilter = (key: string, value: string) => {
        setFilters((prev) => ({...prev, [key]: value}));
        paging.resetPage();
    };
    const resetFilters = () => {
        setFilters(EMPTY_FILTERS);
        paging.resetPage();
    };

    const poolName = (n: FilkoshMtProxyNode) =>
        typeof n.poolId === 'object' && n.poolId ? (n.poolId as {_id: string; name: string}).name : '—';

    const handleCheck = async (node: FilkoshMtProxyNode) => {
        try {
            setBusyId(node._id);
            const result = await filkoshApi.checkMtProxyNode(node._id);
            if (result.ok) {
                SuccessToaster({message: `پاسخ داد — ${fa(result.latencyMs || 0)}ms`});
            } else {
                ErrorToaster(new Error(result.error || 'پاسخ نداد'));
            }
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    const handleProvision = async (node: FilkoshMtProxyNode) => {
        if (!confirm(`نصب/نصب مجدد MTProto proxy روی «${node.name}»؟ پیشرفت نصب به صورت زنده نمایش داده می‌شود.`)) return;
        try {
            setBusyId(node._id);
            await filkoshApi.provisionMtProxyNode(node._id);
            SuccessToaster({message: 'نصب در پس‌زمینه شروع شد — از صفحه نود دنبال کنید'});
            router.push(`/mtproxy/${node._id}`);
        } catch (e) {
            ErrorToaster(e);
            setBusyId(null);
        }
    };

    const handleReplace = async (node: FilkoshMtProxyNode) => {
        if (!confirm(`«${node.name}» بازنشسته و نود جایگزین فعال شود؟`)) return;
        try {
            setBusyId(node._id);
            const result = await filkoshApi.replaceMtProxyNode(node._id);
            if (result.replaced) {
                SuccessToaster({message: 'نود جایگزین فعال شد'});
            } else {
                ErrorToaster(new Error('نود آماده‌ای برای جایگزینی نبود — سرور جدید وارد کنید'));
            }
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (node: FilkoshMtProxyNode) => {
        if (!confirm(`حذف نود «${node.name}»؟ سرویس پروکسی، فایل‌ها و رازها به طور کامل از سرور پاک می‌شود.`)) return;
        try {
            setBusyId(node._id);
            const result = await filkoshApi.deleteMtProxyNode(node._id);
            if (result?.serverCleaned === false) {
                ErrorToaster(new Error('رکورد حذف شد ولی پاک‌سازی سرور کامل نبود — رویدادها را ببینید'));
            } else {
                SuccessToaster({message: 'نود حذف و سرور پاک‌سازی شد'});
            }
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    const handleProvisionPending = async () => {
        if (!confirm('همه نودهای «آماده نصب» نصب شوند؟ (۳ نصب همزمان)')) return;
        try {
            setProvisioningAll(true);
            const result = await filkoshApi.provisionMtProxyPending('');
            SuccessToaster({message: `${fa(result.ok)} موفق، ${fa(result.failed)} ناموفق`});
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setProvisioningAll(false);
        }
    };

    const openImport = () => {
        setImportPoolId(pools[0]?._id || '');
        setImportText('');
        setImportProvision(false);
        setImportOpen(true);
    };

    const submitImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importPoolId) {
            ErrorToaster(new Error('استخر را انتخاب کنید'));
            return;
        }
        try {
            setImporting(true);
            const result = await filkoshApi.mtProxyBulkImport({
                poolId: importPoolId,
                text: importText,
                provisionNow: importProvision,
            });
            setImportOpen(false);
            const errors = result.errors?.length ? ` (${result.errors.length} خطا)` : '';
            SuccessToaster({
                message: `${fa(result.imported)} نود اضافه شد، ${fa(result.skipped)} رد شد${errors}`,
            });
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setImporting(false);
        }
    };

    const kpis = [
        {label: 'استخر فعال', value: overview?.pools ?? 0, icon: <LuSend size={18} />, tone: styles.accentBrand},
        {label: 'نود فعال', value: overview?.nodes?.active ?? 0, icon: <LuSend size={18} />, tone: styles.accentSuccess},
        {label: 'آماده نصب', value: overview?.nodes?.pending ?? 0, icon: <LuUpload size={18} />, tone: styles.accentInfo},
        {label: 'خراب', value: overview?.nodes?.failed ?? 0, icon: <LuSend size={18} />, tone: styles.accentDanger},
        {
            label: 'با کانال اسپانسر',
            value: overview ? `${overview.sponsor.withAdTag}/${overview.sponsor.activeNodes}` : '۰/۰',
            icon: <LuSend size={18} />,
            tone: styles.accentWarning,
        },
    ];

    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>پروکسی تلگرام</h1>
                            <p className={styles.subtitle}>
                                ناوگان MTProto proxy در مقیاس — استخرها، نصب گروهی، خودترمیمی نودهای خراب و اسپانسری.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => load()} disabled={loading}>
                                <LuRefreshCw size={14} />
                                بروزرسانی
                            </button>
                            <button type="button" className={styles.secondaryBtn} onClick={openImport}>
                                <LuUpload size={14} />
                                ورود گروهی
                            </button>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => void handleProvisionPending()}
                                disabled={provisioningAll || !overview?.nodes?.pending}
                            >
                                {provisioningAll ? 'در حال نصب…' : 'نصب آماده‌ها'}
                            </button>
                            <Link href="/mtproxy/add" className={styles.primaryBtn}>
                                <LuPlus size={16} />
                                نود جدید
                            </Link>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.mtproxy} />

                    <div className={styles.kpiGrid}>
                        {kpis.map((kpi) => (
                            <div key={kpi.label} className={styles.kpiCard}>
                                <div className={styles.kpiTop}>
                                    <span className={`${styles.kpiIcon} ${kpi.tone}`}>{kpi.icon}</span>
                                </div>
                                <span className={styles.kpiValue}>{fa(kpi.value as string | number)}</span>
                                <span className={styles.kpiLabel}>{kpi.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.headerActions} style={{marginBottom: '1.25rem'}}>
                        <Link href="/mtproxy/pools" className={styles.secondaryBtn}>مدیریت استخرها</Link>
                        <Link href="/mtproxy/sponsors" className={styles.secondaryBtn}>اسپانسری</Link>
                        <Link href="/mtproxy/events" className={styles.secondaryBtn}>رویدادها</Link>
                    </div>

                    <FilterBar
                        fields={[
                            {key: 'q', type: 'search', label: 'جستجو', placeholder: 'نام، Host یا کشور…'},
                            {
                                key: 'status',
                                type: 'select',
                                label: 'وضعیت',
                                allLabel: 'همه وضعیت‌ها',
                                options: Object.entries(MT_PROXY_NODE_STATUS_LABEL).map(([value, label]) => ({value, label})),
                            },
                            {
                                key: 'poolId',
                                type: 'select',
                                label: 'استخر',
                                allLabel: 'همه استخرها',
                                options: pools.map((p) => ({value: p._id, label: p.name})),
                            },
                        ]}
                        values={filters}
                        onChange={changeFilter}
                        onApply={() => paging.resetPage()}
                        onReset={resetFilters}
                        resultCount={filtered.length}
                        resultLabel="نود"
                    />

                    {loading ? (
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    ) : filtered.length === 0 ? (
                        <TableEmptyState
                            icon={<LuSend size={32} />}
                            title={hasFilters ? 'نودی یافت نشد' : 'هنوز نودی ثبت نشده'}
                            description={
                                hasFilters
                                    ? 'فیلترها را تغییر دهید یا جستجو را خالی کنید.'
                                    : 'اول یک استخر بسازید و بعد سرورها را تکی یا گروهی وارد کنید.'
                            }
                            primaryLabel={hasFilters ? undefined : 'افزودن نود'}
                            primaryHref={hasFilters ? undefined : '/mtproxy/add'}
                            secondaryLabel={hasFilters ? 'پاک کردن فیلترها' : undefined}
                            onSecondaryClick={hasFilters ? resetFilters : undefined}
                        />
                    ) : (
                        <>
                            <TableTheme>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>نود</th>
                                            <th>استخر</th>
                                            <th>آدرس</th>
                                            <th>وضعیت</th>
                                            <th>سلامت</th>
                                            <th>اسپانسر</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paging.pageItems.map((n) => (
                                            <tr key={n._id}>
                                                <td data-label="نود" className={styles.cellPrimary}>
                                                    <Link href={`/mtproxy/${n._id}`} className={styles.linkCell}>
                                                        {n.name}
                                                    </Link>
                                                    {n.country ? <div className={styles.cellMuted}>{n.country}</div> : null}
                                                </td>
                                                <td data-label="استخر">{poolName(n)}</td>
                                                <td data-label="آدرس" className={styles.cellLtr}>
                                                    {n.host}:{n.port}
                                                </td>
                                                <td data-label="وضعیت">
                                                    <span className={`${styles.badge} ${badgeClass(MT_PROXY_NODE_STATUS_TONE[n.status] || 'muted')}`}>
                                                        {MT_PROXY_NODE_STATUS_LABEL[n.status] || n.status}
                                                    </span>
                                                </td>
                                                <td data-label="سلامت">
                                                    {n.status === 'active' && n.latencyMs != null ? (
                                                        <>
                                                            {fa(n.latencyMs)}ms
                                                            {n.failStreak > 0 ? (
                                                                <div className={styles.cellMuted}>
                                                                    {fa(n.failStreak)} چک ناموفق
                                                                </div>
                                                            ) : null}
                                                        </>
                                                    ) : n.lastError ? (
                                                        <div className={styles.cellMuted}>{n.lastError}</div>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td data-label="اسپانسر">
                                                    <span className={`${styles.badge} ${n.adTag ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                        {n.adTag ? 'متصل' : 'بدون ad_tag'}
                                                    </span>
                                                </td>
                                                <td data-label="عملیات">
                                                    <HrRowActionMenu
                                                        rowId={n._id}
                                                        items={[
                                                            {label: 'مدیریت', onClick: () => router.push(`/mtproxy/${n._id}`)},
                                                            {
                                                                label: busyId === n._id ? 'در حال بررسی…' : 'تست اتصال',
                                                                onClick: () => void handleCheck(n),
                                                            },
                                                            {label: 'نصب / نصب مجدد', onClick: () => void handleProvision(n)},
                                                            {label: 'جایگزینی با نود آماده', onClick: () => void handleReplace(n)},
                                                            {label: 'حذف', danger: true, onClick: () => void handleDelete(n)},
                                                        ]}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableTheme>
                            <div className={styles.paginationSpace}>
                                <Pagination
                                    rtl
                                    itemPerPage={paging.itemPerPage}
                                    totalItems={paging.totalItems}
                                    currentPage={paging.currentPage}
                                    paginate={paging.paginate}
                                    setRowsPerPage={paging.setRowsPerPage}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>

            {importOpen ? (
                <div className={styles.modalOverlay} onClick={() => setImportOpen(false)}>
                    <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>ورود گروهی سرورها</h3>
                        <p className={styles.emptyHint}>
                            هر خط یک سرور: <code dir="ltr">host,sshPort,user,password[,name]</code> — جداکننده کاما/پایپ/تب/فاصله.
                            فرمت <code dir="ltr">ip:port:user:pass</code> هم پذیرفته می‌شود.
                        </p>
                        <form onSubmit={submitImport}>
                            <label className={styles.field}>
                                <span>استخر *</span>
                                <select value={importPoolId} onChange={(e) => setImportPoolId(e.target.value)}>
                                    <option value="">— انتخاب کنید —</option>
                                    {pools.map((p) => (
                                        <option key={p._id} value={p._id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>لیست سرورها *</span>
                                <textarea
                                    required
                                    dir="ltr"
                                    rows={8}
                                    placeholder={'45.10.20.1,22,root,pass1,node-1\n45.10.20.2,22,root,pass2'}
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                />
                            </label>
                            <div className={styles.checkRow}>
                                <label className={styles.checkField}>
                                    <input
                                        type="checkbox"
                                        checked={importProvision}
                                        onChange={(e) => setImportProvision(e.target.checked)}
                                    />
                                    <span>بلافاصله نصب هم بشود</span>
                                </label>
                            </div>
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.primaryBtn} disabled={importing || !importText.trim()}>
                                    {importing ? 'در حال ورود…' : 'افزودن نودها'}
                                </button>
                                <button type="button" className={styles.secondaryBtn} onClick={() => setImportOpen(false)}>
                                    انصراف
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </Container>
    );
}
