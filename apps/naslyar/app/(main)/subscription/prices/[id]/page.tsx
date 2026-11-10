'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import PriceForm from '../../components/PriceForm';

export default function EditPricePage() {
    const params = useParams();
    return (
        <Suspense fallback={null}>
            <PriceForm priceId={String(params?.id || '')} />
        </Suspense>
    );
}
