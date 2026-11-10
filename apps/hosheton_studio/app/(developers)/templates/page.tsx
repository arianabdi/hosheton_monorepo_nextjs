'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/app/(developers)/projects/lib/api-client';
import { mediaApi } from '@/app/(developers)/projects/lib/media-api';
import type {
    ExploreTemplateItem,
    MediaTemplateStatus,
    MediaWorkflowTemplate,
    TemplatePreviewMedia,
} from '@/app/(developers)/projects/types/media-api';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import {
    isMarketplaceTemplateLocked,
    type MarketplacePreviewMedia,
    type MarketplaceTemplateItem,
} from '@/app/(marketplace)/lib/types';
import { fixHoshetonMediaUrl, mediaThumbLargeSrc, mediaThumbSrc } from '@/app/(marketplace)/lib/template-media';
import { ExploreDetailModal } from '@/app/(marketplace)/explore/components/ExploreDetailModal';
import { previewToChatAttachment } from '@/app/(developers)/projects/[projectId]/chat/explore/StudioExploreGrid';
import {
    PERSONAL_CHAT_INJECT_KEY,
    writeStudioChatInject,
} from '@/app/zustand/store/useStudioExploreStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { promptGuestLogin } from '@/app/components/guest/guestAccess';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import HScrollStrip from '@/app/components/HScrollStrip/HScrollStrip';
import { rehydrateTemplateCreateStore, templateDraftHasContent, useTemplateCreateStore } from '@/app/zustand/store/useTemplateCreateStore';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { usePageLoading } from '@/app/components/PageTransition';
import { LuFilePen, LuPlus, LuSlidersHorizontal } from 'react-icons/lu';
import { TemplatesEmptyShowcase } from './components/TemplatesEmptyShowcase';
import { TemplateTabEmptyHint } from './components/TemplateTabEmptyHint';
import { useIsStaff } from './lib/personas';
import styles from './TemplateGallery.module.scss';
import TemplateGalleryFilters, {
    applyGalleryFilters,
    DEFAULT_GALLERY_FILTERS,
    type GalleryFilters,
} from './TemplateGalleryFilters';

type GalleryTab = 'mine' | 'pending' | 'saved' | 'purchased';

const GALLERY_TABS: GalleryTab[] = ['mine', 'pending', 'saved', 'purchased'];

/** Width below which the filter sidebar becomes a closed-by-default overlay. */
const COMPACT_VIEWPORT_QUERY = '(max-width: 992px)';

/** ویدیو با کاور (thumbnail JPG) باید <img> باشد؛ <video> فقط وقتی src خود فایل ویدیوست وگرنه هرگز لود نمی‌شود */
function isVideoFileSrc(media: { type?: string; url?: string } | undefined | null, src: string) {
    return media?.type === 'video' && Boolean(src) && src === fixHoshetonMediaUrl(media.url || '');
}

function subscribeCompactViewport(onChange: () => void) {
    const mediaQueryList = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    mediaQueryList.addEventListener('change', onChange);
    return () => mediaQueryList.removeEventListener('change', onChange);
}

function getCompactViewport() {
    return window.matchMedia(COMPACT_VIEWPORT_QUERY).matches;
}

const TAB_LABEL: Record<GalleryTab, string> = {
    mine: 'mine',
    pending: 'filter_pending',
    saved: 'saved',
    purchased: 'purchased',
};

const STATUS_KEY: Record<MediaTemplateStatus, 'draft' | 'pending_review' | 'approved' | 'rejected'> = {
    draft: 'draft',
    pending: 'pending_review',
    approved: 'approved',
    rejected: 'rejected',
};

function toMarketplaceItem(item: MediaWorkflowTemplate): MarketplaceTemplateItem {
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
        primaryPreview: previewMedia.find((media) => media.isCover) || previewMedia[0] || null,
        usageCount: item.usageCount || 0,
        viewCount: item.viewCount,
        likeCount: 0,
        price: item.price ?? 0,
        currency: 'IRT',
        isForSale: !!item.isForSale,
        isBookmarked: true,
        version: item.version,
    };
}

