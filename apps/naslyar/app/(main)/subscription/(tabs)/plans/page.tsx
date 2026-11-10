'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TbPackages } from 'react-icons/tb';
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
import { PLANS_GUIDE } from '../../components/guides';
import { subscriptionApi, type SubscriptionOverview, type SubscriptionPlan } from '../../lib/subscription-api';
import { useCachedState, useSubscriptionModule } from '../../lib/SubscriptionProvider';
import { money, PERIOD_LABELS } from '../../lib/format';
import styles from '../../Subscription.module.scss';

export default function PlansTabPage() {
    const router = useRouter();
    const { plans, prices, loaded, reload } = useSubscriptionModule();
    const [overview, setOverview] = useCachedState<SubscriptionOverview | null>('subs:overview', null);
    const [toDelete, setToDelete] = useState<SubscriptionPlan | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        subscriptionApi.overview().then(setOverview).catch(() => null);
    }, [setOverview]);

    const activeByPlan = useMemo(() => new Map((overview?.byPlan || []).map((r) => [String(r.planId), r])), [overview]);
    const pricesOf = (planId: string) => prices.filter((p) => p.isAlive !== false && (typeof p.planId === 'string' ? p.planId : p.planId?._id) === planId);

    const setFlag = async (plan: SubscriptionPlan, body: Partial<SubscriptionPlan>, message: string) => {
        try {
            await subscriptionApi.updatePlan(plan._id, body);
            SuccessToaster({ message });
            reload();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const remove = async () => {
        if (!toDelete) return;
        try {
            setBusy(true);
            await subscriptionApi.deletePlan(toDelete._id);
            SuccessToaster({ message: 'پلن حذف شد' });
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
            <TabIntro actions={<Link href="/subscription/plans/new" className={mk.primaryBtn}>افزودن پلن</Link>}>
                بسته‌هایی که کاربر می‌خرد، به ترتیب نمایش در صفحه قیمت‌ها. سقف‌های هر پلن در «مقادیر پلن‌ها» و قیمتش در «قیمت‌ها».
            </TabIntro>

            <Guide content={PLANS_GUIDE} />

            {!loaded ? (
                <LoadingState />
            ) : plans.length === 0 ? (
                <TableEmptyState
                    icon={<TbPackages size={32} />}
                    title="هنوز پلنی ندارید"
                    description="اول یک پلن رایگان (پیش‌فرض) و بعد پلن‌های پولی بسازید."
                    primaryHref="/subscription/plans/new"
                    primaryLabel="افزودن پلن"
                />
            ) : (
                <section className={etr.panel}>
                    <h3 className={etr.panelTitle}><TbPackages size={16} /> پلن‌ها</h3>
                    <div className={etr.panelGuide}>
                        <p><strong>به چه درد می‌خورد؟</strong> ببینید کدام پلن فروش دارد، کدام پیش‌فرض است و کدام قیمت ندارد.</p>
                        <p><strong>چطور استفاده کنم؟</strong> پلن بدون قیمت در صفحه قیمت‌ها قابل خرید نیست — از منوی ⋯ «افزودن قیمت» را بزنید.</p>
                    </div>
                    <div className={`${etr.tableWrap} ${etr.tableWrapFlat}`}>
                        <table className={etr.dataTable}>
                            <thead>
                                <tr>
                                    <th>ترتیب</th>
                                    <th>پلن</th>
                                    <th>برچسب‌ها</th>
                                    <th>قیمت‌ها</th>
                                    <th title="اشتراک‌هایی که همین الان روی این پلن فعال‌اند">اشتراک فعال</th>
                                    <th className={styles.actionsCell}>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map((plan) => {
                                    const planPrices = pricesOf(plan._id);
                                    const stats = activeByPlan.get(plan._id);
                                    return (
                                        <tr key={plan._id}>
                                            <td data-label="ترتیب" className={etr.cellMuted}>{formatCount(plan.order || 0)}</td>
                                            <td data-label="پلن">
                                                <div className={styles.person}>
                                                    <Link href={`/subscription/plans/${plan._id}`} className={styles.personName}>{plan.name}</Link>
                                                    <span className={`${styles.muted} ${styles.code}`}>{plan.slug || 'بدون شناسه'}</span>
                                                </div>
                                            </td>
                                            <td data-label="برچسب‌ها">
                                                <div className={styles.tags}>
                                                    {plan.status === 'active'
                                                        ? <span className={`${etr.statusBadge} ${etr.statusResolved}`}>در فروش</span>
                                                        : <span className={`${etr.statusBadge} ${etr.statusIgnored}`}>غیرفعال</span>}
                                                    {plan.isDefault ? <span className={`${styles.tag} ${styles.tagBrand}`}>پیش‌فرض</span> : null}
                                                    {plan.isMostPopular ? <span className={`${styles.tag} ${styles.tagWarn}`}>محبوب‌ترین</span> : null}
                                                </div>
                                            </td>
                                            <td data-label="قیمت‌ها">
                                                {planPrices.length ? (
                                                    <div className={styles.person}>
                                                        {planPrices.map((p) => (
                                                            <span key={p._id} className={styles.muted}>{PERIOD_LABELS[p.billingPeriod] || p.billingPeriod}: {money(p.price, p.currency)}</span>
                                                        ))}
                                                    </div>
                                                ) : <span className={styles.warn}>بدون قیمت</span>}
                                            </td>
                                            <td data-label="اشتراک فعال">
                                                {stats ? <>{formatCount(stats.active)}{stats.paying ? <span className={styles.muted}> ({formatCount(stats.paying)} پولی)</span> : null}</> : '۰'}
                                            </td>
                                            <td data-label="عملیات" className={styles.actionsCell}>
                                                <HrRowActionMenu
                                                    rowId={plan._id}
                                                    ariaLabel={`عملیات پلن ${plan.name}`}
                                                    items={[
                                                        { label: 'ویرایش', onClick: () => router.push(`/subscription/plans/${plan._id}`) },
                                                        { label: 'مقادیر و سقف‌ها', onClick: () => router.push('/subscription/matrix') },
                                                        { label: 'افزودن قیمت', onClick: () => router.push(`/subscription/prices/new?planId=${plan._id}`) },
                                                        ...(!plan.isDefault && plan.status === 'active'
                                                            ? [{ label: 'پیش‌فرض کن', onClick: () => void setFlag(plan, { isDefault: true }, `«${plan.name}» پلن پیش‌فرض شد`) }]
                                                            : []),
                                                        plan.status === 'active'
                                                            ? { label: 'غیرفعال کن (پنهان از قیمت‌ها)', onClick: () => void setFlag(plan, { status: 'inactive' }, 'پلن غیرفعال شد') }
                                                            : { label: 'فعال کن', onClick: () => void setFlag(plan, { status: 'active' }, 'پلن فعال شد') },
                                                        ...(!stats?.active ? [{ label: 'حذف', danger: true, onClick: () => setToDelete(plan) }] : []),
                                                    ]}
                                                />
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
                title="حذف پلن"
                confirmLabel="حذف"
                tone="danger"
                busy={busy}
                onConfirm={() => void remove()}
                onClose={() => setToDelete(null)}
            >
                پلن «{toDelete?.name}» با قیمت‌ها و مقادیرش حذف شود؟ اگر کسی قبلاً این پلن را داشته، حذف انجام نمی‌شود — به‌جایش
                غیرفعالش کنید.
            </ConfirmDialog>
        </>
    );
}
