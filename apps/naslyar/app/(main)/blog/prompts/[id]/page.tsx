'use client';

import { useParams } from 'next/navigation';
import PromptForm from '../components/PromptForm';

export default function EditPromptPage() {
    const params = useParams();
    return <PromptForm promptId={params.id as string} />;
}
