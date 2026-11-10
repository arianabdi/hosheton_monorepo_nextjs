'use client';

import { Suspense, useEffect, useState } from 'react';
import { TbChartBar, TbListDetails } from 'react-icons/tb';
import { ErrorToaster } from '@my-workspace/utils';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import { TableBody, TableFooter, TablePanel, TotalLabel } from '@/app/(main)/(hosheton)/(blogger)/components/TableParts';
import { useTablePage } from '@/app/(main)/(hosheton)/(blogger)/lib/useTablePage';
import etr from '../../../error-tracking/ErrorTracking.module.scss';
import { formatCount, fullDate, relativeTime } from '../../../error-tracking/lib/format';
import Guide from '../../components/Guide';
import TabIntro from '../../components/TabIntro';
import UserEntitlementsDialog from '../../components/UserEntitlementsDialog';
import { USAGE_GUIDE } from '../../components/guides';
import { subscriptionApi, type UsageLogRow, type UsageSummaryRow } from '../../lib/subscription-api';
import { useCachedState, useSubscriptionModule } from '../../lib/SubscriptionProvider';
import { formatAmount, resolveMode, userLabel } from '../../lib/format';
import styles from '../../Subscription.module.scss';

const DAYS_OPTIONS = [
    { id: '', label: 'همه زمان‌ها' },
    { id: '1', label: '۲۴ ساعت اخیر' },
    { id: '7', label: '۷ روز اخیر' },
    { id: '30', label: '۳۰ روز اخیر' },
];

function UsageContent() {
    const { features } = useSubscriptionModule();
    const consumables = features.filter((f) => resolveMode(f) === 'consumable');
    const table = useUrlTableState('u_', { sort: 'createdAt', filters: { featureCode: '', days: '' } });
    const { rows, total, loading } = useTablePage(subscriptionApi.usageTable, table.query);
    const [summary, setSummary] = useCachedState<UsageSummaryRow[] | null>('usage:summary', null);
    const [inspectUser, setInspectUser] = useState<string | null>(null);

    useEffect(() => {
        subscriptionApi.usageSummary(30).then(setSummary).catch(ErrorToaster);
    }, [setSummary]);

    return (
        <>
            <TabIntro>
                مصرف سهمیه‌های دوره‌ای (مثل پیام دستیار). سقف‌های زنده (پروژه، کارت، فضا) را برای هر کاربر از تب اشتراک‌ها ببینید.
            </TabIntro>

            <Guide content={USAGE_GUIDE} />

            <section className={etr.panel}>
                <h3 className={etr.panelTitle}><TbChartBar size={16} /> جمع ۳۰ روز اخیر</h3>
                <div className={etr.panelGuide}>
                    <p><strong>به چه درد می‌خورد؟</strong> کدام سهمیه پرمصرف است و چند کاربر از آن استفاده می‌کنند.</p>
                    <p><strong>چطور استفاده کنم؟</strong> اگر میانگین مصرف هر کاربر نزدیک سقف پلن رایگان است، یعنی آن سقف نقطهٔ فروش پلن بالاتر است.</p>
                </div>
                {!summary ? (
                    <div className={etr.tableEmpty}>در حال بارگذاری…</div>
                ) : summary.length === 0 ? (
                    <div className={etr.tableEmpty}>در ۳۰ روز اخیر مصرفی ثبت نشده است.</div>
                ) : (
                    <div className={`${etr.tableWrap} ${etr.tableWrapFlat}`}>
                        <table className={etr.dataTable}>
                            <thead>
                                <tr>
                                    <th>ویژگی</th>
                                    <th>جمع مصرف</th>
                                    <th>دفعات</th>
                                    <th>کاربران</th>
                                    <th title="جمع مصرف تقسیم بر تعداد کاربران">میانگین هر کاربر</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.map((s) => (
                                    <tr key={s.code}>
                                        <td data-label="ویژگی">
                                            <button type="button" className={styles.personName} onClick={() => table.setFilter('featureCode', s.code)}>{s.name}</button>
                                        </td>
                                        <td data-label="جمع مصرف" className={etr.cellStrong}>{formatAmount(s.total, s.unit)}</td>
                                        <td data-label="دفعات">{formatCount(s.events)}</td>
                                        <td data-label="کاربران">{formatCount(s.users)}</td>
                                        <td data-label="میانگین هر کاربر" className={etr.cellMuted}>{s.users ? formatAmount(s.total / s.users, s.unit) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <TablePanel
                icon={<TbListDetails size={16} />}
                title="ثبت‌های مصرف"
                purpose="هر بار که کاربری از سهمیه‌اش مصرف کرده (چه کسی، چه چیزی، چقدر، کی)."
                howTo="ایمیل کاربر را جستجو کنید تا مصرفش را ببینید؛ روی نامش بزنید تا سهمیهٔ باقی‌مانده‌اش را ببینید."
                toolbar={(
                    <>
                        <TableSearch className={etr.toolbarSearch} value={table.search} onSearch={table.setSearch} placeholder="ایمیل، نام یا موبایل کاربر" />
                        <select className={etr.filterSelect} value={table.filters.featureCode} onChange={(e) => table.setFilter('featureCode', e.target.value)} aria-label="ویژگی">
                            <option value="">همه ویژگی‌ها</option>
                            {consumables.map((f) => <option key={f.code} value={f.code}>{f.name}</option>)}
                        </select>
                        <select className={etr.filterSelect} value={table.filters.days} onChange={(e) => table.setFilter('days', e.target.value)} aria-label="بازه">
                            {DAYS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                        <TotalLabel total={total} unit="ثبت" />
                    </>
                )}
            >
                <TableBody
                    loading={loading}
                    empty={!rows.length}
                    filtered={table.filtered}
                    onReset={table.reset}
                    emptyText="هنوز مصرفی ثبت نشده — با اولین پیام کاربران به دستیار هوشمند اینجا پر می‌شود."
                >
                    <table className={etr.dataTable}>
                        <thead>
                            <tr>
                                <th>کاربر</th>
                                <th>ویژگی</th>
                                <SortHeader label="مقدار" field="usedAmount" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                                <th>پلن</th>
                                <th>توضیح</th>
                                <SortHeader label="زمان" field="createdAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} />
                            </tr>
                        </thead>
                        <tbody>
                            {(rows as UsageLogRow[]).map((row) => (
                                <tr key={row._id}>
                                    <td data-label="کاربر">
                                        {row.user ? (
                                            <button type="button" className={styles.personName} onClick={() => setInspectUser(row.user!._id)}>{userLabel(row.user)}</button>
                                        ) : '—'}
                                    </td>
                                    <td data-label="ویژگی">{row.feature?.name || '—'}</td>
                                    <td data-label="مقدار" className={etr.cellStrong}>{formatAmount(row.usedAmount, row.feature?.unit || '')}</td>
                                    <td data-label="پلن" className={etr.cellMuted}>{row.planName}</td>
                                    <td data-label="توضیح" className={etr.cellMuted}>{row.note || '—'}</td>
                                    <td data-label="زمان" className={etr.cellMuted} title={fullDate(row.createdAt)}>{relativeTime(row.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableBody>
                <TableFooter table={table} total={total} />
            </TablePanel>

            <UserEntitlementsDialog userId={inspectUser} onClose={() => setInspectUser(null)} />
        </>
    );
}

export default function UsageTabPage() {
    return (
        <Suspense fallback={null}>
            <UsageContent />
        </Suspense>
    );
}
