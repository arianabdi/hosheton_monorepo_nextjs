'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { TbTable } from 'react-icons/tb';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import etr from '../../../error-tracking/ErrorTracking.module.scss';
import mk from '../../../marketing/Marketing.module.scss';
import { formatCount } from '../../../error-tracking/lib/format';
import Guide from '../../components/Guide';
import TabIntro from '../../components/TabIntro';
import LoadError from '../../components/LoadError';
import { MATRIX_GUIDE } from '../../components/guides';
import { subscriptionApi, UNLIMITED, type MatrixData, type PlanValue } from '../../lib/subscription-api';
import { useCachedState, useSubscriptionModule } from '../../lib/SubscriptionProvider';
import { formatPlanValue, MODE_LABELS, resolveMode, RESET_LABELS } from '../../lib/format';
import styles from '../../Subscription.module.scss';

type Feature = MatrixData['features'][number];
const key = (planId: string, featureId: string) => `${planId}:${featureId}`;

function ValueCell({ feature, value, dirty, onChange }: {
    feature: Feature;
    value: PlanValue | undefined;
    dirty: boolean;
    onChange: (value: PlanValue) => void;
}) {
    const defaultLabel = feature.defaultValue === null || feature.defaultValue === undefined
        ? 'بسته'
        : formatPlanValue(feature.defaultValue, feature);

    if (feature.type === 'boolean') {
        const current = value === null || value === undefined ? '' : String(value === true || (value as unknown) === 'true');
        return (
            <div className={`${styles.matrixCell} ${dirty ? styles.matrixDirty : ''}`}>
                <select
                    className={etr.filterSelect}
                    value={current}
                    onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}
                    aria-label={feature.name}
                >
                    <option value="true">باز</option>
                    <option value="false">قفل</option>
                    <option value="">پیش‌فرض ({defaultLabel})</option>
                </select>
            </div>
        );
    }

    const unlimited = Number(value) === UNLIMITED;
    const empty = value === null || value === undefined;
    return (
        <div className={`${styles.matrixCell} ${dirty ? styles.matrixDirty : ''}`}>
            <input
                type="number"
                min={0}
                value={unlimited || empty ? '' : Number(value)}
                placeholder={unlimited ? '∞' : `پیش‌فرض: ${defaultLabel}`}
                disabled={unlimited}
                onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
                aria-label={`${feature.name}${feature.unit ? ` (${feature.unit})` : ''}`}
            />
            <label className={styles.checkLabel}>
                <input type="checkbox" checked={unlimited} onChange={(e) => onChange(e.target.checked ? UNLIMITED : null)} />
                نامحدود
            </label>
        </div>
    );
}

