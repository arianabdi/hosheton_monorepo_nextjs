'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {LuCreditCard, LuLayers, LuUsers} from 'react-icons/lu';
import styles from '../Filkosh.module.scss';
import {Container, Wrapper} from '@/app/(main)/layout';
import {ErrorToaster, SuccessToaster, toFarsiNumber} from '@my-workspace/utils';
import {LoadingState, Pagination} from '@my-workspace/components';
import TableTheme from '@my-workspace/components/src/TableTheme/TableTheme';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import {
    BILLING_PERIOD_LABELS,
    filkoshApi,
    BillingPeriod,
    PlanPrice,
    SubscriptionFeature,
    SubscriptionPlan,
    SubscriptionRow,
    FilkoshUserRow,
} from '../lib/filkosh-api';
import ModuleGuide from '../components/ModuleGuide';
import {FILKOSH_GUIDES} from '../components/guides';
import FilterBar from '../components/FilterBar';
import {useClientPaging} from '../components/useClientPaging';
import {useLoadOnMount} from '../components/useLoadOnMount';

type Tab = 'plans' | 'users' | 'features';

/** مقادیر فیچرهای انتخاب‌شده برای پلن — کلید = featureId */
type FeatureValues = Record<string, string | boolean>;

const EMPTY_PLAN_FILTERS = {q: '', status: ''};
const EMPTY_USER_FILTERS = {q: '', status: '', planId: ''};
const EMPTY_FEATURE_FILTERS = {q: '', type: ''};

const STATUS_LABELS: Record<string, string> = {
    active: 'فعال',
    trialing: 'آزمایشی',
    canceled: 'لغو شده',
    expired: 'منقضی',
};

