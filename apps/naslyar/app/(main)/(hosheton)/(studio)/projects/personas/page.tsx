'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import SortHeader from '@/app/components/SortHeader/SortHeader';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import { useUrlTableState } from '@/app/hooks/useUrlTableState';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import styles from '@/app/(main)/components/content-categories/ContentCategories.module.scss';
import { personaApi, type PersonaRow } from '../../lib/persona-api';
import { getHoshetonStudioPublicUrl } from '../../lib/studio-template-url';
import { templateTagLabelFa } from '../../lib/template-tag-labels-fa';
import PersonasGuide from './components/PersonasGuide';
import localStyles from './Personas.module.scss';

const BASE = '/projects/personas';
const SORTS = ['templateCount', 'conversationCount', 'fullName', 'joinedAt'] as const;

function genderLabel(gender: string) {
    return gender === 'female' ? 'زن' : gender === 'male' ? 'مرد' : '—';
}

/**
 * کاربران نمایشی استودیو: فهرست با آمار قالب و گفتگو. فهرست کوچک است (چند ده ردیف) پس
 * جستجو/فیلتر/مرتب‌سازی سمت کلاینت و state در URL.
 */
function PersonasPageInner() {
    const router = useRouter();
    const table = useUrlTableState('', { sort: 'templateCount', dir: 'desc', filters: { status: '' } });
    const [rows, setRows] = useState<PersonaRow[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            setRows(await personaApi.list());
        } catch (e) {
            ErrorToaster(e);
            setRows((prev) => prev || []);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const seed = async () => {
        setSeeding(true);
        try {
            const res = await personaApi.seedDefaults();
            SuccessToaster({
                message: res.created
                    ? `${toFarsiNumber(String(res.created))} کاربر نمایشی ساخته شد`
                    : 'همهٔ پرسوناهای پیش‌فرض از قبل ساخته شده‌اند',
            });
            await load();
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSeeding(false);
        }
    };

    const toggleActive = async (row: PersonaRow) => {
        try {
            await personaApi.update(row._id, { isActive: !row.isActive });
            SuccessToaster({ message: row.isActive ? 'غیرفعال شد' : 'فعال شد' });
            await load();
        } catch (e) {
            ErrorToaster(e);
        }
    };

    const visible = useMemo(() => {
        const q = table.search.trim().toLowerCase();
        const status = table.filters.status;
        const sort = (SORTS as readonly string[]).includes(table.sort) ? table.sort : 'templateCount';
        const factor = table.dir === 'asc' ? 1 : -1;
        return (rows || [])
            .filter((row) => !status || (status === 'active' ? row.isActive : !row.isActive))
            .filter((row) => !q
                || row.fullName.toLowerCase().includes(q)
                || row.username.toLowerCase().includes(q)
                || row.note.toLowerCase().includes(q)
                || (row.tagKeys || []).some((key) => key.includes(q) || templateTagLabelFa(key).toLowerCase().includes(q)))
            .sort((a, b) => {
                if (sort === 'fullName') return factor * a.fullName.localeCompare(b.fullName, 'fa');
                if (sort === 'joinedAt') return factor * (new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime());
                return factor * ((a[sort as 'templateCount' | 'conversationCount'] || 0) - (b[sort as 'templateCount' | 'conversationCount'] || 0));
            });
    }, [rows, table.search, table.filters.status, table.sort, table.dir]);

    const studioUrl = getHoshetonStudioPublicUrl();

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>کاربران نمایشی</h1>
                            <p className={parentStyles.subtitle}>
                                حساب‌هایی که قالب‌های تیم به نامشان منتشر می‌شود؛ پیام‌هایشان در صندوق ادمین‌های استودیو می‌آید.
                            </p>
                        </div>
                        <Link href={`${BASE}/new`} className={parentStyles.primaryBtn}>+ کاربر نمایشی</Link>
                    </header>

                    <PersonasGuide />

                    <div className={styles.toolbar}>
                        <TableSearch value={table.search} onSearch={table.setSearch} placeholder="جستجوی نام، نام کاربری، یادداشت یا حوزه…" />
                        <select
                            className={localStyles.filterSelect}
                            value={table.filters.status}
                            onChange={(e) => table.setFilter('status', e.target.value)}
                            aria-label="وضعیت"
                        >
                            <option value="">همهٔ وضعیت‌ها</option>
                            <option value="active">فعال</option>
                            <option value="inactive">غیرفعال</option>
                        </select>
                        <span className={styles.count}>{toFarsiNumber(String(visible.length))} مورد</span>
                    </div>
                    <p className={styles.tableGuide}>
                        به چه درد می‌خورد؟ می‌بینید هر پرسونا چند قالب منتشرشده و چند گفتگو دارد.
                        چطور استفاده کنم؟ پرسونای کم‌قالب را برای قالب‌های بعدی انتخاب کنید تا اکسپلور متنوع بماند؛ پرسونای بی‌عکس را کامل کنید.
                    </p>

                    {!rows ? (
                        <LoadingState />
                    ) : rows.length === 0 ? (
                        <div className={parentStyles.emptyState}>
                            <p>هنوز کاربر نمایشی ندارید. ۱۰ کاربر ایرانی آماده بسازید یا خودتان یکی اضافه کنید.</p>
                            <div className={tabStyles.inlineActions}>
                                <button type="button" className={parentStyles.primaryBtn} disabled={seeding} onClick={() => void seed()}>
                                    {seeding ? 'در حال ساخت…' : 'ساخت پرسوناهای پیش‌فرض'}
                                </button>
                                <Link href={`${BASE}/new`} className={tabStyles.smallBtn}>افزودن دستی</Link>
                            </div>
                        </div>
                    ) : visible.length === 0 ? (
                        <div className={parentStyles.emptyState}>
                            <p>با این جستجو یا فیلتر کسی پیدا نشد.</p>
                            <button type="button" className={tabStyles.smallBtn} onClick={table.reset}>حذف فیلترها</button>
                        </div>
                    ) : (
                        <div className={`${tabStyles.tableWrap} ${refreshing ? styles.refreshing : ''}`}>
                            <table className={tabStyles.dataTable}>
                                <thead>
                                    <tr>
                                        <SortHeader label="نام" field="fullName" sort={table.sort} dir={table.dir} onSort={(f) => table.toggleSort(f, 'asc')} />
                                        <th>جنسیت</th>
                                        <th title="تگ‌هایی که این شخص برای قالب‌هایشان پیشنهاد می‌شود (با زیرشاخه‌ها)">حوزه</th>
                                        <SortHeader label="قالب‌ها" field="templateCount" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="منتشرشده / همه (پیش‌نویس و در انتظار هم شمرده می‌شود)" />
                                        <SortHeader label="گفتگوها" field="conversationCount" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="گفتگوهای خصوصی که کاربران با این پرسونا دارند" />
                                        <SortHeader label="عضویت" field="joinedAt" sort={table.sort} dir={table.dir} onSort={table.toggleSort} hint="تاریخ عضویتی که روی پروفایل عمومی دیده می‌شود" />
                                        <th>وضعیت</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((row) => (
                                        <tr key={row._id}>
                                            <td data-label="نام" className={tabStyles.cellPrimary}>
                                                <span className={localStyles.person}>
                                                    {row.avatar ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={row.avatar} alt="" className={localStyles.avatar} />
                                                    ) : (
                                                        <span className={localStyles.avatarFallback} title="عکس پروفایل ندارد">{row.fullName.charAt(0) || '?'}</span>
                                                    )}
                                                    <span className={localStyles.personText}>
                                                        <Link href={`${BASE}/${row._id}`}>{row.fullName || '—'}</Link>
                                                        <small dir="ltr">@{row.username || '—'}</small>
                                                        {row.note ? <small>{row.note}</small> : null}
                                                    </span>
                                                </span>
                                            </td>
                                            <td data-label="جنسیت">{genderLabel(row.gender)}</td>
                                            <td data-label="حوزه">
                                                {row.tagKeys?.length ? (
                                                    <span className={localStyles.domainList}>
                                                        {row.tagKeys.map((key) => <span key={key} className={localStyles.domainChip}>{templateTagLabelFa(key)}</span>)}
                                                    </span>
                                                ) : (
                                                    <span className={localStyles.muted} title="برای همهٔ قالب‌ها فقط وقتی هم‌حوزه‌ای نباشد پیشنهاد می‌شود">بدون حوزه</span>
                                                )}
                                            </td>
                                            <td data-label="قالب‌ها">
                                                {toFarsiNumber(String(row.publishedCount))} / {toFarsiNumber(String(row.templateCount))}
                                            </td>
                                            <td data-label="گفتگوها">{toFarsiNumber(String(row.conversationCount))}</td>
                                            <td data-label="عضویت" title={row.joinedAt ? new Date(row.joinedAt).toLocaleString('fa-IR') : ''}>
                                                {row.joinedAt ? new Date(row.joinedAt).toLocaleDateString('fa-IR') : '—'}
                                            </td>
                                            <td data-label="وضعیت">
                                                <span className={`${parentStyles.badge} ${row.isActive ? parentStyles.badgeActive : parentStyles.badgeInactive}`}>
                                                    {row.isActive ? 'فعال' : 'غیرفعال'}
                                                </span>
                                            </td>
                                            <td data-label="عملیات" className={hrStyles.actionCell}>
                                                <HrRowActionMenu
                                                    rowId={row._id}
                                                    ariaLabel={`عملیات ${row.fullName}`}
                                                    items={[
                                                        { label: 'ویرایش', onClick: () => router.push(`${BASE}/${row._id}`) },
                                                        { label: 'دیدن پروفایل در استودیو', onClick: () => window.open(`${studioUrl}/creators/${row._id}`, '_blank', 'noopener') },
                                                        { label: row.isActive ? 'غیرفعال کردن' : 'فعال کردن', onClick: () => void toggleActive(row) },
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {rows && rows.length > 0 ? (
                        <p className={styles.tableGuide}>
                            پرسوناهای پیش‌فرض کم است؟{' '}
                            <button type="button" className={localStyles.linkBtn} disabled={seeding} onClick={() => void seed()}>
                                {seeding ? 'در حال ساخت…' : 'پرسوناهای پیش‌فرضِ ساخته‌نشده را بساز'}
                            </button>
                        </p>
                    ) : null}
                </div>
            </Wrapper>
        </Container>
    );
}

export default function PersonasPage() {
    return (
        <Suspense fallback={null}>
            <PersonasPageInner />
        </Suspense>
    );
}
