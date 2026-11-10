'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuBookmark, LuMessageSquare, LuWorkflow } from 'react-icons/lu';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import type { ExploreTemplateItem, TemplatePreviewMedia } from '@/app/(developers)/projects/types/media-api';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import {
    isMarketplaceTemplateLocked,
    type MarketplacePreviewMedia,
    type MarketplaceTemplateItem,
} from '@/app/(marketplace)/lib/types';
import { mediaThumbSrc } from '@/app/(marketplace)/lib/template-media';
import { ExploreDetailModal } from '@/app/(marketplace)/explore/components/ExploreDetailModal';
import { previewToChatAttachment } from '@/app/(developers)/projects/[projectId]/chat/explore/StudioExploreGrid';
import {
    PERSONAL_CHAT_INJECT_KEY,
    writeStudioChatInject,
} from '@/app/zustand/store/useStudioExploreStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import pageStyles from '@/app/(developers)/projects/ProjectsPage.module.scss';
import styles from './SavedTab.module.scss';
import { usePageLoading } from '@/app/components/PageTransition';

function toMarketplaceItem(item: ExploreTemplateItem): MarketplaceTemplateItem {
    const previewMedia = (item.previewMedia || []) as MarketplacePreviewMedia[];
    return {
        _id: item._id,
        title: item.title,
        description: item.description || '',
        kind: item.kind === 'prompt' ? 'prompt' : 'workflow',
        aiModels: item.aiModels || [],
        promptText: item.promptText || '',
        tags: item.tags || [],
        previewMedia,
        primaryPreview: (item.primaryPreview || previewMedia[0] || null) as MarketplacePreviewMedia | null,
        usageCount: item.usageCount || 0,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        price: item.price ?? 0,
        currency: 'IRT',
        isForSale: !!item.isForSale,
        creator: item.creator,
        isBookmarked: true,
        isLiked: item.isLiked,
        version: item.version,
        approvedAt: item.approvedAt,
    };
}

function PreviewCell({ media }: { media: TemplatePreviewMedia[] }) {
    const { t: tc } = useTranslation('common');
    const previews = (media || []).slice(0, 2);
    if (!previews.length) {
        return <span className={styles.noPreview}>{tc('empty_dash')}</span>;
    }

    return (
        <div className={styles.previewStack}>
            {previews.map((item, index) => (
                <div key={`${item.url}-${index}`} className={styles.previewItem}>
                    {item.type === 'video' ? (
                        <video src={mediaThumbSrc(item)} poster={mediaThumbSrc(item)} muted playsInline className={styles.previewMedia} preload="none" />
                    ) : (
                        <img src={mediaThumbSrc(item)} alt="" className={styles.previewMedia} loading="lazy" />
                    )}
                </div>
            ))}
        </div>
    );
}

