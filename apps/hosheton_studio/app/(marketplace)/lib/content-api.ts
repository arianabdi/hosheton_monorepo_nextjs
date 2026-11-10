/**
 * Server-side fetchers for the public blog & docs (core modules shared by every app; content is
 * written in naslyar > محتوا). Plain `fetch` so they run in server components / generateMetadata.
 *
 *   /blog                         → GET api/blog/public/resolve?path=
 *   /blog/<cat>/<sub>             → same endpoint — category landing (its posts + subcategories' posts)
 *   /blog/<cat>/<sub>/<post>      → same endpoint — post inside exactly that category
 *   /docs, /docs/<cat>, /docs/<cat>/<page> → api/docs/public/{landing,category,page}
 */
import { absoluteMediaUrl } from './seo';
import type { LegalKey } from '@/app/lib/legal-pages';

export { LEGAL_KEYS, legalHref, type LegalKey } from '@/app/lib/legal-pages';

export const BLOG_BASE_PATH = '/blog';
/** فهرست صفحه‌بندی‌شدهٔ همهٔ دسته‌های بلاگ (مسیر ثابت؛ دسته‌ای با slug «categories» ساخته نشود) */
export const BLOG_CATEGORIES_PATH = '/blog/categories';
export const DOCS_BASE_PATH = '/docs';
/** فهرست صفحه‌بندی‌شدهٔ همهٔ موضوع‌های مستندات (مسیر ثابت؛ موضوعی با slug «topics» ساخته نشود) */
export const DOCS_TOPICS_PATH = '/docs/topics';

export interface ContentCategory {
    _id: string;
    name: string;
    slug: string;
    description: string;
    content?: string;
    metaTitle?: string;
    metaDescription?: string;
    image?: string;
    noindex?: boolean;
    path?: string[];
    updatedAt?: string | null;
}

type FileRef = { path?: string } | string | null | undefined;

export interface BlogPostCard {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    author?: string;
    createdAt?: string;
    updatedAt?: string;
    categoryName?: string;
    image?: FileRef;
    thumbnail?: FileRef;
    path: string[];
}

export interface BlogPostDetail extends BlogPostCard {
    content?: string;
    seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[] };
}

export type BlogBreadcrumb = { name: string; path: string[] };

type Paged = { posts: BlogPostCard[]; totalItems: number; page: number; limit: number };

export type BlogResolution =
    | ({ type: 'root'; categories: ContentCategory[]; breadcrumbs: BlogBreadcrumb[] } & Paged)
    | ({ type: 'category'; category: ContentCategory; children: ContentCategory[]; breadcrumbs: BlogBreadcrumb[] } & Paged)
    | { type: 'post'; post: BlogPostDetail; category: ContentCategory; breadcrumbs: BlogBreadcrumb[]; related: BlogPostCard[] };

export interface DocsPageRef {
    _id: string;
    title: string;
    slug: string;
    order?: number;
    parentId?: string | null;
    updatedAt?: string | null;
    /** کاور آموزش (مسیر/URL) و خلاصهٔ کارت */
    image?: string;
    metaDescription?: string;
}

export interface DocsTreeNode extends DocsPageRef {
    children: DocsTreeNode[];
}

export interface DocsLanding {
    categories: Array<ContentCategory & { pageCount: number; pages: DocsPageRef[] }>;
    popularPages: Array<{ _id: string; title: string; slug: string; categorySlug: string; categoryName: string }>;
    /** جدیدترین آموزش‌ها در همهٔ موضوع‌ها (ویژه + فهرست صفحهٔ اصلی) */
    latestPages?: DocsLatestPage[];
}

