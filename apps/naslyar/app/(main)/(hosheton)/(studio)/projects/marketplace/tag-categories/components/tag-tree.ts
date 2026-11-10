import { buildCategoryTree, type ContentCategoryNode } from '@/app/(main)/components/content-categories/content-categories';
import { templateTagSlug, type TemplateTagCategory } from '../../../../lib/template-tag-category-api';
import { templateTagLabelFa } from '../../../../lib/template-tag-labels-fa';

export const TAG_URL_PREFIX = '/explore';

export type TagTreeNode = ContentCategoryNode & { tag: TemplateTagCategory };

/** نام نمایشی تگ: نام دستی پنل، وگرنه ترجمهٔ فارسی key */
export function tagDisplayName(tag: Pick<TemplateTagCategory, 'key' | 'label'>): string {
    return tag.label?.trim() || templateTagLabelFa(tag.key);
}

/**
 * درخت تگ‌ها با همان helper درخت دسته‌های سئو (`_id` = key، والد = parentKey، slug = key با خط تیره)
 * — ترتیب نمایش، عمق و مسیر URL دقیقاً مثل استودیو (/explore/<parent>/<tag>).
 */
export function buildTagTree(tags: TemplateTagCategory[]): TagTreeNode[] {
    const byKey = new Map(tags.map((tag) => [tag.key, tag]));
    return buildCategoryTree(tags.map((tag) => ({
        _id: tag.key,
        name: tagDisplayName(tag),
        slug: templateTagSlug(tag.key),
        section: 'template_tag',
        parentId: tag.parentKey || null,
        sortOrder: tag.sortOrder ?? 0,
        metaDescription: tag.metaDescription,
        noindex: tag.noindex,
    }))).map((node) => ({ ...node, tag: byKey.get(node._id) as TemplateTagCategory }));
}

export function tagPublicPath(node: Pick<ContentCategoryNode, 'path'>): string {
    return `${TAG_URL_PREFIX}/${node.path.join('/')}`;
}