export default function FilkoshSubscriptionsPage() {
    const [tab, setTab] = useState<Tab>('plans');
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [prices, setPrices] = useState<PlanPrice[]>([]);
    const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
    const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [planFilters, setPlanFilters] = useState(EMPTY_PLAN_FILTERS);
    const [userFilters, setUserFilters] = useState(EMPTY_USER_FILTERS);
    const [featureFilters, setFeatureFilters] = useState(EMPTY_FEATURE_FILTERS);

    // ---- plan form ----
    const [planForm, setPlanForm] = useState({name: '', description: '', status: 'active', order: 0});
    const [planFeatureValues, setPlanFeatureValues] = useState<FeatureValues>({});
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

    // ---- price form (برای پلنی که در حال ویرایش است) ----
    const [priceForm, setPriceForm] = useState<{billingPeriod: BillingPeriod; price: number; currency: string}>({
        billingPeriod: 'monthly',
        price: 0,
        currency: 'IRT',
    });

    // ---- grant form ----
    const [grantForm, setGrantForm] = useState({userId: '', planId: '', planPriceId: ''});
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState<FilkoshUserRow[]>([]);

    // ---- feature form ----
    const [featureForm, setFeatureForm] = useState({name: '', code: '', type: 'quantity', unit: ''});

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [p, pr, f, s] = await Promise.all([
                filkoshApi.listPlans(),
                filkoshApi.listPlanPrices(),
                filkoshApi.listFeatures(),
                filkoshApi.listSubscriptions(),
            ]);
            setPlans(p);
            setPrices(pr);
            setFeatures(f);
            setSubscriptions(s);
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useLoadOnMount(load);

    /** مقدار فیچر یک پلن را برمی‌گرداند (برای ستون‌های جدول) */
    const planFeatureValue = (plan: SubscriptionPlan, code: string): string => {
        const pf = (plan.features || []).find((f) => {
            const fid = typeof f.featureId === 'object' ? (f.featureId as SubscriptionFeature)?._id : f.featureId;
            const feat = features.find((x) => x._id === fid);
            return feat?.code === code;
        });
        if (!pf) return '—';
        const num = Number(pf.value);
        return Number.isFinite(num) && code !== 'premium_servers'
            ? toFarsiNumber(num)
            : pf.value === true || pf.value === 'true'
              ? 'دارد'
              : 'ندارد';
    };

    const filteredPlans = useMemo(() => {
        const q = planFilters.q.trim().toLowerCase();
        return plans.filter((p) => {
            if (planFilters.status && p.status !== planFilters.status) return false;
            if (!q) return true;
            return p.name.toLowerCase().includes(q);
        });
    }, [plans, planFilters]);

    const filteredSubs = useMemo(() => {
        const q = userFilters.q.trim().toLowerCase();
        return subscriptions.filter((s) => {
            if (userFilters.status && s.status !== userFilters.status) return false;
            const planId = typeof s.planId === 'object' ? (s.planId as {_id: string})?._id : s.planId;
            if (userFilters.planId && planId !== userFilters.planId) return false;
            if (!q) return true;
            const mobile = s.user?.mobile || '';
            const fullName = s.user?.fullName || '';
            const planName = typeof s.planId === 'object' ? ((s.planId as {_id: string; name: string})?.name || '') : '';
            return mobile.includes(q) || fullName.toLowerCase().includes(q) || planName.toLowerCase().includes(q);
        });
    }, [subscriptions, userFilters]);

    const filteredFeatures = useMemo(() => {
        const q = featureFilters.q.trim().toLowerCase();
        return features.filter((f) => {
            if (featureFilters.type && f.type !== featureFilters.type) return false;
            if (!q) return true;
            return f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q);
        });
    }, [features, featureFilters]);

    const planPaging = useClientPaging(filteredPlans);
    const userPaging = useClientPaging(filteredSubs);
    const featurePaging = useClientPaging(filteredFeatures);

    const changePlanFilter = (key: string, value: string) => {
        setPlanFilters((prev) => ({...prev, [key]: value}));
        planPaging.resetPage();
    };
    const changeUserFilter = (key: string, value: string) => {
        setUserFilters((prev) => ({...prev, [key]: value}));
        userPaging.resetPage();
    };
    const changeFeatureFilter = (key: string, value: string) => {
        setFeatureFilters((prev) => ({...prev, [key]: value}));
        featurePaging.resetPage();
    };

    const resetPlanForm = () => {
        setEditingPlanId(null);
        setPlanForm({name: '', description: '', status: 'active', order: 0});
        setPlanFeatureValues({});
    };

    const buildFeaturesPayload = () =>
        Object.entries(planFeatureValues)
            .filter(([, v]) => v !== '' && v !== false)
            .map(([featureId, value]) => ({featureId, value: value === true ? true : Number(value)}));

    const submitPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            const body = {...planForm, order: Number(planForm.order) || 0, features: buildFeaturesPayload()};
            if (editingPlanId) {
                await filkoshApi.updatePlan(editingPlanId, body);
                SuccessToaster({message: 'پلن بروزرسانی شد'});
            } else {
                await filkoshApi.createPlan(body);
                SuccessToaster({message: 'پلن ساخته شد — حالا برایش قیمت تعریف کنید'});
            }
            resetPlanForm();
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const startEditPlan = async (plan: SubscriptionPlan) => {
        try {
            const detail = await filkoshApi.getPlan(plan._id);
            setEditingPlanId(plan._id);
            setPlanForm({
                name: plan.name,
                description: plan.description || '',
                status: plan.status || 'active',
                order: plan.order || 0,
            });
            const values: FeatureValues = {};
            for (const pf of detail.features || []) {
                const fid = typeof pf.featureId === 'object' ? (pf.featureId as SubscriptionFeature)?._id : pf.featureId;
                if (fid) values[String(fid)] = pf.value as string | boolean;
            }
            setPlanFeatureValues(values);
            setTab('plans');
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const deletePlan = async (plan: SubscriptionPlan) => {
        if (!confirm(`حذف پلن «${plan.name}»؟ قیمت‌ها و فیچرهایش هم حذف می‌شوند.`)) return;
        try {
            await filkoshApi.deletePlan(plan._id);
            if (editingPlanId === plan._id) resetPlanForm();
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const submitPrice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlanId) return;
        try {
            setBusy(true);
            await filkoshApi.createPlanPrice({...priceForm, planId: editingPlanId, price: Number(priceForm.price)});
            SuccessToaster({message: 'قیمت پلن اضافه شد'});
            setPriceForm({billingPeriod: 'monthly', price: 0, currency: 'IRT'});
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const deletePrice = async (price: PlanPrice) => {
        if (!confirm('حذف این قیمت؟')) return;
        try {
            await filkoshApi.deletePlanPrice(price._id);
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const searchUsers = async () => {
        try {
            const q = userSearch.trim();
            const {users} = await filkoshApi.listUsers({limit: 50, ...(q ? {mobile: q} : {})});
            const needle = q.toLowerCase();
            const list = q ? users.filter((u) => (u.mobile || '').includes(q) || (u.fullName || '').toLowerCase().includes(needle)) : users;
            setUserResults(list);
            if (!list.length) SuccessToaster({message: 'کاربری پیدا نشد'});
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const submitGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            await filkoshApi.grantSubscription(grantForm);
            SuccessToaster({message: 'اشتراک فعال شد'});
            setGrantForm({userId: '', planId: '', planPriceId: ''});
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const revokeSubscription = async (sub: SubscriptionRow) => {
        if (!confirm('لغو این اشتراک؟')) return;
        try {
            await filkoshApi.revokeSubscription(sub._id);
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const submitFeature = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            await filkoshApi.createFeature({
                ...featureForm,
                type: featureForm.type as 'boolean' | 'quantity',
                group: {title: 'فیلکوش', slug: 'filkosh'},
            });
            SuccessToaster({message: 'فیچر ساخته شد'});
            setFeatureForm({name: '', code: '', type: 'quantity', unit: ''});
            await load();
        } catch (err) {
            ErrorToaster(err);
        } finally {
            setBusy(false);
        }
    };

    const deleteFeature = async (feature: SubscriptionFeature) => {
        if (!confirm(`حذف فیچر «${feature.name}»؟ مقدارش از همه پلن‌ها هم حذف می‌شود.`)) return;
        try {
            await filkoshApi.deleteFeature(feature._id);
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const grantPlan = plans.find((p) => p._id === grantForm.planId);
    const grantPrices = prices.filter((pr) => {
        const pid = typeof pr.planId === 'object' ? (pr.planId as {_id: string})?._id : pr.planId;
        return pid === grantForm.planId;
    });
    const editingPrices = prices.filter((pr) => {
        const pid = typeof pr.planId === 'object' ? (pr.planId as {_id: string})?._id : pr.planId;
        return pid === editingPlanId;
    });
    const planOptions = plans.map((p) => ({value: p._id, label: p.name}));

    useEffect(() => {
        setGrantForm((f) => ({...f, planPriceId: ''}));
    }, [grantForm.planId]);

    if (loading) {
        return (
            <Container>
                <Wrapper>
                    <div className={`${styles.container} ${styles.rtl}`}>
                        <header className={styles.header}>
                            <div>
                                <h1 className={styles.mainTitle}>اشتراک‌ها</h1>
                                <p className={styles.subtitle}>پلن‌ها، قیمت‌ها، فیچرها و اشتراک کاربران.</p>
                            </div>
                        </header>
                        <ModuleGuide guide={FILKOSH_GUIDES.subscriptions} />
                        <div className={styles.loadingPad}>
                            <LoadingState />
                        </div>
                    </div>
                </Wrapper>
            </Container>
        );
    }

    return (
        <Container>
            <Wrapper>
                <div className={`${styles.container} ${styles.rtl}`}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.mainTitle}>اشتراک‌ها</h1>
                            <p className={styles.subtitle}>
                                پلن‌ها و قیمت‌ها روی سیستم اشتراک مرکزی؛ فیچرها سقف دستگاه، ترافیک و سرورهای پریمیوم را کنترل می‌کنند.
                            </p>
                        </div>
                    </header>

                    <ModuleGuide guide={FILKOSH_GUIDES.subscriptions} />

                    <div className={styles.tabs}>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${tab === 'plans' ? styles.tabActive : ''}`}
                            onClick={() => setTab('plans')}
                        >
                            پلن‌ها ({toFarsiNumber(plans.length)})
                        </button>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${tab === 'users' ? styles.tabActive : ''}`}
                            onClick={() => setTab('users')}
                        >
                            اشتراک کاربران ({toFarsiNumber(subscriptions.length)})
                        </button>
                        <button
                            type="button"
                            className={`${styles.tabBtn} ${tab === 'features' ? styles.tabActive : ''}`}
                            onClick={() => setTab('features')}
                        >
                            فیچرها ({toFarsiNumber(features.length)})
                        </button>
                    </div>

                    {tab === 'plans' && (
                        <>
                            <form onSubmit={submitPlan} className={styles.formPanel}>
                                <div className={styles.formGrid}>
                                    <label className={styles.field}>
                                        <span>نام پلن</span>
                                        <input
                                            required
                                            value={planForm.name}
                                            onChange={(e) => setPlanForm((f) => ({...f, name: e.target.value}))}
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>توضیح</span>
                                        <input
                                            value={planForm.description}
                                            onChange={(e) => setPlanForm((f) => ({...f, description: e.target.value}))}
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>وضعیت</span>
                                        <select value={planForm.status} onChange={(e) => setPlanForm((f) => ({...f, status: e.target.value}))}>
                                            <option value="active">فعال</option>
                                            <option value="inactive">غیرفعال</option>
                                        </select>
                                    </label>
                                    <label className={styles.field}>
                                        <span>ترتیب نمایش</span>
                                        <input
                                            type="number"
                                            dir="ltr"
                                            value={planForm.order}
                                            onChange={(e) => setPlanForm((f) => ({...f, order: Number(e.target.value)}))}
                                        />
                                    </label>
                                </div>

                                {features.length > 0 && (
                                    <div className={styles.formGrid}>
                                        {features.map((f) => (
                                            <label key={f._id} className={styles.field}>
                                                <span>
                                                    {f.name}
                                                    {f.unit ? ` (${f.unit})` : ''}
                                                </span>
                                                {f.type === 'boolean' ? (
                                                    <select
                                                        value={planFeatureValues[f._id] === true || planFeatureValues[f._id] === 'true' ? 'true' : 'false'}
                                                        onChange={(e) =>
                                                            setPlanFeatureValues((prev) => ({...prev, [f._id]: e.target.value === 'true'}))
                                                        }
                                                    >
                                                        <option value="false">ندارد</option>
                                                        <option value="true">دارد</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        dir="ltr"
                                                        placeholder={'نامحدود / خالی'}
                                                        value={typeof planFeatureValues[f._id] === 'boolean' ? '' : String(planFeatureValues[f._id] ?? '')}
                                                        onChange={(e) => setPlanFeatureValues((prev) => ({...prev, [f._id]: e.target.value}))}
                                                    />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                <div className={styles.formActions}>
                                    <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                        {editingPlanId ? 'ذخیره تغییرات' : 'پلن جدید'}
                                    </button>
                                    {editingPlanId ? (
                                        <button type="button" className={styles.secondaryBtn} onClick={resetPlanForm}>
                                            انصراف
                                        </button>
                                    ) : null}
                                </div>
                            </form>

                            {editingPlanId && (
                                <form onSubmit={submitPrice} className={styles.formPanel}>
                                    <div className={styles.formGrid}>
                                        <label className={styles.field}>
                                            <span>دوره صورتحساب (قیمت جدید برای پلن انتخابی)</span>
                                            <select
                                                value={priceForm.billingPeriod}
                                                onChange={(e) => setPriceForm((f) => ({...f, billingPeriod: e.target.value as BillingPeriod}))}
                                            >
                                                {Object.entries(BILLING_PERIOD_LABELS).map(([value, label]) => (
                                                    <option key={value} value={value}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className={styles.field}>
                                            <span>قیمت</span>
                                            <input
                                                required
                                                type="number"
                                                min={0}
                                                dir="ltr"
                                                value={priceForm.price}
                                                onChange={(e) => setPriceForm((f) => ({...f, price: Number(e.target.value)}))}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            <span>ارز</span>
                                            <select value={priceForm.currency} onChange={(e) => setPriceForm((f) => ({...f, currency: e.target.value}))}>
                                                <option value="IRT">تومان</option>
                                                <option value="USD">دلار</option>
                                            </select>
                                        </label>
                                    </div>
                                    <div className={styles.formActions}>
                                        <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                            افزودن قیمت
                                        </button>
                                    </div>
                                    {editingPrices.length > 0 && (
                                        <TableTheme>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>دوره</th>
                                                        <th>قیمت</th>
                                                        <th>ارز</th>
                                                        <th>عملیات</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {editingPrices.map((pr) => (
                                                        <tr key={pr._id}>
                                                            <td data-label="دوره">{BILLING_PERIOD_LABELS[pr.billingPeriod] || pr.billingPeriod}</td>
                                                            <td data-label="قیمت">{toFarsiNumber(pr.price.toLocaleString('fa-IR'))}</td>
                                                            <td data-label="ارز">{pr.currency === 'IRT' ? 'تومان' : 'دلار'}</td>
                                                            <td data-label="عملیات">
                                                                <HrRowActionMenu
                                                                    rowId={pr._id}
                                                                    items={[{label: 'حذف', danger: true, onClick: () => void deletePrice(pr)}]}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </TableTheme>
                                    )}
                                </form>
                            )}

                            <FilterBar
                                fields={[
                                    {key: 'q', type: 'search', label: 'جستجو', placeholder: 'نام پلن…'},
                                    {
                                        key: 'status',
                                        type: 'select',
                                        label: 'وضعیت',
                                        allLabel: 'همه وضعیت‌ها',
                                        options: [
                                            {value: 'active', label: 'فعال'},
                                            {value: 'inactive', label: 'غیرفعال'},
                                        ],
                                    },
                                ]}
                                values={planFilters}
                                onChange={changePlanFilter}
                                onApply={() => planPaging.resetPage()}
                                onReset={() => {
                                    setPlanFilters(EMPTY_PLAN_FILTERS);
                                    planPaging.resetPage();
                                }}
                                resultCount={filteredPlans.length}
                                resultLabel="پلن"
                            />

                            {filteredPlans.length === 0 ? (
                                <TableEmptyState
                                    icon={<LuCreditCard size={32} />}
                                    title={planFilters.q || planFilters.status ? 'پلنی یافت نشد' : 'هنوز پلنی ثبت نشده'}
                                    description="اولین پلن اشتراک را از فرم بالا بسازید."
                                    secondaryLabel={planFilters.q || planFilters.status ? 'پاک کردن فیلترها' : undefined}
                                    onSecondaryClick={
                                        planFilters.q || planFilters.status
                                            ? () => {
                                                  setPlanFilters(EMPTY_PLAN_FILTERS);
                                                  planPaging.resetPage();
                                              }
                                            : undefined
                                    }
                                />
                            ) : (
                                <>
                                    <TableTheme>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>نام</th>
                                                    <th>قیمت‌ها</th>
                                                    <th>دستگاه</th>
                                                    <th>ترافیک (GB)</th>
                                                    <th>پریمیوم</th>
                                                    <th>وضعیت</th>
                                                    <th>عملیات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {planPaging.pageItems.map((p) => {
                                                    const planPrices = prices.filter((pr) => {
                                                        const pid = typeof pr.planId === 'object' ? (pr.planId as {_id: string})?._id : pr.planId;
                                                        return pid === p._id;
                                                    });
                                                    return (
                                                        <tr key={p._id}>
                                                            <td data-label="نام" className={styles.cellPrimary}>
                                                                {p.name}
                                                            </td>
                                                            <td data-label="قیمت‌ها">
                                                                {planPrices.length
                                                                    ? planPrices
                                                                          .map(
                                                                              (pr) =>
                                                                                  `${pr.price.toLocaleString('fa-IR')} ${pr.currency === 'IRT' ? 'تومان' : '$'} — ${
                                                                                      BILLING_PERIOD_LABELS[pr.billingPeriod] || pr.billingPeriod
                                                                                  }`,
                                                                          )
                                                                          .join(' · ')
                                                                    : '—'}
                                                            </td>
                                                            <td data-label="دستگاه">{planFeatureValue(p, 'max_devices')}</td>
                                                            <td data-label="ترافیک (GB)">{planFeatureValue(p, 'traffic_gb')}</td>
                                                            <td data-label="پریمیوم">{planFeatureValue(p, 'premium_servers')}</td>
                                                            <td data-label="وضعیت">
                                                                <span className={`${styles.badge} ${p.status === 'active' ? styles.badgeSuccess : styles.badgeMuted}`}>
                                                                    {p.status === 'active' ? 'فعال' : 'غیرفعال'}
                                                                </span>
                                                            </td>
                                                            <td data-label="عملیات">
                                                                <HrRowActionMenu
                                                                    rowId={p._id}
                                                                    items={[
                                                                        {label: 'ویرایش', onClick: () => void startEditPlan(p)},
                                                                        {label: 'حذف', danger: true, onClick: () => void deletePlan(p)},
                                                                    ]}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </TableTheme>
                                    <div className={styles.paginationSpace}>
                                        <Pagination
                                            rtl
                                            itemPerPage={planPaging.itemPerPage}
                                            totalItems={planPaging.totalItems}
                                            currentPage={planPaging.currentPage}
                                            paginate={planPaging.paginate}
                                            setRowsPerPage={planPaging.setRowsPerPage}
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {tab === 'users' && (
                        <>
                            <form onSubmit={submitGrant} className={styles.formPanel}>
                                <div className={styles.formGrid}>
                                    <label className={styles.field}>
                                        <span>جستجوی کاربر (موبایل یا نام — از بخش کاربران)</span>
                                        <div style={{display: 'flex', gap: 8}}>
                                            <input
                                                dir="ltr"
                                                placeholder="0912…"
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                            />
                                            <button type="button" className={styles.secondaryBtn} onClick={() => void searchUsers()}>
                                                جستجو
                                            </button>
                                        </div>
                                    </label>
                                    <label className={styles.field}>
                                        <span>کاربر</span>
                                        <select
                                            required
                                            value={grantForm.userId}
                                            onChange={(e) => setGrantForm((f) => ({...f, userId: e.target.value}))}
                                        >
                                            <option value="">انتخاب کنید…</option>
                                            {userResults.map((u) => (
                                                <option key={u._id} value={u._id}>
                                                    {u.mobile || u.fullName || u._id}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className={styles.field}>
                                        <span>پلن</span>
                                        <select
                                            required
                                            value={grantForm.planId}
                                            onChange={(e) => setGrantForm((f) => ({...f, planId: e.target.value}))}
                                        >
                                            <option value="">انتخاب کنید…</option>
                                            {planOptions.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className={styles.field}>
                                        <span>دوره صورتحساب</span>
                                        <select
                                            required
                                            value={grantForm.planPriceId}
                                            onChange={(e) => setGrantForm((f) => ({...f, planPriceId: e.target.value}))}
                                            disabled={!grantPlan}
                                        >
                                            <option value="">انتخاب کنید…</option>
                                            {grantPrices.map((pr) => (
                                                <option key={pr._id} value={pr._id}>
                                                    {BILLING_PERIOD_LABELS[pr.billingPeriod] || pr.billingPeriod} — {pr.price.toLocaleString('fa-IR')}{' '}
                                                    {pr.currency === 'IRT' ? 'تومان' : 'دلار'}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <div className={styles.formActions}>
                                    <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                        فعال‌سازی اشتراک
                                    </button>
                                </div>
                            </form>

                            <FilterBar
                                fields={[
                                    {key: 'q', type: 'search', label: 'جستجو', placeholder: 'موبایل، نام یا پلن…'},
                                    {key: 'planId', type: 'select', label: 'پلن', allLabel: 'همه پلن‌ها', options: planOptions},
                                    {
                                        key: 'status',
                                        type: 'select',
                                        label: 'وضعیت',
                                        allLabel: 'همه وضعیت‌ها',
                                        options: Object.entries(STATUS_LABELS).map(([value, label]) => ({value, label})),
                                    },
                                ]}
                                values={userFilters}
                                onChange={changeUserFilter}
                                onApply={() => userPaging.resetPage()}
                                onReset={() => {
                                    setUserFilters(EMPTY_USER_FILTERS);
                                    userPaging.resetPage();
                                }}
                                resultCount={filteredSubs.length}
                                resultLabel="اشتراک"
                            />

                            {filteredSubs.length === 0 ? (
                                <TableEmptyState
                                    icon={<LuUsers size={32} />}
                                    title={Object.values(userFilters).some(Boolean) ? 'اشتراکی یافت نشد' : 'هنوز اشتراکی ثبت نشده'}
                                    description="برای کاربر، پلن و دوره را انتخاب و اشتراک را فعال کنید."
                                    secondaryLabel={Object.values(userFilters).some(Boolean) ? 'پاک کردن فیلترها' : undefined}
                                    onSecondaryClick={
                                        Object.values(userFilters).some(Boolean)
                                            ? () => {
                                                  setUserFilters(EMPTY_USER_FILTERS);
                                                  userPaging.resetPage();
                                              }
                                            : undefined
                                    }
                                />
                            ) : (
                                <>
                                    <TableTheme>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>کاربر</th>
                                                    <th>پلن</th>
                                                    <th>شروع</th>
                                                    <th>انقضا</th>
                                                    <th>وضعیت</th>
                                                    <th>عملیات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userPaging.pageItems.map((s) => {
                                                    const price = typeof s.planPriceId === 'object' ? s.planPriceId : null;
                                                    return (
                                                        <tr key={s._id}>
                                                            <td data-label="کاربر" className={styles.cellLtr}>
                                                                {s.user?.mobile || s.user?.fullName || String(typeof s.userId === 'object' ? (s.userId as {_id: string})?._id : s.userId)}
                                                            </td>
                                                            <td data-label="پلن">
                                                                {(typeof s.planId === 'object' ? (s.planId as {name: string})?.name : '') || '—'}
                                                                {price ? ` · ${BILLING_PERIOD_LABELS[price.billingPeriod] || price.billingPeriod}` : ''}
                                                            </td>
                                                            <td data-label="شروع">{new Date(s.startsAt).toLocaleDateString('fa-IR')}</td>
                                                            <td data-label="انقضا">{new Date(s.endsAt).toLocaleDateString('fa-IR')}</td>
                                                            <td data-label="وضعیت">
                                                                <span
                                                                    className={`${styles.badge} ${
                                                                        s.status === 'active'
                                                                            ? styles.badgeSuccess
                                                                            : s.status === 'trialing'
                                                                              ? styles.badgeWarning
                                                                              : styles.badgeMuted
                                                                    }`}
                                                                >
                                                                    {STATUS_LABELS[s.status] || s.status}
                                                                </span>
                                                            </td>
                                                            <td data-label="عملیات">
                                                                {s.status === 'active' || s.status === 'trialing' ? (
                                                                    <HrRowActionMenu
                                                                        rowId={s._id}
                                                                        items={[{label: 'لغو اشتراک', danger: true, onClick: () => void revokeSubscription(s)}]}
                                                                    />
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </TableTheme>
                                    <div className={styles.paginationSpace}>
                                        <Pagination
                                            rtl
                                            itemPerPage={userPaging.itemPerPage}
                                            totalItems={userPaging.totalItems}
                                            currentPage={userPaging.currentPage}
                                            paginate={userPaging.paginate}
                                            setRowsPerPage={userPaging.setRowsPerPage}
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {tab === 'features' && (
                        <>
                            <form onSubmit={submitFeature} className={styles.formPanel}>
                                <div className={styles.formGrid}>
                                    <label className={styles.field}>
                                        <span>نام فیچر</span>
                                        <input
                                            required
                                            placeholder="حداکثر دستگاه‌ها"
                                            value={featureForm.name}
                                            onChange={(e) => setFeatureForm((f) => ({...f, name: e.target.value}))}
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>کد یکتا (انگلیسی)</span>
                                        <input
                                            required
                                            dir="ltr"
                                            placeholder="max_devices"
                                            value={featureForm.code}
                                            onChange={(e) => setFeatureForm((f) => ({...f, code: e.target.value}))}
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>نوع</span>
                                        <select value={featureForm.type} onChange={(e) => setFeatureForm((f) => ({...f, type: e.target.value}))}>
                                            <option value="quantity">عددی (مصرفی)</option>
                                            <option value="boolean">روشن/خاموش</option>
                                        </select>
                                    </label>
                                    <label className={styles.field}>
                                        <span>واحد</span>
                                        <input
                                            placeholder="دستگاه / گیگابایت"
                                            value={featureForm.unit}
                                            onChange={(e) => setFeatureForm((f) => ({...f, unit: e.target.value}))}
                                        />
                                    </label>
                                </div>
                                <div className={styles.formActions}>
                                    <button type="submit" className={styles.primaryBtn} disabled={busy}>
                                        فیچر جدید
                                    </button>
                                </div>
                            </form>

                            <FilterBar
                                fields={[
                                    {key: 'q', type: 'search', label: 'جستجو', placeholder: 'نام یا کد…'},
                                    {
                                        key: 'type',
                                        type: 'select',
                                        label: 'نوع',
                                        allLabel: 'همه انواع',
                                        options: [
                                            {value: 'quantity', label: 'عددی'},
                                            {value: 'boolean', label: 'روشن/خاموش'},
                                        ],
                                    },
                                ]}
                                values={featureFilters}
                                onChange={changeFeatureFilter}
                                onApply={() => featurePaging.resetPage()}
                                onReset={() => {
                                    setFeatureFilters(EMPTY_FEATURE_FILTERS);
                                    featurePaging.resetPage();
                                }}
                                resultCount={filteredFeatures.length}
                                resultLabel="فیچر"
                            />

                            {filteredFeatures.length === 0 ? (
                                <TableEmptyState
                                    icon={<LuLayers size={32} />}
                                    title={featureFilters.q || featureFilters.type ? 'فیچری یافت نشد' : 'هنوز فیچری تعریف نشده'}
                                    description="فیچرها (دستگاه، ترافیک، سرور پریمیوم) را تعریف و روی پلن‌ها مقداردهی کنید."
                                    secondaryLabel={featureFilters.q || featureFilters.type ? 'پاک کردن فیلترها' : undefined}
                                    onSecondaryClick={
                                        featureFilters.q || featureFilters.type
                                            ? () => {
                                                  setFeatureFilters(EMPTY_FEATURE_FILTERS);
                                                  featurePaging.resetPage();
                                              }
                                            : undefined
                                    }
                                />
                            ) : (
                                <>
                                    <TableTheme>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>نام</th>
                                                    <th>کد</th>
                                                    <th>نوع</th>
                                                    <th>واحد</th>
                                                    <th>عملیات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {featurePaging.pageItems.map((f) => (
                                                    <tr key={f._id}>
                                                        <td data-label="نام" className={styles.cellPrimary}>
                                                            {f.name}
                                                        </td>
                                                        <td data-label="کد" className={styles.codeCell}>
                                                            {f.code}
                                                        </td>
                                                        <td data-label="نوع">{f.type === 'boolean' ? 'روشن/خاموش' : 'عددی'}</td>
                                                        <td data-label="واحد">{f.unit || '—'}</td>
                                                        <td data-label="عملیات">
                                                            <HrRowActionMenu
                                                                rowId={f._id}
                                                                items={[{label: 'حذف', danger: true, onClick: () => void deleteFeature(f)}]}
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
                                            itemPerPage={featurePaging.itemPerPage}
                                            totalItems={featurePaging.totalItems}
                                            currentPage={featurePaging.currentPage}
                                            paginate={featurePaging.paginate}
                                            setRowsPerPage={featurePaging.setRowsPerPage}
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}
