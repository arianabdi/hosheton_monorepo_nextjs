'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LuLoader } from 'react-icons/lu';
import { PhotoGallery, galleryFilesToPhotos, useGalleryFiles } from '@/app/(developers)/gallery';

export default function Page() {
    const { t } = useTranslation('common');
    const { files, loading, error } = useGalleryFiles({
        open: true,
        scope: 'all',
    });

    const photos = useMemo(() => galleryFilesToPhotos(files), [files]);

    return (
        <main style={{ minHeight: '100vh', background: '#fff' }}>
            {loading && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 24, color: '#5f6368' }}>
                    <LuLoader /> {t('loading')}
                </p>
            )}
            {!loading && error && (
                <p style={{ padding: 24, color: '#d93025' }}>{error}</p>
            )}
            {!loading && !error && (
                <PhotoGallery photos={photos} targetRowHeight={200} />
            )}
        </main>
    );
}
