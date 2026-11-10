'use client';

import {useParams} from 'next/navigation';
import WallpaperForm from '../WallpaperForm';

export default function EditWallpaperPage() {
    const params = useParams();
    return <WallpaperForm wallpaperId={String(params?.id || '')}/>;
}
