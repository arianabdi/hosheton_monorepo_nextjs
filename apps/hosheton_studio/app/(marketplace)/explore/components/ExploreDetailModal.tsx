'use client';

import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import {
    IoBookmark,
    IoBookmarkOutline,
    IoHeart,
    IoHeartOutline,
} from 'react-icons/io5';
import {
    LuChevronLeft,
    LuChevronRight,
    LuClipboard,
    LuDownload,
    LuEllipsis,
    LuExternalLink,
    LuImage,
    LuLock,
    LuMaximize2,
    LuPlay,
    LuRefreshCw,
    LuShare2,
    LuSparkles,
    LuWorkflow,
    LuX,
} from 'react-icons/lu';
import type { ExploreWorkflowPreview as ExploreWorkflowGraph, MarketplacePreviewMedia, MarketplaceTemplateItem } from '@/app/(marketplace)/lib/types';
import { marketplaceApi } from '@/app/(marketplace)/lib/marketplace-api';
import { useLoginModalStore } from '@/app/zustand/store/useLoginModalStore';
import { templateDetailUrl } from '@/app/(marketplace)/lib/explore-detail';
import { categoryHref, categoryTrailFor } from '@/app/(marketplace)/lib/explore-taxonomy';
import { useTemplateCategoryTree } from '@/app/(marketplace)/lib/useTemplateCategoryTree';
import { useCategoryName } from '@/app/(marketplace)/lib/useCategoryName';
import { mediaOriginalSrc, previewImageSrc, videoPosterSrc } from '@/app/(marketplace)/lib/template-media';
import { ExploreWorkflowPreview } from './ExploreWorkflowPreview';
import { ImageLightbox } from '@/app/(developers)/projects/[projectId]/components/CustomNodes/ImageLightbox';
import styles from './ExploreDetailModal.module.scss';

interface ExploreDetailModalProps {
    item: MarketplaceTemplateItem | null;
    isLiked: boolean;
    isSaved: boolean;
    isLoggedIn: boolean;
    onClose: () => void;
    onToggleLike: (id: string) => void;
    onToggleSave: (id: string) => void;
    onUseProject: (item: MarketplaceTemplateItem) => void;
    onPurchase: (item: MarketplaceTemplateItem) => void;
    onOpenItem?: (item: MarketplaceTemplateItem) => void;
    embedded?: boolean;
    onUsePrompt?: (prompt: string) => void;
    onUseAsTemplate?: (media: MarketplacePreviewMedia) => void;
}

