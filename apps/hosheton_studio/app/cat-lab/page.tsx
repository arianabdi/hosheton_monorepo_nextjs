import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CatLab from '@/app/(developers)/projects/[projectId]/chat/chatInput/cat/lab/CatLab';

/* صفحهٔ تست گربهٔ چت — فقط در توسعه؛ در production صفحهٔ 404 */

export const metadata: Metadata = {
    title: 'Cat lab',
    robots: { index: false, follow: false },
};

export default function CatLabPage() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <CatLab />;
}
