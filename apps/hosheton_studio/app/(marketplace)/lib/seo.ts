/**
 * Server-side SEO helpers for the marketplace template detail pages.
 * Plain `fetch` (no axios/auth) so these run in server components and generateMetadata.
 * sitemap.xml / robots.txt are served by app/seo-files (proxied from the API sitemap module).
 */
import type { Metadata } from 'next';
import { fixHoshetonMediaUrl } from '@/app/(marketplace)/lib/template-media';
import { templateDetailPath } from './explore-detail';
import { categoryHref, type TemplateCategoryNode } from './explore-taxonomy';
import type { ExploreResponse, MarketplaceTemplateItem } from './types';

export function getSiteUrl(): string {
    return (process.env.NEXT_PUBLIC_URL || 'http://localhost:3001').replace(/\/+$/, '');
}

function getApiBase(): string {
    return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

/** Cover image as an absolute URL (OG images must be absolute). */
export function absoluteMediaUrl(url?: string | null): string | undefined {
    const value = fixHoshetonMediaUrl(String(url || ''));
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value)) return value;
    const base = (process.env.NEXT_PUBLIC_S3_PUBLIC_BASE || getSiteUrl()).replace(/\/+$/, '');
    return `${base}/${value.replace(/^\/+/, '')}`;
}

function unwrap<T>(json: unknown): T | null {
    const data = (json as { data?: T } | null)?.data;
    return data ? data : null;
}

/** Fetch one listed template by slug or id for SEO rendering (no view-count recording). */
export async function fetchTemplateForSeo(idOrSlug: string): Promise<MarketplaceTemplateItem | null> {
    const apiBase = getApiBase();
    if (!apiBase || !idOrSlug) return null;
    try {
        const res = await fetch(
            `${apiBase}/api/studio/marketplace/templates/${encodeURIComponent(idOrSlug)}?recordView=false`,
            { next: { revalidate: 60 } },
        );
        if (!res.ok) return null;
        return unwrap<MarketplaceTemplateItem>(await res.json());
    } catch {
        return null;
    }
}

function defaultDescription(item: MarketplaceTemplateItem): string {
    const kindLabel = item.kind === 'workflow' ? 'ورک‌فلو آماده' : 'پرامپت آماده';
    const creator = item.creator?.fullName ? ` ساخته ${item.creator.fullName}.` : '.';
    const models = item.aiModels?.length ? ` مناسب ${item.aiModels.slice(0, 3).join('، ')}.` : '';
    return `${item.title} — ${kindLabel} در استودیوی هوشتون${creator}${models}`;
}

/** First explore page for a category, fetched server-side so the landing page HTML lists real template links. */
export async function fetchExploreForSeo(categoryPath: string[], limit = 10): Promise<ExploreResponse | null> {
    const apiBase = getApiBase();
    if (!apiBase) return null;
    const params = new URLSearchParams({ page: '1', limit: String(limit) });
    if (categoryPath.length) params.set('categoryPath', categoryPath.join('/'));
    try {
        const res = await fetch(`${apiBase}/api/studio/marketplace/explore?${params}`, { next: { revalidate: 60 } });
        if (!res.ok) return null;
        return unwrap<ExploreResponse>(await res.json());
    } catch {
        return null;
    }
}

function categoryDescription(node: TemplateCategoryNode): string {
    return node.metaDescription
        || node.description
        || `قالب‌ها و ورک‌فلوهای آمادهٔ «${node.name}» در استودیوی هوشتون — پرامپت و ورک‌فلو برای تولید تصویر و ویدیو با هوش مصنوعی.`;
}

export function buildCategoryMetadata(node: TemplateCategoryNode): Metadata {
    const site = getSiteUrl();
    const url = `${site}${categoryHref(node)}`;
    const title = node.metaTitle || `قالب‌های ${node.name}`;
    const description = categoryDescription(node);
    const image = absoluteMediaUrl(node.image);
    return {
        title,
        description,
        alternates: { canonical: url },
        robots: node.noindex ? { index: false, follow: true } : undefined,
        openGraph: {
            title,
            description,
            url,
            siteName: 'Hosheton Studio',
            type: 'website',
            locale: 'fa_IR',
            images: image ? [{ url: image, alt: node.name }] : undefined,
        },
        twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
    };
}

