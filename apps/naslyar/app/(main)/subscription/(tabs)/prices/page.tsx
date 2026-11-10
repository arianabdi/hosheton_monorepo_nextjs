'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TbReceipt } from 'react-icons/tb';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import etr from '../../../error-tracking/ErrorTracking.module.scss';
import mk from '../../../marketing/Marketing.module.scss';
import { formatCount } from '../../../error-tracking/lib/format';
import Guide from '../../components/Guide';
import TabIntro from '../../components/TabIntro';
import { PRICES_GUIDE } from '../../components/guides';
import { subscriptionApi, type PlanPrice } from '../../lib/subscription-api';
import { useSubscriptionModule } from '../../lib/SubscriptionProvider';
import { fa, money, PERIOD_LABELS, PERIOD_MONTHS } from '../../lib/format';
import styles from '../../Subscription.module.scss';

const planIdOf = (p: PlanPrice) => (typeof p.planId === 'string' ? p.planId : p.planId?._id);

export default function PricesTabPage() {
    const router = useRouter();
    const { plans, prices, loaded, reload } = useSubscriptionModule();
    const [planFilter, setPlanFilter] = useState('');
    const [toDelete, setToDelete] = useState<PlanPrice | null>(null);
    const [busy, setBusy] = useState(false);

    const planName = useMemo(() => new Map(plans.map((p) => [p._id, p])), [plans]);
    const rows = useMemo(() => prices
        .filter((p) => !planFilter || planIdOf(p) === planFilter)
        .sort((a, b) => (planName.get(planIdOf(a) || '')?.order || 0) - (planName.get(planIdOf(b) || '')?.order || 0)
            || (PERIOD_MONTHS[a.billingPeriod] || 0) - (PERIOD_MONTHS[b.billingPeriod] || 0)),
    [prices, planFilter, planName]);

    /** «۱۷٪ صرفه‌جویی» نسبت به قیمت ماهانه همان پلن — همان محاسبه صفحه قیمت‌های اپ */
    const savingOf = (price: PlanPrice) => {
        const months = PERIOD_MONTHS[price.billingPeriod] || 1;
        if (months <= 1 || !price.price) return null;
        const monthly = prices.find((p) => planIdOf(p) === planIdOf(price) && p.billingPeriod === 'monthly' && p.currency === price.currency && p.isAlive !== false);
        if (!monthly?.price) return null;
        const percent = Math.round((1 - price.price / (monthly.price * months)) * 100);
        return percent > 0 ? percent : null;
    };

    const remove = async () => {
        if (!toDelete) return;
        try {
            setBusy(true);
            await subscriptionApi.deletePrice(toDelete._id);
            SuccessToaster({ message: 'قیمت حذف شد' });
            setToDelete(null);
            reload();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <TabIntro actions={<Link href="/subscription/prices/new" className={mk.primaryBtn}>افزودن قیمت</Link>}>
                مبلغ هر پلن برای هر دوره. صفحه قیمت‌های اپ دوره‌ها را کنار هم نشان می‌دهد و صرفه‌جویی را خودش حساب می‌کند.
            </TabIntro>

            <Guide content={PRICES_GUIDE} />

            {!loaded ? (
                <LoadingState />
            ) : prices.length === 0 ? (
                <TableEmptyState
                    icon={<TbReceipt size={32} />}
                    title="هنوز قیمتی ثبت نشده"
                    description="هر پلن دست‌کم یک قیمت لازم دارد (پلن رایگان: ماهانه ۰)."
                    primaryHref="/subscription/prices/new"
                    primaryLabel="افزودن قیمت"
                />
            ) : (
                <section className={etr.panel}>
                    <h3 className={etr.panelTitle}><TbReceipt size={16} /> قیمت‌ها</h3>
                    <div className={etr.panelGuide}>
                        <p><strong>به چه درد می‌خورد؟</strong> همهٔ دوره‌های قابل خرید را با صرفه‌جویی نسبت به ماهانه ببینید.</p>
                        <p><strong>چطور استفاده کنم؟</strong> برای تغییر مبلغ «ویرایش» بزنید؛ از خرید بعدی اعمال می‌شود.</p>
                    </div>
                    <div className={etr.tableToolbar}>
                        <select className={etr.filterSelect} value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} aria-label="پلن">
                            <option value="">همه پلن‌ها</option>
                            {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <span className={etr.toolbarCount}>{formatCount(rows.length)} قیمت</span>
                    </div>
                    <div className={`${etr.tableWrap} ${etr.tableWrapFlat}`}>
                        <table className={etr.dataTable}>
                            <thead>
                                <tr>
                                    <th>پلن</th>
                                    <th>دوره</th>
                                    <th>مبلغ</th>
                                    <th title="نسبت به ۱۲ (یا n) برابر قیمت ماهانه همان پلن">صرفه‌جویی</th>
                                    <th>وضعیت</th>
                                    <th className={styles.actionsCell}>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((price) => {
                                    const saving = savingOf(price);
                                    const alive = price.isAlive !== false;
                                    return (
                                        <tr key={price._id}>
                                            <td data-label="پلن">{planName.get(planIdOf(price) || '')?.name || (typeof price.planId === 'object' ? price.planId?.name : '—')}</td>
                                            <td data-label="دوره">{PERIOD_LABELS[price.billingPeriod] || price.billingPeriod}</td>
                                            <td data-label="مبلغ" className={etr.cellStrong}>{money(price.price, price.currency)}</td>
                                            <td data-label="صرفه‌جویی" className={etr.cellMuted}>{saving ? `${fa(saving)}٪` : '—'}</td>
                                            <td data-label="وضعیت">
                                                {alive
                                                    ? <span className={`${etr.statusBadge} ${etr.statusResolved}`}>در فروش</span>
                                                    : <span className={`${etr.statusBadge} ${etr.statusIgnored}`} title="کسانی با این قیمت خریده‌اند؛ برای حفظ سابقه حذف نشد">از فروش خارج</span>}
                                            </td>
                                            <td data-label="عملیات" className={styles.actionsCell}>
                                                {alive ? (
                                                    <HrRowActionMenu
                                                        rowId={price._id}
                                                        ariaLabel="عملیات قیمت"
                                                        items={[
                                                            { label: 'ویرایش', onClick: () => router.push(`/subscription/prices/${price._id}`) },
                                                            { label: 'حذف', danger: true, onClick: () => setToDelete(price) },
                                                        ]}
                                                    />
                                                ) : <span className={styles.muted}>—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <ConfirmDialog
                open={!!toDelete}
                title="حذف قیمت"
                confirmLabel="حذف"
                tone="danger"
                busy={busy}
                onConfirm={() => void remove()}
                onClose={() => setToDelete(null)}
            >
                این قیمت از صفحه قیمت‌ها برداشته شود؟ اگر کسی با آن خریده باشد، فقط «از فروش خارج» می‌شود.
            </ConfirmDialog>
        </>
    );
}