export interface DocsLatestPage {
    _id: string;
    title: string;
    slug: string;
    image?: string;
    metaDescription?: string;
    content?: string;
    categorySlug: string;
    categoryName: string;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface DocsCategoryPage {
    category: ContentCategory;
    pages: DocsPageRef[];
    pageTree: DocsTreeNode[];
}

export interface DocsReaderPage extends DocsCategoryPage {
    page: DocsPageRef & { content: string; metaTitle?: string; metaDescription?: string; createdAt?: string; image?: string };
}

function getApiBase(): string {
    return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

async function getJson<T>(path: string): Promise<T | null> {
    const apiBase = getApiBase();
    if (!apiBase) return null;
    try {
        const res = await fetch(`${apiBase}${path}`, { next: { revalidate: 60 } });
        if (!res.ok) return null;
        const json = await res.json();
        return (json?.data as T) ?? null;
    } catch {
        return null;
    }
}

export function encodePath(segments: string[]): string {
    return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

export function blogHref(path: string[] | undefined | null): string {
    return path?.length ? `${BLOG_BASE_PATH}/${encodePath(path)}` : BLOG_BASE_PATH;
}

export function docsHref(categorySlug?: string, pageSlug?: string): string {
    return `${DOCS_BASE_PATH}/${encodePath([categorySlug, pageSlug].filter(Boolean) as string[])}`.replace(/\/$/, '');
}

export interface LegalPost {
    post: BlogPostDetail & { systemKey: LegalKey };
    /** همهٔ صفحه‌های حقوقی منتشرشده — برای لینک بین آن‌ها */
    pages: Array<{ systemKey: LegalKey; title: string }>;
}

export function fetchLegalPost(key: LegalKey) {
    return getJson<LegalPost>(`/api/blog/public/system/${encodeURIComponent(key)}`);
}

export function fetchBlog(path: string[], page = 1, limit = 12) {
    const params = new URLSearchParams({ path: path.join('/'), page: String(page), limit: String(limit) });
    return getJson<BlogResolution>(`/api/blog/public/resolve?${params}`);
}

/** درخت عمومی دسته‌های یک section (فهرست تخت با parentId / path / depth) */
export function fetchCategoryTree(section: string) {
    return getJson<{ section: string; categories: Array<ContentCategory & { parentId?: string | null; depth?: number }> }>(
        `/api/categories/public/tree?section=${encodeURIComponent(section)}`,
    );
}

export function fetchDocsLanding() {
    return getJson<DocsLanding>('/api/docs/public/landing');
}

export function fetchDocsCategory(categorySlug: string) {
    return getJson<DocsCategoryPage>(`/api/docs/public/category/${encodeURIComponent(categorySlug)}`);
}

export function fetchDocsPage(categorySlug: string, pageSlug: string) {
    return getJson<DocsReaderPage>(
        `/api/docs/public/page/${encodeURIComponent(categorySlug)}/${encodeURIComponent(pageSlug)}`,
    );
}

/** File record (blog image) or plain URL → absolute URL for <img> and OG tags. */
export function contentImageUrl(file: FileRef): string | undefined {
    if (!file) return undefined;
    return absoluteMediaUrl(typeof file === 'string' ? file : file.path);
}

/** Plain-text summary from editor HTML (meta descriptions, cards). */
export function htmlToText(html: string | undefined | null, max = 160): string {
    const text = String(html || '')
        .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function formatFaDate(value?: string | null): string {
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
    } catch {
        return '';
    }
}

/** Headings (h2/h3) get stable ids so the docs table of contents can link to them. */
export function withHeadingIds(html: string): { html: string; headings: Array<{ id: string; text: string; level: number }> } {
    const headings: Array<{ id: string; text: string; level: number }> = [];
    const used = new Set<string>();
    const out = String(html || '').replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
        const text = htmlToText(inner, 200);
        if (!text) return match;
        let id = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || `section-${headings.length + 1}`;
        while (used.has(id)) id = `${id}-${headings.length + 1}`;
        used.add(id);
        headings.push({ id, text, level: Number(level) });
        const cleanAttrs = String(attrs).replace(/\sid="[^"]*"/i, '');
        return `<h${level}${cleanAttrs} id="${id}">${inner}</h${level}>`;
    });
    return { html: out, headings };
}
