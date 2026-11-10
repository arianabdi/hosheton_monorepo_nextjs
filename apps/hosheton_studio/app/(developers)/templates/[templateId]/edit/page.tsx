'use client';

import { useParams } from 'next/navigation';
import TemplateForm from '../../TemplateForm';

export default function EditTemplatePage() {
    const params = useParams<{ templateId: string }>();
    return <TemplateForm mode="edit" templateId={String(params.templateId || '')} />;
}
