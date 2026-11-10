'use client';

import { useParams } from 'next/navigation';
import FeatureForm from '../../components/FeatureForm';

export default function EditFeaturePage() {
    const params = useParams();
    return <FeatureForm featureId={String(params?.id || '')} />;
}
