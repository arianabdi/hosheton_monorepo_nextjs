'use client';

import { Suspense } from 'react';
import PriceForm from '../../components/PriceForm';

export default function NewPricePage() {
    return (
        <Suspense fallback={null}>
            <PriceForm />
        </Suspense>
    );
}
