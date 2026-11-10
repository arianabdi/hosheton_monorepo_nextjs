'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import TemplateForm from '@/app/(developers)/templates/TemplateForm';

export default function TemplateViewPage() {
    const params = useParams<{ templateId: string }>();
    return (
        <Suspense fallback={null}>
            <TemplateForm mode="edit" templateId={String(params.templateId || '')} />
        </Suspense>
    );
}
