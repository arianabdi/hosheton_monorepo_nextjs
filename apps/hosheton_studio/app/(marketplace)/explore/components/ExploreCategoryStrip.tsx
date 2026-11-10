'use client';

import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuWorkflow } from 'react-icons/lu';
import type { MarketplacePreviewMedia, MarketplaceTemplateItem } from '@/app/(marketplace)/lib/types';
import { fixHoshetonMediaUrl, mediaThumbLargeSrc } from '@/app/(marketplace)/lib/template-media';
import { templateDetailPath } from '@/app/(marketplace)/lib/explore-detail';
import { categoryHref, childCategoriesOf, type TemplateCategoryNode } from '@/app/(marketplace)/lib/explore-taxonomy';
import { absoluteMediaUrl } from '@/app/(marketplace)/lib/seo';
import { useCategoryName } from '@/app/(marketplace)/lib/useCategoryName';
import { useExploreDetailStore } from '@/app/zustand/store/useExploreDetailStore';
import styles from './ExploreCategoryStrip.module.scss';

/*
 * نوار کارت‌های بالای صفحهٔ دسته (مرجع: ردیف «Get in the game | Bloom | Paint | Slide | ۴ کوچک»).
 * از ابتدا (راست در RTL): بلوک ۲×۲ کوچک، تا جای ممکن کارت بلند، و در انتها (چپ) یک کارت پهن؛
 * کارت پهن دوم فقط در عرض خیلی بزرگ. با کم شدن عرض، کارت‌ها از چپ حذف می‌شوند تا فقط بلوک ۲×۲ بماند (موبایل). اندازه‌ها نسبت به
 * ارتفاع ردیف (H) از مرجع اندازه‌گیری شده‌اند.
 */
const GAP = 14; // کمی کمتر از فاصلهٔ گرید اکسپلور (۲۰px)
const GRID_GAP = 8;
const PILL = 0.75; // عرض کارت بلند
const HERO_MIN = 1.3; // کمترین عرض کارت پهن
const HERO_TARGET = 2.4; // عرض هدف کارت پهن (سقف ۴۰٪ عرض باقی‌مانده)
const HERO_MAX = 2.6; // کارت پهن هرگز درازتر از این نمی‌شود
const PILL_MAX = 0.95; // وقتی آیتم کم است کارت بلند تا این حد پهن می‌شود
const SECOND_HERO_FROM = 2000; // عرض نوار برای کارت پهن دوم
const GRID_TILE = 0.31; // عرض هر کارت کوچک
const NARROW_BELOW = 560; // زیر این: بلوک ۲×۲ + یک یا دو کارت بلند (بلوک هرگز تنها نمی‌ماند)
const MAX_LABELED = 12;

type StripItem = {
    key: string;
    label: string;
    href: string;
    media: MarketplacePreviewMedia | null;
    imageUrl?: string;
    template?: MarketplaceTemplateItem;
};

type Layout = {
    height: number;
    gridOnly: boolean;
    pills: number;
    pillWidth: number;
    heroes: number;
    heroWidth: number;
};

function rowHeight(width: number) {
    return width < NARROW_BELOW
        ? Math.min(210, Math.max(150, width * 0.5))
        : Math.min(200, Math.max(150, width * 0.15));
}

