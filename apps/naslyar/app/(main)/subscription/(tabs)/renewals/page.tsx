'use client';

import { Suspense, useEffect, useState } from 'react';
import { TbCalendarRepeat, TbReceiptRefund } from 'react-icons/tb';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import { TableBody, TableFooter, TablePanel, TotalLabel } from '@/app/(main)/(hosheton)/(blogger)/components/TableParts';
import { useTablePage } from '@/app/(main)/(hosheton)/(blogger)/lib/useTablePage';
import etr from '../../../error-tracking/ErrorTracking.module.scss';
import mk from '../../../marketing/Marketing.module.scss';
import { formatCount, fullDate } from '../../../error-tracking/lib/format';
import Guide from '../../components/Guide';
import TabIntro from '../../components/TabIntro';
import { RENEWALS_GUIDE } from '../../components/guides';
import { subscriptionApi, type TableQuery } from '../../lib/subscription-api';
import { useCachedState } from '../../lib/SubscriptionProvider';
import { money, PERIOD_LABELS } from '../../lib/format';
import styles from '../../Subscription.module.scss';

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
    pending: { label: 'در انتظار پرداخت', className: etr.statusRegressed },
    retrying: { label: 'تلاش مجدد', className: etr.statusRegressed },
    paid: { label: 'پرداخت‌شده', className: etr.statusResolved },
    failed: { label: 'ناموفق', className: etr.statusOpen },
    cancelled: { label: 'لغو شده', className: etr.statusIgnored },
};

const fetchOrders = (query: TableQuery) => subscriptionApi.renewalOrders(query).then((d) => ({
    rows: d?.renewalOrders || [],
    totalItems: d?.totalItems || 0,
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 10,
}));

type ConfirmAction = { id: string; action: 'pay' | 'cancel' } | null;

