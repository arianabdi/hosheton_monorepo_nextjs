'use client';

import ContentCategoryList from '@/app/(main)/components/content-categories/ContentCategoryList';
import { CONTENT_CATEGORY_SECTIONS } from '@/app/(main)/components/content-categories/content-categories';

/** دسته‌بندی‌های سئو مقالات — کامپوننت مشترک همهٔ بخش‌ها و اپ‌ها */
export default function CategoriesPage() {
    return <ContentCategoryList config={CONTENT_CATEGORY_SECTIONS.post} />;
}
