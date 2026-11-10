'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TbPlugConnected, TbUsers } from 'react-icons/tb';
import { ErrorToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import SimpleLineTabs from '@/app/components/SimpleLineTabs/SimpleLineTabs';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import { formatCount, fullDate, relativeTime } from '@/app/(main)/error-tracking/lib/format';
import etrStyles from '@/app/(main)/error-tracking/ErrorTracking.module.scss';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import CapacityGuide from '../components/CapacityGuide';
import { TableBody, TableFooter, TablePanel, TotalLabel } from '../components/TableParts';
import {
    platformLabel,
    zernioAdminApi,
    ZERNIO_PLATFORM_LABELS,
    type ZernioOwner,
    type ZernioPoolKey,
    type ZernioSummary,
} from '../lib/zernio-admin-api';
import { useTablePage } from '../lib/useTablePage';
import styles from '../Infra.module.scss';

const VIEWS = [
    { id: 'customers', label: 'مشتری‌ها' },
    { id: 'accounts', label: 'اکانت‌ها' },
];

function PlatformSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <select className={etrStyles.filterSelect} value={value} onChange={(e) => onChange(e.target.value)} aria-label="شبکه">
            <option value="">همه شبکه‌ها</option>
            {Object.entries(ZERNIO_PLATFORM_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
            ))}
        </select>
    );
}

/** Customer name + email (+ mobile) — the admin must always see who it is, not an id. */
function OwnerCell({ owner }: { owner: ZernioOwner }) {
    return (
        <div className={styles.person}>
            <span className={styles.personName}>{owner.name || 'بدون نام'}</span>
            <span className={styles.personMeta} dir="ltr">{owner.email || owner.mobile || owner.ownerId}</span>
            {owner.email && owner.mobile ? <span className={styles.personMeta} dir="ltr">{owner.mobile}</span> : null}
        </div>
    );
}

