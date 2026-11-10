'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LuDroplet,
    LuFileText,
    LuImage,
    LuMegaphone,
    LuMusic,
    LuPalette,
    LuPaperclip,
    LuPlus,
    LuRotateCcw,
    LuSave,
    LuTarget,
    LuTrash2,
    LuType,
} from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import type { AdsBrandMedia, AdsBrandNote, AdsProject } from '../lib/ads-video-api';
import styles from '../AdsVideo.module.scss';

export type AdsBrandKit = NonNullable<AdsProject['brandKit']>;
export type { AdsBrandMedia, AdsBrandNote };
type AdsPalette = NonNullable<AdsBrandKit['palette']>;

// همه‌ی کلیدهای پالت در پیش‌فرض مقدار قطعی دارند (برای fallback پیش‌نمایش)
const DEFAULT_PALETTE: AdsPalette & Record<PaletteKey, string> = {
    primary: '#6366f1',
    secondary: '#22d3ee',
    accent: '#f59e0b',
    background: '#0f172a',
    text: '#ffffff',
};

const DEFAULT_BRAND_KIT: AdsBrandKit = {
    palette: DEFAULT_PALETTE,
    fontFamily: "'Vazirmatn', Tahoma, sans-serif",
    logoUrl: '',
    tone: '',
    tagline: '',
    ctaText: '',
    audience: '',
    avoid: '',
    media: [],
    notes: [],
};

function mergeBrandKit(saved: AdsProject['brandKit']): AdsBrandKit {
    return {
        ...DEFAULT_BRAND_KIT,
        ...(saved || {}),
        palette: { ...DEFAULT_BRAND_KIT.palette, ...(saved?.palette || {}) },
        media: saved?.media || [],
        notes: saved?.notes || [],
    };
}

type PaletteKey = 'primary' | 'secondary' | 'accent' | 'background' | 'text';

const COLOR_FIELDS: Array<{ key: PaletteKey; labelKey: string; fallback: string; hintKey: string; hintFallback: string }> = [
    {
        key: 'primary',
        labelKey: 'brand_color_primary',
        fallback: 'رنگ اصلی',
        hintKey: 'brand_color_primary_hint',
        hintFallback: 'دکمه‌ها، تیترها و المان‌های اصلی صحنه',
    },
    {
        key: 'secondary',
        labelKey: 'brand_color_secondary',
        fallback: 'رنگ مکمل',
        hintKey: 'brand_color_secondary_hint',
        hintFallback: 'گرادیان‌ها، نشان‌ها و المان‌های تکمیلی',
    },
    {
        key: 'accent',
        labelKey: 'brand_color_accent',
        fallback: 'رنگ تأکید (CTA)',
        hintKey: 'brand_color_accent_hint',
        hintFallback: 'دکمه‌ی اقدام و نکات برجسته',
    },
    {
        key: 'background',
        labelKey: 'brand_color_background',
        fallback: 'رنگ پس‌زمینه',
        hintKey: 'brand_color_background_hint',
        hintFallback: 'پس‌زمینه‌ی صحنه‌های ویدیو',
    },
    {
        key: 'text',
        labelKey: 'brand_color_text',
        fallback: 'رنگ متن',
        hintKey: 'brand_color_text_hint',
        hintFallback: 'متن بدنه و تیترهای کات‌ها',
    },
];

// انواع مدیای مجاز در تولید — labelها از i18n خوانده می‌شوند
const MEDIA_TYPES: Array<{ value: AdsBrandMedia['type']; labelKey: string; fallback: string }> = [
    { value: 'sfx', labelKey: 'brand_media_type_sfx', fallback: 'افکت صوتی' },
    { value: 'music', labelKey: 'brand_media_type_music', fallback: 'موسیقی' },
    { value: 'image', labelKey: 'brand_media_type_image', fallback: 'تصویر' },
    { value: 'video', labelKey: 'brand_media_type_video', fallback: 'ویدیو' },
    { value: 'font', labelKey: 'brand_media_type_font', fallback: 'فونت' },
];

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** شناسه‌ی یکتا برای آیتم‌های مدیا/یادداشت — در مرورگر تولید می‌شود */
function newId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** مقدار hex معتبر یا fallback — ورودی متنی ممکن است نیمه‌کاره/نامعتبر باشد */
function hexOr(value: string | undefined, fallback: string): string {
    const candidate = value || '';
    return HEX_RE.test(candidate) ? candidate : fallback;
}

