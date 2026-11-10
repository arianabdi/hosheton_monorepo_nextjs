'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TbCode, TbMapPin } from 'react-icons/tb';
import { LoadingState } from '@my-workspace/components';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import etr from '../../../error-tracking/ErrorTracking.module.scss';
import { formatCount, fullDate } from '../../../error-tracking/lib/format';
import Guide from '../../components/Guide';
import TabIntro from '../../components/TabIntro';
import LoadError from '../../components/LoadError';
import { USAGE_MAP_GUIDE } from '../../components/guides';
import { subscriptionApi, type CatalogData, type CatalogFeature } from '../../lib/subscription-api';
import { useCachedState } from '../../lib/SubscriptionProvider';
import { formatPlanValue, MODE_LABELS, RESET_LABELS } from '../../lib/format';
import styles from '../../Subscription.module.scss';

const MODULE_OPTIONS_ALL = '';

export default function UsageMapTabPage() {
    const [data, setData, cached] = useCachedState<CatalogData | null>('usage-map:data', null);
    const [loading, setLoading] = useState(!cached);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [search, setSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState(MODULE_OPTIONS_ALL);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);
            setData(await subscriptionApi.catalog());
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

    const modules = useMemo(
        () => [...new Set((data?.features || []).flatMap((f) => f.usedIn.map((u) => u.module)))].sort(),
        [data],
    );

    const features = useMemo(() => {
        const text = search.trim().toLowerCase();
        return (data?.features || []).filter((f) => {
            if (moduleFilter && !f.usedIn.some((u) => u.module === moduleFilter)) return false;
            if (!text) return true;
            return [f.name, f.code, f.description, ...f.usedIn.flatMap((u) => [u.module, u.where, u.why])]
                .some((v) => String(v || '').toLowerCase().includes(text));
        });
    }, [data, search, moduleFilter]);

    const groups = useMemo(() => {
        const map = new Map<string, { title: string; items: CatalogFeature[] }>();
        for (const f of features) {
            if (!map.has(f.group.slug)) map.set(f.group.slug, { title: f.group.title, items: [] });
            map.get(f.group.slug)!.items.push(f);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, g]) => g);
    }, [features]);

    return (
        <>
            <TabIntro>
                هر ویژگی کجای API اعمال می‌شود و قفل کردنش دقیقاً چه چیزی را می‌بندد — مستقیم از کد در حال اجرای همین اپ.
            </TabIntro>

            <Guide content={USAGE_MAP_GUIDE} />

            {loadError && !data ? (
                <LoadError error={loadError} onRetry={() => void load()} />
            ) : loading && !data ? (
                <LoadingState />
            ) : !data?.app ? (
                <TableEmptyState
                    icon={<TbCode size={32} />}
                    title="این اپ کاتالوگ ویژگی در کد ندارد"
                    description="ویژگی‌ها فقط وقتی چیزی را محدود می‌کنند که برنامه‌نویس آن‌ها را در کد اپ تعریف و اعمال کند."
                    primaryHref="/subscription/docs/connect-app"
                    primaryLabel="راهنمای اتصال اپ"
                />
            ) : (
                <>
                    <section className={etr.panel}>
                        <h3 className={etr.panelTitle}><TbMapPin size={16} /> اپ «{data.app}»</h3>
                        <div className={etr.panelGuide}>
                            <p><strong>به چه درد می‌خورد؟</strong> قبل از قفل کردن یک ویژگی برای پلن رایگان، ببینید کدام عملیات کاربر بسته می‌شود.</p>
                            <p>
                                <strong>چطور استفاده کنم؟</strong> ماژول را فیلتر کنید یا نام متد را جستجو کنید.
                                {data.lastSync ? <> آخرین همگام‌سازی با کد: {fullDate(data.lastSync.at)}.</> : null}
                            </p>
                        </div>
                        <div className={etr.tableToolbar}>
                            <TableSearch className={etr.toolbarSearch} value={search} onSearch={setSearch} placeholder="ویژگی، ماژول یا متد" />
                            <select className={etr.filterSelect} value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} aria-label="ماژول">
                                <option value="">همه ماژول‌ها</option>
                                {modules.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <span className={etr.toolbarCount}>{formatCount(features.length)} ویژگی</span>
                        </div>

                        {features.length === 0 ? (
                            <div className={etr.tableEmpty}>
                                موردی پیدا نشد.
                                <button type="button" className={etr.linkBtn} onClick={() => { setSearch(''); setModuleFilter(''); }}>حذف فیلترها</button>
                            </div>
                        ) : groups.map((group) => (
                            <div key={group.title}>
                                <h4 className={styles.muted}>{group.title}</h4>
                                <ul className={styles.mapList}>
                                    {group.items.map((f) => (
                                        <li key={f.code} id={f.code} className={styles.mapItem}>
                                            <div className={styles.mapHead}>
                                                <strong>{f.name}</strong>
                                                <span className={`${styles.code} ${styles.muted}`}>{f.code}</span>
                                                <span className={styles.tag} title={MODE_LABELS[f.mode].hint}>
                                                    {MODE_LABELS[f.mode].label}{f.mode === 'consumable' && f.resetInterval ? ` · ${RESET_LABELS[f.resetInterval]}` : ''}
                                                </span>
                                                {f.enforcement === 'client'
                                                    ? <span className={`${styles.tag} ${styles.tagWarn}`}>فقط ظاهر</span>
                                                    : <span className={`${styles.tag} ${styles.tagBrand}`}>سرور</span>}
                                                {f.plansWithValue === 0 ? (
                                                    <Link href="/subscription/matrix" className={`${styles.tag} ${styles.tagWarn}`}>بدون مقدار در پلن‌ها</Link>
                                                ) : null}
                                                {f.defaultValue !== null && f.defaultValue !== undefined ? (
                                                    <span className={styles.muted}>پیش‌فرض: {formatPlanValue(f.defaultValue, f)}</span>
                                                ) : null}
                                            </div>
                                            <p className={styles.mapDesc}>{f.description}</p>
                                            <ul className={styles.mapRefs}>
                                                {f.usedIn.map((ref, i) => (
                                                    <li key={i}>
                                                        <span className={styles.code}>{ref.module} › {ref.where}</span>
                                                        <span>{ref.why}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </section>

                    {data.panelOnly.length ? (
                        <section className={etr.panel}>
                            <h3 className={etr.panelTitle}>فقط در پنل (در کد اعمال نمی‌شوند)</h3>
                            <div className={etr.panelGuide}>
                                <p>این ویژگی‌ها در صفحه قیمت‌ها نمایش داده می‌شوند (اگر مقدار داشته باشند) ولی API چیزی را با آن‌ها محدود نمی‌کند. قدیمی‌ها را از تب ویژگی‌ها حذف کنید.</p>
                            </div>
                            <ul className={styles.mapList}>
                                {data.panelOnly.map((f) => (
                                    <li key={f.code} className={styles.mapItem}>
                                        <div className={styles.mapHead}>
                                            <strong>{f.name}</strong>
                                            <span className={`${styles.code} ${styles.muted}`}>{f.code}</span>
                                            <span className={styles.muted}>{f.plansWithValue ? `در ${formatCount(f.plansWithValue)} پلن مقدار دارد` : 'بدون مقدار'}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </>
            )}
        </>
    );
}
