/**
 * دسته‌های سئو اکسپلور = «دسته‌بندی تگ‌ها» (naslyar › زیرساخت › دسته‌بندی تگ‌ها؛ API: marketplace/template-tags)
 * و قرارداد URL اکسپلور. بدون 'use client' — هم صفحه‌های سرور (metadata، JSON-LD) و هم کلاینت از همین می‌خوانند.
 *
 *   /explore                       → همهٔ قالب‌ها
 *   /explore/<tag>/<sub-tag>       → صفحهٔ فرود تگ (قالب‌های خودش + زیرتگ‌ها)
 *   /explore/<tag>/<slug>          → قالب (دستهٔ اصلی = اولین تگ قالب؛ canonical)
 *   /explore/<slug>                → قالب بی‌تگ؛ برای قالب تگ‌دار به آدرس canonical ریدایرکت می‌شود
 *
 * slug تگ = key با خط تیره (human_portrait → human-portrait). «موضوع»ها (section=marketplace، badgeهای
 * بالای صفحه) فیلتر داخل همین صفحه‌اند و URL ندارند.
 */
import faLocale from '@/app/lib/i18n/locales/fa.json';

const FA_TAG_LABELS = (faLocale as { templateTags?: Record<string, string> }).templateTags || {};

export interface TemplateCategoryNode {
    /** key تگ (همان شناسهٔ ترجمه در namespace `templateTags`) */
    _id: string;
    parentId: string | null;
    /** نام فارسی (سرور/سئو) — در UI کلاینت با useCategoryName به زبان کاربر */
    name: string;
    /** نام دستی پنل (اگر خالی، ترجمهٔ key) */
    label: string;
    slug: string;
    description: string;
    content: string;
    metaTitle: string;
    metaDescription: string;
    image: string;
    sortOrder: number;
    noindex: boolean;
    /** slugهای زنجیره از ریشه تا خود دسته */
    path: string[];
    depth: number;
    updatedAt?: string | null;
}

export type ExplorePathResolution =
    | { kind: 'root' }
    | { kind: 'category'; node: TemplateCategoryNode }
    | { kind: 'template'; slug: string; parent: TemplateCategoryNode | null };

export const EXPLORE_BASE_PATH = '/explore';

function encodePath(segments: string[]): string {
    return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

export function categoryHref(node: Pick<TemplateCategoryNode, 'path'>): string {
    return `${EXPLORE_BASE_PATH}/${encodePath(node.path)}`;
}

/** Route params / pathname segments arrive percent-encoded for Persian slugs — decode defensively. */
export function decodeSegments(raw: string[] | undefined | null): string[] {
    return (raw || [])
        .map((part) => {
            const value = String(part || '').trim();
            try {
                return decodeURIComponent(value);
            } catch {
                return value;
            }
        })
        .filter(Boolean);
}

/** Segments after /explore in a pathname (e.g. "/explore/a/b" → ["a","b"]). */
export function exploreSegmentsFromPathname(pathname: string | null | undefined): string[] {
    const value = String(pathname || '');
    if (!value.startsWith(EXPLORE_BASE_PATH)) return [];
    return decodeSegments(value.slice(EXPLORE_BASE_PATH.length).split('/'));
}

export function findCategoryByPath(nodes: TemplateCategoryNode[], segments: string[]): TemplateCategoryNode | null {
    if (!segments.length) return null;
    const key = segments.join('/');
    return nodes.find((node) => node.path.join('/') === key) || null;
}

/**
 * زنجیرهٔ کامل → دسته؛ وگرنه آخرین بخش slug قالب است و بقیه دستهٔ والدش.
 * (اسلاگ قالب و دسته در تضاد نیستند: دسته همیشه اولویت دارد و قالب‌ها پسوند شناسه دارند.)
 */
export function resolveExplorePath(segments: string[], nodes: TemplateCategoryNode[]): ExplorePathResolution {
    if (!segments.length) return { kind: 'root' };
    const node = findCategoryByPath(nodes, segments);
    if (node) return { kind: 'category', node };
    return {
        kind: 'template',
        slug: segments[segments.length - 1],
        parent: findCategoryByPath(nodes, segments.slice(0, -1)),
    };
}

/** زنجیرهٔ دسته‌ها از ریشه تا خود دسته (breadcrumb) */
export function categoryTrailFor(nodes: TemplateCategoryNode[], path: string[] | undefined | null): TemplateCategoryNode[] {
    const trail: TemplateCategoryNode[] = [];
    const segments = path || [];
    for (let index = 1; index <= segments.length; index += 1) {
        const node = findCategoryByPath(nodes, segments.slice(0, index));
        if (!node) return [];
        trail.push(node);
    }
    return trail;
}

export function childCategoriesOf(nodes: TemplateCategoryNode[], parentId: string | null): TemplateCategoryNode[] {
    return nodes
        .filter((node) => node.parentId === parentId)
        .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'fa'));
}

function getApiBase(): string {
    return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

type PublicTemplateTag = {
    key: string;
    parentKey: string | null;
    slug: string;
    path: string[];
    depth: number;
    sortOrder: number;
    label?: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    content?: string;
    image?: string;
    noindex?: boolean;
    updatedAt?: string | null;
};

/**
 * نام فارسی تگ برای HTML سرور و سئو (محتوای سایت فارسی است): label پنل، وگرنه ترجمهٔ fa، وگرنه key.
 * کامپوننت‌های کلاینت نام را به زبان کاربر از `templateTags` ترجمه می‌کنند (useCategoryName).
 */
export function tagNameFa(key: string, label?: string | null): string {
    return label?.trim() || FA_TAG_LABELS[key] || key;
}

/** Public tag tree fetch (server components + client cache). Empty on failure — explore still works without it. */
export async function fetchTemplateCategoryTree(): Promise<TemplateCategoryNode[]> {
    const apiBase = getApiBase();
    if (!apiBase) return [];
    try {
        const res = await fetch(`${apiBase}/api/studio/marketplace/template-tags`, {
            next: { revalidate: 60 },
        } as RequestInit);
        if (!res.ok) return [];
        const json = await res.json();
        const tags = (json?.data?.tags as PublicTemplateTag[]) || [];
        return tags.map((tag) => ({
            _id: tag.key,
            parentId: tag.parentKey || null,
            name: tagNameFa(tag.key, tag.label),
            label: tag.label || '',
            slug: tag.slug,
            description: tag.description || '',
            content: tag.content || '',
            metaTitle: tag.metaTitle || '',
            metaDescription: tag.metaDescription || '',
            image: tag.image || '',
            sortOrder: tag.sortOrder || 0,
            noindex: !!tag.noindex,
            path: tag.path || [tag.slug],
            depth: tag.depth || 0,
            updatedAt: tag.updatedAt || null,
        }));
    } catch {
        return [];
    }
}