export default function MatrixTabPage() {
    const { reload } = useSubscriptionModule();
    const [data, setData, cached] = useCachedState<MatrixData | null>('matrix:data', null);
    const [loading, setLoading] = useState(!cached);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [edits, setEdits] = useState<Record<string, PlanValue>>({});
    const [saving, setSaving] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [showLegacy, setShowLegacy] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);
            setData(await subscriptionApi.matrix());
        } catch (e) {
            // shown in place of the content (an empty state would wrongly say «no catalog / no plans»)
            setLoadError(e);
        } finally {
            setLoading(false);
        }
    }, [setData]);

    useEffect(() => {
        void load();
    }, [load]);

    const plans = useMemo(() => (data?.plans || []).filter((p) => showInactive || p.status === 'active'), [data, showInactive]);
    const groups = useMemo(() => {
        const map = new Map<string, { title: string; features: Feature[] }>();
        const hasAnyValue = (featureId: string) => plans.some((p) => data?.values?.[p._id]?.[featureId] !== undefined);
        // panel-only features with no value anywhere = legacy rows; hidden unless asked
        const visible = (data?.features || []).filter((f) => showLegacy || f.inCode || hasAnyValue(f._id));
        for (const f of visible) {
            const slug = f.group?.slug || 'zz';
            if (!map.has(slug)) map.set(slug, { title: f.group?.title || 'بدون گروه', features: [] });
            map.get(slug)!.features.push(f);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, g]) => g);
    }, [data, showLegacy, plans]);
    const featureCount = groups.reduce((sum, g) => sum + g.features.length, 0);

    const valueOf = (planId: string, featureId: string): PlanValue | undefined => {
        const k = key(planId, featureId);
        if (k in edits) return edits[k];
        return data?.values?.[planId]?.[featureId];
    };

    const change = (planId: string, featureId: string, value: PlanValue) => {
        const original = data?.values?.[planId]?.[featureId] ?? null;
        setEdits((prev) => {
            const next = { ...prev };
            if ((value ?? null) === original) delete next[key(planId, featureId)];
            else next[key(planId, featureId)] = value;
            return next;
        });
    };

    const save = async () => {
        const changes = Object.entries(edits).map(([k, value]) => {
            const [planId, featureId] = k.split(':');
            return { planId, featureId, value };
        });
        try {
            setSaving(true);
            const result = await subscriptionApi.saveMatrix(changes);
            SuccessToaster({ message: `${formatCount(result?.updated || changes.length)} مقدار ذخیره شد` });
            setEdits({});
            await load();
            reload();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    const dirtyCount = Object.keys(edits).length;

    return (
        <>
            <TabIntro>
                سقف و دسترسی هر پلن را یک‌جا ببینید و عوض کنید. خانهٔ خالی یعنی مقدار پیش‌فرض ویژگی.
            </TabIntro>

            <Guide content={MATRIX_GUIDE} />

            {loadError && !data ? (
                <LoadError error={loadError} onRetry={() => void load()} />
            ) : loading && !data ? (
                <LoadingState />
            ) : !data?.plans.length || !data?.features.length ? (
                <TableEmptyState
                    icon={<TbTable size={32} />}
                    title={!data?.plans.length ? 'هنوز پلنی ندارید' : 'هنوز ویژگی‌ای ندارید'}
                    description={!data?.plans.length
                        ? 'اول پلن‌ها را بسازید؛ بعد اینجا سقف هرکدام را تعیین کنید.'
                        : 'ویژگی‌ها را اپ موقع اجرا از کد می‌سازد؛ اگر خالی است API اپ را یک‌بار ری‌استارت کنید.'}
                    primaryHref={!data?.plans.length ? '/subscription/plans/new' : '/subscription/docs'}
                    primaryLabel={!data?.plans.length ? 'افزودن پلن' : 'مستندات'}
                />
            ) : (
                <section className={etr.panel}>
                    <h3 className={etr.panelTitle}><TbTable size={16} /> مقادیر پلن‌ها</h3>
                    <div className={etr.panelGuide}>
                        <p><strong>به چه درد می‌خورد؟</strong> تفاوت پلن‌ها را کنار هم ببینید؛ همین اعداد در صفحه قیمت‌ها و در API اعمال می‌شوند.</p>
                        <p><strong>چطور استفاده کنم؟</strong> خانه‌ها را عوض کنید (زرد = تغییر ذخیره‌نشده) و «ذخیره تغییرات» را بزنید. جای اعمال هر ردیف: <Link href="/subscription/usage-map">نقشه استفاده</Link>.</p>
                    </div>
                    <div className={etr.tableToolbar}>
                        <label className={styles.checkLabel}>
                            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                            نمایش پلن‌های غیرفعال
                        </label>
                        <label className={styles.checkLabel} title="ویژگی‌هایی که در کد اعمال نمی‌شوند و هیچ پلنی برایشان مقدار ندارد (معمولاً قدیمی)">
                            <input type="checkbox" checked={showLegacy} onChange={(e) => setShowLegacy(e.target.checked)} />
                            نمایش ویژگی‌های قدیمی فقط‌پنل
                        </label>
                        <span className={etr.toolbarCount}>{formatCount(featureCount)} ویژگی × {formatCount(plans.length)} پلن</span>
                    </div>
                    <div className={styles.matrixWrap}>
                        <table className={styles.matrix}>
                            <thead>
                                <tr>
                                    <th className={styles.matrixFeatureCell}>ویژگی</th>
                                    {plans.map((p) => (
                                        <th key={p._id} className={styles.matrixPlanHead}>
                                            {p.name}
                                            {p.isDefault ? <span className={styles.muted}> · پیش‌فرض</span> : null}
                                            {p.status !== 'active' ? <span className={styles.muted}> · غیرفعال</span> : null}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group) => (
                                    <FragmentRows key={group.title} title={group.title} span={plans.length + 1}>
                                        {group.features.map((f) => {
                                            const mode = resolveMode(f);
                                            return (
                                                <tr key={f._id}>
                                                    <td className={styles.matrixFeatureCell}>
                                                        <div className={styles.person}>
                                                            <span title={f.description || ''}>{f.name}{f.unit ? <span className={styles.muted}> ({f.unit})</span> : null}</span>
                                                            <span className={styles.muted} title={MODE_LABELS[mode].hint}>
                                                                <span className={styles.code}>{f.code}</span> · {MODE_LABELS[mode].label}
                                                                {mode === 'consumable' && f.resetInterval ? ` · ${RESET_LABELS[f.resetInterval]}` : ''}
                                                                {!f.inCode ? ' · فقط پنل' : ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {plans.map((p) => (
                                                        <td key={p._id}>
                                                            <ValueCell
                                                                feature={f}
                                                                value={valueOf(p._id, f._id)}
                                                                dirty={key(p._id, f._id) in edits}
                                                                onChange={(v) => change(p._id, f._id, v)}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </FragmentRows>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.stickyBar}>
                        <span className={styles.muted}>
                            {dirtyCount ? `${formatCount(dirtyCount)} تغییر ذخیره‌نشده` : 'تغییری نیست'}
                        </span>
                        <div className={styles.inlineRow}>
                            <button type="button" className={mk.secondaryBtn} disabled={!dirtyCount || saving} onClick={() => setEdits({})}>
                                بازگردانی
                            </button>
                            <button type="button" className={mk.primaryBtn} disabled={!dirtyCount || saving} onClick={() => void save()}>
                                {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}

function FragmentRows({ title, span, children }: { title: string; span: number; children: ReactNode }) {
    return (
        <>
            <tr className={styles.matrixGroupRow}>
                <td colSpan={span}>{title}</td>
            </tr>
            {children}
        </>
    );
}