function toGalleryTemplate(item: ExploreTemplateItem): MediaWorkflowTemplate {
    return {
        _id: item._id,
        ownerUserId: item.creator?._id || '',
        title: item.title,
        description: item.description,
        nodes: [],
        edges: [],
        kind: item.kind,
        status: 'approved',
        visibility: 'public',
        promptText: item.promptText,
        previewMedia: item.previewMedia,
        aiModels: item.aiModels,
        tags: item.tags,
        categoryIds: (item.categoryIds || []).map(String),
        usageCount: item.usageCount,
        viewCount: item.viewCount,
        version: item.version,
        price: item.price ?? 0,
        isForSale: item.isForSale,
        createdAt: item.approvedAt || item.updatedAt,
        updatedAt: item.updatedAt,
    };
}

function getCoverMedia(items?: TemplatePreviewMedia[] | null): TemplatePreviewMedia | null {
    if (!items?.length) return null;
    return items.find((item) => item.isCover) || items[0] || null;
}

/** موبایل: اکشن‌های هدر در یک منوی کوچک (جای ردیف دکمه‌ها در عرض کم) */
function HeaderActionsMenu({
    hasDraft,
    createLabel,
    resumeLabel,
    onCreate,
}: {
    hasDraft: boolean;
    createLabel: string;
    resumeLabel: string;
    onCreate: () => void;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return undefined;
        const onPointer = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('pointerdown', onPointer);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('pointerdown', onPointer);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div ref={rootRef} className={styles.mobileActions}>
            <button
                type="button"
                className={`${styles.mobileActionsBtn} ${open ? styles.mobileActionsBtnOpen : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={createLabel}
                title={createLabel}
                onClick={() => setOpen((value) => !value)}
            >
                <LuPlus size={18} />
                {hasDraft ? <span className={styles.mobileActionsDot} aria-hidden /> : null}
            </button>
            {open ? (
                <div className={styles.mobileActionsMenu} role="menu">
                    <button type="button" role="menuitem" onClick={() => { setOpen(false); onCreate(); }}>
                        <LuPlus size={15} />
                        {createLabel}
                    </button>
                    {hasDraft ? (
                        <button type="button" role="menuitem" onClick={() => { setOpen(false); onCreate(); }}>
                            <LuFilePen size={15} />
                            {resumeLabel}
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function TemplateGhost() {
    return (
        <div className={styles.item} aria-hidden="true">
            <div className={styles.mediaClip}>
                <div className={styles.ghost} />
            </div>
        </div>
    );
}

function TemplateGalleryItem({
    template,
    busy,
    specs,
    canManage,
    showStatus,
    onView,
    onEdit,
    onSubmitReview,
    onUse,
    onDelete,
}: {
    template: MediaWorkflowTemplate;
    busy: boolean;
    specs: string;
    canManage: boolean;
    showStatus: boolean;
    onView: () => void;
    onEdit: () => void;
    onSubmitReview: () => void;
    onUse: () => void;
    onDelete: () => void;
}) {
    const { t: tt, i18n } = useTranslation('templates');
    const previews = template.previewMedia || [];
    const coverIndex = Math.max(0, previews.findIndex((item) => item.isCover));
    const [activeIndex, setActiveIndex] = useState(coverIndex);
    const [loaded, setLoaded] = useState(false);
    // فایل خراب/حذف‌شده (مثلاً ۴۰۳ استوریج) — به‌جای اسپینر بی‌پایان، عنوان قالب
    const [failed, setFailed] = useState(false);
    const prompt = (template.promptText || template.publishedSnapshot?.promptText || '').trim();
    const active = previews[activeIndex] || getCoverMedia(previews);
    const coverSrc = active ? mediaThumbLargeSrc(active) : '';
    const coverIsVideo = isVideoFileSrc(active, coverSrc);
    const priceValue = template.price ?? 0;
    const priceLabel = priceValue > 0
        ? tt('toman_amount', { amount: formatAppNumber(priceValue, i18n.language) })
        : '';
    const statusLabel = showStatus && template.status ? tt(STATUS_KEY[template.status]) : '';
    // فقط ادمین: API این را فقط برای ادمین و قالب منتشرشده به نام کاربر نمایشی می‌فرستد
    const personaLabel = template.persona
        ? tt('published_as_persona', { name: template.persona.fullName || template.persona.username, defaultValue: 'به نام {{name}}' })
        : '';
    const showVeil = Boolean(priceLabel || statusLabel || personaLabel);

    useEffect(() => {
        setLoaded(false);
        setFailed(false);
    }, [activeIndex]);

    return (
        <div className={styles.item}>
            <div
                className={styles.mediaClip}
                role="button"
                tabIndex={0}
                onClick={onView}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onView();
                    }
                }}
            >
                {!loaded && !failed && coverSrc ? <div className={styles.ghost} aria-hidden="true" /> : null}
                {coverSrc && !failed ? (
                    coverIsVideo ? (
                        <video
                            src={coverSrc}
                            poster={coverSrc}
                            className={`${styles.media} ${loaded ? styles.mediaReady : ''}`}
                            muted
                            playsInline
                            preload="metadata"
                            onLoadedData={() => setLoaded(true)}
                            onError={() => setFailed(true)}
                        />
                    ) : (
                        <img
                            src={coverSrc}
                            alt={template.title}
                            className={`${styles.media} ${loaded ? styles.mediaReady : ''}`}
                            loading="lazy"
                            onLoad={() => setLoaded(true)}
                            onError={() => setFailed(true)}
                        />
                    )
                ) : (
                    <div className={styles.placeholder}>{template.title}</div>
                )}

                {showVeil ? (
                    <div className={styles.priceVeil}>
                        {priceLabel ? <span>{priceLabel}</span> : null}
                        {statusLabel ? <span className={styles.priceVeilStatus}>{statusLabel}</span> : null}
                        {personaLabel ? (
                            <span
                                className={styles.priceVeilPersona}
                                title={template.persona?.username ? `@${template.persona.username}` : undefined}
                            >
                                {personaLabel}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                <div
                    className={styles.overlay}
                    onWheel={(e) => e.stopPropagation()}
                >
                    <div className={styles.overlaySpacer} aria-hidden="true" />
                    <div className={styles.overlayHeader}>
                        <div className={styles.overlayText}>
                            <div className={styles.overlayTitle}>{template.title}</div>
                            {specs ? <p className={styles.overlaySpecs}>{specs}</p> : null}
                        </div>
                        <TemplateCardActions
                            template={template}
                            busy={busy}
                            canManage={canManage}
                            onView={onView}
                            onEdit={onEdit}
                            onSubmitReview={onSubmitReview}
                            onUse={onUse}
                            onDelete={onDelete}
                        />
                    </div>
                    {prompt ? (
                        <div
                            className={styles.promptBox}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {prompt}
                        </div>
                    ) : null}
                </div>
            </div>
            {previews.length > 1 ? (
                <div className={styles.thumbStrip} role="list">
                    {previews.map((media, index) => {
                        const thumbSrc = mediaThumbSrc(media);
                        if (!thumbSrc) return null;
                        return (
                            <button
                                key={`${media.fileId || media.url}-${index}`}
                                type="button"
                                role="listitem"
                                className={`${styles.thumb} ${index === activeIndex ? styles.thumbActive : ''}`}
                                aria-label={media.label || template.title}
                                aria-pressed={index === activeIndex}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveIndex(index);
                                }}
                            >
                                {isVideoFileSrc(media, thumbSrc) ? (
                                    <video src={thumbSrc} muted playsInline preload="metadata" />
                                ) : (
                                    <img src={thumbSrc} alt="" loading="lazy" />
                                )}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

function TemplateCardActions({
    template,
    busy,
    canManage,
    onView,
    onEdit,
    onSubmitReview,
    onUse,
    onDelete,
}: {
    template: MediaWorkflowTemplate;
    busy: boolean;
    canManage: boolean;
    onView: () => void;
    onEdit: () => void;
    onSubmitReview: () => void;
    onUse: () => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const canEdit = canManage && template.kind === 'prompt' && template.status !== 'pending';
    const canSubmit = canManage && (template.status === 'draft' || template.status === 'rejected');

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if (open) {
            setOpen(false);
            return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({
            top: rect.bottom + 4,
            left: Math.max(8, rect.right - 160),
        });
        setOpen(true);
    };

    const run = (action: () => void) => {
        setOpen(false);
        action();
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={styles.moreBtn}
                aria-label={t('col_actions')}
                aria-expanded={open}
                onClick={toggle}
            >
                ⋯
            </button>
            {open && typeof document !== 'undefined'
                ? createPortal(
                    <div
                        ref={menuRef}
                        className={styles.actionMenu}
                        style={{ top: position.top, left: position.left }}
                        role="menu"
                    >
                        <button type="button" role="menuitem" onClick={() => run(onView)}>
                            {tc('view')}
                        </button>
                        {canEdit && (
                            <button type="button" role="menuitem" onClick={() => run(onEdit)}>
                                {tc('edit')}
                            </button>
                        )}
                        {canSubmit && (
                            <button type="button" role="menuitem" disabled={busy} onClick={() => run(onSubmitReview)}>
                                {t('submit_review')}
                            </button>
                        )}
                        <button type="button" role="menuitem" disabled={busy} onClick={() => run(onUse)}>
                            {t('use')}
                        </button>
                        {canManage && (
                            <button
                                type="button"
                                role="menuitem"
                                className={styles.menuDanger}
                                disabled={busy}
                                onClick={() => run(onDelete)}
                            >
                                {tc('delete')}
                            </button>
                        )}
                    </div>,
                    document.body,
                )
                : null}
        </>
    );
}

export default function TemplateGallery() {
    const { t, i18n } = useTranslation('projects');
    const { t: tt } = useTranslation('templates');
    const { t: tm } = useTranslation('marketplace');
    const router = useRouter();
    const { token } = useAuthStore();
    const userId = useAppStore((s) => s.userId);
    const rtl = isRtlLanguage(i18n.language);
    const [sidebarOpenState, setSidebarOpenState] = useState(true);
    const [sidebarUserToggled, setSidebarUserToggled] = useState(false);
    const [sidebarSliding, setSidebarSliding] = useState(false);
    // Hydration-safe viewport read: the filter sidebar starts open on desktop
    // and closed on phones/tablets, where it renders as an overlay.
    const compactViewport = useSyncExternalStore(subscribeCompactViewport, getCompactViewport, () => false);
    const sidebarOpen = sidebarUserToggled ? sidebarOpenState : !compactViewport;
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<GalleryFilters>(DEFAULT_GALLERY_FILTERS);
    const [activeTab, setActiveTab] = useState<GalleryTab>('mine');
    const [templates, setTemplates] = useState<MediaWorkflowTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<MarketplaceTemplateItem | null>(null);
    const [likedIds, setLikedIds] = useState<string[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    // پیش‌نویس مشترک فرم ساخت قالب (همان که پنل «قالب» چت پر می‌کند)
    const hasLocalDraft = useTemplateCreateStore((state) => state.hydrated
        && (!state.ownerUserId || !userId || state.ownerUserId === userId)
        && templateDraftHasContent(state));
    const containerRef = useRef<HTMLDivElement>(null);
    const mainContentRef = useRef<HTMLElement>(null);

    usePageLoading(loading);

    useEffect(() => {
        rehydrateTemplateCreateStore();
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        const main = mainContentRef.current;
        if (!container || !main) return;

        const onWheel = (event: WheelEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target.closest(`.${styles.overlay}`)) return;
            if (main.contains(target)) return;
            main.scrollTop += event.deltaY;
        };

        container.addEventListener('wheel', onWheel, { passive: true });
        return () => container.removeEventListener('wheel', onWheel);
    }, []);

    const fetchTemplates = useCallback(async () => {
        setError(null);
        // مهمان: قالب شخصی ندارد — همان حالت خالی معرفی هر تب نشان داده می‌شود
        if (!token) {
            setTemplates([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            if (activeTab === 'mine') {
                const { templates: fetched } = await mediaApi.listMyTemplates();
                setTemplates(fetched ?? []);
            } else if (activeTab === 'pending') {
                const { templates: fetched } = await mediaApi.listReviewRequests({
                    status: 'pending',
                    page: 1,
                    limit: 100,
                });
                setTemplates(fetched ?? []);
            } else if (activeTab === 'saved') {
                const { templates: fetched } = await mediaApi.listBookmarkedTemplates();
                const mapped = (fetched ?? []).map(toGalleryTemplate);
                setTemplates(mapped);
                setSavedIds(mapped.map((item) => item._id));
                setLikedIds((fetched ?? []).filter((item) => item.isLiked).map((item) => item._id));
            } else {
                const { templates: fetched } = await marketplaceApi.listPurchasedTemplates();
                const mapped = (fetched ?? []).map(toGalleryTemplate);
                setTemplates(mapped);
                setSavedIds((fetched ?? []).filter((item) => item.isBookmarked).map((item) => item._id));
                setLikedIds((fetched ?? []).filter((item) => item.isLiked).map((item) => item._id));
            }
        } catch (err) {
            const fallback =
                activeTab === 'mine'
                    ? t('load_templates_error')
                    : activeTab === 'pending'
                        ? tt('load_requests_error')
                        : activeTab === 'saved'
                            ? tt('load_saved_error')
                            : tt('load_purchased_error');
            setError(getApiErrorMessage(err, fallback));
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, t, token, tt]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    useEffect(() => {
        mainContentRef.current?.scrollTo({ top: 0 });
    }, [activeTab]);

    const handleSubmitReview = async (template: MediaWorkflowTemplate) => {
        setBusyId(template._id);
        setError(null);
        try {
            const updated = await mediaApi.submitTemplateForReview(template._id);
            setTemplates((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        } catch (err) {
            setError(getApiErrorMessage(err, t('review_error')));
        } finally {
            setBusyId(null);
        }
    };

    const handleUseTemplate = async (template: MediaWorkflowTemplate) => {
        setBusyId(template._id);
        setError(null);
        try {
            const project = await mediaApi.createProject({
                title: t('copy_suffix', { title: template.title }),
                description: template.description,
                templateId: template._id,
            });
            router.push(`/projects/${project._id}`);
        } catch (err) {
            setError(getApiErrorMessage(err, t('from_template_error')));
            setBusyId(null);
        }
    };

    const handleDelete = async (template: MediaWorkflowTemplate) => {
        if (!confirm(t('delete_template_confirm', { title: template.title }))) return;
        setBusyId(template._id);
        setError(null);
        try {
            await mediaApi.deleteTemplate(template._id);
            setTemplates((prev) => prev.filter((item) => item._id !== template._id));
        } catch (err) {
            setError(getApiErrorMessage(err, t('delete_template_error')));
        } finally {
            setBusyId(null);
        }
    };

    const isMarketplaceTab = activeTab === 'saved' || activeTab === 'purchased';

    const openMarketplaceDetail = async (template: MediaWorkflowTemplate) => {
        const fallback = toMarketplaceItem(template);
        setSelectedItem(fallback);
        try {
            const detail = await marketplaceApi.getTemplate(template._id);
            setSelectedItem({
                ...fallback,
                ...detail,
                isBookmarked: activeTab === 'saved' ? true : detail.isBookmarked,
            });
            setLikedIds((prev) => {
                if (detail.isLiked) return prev.includes(detail._id) ? prev : [...prev, detail._id];
                return prev.filter((id) => id !== detail._id);
            });
            setSavedIds((prev) => {
                if (detail.isBookmarked || activeTab === 'saved') {
                    return prev.includes(detail._id) ? prev : [...prev, detail._id];
                }
                return prev.filter((id) => id !== detail._id);
            });
        } catch (err) {
            setError(getApiErrorMessage(err, tt('load_saved_error')));
        }
    };

    const applyMarketplacePatch = (id: string, patch: Partial<MarketplaceTemplateItem>) => {
        setSelectedItem((current) => (current && current._id === id ? { ...current, ...patch } : current));
    };

    const toggleLike = async (id: string) => {
        if (!token) {
            router.push('/login');
            return;
        }
        const wasLiked = likedIds.includes(id);
        const current = selectedItem?._id === id ? selectedItem : null;
        const nextCount = Math.max((current?.likeCount || 0) + (wasLiked ? -1 : 1), 0);
        setLikedIds((prev) => (wasLiked ? prev.filter((x) => x !== id) : [...prev, id]));
        applyMarketplacePatch(id, { isLiked: !wasLiked, likeCount: nextCount });
        try {
            const res = await marketplaceApi.toggleLike(id);
            setLikedIds((prev) => (res.liked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
            applyMarketplacePatch(id, { isLiked: res.liked, likeCount: res.likeCount });
        } catch (err) {
            setLikedIds((prev) => (wasLiked ? [...prev, id] : prev.filter((x) => x !== id)));
            applyMarketplacePatch(id, { isLiked: wasLiked, likeCount: current?.likeCount || 0 });
            setError(getApiErrorMessage(err, tm('like_error')));
        }
    };

    const toggleSave = async (id: string) => {
        if (!token) {
            router.push('/login');
            return;
        }
        const wasSaved = savedIds.includes(id);
        setSavedIds((prev) => (wasSaved ? prev.filter((x) => x !== id) : [...prev, id]));
        applyMarketplacePatch(id, { isBookmarked: !wasSaved });
        try {
            const res = await mediaApi.toggleTemplateBookmark(id);
            setSavedIds((prev) => (res.bookmarked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
            applyMarketplacePatch(id, { isBookmarked: res.bookmarked });
            if (!res.bookmarked && activeTab === 'saved') {
                setTemplates((prev) => prev.filter((item) => item._id !== id));
                setSelectedItem((current) => (current?._id === id ? null : current));
            }
        } catch (err) {
            setSavedIds((prev) => (wasSaved ? [...prev, id] : prev.filter((x) => x !== id)));
            applyMarketplacePatch(id, { isBookmarked: wasSaved });
            setError(getApiErrorMessage(err, tt('unsave_error')));
        }
    };

    const handleMarketplaceUse = async (item: MarketplaceTemplateItem) => {
        if (isMarketplaceTemplateLocked(item)) {
            setSelectedItem(item);
            return;
        }
        if (item.kind === 'prompt') {
            writeStudioChatInject(PERSONAL_CHAT_INJECT_KEY, {
                prompt: item.promptText || item.description || '',
            });
            router.push('/chat');
            return;
        }
        try {
            const project = await mediaApi.createProject({
                title: item.title || t('from_template'),
                templateId: item._id,
            });
            router.push(`/projects/${project._id}`);
        } catch (err) {
            setError(getApiErrorMessage(err, t('from_template_error')));
        }
    };

    // ساختن قالب برای مهمان: پنجره‌ی ورود، بعد از ورود به همان فرم ساخت
    const openCreate = () => {
        if (!token) {
            promptGuestLogin('/templates/new');
            return;
        }
        router.push('/templates/new');
    };

    const handlePurchase = (item: MarketplaceTemplateItem) => {
        if (!token) {
            router.push('/login');
            return;
        }
        router.push(`/explore/buy/${item._id}`);
    };

    const filteredTemplates = useMemo(
        () => applyGalleryFilters(templates, filters, search),
        [templates, filters, search],
    );

    const emptyMessage =
        activeTab === 'saved'
            ? tt('saved_empty')
            : activeTab === 'purchased'
                ? tt('purchased_empty')
                : activeTab === 'pending'
                    ? tt('pending_empty')
                    : t('empty_templates');
    const canManage = activeTab === 'mine' || activeTab === 'pending';
    const isStaff = useIsStaff();

    return (
        <div
            ref={containerRef}
            className={`${styles.container} ${sidebarOpen ? styles.sidebarIsOpen : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
        >
            {/* Overlay for Mobile */}
            {sidebarOpen && (
                <div
                    className={styles.sidebarScrim}
                    onClick={() => {
                        setSidebarUserToggled(true);
                        setSidebarOpenState(false);
                    }}
                    aria-hidden="true"
                />
            )}

            <button
                type="button"
                className={`${styles.sidebarToggleBtn} ${sidebarOpen ? '' : styles.sidebarToggleBtnClosed}`}
                onClick={() => {
                    setSidebarSliding(true);
                    if (!sidebarUserToggled) {
                        setSidebarUserToggled(true);
                        setSidebarOpenState(!sidebarOpen);
                    } else {
                        setSidebarOpenState((open) => !open);
                    }
                }}
                title={tt('filters_toggle')}
                aria-label={tt('filters_toggle')}
                aria-expanded={sidebarOpen}
            >
                {/* آیکون فیلتر — معلوم باشد این دکمه فیلترهای قالب را باز/بسته می‌کند */}
                <LuSlidersHorizontal size={15} aria-hidden />
            </button>

            {/* Sidebar */}
            <aside
                className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed} ${sidebarSliding ? styles.sidebarSliding : ''}`}
                onTransitionEnd={(event) => {
                    if (event.propertyName === 'transform') setSidebarSliding(false);
                }}
            >
                <div className={styles.sidebarInner}>
                    <div className={styles.searchWrapper}>
                        <span className={styles.searchIcon} aria-hidden="true">🔍</span>
                        <input
                            type="search"
                            placeholder={tt('search_placeholder')}
                            className={styles.searchInput}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label={tt('search_placeholder')}
                        />
                    </div>

                    <h2 className={styles.title}>{tt('gallery_intro_title')}</h2>
                    <p className={styles.description}>{tt('gallery_intro_body')}</p>

                    <TemplateGalleryFilters
                        templates={templates}
                        filters={filters}
                        onChange={setFilters}
                        showDraftStatus={activeTab === 'mine'}
                        showPublisher={isStaff && canManage}
                    />
                </div>
            </aside>

            {/* Main Content Area */}
            <main ref={mainContentRef} className={styles.mainContent}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <nav className={styles.tabNav} aria-label={tt('title')}>
                            <HScrollStrip className={styles.tabScroller}>
                                {GALLERY_TABS.map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                                        aria-current={activeTab === tab ? 'page' : undefined}
                                        onClick={() => {
                                            if (tab === activeTab) return;
                                            setSearch('');
                                            setFilters(DEFAULT_GALLERY_FILTERS);
                                            setSelectedItem(null);
                                            setActiveTab(tab);
                                        }}
                                    >
                                        {tt(TAB_LABEL[tab])}
                                    </button>
                                ))}
                            </HScrollStrip>
                        </nav>
                    </div>

                    {/* موبایل: یک دکمه‌ی «+» که «ایجاد قالب» و «ادامه پیش‌نویس» را در منو دارد */}
                    <HeaderActionsMenu
                        hasDraft={hasLocalDraft}
                        createLabel={tt('create')}
                        resumeLabel={tt('resume_draft', { defaultValue: 'ادامه پیش‌نویس' })}
                        onCreate={() => openCreate()}
                    />
                    <div className={styles.headerRight}>
                        {hasLocalDraft && (
                            <button
                                type="button"
                                className={styles.createBtn}
                                onClick={() => openCreate()}
                            >
                                {tt('resume_draft', { defaultValue: 'ادامه پیش‌نویس' })}
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles.createBtn}
                            onClick={() => openCreate()}
                            title={tt('create')}
                            aria-label={tt('create')}
                        >
                            <LuPlus size={18} />
                            <span className={styles.createBtnLabel}>{tt('create')}</span>
                        </button>
                    </div>
                </header>

                {/* Gallery Grid */}
                <div className={styles.galleryGrid}>
                    {error && <p className={styles.itemSpecs}>{error}</p>}
                    {loading && Array.from({ length: 6 }, (_, index) => (
                        <TemplateGhost key={`ghost-${index}`} />
                    ))}
                    {!loading && !error && filteredTemplates.length === 0 && (
                        search.trim() || filters.tags.length || filters.categories.length || filters.kind.length || filters.paid.length || filters.status.length ? (
                            <p className={styles.itemSpecs}>{tt('no_filter_results')}</p>
                        ) : activeTab === 'mine' ? (
                            // هنوز قالبی ساخته نشده: معرفی چندبخشی مثل حالت خالی پروژه‌ها
                            <div className={styles.emptyShowcase}>
                                <TemplatesEmptyShowcase title={emptyMessage} />
                            </div>
                        ) : (
                            // تب‌های بررسی، نشان‌شده و خریداری‌شده: موشن کوچک وسط صفحه
                            <div className={styles.emptyShowcase}>
                                <TemplateTabEmptyHint tab={activeTab} title={emptyMessage} />
                            </div>
                        )
                    )}
                    {!loading && filteredTemplates.map((item) => {
                        const kindLabel = item.kind === 'prompt' ? 'Prompt' : 'Workflow';
                        const specs = canManage
                            ? [kindLabel, t(STATUS_KEY[item.status])].filter(Boolean).join(' · ')
                            : kindLabel;

                        return (
                            <TemplateGalleryItem
                                key={item._id}
                                template={item}
                                busy={busyId === item._id}
                                specs={specs}
                                canManage={canManage}
                                showStatus={canManage}
                                onView={() => {
                                    if (isMarketplaceTab) {
                                        void openMarketplaceDetail(item);
                                        return;
                                    }
                                    router.push(`/templates/${item._id}/view`);
                                }}
                                onEdit={() => router.push(`/templates/${item._id}/edit`)}
                                onSubmitReview={() => handleSubmitReview(item)}
                                onUse={() => handleUseTemplate(item)}
                                onDelete={() => handleDelete(item)}
                            />
                        );
                    })}
                </div>
            </main>

            <ExploreDetailModal
                item={selectedItem}
                isLiked={selectedItem ? likedIds.includes(selectedItem._id) : false}
                isSaved={selectedItem ? savedIds.includes(selectedItem._id) : false}
                isLoggedIn={!!token}
                onClose={() => setSelectedItem(null)}
                onToggleLike={toggleLike}
                onToggleSave={toggleSave}
                onUseProject={handleMarketplaceUse}
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
