'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { TbAlertTriangle, TbCircleCheck, TbUsers } from 'react-icons/tb';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import { TableBody, TableFooter, TablePanel, TotalLabel } from '@/app/(main)/(hosheton)/(blogger)/components/TableParts';
import { useTablePage } from '@/app/(main)/(hosheton)/(blogger)/lib/useTablePage';
import etr from '../../error-tracking/ErrorTracking.module.scss';
import mk from '../../marketing/Marketing.module.scss';
import { formatCount, fullDate, relativeTime } from '../../error-tracking/lib/format';
import Guide from '../components/Guide';
import TabIntro from '../components/TabIntro';
import GrantDialog from '../components/GrantDialog';
import UserEntitlementsDialog from '../components/UserEntitlementsDialog';
import { SUBSCRIPTIONS_GUIDE } from '../components/guides';
import { subscriptionApi, type SubscriptionOverview, type SubscriptionRow } from '../lib/subscription-api';
import { useCachedState, useSubscriptionModule } from '../lib/SubscriptionProvider';
import { money, PERIOD_LABELS, STATUS_LABELS, userLabel } from '../lib/format';
import styles from '../Subscription.module.scss';

const STATUS_OPTIONS = [
    { id: '', label: 'همه وضعیت‌ها' },
    { id: 'active', label: 'فعال' },
    { id: 'expiring', label: 'رو به اتمام (۷ روز)' },
    { id: 'expired', label: 'منقضی' },
    { id: 'canceled', label: 'لغو شده' },
    { id: 'test', label: 'خرید آزمایشی' },
];

const STATUS_CLASS: Record<string, string> = {
    active: etr.statusResolved,
    trialing: etr.statusResolved,
    expired: etr.statusIgnored,
    canceled: etr.statusRegressed,
};

function SetupChecklist({ overview }: { overview: SubscriptionOverview }) {
    const { setup } = overview;
    const items = [
        setup.defaultPlan?.active
            ? { ok: true, text: <>پلن پیش‌فرض: «{setup.defaultPlan.name}» — کاربران بدون اشتراک خودکار روی آن می‌روند.</> }
            : { ok: false, text: <>پلن پیش‌فرض {setup.defaultPlan ? 'غیرفعال است' : 'ندارید'}؛ کاربران تازه به بخش‌های محدود دسترسی ندارند. <Link href="/subscription/plans">یک پلن (معمولاً رایگان) را پیش‌فرض کنید</Link>.</> },
        setup.featuresWithoutValues.length === 0
            ? { ok: true, text: <>همه ویژگی‌ها در دست‌کم یک پلن مقدار دارند.</> }
            : { ok: false, text: <>{formatCount(setup.featuresWithoutValues.length)} ویژگی در هیچ پلنی مقدار ندارد ({setup.featuresWithoutValues.join('، ')}). <Link href="/subscription/matrix">در مقادیر پلن‌ها تعیین کنید</Link>.</> },
        setup.catalogApp
            ? { ok: !setup.lastSync?.typeMismatch?.length, text: <>کاتالوگ کد اپ «{setup.catalogApp}» همگام است{setup.lastSync?.typeMismatch?.length ? ` — نوع این ویژگی‌ها با کد فرق دارد: ${setup.lastSync.typeMismatch.join('، ')}` : ''}. <Link href="/subscription/usage-map">نقشه استفاده</Link></> }
            : { ok: false, text: <>این اپ کاتالوگ ویژگی در کد ثبت نکرده؛ ویژگی‌ها فقط وقتی کار می‌کنند که برنامه‌نویس در کد اعمالشان کند. <Link href="/subscription/docs">راهنمای اتصال اپ</Link></> },
    ];
    return (
        <ul className={styles.setupList}>
            {items.map((item, i) => (
                <li key={i} className={styles.setupItem}>
                    {item.ok
                        ? <TbCircleCheck className={`${styles.setupIcon} ${styles.ok}`} size={17} />
                        : <TbAlertTriangle className={`${styles.setupIcon} ${styles.warn}`} size={17} />}
                    <span>{item.text}</span>
                </li>
            ))}
        </ul>
    );
}

