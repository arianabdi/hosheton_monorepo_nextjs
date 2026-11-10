'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import MiniIconDark from '@/app/assets/hooshetun/mini-icon-dark.svg';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import type { MarketplacePreviewMedia, MarketplaceTemplateItem } from '@/app/(marketplace)/lib/types';
import { mediaThumbLargeSrc } from '@/app/(marketplace)/lib/template-media';
import { ExploreDetailModal } from '@/app/(marketplace)/explore/components/ExploreDetailModal';
import { previewToChatAttachment } from '../explore/StudioExploreGrid';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useLoginModalStore } from '@/app/zustand/store/useLoginModalStore';
import { useChatSession } from '../ChatSessionContext';
import styles from './ChatEmptyStage.module.scss';

function BrandMiniIcon() {
    if (typeof MiniIconDark === 'function') {
        const Icon = MiniIconDark as ComponentType<{ className?: string }>;
        return <Icon className={styles.icon} />;
    }
    return (
        <Image
            src={MiniIconDark}
            alt=""
            width={56}
            height={56}
            className={styles.icon}
            priority
        />
    );
}

function coverSrc(item: MarketplaceTemplateItem) {
    const preview = item.previewMedia?.find((media) => media.isCover)
        || item.primaryPreview
        || item.previewMedia?.[0]
        || null;
    return preview ? mediaThumbLargeSrc(preview) : '';
}

