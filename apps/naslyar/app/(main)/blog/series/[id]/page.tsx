'use client';

import { useParams } from 'next/navigation';
import SeriesForm from '../components/SeriesForm';

export default function EditSeriesPage() {
    const params = useParams();
    return <SeriesForm seriesId={params.id as string} />;
}
