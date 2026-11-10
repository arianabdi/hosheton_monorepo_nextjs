'use client';

import { useParams } from 'next/navigation';
import FlowBuilder from '../../components/FlowBuilder';

export default function EditCampaignPage() {
    const params = useParams<{ id: string }>();
    return <FlowBuilder flowId={params?.id} />;
}