function computeLayout(width: number, labeledCount: number, hasGrid: boolean): Layout {
    const height = rowHeight(width);
    const pill = PILL * height;
    const gridWidth = hasGrid ? 2 * GRID_TILE * height + GRID_GAP + GAP : 0;
    const rest = width - gridWidth;
    const none = { height, gridOnly: hasGrid, pills: 0, pillWidth: pill, heroes: 0, heroWidth: 0 };
    if (!labeledCount) return none;

    // عرض کم: بلوک ۲×۲ کنار ۱–۲ کارت بلند؛ ارتفاع طوری که همه در عرض جا شوند
    if (hasGrid && width < NARROW_BELOW) {
        const heightFor = (count: number) => (width - GRID_GAP - count * GAP) / (2 * GRID_TILE + count * PILL);
        // کمترین تعداد کارت بلند (۱ تا ۳) که ردیف را بیش از حد بلند نکند
        let count = Math.min(labeledCount, 1);
        while (count < Math.min(3, labeledCount) && heightFor(count) > 195) count++;
        const h = Math.min(195, Math.max(120, heightFor(count)));
        const grid = 2 * GRID_TILE * h + GRID_GAP;
        const pillWidth = Math.min(PILL_MAX * h * 1.15, (width - grid - count * GAP) / count);
        return { height: h, gridOnly: false, pills: count, pillWidth, heroes: 0, heroWidth: 0 };
    }

    // بیشتر عرض = کارت بلند؛ کارت(های) پهن در انتها (چپ) باقی‌مانده را پر می‌کنند
    if (rest >= HERO_MIN * height) {
        const heroTarget = Math.max(HERO_MIN * height, Math.min(HERO_TARGET * height, rest * 0.4));
        const pillsNeeded = (heroes: number) => Math.max(0, Math.round((rest - heroes * heroTarget - (heroes - 1) * GAP) / (pill + GAP)));
        // کارت پهن دوم فقط در عرض خیلی بزرگ و وقتی آیتم برای پر کردن کارت‌های بلند کافی است
        const heroes = width >= SECOND_HERO_FROM && labeledCount - 2 >= pillsNeeded(2) ? 2 : 1;
        let needed = pillsNeeded(heroes);
        // گرد کردن رو به بالا نباید کارت پهن را از حداقلش کوچک‌تر کند
        while (needed > 0 && (rest - needed * (pill + GAP) - (heroes - 1) * GAP) / heroes < HERO_MIN * height) needed--;
        const pills = Math.max(0, Math.min(labeledCount - heroes, needed));
        if (pills >= needed) {
            const heroWidth = (rest - pills * (pill + GAP) - (heroes - 1) * GAP) / heroes;
            return { height, gridOnly: false, pills, pillWidth: pill, heroes, heroWidth };
        }
        // آیتم کم است: کارت‌ها تا سقف خود پهن می‌شوند و باقی ردیف (انتها) خالی می‌ماند، نه کشیدگی
        const available = rest - (heroes - 1) * GAP - pills * GAP;
        const pillWidth = pills
            ? Math.max(pill, Math.min(PILL_MAX * height, (available - heroes * HERO_MAX * height) / pills))
            : pill;
        const heroWidth = Math.min(HERO_MAX * height, (available - pills * pillWidth) / heroes);
        return { height, gridOnly: false, pills, pillWidth, heroes, heroWidth };
    }
    const pills = Math.min(labeledCount, Math.floor((rest + GAP) / (pill + GAP)));
    if (pills < 1) return hasGrid ? none : { ...none, pills: 1, pillWidth: rest };
    return { height, gridOnly: false, pills, pillWidth: Math.min(1.6 * pill, (rest - (pills - 1) * GAP) / pills), heroes: 0, heroWidth: 0 };
}

function templateCover(item: MarketplaceTemplateItem) {
    return item.previewMedia?.find((media) => media.isCover) || item.primaryPreview || item.previewMedia?.[0] || null;
}

function StripMedia({ item }: { item: StripItem }) {
    const media = item.media;
    if (item.imageUrl) return <img src={item.imageUrl} alt="" loading="lazy" draggable={false} />;
    const poster = media && (media.thumbnailUrlLarge || media.thumbnailUrl) ? mediaThumbLargeSrc(media) : '';
    if (media?.type === 'video' && !poster) {
        return <video src={fixHoshetonMediaUrl(media.url || '')} muted playsInline preload="metadata" aria-hidden />;
    }
    const src = poster || mediaThumbLargeSrc(media);
    return src ? <img src={src} alt="" loading="lazy" draggable={false} /> : <LuWorkflow size={22} aria-hidden />;
}

function StripCard({ item, className, style, showLabel }: {
    item: StripItem;
    className: string;
    style?: CSSProperties;
    showLabel: boolean;
}) {
    return (
        <Link
            href={item.href}
            prefetch={false}
            scroll={false}
            className={className}
            style={style}
            title={item.label}
            aria-label={item.label}
            onClick={item.template ? () => {
                // مثل کارت گرید: مودال جزئیات فوری باز شود و بستنش به همین دسته برگردد
                const store = useExploreDetailStore.getState();
                store.setSelectedItem(item.template!);
                store.setReturnPath(window.location.pathname);
            } : undefined}
        >
            <StripMedia item={item} />
            {showLabel ? <span className={styles.label}>{item.label}</span> : null}
        </Link>
    );
}