/** رنگ متنِ خوانا روی یک پس‌زمینه‌ی مشخص — برای پیش‌نمایش زنده */
function readableTextOn(hex: string): string {
    if (!HEX_RE.test(hex)) return '#ffffff';
    const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const r = parseInt(full.slice(1, 3), 16) / 255;
    const g = parseInt(full.slice(3, 5), 16) / 255;
    const b = parseInt(full.slice(5, 7), 16) / 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.55 ? '#111827' : '#ffffff';
}

/**
 * برند کیت پروژه — توکن‌های طراحی (پالت/فونت/لوگو/لحن + پیام‌رسانی برند) و
 * کتابخانه‌ی مدیا (فایل‌های مجاز تولید + یادداشت‌های متنی عنوان‌دار) که در
 * پرامپت همه‌ی تولیدهای AI تزریق می‌شود تا خروجی همه‌ی کات‌ها یکدست بماند.
 * دو تب دارد: «هویت بصری» و «فایل‌ها و مدیا»؛ پیش‌نمایش زنده در تب اول
 * نشان می‌دهد این تنظیمات در کات‌ها چطور دیده خواهند شد.
 * والد فقط وقتی render کند که مودال باز است (state از props مقدار اولیه می‌گیرد).
 */
export default function BrandKitModal({
    open,
    project,
    onClose,
    onSave,
}: {
    open: boolean;
    project: AdsProject;
    onClose(): void;
    onSave(brandKit: AdsBrandKit): void;
}) {
    const { t } = useTranslation('adsVideo');
    const [tab, setTab] = useState<'identity' | 'media'>('identity');
    const [kit, setKit] = useState<AdsBrandKit>(() => mergeBrandKit(project.brandKit));
    const [logoBroken, setLogoBroken] = useState(false);

    const patchPalette = (key: PaletteKey, value: string) => {
        setKit((prev) => ({ ...prev, palette: { ...(prev.palette || {}), [key]: value } }));
    };

    // ── کتابخانه‌ی مدیا ──
    const addMedia = () => {
        setKit((prev) => ({
            ...prev,
            media: [...(prev.media || []), { id: newId(), title: '', type: 'sfx', url: '', note: '' }],
        }));
    };

    const patchMedia = (id: string, patch: Partial<AdsBrandMedia>) => {
        setKit((prev) => ({
            ...prev,
            media: (prev.media || []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
    };

    const removeMedia = (id: string) => {
        setKit((prev) => ({ ...prev, media: (prev.media || []).filter((item) => item.id !== id) }));
    };

    // ── یادداشت‌های متنی ──
    const addNote = () => {
        setKit((prev) => ({ ...prev, notes: [...(prev.notes || []), { id: newId(), title: '', body: '' }] }));
    };

    const patchNote = (id: string, patch: Partial<AdsBrandNote>) => {
        setKit((prev) => ({
            ...prev,
            notes: (prev.notes || []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }));
    };

    const removeNote = (id: string) => {
        setKit((prev) => ({ ...prev, notes: (prev.notes || []).filter((item) => item.id !== id) }));
    };

    // ردیف‌های کاملاً خالی هنگام ذخیره دور ریخته می‌شوند تا برند کیت تمیز بماند
    const handleSave = () => {
        onSave({
            ...kit,
            media: (kit.media || []).filter((item) => item.title.trim() || (item.url || '').trim() || (item.note || '').trim()),
            notes: (kit.notes || []).filter((item) => item.title.trim() || item.body.trim()),
        });
    };

    const palette = kit.palette || DEFAULT_PALETTE;
    const logoUrl = kit.logoUrl?.trim() || '';
    const previewBg = hexOr(palette.background, DEFAULT_PALETTE.background);
    const previewPrimary = hexOr(palette.primary, DEFAULT_PALETTE.primary);
    const previewAccent = hexOr(palette.accent, DEFAULT_PALETTE.accent);
    const previewSecondary = hexOr(palette.secondary, DEFAULT_PALETTE.secondary);
    const previewTagline = kit.tagline?.trim();
    const previewCta = kit.ctaText?.trim();

    const sectionHead = (icon: React.ReactNode, title: string, desc: string) => (
        <header className={styles.brandSectionHead}>
            <span className={styles.brandSectionIcon}>{icon}</span>
            <div>
                <strong>{title}</strong>
                <p>{desc}</p>
            </div>
        </header>
    );

    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            size="lg"
            sheetTitle={t('brand_kit_title', { defaultValue: 'برند کیت' })}
            component={(
                <div className={styles.modalTheme}>
                    <div className={styles.modalHead}>
                        <h3>
                            <LuPalette size={15} />
                            {t('brand_kit_title', { defaultValue: 'برند کیت' })}
                        </h3>
                    </div>
                    <p className={styles.modalHint}>
                        {t('brand_kit_subtitle', {
                            defaultValue: 'هویت بصری این پروژه — هر تولیدی که AI انجام می‌دهد (کات جدید، ویرایش، استوری‌بورد خودکار) بر اساس همین مقادیر انجام می‌شود تا همه‌ی کات‌ها یکدست بمانند.',
                        })}
                    </p>

                    {/* ── تب‌ها: هویت بصری | فایل‌ها و مدیا ── */}
                    <div className={styles.brandTabs} role="tablist" aria-label={t('brand_kit_title', { defaultValue: 'برند کیت' })}>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'identity'}
                            className={`${styles.brandTab} ${tab === 'identity' ? styles.brandTabActive : ''}`}
                            onClick={() => setTab('identity')}
                        >
                            <LuPalette size={13} />
                            {t('brand_tab_identity', { defaultValue: 'هویت بصری' })}
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'media'}
                            className={`${styles.brandTab} ${tab === 'media' ? styles.brandTabActive : ''}`}
                            onClick={() => setTab('media')}
                        >
                            <LuPaperclip size={13} />
                            {t('brand_tab_media', { defaultValue: 'فایل‌ها و مدیا' })}
                            {Boolean(kit.media?.length || kit.notes?.length) && (
                                <span className={styles.brandTabCount}>{(kit.media?.length || 0) + (kit.notes?.length || 0)}</span>
                            )}
                        </button>
                    </div>

                    {tab === 'identity' && (
                        <>
                            {/* پیش‌نمایش زنده — اثر هر تغییر همان لحظه دیده می‌شود */}
                            <div
                                className={styles.brandPreviewCard}
                                style={{
                                    background: previewBg,
                                    fontFamily: kit.fontFamily || undefined,
                                }}
                            >
                                <span className={styles.brandPreviewLabel} style={{ color: palette.text }}>
                                    {t('brand_preview_title', { defaultValue: 'پیش‌نمایش زنده' })}
                                </span>
                                {logoUrl && !logoBroken && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={logoUrl}
                                        alt=""
                                        className={styles.brandPreviewLogo}
                                        onError={() => setLogoBroken(true)}
                                    />
                                )}
                                <strong className={styles.brandPreviewHeadline} style={{ color: palette.text }}>
                                    {t('brand_preview_headline', { defaultValue: 'نام برند شما' })}
                                </strong>
                                <span className={styles.brandPreviewSub} style={{ color: palette.text }}>
                                    {previewTagline || t('brand_preview_sub', { defaultValue: 'توضیح کوتاه محصول یا شعار کمپین' })}
                                </span>
                                <div className={styles.brandPreviewActions}>
                                    <span
                                        className={styles.brandPreviewBtn}
                                        style={{ background: previewPrimary, color: readableTextOn(previewPrimary) }}
                                    >
                                        {previewCta || t('brand_preview_cta', { defaultValue: 'همین حالا شروع کنید' })}
                                    </span>
                                    <span
                                        className={styles.brandPreviewGhost}
                                        style={{ color: previewAccent, borderColor: previewAccent }}
                                    >
                                        {t('brand_preview_secondary', { defaultValue: 'بیشتر بدانید' })}
                                    </span>
                                </div>
                                <span
                                    className={styles.brandPreviewBadge}
                                    style={{ background: previewSecondary, color: readableTextOn(previewSecondary) }}
                                >
                                    {t('brand_preview_badge', { defaultValue: 'جدید' })}
                                </span>
                            </div>

                            {/* ── پالت رنگ ── */}
                            <section className={styles.brandSection}>
                                {sectionHead(
                                    <LuDroplet size={14} />,
                                    t('brand_section_palette', { defaultValue: 'پالت رنگ' }),
                                    t('brand_section_palette_desc', {
                                        defaultValue: 'رنگ‌های ثابت برند؛ هنگام ساخت هر کات به AI داده می‌شوند تا رنگ‌ها در همه‌ی صحنه‌ها یکسان بمانند.',
                                    }),
                                )}
                                <div className={styles.brandFields}>
                                    {COLOR_FIELDS.map((field) => (
                                        <label key={field.key} className={styles.brandField}>
                                            <span>{t(field.labelKey, { defaultValue: field.fallback })}</span>
                                            <span className={styles.brandColorRow}>
                                                <input
                                                    type="color"
                                                    value={hexOr(palette[field.key], '#000000')}
                                                    onChange={(e) => patchPalette(field.key, e.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    dir="ltr"
                                                    value={palette[field.key] || ''}
                                                    onChange={(e) => patchPalette(field.key, e.target.value)}
                                                />
                                            </span>
                                            <span className={styles.brandFieldHint}>
                                                {t(field.hintKey, { defaultValue: field.hintFallback })}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            {/* ── فونت برند ── */}
                            <section className={styles.brandSection}>
                                {sectionHead(
                                    <LuType size={14} />,
                                    t('brand_section_font', { defaultValue: 'فونت برند' }),
                                    t('brand_section_font_desc', {
                                        defaultValue: 'متن‌های همه‌ی کات‌ها با این فونت ساخته می‌شوند.',
                                    }),
                                )}
                                <label className={styles.brandField}>
                                    <span>{t('brand_font', { defaultValue: 'خانواده‌ی فونت (CSS font-family)' })}</span>
                                    <input
                                        dir="ltr"
                                        value={kit.fontFamily || ''}
                                        placeholder="'Vazirmatn', Tahoma, sans-serif"
                                        onChange={(e) => setKit((prev) => ({ ...prev, fontFamily: e.target.value }))}
                                    />
                                    <span className={styles.brandFieldHint}>
                                        {t('brand_font_hint', { defaultValue: 'نام فونت‌های نصب‌شده در سیستم بیننده یا فونت‌های وب — با کاما از هم جدا می‌شوند.' })}
                                    </span>
                                </label>
                            </section>

                            {/* ── لوگو ── */}
                            <section className={styles.brandSection}>
                                {sectionHead(
                                    <LuImage size={14} />,
                                    t('brand_section_logo', { defaultValue: 'لوگو' }),
                                    t('brand_section_logo_desc', {
                                        defaultValue: 'لینک مستقیم تصویر لوگو (png یا svg)؛ در کات‌های جدید به‌صورت خودکار در جای مناسب جای‌گذاری می‌شود.',
                                    }),
                                )}
                                <label className={styles.brandField}>
                                    <span>{t('brand_logo', { defaultValue: 'آدرس تصویر لوگو (اختیاری)' })}</span>
                                    <span className={styles.brandLogoRow}>
                                        {logoUrl && !logoBroken ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={logoUrl} alt="" className={styles.brandLogoThumb} onError={() => setLogoBroken(true)} />
                                        ) : null}
                                        <input
                                            dir="ltr"
                                            value={kit.logoUrl || ''}
                                            placeholder="https://…"
                                            onChange={(e) => {
                                                setLogoBroken(false);
                                                setKit((prev) => ({ ...prev, logoUrl: e.target.value }));
                                            }}
                                        />
                                    </span>
                                </label>
                            </section>

                            {/* ── پیام‌رسانی و مخاطب — شعار/CTA/مخاطب/ممنوعیت‌ها ── */}
                            <section className={styles.brandSection}>
                                {sectionHead(
                                    <LuTarget size={14} />,
                                    t('brand_section_promo', { defaultValue: 'پیام و مخاطب' }),
                                    t('brand_section_promo_desc', {
                                        defaultValue: 'چه می‌گویید و به چه کسی — این چهار مقدار مستقیماً در پرامپت تولید متن و صحنه‌ها تزریق می‌شوند.',
                                    }),
                                )}
                                <div className={styles.brandFields}>
                                    <label className={styles.brandField}>
                                        <span>{t('brand_tagline', { defaultValue: 'شعار برند (اختیاری)' })}</span>
                                        <input
                                            value={kit.tagline || ''}
                                            placeholder={t('brand_preview_sub', { defaultValue: 'توضیح کوتاه محصول یا شعار کمپین' })}
                                            onChange={(e) => setKit((prev) => ({ ...prev, tagline: e.target.value }))}
                                        />
                                        <span className={styles.brandFieldHint}>
                                            {t('brand_tagline_hint', { defaultValue: 'در زیرعنوان و پایان ویدیو استفاده می‌شود.' })}
                                        </span>
                                    </label>
                                    <label className={styles.brandField}>
                                        <span>{t('brand_cta', { defaultValue: 'متن دکمه‌ی اقدام (CTA)' })}</span>
                                        <input
                                            value={kit.ctaText || ''}
                                            placeholder={t('brand_preview_cta', { defaultValue: 'همین حالا شروع کنید' })}
                                            onChange={(e) => setKit((prev) => ({ ...prev, ctaText: e.target.value }))}
                                        />
                                        <span className={styles.brandFieldHint}>
                                            {t('brand_cta_hint', { defaultValue: 'فراخوان پایان ویدیو — مثل «همین حالا سفارش بده».' })}
                                        </span>
                                    </label>
                                    <label className={styles.brandField}>
                                        <span>{t('brand_audience', { defaultValue: 'مخاطب هدف' })}</span>
                                        <input
                                            value={kit.audience || ''}
                                            placeholder={t('brand_tone_placeholder', { defaultValue: 'مثلاً: مینیمال، پرانرژی، لوکس' })}
                                            onChange={(e) => setKit((prev) => ({ ...prev, audience: e.target.value }))}
                                        />
                                        <span className={styles.brandFieldHint}>
                                            {t('brand_audience_hint', { defaultValue: 'سن، سبک زندگی و علاقه‌ی مخاطب — لحن و انتخاب تصاویر را جهت می‌دهد.' })}
                                        </span>
                                    </label>
                                    <label className={styles.brandField}>
                                        <span>{t('brand_avoid', { defaultValue: 'ممنوعیت‌ها' })}</span>
                                        <input
                                            value={kit.avoid || ''}
                                            placeholder={t('brand_avoid_placeholder', { defaultValue: 'مثلاً: رنگ قرمز، لحن طنز، تصویر کودک' })}
                                            onChange={(e) => setKit((prev) => ({ ...prev, avoid: e.target.value }))}
                                        />
                                        <span className={styles.brandFieldHint}>
                                            {t('brand_avoid_hint', { defaultValue: 'رنگ‌ها، کلمات یا سبک‌هایی که AI نباید در هیچ کاتی استفاده کند.' })}
                                        </span>
                                    </label>
                                </div>
                            </section>

                            {/* ── لحن و سبک کمپین ── */}
                            <section className={styles.brandSection}>
                                {sectionHead(
                                    <LuMegaphone size={14} />,
                                    t('brand_section_tone', { defaultValue: 'لحن و سبک کمپین' }),
                                    t('brand_section_tone_desc', {
                                        defaultValue: 'حال‌وهوای متن و طراحی کات‌ها — سبک نوشتن پیام‌ها و حس تصویرسازی را تعیین می‌کند.',
                                    }),
                                )}
                                <label className={styles.brandField}>
                                    <span>{t('brand_tone', { defaultValue: 'لحن پیام‌ها (اختیاری)' })}</span>
                                    <input
                                        value={kit.tone || ''}
                                        placeholder={t('brand_tone_placeholder', { defaultValue: 'مثلاً: مینیمال، پرانرژی، لوکس' })}
                                        onChange={(e) => setKit((prev) => ({ ...prev, tone: e.target.value }))}
                                    />
                                </label>
                            </section>
                        </>
                    )}

                    {tab === 'media' && (
                        <>
                            {/* ── فایل‌ها و مدیای مجاز تولید ── */}
                            <section className={styles.brandSection}>
                                {sectionHead(
                                    <LuMusic size={14} />,
                                    t('brand_media_section', { defaultValue: 'فایل‌ها و مدیا' }),
                                    t('brand_media_hint', {
                                        defaultValue: 'فایل‌ها و منابعی که در تولید ویدیو استفاده می‌شوند — افکت صوتی، موسیقی، تصویر، ویدیو و فونت؛ با AI تولید یا از لینک دلخواه ثبت می‌شوند.',
                                    }),
                                )}
                                {(kit.media || []).map((item) => (
                                    <div key={item.id} className={styles.brandMediaItem}>
                                        <div className={styles.brandMediaRow}>
                                            <select
                                                className={styles.brandMediaType}
                                                value={item.type}
                                                aria-label={t('brand_media_type', { defaultValue: 'نوع' })}
                                                onChange={(e) => patchMedia(item.id, { type: e.target.value as AdsBrandMedia['type'] })}
                                            >
                                                {MEDIA_TYPES.map((mt) => (
                                                    <option key={mt.value} value={mt.value}>
                                                        {t(mt.labelKey, { defaultValue: mt.fallback })}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                className={styles.brandMediaTitle}
                                                value={item.title}
                                                placeholder={t('brand_media_title', { defaultValue: 'عنوان' })}
                                                onChange={(e) => patchMedia(item.id, { title: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className={styles.brandItemRemove}
                                                title={t('brand_media_remove', { defaultValue: 'حذف' })}
                                                aria-label={t('brand_media_remove', { defaultValue: 'حذف' })}
                                                onClick={() => removeMedia(item.id)}
                                            >
                                                <LuTrash2 size={13} />
                                            </button>
                                        </div>
                                        <input
                                            dir="ltr"
                                            value={item.url || ''}
                                            placeholder={t('brand_media_url', { defaultValue: 'آدرس فایل (اختیاری)' })}
                                            onChange={(e) => patchMedia(item.id, { url: e.target.value })}
                                        />
                                        <input
                                            value={item.note || ''}
                                            placeholder={t('brand_media_note', { defaultValue: 'توضیح — کجا و چطور استفاده شود (اختیاری)' })}
                                            onChange={(e) => patchMedia(item.id, { note: e.target.value })}
                                        />
                                    </div>
                                ))}
                                {!(kit.media || []).length && (
                                    <div className={styles.brandMediaEmpty}>
                                        {t('brand_media_empty', { defaultValue: 'هنوز مدیایی ثبت نشده است.' })}
                                    </div>
                                )}
                                <button type="button" className={styles.ghostBtn} onClick={addMedia}>
                                    <LuPlus size={13} />
                                    {t('brand_media_add', { defaultValue: 'افزودن مدیا' })}
                                </button>
                            </section>

                            {/* ── یادداشت‌های متنی عنوان‌دار ── */}
                            <section className={styles.brandSection}>
                                {sectionHead(
                                    <LuFileText size={14} />,
                                    t('brand_notes_section', { defaultValue: 'یادداشت‌های متنی' }),
                                    t('brand_notes_desc', {
                                        defaultValue: 'هر متن آزاد با عنوان دلخواه — مثل «راهنمای صداگذاری»، «سبک افکت‌ها» یا «دستورالعمل تایپوگرافی».',
                                    }),
                                )}
                                {(kit.notes || []).map((note) => (
                                    <div key={note.id} className={styles.brandNoteItem}>
                                        <div className={styles.brandMediaRow}>
                                            <input
                                                className={styles.brandMediaTitle}
                                                value={note.title}
                                                placeholder={t('brand_note_title_placeholder', { defaultValue: 'مثلاً: راهنمای صداگذاری' })}
                                                onChange={(e) => patchNote(note.id, { title: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                className={styles.brandItemRemove}
                                                title={t('brand_media_remove', { defaultValue: 'حذف' })}
                                                aria-label={t('brand_media_remove', { defaultValue: 'حذف' })}
                                                onClick={() => removeNote(note.id)}
                                            >
                                                <LuTrash2 size={13} />
                                            </button>
                                        </div>
                                        <textarea
                                            className={styles.brandNoteBody}
                                            rows={3}
                                            value={note.body}
                                            placeholder={t('brand_note_body_placeholder', { defaultValue: 'متن یادداشت — دستورالعمل، نکات یا نمونه‌های دلخواه' })}
                                            onChange={(e) => patchNote(note.id, { body: e.target.value })}
                                        />
                                    </div>
                                ))}
                                {!(kit.notes || []).length && (
                                    <div className={styles.brandMediaEmpty}>
                                        {t('brand_notes_empty', { defaultValue: 'هنوز یادداشتی ثبت نشده است.' })}
                                    </div>
                                )}
                                <button type="button" className={styles.ghostBtn} onClick={addNote}>
                                    <LuPlus size={13} />
                                    {t('brand_note_add', { defaultValue: 'افزودن یادداشت' })}
                                </button>
                            </section>
                        </>
                    )}

                    <div className={styles.brandActions}>
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={handleSave}
                        >
                            <LuSave size={14} />
                            {t('brand_save', { defaultValue: 'ذخیره‌ی برند کیت' })}
                        </button>
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => setKit(DEFAULT_BRAND_KIT)}
                        >
                            <LuRotateCcw size={13} />
                            {t('brand_reset', { defaultValue: 'بازگردانی پیش‌فرض' })}
                        </button>
                    </div>
                    <p className={styles.brandHint}>
                        {t('brand_hint', {
                            defaultValue: 'این مقادیر در پرامپت همه‌ی تولیدهای بعدی این پروژه تزریق می‌شوند. برای اعمال برند روی کات‌های موجود، از چت حالت «ویرایش همه‌ی کات‌ها» را اجرا کنید.',
                        })}
                    </p>
                </div>
            )}
        />
    );
}