export function ExploreDetailModal({
    item,
    isLiked,
    isSaved,
    isLoggedIn,
    onClose,
    onToggleLike,
    onToggleSave,
    onUseProject,
    onPurchase,
    onOpenItem,
    embedded = false,
    onUsePrompt,
    onUseAsTemplate,
}: ExploreDetailModalProps) {
    const { t, i18n } = useTranslation('marketplace');
    const { t: tt } = useTranslation('templates');
    const { t: tc } = useTranslation('common');
    const router = useRouter();
    const lang = i18n.language;
    const shellRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);
    const [readyKey, setReadyKey] = useState('');
    const [promptOpen, setPromptOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [similar, setSimilar] = useState<MarketplaceTemplateItem[]>([]);
    const [workflowPreview, setWorkflowPreview] = useState<ExploreWorkflowGraph | null>(null);
    const [workflowLoading, setWorkflowLoading] = useState(false);
    // موبایل: صحنه فقط یک‌سوم صفحه است؛ بزرگ‌نمایی تصویر با همان Lightbox چت (کلیک: fit ↔ اندازهٔ کامل)
    const [zoomSrc, setZoomSrc] = useState('');
    const zoomOpenRef = useRef(false);
    zoomOpenRef.current = Boolean(zoomSrc);
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const { nodes: categoryNodes } = useTemplateCategoryTree();
    const nameOf = useCategoryName();
    // Detail responses carry the named trail; list items only carry the slug path — resolve names from the tree.
    const categoryTrail = useMemo(() => {
        if (item?.categoryTrail?.length) return item.categoryTrail;
        return categoryTrailFor(categoryNodes, item?.categoryPath);
    }, [item?.categoryTrail, item?.categoryPath, categoryNodes]);

    const previews = useMemo(() => {
        if (!item) return [];
        return item.previewMedia?.length
            ? item.previewMedia
            : (item.primaryPreview ? [item.primaryPreview] : []);
    }, [item]);

    const hasWorkflowSlide = item?.kind === 'workflow';
    const slideCount = previews.length + (hasWorkflowSlide ? 1 : 0);

    useEffect(() => {
        if (!item) return;
        if (!embedded) document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            // Escape مال نمای بزرگ است، نه بستن کل جزئیات
            if (zoomOpenRef.current) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') setIndex((v) => (slideCount ? (v - 1 + slideCount) % slideCount : 0));
            if (e.key === 'ArrowRight') setIndex((v) => (slideCount ? (v + 1) % slideCount : 0));
        };
        window.addEventListener('keydown', onKey);
        return () => {
            if (!embedded) document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [item, onClose, slideCount, embedded]);

    useEffect(() => {
        setIndex(0);
        setZoomSrc('');
        setPromptOpen(false);
        setCopied(false);
        setSimilar([]);
        setWorkflowPreview(null);
        setWorkflowLoading(false);
        shellRef.current?.scrollTo({ top: 0 });
        if (!item) return;
        setWorkflowPreview(item.kind === 'workflow' ? (item.workflowPreview || null) : null);
        let cancelled = false;
        marketplaceApi.listSimilar(item._id)
            .then((data) => {
                if (!cancelled) setSimilar((data.templates || []).filter((t) => t._id !== item._id));
            })
            .catch(() => {
                if (!cancelled) setSimilar([]);
            });
        if (item.kind === 'workflow' && !item.workflowPreview) setWorkflowLoading(true);
        marketplaceApi.getTemplate(item._id)
            .then((detail) => {
                if (cancelled) return;
                setWorkflowPreview(detail.workflowPreview || null);
                onOpenItem?.(detail);
            })
            .catch(() => {
                if (!cancelled) setWorkflowPreview(item.workflowPreview || null);
            })
            .finally(() => {
                if (!cancelled) setWorkflowLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [item?._id]);

    useEffect(() => {
        if (item?.kind === 'workflow' && item.workflowPreview) {
            setWorkflowPreview(item.workflowPreview);
        }
    }, [item?.kind, item?.workflowPreview]);

    useEffect(() => {
        const urls = previews.map((preview) => previewImageSrc(preview)).filter(Boolean);
        if (!urls.length) return undefined;

        let cancelled = false;
        const applyHeight = (ratio: number) => {
            if (cancelled || !shellRef.current) return;
            const width = window.innerWidth;
            const height = Math.min(window.innerHeight, Math.max(220, Math.round(width * ratio)));
            shellRef.current.style.setProperty('--mobile-stage-h', `${height}px`);
        };

        applyHeight(1.15);
        Promise.all(urls.map((url) => new Promise<number>((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image.naturalHeight / Math.max(image.naturalWidth, 1));
            image.onerror = () => resolve(1.15);
            image.src = url;
        }))).then((ratios) => {
            applyHeight(Math.max(...ratios, 0.8));
        });

        const onResize = () => {
            const current = shellRef.current?.style.getPropertyValue('--mobile-stage-h');
            if (current) {
                Promise.all(urls.map((url) => new Promise<number>((resolve) => {
                    const image = new Image();
                    image.onload = () => resolve(image.naturalHeight / Math.max(image.naturalWidth, 1));
                    image.onerror = () => resolve(1.15);
                    image.src = url;
                }))).then((ratios) => applyHeight(Math.max(...ratios, 0.8)));
            }
        };
        window.addEventListener('resize', onResize);
        return () => {
            cancelled = true;
            window.removeEventListener('resize', onResize);
        };
    }, [previews]);

    const safeIndex = slideCount ? Math.min(index, slideCount - 1) : 0;
    const showingWorkflow = hasWorkflowSlide && safeIndex === previews.length;
    const current = showingWorkflow ? null : previews[safeIndex];
    const blurUrl = current?.type === 'image'
        ? previewImageSrc(current)
        : previewImageSrc(previews.find((p) => p.type === 'image'));
    const slideKey = showingWorkflow ? `workflow-${item?._id}` : (current?.url || '');
    const slideReady = showingWorkflow || !current?.url || readyKey === slideKey;

    if (!item) return null;

    const creatorName = item.creator?.fullName || t('creator');
    const creatorId = item.creator?._id;
    const creatorAvatar = item.creator?.avatar || '';
    const creatorIdentity = (
        <>
            {creatorAvatar ? (
                <img src={creatorAvatar} alt="" className={styles.handleAvatar} />
            ) : (
                <span className={`${styles.handleAvatar} ${styles.handleAvatarFallback}`} aria-hidden>
                    {creatorName.trim().charAt(0)}
                </span>
            )}
            <span className={styles.handleName}>{creatorName}</span>
        </>
    );
    const isPaid = item.isForSale && item.price > 0;
    const isLocked = item.isLocked || (isPaid && !item.hasAccess);
    const likeCount = item.likeCount || 0;
    const prompt = item.promptText || item.description || '';
    const promptPreview = (item.promptPreview || '').trim();
    const canExpandPrompt = prompt.length > 220;
    // صحنه همیشه چپ‌به‌راست است؛ ستون جزئیات جهت زبان رابط را می‌گیرد و عنوان/پرامپت جهت خود متن را (dir="auto")
    const uiDir = i18n.dir(lang);

    // موبایل: کشیدن افقی روی صحنه = اسلاید بعد/قبل (صحنه LTR است: کشیدن به چپ = بعدی).
    // روی پیش‌نمایش ورک‌فلو کشیدن مال جابه‌جایی گراف است.
    const onStageTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        swipeStartRef.current = touch && slideCount > 1 && !showingWorkflow ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const onStageTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        setIndex((v) => (dx < 0 ? (v + 1) % slideCount : (v - 1 + slideCount) % slideCount));
    };

    const requireAuth = (fn: () => void) => {
        if (!isLoggedIn) {
            useLoginModalStore.getState().openLoginModal();
            return;
        }
        fn();
    };

    const copyPrompt = async () => {
        if (!prompt) return;
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch { /* ignore */ }
    };

    const shareItem = async () => {
        // Share the canonical detail URL (slug when available) so recipients open this template.
        const url = templateDetailUrl(item, window.location.origin);
        try {
            if (navigator.share) {
                await navigator.share({ title: item.title, url });
            } else {
                await navigator.clipboard.writeText(url);
            }
        } catch { /* ignore */ }
    };

    const downloadCurrent = () => {
        if (!current?.url) return;
        const link = document.createElement('a');
        link.href = current.url;
        link.download = `${item.title || 'explore'}-${safeIndex + 1}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const useTemplate = () => {
        if (isLocked) {
            requireAuth(() => onPurchase(item));
            return;
        }
        // فقط متن را به کادر چت می‌برد — مهمان هم می‌تواند (ورود فقط موقع ارسال)
        if (onUsePrompt) {
            onUsePrompt(prompt);
            return;
        }
        requireAuth(() => onUseProject(item));
    };

    const useAsTemplate = () => {
        if (isLocked) {
            requireAuth(() => onPurchase(item));
            return;
        }
        if (onUseAsTemplate && current) {
            onUseAsTemplate(current);
            return;
        }
        downloadCurrent();
    };

    const modal = (
        <div className={`${styles.shell} ${embedded ? styles.embedded : ''}`} ref={shellRef} role="dialog" aria-modal={!embedded} aria-label={item.title}>
            <button type="button" className={styles.mobileBack} onClick={onClose} aria-label={tc('close')}>
                <LuChevronLeft size={22} />
            </button>

            <div className={styles.scrollBody}>
            <section className={styles.stage}>
                {blurUrl && <div className={styles.blur} style={{ backgroundImage: `url(${blurUrl})` }} />}
                <div className={styles.wash} />

                <div className={styles.topBar}>
                    <span className={styles.counter}>{slideCount ? `${formatAppNumber(safeIndex + 1, lang)}/${formatAppNumber(slideCount, lang)}` : `${formatAppNumber(0, lang)}/${formatAppNumber(0, lang)}`}</span>
                    <button type="button" className={styles.iconBtn} aria-label={tc('download')} onClick={downloadCurrent}>
                        <LuDownload size={16} />
                    </button>
                    {creatorId && (
                        <Link href={`/creators/${creatorId}`} className={styles.iconBtn} aria-label={t('creator_profile')}>
                            <LuEllipsis size={16} />
                        </Link>
                    )}
                    <span className={styles.escHint}>esc</span>
                    <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={tc('close')}>
                        <LuX size={16} />
                    </button>
                </div>

                {slideCount > 0 ? (
                    <div className={styles.slider}>
                        {slideCount > 1 && (
                            <button
                                type="button"
                                className={`${styles.navBtn} ${styles.prev}`}
                                onClick={() => setIndex((v) => (v - 1 + slideCount) % slideCount)}
                                aria-label={tc('previous')}
                            >
                                <LuChevronLeft size={20} />
                            </button>
                        )}

                        <div className={styles.stageBody}>
                            <div
                                className={`${styles.slide} ${showingWorkflow ? styles.workflowSlide : ''}`}
                                onTouchStart={onStageTouchStart}
                                onTouchEnd={onStageTouchEnd}
                            >
                                {!showingWorkflow && !slideReady ? (
                                    <div className={styles.slideGhost} aria-hidden="true" />
                                ) : null}
                                {showingWorkflow ? (
                                    <ExploreWorkflowPreview
                                        graph={workflowPreview}
                                        locked={isLocked}
                                        loading={workflowLoading}
                                        active={showingWorkflow}
                                    />
                                ) : current?.type === 'video' ? (
                                    <ExploreVideoSlide
                                        key={slideKey}
                                        media={current}
                                        title={item.title}
                                        className={`${styles.media} ${slideReady ? styles.mediaReady : styles.mediaLoading}`}
                                        onReady={() => setReadyKey(slideKey)}
                                    />
                                ) : current ? (
                                    <img
                                        key={slideKey}
                                        src={current.url}
                                        alt={item.title}
                                        className={`${styles.media} ${slideReady ? styles.mediaReady : styles.mediaLoading}`}
                                        onLoad={() => setReadyKey(slideKey)}
                                        onError={() => setReadyKey(slideKey)}
                                        onClick={() => {
                                            if (window.matchMedia('(max-width: 900px)').matches) setZoomSrc(current.url);
                                        }}
                                    />
                                ) : null}
                                {current?.type === 'image' && current.url ? (
                                    <button
                                        type="button"
                                        className={styles.zoomBtn}
                                        onClick={() => setZoomSrc(current.url)}
                                        aria-label={tc('view')}
                                    >
                                        <LuMaximize2 size={16} />
                                    </button>
                                ) : null}
                            </div>

                            {slideCount > 1 && (
                                <div className={styles.thumbs}>
                                    {previews.map((preview, i) => (
                                        <button
                                            key={`${preview.url}-${i}`}
                                            type="button"
                                            className={`${styles.thumb} ${i === safeIndex ? styles.thumbActive : ''}`}
                                            onClick={() => setIndex(i)}
                                            aria-label={t('image_n', { index: formatAppNumber(i + 1, lang) })}
                                        >
                                            {previewImageSrc(preview) ? (
                                                <img src={previewImageSrc(preview)} alt="" loading="lazy" />
                                            ) : preview.type === 'video' ? (
                                                <LuPlay size={18} aria-hidden="true" />
                                            ) : null}
                                        </button>
                                    ))}
                                    {hasWorkflowSlide && (
                                        <button
                                            type="button"
                                            className={`${styles.thumb} ${styles.thumbWorkflow} ${showingWorkflow ? styles.thumbActive : ''}`}
                                            onClick={() => setIndex(previews.length)}
                                            aria-label={t('workflow_preview')}
                                        >
                                            <LuWorkflow size={20} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {slideCount > 1 && (
                            <button
                                type="button"
                                className={`${styles.navBtn} ${styles.next}`}
                                onClick={() => setIndex((v) => (v + 1) % slideCount)}
                                aria-label={tc('next')}
                            >
                                <LuChevronRight size={20} />
                            </button>
                        )}
                        {slideCount > 1 && (
                            <div className={styles.dots}>
                                {previews.map((_, i) => (
                                    <button
                                        key={`dot-${i}`}
                                        type="button"
                                        className={`${styles.dot} ${i === safeIndex ? styles.dotActive : ''}`}
                                        onClick={() => setIndex(i)}
                                        aria-label={t('media_n', { index: formatAppNumber(i + 1, lang) })}
                                    />
                                ))}
                                {hasWorkflowSlide && (
                                    <button
                                        type="button"
                                        className={`${styles.dot} ${showingWorkflow ? styles.dotActive : ''}`}
                                        onClick={() => setIndex(previews.length)}
                                        aria-label={t('workflow_preview')}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.emptyStage}>
                        <LuWorkflow size={42} />
                        <p>{t('no_preview')}</p>
                    </div>
                )}
            </section>

            <aside className={styles.sidebar} dir={uiDir}>
                <div className={styles.sidebarScroll}>
                    <div className={styles.sidebarHeader}>
                        <div className={styles.titleBlock}>
                            {categoryTrail.length ? (
                                <nav aria-label={t('breadcrumb')} className={styles.crumbs}>
                                    <Link href="/explore" scroll={false}>{t('explore_root')}</Link>
                                    {categoryTrail.map((crumb) => (
                                        <Link key={crumb.path.join('/')} href={categoryHref(crumb)} scroll={false}>
                                            {nameOf(crumb)}
                                        </Link>
                                    ))}
                                </nav>
                            ) : null}
                            <h2 className={styles.title} dir="auto">{item.title}</h2>
                            {creatorId && (
                                <Link href={`/creators/${creatorId}`} className={styles.outLink} aria-label={t('profile')}>
                                    <LuExternalLink size={14} />
                                </Link>
                            )}
                            {creatorId ? (
                                <Link href={`/creators/${creatorId}`} className={styles.handle} aria-label={t('creator_profile')}>
                                    {creatorIdentity}
                                </Link>
                            ) : (
                                <span className={styles.handle}>{creatorIdentity}</span>
                            )}
                        </div>
                        <span className={styles.kindChip}>
                            {item.kind === 'workflow' ? <LuWorkflow size={13} /> : <LuImage size={13} />}
                            {item.aiModels[0] || (item.kind === 'workflow' ? 'Workflow' : 'Prompt')}
                        </span>
                    </div>

                    <div className={styles.socialRow}>
                        <button type="button" className={styles.ghostBtn} onClick={() => requireAuth(() => onToggleLike(item._id))}>
                            {isLiked ? <IoHeart size={18} color="#ff4d6d" /> : <IoHeartOutline size={18} />}
                            {formatAppNumber(likeCount, lang)}
                        </button>
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => requireAuth(() => onToggleSave(item._id))}
                            aria-label={t('save')}
                        >
                            {isSaved ? <IoBookmark size={17} color="#ffd166" /> : <IoBookmarkOutline size={17} />}
                        </button>
                        <button type="button" className={styles.ghostBtn} onClick={shareItem} aria-label={t('share')}>
                            <LuShare2 size={16} />
                        </button>
                        <button type="button" className={styles.copyBtn} onClick={copyPrompt} disabled={!prompt || isLocked}>
                            <LuClipboard size={14} />
                            {copied ? t('copied') : t('copy_prompt')}
                        </button>
                    </div>

                    {isLocked ? (
                        promptPreview || item.kind === 'prompt' ? (
                            <div className={styles.lockedPrompt}>
                                {promptPreview ? (
                                    <>
                                        <p className={styles.sectionLabel}>Prompt</p>
                                        <p className={styles.promptTeaser} dir="auto">
                                            <span>{promptPreview}</span>
                                            <span className={styles.promptFade} aria-hidden="true">
                                                ••••••••••••••••••••
                                            </span>
                                        </p>
                                    </>
                                ) : null}
                                <div className={styles.lockedNote}>
                                    <LuLock size={16} /> {t('prompt_locked')}
                                </div>
                            </div>
                        ) : null
                    ) : prompt ? (
                        <>
                            <p className={styles.sectionLabel}>Prompt</p>
                            <p className={`${styles.prompt} ${!promptOpen && canExpandPrompt ? styles.promptClamp : ''}`} dir="auto">
                                {prompt}
                            </p>
                            {canExpandPrompt && (
                                <button type="button" className={styles.showMore} onClick={() => setPromptOpen((v) => !v)}>
                                    {promptOpen ? t('show_less') : t('show_more')}
                                </button>
                            )}
                        </>
                    ) : null}

                    <section className={styles.moreSection}>
                        <p className={styles.sectionLabel}>{t('more_like')}</p>
                        {similar.length === 0 ? (
                            <p className={styles.moreEmpty}>{t('no_similar')}</p>
                        ) : (
                            <div className={styles.moreGrid}>
                                {similar.map((related) => {
                                    const preview = related.previewMedia?.find((media) => media.isCover)
                                        || related.previewMedia?.[0]
                                        || related.primaryPreview;
                                    if (!preview) return null;
                                    const relatedPrice = related.price ?? 0;
                                    return (
                                        <button
                                            key={related._id}
                                            type="button"
                                            className={styles.moreCard}
                                            onClick={() => onOpenItem?.(related)}
                                        >
                                            {previewImageSrc(preview) ? (
                                                <img src={previewImageSrc(preview)} alt={related.title} loading="lazy" />
                                            ) : preview.type === 'video' ? (
                                                <video
                                                    src={`${mediaOriginalSrc(preview)}#t=0.1`}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    aria-label={related.title}
                                                />
                                            ) : null}
                                            {relatedPrice > 0 ? (
                                                <div className={styles.priceVeil}>
                                                    <span>
                                                        {tt('toman_amount', {
                                                            amount: formatAppNumber(relatedPrice, lang),
                                                        })}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </aside>
            </div>

            <div className={styles.ctaBar} dir={uiDir}>
                    <button type="button" className={styles.cta} onClick={useTemplate}>
                        {isLocked ? <LuLock size={16} /> : <LuRefreshCw size={16} />}
                        {isLocked ? t('buy', { price: formatAppNumber(item.price, lang) }) : t('use_prompt')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.cta} ${styles.ctaSecondary}`}
                        onClick={isLocked ? useTemplate : useAsTemplate}
                    >
                        <LuImage size={16} />
                        {t('use_ref')}
                    </button>
            </div>

            <button type="button" className={styles.mobileFab} onClick={useTemplate} dir={uiDir}>
                {isLocked ? <LuLock size={16} /> : <LuSparkles size={16} />}
                {isLocked ? t('buy', { price: formatAppNumber(item.price, lang) }) : t('use_idea')}
            </button>
        </div>
    );

    const zoom = (
        <ImageLightbox open={Boolean(zoomSrc)} src={zoomSrc} alt={item.title} onClose={() => setZoomSrc('')} />
    );

    if (embedded) return <>{modal}{zoom}</>;
    return createPortal(<>{modal}{zoom}</>, document.body);
}

/**
 * ویدیوی صحنه: پوستر همان لحظه نمایش داده می‌شود و فایل ویدیو فقط با زدن «پخش» بار و پخش می‌شود.
 * قالب قدیمی بی‌پوستر: فریم اول با preload=metadata (نه کل فایل).
 */
function ExploreVideoSlide({
    media,
    title,
    className,
    onReady,
}: {
    media: MarketplacePreviewMedia;
    title: string;
    className: string;
    onReady: () => void;
}) {
    const { t } = useTranslation('projects');
    const [playing, setPlaying] = useState(false);
    const poster = videoPosterSrc(media);
    const src = mediaOriginalSrc(media);

    if (playing) {
        return (
            <video
                src={src}
                poster={poster || undefined}
                className={className}
                controls
                autoPlay
                playsInline
                preload="auto"
                aria-label={title}
            />
        );
    }

    return (
        <>
            {poster ? (
                <img src={poster} alt={title} className={className} onLoad={onReady} onError={onReady} />
            ) : (
                <video
                    src={`${src}#t=0.1`}
                    className={className}
                    muted
                    playsInline
                    preload="metadata"
                    aria-label={title}
                    onLoadedData={onReady}
                    onError={onReady}
                />
            )}
            <button
                type="button"
                className={styles.playBtn}
                onClick={() => setPlaying(true)}
                aria-label={t('play')}
            >
                <LuPlay size={26} />
            </button>
        </>
    );
}
