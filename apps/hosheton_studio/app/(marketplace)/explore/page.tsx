import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ExploreMasonry } from './components/ExploreMasonry';

import { fetchTemplateCategoryTree } from '@/app/(marketplace)/lib/explore-taxonomy';

export const metadata: Metadata = {
    // آدرس کانونی صفحه اصلی (همان آدرس داخل سایت‌مپ)؛ «/» و لینک‌های قدیمی ?template= به اینجا ریدایرکت می‌شوند
    alternates: { canonical: '/explore' },
};

type ExplorePageProps = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
    // Legacy shareable links (/explore?template=<id>) → canonical /explore/<id>
    const params = await searchParams;
    const legacyTemplate = typeof params.template === 'string' ? params.template.trim() : '';
    if (legacyTemplate) {
        redirect(`/explore/${encodeURIComponent(legacyTemplate)}`);
    }

    // درخت دسته‌ها سمت سرور — انتخابگر دسته از رندر اول کامل است
    const tree = await fetchTemplateCategoryTree();

    return (
        <Suspense fallback={null}>
            <ExploreMasonry initialTree={tree} />
        </Suspense>
    );
}
