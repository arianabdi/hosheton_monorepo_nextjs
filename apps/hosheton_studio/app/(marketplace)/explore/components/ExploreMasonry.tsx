'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import type {
    ExploreResponse,
    MarketplaceExploreCategory,
    MarketplacePreviewMedia,
    MarketplaceTemplateItem,
} from '@/app/(marketplace)/lib/types';
import {
    exploreSegmentsFromPathname,
    resolveExplorePath,
    type TemplateCategoryNode,
} from '@/app/(marketplace)/lib/explore-taxonomy';
import { useTemplateCategoryTree } from '@/app/(marketplace)/lib/useTemplateCategoryTree';
import { useExploreListCategory } from '@/app/(marketplace)/lib/useExploreListCategory';
import { useExploreSearch } from '@/app/(marketplace)/lib/explore-search-context';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import { mediaAspectRatio } from '@/app/(marketplace)/lib/template-media';
import { useTemplateActions } from './use-template-actions';
import { templateDetailPath } from '@/app/(marketplace)/lib/explore-detail';
import { useExploreDetailStore } from '@/app/zustand/store/useExploreDetailStore';
import pageStyles from './ExplorePage.module.scss';
import cardStyles from './ExploreCard.module.scss';
import { ExploreTemplateCard, ExploreGhostCard } from './ExploreTemplateCard';
import { ExploreCategoryRow } from './ExploreCategoryRow';
import { ExploreCategoryHeader } from './ExploreCategoryHeader';
import { ExploreEmptyHint } from './ExploreEmptyHint';
import { ExploreCategoryStrip } from './ExploreCategoryStrip';
import { usePageLoading } from '@/app/components/PageTransition';
import { BannerBox, BANNER_PLACEMENTS } from '@/app/(studio)/banner';
import { notifyError, useStatusRecovery } from '@/app/lib/errors';

const PAGE_SIZE = 10;

function uniqueTemplates(items: MarketplaceTemplateItem[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item._id)) return false;
        seen.add(item._id);
        return true;
    });
}

function appendUniqueTemplates(
    items: MarketplaceTemplateItem[],
    next: MarketplaceTemplateItem[],
) {
    const seen = new Set(items.map((item) => item._id));
    const uniqueNext = next.filter((item) => {
        if (seen.has(item._id)) return false;
        seen.add(item._id);
        return true;
    });
    return uniqueNext.length > 0 ? [...items, ...uniqueNext] : items;
}

function patchTemplates(
    items: MarketplaceTemplateItem[],
    id: string,
    patch: Partial<MarketplaceTemplateItem>,
) {
    return items.map((item) => (item._id === id ? { ...item, ...patch } : item));
}

function getColumnCount(width: number, chatOpen: boolean) {
    let count = width >= 320 ? 2 : 1;
    if (width >= 900) count = 3;
    if (width >= 1120) count = 4;
    if (width >= 1480) count = 5;
    if (width >= 1720) count = 6;
    if (width >= 2080) count = 7;
    if (width >= 2280) count = 8;
    return chatOpen && width >= 900 ? count - 1 : count;
}

function coverRatio(item: MarketplaceTemplateItem) {
    const preview = item.previewMedia?.find((media) => media.isCover)
        || item.primaryPreview
        || item.previewMedia?.[0];
    return mediaAspectRatio(preview);
}

function distributeMasonry(items: MarketplaceTemplateItem[], columnCount: number) {
    const columns = Array.from(
        { length: columnCount },
        () => [] as MarketplaceTemplateItem[],
    );
    const heights = Array.from({ length: columnCount }, () => 0);

    for (const item of items) {
        let shortest = 0;
        for (let index = 1; index < columnCount; index += 1) {
            if (heights[index] < heights[shortest]) shortest = index;
        }
        columns[shortest].push(item);
        heights[shortest] += 1 / Math.max(coverRatio(item), 0.1);
    }

    return columns;
}

type ExploreMasonryProps = {
    /** Server-fetched category tree (page.tsx) — the picker and header render complete on first paint. */
    initialTree?: TemplateCategoryNode[];
    /** Server-fetched first page for a category landing — shown immediately (no ghost cards) and refreshed with auth. */
    initialData?: { categoryPath: string[]; response: ExploreResponse } | null;
};

