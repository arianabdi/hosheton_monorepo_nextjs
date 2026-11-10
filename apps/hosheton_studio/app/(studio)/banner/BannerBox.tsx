'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { canUseDeveloperTools } from '@/app/lib/user-roles';
import { useBannerDevStore } from './banner-dev.store';
import { fetchRenderedBanner, pickCreativeAsset, trackBannerEvent, type RenderedBanner } from './banner-api';
import styles from './BannerBox.module.scss';

export type BannerBoxVariant = 'square' | 'wide' | 'card';
export type BannerDevice = 'desktop' | 'tablet' | 'mobile';

export interface BannerBoxProps {
    /** کلید جایگاه — مثل studio.sidebar.square */
    placementKey: string;
    /** square: باکس مربع سایدبار / wide: باکس افقی / card: کارت مشابه پروژه اکسپلور */
    variant?: BannerBoxVariant;
    className?: string;
    style?: CSSProperties;
    /** نسبت CSS قبل از رسیدن پاسخ (مثل '8 / 1') — پس از پاسخ از ابعاد جایگاه استفاده می‌شود */
    fallbackRatio?: string;
}

function detectDevice(): BannerDevice {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
}

/**
 * باکس نمایش بنر — محتوای جایگاه را از Renderer API می‌گیرد و خلاقیت برنده را
 * با tracking خودکار (impression/click) رندر می‌کند.
 *
 * جایگاه خالی فقط برای admin / super-admin و فقط وقتی «نمایش لوکیشن بنرها»
 * در منوی Developer روشن باشد دیده می‌شود. کاربر عادی و مهمان هیچ کادر خالی نمی‌بینند.
 */
export default function BannerBox({
    placementKey,
    variant = 'wide',
    className = '',
    style,
    fallbackRatio,
}: BannerBoxProps) {
    const devHighlight = useBannerDevStore((s) => s.enabled);
    const token = useAuthStore((s) => s.token);
    const roles = useAppStore((s) => s.roles);
    const showEmptyPlacement = Boolean(token) && devHighlight && canUseDeveloperTools(roles);
    const [data, setData] = useState<RenderedBanner | null>(null);
    const [device, setDevice] = useState<BannerDevice>('desktop');
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        const current = detectDevice();
        setDevice(current);
        let alive = true;
        void fetchRenderedBanner(placementKey, current).then((res) => {
            if (alive) setData(res);
        });
        return () => {
            alive = false;
        };
    }, [placementKey]);

    useEffect(() => {
        setImageFailed(false);
    }, [placementKey, device]);

    useEffect(() => {
        if (data?.creative && data.tracking?.impression) {
            trackBannerEvent(data.tracking.impression, device);
        }
    }, [data, device]);

    const creative = data?.creative || null;
    const picked = pickCreativeAsset(creative, device);
    const asset = picked?.imageUrl?.trim() ? picked : null;
    const placement = data?.placement;
    const visibleAsset = asset && !imageFailed ? asset : null;

    if (!visibleAsset && !showEmptyPlacement) return null;

    const w = placement?.allowedWidth || 0;
    const h = placement?.allowedHeight || 0;
    const ratioCss = w > 0 && h > 0 ? `${w} / ${h}` : fallbackRatio || undefined;
    const href = creative?.ctaUrl || '#';
    const hasLink = Boolean(creative?.ctaUrl);

    const handleClick = () => {
        if (data?.tracking?.click) {
            trackBannerEvent(data.tracking.click, device);
        }
    };

    return (
        <div
            className={`${styles.wrap} ${styles[variant]} ${showEmptyPlacement ? styles.highlight : ''} ${className}`}
            style={{ ...style, ...(ratioCss ? { aspectRatio: ratioCss } : {}) }}
            data-banner-placement={placementKey}
        >
            {showEmptyPlacement && (
                <span className={styles.devBadge} dir="ltr">
                    {placementKey}
                    {w > 0 && h > 0 ? ` · ${w}×${h}` : ''}
                    {visibleAsset ? '' : ' · empty'}
                </span>
            )}
            {visibleAsset ? (
                <a
                    href={href}
                    target={creative?.openMode === 'new_tab' ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={styles.link}
                    onClick={handleClick}
                    aria-label={creative?.alt || creative?.title || placement?.name || placementKey}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={visibleAsset.imageUrl}
                        alt={creative?.alt || creative?.title || placementKey}
                        className={styles.image}
                        loading="lazy"
                        onError={() => setImageFailed(true)}
                    />
                    {creative?.ctaText && hasLink ? <span className={styles.cta}>{creative.ctaText}</span> : null}
                </a>
            ) : (
                <div className={styles.empty}>
                    <span className={styles.emptyLabel}>
                        {placement?.name || 'جایگاه خالی'}
                        <small>هنوز بنر فعالی وصل نشده</small>
                    </span>
                </div>
            )}
        </div>
    );
}
