import { Suspense } from 'react';
import { MediaProjectList } from './components/MediaProjectList';

export default function ProjectsPage() {
    // MediaProjectList صفحه و تعداد را از URL می‌خواند (useSearchParams)
    return (
        <Suspense fallback={null}>
            <MediaProjectList />
        </Suspense>
    );
}
