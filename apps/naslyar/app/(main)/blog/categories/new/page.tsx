'use client';

import { Suspense } from 'react';
import ContentCategoryForm from '@/app/(main)/components/content-categories/ContentCategoryForm';
import { CONTENT_CATEGORY_SECTIONS } from '@/app/(main)/components/content-categories/content-categories';

export default function NewCategoryPage() {
    return (
        <Suspense fallback={null}>
            <ContentCategoryForm config={CONTENT_CATEGORY_SECTIONS.post} />
        </Suspense>
    );
}
