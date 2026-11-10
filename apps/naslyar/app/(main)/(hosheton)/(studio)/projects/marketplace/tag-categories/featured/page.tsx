'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LuCheck } from 'react-icons/lu';
import { ErrorToaster, SuccessToaster, toFarsiNumber } from '@my-workspace/utils';
import { LoadingState, Pagination } from '@my-workspace/components';
import { Container, Wrapper } from '@/app/(main)/layout';
import TableSearch from '@/app/components/TableSearch/TableSearch';
import HrRowActionMenu from '@/app/(main)/management/hr/components/HrRowActionMenu';
import parentStyles from '@/app/(main)/marketing/Marketing.module.scss';
import tabStyles from '@/app/(main)/marketing/automation/Automation.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';
import feat from '@/app/(main)/(hosheton)/(studio)/projects/templates/review/featured/Featured.module.scss';
import coverStyles from '@/app/(main)/(hosheton)/(studio)/projects/templates/review/TemplateForm.module.scss';
import {
    templateTagCategoryApi,
    type TemplateTagFeaturedItem,
} from '../../../../lib/template-tag-category-api';
import { getCoverMedia, mediaThumbSrc } from '../../../../lib/template-media';
import { buildTagTree, tagPublicPath, type TagTreeNode } from '../components/tag-tree';
import styles from './FeaturedTiles.module.scss';

const BASE = '/projects/marketplace/tag-categories';
const SEARCH_LIMIT = 10;
const MAX_FALLBACK = 5;

function Cover({ item }: { item: TemplateTagFeaturedItem }) {
    const cover = getCoverMedia(item.previewMedia);
    const src = cover ? mediaThumbSrc(cover) : '';
    return (
        <span className={`${coverStyles.listCover} ${src ? '' : coverStyles.listCoverEmpty}`}>
            {src ? (
                cover?.type === 'video' && !cover.thumbnailUrl
                    ? <video src={src} muted playsInline preload="metadata" />
                    : <img src={src} alt="" />
            ) : null}
        </span>
    );
}

/**
 * قالب‌های ویژهٔ دستهٔ اصلی — کلاژ کارت‌های بالای صفحهٔ /explore/<tag> در استودیو.
 * ادمین دسته را انتخاب می‌کند، قالب منتشرشده را جستجو و اضافه می‌کند، ترتیب را می‌چیند و ذخیره می‌کند.
 */
function FeaturedTilesPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tagId = searchParams.get('tag') || '';

    const [parents, setParents] = useState<TagTreeNode[] | null>(null);
    const [selected, setSelected] = useState<TemplateTagFeaturedItem[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [max, setMax] = useState(MAX_FALLBACK);
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState('');
    const [onlyThisCategory, setOnlyThisCategory] = useState(true);
    const [page, setPage] = useState(1);
    const [results, setResults] = useState<TemplateTagFeaturedItem[]>([]);
    const [total, setTotal] = useState(0);
    const [resultsLoading, setResultsLoading] = useState(false);

    const current = useMemo(() => parents?.find((node) => node.tag._id === tagId) || null, [parents, tagId]);
    const selectedIds = selected.map((item) => item._id);
    const dirty = selectedIds.join(',') !== savedIds.join(',');

    const setTag = useCallback((id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (id) params.set('tag', id); else params.delete('tag');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    useEffect(() => {
        templateTagCategoryApi.list({ page: 1, limit: 500 })
            .then((res) => setParents(buildTagTree(res.items || []).filter((node) => node.depth === 0)))
            .catch((e) => {
                ErrorToaster(e);
                setParents([]);
            });
    }, []);

    // بدون دستهٔ انتخاب‌شده → اولین دستهٔ اصلی
    useEffect(() => {
        if (!tagId && parents?.length) setTag(parents[0].tag._id);
    }, [parents, setTag, tagId]);

    useEffect(() => {
        if (!tagId) return;
        let cancelled = false;
        setSelectionLoading(true);
        templateTagCategoryApi.getFeatured(tagId)
            .then((data) => {
                if (cancelled) return;
                setSelected(data.templates || []);
                setSavedIds(data.templateIds || []);
                setMax(data.max || MAX_FALLBACK);
            })
            .catch((e) => {
                if (!cancelled) ErrorToaster(e);
            })
            .finally(() => {
                if (!cancelled) setSelectionLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [tagId]);

    useEffect(() => {
        setPage(1);
    }, [search, onlyThisCategory, tagId]);

    useEffect(() => {
        if (!current) return;
        let cancelled = false;
        setResultsLoading(true);
        templateTagCategoryApi.searchListed({
            search: search.trim() || undefined,
            categoryPath: onlyThisCategory ? current.path.join('/') : undefined,
            page,
            limit: SEARCH_LIMIT,
        })
            .then((data) => {
                if (cancelled) return;
                setResults(data.templates || []);
                setTotal(data.total || 0);
            })
            .catch((e) => {
                if (!cancelled) ErrorToaster(e);
            })
            .finally(() => {
                if (!cancelled) setResultsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [current, search, onlyThisCategory, page]);

    const toggle = (item: TemplateTagFeaturedItem) => {
        setSelected((list) => {
            if (list.some((row) => row._id === item._id)) return list.filter((row) => row._id !== item._id);
            if (list.length >= max) {
                ErrorToaster({ message: `حداکثر ${toFarsiNumber(String(max))} قالب ویژه برای هر دسته.` });
                return list;
            }
            return [...list, item];
        });
    };

    const move = (id: string, delta: number) => {
        setSelected((list) => {
            const index = list.findIndex((row) => row._id === id);
            const next = index + delta;
            if (index < 0 || next < 0 || next >= list.length) return list;
            const copy = [...list];
            const [row] = copy.splice(index, 1);
            copy.splice(next, 0, row);
            return copy;
        });
    };

    const save = async () => {
        if (!tagId) return;
        setSaving(true);
        try {
            const data = await templateTagCategoryApi.saveFeatured(tagId, selectedIds);
            setSelected(data.templates || []);
            setSavedIds(data.templateIds || []);
            SuccessToaster({ message: 'قالب‌های ویژهٔ دسته ذخیره شد.' });
        } catch (e) {
            ErrorToaster(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container>
            <Wrapper>
                <div className={`${parentStyles.container} ${parentStyles.rtl}`}>
                    <header className={parentStyles.header}>
                        <div>
                            <h1 className={parentStyles.mainTitle}>قالب‌های ویژهٔ دسته‌ها</h1>
                            <p className={parentStyles.subtitle}>
                                کارت‌های بالای صفحهٔ هر دستهٔ اصلی در اکسپلور استودیو — بدون انتخاب، این بخش در سایت دیده نمی‌شود.
                            </p>
                        </div>
                        <div className={styles.headerActions}>
                            <Link href={BASE} className={parentStyles.secondaryBtn}>بازگشت به دسته‌ها</Link>
                            <button
                                type="button"
                                className={parentStyles.primaryBtn}
                                disabled={!tagId || saving || !dirty}
                                onClick={() => void save()}
                            >
                                {saving ? 'در حال ذخیره…' : 'ذخیره'}
                            </button>
                        </div>
                    </header>

                    <p className={styles.guide}>
                        به چه درد می‌خورد؟ ۳ تا {toFarsiNumber(String(max))} قالب خوب هر دسته را جلوی چشم بازدیدکننده می‌گذارد؛ اولی کارت بزرگ و برجستهٔ وسط است.
                        چطور استفاده کنم؟ دسته را انتخاب کنید، از ستون جستجو قالب اضافه کنید، ترتیب را با منوی «⋯» بچینید و ذخیره کنید.
                    </p>

                    {!parents ? <LoadingState /> : parents.length === 0 ? (
                        <div className={parentStyles.emptyState}>
                            <p>هنوز دستهٔ اصلی‌ای ساخته نشده است.</p>
                            <Link href={`${BASE}/new`} className={parentStyles.primaryBtn}>+ تگ جدید</Link>
                        </div>
                    ) : (
                        <>
                            <div className={styles.toolbar}>
                                <label className={styles.field}>
                                    <span>دستهٔ اصلی</span>
                                    <select
                                        value={tagId}
                                        onChange={(event) => setTag(event.target.value)}
                                    >
                                        {parents.map((node) => (
                                            <option key={node.tag._id} value={node.tag._id}>{node.name}</option>
                                        ))}
                                    </select>
                                </label>
                                {current ? (
                                    <span className={styles.path} dir="ltr">{tagPublicPath(current)}</span>
                                ) : null}
                                {dirty ? <span className={styles.dirty}>تغییرات ذخیره نشده</span> : null}
                            </div>

                            <div className={feat.columns}>
                                <section className={`${styles.panel} ${feat.panel}`}>
                                    <h3 className={styles.panelTitle}>افزودن قالب</h3>
                                    <div className={styles.searchRow}>
                                        <TableSearch value={search} onSearch={setSearch} placeholder="جستجوی عنوان قالب…" />
                                        <label className={styles.check}>
                                            <input
                                                type="checkbox"
                                                checked={onlyThisCategory}
                                                onChange={(event) => setOnlyThisCategory(event.target.checked)}
                                            />
                                            فقط قالب‌های همین دسته
                                        </label>
                                    </div>
                                    <div className={`${feat.panelBody} ${resultsLoading ? styles.refreshing : ''}`}>
                                        {!resultsLoading && results.length === 0 ? (
                                            <p className={styles.muted}>
                                                {search ? 'با این جستجو قالب منتشرشده‌ای پیدا نشد.' : 'این دسته هنوز قالب منتشرشده ندارد.'}
                                            </p>
                                        ) : results.map((item) => {
                                            const active = selectedIds.includes(item._id);
                                            return (
                                                <button
                                                    key={item._id}
                                                    type="button"
                                                    className={`${feat.row} ${active ? feat.rowActive : ''}`}
                                                    onClick={() => toggle(item)}
                                                    aria-pressed={active}
                                                >
                                                    <Cover item={item} />
                                                    <span className={feat.rowTitle}>{item.title}</span>
                                                    <span className={styles.creator}>{item.creator?.fullName || ''}</span>
                                                    {active ? <LuCheck /> : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {total > SEARCH_LIMIT ? (
                                        <div className={feat.panelFooter}>
                                            <Pagination
                                                rtl
                                                itemPerPage={SEARCH_LIMIT}
                                                currentPage={page}
                                                totalItems={total}
                                                paginate={setPage}
                                                setRowsPerPage={() => undefined}
                                            />
                                        </div>
                                    ) : null}
                                </section>

                                <section className={`${styles.panel} ${feat.panel}`}>
                                    <h3 className={styles.panelTitle}>
                                        ویژه‌های {current?.name || 'دسته'} ({toFarsiNumber(String(selected.length))}/{toFarsiNumber(String(max))})
                                    </h3>
                                    <div className={`${feat.panelBody} ${selectionLoading ? styles.refreshing : ''}`}>
                                        {selected.length === 0 ? (
                                            <p className={styles.muted}>
                                                هنوز قالبی انتخاب نشده — بلوک قالب‌های ویژه در صفحهٔ این دسته نمایش داده نمی‌شود.
                                            </p>
                                        ) : (
                                            <div className={`${tabStyles.tableWrap} ${styles.selectedWrap}`}>
                                                <table className={`${tabStyles.dataTable} ${styles.selectedTable}`}>
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>قالب</th>
                                                            <th>عملیات</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selected.map((item, index) => (
                                                            <tr key={item._id}>
                                                                <td data-label="#">
                                                                    {toFarsiNumber(String(index + 1))}
                                                                    {index === 0 ? <span className={styles.heroBadge}>برجسته</span> : null}
                                                                </td>
                                                                <td data-label="قالب">
                                                                    <span className={styles.selectedCell}>
                                                                        <Cover item={item} />
                                                                        <span className={feat.rowTitle} title={item.title}>{item.title}</span>
                                                                    </span>
                                                                </td>
                                                                <td data-label="عملیات" className={hrStyles.actionCell}>
                                                                    <HrRowActionMenu
                                                                        rowId={item._id}
                                                                        ariaLabel={`عملیات ${item.title}`}
                                                                        items={[
                                                                            ...(index > 0 ? [
                                                                                { label: 'اول (کارت برجسته)', onClick: () => move(item._id, -index) },
                                                                                { label: 'بالاتر', onClick: () => move(item._id, -1) },
                                                                            ] : []),
                                                                            ...(index < selected.length - 1
                                                                                ? [{ label: 'پایین‌تر', onClick: () => move(item._id, 1) }]
                                                                                : []),
                                                                            { label: 'برداشتن', danger: true, onClick: () => toggle(item) },
                                                                        ]}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </>
                    )}
                </div>
            </Wrapper>
        </Container>
    );
}

export default function FeaturedTilesRoute() {
    return (
        <Suspense fallback={<LoadingState />}>
            <FeaturedTilesPage />
        </Suspense>
    );
}