function SubscriptionsContent() {
    const { plans, appKey } = useSubscriptionModule();
    const table = useUrlTableState('s_', { sort: 'createdAt', filters: { status: '', planId: '' } });
    const [revision, setRevision] = useState(0);
    const { rows, total, loading } = useTablePage(subscriptionApi.subscriptionsTable, table.query, revision);
    const [overview, setOverview] = useCachedState<SubscriptionOverview | null>('subs:overview', null);
    const [grantOpen, setGrantOpen] = useState(false);
    const [inspectUser, setInspectUser] = useState<string | null>(null);
    const [toCancel, setToCancel] = useState<SubscriptionRow | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        subscriptionApi.overview().then(setOverview).catch(ErrorToaster);
    }, [revision, appKey, setOverview]);

    const refresh = () => setRevision((r) => r + 1);

    const extend = async (row: SubscriptionRow, days: number) => {
        try {
            await subscriptionApi.extend(row._id, days);
            SuccessToaster({ message: `${formatCount(days)} روز تمدید شد` });
            refresh();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const cancel = async () => {
        if (!toCancel) return;
        try {
            setBusy(true);
            await subscriptionApi.cancel(toCancel._id);
            SuccessToaster({ message: 'اشتراک لغو شد' });
            setToCancel(null);
            refresh();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    const totals = overview?.totals;
    const kpis = totals
        ? [
            { label: 'اشتراک فعال', value: formatCount(totals.active) },
            { label: 'پرداخت‌کننده', value: formatCount(totals.paying) },
            { label: 'رو به اتمام (۷ روز)', value: formatCount(totals.expiringSoon) },
            { label: 'درآمد ماهانه تخمینی', value: `${formatCount(totals.monthlyRevenue)} تومان` },
        ]
        : [];

    return (
        <>
            <TabIntro
                actions={(
                    <button type="button" className={mk.primaryBtn} onClick={() => setGrantOpen(true)}>
                        اعطای اشتراک
                    </button>
                )}
            >
                اشتراک هر کاربر، تاریخ پایان و پلنش. برای دیدن سهمیه و مصرف لحظه‌ای یک کاربر روی نامش بزنید.
            </TabIntro>

            {kpis.length ? (
                <div className={styles.kpiRow}>
                    {kpis.map((k) => (
                        <div key={k.label} className={styles.kpi}>
                            <div className={styles.kpiValue}>{k.value}</div>
                            <div className={styles.kpiLabel}>{k.label}</div>
                        </div>
                    ))}
                </div>
            ) : null}

            {overview ? <SetupChecklist overview={overview} /> : null}

            <Guide content={SUBSCRIPTIONS_GUIDE} />

            <TablePanel
                icon={<TbUsers size={16} />}
                title="اشتراک‌های کاربران"
                purpose="ببینید چه کسی روی چه پلنی است و اعتبارش کی تمام می‌شود."
                howTo="«رو به اتمام» را برای یادآوری تمدید فیلتر کنید؛ برای شکایت کاربر، ایمیلش را جستجو و روی نامش بزنید."
                toolbar={(
                    <>
                        <TableSearch className={etr.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder="ایمیل، نام، موبایل یا شناسه" />
                        <select className={etr.filterSelect} value={table.filters.status} onChange={(e) => table.setFilter('status', e.target.value)} aria-label="وضعیت">
                            {STATUS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                        <select className={etr.filterSelect} value={table.filters.planId} onChange={(e) => table.setFilter('planId', e.target.value)} aria-label="پلن">
                            <option value="">همه پلن‌ها</option>
                            {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <TotalLabel total={total} unit="اشتراک" />
                    </>
                )}
            >
                <TableBody
                    loading={loading}
                    empty={!rows.length}
                    filtered={table.filtered}
                    onReset={table.reset}
                    emptyText={<>هنوز اشتراکی ثبت نشده — با اولین ورود کاربران روی پلن پیش‌فرض، یا <button type="button" className={etr.linkBtn} onClick={() => setGrantOpen(true)}>اعطای دستی</button>.</>}
                >
                    <table className={etr.dataTable}>
                        <thead>
                            <tr>
                                <th>کاربر</th>
                                <th>پلن</th>
                                <th>وضعیت</th>
                                <SortHeader label="شروع" field="startsAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                                <SortHeader label="پایان" field="endsAt" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} hint="بعد از این تاریخ کاربر به پلن پیش‌فرض برمی‌گردد" />
                                <SortHeader label="ثبت" field="createdAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                                <th className={styles.actionsCell}>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(rows as SubscriptionRow[]).map((row) => {
                                const live = row.effectiveStatus === 'active' || row.effectiveStatus === 'trialing';
                                return (
                                    <tr key={row._id}>
                                        <td data-label="کاربر">
                                            <div className={styles.person}>
                                                <button type="button" className={styles.personName} onClick={() => setInspectUser(row.user._id)}>
                                                    {userLabel(row.user)}
                                                </button>
                                                {row.user.email && row.user.fullName ? <span className={`${styles.muted} ${styles.ltr}`}>{row.user.email}</span> : null}
                                            </div>
                                        </td>
                                        <td data-label="پلن">
                                            <div className={styles.person}>
                                                <span>{row.plan?.name || '—'}</span>
                                                {row.price ? (
                                                    <span className={styles.muted}>{PERIOD_LABELS[row.price.billingPeriod] || row.price.billingPeriod} · {money(row.price.price, row.price.currency)}</span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td data-label="وضعیت">
                                            <div className={styles.tags}>
                                                <span className={`${etr.statusBadge} ${STATUS_CLASS[row.effectiveStatus] || ''}`}>{STATUS_LABELS[row.effectiveStatus] || row.effectiveStatus}</span>
                                                {row.isTest ? <span className={`${styles.tag} ${styles.tagWarn}`}>تست</span> : null}
                                            </div>
                                        </td>
                                        <td data-label="شروع" className={etr.cellMuted} title={fullDate(row.startsAt)}>{relativeTime(row.startsAt)}</td>
                                        <td data-label="پایان" className={etr.cellMuted} title={fullDate(row.endsAt)}>{new Date(row.endsAt).toLocaleDateString('fa-IR')}</td>
                                        <td data-label="ثبت" className={etr.cellMuted} title={fullDate(row.createdAt)}>{relativeTime(row.createdAt)}</td>
                                        <td data-label="عملیات" className={styles.actionsCell}>
                                            <HrRowActionMenu
                                                rowId={row._id}
                                                ariaLabel={`عملیات اشتراک ${userLabel(row.user)}`}
                                                items={[
                                                    { label: 'سهمیه و مصرف کاربر', onClick: () => setInspectUser(row.user._id) },
                                                    { label: 'سابقه اشتراک‌های کاربر', onClick: () => table.setSearch(row.user._id) },
                                                    { label: 'تمدید ۷ روز', onClick: () => void extend(row, 7) },
                                                    { label: 'تمدید ۳۰ روز', onClick: () => void extend(row, 30) },
                                                    ...(live ? [{ label: 'لغو اشتراک', danger: true, onClick: () => setToCancel(row) }] : []),
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </TableBody>
                <TableFooter table={table} total={total} />
            </TablePanel>

            <GrantDialog open={grantOpen} onClose={() => setGrantOpen(false)} onDone={() => { setGrantOpen(false); refresh(); }} />
            <UserEntitlementsDialog userId={inspectUser} onClose={() => setInspectUser(null)} />
            <ConfirmDialog
                open={!!toCancel}
                title="لغو اشتراک"
                confirmLabel="لغو اشتراک"
                tone="danger"
                busy={busy}
                onConfirm={() => void cancel()}
                onClose={() => setToCancel(null)}
            >
                اشتراک «{toCancel?.plan?.name}» کاربر {userLabel(toCancel?.user)} همین حالا لغو شود؟ کاربر با اولین استفاده به پلن پیش‌فرض
                می‌رود. مبلغی برگشت داده نمی‌شود.
            </ConfirmDialog>
        </>
    );
}

export default function SubscriptionsTabPage() {
    return (
        <Suspense fallback={null}>
            <SubscriptionsContent />
        </Suspense>
    );
}
