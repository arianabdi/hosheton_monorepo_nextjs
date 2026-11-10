'use client';

import { useParams } from 'next/navigation';
import PlanForm from '../../components/PlanForm';

export default function EditPlanPage() {
    const params = useParams();
    return <PlanForm planId={String(params?.id || '')} />;
}
