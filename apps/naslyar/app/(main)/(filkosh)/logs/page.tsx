'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {LuFileText, LuRefreshCw} from 'react-icons/lu';
import styles from '../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import {filkoshApi, FilkoshProvisionRun} from '../lib/filkosh-api';
import {PROVISION_ACTION_LABEL, RUN_STATUS_LABEL} from '../lib/labels';
import ModuleGuide from '../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../components/guides';
import FilterBar from '../components/FilterBar';
import {useClientPaging} from '../components/useClientPaging';
import {useLoadOnMount} from '../components/useLoadOnMount';

const EMPTY_FILTERS = {q: '', status: '', action: ''};

function runTone(status: string) {
    if (status === 'success') return styles.badgeSuccess;
    if (status === 'failed') return styles.badgeDanger;
    return styles.badgeWarning;
}

function serverNameOf(run: FilkoshProvisionRun) {
    return typeof run.serverId === 'object' ? run.serverId?.name || '—' : '—';
}

export default function FilkoshLogsPage() {
    const [runs, setRuns] = useState<FilkoshProvisionRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [openRun, setOpenRun] = useState<FilkoshProvisionRun | null>(null);
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setRuns(await filkoshApi.listRuns(undefined, 200));
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const actionOptions = useMemo(() => {
        const keys = Array.from(new Set(runs.map((r) => r.action).filter(Boolean)));
        return keys.map((value) => ({value, label: PROVISION_ACTION_LABEL[value] || value}));
    }, [runs]);

    const filtered = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        return runs.filter((r) => {
            if (filters.status && r.status !== filters.status) return false;
            if (filters.action && r.action !== filters.action) return false;
            if (!q) return true;
            const name = serverNameOf(r).toLowerCase();
            const action = (PROVISION_ACTION_LABEL[r.action] || r.action).toLowerCase();
            return name.includes(q) || action.includes(q) || (r.protocol || '').toLowerCase().includes(q);
        });
    }, [runs, filters]);

    const paging = useClientPaging(filtered);

    const changeFilter = (key: string, value: string) => {
        setFilters((prev) => ({...prev, [key]: value}));
        paging.resetPage();
    };
    const resetFilters = () => {
        setFilters(EMPTY_FILTERS);
        paging.resetPage();
    };

    const openLog = async (run: FilkoshProvisionRun) => {
        try {
            setOpenRun(await filkoshApi.getRun(run._id));
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>لاگ عملیات سرورها</h1>
                            <p className={styles.subtitle}>تاریخچه نصب، اعمال کانفیگ و بررسی سلامت نودها.</p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => load()} disabled={loading}>
                                <LuRefreshCw size={14} />
                                بروزرسانی
                            </button>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.logs} />

                    <FilterBar
                        compact
                        fields={[
                            {key: 'q', type: 'search', label: 'جستجو', placeholder: 'سرور، عملیات یا پروتکل…'},
                            {
                                key: 'status',
                                type: 'select',
                                label: 'وضعیت',
                                allLabel: 'همه وضعیت‌ها',
                                options: Object.entries(RUN_STATUS_LABEL).map(([value, label]) => ({value, label})),
                            },
                            {
                                key: 'action',
                                type: 'select',
                                label: 'نوع عملیات',
                                allLabel: 'همه عملیات',
                                options: actionOptions,
                            },
                        ]}
                        values={filters}
                        onChange={changeFilter}
                        onReset={resetFilters}
                        resultCount={filtered.length}
                        resultLabel="عملیات"
                    />

                    {loading ? (
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    ) : filtered.length === 0 ? (
                        <TableEmptyState
                            icon={<LuFileText size={32} />}
                            title={hasFilters ? 'لاگی یافت نشد' : 'هنوز عملیاتی ثبت نشده'}
                            description={
                                hasFilters
                                    ? 'فیلترها را تغییر دهید.'
                                    : 'بعد از نصب یا همگام‌سازی روی سرور، لاگ‌ها اینجا می‌آیند.'
                            }
                            secondaryLabel={hasFilters ? 'پاک کردن فیلترها' : undefined}
                            onSecondaryClick={hasFilters ? resetFilters : undefined}
                        />
                    ) : (
                        <>
                            <TableTheme>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>وضعیت</th>
                                            <th>عملیات</th>
                                            <th>سرور</th>
                                            <th>زمان</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paging.pageItems.map((r) => (
                                            <tr key={r._id}>
                                                <td data-label="وضعیت">
                                                    <span className={`${styles.badge} ${runTone(r.status)}`}>
                                                        {RUN_STATUS_LABEL[r.status] || r.status}
                                                    </span>
                                                </td>
                                                <td data-label="عملیات" className={styles.cellPrimary}>
                                                    {PROVISION_ACTION_LABEL[r.action] || r.action}
                                                    {r.protocol ? (
                                                        <div className={styles.cellMuted}>{r.protocol}</div>
                                                    ) : null}
                                                </td>
                                                <td data-label="سرور">{serverNameOf(r)}</td>
                                                <td data-label="زمان">{new Date(r.createdAt).toLocaleString('fa-IR')}</td>
                                                <td data-label="لاگ">
                                                    <button type="button" className={styles.textBtn} onClick={() => void openLog(r)}>
                                                        لاگ
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableTheme>
                            <div className={`${styles.paginationSpace} ${styles.paginationSpaceCompact}`}>
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

            {openRun ? (
                <div className={styles.modalOverlay} onClick={() => setOpenRun(null)}>
                    <div className={`${styles.modalPanel} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>
                            {PROVISION_ACTION_LABEL[openRun.action] || openRun.action}
                            {openRun.error ? ` — ${openRun.error}` : ''}
                        </h3>
                        <pre className={styles.preBox}>
                            {(openRun.logs || []).map((l) => `${l.stream === 'stderr' ? '⨯' : '›'} ${l.line}`).join('\n') ||
                                '(بدون خروجی)'}
                        </pre>
                        <div className={styles.formActions}>
                            <button type="button" className={styles.primaryBtn} onClick={() => setOpenRun(null)}>
                                بستن
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </Container>
    );
}