function CustomersTable() {
    const router = useRouter();
    const table = useUrlTableState('c_', { sort: 'accountCount', filters: { platform: '' } });
    const { rows, total, loading } = useTablePage(zernioAdminApi.customers, table.query);

    return (
        <TablePanel
            icon={<TbUsers size={16} />}
            title="مشتری‌هایی که اکانت وصل کرده‌اند"
            purpose="هر ردیف یک مشتری با نام و ایمیل است و نشان می‌دهد چند جای استخر را گرفته و روی چه شبکه‌هایی."
            howTo="مشتری با اکانت «قطع» جای خالی را بی‌استفاده نگه داشته — با او تماس بگیرید تا دوباره وصل یا حذفش کند. برای دیدن جزئیات هر اکانت به تب «اکانت‌ها» بروید و ایمیل را جستجو کنید."
            toolbar={(
                <>
                    <TableSearch className={etrStyles.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder="جستجوی نام، ایمیل، موبایل یا یوزرنیم" />
                    <PlatformSelect value={table.filters.platform} onChange={(v) => table.setFilter('platform', v)} />
                    <TotalLabel total={total} unit="مشتری" />
                </>
            )}
        >
            <TableBody loading={loading} empty={!rows.length} filtered={table.filtered} onReset={table.reset} emptyText="هنوز هیچ مشتری اکانتی از طریق استخر وصل نکرده است.">
                <table className={etrStyles.dataTable}>
                    <thead>
                        <tr>
                            <SortHeader label="مشتری" field="name" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                            <SortHeader label="اکانت‌ها" field="accountCount" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="تعداد جاهایی از استخر که این مشتری گرفته" />
                            <th>شبکه‌ها</th>
                            <th>اکانت‌ها و کلید</th>
                            <SortHeader label="آخرین اتصال" field="lastConnectedAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <th className={styles.actionsCell}>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.ownerId}>
                                <td data-label="مشتری"><OwnerCell owner={row} /></td>
                                <td data-label="اکانت‌ها" className={etrStyles.cellStrong}>
                                    {formatCount(row.accountCount)}
                                    {row.disconnectedCount ? <span className={`${styles.muted} ${styles.bad}`}> ({formatCount(row.disconnectedCount)} قطع)</span> : null}
                                </td>
                                <td data-label="شبکه‌ها">
                                    <ul className={styles.accountList}>
                                        {Object.entries(row.platforms).map(([platform, count]) => (
                                            <li key={platform} className={styles.nowrap}>{platformLabel(platform)}: {formatCount(count)}</li>
                                        ))}
                                    </ul>
                                </td>
                                <td data-label="اکانت‌ها و کلید">
                                    <ul className={styles.accountList}>
                                        {row.accounts.map((acc) => (
                                            <li key={acc.accountId} className={styles.accountLine}>
                                                <span dir="ltr">@{acc.username || acc.displayName || '—'}</span>
                                                <span className={styles.muted} dir="ltr">{acc.keyLabel || '—'} ••{acc.keyLast4}</span>
                                                {!acc.isConnected ? <span className={`${styles.muted} ${styles.bad}`}>قطع</span> : null}
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td data-label="آخرین اتصال" className={etrStyles.cellMuted} title={fullDate(row.lastConnectedAt)}>
                                    {relativeTime(row.lastConnectedAt)}
                                </td>
                                <td data-label="عملیات" className={styles.actionsCell}>
                                    <HrRowActionMenu
                                        rowId={row.ownerId}
                                        ariaLabel={`عملیات ${row.name || row.email}`}
                                        items={[
                                            {
                                                label: 'اکانت‌های این مشتری',
                                                onClick: () =>
                                                    router.push(`/capacity?view=accounts&a_q=${encodeURIComponent(row.email || row.mobile || row.name)}`),
                                            },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableBody>
            <TableFooter table={table} total={total} />
        </TablePanel>
    );
}

function AccountsTable({ keys }: { keys: ZernioPoolKey[] }) {
    const router = useRouter();
    const table = useUrlTableState('a_', { sort: 'connectedAt', filters: { platform: '', keyId: '', status: '' } });
    const { rows, total, loading } = useTablePage(zernioAdminApi.connections, table.query);

    return (
        <TablePanel
            icon={<TbPlugConnected size={16} />}
            title="اکانت‌های متصل"
            purpose="هر ردیف یک اکانت شبکهٔ اجتماعی است: صاحبش کیست، روی کدام کلید نشسته و از کی وصل است."
            howTo="برای پیدا کردن اکانت‌های یک مشتری ایمیلش را جستجو کنید؛ برای دیدن پرشدن یک کلید آن را در فیلتر «کلید» انتخاب کنید. «قطع» یعنی مشتری باید اکانت را دوباره وصل کند."
            toolbar={(
                <>
                    <TableSearch className={etrStyles.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder="جستجوی یوزرنیم، نام یا ایمیل مشتری" />
                    <PlatformSelect value={table.filters.platform} onChange={(v) => table.setFilter('platform', v)} />
                    <select className={etrStyles.filterSelect} value={table.filters.keyId} onChange={(e) => table.setFilter('keyId', e.target.value)} aria-label="کلید">
                        <option value="">همه کلیدها</option>
                        {keys.map((k) => (
                            <option key={k._id} value={k._id}>{k.label || 'بدون برچسب'} ••{k.last4}</option>
                        ))}
                    </select>
                    <select className={etrStyles.filterSelect} value={table.filters.status} onChange={(e) => table.setFilter('status', e.target.value)} aria-label="وضعیت">
                        <option value="">همه وضعیت‌ها</option>
                        <option value="connected">وصل</option>
                        <option value="disconnected">قطع</option>
                    </select>
                    <TotalLabel total={total} unit="اکانت" />
                </>
            )}
        >
            <TableBody loading={loading} empty={!rows.length} filtered={table.filtered} onReset={table.reset} emptyText="هنوز هیچ اکانتی از طریق استخر وصل نشده است.">
                <table className={etrStyles.dataTable}>
                    <thead>
                        <tr>
                            <SortHeader label="اکانت" field="platform" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                            <SortHeader label="مشتری" field="owner" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                            <SortHeader label="کلید" field="key" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                            <th>وضعیت</th>
                            <SortHeader label="زمان اتصال" field="connectedAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            <th className={styles.actionsCell}>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.accountId}>
                                <td data-label="اکانت">
                                    <div className={styles.person}>
                                        <span className={styles.personName} dir="ltr">@{row.username || row.displayName || '—'}</span>
                                        <span className={styles.personMeta}>
                                            {platformLabel(row.platform)}{row.displayName && row.displayName !== row.username ? ` · ${row.displayName}` : ''}
                                        </span>
                                    </div>
                                </td>
                                <td data-label="مشتری"><OwnerCell owner={row.owner} /></td>
                                <td data-label="کلید">
                                    <Link href={`/zernio-keys/${row.key.keyId}`}>{row.key.label || 'بدون برچسب'}</Link>
                                    <span className={`${styles.muted} ${styles.ltr}`}> ••{row.key.last4}</span>
                                </td>
                                <td data-label="وضعیت">
                                    {row.isConnected ? (
                                        <span className={`${styles.statusDot} ${styles.ok}`}>وصل</span>
                                    ) : (
                                        <span className={`${styles.statusDot} ${styles.bad}`}>قطع</span>
                                    )}
                                </td>
                                <td data-label="زمان اتصال" className={etrStyles.cellMuted} title={fullDate(row.connectedAt)}>
                                    {relativeTime(row.connectedAt)}
                                </td>
                                <td data-label="عملیات" className={styles.actionsCell}>
                                    <HrRowActionMenu
                                        rowId={row.accountId}
                                        ariaLabel={`عملیات @${row.username}`}
                                        items={[
                                            { label: 'ویرایش کلید این اکانت', onClick: () => router.push(`/zernio-keys/${row.key.keyId}`) },
                                            {
                                                label: 'همهٔ اکانت‌های این مشتری',
                                                onClick: () => table.setSearch(row.owner.email || row.owner.mobile || row.owner.name),
                                            },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableBody>
            <TableFooter table={table} total={total} />
        </TablePanel>
    );
}

function CapacityContent() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const view = params.get('view') === 'accounts' ? 'accounts' : 'customers';
    const [summary, setSummary] = useState<ZernioSummary | null>(null);
    const [keys, setKeys] = useState<ZernioPoolKey[]>([]);

    useEffect(() => {
        Promise.all([zernioAdminApi.summary(), zernioAdminApi.listKeys()])
            .then(([s, k]) => {
                setSummary(s);
                setKeys(k.keys || []);
            })
            .catch((e) => ErrorToaster(e));
    }, []);

    const setView = useCallback(
        (next: string) => {
            // tables keep their own prefixed params; only the view switches
            const query = new URLSearchParams(params.toString());
            if (next === 'customers') query.delete('view');
            else query.set('view', next);
            const qs = query.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [params, pathname, router],
    );

    const free = summary?.freeSlots ?? 0;
    const lowCapacity = summary && summary.keyCount > 0 && free <= 1;

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>اکانت‌ها</h1>
                            <p className={parentStyles.subtitle}>چند جا برای اتصال اکانت مانده و کدام مشتری کدام جا را گرفته است.</p>
                        </div>
                        <div className={styles.headerActions}>
                            <Link href="/zernio-keys" className={parentStyles.secondaryBtn}>
                                ظرفیت‌ها
                            </Link>
                            <Link href="/zernio-keys/new" className={parentStyles.primaryBtn}>
                                افزودن کلید
                            </Link>
                        </div>
                    </header>

                    <CapacityGuide />

                    <div className={styles.kpiStrip}>
                        <div className={styles.kpiCell}>
                            <span className={styles.kpiLabel}>ظرفیت کل</span>
                            <span className={styles.kpiValue}>{summary ? formatCount(summary.totalCapacity) : '—'}</span>
                            <span className={styles.kpiHint}>{summary ? `${formatCount(summary.keyCount)} کلید فعال` : ''}</span>
                        </div>
                        <div className={styles.kpiCell}>
                            <span className={styles.kpiLabel}>مصرف‌شده</span>
                            <span className={styles.kpiValue}>{summary ? formatCount(summary.usedSlots) : '—'}</span>
                            <span className={styles.kpiHint}>
                                {summary ? `${formatCount(summary.customerCount)} مشتری${summary.disconnectedAccounts ? ` · ${formatCount(summary.disconnectedAccounts)} اکانت قطع` : ''}` : ''}
                            </span>
                        </div>
                        <div className={styles.kpiCell}>
                            <span className={styles.kpiLabel}>جای آزاد</span>
                            <span className={`${styles.kpiValue} ${summary && free === 0 ? styles.kpiBad : ''}`}>{summary ? formatCount(free) : '—'}</span>
                            <span className={styles.kpiHint}>{summary ? (free === 0 ? 'اتصال جدید بسته است' : 'آماده اتصال مشتری جدید') : ''}</span>
                        </div>
                        <div className={styles.kpiCell}>
                            <span className={styles.kpiLabel}>کلید بدون webhook</span>
                            <span className={`${styles.kpiValue} ${summary && summary.keysWithoutWebhook ? styles.kpiBad : ''}`}>
                                {summary ? formatCount(summary.keysWithoutWebhook) : '—'}
                            </span>
                            <span className={styles.kpiHint}>{summary ? `${formatCount(summary.fullKeys)} کلید پر شده` : ''}</span>
                        </div>
                    </div>

                    {summary?.platforms.length ? (
                        <div className={styles.platformSplit}>
                            {summary.platforms.map((p) => (
                                <span key={p.platform}>{platformLabel(p.platform)}: {formatCount(p.count)}</span>
                            ))}
                        </div>
                    ) : null}

                    {summary && (lowCapacity || summary.keysWithoutWebhook > 0 || summary.keyCount === 0) ? (
                        <div className={styles.alertList}>
                            {summary.keyCount === 0 ? (
                                <div className={`${styles.alert} ${styles.alertDanger}`}>
                                    هیچ کلیدی در استخر نیست؛ مشتری‌ها نمی‌توانند اینستاگرام، یوتیوب و… وصل کنند. <Link href="/zernio-keys/new">افزودن کلید</Link>
                                </div>
                            ) : lowCapacity ? (
                                <div className={`${styles.alert} ${free === 0 ? styles.alertDanger : ''}`}>
                                    {free === 0 ? 'ظرفیت تمام شده و دکمهٔ اتصال برای مشتری‌ها غیرفعال است.' : 'فقط یک جای خالی مانده.'}
                                    {' '}<Link href="/zernio-keys/new">یک کلید تازه اضافه کنید</Link>.
                                </div>
                            ) : null}
                            {summary.keysWithoutWebhook > 0 ? (
                                <div className={styles.alert}>
                                    {formatCount(summary.keysWithoutWebhook)} کلید webhook ندارد؛ کامنت و پیام اکانت‌های آن‌ها به «تعامل» نمی‌رسد.
                                    {' '}<Link href="/zernio-keys?k_status=no-webhook">کلیدها را ببینید</Link> و «ثبت webhook» را بزنید.
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <SimpleLineTabs tabs={VIEWS} activeTab={view} onChange={setView} />
                    {view === 'customers' ? <CustomersTable /> : <AccountsTable keys={keys} />}
                </div>
            </Wrapper>
        </Container>
    );
}

export default function BloggerCapacityPage() {
    return (
        <Suspense fallback={null}>
            <CapacityContent />
        </Suspense>
    );
}
