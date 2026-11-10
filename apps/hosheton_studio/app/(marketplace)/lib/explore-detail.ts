/**
 * Server-safe helpers for marketplace template detail URLs.
 * No 'use client' here — both server components (explore/[slug], sitemap)
 * and client components import from this module.
 */
import type { MarketplaceTemplateItem } from '@/app/(marketplace)/lib/types';

/** Public detail URL key for a template — slug first, Mongo id as fallback. */
export function templateDetailKey(item: Pick<MarketplaceTemplateItem, 'slug' | '_id'>): string {
    return item.slug || item._id;
}

type DetailPathItem = Pick<MarketplaceTemplateItem, 'slug' | '_id'> & Partial<Pick<MarketplaceTemplateItem, 'categoryPath'>>;

/**
 * آدرس canonical قالب: زیر زنجیرهٔ دسته‌اش (/explore/<cat>/<sub>/<slug>)، بی‌دسته /explore/<slug>.
 * آیتمی که categoryPath ندارد (پاسخ‌های قدیمی) هم کار می‌کند — سرور به آدرس canonical ریدایرکت می‌کند.
 */
export function templateDetailPath(item: DetailPathItem): string {
    const segments = [...(item.categoryPath || []), templateDetailKey(item)];
    return `/explore/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

export function templateDetailUrl(item: DetailPathItem, origin?: string): string {
    const base = (origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    return `${base}${templateDetailPath(item)}`;
}

/** Route params can arrive percent-encoded for Persian slugs — decode defensively. */
export function decodeSlugParam(raw: string | undefined | null): string {
    const value = String(raw || '').trim();
    if (!value) return '';
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
