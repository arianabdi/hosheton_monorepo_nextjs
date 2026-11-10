'use client';

import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import WallpaperForm from '../WallpaperForm';

function NewWallpaperContent() {
    const searchParams = useSearchParams();
    return <WallpaperForm initialCategoryId={searchParams.get('category') || undefined}/>;
}

export default function NewWallpaperPage() {
    return (
        <Suspense fallback={null}>
            <NewWallpaperContent/>
        </Suspense>
    );
}
