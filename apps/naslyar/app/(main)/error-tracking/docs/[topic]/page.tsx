'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import DocLayout, { DocPage, DocPager } from '@/app/components/DocLayout/DocLayout';
import { ETR_DOC_TOPICS, ETR_DOCS_BASE } from '../topics';

export default function ErrorTrackingDocTopicPage() {
    const params = useParams();
    const slug = String(params?.topic || '');
    const topic = ETR_DOC_TOPICS.find((item) => item.slug === slug);

    if (!topic) {
        return (
            <DocPage title="موضوع پیدا نشد" lead="این موضوع در مستندات پایش خطا نیست." back={{ href: ETR_DOCS_BASE, label: '← همهٔ موضوعات' }}>
                <Link href={ETR_DOCS_BASE}>بازگشت به فهرست موضوعات</Link>
            </DocPage>
        );
    }

    return (
        <DocPage title={topic.title} lead={topic.summary} back={{ href: ETR_DOCS_BASE, label: '← همهٔ موضوعات' }}>
            <DocLayout sections={topic.sections} />
            <DocPager topics={ETR_DOC_TOPICS} current={topic.slug} basePath={ETR_DOCS_BASE} />
        </DocPage>
    );
}