function breadcrumbList(site: string, trail: Array<{ name: string; path: string[] }>, leaf?: { name: string; url: string }) {
    const items = [
        { name: 'هوشتون استودیو', item: `${site}/` },
        { name: 'ایده‌ها', item: `${site}/explore` },
        ...trail.map((node) => ({ name: node.name, item: `${site}${categoryHref(node)}` })),
        ...(leaf ? [{ name: leaf.name, item: leaf.url }] : []),
    ];
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, ...entry })),
    };
}

/** schema.org JSON-LD for a category landing: CollectionPage + ItemList of its first templates + breadcrumbs. */
export function buildCategoryJsonLd(node: TemplateCategoryNode, trail: TemplateCategoryNode[], items: MarketplaceTemplateItem[]) {
    const site = getSiteUrl();
    const url = `${site}${categoryHref(node)}`;
    return [
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: node.metaTitle || node.name,
            description: categoryDescription(node),
            url,
            inLanguage: 'fa-IR',
            dateModified: node.updatedAt || undefined,
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: items.map((item, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: `${site}${templateDetailPath(item)}`,
                    name: item.title,
                })),
            },
        },
        breadcrumbList(site, trail),
    ];
}

export function buildTemplateMetadata(item: MarketplaceTemplateItem): Metadata {
    const site = getSiteUrl();
    const url = `${site}${templateDetailPath(item)}`;
    const title = item.metaTitle || item.title;
    const description = item.metaDescription || item.description || defaultDescription(item);
    const cover = absoluteMediaUrl(
        item.primaryPreview?.thumbnailUrlLarge
            || item.primaryPreview?.thumbnailUrl
            || item.primaryPreview?.url,
    );
    const keywords = [...(item.tags || []), ...(item.aiModels || [])].filter(Boolean);

    return {
        title,
        description,
        alternates: { canonical: url },
        keywords: keywords.length ? keywords : undefined,
        openGraph: {
            title,
            description,
            url,
            siteName: 'Hosheton Studio',
            type: 'article',
            locale: 'fa_IR',
            images: cover ? [{ url: cover, alt: item.title }] : undefined,
        },
        twitter: {
            card: cover ? 'summary_large_image' : 'summary',
            title,
            description,
            images: cover ? [cover] : undefined,
        },
    };
}

/** schema.org JSON-LD: the template (Product when paid) + breadcrumbs. */
export function buildTemplateJsonLd(item: MarketplaceTemplateItem) {
    const site = getSiteUrl();
    const url = `${site}${templateDetailPath(item)}`;
    const cover = absoluteMediaUrl(
        item.primaryPreview?.thumbnailUrlLarge
            || item.primaryPreview?.thumbnailUrl
            || item.primaryPreview?.url,
    );
    const description = item.metaDescription || item.description || defaultDescription(item);
    const isPaid = item.isForSale && item.price > 0;

    const templateNode: Record<string, unknown> = {
        '@type': isPaid ? 'Product' : 'CreativeWork',
        name: item.title,
        description,
        url,
        inLanguage: 'fa-IR',
        image: cover ? [cover] : undefined,
        datePublished: item.approvedAt || undefined,
        author: item.creator?.fullName
            ? { '@type': 'Person', name: item.creator.fullName }
            : undefined,
        keywords: item.tags?.length ? item.tags.join('، ') : undefined,
        isAccessibleForFree: !isPaid,
    };
    if (isPaid) {
        // API stores price in IRT (Toman); schema.org needs ISO-4217, so express it in Rial.
        templateNode.offers = {
            '@type': 'Offer',
            url,
            price: String(item.price * 10),
            priceCurrency: 'IRR',
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
        };
    }

    return [
        { '@context': 'https://schema.org', ...templateNode },
        breadcrumbList(site, item.categoryTrail || [], { name: item.title, url }),
    ];
}
