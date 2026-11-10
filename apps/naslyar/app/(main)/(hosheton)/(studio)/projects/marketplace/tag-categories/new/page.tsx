'use client';

import { Suspense } from 'react';
import TagCategoryForm from '../components/TagCategoryForm';

export default function NewTemplateTagCategoryPage() {
    return (
        <Suspense fallback={null}>
            <TagCategoryForm />
        </Suspense>
    );
}