export function ExploreMasonry({ initialTree, initialData }: ExploreMasonryProps = {}) {
    const { t } = useTranslation('marketplace');
    const router = useRouter();
    // نه `open`: گرید فقط وقتی دوباره چیده می‌شود که پنل کشیدنش تمام شده (layout.tsx) — روی موبایل اصلاً نه
    const personalChatOpen = useStudioPersonalChatStore((s) => s.docked);
    const pathname = usePathname();
    const exploreSearch = useExploreSearch();
    const search = exploreSearch?.search ?? '';
    const { nodes: categoryTree, loaded: treeLoaded } = useTemplateCategoryTree(initialTree);
    // دستهٔ فعال از URL؛ سرصفحهٔ دسته زیر نوار جستجو و چیپ‌ها رندر می‌شود
    const treeCategory = useExploreListCategory(categoryTree, treeLoaded);
    const treeCategoryPath = treeCategory ? treeCategory.path.join('/') : '';
    const onCategoryUrl = useMemo(
        () => resolveExplorePath(exploreSegmentsFromPathname(pathname), categoryTree).kind === 'category',
        [pathname, categoryTree],
    );
    // Server-rendered first page is shown as-is; the client refetch (with auth for likes/bookmarks) swaps silently.
    const seededRef = useRef(
        Boolean(initialData && initialData.categoryPath.join('/') === treeCategoryPath && initialData.response.templates?.length),
    );

    const [items, setItems] = useState<MarketplaceTemplateItem[]>(
        () => (seededRef.current && initialData ? uniqueTemplates(initialData.response.templates) : []),
    );
    // قالب‌های ویژهٔ دستهٔ اصلی (انتخاب ادمین) — API فقط برای صفحهٔ اول بدون فیلتر می‌فرستد
    const [featured, setFeatured] = useState<MarketplaceTemplateItem[]>(
        () => (seededRef.current && initialData ? initialData.response.featured ?? [] : []),
    );
    const [subcategoryCovers, setSubcategoryCovers] = useState<Record<string, MarketplacePreviewMedia>>(
        () => (seededRef.current && initialData ? initialData.response.subcategoryCovers ?? {} : {}),
    );
    const [columnCount, setColumnCount] = useState(2);
    const masonryColumns = useMemo(
        () => distributeMasonry(items, columnCount),
        [items, columnCount],
    );
    const [categories, setCategories] = useState<MarketplaceExploreCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [loading, setLoading] = useState(!seededRef.current);
    usePageLoading(loading);
    const [likedIds, setLikedIds] = useState<string[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);

    const [page, setPage] = useState(1);
    // ناوبری نرم بین دسته‌ها از مسیر رهگیری‌شده (@modal) می‌گذرد که metadata ندارد — عنوان تب را
    // مثل buildCategoryMetadata (lib/seo.ts) + قالب عنوان layout ریشه همگام نگه می‌داریم
    useEffect(() => {
        if (!onCategoryUrl || !treeCategory) return;
        document.title = `${treeCategory.metaTitle || `قالب‌های ${treeCategory.name}`} | هوشتون استودیو`;
    }, [onCategoryUrl, treeCategory]);

    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState<number | null>(
        () => (seededRef.current && initialData ? initialData.response.total ?? null : null),
    );
    const [loadingMore, setLoadingMore] = useState(false);
    /** بارگذاری صفحهٔ بعد شکست خورد: اسکرول بی‌نهایت تا برگشت اتصال (یا چند ثانیه بعد) دوباره درخواست نزند */
    const [loadMorePaused, setLoadMorePaused] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        const updateColumnCount = () => {
            setColumnCount(getColumnCount(window.innerWidth, personalChatOpen));
        };
        updateColumnCount();
        window.addEventListener('resize', updateColumnCount);
        return () => window.removeEventListener('resize', updateColumnCount);
    }, [personalChatOpen]);

    // چیپ‌های موضوع: فقط آن‌هایی که در دستهٔ فعال قالب دارند؛ چیپ انتخاب‌شده‌ای که دیگر نیست پاک می‌شود
    useEffect(() => {
        if (!treeLoaded) return;
        let cancelled = false;
        marketplaceApi.listCategories({ onlyUsed: true, categoryPath: treeCategoryPath || undefined })
            .then((data) => {
                if (cancelled) return;
                const next = data.categories ?? [];
                setCategories(next);
                setActiveCategory((slug) => (slug && !next.some((category) => category.slug === slug) ? '' : slug));
            })
            .catch(() => {
                if (!cancelled) setCategories([]);
            });
        return () => {
            cancelled = true;
        };
    }, [treeLoaded, treeCategoryPath]);

    const loadPage = useCallback(async (targetPage: number, append: boolean) => {
        const seq = ++requestSeq.current;
        if (append) {
            setLoadingMore(true);
        } else if (seededRef.current) {
            seededRef.current = false;
        } else {
            setLoading(true);
            setFeatured([]);
            setSubcategoryCovers({});
        }
        try {
            const data = await marketplaceApi.exploreTemplates({
                search: search.trim() || undefined,
                category: activeCategory || undefined,
                categoryPath: treeCategoryPath || undefined,
                page: targetPage,
                limit: PAGE_SIZE,
            });
            if (seq !== requestSeq.current) return;

            const templates = data.templates ?? [];
            if (!append) {
                setFeatured(data.featured ?? []);
                setSubcategoryCovers(data.subcategoryCovers ?? {});
            }
            setItems((prev) => (
                append ? appendUniqueTemplates(prev, templates) : uniqueTemplates(templates)
            ));
            setSavedIds((prev) => {
                const next = new Set(append ? prev : []);
                for (const item of templates) {
                    if (item.isBookmarked) next.add(item._id);
                }
                return [...next];
            });
            setLikedIds((prev) => {
                const next = new Set(append ? prev : []);
                for (const item of templates) {
                    if (item.isLiked) next.add(item._id);
                }
                return [...next];
            });
            const loadedCount = (targetPage - 1) * (data.limit || PAGE_SIZE) + templates.length;
            setHasMore(loadedCount < (data.total ?? loadedCount));
            setTotal(data.total ?? loadedCount);
            setPage(targetPage);
            setLoadMorePaused(false);
        } catch (err) {
            if (seq !== requestSeq.current) return;
            notifyError(err, { fallback: t('load_error') });
            if (append) setLoadMorePaused(true);
            if (!append) setItems([]);
        } finally {
            if (seq !== requestSeq.current) return;
            if (append) {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    }, [search, activeCategory, treeCategoryPath, t]);

    useEffect(() => {
        const timer = setTimeout(() => loadPage(1, false), 300);
        return () => clearTimeout(timer);
    }, [loadPage]);

    useEffect(() => {
        if (loading || loadingMore || !hasMore || loadMorePaused) return;
        const el = loadMoreRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    loadPage(page + 1, true);
                }
            },
            { rootMargin: '600px 0px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loading, loadingMore, hasMore, loadMorePaused, page, loadPage]);

    // اتصال برگشت → ادامهٔ اسکرول؛ خطای غیر اتصالی → تلاش دوباره بعد از مکث
    useStatusRecovery(() => setLoadMorePaused(false));
    useEffect(() => {
        if (!loadMorePaused) return;
        const timer = setTimeout(() => setLoadMorePaused(false), 15000);
        return () => clearTimeout(timer);
    }, [loadMorePaused]);

    /** Open the detail modal route — grid state stays intact thanks to the intercepted route. */
    const openDetail = useCallback((item: MarketplaceTemplateItem) => {
        const store = useExploreDetailStore.getState();
        store.setSelectedItem(item);
        // بستن مودال به همین فهرست برمی‌گردد (همه / دستهٔ فعال)
        store.setReturnPath(window.location.pathname);
        router.push(templateDetailPath(item), { scroll: false });
    }, [router]);

    const applyItemPatch = useCallback((id: string, patch: Partial<MarketplaceTemplateItem>) => {
        setItems((prev) => patchTemplates(prev, id, patch));
    }, []);

    const getItem = useCallback(
        (id: string) => items.find((item) => item._id === id),
        [items],
    );
    const isLiked = useCallback((id: string) => likedIds.includes(id), [likedIds]);
    const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);
    const setItemLiked = useCallback((id: string, liked: boolean, likeCount: number) => {
        applyItemPatch(id, { isLiked: liked, likeCount });
        setLikedIds((prev) => (liked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
    }, [applyItemPatch]);
    const setItemSaved = useCallback((id: string, saved: boolean) => {
        applyItemPatch(id, { isBookmarked: saved });
        setSavedIds((prev) => (saved ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
    }, [applyItemPatch]);

    const {
        toggleLike,
        toggleSave,
        handlePurchase,
    } = useTemplateActions({
        getItem,
        isLiked,
        isSaved,
        setLiked: setItemLiked,
        setSaved: setItemSaved,
        onOpenDetail: openDetail,
    });

    return (
        <div className={pageStyles.page}>
            <ExploreCategoryRow
                categories={categories}
                activeSlug={activeCategory}
                onSelect={setActiveCategory}
                categoryTree={categoryTree}
                activeTreeCategory={treeCategory}
                onClearTreeCategory={() => router.push('/explore', { scroll: false })}
            />

            {treeCategory ? (
                <ExploreCategoryHeader
                    nodes={categoryTree}
                    node={treeCategory}
                    total={loading ? null : total}
                    headingLevel={onCategoryUrl ? 'h1' : 'h2'}
                    strip={!search.trim() && !activeCategory ? (
                        <ExploreCategoryStrip
                            nodes={categoryTree}
                            node={treeCategory}
                            featured={featured}
                            templates={items}
                            subcategoryCovers={subcategoryCovers}
                        />
                    ) : undefined}
                />
            ) : null}

            <div className={pageStyles.gridSection}>
                {loading ? (
                    <div className={pageStyles.masonryContainer}>
                        <div className={`${cardStyles.grid} ${personalChatOpen ? cardStyles.chatOpen : ''}`}>
                            {Array.from({ length: columnCount }, (_, columnIndex) => (
                                <div key={`ghost-column-${columnIndex}`} className={cardStyles.masonryColumn}>
                                    {Array.from({ length: 10 }, (_, index) => index)
                                        .filter((index) => index % columnCount === columnIndex)
                                        .map((index) => (
                                            <ExploreGhostCard key={`ghost-${index}`} index={index} />
                                        ))}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <ExploreEmptyHint
                        title={search.trim()
                            ? t('empty_search_title', { query: search.trim() })
                            : treeCategory || activeCategory ? t('empty_filter_title') : t('no_approved')}
                        text={t('empty_hint')}
                        actionLabel={treeCategory || activeCategory || search.trim() ? t('empty_show_all') : undefined}
                        onAction={() => {
                            setActiveCategory('');
                            exploreSearch?.setSearch('');
                            if (treeCategory) router.push('/explore', { scroll: false });
                        }}
                    />
                ) : (
                    <div className={pageStyles.masonryContainer}>
                        <div className={`${cardStyles.grid} ${personalChatOpen ? cardStyles.chatOpen : ''}`}>
                            {masonryColumns.map((columnItems, columnIndex) => (
                                <div key={`column-${columnIndex}`} className={cardStyles.masonryColumn}>
                                    {/* بنر به‌جای اولین کارت پروژه — بالاترین سطح لیست اکسپلور */}
                                    {columnIndex === 0 && (
                                        <BannerBox
                                            placementKey={BANNER_PLACEMENTS.EXPLORE_TOP}
                                            variant="card"
                                            fallbackRatio="0.8 / 1"
                                        />
                                    )}
                                    {columnItems.map((item) => (
                                        <ExploreTemplateCard
                                            key={item._id}
                                            item={item}
                                            isLiked={likedIds.includes(item._id)}
                                            isSaved={savedIds.includes(item._id)}
                                            onToggleLike={toggleLike}
                                            onToggleSave={toggleSave}
                                            onOpenDetail={openDetail}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                        {loadingMore && <p className={pageStyles.loadMore}>{t('loading_more')}</p>}
                        <div ref={loadMoreRef} className={pageStyles.sentinel} aria-hidden="true" />
                    </div>
                )}
            </div>
        </div>
    );
}
