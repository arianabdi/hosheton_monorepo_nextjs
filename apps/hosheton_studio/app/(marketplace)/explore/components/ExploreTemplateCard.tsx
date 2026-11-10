'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { IoBookmark, IoBookmarkOutline, IoHeart, IoHeartOutline } from 'react-icons/io5';
import { LuMaximize2, LuWorkflow } from 'react-icons/lu';
import { RiFlowChart } from 'react-icons/ri';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import type { MarketplaceTemplateItem } from '@/app/(marketplace)/lib/types';
import { mediaAspectRatio, mediaOriginalSrc, previewImageSrc } from '@/app/(marketplace)/lib/template-media';
import { templateDetailPath } from '@/app/(marketplace)/lib/explore-detail';
import { useExploreDetailStore } from '@/app/zustand/store/useExploreDetailStore';
import styles from './ExploreCard.module.scss';

interface ExploreTemplateCardProps {
    item: MarketplaceTemplateItem;
    isLiked: boolean;
    isSaved: boolean;
    onToggleLike: (id: string) => void;
    onToggleSave: (id: string) => void;
    onOpenDetail: (item: MarketplaceTemplateItem) => void;
    square?: boolean;
}

function toHandle(name: string) {
    const ascii = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
    return ascii ? `@${ascii}` : '';
}

function coverPreview(item: MarketplaceTemplateItem) {
    return item.previewMedia?.find((media) => media.isCover)
        || item.primaryPreview
        || item.previewMedia?.[0]
        || null;
}

export function ExploreTemplateCard({
    item,
    isLiked,
    isSaved,
    onToggleLike,
    onToggleSave,
    onOpenDetail,
    square = false,
}: ExploreTemplateCardProps) {
    const { t, i18n } = useTranslation('marketplace');
    const { t: tt } = useTranslation('templates');
    const preview = coverPreview(item);
    const creatorName = item.creator?.fullName || t('creator');
    const handle = toHandle(creatorName);
    const creatorAvatar = item.creator?.avatar || '';
    const [avatarFailed, setAvatarFailed] = useState(false);
    const likeCount = item.likeCount || 0;
    const [loaded, setLoaded] = useState(false);
    const ratio = mediaAspectRatio(preview);
    const imageSrc = previewImageSrc(preview, 'large');
    // ویدیوی بدون پوستر (قالب‌های قدیمی تا ساخت پوستر سمت سرور): فقط فریم اول، نه کل فایل
    const videoFallbackSrc = preview?.type === 'video' && !imageSrc ? mediaOriginalSrc(preview) : '';
    const priceValue = item.price ?? 0;
    const priceLabel = priceValue > 0
        ? tt('toman_amount', { amount: formatAppNumber(priceValue, i18n.language) })
        : '';

    return (
        <article className={styles.tile}>
            {/* Real link → crawlable from the grid + open-in-new-tab; soft nav still opens
                the detail modal through the intercepted route, so UX is unchanged. */}
            <Link
                href={templateDetailPath(item)}
                className={styles.mediaLink}
                aria-label={item.title}
                title={item.title}
                prefetch={false}
                onClick={() => {
                    // Same as onOpenDetail: instant modal + closing returns to this list (/explore or a category)
                    const store = useExploreDetailStore.getState();
                    store.setSelectedItem(item);
                    store.setReturnPath(window.location.pathname);
                }}
            >
                <div className={styles.mediaClip} style={{ ['--tile-ratio' as string]: square ? '1' : String(ratio) }}>
                    {!loaded && (imageSrc || videoFallbackSrc) && <div className={styles.ghost} aria-hidden="true" />}
                    {videoFallbackSrc ? (
                        <video
                            src={`${videoFallbackSrc}#t=0.1`}
                            className={`${styles.media} ${loaded ? styles.mediaReady : ''}`}
                            muted
                            playsInline
                            preload="metadata"
                            aria-label={item.title}
                            onLoadedData={() => setLoaded(true)}
                            onError={() => setLoaded(true)}
                        />
                    ) : imageSrc ? (
                        <img
                            src={imageSrc}
                            alt={item.title}
                            className={`${styles.media} ${loaded ? styles.mediaReady : ''}`}
                            loading="lazy"
                            onLoad={() => setLoaded(true)}
                        />
                    ) : (
                        <div className={styles.placeholder}>
                            <LuWorkflow size={28} />
                        </div>
                    )}
                    {priceValue > 0 ? (
                        <div className={styles.priceVeil}>
                            <span>{priceLabel}</span>
                        </div>
                    ) : null}
                    {item.kind === 'workflow' ? (
                        <div className={styles.kindBadge} aria-hidden="true">
                            <RiFlowChart size={14} />
                        </div>
                    ) : null}
                </div>
            </Link>

            <div className={styles.overlay} onClick={() => onOpenDetail(item)}>
                <div className={styles.bottom}>
                    <div className={styles.creator}>
                        <span className={styles.creatorRow}>
                            {creatorAvatar && !avatarFailed ? (
                                <img
                                    src={creatorAvatar}
                                    alt=""
                                    className={styles.creatorAvatar}
                                    decoding="async"
                                    onError={() => setAvatarFailed(true)}
                                />
                            ) : (
                                <span className={`${styles.creatorAvatar} ${styles.creatorAvatarFallback}`} aria-hidden="true">
                                    {creatorName.trim().charAt(0)}
                                </span>
                            )}
                            <span className={styles.name}>{creatorName}</span>
                        </span>
                        {handle && <span className={styles.handle}>{handle}</span>}
                        <button
                            type="button"
                            className={styles.useBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                // فقط نمایش جزئیات؛ «استفاده» داخل همان پنجره است
                                onOpenDetail(item);
                            }}
                        >
                            {t('view_item')}
                        </button>
                    </div>
                    <div className={styles.meta}>
                        <button
                            type="button"
                            className={styles.metaBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleLike(item._id);
                            }}
                            aria-label={t('like')}
                        >
                            {isLiked ? <IoHeart size={18} color="#ff4d6d" /> : <IoHeartOutline size={18} />}
                            <span>{formatAppNumber(likeCount, i18n.language)}</span>
                        </button>
                        <button
                            type="button"
                            className={styles.metaBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSave(item._id);
                            }}
                            aria-label={t('save')}
                        >
                            {isSaved ? <IoBookmark size={17} color="#ffd166" /> : <IoBookmarkOutline size={17} />}
                        </button>
                        <button
                            type="button"
                            className={styles.metaBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenDetail(item);
                            }}
                            aria-label={t('details')}
                        >
                            <LuMaximize2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}

const GHOST_RATIOS = [0.72, 1.15, 0.88, 1.35, 0.8, 1.05, 0.94, 1.22, 0.76, 1.1];

export function ExploreGhostCard({ index }: { index: number }) {
    const ratio = GHOST_RATIOS[index % GHOST_RATIOS.length];
    return (
        <article className={styles.tile} aria-hidden="true">
            <div className={styles.mediaClip} style={{ ['--tile-ratio' as string]: String(ratio) }}>
                <div className={styles.ghost} />
            </div>
        </article>
    );
}
