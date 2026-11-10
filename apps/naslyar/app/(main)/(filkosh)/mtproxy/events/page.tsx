'use client';

import React, {useCallback, useMemo, useState} from 'react';
import Link from 'next/link';
import {LuRefreshCw} from 'react-icons/lu';
import styles from '../../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import {
    filkoshApi,
    FilkoshMtProxyEvent,
    FilkoshMtProxyPool,
} from '../../lib/filkosh-api';
import {
    MT_PROXY_EVENT_LEVEL_LABEL,
    MT_PROXY_EVENT_LEVEL_TONE,
    MT_PROXY_EVENT_TYPE_LABEL,
} from '../../lib/labels';
import ModuleGuide from '../../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../../components/guides';
import FilterBar from '../../components/FilterBar';
import {useClientPaging} from '../../components/useClientPaging';
import {useLoadOnMount} from '../../components/useLoadOnMount';

const EMPTY_FILTERS = {type: '', level: '', poolId: ''};

function badgeClass(tone: string) {
    if (tone === 'success') return styles.badgeSuccess;
    if (tone === 'danger') return styles.badgeDanger;
    if (tone === 'warning') return styles.badgeWarning;
    return styles.badgeMuted;
}

export default function FilkoshMtProxyEventsPage() {
    const [events, setEvents] = useState<FilkoshMtProxyEvent[]>([]);
    const [pools, setPools] = useState<FilkoshMtProxyPool[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [ev, p] = await Promise.all([
                filkoshApi.listMtProxyEvents({limit: 500}),
                filkoshApi.listMtProxyPools(),
            ]);
            setEvents(ev);
            setPools(p);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const filtered = useMemo(
        () =>
            events.filter((ev) => {
                if (filters.type && ev.type !== filters.type) return false;
                if (filters.level && ev.level !== filters.level) return false;
                if (filters.poolId) {
                    const poolKey = typeof ev.poolId === 'object' && ev.poolId ? (ev.poolId as {_id: string})._id : ev.poolId;
                    if (poolKey !== filters.poolId) return false;
                }
                return true;
            }),
        [events, filters],
    );

    const paging = useClientPaging(filtered);

    const changeFilter = (key: string, value: string) => {
        setFilters((prev) => ({...prev, [key]: value}));
        paging.resetPage();
    };
    const resetFilters = () => {
        setFilters(EMPTY_FILTERS);
        paging.resetPage();
    };

    const poolName = (ev: FilkoshMtProxyEvent) =>
        typeof ev.poolId === 'object' && ev.poolId ? (ev.poolId as {name: string}).name : '—';
    const nodeName = (ev: FilkoshMtProxyEvent) =>
        typeof ev.nodeId === 'object' && ev.nodeId ? (ev.nodeId as {name: string}).name : '';

    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>رویدادهای پروکسی</h1>
                            <p className={styles.subtitle}>
                                تاریخچه نصب، سلامت، جایگزینی خودکار و اسپانسری ناوگان MTProto proxy — {toFarsiNumber(filtered.length)} رویداد.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => load()} disabled={loading}>
                                <LuRefreshCw size={14} />
                                بروزرسانی
                            </button>
                            <Link href="/mtproxy" className={styles.backLink}>بازگشت به پروکسی تلگرام</Link>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.mtproxyEvents} />

                    <FilterBar
                        fields={[
                            {
                                key: 'type',
                                type: 'select',
                                label: 'نوع رویداد',
                                allLabel: 'همه انواع',
                                options: Object.entries(MT_PROXY_EVENT_TYPE_LABEL).map(([value, label]) => ({value, label})),
                            },
                            {
                                key: 'level',
                                type: 'select',
                                label: 'سطح',
                                allLabel: 'همه سطوح',
                                options: Object.entries(MT_PROXY_EVENT_LEVEL_LABEL).map(([value, label]) => ({value, label})),
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
                        resultLabel="رویداد"
                    />

                    {loading ? (
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    ) : filtered.length === 0 ? (
                        <TableEmptyState
                            icon={<LuRefreshCw size={32} />}
                            title={hasFilters ? 'رویدادی یافت نشد' : 'هنوز رویدادی ثبت نشده'}
                            description={
                                hasFilters
                                    ? 'فیلترها را تغییر دهید.'
                                    : 'به محض شروع کار با ناوگان پروکسی، رویدادها اینجا دیده می‌شوند.'
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
                                            <th>زمان</th>
                                            <th>استخر</th>
                                            <th>نود</th>
                                            <th>نوع</th>
                                            <th>سطح</th>
                                            <th>پیام</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paging.pageItems.map((ev) => (
                                            <tr key={ev._id}>
                                                <td data-label="زمان">{new Date(ev.createdAt).toLocaleString('fa-IR')}</td>
                                                <td data-label="استخر">{poolName(ev)}</td>
                                                <td data-label="نود">
                                                    {nodeName(ev) ? (
                                                        typeof ev.nodeId === 'object' ? (
                                                            <Link href={`/mtproxy/${(ev.nodeId as {_id: string})._id}`} className={styles.linkCell}>
                                                                {nodeName(ev)}
                                                            </Link>
                                                        ) : (
                                                            nodeName(ev)
                                                        )
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td data-label="نوع">
                                                    {MT_PROXY_EVENT_TYPE_LABEL[ev.type] || ev.type}
                                                </td>
                                                <td data-label="سطح">
                                                    <span className={`${styles.badge} ${badgeClass(MT_PROXY_EVENT_LEVEL_TONE[ev.level] || 'muted')}`}>
                                                        {MT_PROXY_EVENT_LEVEL_LABEL[ev.level] || ev.level}
                                                    </span>
                                                </td>
                                                <td data-label="پیام">{ev.message}</td>
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
        </Container>
    );
}