function RenewalsContent() {
    const table = useUrlTableState('r_', { sort: 'createdAt', filters: { status: '' } });
    const [revision, setRevision] = useState(0);
    const { rows, total, loading } = useTablePage(fetchOrders, table.query, revision);
    const [schedules, setSchedules] = useCachedState<any[] | null>('renewals:schedules', null);
    const [confirm, setConfirm] = useState<ConfirmAction>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        subscriptionApi.schedules().then((d) => setSchedules(d?.schedules || [])).catch(ErrorToaster);
    }, [revision, setSchedules]);

    const run = async (work: () => Promise<unknown>, message: string) => {
        try {
            setBusy(true);
            await work();
            SuccessToaster({ message });
            setConfirm(null);
            setRevision((r) => r + 1);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <TabIntro
                actions={(
                    <button
                        type="button"
                        className={mk.secondaryBtn}
                        disabled={busy}
                        onClick={() => void run(() => subscriptionApi.runRenewals(), 'سفارش‌های سررسید ساخته شد')}
                    >
                        اجرای سررسیدها
                    </button>
                )}
            >
                تمدید دوره‌ای اشتراک‌ها: زمان‌بندی‌ها و سفارش‌های تمدید. پرداخت سفارش را بعد از دریافت وجه ثبت کنید.
            </TabIntro>

            <Guide content={RENEWALS_GUIDE} />

            <section className={etr.panel}>
                <h3 className={etr.panelTitle}><TbCalendarRepeat size={16} /> زمان‌بندی‌های تمدید</h3>
                <div className={etr.panelGuide}>
                    <p><strong>به چه درد می‌خورد؟</strong> ببینید کدام اشتراک کی سفارش تمدید بعدی‌اش ساخته می‌شود.</p>
                    <p><strong>چطور استفاده کنم؟</strong> برای مشتری‌ای که موقتاً نمی‌خواهد تمدید شود «تعلیق» بزنید.</p>
                </div>
                {!schedules ? (
                    <div className={etr.tableEmpty}>در حال بارگذاری…</div>
                ) : schedules.length === 0 ? (
                    <div className={etr.tableEmpty}>هیچ اشتراکی تمدید خودکار ندارد. خریدهای عادی از صفحه قیمت‌ها نیازی به این بخش ندارند.</div>
                ) : (
                    <div className={`${etr.tableWrap} ${etr.tableWrapFlat}`}>
                        <table className={etr.dataTable}>
                            <thead>
                                <tr>
                                    <th>اشتراک</th>
                                    <th>دوره</th>
                                    <th>مبلغ</th>
                                    <th>شارژ بعدی</th>
                                    <th>وضعیت</th>
                                    <th className={styles.actionsCell}>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map((s) => (
                                    <tr key={s._id}>
                                        <td data-label="اشتراک" className={styles.code}>{String(s.subscriptionId).slice(-8)}</td>
                                        <td data-label="دوره">{PERIOD_LABELS[s.billingPeriod] || s.billingPeriod}</td>
                                        <td data-label="مبلغ">{money(s.amount, s.currency)}</td>
                                        <td data-label="شارژ بعدی" className={etr.cellMuted} title={fullDate(s.nextChargeAt)}>
                                            {s.nextChargeAt ? new Date(s.nextChargeAt).toLocaleDateString('fa-IR') : '—'}
                                        </td>
                                        <td data-label="وضعیت">
                                            {s.paused
                                                ? <span className={`${etr.statusBadge} ${etr.statusIgnored}`}>معلق</span>
                                                : s.autoRenew
                                                    ? <span className={`${etr.statusBadge} ${etr.statusResolved}`}>فعال</span>
                                                    : <span className={`${etr.statusBadge} ${etr.statusIgnored}`}>خاموش</span>}
                                        </td>
                                        <td data-label="عملیات" className={styles.actionsCell}>
                                            <HrRowActionMenu
                                                rowId={s._id}
                                                ariaLabel="عملیات زمان‌بندی"
                                                items={[{
                                                    label: s.paused ? 'ادامه تمدید' : 'تعلیق تمدید',
                                                    onClick: () => void run(() => subscriptionApi.toggleSchedule(s._id, !!s.paused), s.paused ? 'تمدید ادامه یافت' : 'تمدید معلق شد'),
                                                }]}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <TablePanel
                icon={<TbReceiptRefund size={16} />}
                title="سفارش‌های تمدید"
                purpose="هر سررسید یک سفارش می‌سازد؛ پرداختش اشتراک را یک دوره جلو می‌برد."
                howTo="«در انتظار پرداخت» را پیگیری کنید و بعد از دریافت وجه از منوی ⋯ «ثبت پرداخت» بزنید."
                toolbar={(
                    <>
                        <select className={etr.filterSelect} value={table.filters.status} onChange={(e) => table.setFilter('status', e.target.value)} aria-label="وضعیت">
                            <option value="">همه وضعیت‌ها</option>
                            {Object.entries(ORDER_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
                        </select>
                        <TotalLabel total={total} unit="سفارش" />
                    </>
                )}
            >
                <TableBody loading={loading} empty={!rows.length} filtered={table.filtered} onReset={table.reset} emptyText="سفارش تمدیدی ساخته نشده است.">
                    <table className={etr.dataTable}>
                        <thead>
                            <tr>
                                <th>اشتراک</th>
                                <th>مبلغ</th>
                                <th>دوره</th>
                                <th title="تعداد تلاش‌های پرداخت">تلاش</th>
                                <th>وضعیت</th>
                                <th className={styles.actionsCell}>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(rows as any[]).map((o) => {
                                const status = ORDER_STATUS[o.status] || { label: o.status, className: '' };
                                const open = o.status === 'pending' || o.status === 'retrying';
                                return (
                                    <tr key={o._id}>
                                        <td data-label="اشتراک" className={styles.code}>{String(o.subscriptionId).slice(-8)}</td>
                                        <td data-label="مبلغ" className={etr.cellStrong}>{money(o.amount, o.currency)}</td>
                                        <td data-label="دوره" className={etr.cellMuted}>
                                            {o.periodStart ? new Date(o.periodStart).toLocaleDateString('fa-IR') : '—'} تا {o.periodEnd ? new Date(o.periodEnd).toLocaleDateString('fa-IR') : '—'}
                                        </td>
                                        <td data-label="تلاش">{formatCount(o.attempts || 0)}</td>
                                        <td data-label="وضعیت"><span className={`${etr.statusBadge} ${status.className}`}>{status.label}</span></td>
                                        <td data-label="عملیات" className={styles.actionsCell}>
                                            {open ? (
                                                <HrRowActionMenu
                                                    rowId={o._id}
                                                    ariaLabel="عملیات سفارش تمدید"
                                                    items={[
                                                        { label: 'ثبت پرداخت', onClick: () => setConfirm({ id: o._id, action: 'pay' }) },
                                                        { label: 'تلاش مجدد', onClick: () => void run(() => subscriptionApi.renewalAction(o._id, 'retry'), 'تلاش مجدد ثبت شد') },
                                                        { label: 'لغو سفارش', danger: true, onClick: () => setConfirm({ id: o._id, action: 'cancel' }) },
                                                    ]}
                                                />
                                            ) : <span className={styles.muted}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </TableBody>
                <TableFooter table={table} total={total} />
            </TablePanel>

            <ConfirmDialog
                open={!!confirm}
                title={confirm?.action === 'pay' ? 'ثبت پرداخت تمدید' : 'لغو سفارش تمدید'}
                confirmLabel={confirm?.action === 'pay' ? 'ثبت پرداخت' : 'لغو سفارش'}
                tone={confirm?.action === 'pay' ? 'primary' : 'danger'}
                busy={busy}
                onConfirm={() => confirm && void run(
                    () => subscriptionApi.renewalAction(confirm.id, confirm.action),
                    confirm.action === 'pay' ? 'پرداخت ثبت و اشتراک تمدید شد' : 'سفارش لغو شد',
                )}
                onClose={() => setConfirm(null)}
            >
                {confirm?.action === 'pay'
                    ? 'وجه این سفارش دریافت شده است؟ با ثبت پرداخت، پایان اشتراک تا انتهای این دوره جلو می‌رود.'
                    : 'سفارش لغو شود؟ اشتراک فعلی تا تاریخ پایانش ادامه دارد ولی تمدید نمی‌شود.'}
            </ConfirmDialog>
        </>
    );
}

export default function RenewalsTabPage() {
    return (
        <Suspense fallback={null}>
            <RenewalsContent />
        </Suspense>
    );
}
