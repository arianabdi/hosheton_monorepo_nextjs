'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TbPuzzle } from 'react-icons/tb';
import { LoadingState } from '@my-workspace/components';
import { ErrorToaster, SuccessToaster } from '@my-workspace/utils';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import TableEmptyState from '@/app/(main)/components/TableEmptyState';
import etr from '../../../error-tracking/ErrorTracking.module.scss';
import mk from '../../../marketing/Marketing.module.scss';
import { formatCount } from '../../../error-tracking/lib/format';
import Guide from '../../components/Guide';
import TabIntro from '../../components/TabIntro';
import { FEATURES_GUIDE } from '../../components/guides';
import { subscriptionApi, type SubscriptionFeature } from '../../lib/subscription-api';
import { useSubscriptionModule } from '../../lib/SubscriptionProvider';
import { formatPlanValue, MODE_LABELS, resolveMode, RESET_LABELS } from '../../lib/format';
import styles from '../../Subscription.module.scss';

const SOURCE_OPTIONS = [
    { id: '', label: 'همه منابع' },
    { id: 'code', label: 'تعریف‌شده در کد' },
    { id: 'admin', label: 'فقط پنل' },
];

export default function FeaturesTabPage() {
    const router = useRouter();
    const { features, loaded, reload } = useSubscriptionModule();
    const [search, setSearch] = useState('');
    const [source, setSource] = useState('');
    const [toDelete, setToDelete] = useState<SubscriptionFeature | null>(null);
    const [busy, setBusy] = useState(false);

    // فهرست کوچک و ثابت (زیر ۵۰ ردیف) — فیلتر سمت کلاینت مجاز است (بخش ۴ AGENTS.md پنل)
    const rows = useMemo(() => {
        const text = search.trim().toLowerCase();
        return features.filter((f) => {
            if (source && (f.source || 'admin') !== source) return false;
            if (!text) return true;
            return [f.name, f.code, f.group?.title, f.unit].some((v) => String(v || '').toLowerCase().includes(text));
        });
    }, [features, search, source]);

    const remove = async () => {
        if (!toDelete) return;
        try {
            setBusy(true);
            await subscriptionApi.deleteFeature(toDelete._id);
            SuccessToaster({ message: 'ویژگی حذف شد' });
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
            <TabIntro actions={<Link href="/subscription/features/new" className={mk.secondaryBtn}>افزودن ویژگی نمایشی</Link>}>
                چیزهایی که پلن‌ها با آن فرق می‌کنند. ویژگی‌های «در کد» را خود اپ می‌سازد و اعمال می‌کند.
            </TabIntro>

            <Guide content={FEATURES_GUIDE} />

            {!loaded ? (
                <LoadingState />
            ) : features.length === 0 ? (
                <TableEmptyState
                    icon={<TbPuzzle size={32} />}
                    title="هنوز ویژگی‌ای نیست"
                    description="ویژگی‌های اپ با اولین اجرای API از کاتالوگ کد ساخته می‌شوند. اگر اپ کاتالوگ ندارد، مستندات را ببینید."
                    primaryHref="/subscription/docs"
                    primaryLabel="مستندات اتصال اپ"
                />
            ) : (
                <section className={etr.panel}>
                    <h3 className={etr.panelTitle}><TbPuzzle size={16} /> ویژگی‌ها</h3>
                    <div className={etr.panelGuide}>
                        <p><strong>به چه درد می‌خورد؟</strong> ببینید هر ویژگی چطور سنجیده می‌شود و در صفحه قیمت‌ها چطور دیده می‌شود.</p>
                        <p><strong>چطور استفاده کنم؟</strong> برای عوض کردن نام یا متن مشتری «ویرایش»؛ برای مقدار هر پلن به «مقادیر پلن‌ها» بروید.</p>
                    </div>
                    <div className={etr.tableToolbar}>
                        <TableSearch className={etr.toolbarSearch} value={search} onSearch={setSearch} placeholder="نام، کد یا گروه" />
                        <select className={etr.filterSelect} value={source} onChange={(e) => setSource(e.target.value)} aria-label="منبع">
                            {SOURCE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                        <span className={etr.toolbarCount}>{formatCount(rows.length)} ویژگی</span>
                    </div>
                    {rows.length === 0 ? (
                        <div className={etr.tableEmpty}>
                            موردی با این جستجو/فیلتر پیدا نشد.
                            <button type="button" className={etr.linkBtn} onClick={() => { setSearch(''); setSource(''); }}>حذف فیلترها</button>
                        </div>
                    ) : (
                        <div className={`${etr.tableWrap} ${etr.tableWrapFlat}`}>
                            <table className={etr.dataTable}>
                                <thead>
                                    <tr>
                                        <th>ویژگی</th>
                                        <th title="روشن/خاموش، سقف زنده، سقف هر مورد، سهمیه مصرفی">نحوه سنجش</th>
                                        <th>گروه</th>
                                        <th title="مقدار برای پلنی که مقداری تعیین نکرده">پیش‌فرض</th>
                                        <th>منبع</th>
                                        <th className={styles.actionsCell}>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((f) => {
                                        const mode = resolveMode(f);
                                        const inCode = f.source === 'code';
                                        return (
                                            <tr key={f._id}>
                                                <td data-label="ویژگی">
                                                    <div className={styles.person}>
                                                        <Link href={`/subscription/features/${f._id}`} className={styles.personName}>
                                                            {f.name}{f.unit ? <span className={styles.muted}> ({f.unit})</span> : null}
                                                        </Link>
                                                        <span className={`${styles.muted} ${styles.code}`}>{f.code}</span>
                                                    </div>
                                                </td>
                                                <td data-label="نحوه سنجش" title={MODE_LABELS[mode].hint}>
                                                    {MODE_LABELS[mode].label}
                                                    {mode === 'consumable' ? <span className={styles.muted}> · {RESET_LABELS[f.resetInterval || 'period']}</span> : null}
                                                </td>
                                                <td data-label="گروه" className={etr.cellMuted}>{f.group?.title || '—'}</td>
                                                <td data-label="پیش‌فرض" className={etr.cellMuted}>
                                                    {f.defaultValue === null || f.defaultValue === undefined ? 'بسته' : formatPlanValue(f.defaultValue, f)}
                                                </td>
                                                <td data-label="منبع">
                                                    <div className={styles.tags}>
                                                        {inCode
                                                            ? <span className={`${styles.tag} ${styles.tagBrand}`}>در کد</span>
                                                            : <span className={`${styles.tag} ${styles.tagWarn}`} title="هیچ کدی این ویژگی را اعمال نمی‌کند">فقط پنل</span>}
                                                        {f.showInCard ? <span className={styles.tag}>در کارت قیمت</span> : null}
                                                        {f.enforcement === 'client' ? <span className={styles.tag}>فقط ظاهر</span> : null}
                                                    </div>
                                                </td>
                                                <td data-label="عملیات" className={styles.actionsCell}>
                                                    <HrRowActionMenu
                                                        rowId={f._id}
                                                        ariaLabel={`عملیات ویژگی ${f.name}`}
                                                        items={[
                                                            { label: 'ویرایش', onClick: () => router.push(`/subscription/features/${f._id}`) },
                                                            { label: 'مقدار در پلن‌ها', onClick: () => router.push('/subscription/matrix') },
                                                            ...(inCode ? [{ label: 'جای اعمال در کد', onClick: () => router.push(`/subscription/usage-map#${f.code}`) }] : []),
                                                            ...(!inCode ? [{ label: 'حذف', danger: true, onClick: () => setToDelete(f) }] : []),
                                                        ]}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            <ConfirmDialog
                open={!!toDelete}
                title="حذف ویژگی"
                confirmLabel="حذف"
                tone="danger"
                busy={busy}
                onConfirm={() => void remove()}
                onClose={() => setToDelete(null)}
            >
                ویژگی «{toDelete?.name}» و مقدارش در همهٔ پلن‌ها حذف شود؟ از جدول مقایسه صفحه قیمت‌ها هم برداشته می‌شود.
            </ConfirmDialog>
        </>
    );
}
