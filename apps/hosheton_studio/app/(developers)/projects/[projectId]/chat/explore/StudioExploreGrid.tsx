'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import {
    type MarketplaceExploreCategory,
    type MarketplacePreviewMedia,
    type MarketplaceTemplateItem,
} from '@/app/(marketplace)/lib/types';
import type { TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { ExploreTemplateCard, ExploreGhostCard } from '@/app/(marketplace)/explore/components/ExploreTemplateCard';
import { ExploreDetailModal } from '@/app/(marketplace)/explore/components/ExploreDetailModal';
import { ExploreCategoryRow } from '@/app/(marketplace)/explore/components/ExploreCategoryRow';
import cardStyles from '@/app/(marketplace)/explore/components/ExploreCard.module.scss';
import styles from './ChatExplorePanel.module.scss';

const PAGE_SIZE = 12;

export function previewToChatAttachment(media: MarketplacePreviewMedia): TemplatePreviewMedia {
    return {
        url: media.url,
        type: media.type === 'video' ? 'video' : 'image',
        fileId: media.fileId,
        fileKey: media.fileKey,
        thumbnailUrl: media.thumbnailUrl,
        thumbnailUrlLarge: media.thumbnailUrlLarge,
        label: media.label,
        width: media.width,
        height: media.height,
        aspectRatio: media.aspectRatio,
    };
}

type StudioExploreGridProps = {
    onUsePrompt: (prompt: string) => void;
    onUseAsTemplate: (media: MarketplacePreviewMedia) => void;
};

export function StudioExploreGrid({ onUsePrompt, onUseAsTemplate }: StudioExploreGridProps) {
    const { t } = useTranslation('marketplace');
    const router = useRouter();
    const { token } = useAuthStore();

    const [items, setItems] = useState<MarketplaceTemplateItem[]>([]);
    const [categories, setCategories] = useState<MarketplaceExploreCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [likedIds, setLikedIds] = useState<string[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<MarketplaceTemplateItem | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        marketplaceApi.listCategories()
            .then((data) => setCategories(data.categories ?? []))
            .catch(() => setCategories([]));
    }, []);

    const loadPage = useCallback(async (targetPage: number, append: boolean) => {
        const seq = ++requestSeq.current;
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        try {
            const data = await marketplaceApi.exploreTemplates({
                category: activeCategory || undefined,
                page: targetPage,
                limit: PAGE_SIZE,
            });
            if (seq !== requestSeq.current) return;
            const templates = data.templates ?? [];
            setItems((prev) => (append ? [...prev, ...templates] : templates));
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
            setPage(targetPage);
        } catch (err) {
            if (seq !== requestSeq.current) return;
            setError(getApiErrorMessage(err, t('load_error')));
            if (!append) setItems([]);
        } finally {
            if (seq !== requestSeq.current) return;
            setLoading(false);
            setLoadingMore(false);
        }
    }, [activeCategory, t]);

    useEffect(() => {
        const timer = setTimeout(() => loadPage(1, false), 200);
        return () => clearTimeout(timer);
    }, [loadPage]);

    useEffect(() => {
        if (loading || loadingMore || !hasMore || selectedItem) return;
        const el = loadMoreRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    loadPage(page + 1, true);
                }
            },
            { rootMargin: '400px 0px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loading, loadingMore, hasMore, page, loadPage, selectedItem]);

    const applyItemPatch = (id: string, patch: Partial<MarketplaceTemplateItem>) => {
        setItems((prev) => prev.map((item) => (item._id === id ? { ...item, ...patch } : item)));
        setSelectedItem((current) => (current && current._id === id ? { ...current, ...patch } : current));
    };

    const toggleLike = async (id: string) => {
        if (!token) return;
        const wasLiked = likedIds.includes(id);
        const current = items.find((item) => item._id === id) || selectedItem;
        const nextCount = Math.max((current?.likeCount || 0) + (wasLiked ? -1 : 1), 0);
        setLikedIds((prev) => (wasLiked ? prev.filter((x) => x !== id) : [...prev, id]));
        applyItemPatch(id, { isLiked: !wasLiked, likeCount: nextCount });
        try {
            const res = await marketplaceApi.toggleLike(id);
            setLikedIds((prev) => {
                if (res.liked) return prev.includes(id) ? prev : [...prev, id];
                return prev.filter((x) => x !== id);
            });
            applyItemPatch(id, { isLiked: res.liked, likeCount: res.likeCount });
        } catch {
            setLikedIds((prev) => (wasLiked ? [...prev, id] : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isLiked: wasLiked, likeCount: current?.likeCount || 0 });
        }
    };

    const toggleSave = async (id: string) => {
        if (!token) return;
        const wasSaved = savedIds.includes(id);
        setSavedIds((prev) => (wasSaved ? prev.filter((x) => x !== id) : [...prev, id]));
        applyItemPatch(id, { isBookmarked: !wasSaved });
        try {
            const res = await mediaApi.toggleTemplateBookmark(id);
            setSavedIds((prev) => {
                if (res.bookmarked) return prev.includes(id) ? prev : [...prev, id];
                return prev.filter((x) => x !== id);
            });
            applyItemPatch(id, { isBookmarked: res.bookmarked });
        } catch {
            setSavedIds((prev) => (wasSaved ? [...prev, id] : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isBookmarked: wasSaved });
        }
    };

    const handlePurchase = (item: MarketplaceTemplateItem) => {
        if (!token) return;
        router.push(`/explore/buy/${item._id}`);
    };

    if (selectedItem) {
        return (
            <div className={styles.panel}>
                <ExploreDetailModal
                    embedded
                    item={selectedItem}
                    isLiked={likedIds.includes(selectedItem._id)}
                    isSaved={savedIds.includes(selectedItem._id)}
                    isLoggedIn={!!token}
                    onClose={() => setSelectedItem(null)}
                    onToggleLike={toggleLike}
                    onToggleSave={toggleSave}
                    onUseProject={(item) => onUsePrompt(item.promptText || item.description || '')}
                    onPurchase={handlePurchase}
                    onOpenItem={(detail) => {
                        setSelectedItem((current) => {
                            if (!current || current._id === detail._id) return { ...(current || {}), ...detail };
                            return detail;
                        });
                        setLikedIds((prev) => detail.isLiked
                            ? (prev.includes(detail._id) ? prev : [...prev, detail._id])
                            : prev.filter((id) => id !== detail._id));
                        setSavedIds((prev) => detail.isBookmarked
                            ? (prev.includes(detail._id) ? prev : [...prev, detail._id])
                            : prev.filter((id) => id !== detail._id));
                    }}
                    onUsePrompt={onUsePrompt}
                    onUseAsTemplate={onUseAsTemplate}
                />
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <ExploreCategoryRow
                categories={categories}
                activeSlug={activeCategory}
                onSelect={setActiveCategory}
                showChatToggle={false}
            />
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.gridWrap}>
                <div className={`${cardStyles.grid} ${styles.compactGrid}`}>
                    {loading
                        ? Array.from({ length: 6 }, (_, index) => (
                            <ExploreGhostCard key={`ghost-${index}`} index={index} />
                        ))
                        : items.map((item) => (
                            <ExploreTemplateCard
                                key={item._id}
                                item={item}
                                isLiked={likedIds.includes(item._id)}
                                isSaved={savedIds.includes(item._id)}
                                onToggleLike={toggleLike}
                                onToggleSave={toggleSave}
                                onOpenDetail={setSelectedItem}
                            />
                        ))}
                </div>
                {loadingMore && <p className={styles.more}>{t('loading_more')}</p>}
                <div ref={loadMoreRef} className={styles.sentinel} />
            </div>
        </div>
    );
}
