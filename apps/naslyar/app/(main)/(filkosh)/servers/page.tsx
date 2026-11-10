'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {LuCheck, LuPlus, LuRefreshCw, LuServer, LuX} from 'react-icons/lu';
import styles from '../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import {filkoshApi, FilkoshServer} from '../lib/filkosh-api';
import {APP_SCOPE_LABEL, SERVER_STATUS_LABEL, SERVER_STATUS_TONE, TIER_LABEL, scopeAllows} from '../lib/labels';
import ModuleGuide from '../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../components/guides';
import FilterBar from '../components/FilterBar';
import {useClientPaging} from '../components/useClientPaging';
import {useLoadOnMount} from '../components/useLoadOnMount';

const EMPTY_FILTERS = {q: '', status: '', tier: '', appScope: ''};

function badgeClass(tone: string) {
    if (tone === 'success') return styles.badgeSuccess;
    if (tone === 'danger') return styles.badgeDanger;
    if (tone === 'warning') return styles.badgeWarning;
    return styles.badgeMuted;
}

export default function FilkoshServersPage() {
    const router = useRouter();
    const [servers, setServers] = useState<FilkoshServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setServers(await filkoshApi.listServers());
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    const filtered = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        return servers.filter((s) => {
            if (filters.status && s.status !== filters.status) return false;
            if (filters.tier && s.tier !== filters.tier) return false;
            if (filters.appScope && (s.appScope || 'vpn') !== filters.appScope) return false;
            if (!q) return true;
            return (
                s.name.toLowerCase().includes(q) ||
                s.host.toLowerCase().includes(q) ||
                (s.country || '').toLowerCase().includes(q) ||
                (s.city || '').toLowerCase().includes(q)
            );
        });
    }, [servers, filters]);

    const paging = useClientPaging(filtered);

    const changeFilter = (key: string, value: string) => {
        setFilters((prev) => ({...prev, [key]: value}));
        paging.resetPage();
    };
    const resetFilters = () => {
        setFilters(EMPTY_FILTERS);
        paging.resetPage();
    };

    const handleTestSsh = async (server: FilkoshServer) => {
        try {
            setTestingId(server._id);
            const result = await filkoshApi.testSsh(server._id);
            if (result.ok) {
                SuccessToaster({message: `اتصال موفق — ${result.arch || ''}`});
            } else {
                ErrorToaster(new Error(result.error || 'اتصال ناموفق بود'));
            }
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setTestingId(null);
        }
    };

    const handleDelete = async (server: FilkoshServer) => {
        if (!confirm(`حذف سرور «${server.name}»؟`)) return;
        try {
            await filkoshApi.deleteServer(server._id);
            SuccessToaster({message: 'سرور حذف شد'});
            await load();
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
                            <h1 className={styles.mainTitle}>سرورها</h1>
                            <p className={styles.subtitle}>
                                ناوگان نودهای VPN و DNS — تست SSH، نصب پروتکل و مدیریت ظرفیت.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => load()} disabled={loading}>
                                <LuRefreshCw size={14} />
                                بروزرسانی
                            </button>
                            <Link href="/servers/add" className={styles.primaryBtn}>
                                <LuPlus size={16} />
                                سرور جدید
                            </Link>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.servers} />

                    <FilterBar
                        fields={[
                            {key: 'q', type: 'search', label: 'جستجو', placeholder: 'نام، Host یا کشور…'},
                            {
                                key: 'status',
                                type: 'select',
                                label: 'وضعیت',
                                allLabel: 'همه وضعیت‌ها',
                                options: Object.entries(SERVER_STATUS_LABEL).map(([value, label]) => ({value, label})),
                            },
                            {
                                key: 'tier',
                                type: 'select',
                                label: 'سطح دسترسی',
                                allLabel: 'همه سطوح',
                                options: Object.entries(TIER_LABEL).map(([value, label]) => ({value, label})),
                            },
                            {
                                key: 'appScope',
                                type: 'select',
                                label: 'اپ هدف',
                                allLabel: 'همه اپ‌ها',
                                options: Object.entries(APP_SCOPE_LABEL).map(([value, label]) => ({value, label})),
                            },
                        ]}
                        values={filters}
                        onChange={changeFilter}
                        onApply={() => paging.resetPage()}
                        onReset={resetFilters}
                        resultCount={filtered.length}
                        resultLabel="سرور"
                    />

                    {loading ? (
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    ) : filtered.length === 0 ? (
                        <TableEmptyState
                            icon={<LuServer size={32} />}
                            title={hasFilters ? 'سروری یافت نشد' : 'هنوز سروری ثبت نشده'}
                            description={
                                hasFilters
                                    ? 'فیلترها را تغییر دهید یا جستجو را خالی کنید.'
                                    : 'اولین نود VPN یا DNS را اضافه کنید تا در این جدول دیده شود.'
                            }
                            primaryLabel={hasFilters ? undefined : 'افزودن سرور'}
                            primaryHref={hasFilters ? undefined : '/servers/add'}
                            secondaryLabel={hasFilters ? 'پاک کردن فیلترها' : undefined}
                            onSecondaryClick={hasFilters ? resetFilters : undefined}
                        />
                    ) : (
                        <>
                            <TableTheme className={styles.tableCentered}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>نام</th>
                                            <th>Host</th>
                                            <th>موقعیت</th>
                                            <th>سطح</th>
                                            <th>اپ</th>
                                            <th>وضعیت</th>
                                            <th>ظرفیت</th>
                                            <th>توضیحات</th>
                                            <th>عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paging.pageItems.map((s) => (
                                            <tr key={s._id}>
                                                <td data-label="نام" className={styles.cellPrimary}>
                                                    {s.flag ? `${s.flag} ` : ''}
                                                    <Link href={`/servers/${s._id}`} className={styles.linkCell}>
                                                        {s.name}
                                                    </Link>
                                                </td>
                                                <td data-label="Host" className={styles.cellLtr}>
                                                    {s.host}
                                                </td>
                                                <td data-label="موقعیت">
                                                    {s.country || '—'}
                                                    {s.city ? ` · ${s.city}` : ''}
                                                </td>
                                                <td data-label="سطح">
                                                    <span className={`${styles.badge} ${s.tier === 'premium' ? styles.badgeWarning : styles.badgeMuted}`}>
                                                        {TIER_LABEL[s.tier] || s.tier}
                                                    </span>
                                                </td>
                                                <td data-label="اپ">
                                                    {scopeAllows(s.appScope, 'vpn') || scopeAllows(s.appScope, 'dns') ? (
                                                        <>
                                                            <span
                                                                className={`${styles.badge} ${styles.scopeBadge} ${scopeAllows(s.appScope, 'vpn') ? styles.badgeSuccess : styles.badgeDanger}`}
                                                                title={scopeAllows(s.appScope, 'vpn') ? 'مجاز در بخش VPN' : 'بدون دسترسی به بخش VPN'}
                                                            >
                                                                {scopeAllows(s.appScope, 'vpn') ? <LuCheck size={12} /> : <LuX size={12} />}
                                                                VPN
                                                            </span>
                                                            <span
                                                                className={`${styles.badge} ${styles.scopeBadge} ${scopeAllows(s.appScope, 'dns') ? styles.badgeSuccess : styles.badgeDanger}`}
                                                                title={scopeAllows(s.appScope, 'dns') ? 'مجاز در بخش DNS' : 'بدون دسترسی به بخش DNS'}
                                                            >
                                                                {scopeAllows(s.appScope, 'dns') ? <LuCheck size={12} /> : <LuX size={12} />}
                                                                DNS
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span
                                                            className={`${styles.badge} ${styles.scopeBadge} ${styles.badgeDanger}`}
                                                            title="در هیچ بخشی از اپ استفاده نمی‌شود"
                                                        >
                                                            <LuX size={12} />
                                                        </span>
                                                    )}
                                                </td>
                                                <td data-label="وضعیت">
                                                    <span className={`${styles.badge} ${badgeClass(SERVER_STATUS_TONE[s.status] || 'muted')}`}>
                                                        {SERVER_STATUS_LABEL[s.status] || s.status}
                                                    </span>
                                                </td>
                                                <td data-label="ظرفیت">
                                                    {toFarsiNumber(s.onlineUsers || 0)} / {toFarsiNumber(s.capacity)}
                                                    {s.ping != null ? (
                                                        <div className={styles.cellMuted}>ping {toFarsiNumber(s.ping)}ms</div>
                                                    ) : null}
                                                </td>
                                                <td
                                                    data-label="توضیحات"
                                                    className={styles.cellMuted}
                                                    title={s.description || undefined}
                                                >
                                                    {s.description
                                                        ? s.description.length > 50
                                                            ? `${s.description.slice(0, 50)}…`
                                                            : s.description
                                                        : '—'}
                                                </td>
                                                <td data-label="عملیات">
                                                    <HrRowActionMenu
                                                        rowId={s._id}
                                                        items={[
                                                            {label: 'مدیریت', onClick: () => router.push(`/servers/${s._id}`)},
                                                            {
                                                                label: testingId === s._id ? 'در حال تست…' : 'تست SSH',
                                                                onClick: () => void handleTestSsh(s),
                                                            },
                                                            {label: 'حذف', danger: true, onClick: () => void handleDelete(s)},
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
        </Container>
    );
}