export function ChatEmptyStage({
    title,
    body,
    composer,
    ready = true,
    showFeatured = true,
}: {
    title: string;
    body?: string;
    composer?: ReactNode;
    ready?: boolean;
    showFeatured?: boolean;
}) {
    const { t: tm } = useTranslation('marketplace');
    const router = useRouter();
    const { token } = useAuthStore();
    const { setPromptText, addAttachments } = useChatSession();
    const [entered, setEntered] = useState(false);
    const [featured, setFeatured] = useState<MarketplaceTemplateItem[]>([]);
    const [featuredReady, setFeaturedReady] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MarketplaceTemplateItem | null>(null);
    const [likedIds, setLikedIds] = useState<string[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!ready) {
            setEntered(false);
            return;
        }
        const timer = window.setTimeout(() => setEntered(true), 80);
        return () => window.clearTimeout(timer);
    }, [ready]);

    useEffect(() => {
        if (!showFeatured) {
            setFeatured([]);
            setFeaturedReady(true);
            return;
        }
        let cancelled = false;
        marketplaceApi.listChatFeatured()
            .then((data) => {
                if (cancelled) return;
                const templates = (data.templates || []).slice(0, 6);
                setFeatured(templates);
                setLikedIds(templates.filter((item) => item.isLiked).map((item) => item._id));
                setSavedIds(templates.filter((item) => item.isBookmarked).map((item) => item._id));
            })
            .catch(() => {
                if (!cancelled) setFeatured([]);
            })
            .finally(() => {
                if (!cancelled) setFeaturedReady(true);
            });
        return () => { cancelled = true; };
    }, [showFeatured]);

    const applyItemPatch = (id: string, patch: Partial<MarketplaceTemplateItem>) => {
        setFeatured((prev) => prev.map((item) => (item._id === id ? { ...item, ...patch } : item)));
        setSelectedItem((current) => (current && current._id === id ? { ...current, ...patch } : current));
    };

    const requireAuth = (action: () => void) => {
        if (!token) {
            useLoginModalStore.getState().openLoginModal();
            return;
        }
        action();
    };

    const toggleLike = (id: string) => requireAuth(async () => {
        const wasLiked = likedIds.includes(id);
        const current = featured.find((item) => item._id === id) || selectedItem;
        const nextCount = Math.max((current?.likeCount || 0) + (wasLiked ? -1 : 1), 0);
        setLikedIds((prev) => (wasLiked ? prev.filter((x) => x !== id) : [...prev, id]));
        applyItemPatch(id, { isLiked: !wasLiked, likeCount: nextCount });
        try {
            const res = await marketplaceApi.toggleLike(id);
            setLikedIds((prev) => (res.liked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isLiked: res.liked, likeCount: res.likeCount });
        } catch {
            setLikedIds((prev) => (wasLiked ? [...prev, id] : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isLiked: wasLiked, likeCount: current?.likeCount || 0 });
        }
    });

    const toggleSave = (id: string) => requireAuth(async () => {
        const wasSaved = savedIds.includes(id);
        setSavedIds((prev) => (wasSaved ? prev.filter((x) => x !== id) : [...prev, id]));
        applyItemPatch(id, { isBookmarked: !wasSaved });
        try {
            const res = await mediaApi.toggleTemplateBookmark(id);
            setSavedIds((prev) => (res.bookmarked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isBookmarked: res.bookmarked });
        } catch {
            setSavedIds((prev) => (wasSaved ? [...prev, id] : prev.filter((x) => x !== id)));
            applyItemPatch(id, { isBookmarked: wasSaved });
        }
    });

    const handlePurchase = (item: MarketplaceTemplateItem) => requireAuth(() => {
        router.push(`/explore/buy/${item._id}`);
    });

    const applyToChat = (payload: { prompt?: string; attachments?: ReturnType<typeof previewToChatAttachment>[] }) => {
        if (payload.prompt) setPromptText(payload.prompt);
        if (payload.attachments?.length) addAttachments(payload.attachments);
        setSelectedItem(null);
    };

    const moreIdeasBtn = (
        <button
            type="button"
            className={styles.moreIdeas}
            onClick={() => router.push('/explore')}
        >
            {tm('more_ideas')}
        </button>
    );

    return (
        <section className={styles.stage}>
            <div className={styles.hero}>
                <div className={styles.stack}>
                    <div className={`${styles.copy} ${entered ? styles.copyEntered : ''}`}>
                        {/* برچسب «قالب» کنار چت هم‌ارتفاع همین لوگو می‌نشیند (TemplateBuilderTab) */}
                        <span className={styles.brandRow} data-chat-stage-logo>
                            <BrandMiniIcon />
                        </span>
                        <h2>{title}</h2>
                        {body ? <p>{body}</p> : null}
                    </div>
                    {composer}
                </div>
            </div>
            {showFeatured && featured.length > 0 ? (
                <div className={styles.featuredBlock}>
                    <div className={styles.featuredGrid}>
                        {featured.map((item) => {
                            const src = coverSrc(item);
                            return (
                                <button
                                    key={item._id}
                                    type="button"
                                    className={styles.featuredCard}
                                    onClick={() => setSelectedItem(item)}
                                >
                                    {src ? <img src={src} alt={item.title} /> : <span className={styles.featuredFallback}>{item.title}</span>}
                                    <span className={styles.featuredLabel}>{item.title}</span>
                                </button>
                            );
                        })}
                    </div>
                    {moreIdeasBtn}
                </div>
            ) : showFeatured && featuredReady ? (
                <div className={styles.featuredBlock}>
                    <p className={styles.featuredHint}>{tm('no_public_templates')}</p>
                    {moreIdeasBtn}
                </div>
            ) : null}

            <ExploreDetailModal
                item={selectedItem}
                isLiked={selectedItem ? likedIds.includes(selectedItem._id) : false}
                isSaved={selectedItem ? savedIds.includes(selectedItem._id) : false}
                isLoggedIn={!!token}
                onClose={() => setSelectedItem(null)}
                onToggleLike={toggleLike}
                onToggleSave={toggleSave}
                onUseProject={(item) => applyToChat({ prompt: item.promptText || item.description || '' })}
                onUsePrompt={(prompt) => applyToChat({ prompt })}
                onUseAsTemplate={(media: MarketplacePreviewMedia) => applyToChat({
                    attachments: [previewToChatAttachment(media)],
                })}
                onPurchase={handlePurchase}
                onOpenItem={(detail) => {
                    setSelectedItem((current) => {
                        if (!current || current._id === detail._id) return { ...(current || {}), ...detail };
                        return detail;
                    });
                    applyItemPatch(detail._id, detail);
                    setLikedIds((prev) => detail.isLiked
                        ? (prev.includes(detail._id) ? prev : [...prev, detail._id])
                        : prev.filter((id) => id !== detail._id));
                    setSavedIds((prev) => detail.isBookmarked
                        ? (prev.includes(detail._id) ? prev : [...prev, detail._id])
                        : prev.filter((id) => id !== detail._id));
                }}
            />
        </section>
    );
}
