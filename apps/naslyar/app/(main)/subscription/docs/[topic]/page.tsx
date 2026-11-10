'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import DocLayout, { DocPage, DocPager } from '@/app/components/DocLayout/DocLayout';
import { SUB_DOC_TOPICS, SUB_DOCS_BASE } from '../topics';

export default function SubscriptionDocTopicPage() {
    const params = useParams();
    const slug = String(params?.topic || '');
    const topic = SUB_DOC_TOPICS.find((item) => item.slug === slug);

    if (!topic) {
        return (
            <DocPage title="موضوع پیدا نشد" lead="این موضوع در مستندات اشتراک نیست." back={{ href: SUB_DOCS_BASE, label: '← همهٔ موضوعات' }}>
                <Link href={SUB_DOCS_BASE}>بازگشت به فهرست موضوعات</Link>
            </DocPage>
        );
    }

    return (
        <DocPage title={topic.title} lead={topic.summary} back={{ href: SUB_DOCS_BASE, label: '← همهٔ موضوعات' }}>
            <DocLayout sections={topic.sections} />
            <DocPager topics={SUB_DOC_TOPICS} current={topic.slug} basePath={SUB_DOCS_BASE} />
        </DocPage>
    );
}