type Props = {
    nodes: TemplateCategoryNode[];
    node: TemplateCategoryNode;
    /** قالب‌های ویژهٔ انتخاب ادمین (فقط دستهٔ اصلی) */
    featured: MarketplaceTemplateItem[];
    /** قالب‌های همین دسته (صفحهٔ اول گرید) */
    templates: MarketplaceTemplateItem[];
    /** کاور جدیدترین قالب هر زیردسته (key → media) */
    subcategoryCovers: Record<string, MarketplacePreviewMedia>;
};

/** زیردسته‌ها کارت‌های بلند/پهن را پر می‌کنند؛ بدون زیردسته (یا برای باقی جاها) قالب‌های دسته */
export function ExploreCategoryStrip({ nodes, node, featured, templates, subcategoryCovers }: Props) {
    const { t } = useTranslation('marketplace');
    const nameOf = useCategoryName();
    const [el, setEl] = useState<HTMLElement | null>(null);
    const [width, setWidth] = useState(0);

    const { grid, labeled } = useMemo(() => {
        const subs: StripItem[] = childCategoriesOf(nodes, node._id)
            .map((child) => ({
                key: `c:${child._id}`,
                label: nameOf(child),
                href: categoryHref(child),
                media: subcategoryCovers[child._id] || null,
                imageUrl: child.image ? absoluteMediaUrl(child.image) : undefined,
            }))
            .filter((item) => item.media || item.imageUrl);
        const seen = new Set<string>();
        const tpl: StripItem[] = [...featured, ...templates]
            .filter((item) => !seen.has(item._id) && seen.add(item._id))
            .map((item) => ({
                key: `t:${item._id}`,
                label: item.title,
                href: templateDetailPath(item),
                media: templateCover(item),
                template: item,
            }));
        let gridItems = tpl.slice(0, 4);
        let rest = [...subs, ...tpl.slice(4)];
        // بلوک ۲×۲ فقط کنار دست‌کم یک کارت بلند؛ وگرنه همه کارت بلند می‌شوند
        if (gridItems.length < 4 || !rest.length) {
            rest = [...rest, ...gridItems];
            gridItems = [];
        }
        return { grid: gridItems, labeled: rest.slice(0, MAX_LABELED) };
    }, [nodes, node._id, nameOf, featured, templates, subcategoryCovers]);

    const visible = grid.length + labeled.length >= 3;

    useLayoutEffect(() => {
        if (!el) return;
        const update = () => setWidth(el.clientWidth);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [el]);

    if (!visible) return null;
    const layout = width ? computeLayout(width, labeled.length, grid.length === 4) : null;
    const pills = layout ? labeled.slice(0, layout.pills) : [];
    const heroes = layout ? labeled.slice(layout.pills, layout.pills + layout.heroes) : [];

    return (
        <section
            ref={setEl}
            className={`${styles.strip} ${layout ? styles.ready : ''}`}
            aria-label={t('category_featured')}
            style={{ ['--h' as string]: `${layout?.height ?? 188}px` }}
        >
            {layout && grid.length === 4 ? (
                <div className={`${styles.grid} ${layout.gridOnly ? styles.gridOnly : ''}`}>
                    {grid.map((item, index) => (
                        <StripCard key={item.key} item={item} className={styles.small} style={{ ['--i' as string]: index }} showLabel={false} />
                    ))}
                </div>
            ) : null}
            {pills.map((item, index) => (
                <StripCard
                    key={item.key}
                    item={item}
                    className={styles.pill}
                    style={{ width: layout!.pillWidth, ['--i' as string]: index + 2 }}
                    showLabel
                />
            ))}
            {heroes.map((item, index) => (
                <StripCard
                    key={item.key}
                    item={item}
                    className={styles.hero}
                    style={{ width: layout!.heroWidth, ['--i' as string]: pills.length + index + 2 }}
                    showLabel
                />
            ))}
        </section>
    );
}
