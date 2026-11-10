'use client';

import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronLeft, LuSparkles } from 'react-icons/lu';
import type { AdsProject } from '@/app/(marketing)/ads-video/lib/ads-video-api';
import styles from './BrandKitCard.module.scss';

type AdsBrandKit = NonNullable<AdsProject['brandKit']>;

interface BrandKitCardProps {
    brandKit: AdsBrandKit | null | undefined;
    disabled?: boolean;
    onOpen(): void;
}

// همان پالت پیش‌فرض مودال برند کیت — قبل از تنظیم، کارت با همین رنگ‌ها دعوت می‌کند
const DEFAULT_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#0f172a'];

/** برند کیت «تنظیم‌شده» است اگر کاربر چیزی جز خالی ذخیره کرده باشد */
function isConfigured(kit: AdsBrandKit | null | undefined) {
    if (!kit) return false;
    const palette = Object.values(kit.palette || {}).some(Boolean);
    const text = [kit.fontFamily, kit.logoUrl, kit.tone, kit.tagline, kit.ctaText, kit.audience, kit.avoid].some((value) => String(value || '').trim());
    return palette || text || Boolean(kit.media?.length) || Boolean(kit.notes?.length);
}

/**
 * ورودی برند کیت بالای چت — رنگ‌های خود برند در قاب چرخان و سواچ‌های شناور
 * نشان می‌دهند که هر کاتی که ساخته می‌شود هویت برند را می‌گیرد؛ با کلیک، مودال
 * برند کیت باز می‌شود. موشن در prefers-reduced-motion خاموش است.
 */
export default function BrandKitCard({ brandKit, disabled = false, onOpen }: BrandKitCardProps) {
    const { t } = useTranslation('adsVideo');
    const [logoBroken, setLogoBroken] = useState(false);
    const configured = isConfigured(brandKit);
    const palette = brandKit?.palette || {};
    const colors = [palette.primary, palette.secondary, palette.accent, palette.background]
        .map((color, index) => color || DEFAULT_COLORS[index]);
    const logoUrl = brandKit?.logoUrl && !logoBroken ? brandKit.logoUrl : '';
    const ringStyle = {
        '--bk-1': colors[0],
        '--bk-2': colors[1],
        '--bk-3': colors[2],
        '--bk-4': colors[3],
    } as CSSProperties;

    return (
        <button
            type="button"
            className={`${styles.card} ${configured ? styles.cardOn : ''}`}
            style={ringStyle}
            disabled={disabled}
            onClick={onOpen}
            aria-label={t('brandkit_title', { defaultValue: 'برند کیت — رنگ و فونت برند' })}
        >
            <span className={styles.swatches} aria-hidden>
                {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.logo} src={logoUrl} alt="" onError={() => setLogoBroken(true)} />
                ) : null}
                {colors.map((color, index) => (
                    <i key={`${color}-${index}`} style={{ background: color, animationDelay: `${index * 0.22}s` }} />
                ))}
            </span>
            <span className={styles.text}>
                <strong>
                    {t('brandkit_btn', { defaultValue: 'برند کیت' })}
                    <LuSparkles size={12} className={styles.spark} aria-hidden />
                    {configured ? <span className={styles.badge}>{t('brandkit_active', { defaultValue: 'فعال' })}</span> : null}
                </strong>
                <small>
                    {configured
                        ? t('brandkit_card_on', { defaultValue: 'رنگ، فونت و لحن برندت روی همه‌ی کات‌ها اعمال می‌شود' })
                        : t('brandkit_card_off', { defaultValue: 'برندت را تعریف کن تا همه‌ی کات‌ها با هویت تو ساخته شوند' })}
                </small>
            </span>
            <span
                className={styles.fontSample}
                style={brandKit?.fontFamily ? { fontFamily: brandKit.fontFamily } : undefined}
                aria-hidden
            >
                Aa
            </span>
            <LuChevronLeft size={15} className={styles.chevron} aria-hidden />
        </button>
    );
}