export default function TemplatesSavedPage() {
    const { t, i18n } = useTranslation('templates');
    const { t: tm } = useTranslation('marketplace');
    const { t: tc } = useTranslation('common');
    const router = useRouter();
    const { token } = useAuthStore();
    const [items, setItems] = useState<ExploreTemplateItem[]>([]);
    const [loading, setLoading] = useState(true);
    usePageLoading(loading);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<MarketplaceTemplateItem | null>(null);
    const [likedIds, setLikedIds] = useState<string[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await mediaApi.listBookmarkedTemplates();
            const templates = data.templates ?? [];
            setItems(templates);
            setLikedIds(templates.filter((item) => item.isLiked).map((item) => item._id));
        } catch (err) {
            setError(getApiErrorMessage(err, t('load_saved_error')));
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    const openDetail = async (item: ExploreTemplateItem) => {
        const fallback = toMarketplaceItem(item);
        setSelectedItem(fallback);
        try {
            const detail = await marketplaceApi.getTemplate(item._id);
            setSelectedItem({ ...fallback, ...detail, isBookmarked: true });
            if (detail.isLiked) {
                setLikedIds((prev) => (prev.includes(detail._id) ? prev : [...prev, detail._id]));
            }
        } catch (err) {
            setError(getApiErrorMessage(err, tm('load_error')));
        }
    };

    const toggleSave = async (id: string) => {
        try {
            const res = await mediaApi.toggleTemplateBookmark(id);
            if (!res.bookmarked) {
                setItems((prev) => prev.filter((item) => item._id !== id));
                setSelectedItem((current) => (current?._id === id ? null : current));
            }
        } catch (err) {
            setError(getApiErrorMessage(err, t('unsave_error')));
        }
    };

    const toggleLike = async (id: string) => {
        const wasLiked = likedIds.includes(id);
        const current = selectedItem?._id === id ? selectedItem : null;
        const nextCount = Math.max((current?.likeCount || 0) + (wasLiked ? -1 : 1), 0);
        setLikedIds((prev) => (wasLiked ? prev.filter((x) => x !== id) : [...prev, id]));
        if (current) setSelectedItem({ ...current, isLiked: !wasLiked, likeCount: nextCount });
        try {
            const res = await marketplaceApi.toggleLike(id);
            setLikedIds((prev) => (res.liked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
            setSelectedItem((item) => (item?._id === id ? { ...item, isLiked: res.liked, likeCount: res.likeCount } : item));
        } catch (err) {
            setLikedIds((prev) => (wasLiked ? [...prev, id] : prev.filter((x) => x !== id)));
            if (current) setSelectedItem(current);
            setError(getApiErrorMessage(err, tm('like_error')));
        }
    };

    const handleUseInChat = (item: { _id: string; title: string; promptText?: string; description?: string }) => {
        writeStudioChatInject(PERSONAL_CHAT_INJECT_KEY, {
            prompt: item.promptText || item.description || '',
        });
        sessionStorage.setItem('explore_chat_prompt', JSON.stringify({
            templateId: item._id,
            title: item.title,
            prompt: item.promptText || item.description || '',
        }));
        router.push('/chat');
    };

    const handleUseTemplate = async (item: MarketplaceTemplateItem) => {
        if (isMarketplaceTemplateLocked(item)) {
            setSelectedItem(item);
            return;
        }
        if (item.kind === 'prompt') {
            handleUseInChat(item);
            return;
        }
        try {
            const project = await mediaApi.createProject({
                title: item.title || t('from_saved'),
                templateId: item._id,
            });
            router.push(`/projects/${project._id}`);
        } catch (err) {
            setError(getApiErrorMessage(err, t('from_saved_error')));
        }
    };

    const handlePurchase = (item: MarketplaceTemplateItem) => {
        router.push(`/explore/buy/${item._id}`);
    };

    if (loading) {
        return <p className={pageStyles.emptyState}>{tc('loading')}</p>;
    }

    if (items.length === 0) {
        return (
            <div className={styles.emptyWrap}>
                {error && <div className={pageStyles.errorBanner}>{error}</div>}
                <p className={pageStyles.emptyState}>{t('saved_empty')}</p>
                <Link href="/explore" className={styles.exploreLink}>{tc('back')}</Link>
            </div>
        );
    }

    const previewLabel = tc('preview');
    const titleLabel = t('col_title');
    const kindLabel = t('col_kind');
    const creatorLabel = t('col_creator');
    const modelsLabel = t('col_models');
    const versionLabel = t('col_version');
    const actionsLabel = t('col_actions');

    return (
        <div className={styles.tableWrapper}>
            {error && <div className={pageStyles.errorBanner}>{error}</div>}
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>{previewLabel}</th>
                        <th>{titleLabel}</th>
                        <th>{kindLabel}</th>
                        <th>{creatorLabel}</th>
                        <th>{modelsLabel}</th>
                        <th>{versionLabel}</th>
                        <th>{actionsLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr
                            key={item._id}
                            className={styles.clickableRow}
                            onClick={() => openDetail(item)}
                        >
                            <td data-label={previewLabel}>
                                <PreviewCell media={item.previewMedia} />
                            </td>
                            <td data-label={titleLabel} className={styles.titleCell}>
                                <strong>{item.title}</strong>
                                {item.description && (
                                    <span className={styles.desc}>{item.description}</span>
                                )}
                            </td>
                            <td data-label={kindLabel}>
                                <span className={styles.kindBadge}>
                                    {item.kind === 'prompt' ? 'Prompt' : 'Workflow'}
                                </span>
                            </td>
                            <td data-label={creatorLabel}>{item.creator?.fullName || tc('empty_dash')}</td>
                            <td data-label={modelsLabel} className={styles.modelsCell}>
                                {(item.aiModels || []).join(', ') || tc('empty_dash')}
                            </td>
                            <td data-label={versionLabel}>
                                {item.version ? formatAppNumber(item.version, i18n.language) : tc('empty_dash')}
                            </td>
                            <td data-label={actionsLabel} onClick={(e) => e.stopPropagation()}>
                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        className={styles.iconBtn}
                                        title={t('unsave')}
                                        onClick={() => toggleSave(item._id)}
                                    >
                                        <LuBookmark size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.actionBtn}
                                        onClick={() => openDetail(item)}
                                    >
                                        {tc('view')}
                                    </button>
                                    {item.kind === 'prompt' ? (
                                        <button
                                            type="button"
                                            className={styles.actionBtn}
                                            onClick={() => handleUseInChat(item)}
                                        >
                                            <LuMessageSquare size={14} />
                                            {t('chat')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.actionBtn}
                                            onClick={() => handleUseTemplate(toMarketplaceItem(item))}
                                        >
                                            <LuWorkflow size={14} />
                                            {t('project')}
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <ExploreDetailModal
                item={selectedItem}
                isLiked={selectedItem ? likedIds.includes(selectedItem._id) : false}
                isSaved
                isLoggedIn={!!token}
                onClose={() => setSelectedItem(null)}
                onToggleLike={toggleLike}
                onToggleSave={toggleSave}
                onUseProject={handleUseTemplate}
                onPurchase={handlePurchase}
                onOpenItem={(detail) => setSelectedItem(detail)}
                onUsePrompt={(prompt) => {
                    writeStudioChatInject(PERSONAL_CHAT_INJECT_KEY, { prompt });
                    router.push('/chat');
                }}
                onUseAsTemplate={(media: MarketplacePreviewMedia) => {
                    writeStudioChatInject(PERSONAL_CHAT_INJECT_KEY, {
                        attachments: [previewToChatAttachment(media)],
                    });
                    router.push('/chat');
                }}
            />
        </div>
    );
}
