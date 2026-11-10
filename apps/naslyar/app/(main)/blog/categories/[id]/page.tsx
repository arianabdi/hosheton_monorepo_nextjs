'use client';

import { Suspense, use } from 'react';
import ContentCategoryForm from '@/app/(main)/components/content-categories/ContentCategoryForm';
import { CONTENT_CATEGORY_SECTIONS } from '@/app/(main)/components/content-categories/content-categories';

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <Suspense fallback={null}>
            <ContentCategoryForm key={id} config={CONTENT_CATEGORY_SECTIONS.post} categoryId={id} />
        </Suspense>
    );
}
