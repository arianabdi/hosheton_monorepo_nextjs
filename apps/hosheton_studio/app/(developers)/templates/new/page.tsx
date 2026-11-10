'use client';

import { Suspense } from 'react';
import TemplateForm from '../TemplateForm';

export default function NewTemplatePage() {
    return (
        <Suspense fallback={null}>
            <TemplateForm mode="create" />
        </Suspense>
    );
}
