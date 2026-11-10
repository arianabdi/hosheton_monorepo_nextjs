'use client';

import { Suspense, use } from 'react';
import TagCategoryForm from '../components/TagCategoryForm';

export default function EditTemplateTagCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <Suspense fallback={null}>
            <TagCategoryForm key={id} tagId={id} />
        </Suspense>
    );
}
