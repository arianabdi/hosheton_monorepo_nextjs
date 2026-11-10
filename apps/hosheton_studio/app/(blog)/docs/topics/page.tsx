import type { Metadata } from 'next';
import { docsHref, DOCS_BASE_PATH, DOCS_TOPICS_PATH, fetchDocsLanding } from '@/app/(marketplace)/lib/content-api';
import { getSiteUrl } from '@/app/(marketplace)/lib/seo';
import { Breadcrumbs, EmptyState, JsonLd, breadcrumbJsonLd } from '../../_content/ContentParts';
import { ContentPagination } from '../../_content/ContentPagination';
import { DocsTopicGrid, topicIcon } from '../../_content/DocsCards';
import styles from '../../_content/content.module.scss';

/** گرید موضوع در دسکتاپ سه‌ستونه است → ۳ ردیف کامل در هر صفحه */
const PAGE_SIZE = 9;
const TITLE = 'همهٔ موضوع‌های مستندات';
const DESCRIPTION = 'فهرست کامل موضوع‌های مستندات هوشتون استودیو؛ هر موضوع را باز کنید و بخش‌هایش را قدم‌به‌قدم بخوانید.';

type DocsTopicsProps = { searchParams: Promise<{ page?: string }> };

function pageNumber(raw?: string) {
    return Math.max(1, Math.floor(Number(raw) || 1));
}

export async function generateMetadata({ searchParams }: DocsTopicsProps): Promise<Metadata> {
    const page = pageNumber((await searchParams).page);
    const url = `${getSiteUrl()}${DOCS_TOPICS_PATH}${page > 1 ? `?page=${page}` : ''}`;
    return {
        title: page > 1 ? `${TITLE} — صفحه ${page}` : TITLE,
        description: DESCRIPTION,
        alternates: { canonical: url },
        openGraph: { title: TITLE, description: DESCRIPTION, url, siteName: 'Hosheton Studio', type: 'website', locale: 'fa_IR' },
    };
}

/** فهرست همهٔ موضوع‌های مستندات با صفحه‌بندی (?page=) — مقصد «نمایش موضوعات دیگر» صفحهٔ موضوع */
export default async function DocsTopicsPage({ searchParams }: DocsTopicsProps) {
    const landing = await fetchDocsLanding();
    const topics = landing?.categories || [];
    const lastPage = Math.max(1, Math.ceil(topics.length / PAGE_SIZE));
    const page = Math.min(pageNumber((await searchParams).page), lastPage);
    const visible = topics.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const crumbs = [
        { name: 'هوشتون استودیو', href: '/' },
        { name: 'مستندات', href: DOCS_BASE_PATH },
        { name: 'همهٔ موضوع‌ها', href: DOCS_TOPICS_PATH },
    ];

    return (
        <main className={styles.docsHome}>
            <JsonLd
                data={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'CollectionPage',
                        name: TITLE,
                        url: `${getSiteUrl()}${DOCS_TOPICS_PATH}`,
                        inLanguage: 'fa-IR',
                        hasPart: visible.map((topic) => ({
                            '@type': 'CollectionPage',
                            name: topic.name,
                            url: `${getSiteUrl()}${docsHref(topic.slug)}`,
                        })),
                    },
                    breadcrumbJsonLd(crumbs),
                ]}
            />
            <div>
                <Breadcrumbs crumbs={crumbs} />
                <header className={styles.docsTopicHead}>
                    <h1>{TITLE}</h1>
                    <p>{DESCRIPTION}</p>
                    {topics.length ? (
                        <div className={styles.articleMeta}>
                            <span>{`${topics.length.toLocaleString('fa-IR')} موضوع`}</span>
                        </div>
                    ) : null}
                </header>
            </div>
            {visible.length ? (
                <>
                    <DocsTopicGrid
                        topics={visible.map((topic) => ({
                            href: docsHref(topic.slug),
                            name: topic.name,
                            description: topic.description,
                            icon: topicIcon(topic.slug),
                            count: topic.pageCount,
                        }))}
                    />
                    <div className={styles.pager}>
                        <ContentPagination page={page} limit={PAGE_SIZE} total={topics.length} />
                    </div>
                </>
            ) : (
                <EmptyState>هنوز موضوعی در مستندات منتشر نشده است.</EmptyState>
            )}
        </main>
    );
}
