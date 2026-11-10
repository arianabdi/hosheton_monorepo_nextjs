import axios from 'axios';

/**
 * دسته‌بندی‌های سئو (core category) — مشترک همهٔ اپ‌ها. هر «بخش» (section) یک درخت جدا دارد و
 * فرانت هر اپ URL را از زنجیرهٔ slugها می‌سازد (`/blog/ai/llm`، `/explore/photo/portrait`).
 * قواعد کامل: AGENTS.md ریشهٔ monorepo، بخش «محتوا و دسته‌بندی سئو».
 */

export interface ContentCategorySectionConfig {
    section: string;
    title: string;
    subtitle: string;
    /** پیشوند مسیر عمومی روی سایت اپ — فقط برای پیش‌نمایش آدرس */
    urlPrefix: string;
    /** زیردسته مجاز است و در URL می‌آید */
    hierarchical: boolean;
    /** مسیر فهرست همین بخش در پنل */
    basePath: string;
    /** نام گروه سایت‌مپ صفحه‌های فرود این بخش (marketing/sitemap) */
    sitemapGroup?: string;
}

export const CONTENT_CATEGORY_SECTIONS = {
    post: {
        section: 'post',
        title: 'دسته‌بندی مقالات',
        subtitle: 'درخت دسته و زیردستهٔ بلاگ — آدرس هر مقاله زیر زنجیرهٔ دسته‌اش ساخته می‌شود.',
        urlPrefix: '/blog',
        hierarchical: true,
        basePath: '/blog/categories',
        sitemapGroup: 'blog-categories',
    },
    docs: {
        section: 'docs',
        title: 'موضوع‌های مستندات و آموزش',
        subtitle: 'هر موضوع یک صفحهٔ فهرست دارد و صفحه‌های آموزشی زیر آن منتشر می‌شوند.',
        urlPrefix: '/docs',
        hierarchical: false,
        basePath: '/docs/categories',
        sitemapGroup: 'docs-categories',
    },
} satisfies Record<string, ContentCategorySectionConfig>;

export interface ContentCategory {
    _id: string;
    name: string;
    slug: string;
    section: string;
    description?: string;
    parentId?: string | null;
    metaTitle?: string;
    metaDescription?: string;
    content?: string;
    image?: string;
    sortOrder?: number;
    noindex?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ContentCategoryNode extends ContentCategory {
    depth: number;
    /** slugهای زنجیره از ریشه */
    path: string[];
    childCount: number;
}

export type ContentCategoryInput = Pick<
    ContentCategory,
    'name' | 'slug' | 'description' | 'parentId' | 'metaTitle' | 'metaDescription' | 'content' | 'image' | 'sortOrder' | 'noindex'
>;

const API_ERRORS: Record<string, string> = {
    category_slug_already_exists: 'این شناسه (slug) در همین بخش قبلاً استفاده شده — شناسهٔ دیگری بگذارید.',
    category_invalid_parent: 'دستهٔ والد معتبر نیست (نمی‌تواند خود دسته یا یکی از زیردسته‌هایش باشد).',
    category_has_children: 'این دسته زیردسته دارد؛ اول زیردسته‌ها را حذف یا به دستهٔ دیگری منتقل کنید.',
    name_is_required: 'نام دسته الزامی است.',
    slug_is_required: 'شناسه (slug) الزامی است.',
};

/** پیام فارسی کدهای خطای ماژول دسته‌بندی؛ بقیه به ErrorToaster سپرده می‌شوند */
export function categoryErrorMessage(error: unknown): string | null {
    const data = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
    const message = typeof data?.message === 'string' ? data.message : '';
    return API_ERRORS[message] || null;
}

/** slug لاتین کوچک با خط تیره — یکسان در همهٔ بخش‌ها */
export function normalizeSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-{2,}/g, '-');
}

/** درخت به ترتیب نمایش (والد، بعد فرزندان) با عمق و مسیر هر نود */
export function buildCategoryTree(items: ContentCategory[]): ContentCategoryNode[] {
    const byParent = new Map<string, ContentCategory[]>();
    const ids = new Set(items.map((item) => item._id));
    for (const item of items) {
        const key = item.parentId && ids.has(String(item.parentId)) ? String(item.parentId) : '';
        byParent.set(key, [...(byParent.get(key) || []), item]);
    }
    const sort = (list: ContentCategory[]) =>
        [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'fa'));
    const out: ContentCategoryNode[] = [];
    const walk = (parentKey: string, depth: number, parentPath: string[], seen: Set<string>) => {
        for (const item of sort(byParent.get(parentKey) || [])) {
            if (seen.has(item._id)) continue;
            const path = [...parentPath, item.slug];
            out.push({ ...item, depth, path, childCount: (byParent.get(item._id) || []).length });
            walk(item._id, depth + 1, path, new Set([...seen, item._id]));
        }
    };
    walk('', 0, [], new Set());
    return out;
}

/** خود دسته و همهٔ نوادگانش — گزینه‌های غیرمجاز «والد» در فرم ویرایش */
export function descendantIds(nodes: ContentCategoryNode[], id: string): Set<string> {
    const out = new Set([id]);
    let grew = true;
    while (grew) {
        grew = false;
        for (const node of nodes) {
            if (node.parentId && out.has(String(node.parentId)) && !out.has(node._id)) {
                out.add(node._id);
                grew = true;
            }
        }
    }
    return out;
}

function auth(token: string | null) {
    return { headers: { authorization: `Bearer ${token}` } };
}

export const contentCategoryApi = {
    async list(baseUrl: string, token: string | null, section: string): Promise<ContentCategory[]> {
        const res = await axios.get(`${baseUrl}/api/categories/panel`, {
            ...auth(token),
            params: { section, page: 1, limit: 1000 },
        });
        return res.data?.data?.categories || [];
    },
    async get(baseUrl: string, token: string | null, id: string): Promise<ContentCategory> {
        const res = await axios.get(`${baseUrl}/api/categories/panel/${id}`, auth(token));
        return res.data?.data;
    },
    async create(baseUrl: string, token: string | null, section: string, body: ContentCategoryInput) {
        const res = await axios.post(`${baseUrl}/api/categories/panel`, { ...body, section }, auth(token));
        return res.data?.data as ContentCategory;
    },
    async update(baseUrl: string, token: string | null, id: string, body: ContentCategoryInput) {
        const res = await axios.put(`${baseUrl}/api/categories/panel/${id}`, body, auth(token));
        return res.data?.data as ContentCategory;
    },
    async remove(baseUrl: string, token: string | null, id: string) {
        await axios.delete(`${baseUrl}/api/categories/panel/${id}`, auth(token));
    },
};
