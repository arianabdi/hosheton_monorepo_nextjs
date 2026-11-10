'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ExploreDetailModal } from './ExploreDetailModal';
import { useTemplateActions, type ChatInjectPayload } from './use-template-actions';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import type { MarketplacePreviewMedia, MarketplaceTemplateItem } from '@/app/(marketplace)/lib/types';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { templateDetailKey, templateDetailPath } from '@/app/(marketplace)/lib/explore-detail';
import { categoryHref, exploreSegmentsFromPathname } from '@/app/(marketplace)/lib/explore-taxonomy';
import { useExploreDetailStore } from '@/app/zustand/store/useExploreDetailStore';
import { previewToChatAttachment } from '@/app/(developers)/projects/[projectId]/chat/explore/StudioExploreGrid';
import { notifyError } from '@/app/lib/errors';

interface ExploreDetailOverlayProps {
    /** Route key: slug or Mongo id (decoded). */
    slugKey?: string;
    /** Server-rendered detail page passes the template so the modal opens without a fetch. */
    initialItem?: MarketplaceTemplateItem | null;
}

/**
 * Route-driven detail modal, shared by:
 *  - the intercepted soft-nav route (@modal/(.)explore/[...path]) — grid stays mounted behind
 *  - the hard route (explore/[...path]) — opens instantly with the server-fetched template
 * Closing returns to the list it was opened from (/explore or a category landing).
 * Mount with key=<slugKey> so switching templates remounts.
 */
export function ExploreDetailOverlay({ slugKey, initialItem }: ExploreDetailOverlayProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation('marketplace');
    const { token } = useAuthStore();
    const storeItem = useExploreDetailStore((s) => s.selectedItem);

    const [item, setItem] = useState<MarketplaceTemplateItem | null>(() => {
        if (initialItem) return initialItem;
        const key = slugKey || '';
        if (storeItem && (storeItem.slug === key || storeItem._id === key)) return storeItem;
        return null;
    });
    const [liked, setLiked] = useState<boolean>(() => !!item?.isLiked);
    const [saved, setSaved] = useState<boolean>(() => !!item?.isBookmarked);
    const [failed, setFailed] = useState(false);

    // Hard navigation (or a stale store): fetch the detail by slug/id.
    useEffect(() => {
        if (item || initialItem) return;
        const key = slugKey || '';
        if (!key) return;
        let cancelled = false;
        marketplaceApi.getTemplate(key)
            .then((detail) => {
                if (cancelled) return;
                setItem(detail);
                setLiked(!!detail.isLiked);
                setSaved(!!detail.isBookmarked);
                useExploreDetailStore.getState().setSelectedItem(detail);
            })
            .catch((err) => {
                if (cancelled) return;
                setFailed(true);
                notifyError(err, { fallback: t('load_error') });
                router.replace('/explore');
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getItem = useCallback((id: string) => (item && item._id === id ? item : undefined), [item]);
    const isLiked = useCallback((id: string) => item?._id === id && liked, [item, liked]);
    const isSaved = useCallback((id: string) => item?._id === id && saved, [item, saved]);
    const applyLiked = useCallback((id: string, next: boolean, likeCount: number) => {
        setLiked(next);
        setItem((current) => (current && current._id === id ? { ...current, likeCount } : current));
    }, []);
    const applySaved = useCallback((id: string, next: boolean) => {
        setSaved(next);
        setItem((current) => (current && current._id === id ? { ...current, isBookmarked: next } : current));
    }, []);
    const routeKey = slugKey || (initialItem ? templateDetailKey(initialItem) : undefined);
    const openFromActions = useCallback((next: MarketplaceTemplateItem) => {
        useExploreDetailStore.getState().setSelectedItem(next);
        // The modal re-opens the template it is already showing after its own detail
        // refresh — pushing the same detail URL makes the router hard-navigate and
        // reloads the page in a loop, so only navigate for a DIFFERENT template.
        if (routeKey && templateDetailKey(next) === routeKey) return;
        router.push(templateDetailPath(next), { scroll: false });
    }, [router, routeKey]);

    const actions = useTemplateActions({
        getItem,
        isLiked,
        isSaved,
        setLiked: applyLiked,
        setSaved: applySaved,
        onOpenDetail: openFromActions,
    });

    const closeToExplore = useCallback(() => {
        const store = useExploreDetailStore.getState();
        const returnPath = store.returnPath;
        store.setReturnPath(null);
        const parentPath = item?.categoryPath?.length ? categoryHref({ path: item.categoryPath }) : '/explore';
        router.push(returnPath && returnPath !== window.location.pathname ? returnPath : parentPath, { scroll: false });
    }, [router, item]);

    const handleOpenItem = useCallback((detail: MarketplaceTemplateItem) => {
        openFromActions(detail);
    }, [openFromActions]);

    const handleInject = useCallback((payload: ChatInjectPayload) => {
        actions.injectToPersonalChat(payload);
        closeToExplore();
    }, [actions, closeToExplore]);

    // Navigating from the detail URL to a list URL that the intercepting route also matches (category
    // landing) keeps this overlay mounted — it closes itself once the URL no longer points at it.
    // Once dismissed it stays closed: reopening the same template goes through the intercepted route.
    const urlKey = exploreSegmentsFromPathname(pathname).at(-1);
    const urlMatches = !!urlKey && (urlKey === routeKey || urlKey === item?.slug || urlKey === item?._id);
    const [dismissed, setDismissed] = useState(false);
    useEffect(() => {
        if (!urlMatches) setDismissed(true);
    }, [urlMatches]);

    if (failed || !item || !urlMatches || dismissed) return null;

    return (
        <ExploreDetailModal
            item={item}
            isLiked={liked}
            isSaved={saved}
            isLoggedIn={!!token}
            onClose={closeToExplore}
            onToggleLike={actions.toggleLike}
            onToggleSave={actions.toggleSave}
            onUseProject={actions.handleUseTemplate}
            onPurchase={actions.handlePurchase}
            onOpenItem={handleOpenItem}
            onUsePrompt={(prompt) => handleInject({ prompt })}
            onUseAsTemplate={(media: MarketplacePreviewMedia) => handleInject({
                attachments: [previewToChatAttachment(media)],
            })}
        />
    );
}
