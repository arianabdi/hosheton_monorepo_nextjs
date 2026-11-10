'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TbKey } from 'react-icons/tb';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import { Container, Wrapper } from '@/app/(main)/layout';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import { formatCount, fullDate, relativeTime } from '@/app/(main)/error-tracking/lib/format';
import etrStyles from '@/app/(main)/error-tracking/ErrorTracking.module.scss';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import ZernioKeysGuide from '../components/ZernioKeysGuide';
import { TableBody, TableFooter, TablePanel, TotalLabel } from '../components/TableParts';
import { platformLabel, zernioAdminApi, type ZernioPoolKey } from '../lib/zernio-admin-api';
import { useTablePage } from '../lib/useTablePage';
import styles from '../Infra.module.scss';

const STATUS_OPTIONS = [
    { id: '', label: 'همه کلیدها' },
    { id: 'free', label: 'دارای جای خالی' },
    { id: 'full', label: 'پر' },
    { id: 'no-webhook', label: 'بدون webhook' },
];

function UsageCell({ k }: { k: ZernioPoolKey }) {
    const full = k.allocationCount >= k.maxAccounts;
    const percent = Math.min(100, Math.round((k.allocationCount / Math.max(1, k.maxAccounts)) * 100));
    return (
        <div className={styles.usage}>
            <span>
                {formatCount(k.allocationCount)} از {formatCount(k.maxAccounts)}
                {full ? <span className={`${styles.muted} ${styles.bad}`}> — پر</span> : null}
            </span>
            <div className={`${styles.usageBar} ${full ? styles.usageFull : ''}`}>
                <span style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function ZernioKeysContent() {
    const router = useRouter();
    const table = useUrlTableState('k_', { sort: 'createdAt', filters: { status: '' } });
    const [revision, setRevision] = useState(0);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [toDelete, setToDelete] = useState<ZernioPoolKey | null>(null);
    const { rows, total, loading } = useTablePage(zernioAdminApi.keysTable, table.query, revision);

    const registerWebhook = async (key: ZernioPoolKey) => {
        try {
            setBusyId(key._id);
            const result = await zernioAdminApi.reregisterWebhook(key._id);
            SuccessToaster({ message: result.message || 'webhook ثبت شد' });
            setRevision((r) => r + 1);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    const removeKey = async () => {
        if (!toDelete) return;
        try {
            setBusyId(toDelete._id);
            await zernioAdminApi.deleteKey(toDelete._id);
            SuccessToaster({ message: 'کلید از استخر حذف شد' });
            setToDelete(null);
            setRevision((r) => r + 1);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>ظرفیت‌ها</h1>
                            <p className={parentStyles.subtitle}>
                                استخر مشترک کلیدهایی که اکانت‌های اینستاگرام، یوتیوب، تیک‌تاک، ایکس و لینکدین مشتری‌ها با آن وصل می‌شوند.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <Link href="/zernio-keys/settings" className={parentStyles.secondaryBtn}>
                                تنظیمات اتصال
                            </Link>
                            <Link href="/zernio-keys/new" className={parentStyles.primaryBtn}>
                                افزودن کلید
                            </Link>
                        </div>
                    </header>

                    <ZernioKeysGuide />

                    <TablePanel
                        icon={<TbKey size={16} />}
                        title="کلیدهای استخر"
                        purpose="هر کلید چند جا برای اتصال اکانت دارد؛ اینجا می‌بینید کدام کلید پر است، کدام جا دارد و webhook کدام سالم است."
                        howTo="کلید «بدون webhook» را با «ثبت webhook» درست کنید. وقتی بیشتر کلیدها «پر» شدند کلید تازه اضافه کنید. برای تغییر برچسب، سقف یا خود کلید روی «ویرایش» بزنید."
                        toolbar={(
                            <>
                                <TableSearch
                                    className={etrStyles.toolbarSearch}
                                    value={table.search}
                                    onSearch={table.setSearch}
                                    placeholder="جستجوی برچسب، ۴ رقم آخر یا یوزرنیم"
                                />
                                <select
                                    className={etrStyles.filterSelect}
                                    value={table.filters.status}
                                    onChange={(e) => table.setFilter('status', e.target.value)}
                                    aria-label="وضعیت کلید"
                                >
                                    {STATUS_OPTIONS.map((o) => (
                                        <option key={o.id} value={o.id}>{o.label}</option>
                                    ))}
                                </select>
                                <TotalLabel total={total} unit="کلید" />
                            </>
                        )}
                    >
                        <TableBody
                            loading={loading}
                            empty={!rows.length}
                            filtered={table.filtered}
                            onReset={table.reset}
                            emptyText={(
                                <>
                                    هنوز هیچ کلیدی در استخر نیست — <Link href="/zernio-keys/new">اولین کلید را اضافه کنید</Link>.
                                </>
                            )}
                        >
                            <table className={etrStyles.dataTable}>
                                <thead>
                                    <tr>
                                        <SortHeader label="برچسب" field="label" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                                        <SortHeader label="مصرف" field="usage" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="اکانت‌های متصل از سقف این کلید" />
                                        <SortHeader label="جای خالی" field="free" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="چند اکانت دیگر می‌تواند روی این کلید وصل شود" />
                                        <th title="بدون webhook، کامنت و پیام اکانت‌های این کلید به بلاگر نمی‌رسد">webhook</th>
                                        <th>اکانت‌های متصل</th>
                                        <SortHeader label="افزوده‌شده" field="createdAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                                        <th className={styles.actionsCell}>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((key) => (
                                        <tr key={key._id}>
                                            <td data-label="برچسب">
                                                <div className={styles.person}>
                                                    <Link href={`/zernio-keys/${key._id}`} className={styles.personName}>
                                                        {key.label || 'بدون برچسب'}
                                                    </Link>
                                                    <span className={`${styles.personMeta} ${styles.ltr}`}>sk_••••{key.last4}</span>
                                                </div>
                                            </td>
                                            <td data-label="مصرف"><UsageCell k={key} /></td>
                                            <td data-label="جای خالی" className={key.maxAccounts - key.allocationCount > 0 ? etrStyles.cellStrong : etrStyles.cellMuted}>
                                                {formatCount(Math.max(0, key.maxAccounts - key.allocationCount))}
                                            </td>
                                            <td data-label="webhook">
                                                {key.hasWebhook ? (
                                                    <span className={`${styles.statusDot} ${styles.ok}`}>ثبت‌شده</span>
                                                ) : (
                                                    <span className={`${styles.statusDot} ${styles.bad}`}>ثبت نشده</span>
                                                )}
                                            </td>
                                            <td data-label="اکانت‌های متصل">
                                                {key.allocatedAccounts.length ? (
                                                    <ul className={styles.accountList}>
                                                        {key.allocatedAccounts.map((acc) => (
                                                            <li key={acc._id} className={styles.accountLine}>
                                                                <span dir="ltr">@{acc.username || acc.displayName || '—'}</span>
                                                                <span className={styles.muted}>{platformLabel(acc.platform)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span className={styles.muted}>خالی</span>
                                                )}
                                            </td>
                                            <td data-label="افزوده‌شده" className={etrStyles.cellMuted} title={fullDate(key.createdAt)}>
                                                {relativeTime(key.createdAt)}
                                            </td>
                                            <td data-label="عملیات" className={styles.actionsCell}>
                                                <HrRowActionMenu
                                                    rowId={key._id}
                                                    ariaLabel={`عملیات کلید ${key.label}`}
                                                    items={[
                                                        { label: 'ویرایش', onClick: () => router.push(`/zernio-keys/${key._id}`) },
                                                        {
                                                            label: busyId === key._id ? 'در حال ثبت webhook…' : key.hasWebhook ? 'بررسی و اصلاح webhook' : 'ثبت webhook',
                                                            onClick: () => void registerWebhook(key),
                                                        },
                                                        ...(key.allocationCount === 0
                                                            ? [{ label: 'حذف', danger: true, onClick: () => setToDelete(key) }]
                                                            : []),
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
                </div>
                <ConfirmDialog
                    open={!!toDelete}
                    title="حذف کلید"
                    confirmLabel="حذف"
                    tone="danger"
                    busy={!!toDelete && busyId === toDelete._id}
                    onConfirm={() => void removeKey()}
                    onClose={() => setToDelete(null)}
                >
                    کلید «{toDelete?.label}» از استخر حذف شود؟ ظرفیت کل {formatCount(toDelete?.maxAccounts || 0)} جا کم می‌شود
                    و webhook آن در Zernio پاک می‌شود.
                </ConfirmDialog>
            </Wrapper>
        </Container>
    );
}

export default function BloggerZernioKeysPage() {
    return (
        <Suspense fallback={null}>
            <ZernioKeysContent />
        </Suspense>
    );
}
