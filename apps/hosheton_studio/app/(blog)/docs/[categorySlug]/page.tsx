import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import {
    docsHref,
    DOCS_BASE_PATH,
    DOCS_TOPICS_PATH,
    fetchDocsCategory,
    fetchDocsLanding,
    formatFaDate,
    htmlToText,
} from '@/app/(marketplace)/lib/content-api';
import { decodeSlugParam } from '@/app/(marketplace)/lib/explore-detail';
import { absoluteMediaUrl, getSiteUrl } from '@/app/(marketplace)/lib/seo';
import { Breadcrumbs, EmptyState, JsonLd, breadcrumbJsonLd } from '../../_content/ContentParts';
import { DocIcon, DocsLinkGrid, DocsSectionList, topicIcon } from '../../_content/DocsCards';
import { DocsNav, flattenDocsTree } from '../../_content/DocsNav';
import styles from '../../_content/content.module.scss';

type DocsCategoryProps = { params: Promise<{ categorySlug: string }> };

/** تعداد موضوع‌های «موضوع‌های دیگر» پیش از لینک «نمایش موضوعات دیگر» */
const OTHER_TOPICS_COUNT = 7;

const load = cache((slug: string) => fetchDocsCategory(slug));

export async function generateMetadata({ params }: DocsCategoryProps): Promise<Metadata> {
    const data = await load(decodeSlugParam((await params).categorySlug));
    if (!data) return { title: 'یافت نشد', robots: { index: false, follow: false } };
    const { category } = data;
    const url = `${getSiteUrl()}${docsHref(category.slug)}`;
    const title = category.metaTitle || `مستندات ${category.name}`;
    const description = category.metaDescription || category.description || htmlToText(category.content)
        || `مستندات و راهنمای «${category.name}» در هوشتون استودیو.`;
    const image = absoluteMediaUrl(category.image);
    return {
        title,
        description,
        alternates: { canonical: url },
        robots: category.noindex ? { index: false, follow: true } : undefined,
        openGraph: { title, description, url, type: 'website', locale: 'fa_IR', siteName: 'Hosheton Studio', images: image ? [image] : undefined },
    };
}

/**
 * صفحهٔ موضوع مستندات — الگوی صفحهٔ موضوع docs.liara.ir:
 * درخت بخش‌های موضوع در ستون کناری | عنوان و توضیح تمام‌عرض، «از اینجا شروع کنید»،
 * متن معرفی، فهرست شماره‌دار بخش‌ها (با زیربخش‌ها) و موضوع‌های دیگر.
 */
export default async function DocsCategoryPage({ params }: DocsCategoryProps) {
    const [data, landing] = await Promise.all([load(decodeSlugParam((await params).categorySlug)), fetchDocsLanding()]);
    if (!data) notFound();
    const { category, pageTree } = data;
    const crumbs = [
        { name: 'هوشتون استودیو', href: '/' },
        { name: 'مستندات', href: DOCS_BASE_PATH },
        { name: category.name, href: docsHref(category.slug) },
    ];
    const pages = flattenDocsTree(pageTree);
    const icon = topicIcon(category.slug);
    const lastUpdated = pages.map((page) => page.updatedAt).filter(Boolean).sort().pop();
    const startPages = pageTree.slice(0, 2);
    const otherTopics = (landing?.categories || []).filter((topic) => topic._id !== category._id);

    return (
        <main>
            <JsonLd
                data={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'CollectionPage',
                        name: category.metaTitle || category.name,
                        url: `${getSiteUrl()}${docsHref(category.slug)}`,
                        inLanguage: 'fa-IR',
                        hasPart: pages.map((page) => ({
                            '@type': 'TechArticle',
                            headline: page.title,
                            url: `${getSiteUrl()}${docsHref(category.slug, page.slug)}`,
                        })),
                    },
                    breadcrumbJsonLd(crumbs),
                ]}
            />
            <Breadcrumbs crumbs={crumbs} />
            <div className={styles.docsTopicLayout}>
                <DocsNav categorySlug={category.slug} categoryName={category.name} tree={pageTree} />
                <div className={styles.docsTopicMain}>
                    <header className={styles.docsTopicHead}>
                        <span className={styles.topicIcon}><DocIcon name={icon} size={22} /></span>
                        <h1>{`مستندات ${category.name}`}</h1>
                        {category.description ? <p>{category.description}</p> : null}
                        {pages.length ? (
                            <div className={styles.articleMeta}>
                                <span>{`${pages.length.toLocaleString('fa-IR')} بخش`}</span>
                                {lastUpdated ? (
                                    <span>به‌روزرسانی: <time dateTime={lastUpdated}>{formatFaDate(lastUpdated)}</time></span>
                                ) : null}
                            </div>
                        ) : null}
                    </header>

                    {category.content ? (
                        // eslint-disable-next-line react/no-danger
                        <div className={styles.prose} dangerouslySetInnerHTML={{ __html: category.content }} />
                    ) : null}

                    {startPages.length ? (
                        <section aria-labelledby="topic-start">
                            <h2 id="topic-start" className={styles.docsHeading}>از اینجا شروع کنید</h2>
                            <DocsLinkGrid
                                wide
                                items={startPages.map((page, index) => ({
                                    href: docsHref(category.slug, page.slug),
                                    title: page.title,
                                    icon: index === 0 ? 'spark' : icon,
                                    hint: index === 0 ? 'قدم اول' : 'قدم بعدی',
                                }))}
                            />
                        </section>
                    ) : null}

                    {pages.length ? (
                        <section aria-labelledby="topic-pages">
                            <h2 id="topic-pages" className={styles.docsHeading}>{`بخش‌های ${category.name}`}</h2>
                            <DocsSectionList categorySlug={category.slug} tree={pageTree} />
                        </section>
                    ) : (
                        <EmptyState>هنوز بخشی در این موضوع منتشر نشده است.</EmptyState>
                    )}

                    {otherTopics.length ? (
                        <section aria-labelledby="topic-others">
                            <h2 id="topic-others" className={styles.docsHeading}>موضوع‌های دیگر</h2>
                            <DocsLinkGrid
                                items={[
                                    ...otherTopics.slice(0, OTHER_TOPICS_COUNT).map((topic) => ({
                                        href: docsHref(topic.slug),
                                        title: topic.name,
                                        hint: `${topic.pageCount.toLocaleString('fa-IR')} بخش`,
                                    })),
                                    // بیشتر از ۷ موضوع: خانهٔ هشتم = لینک فهرست همهٔ موضوع‌ها (صفحه‌بندی‌شده)
                                    ...(otherTopics.length > OTHER_TOPICS_COUNT
                                        ? [{
                                            href: DOCS_TOPICS_PATH,
                                            title: 'نمایش موضوعات دیگر',
                                            accent: true,
                                            hint: `${(otherTopics.length - OTHER_TOPICS_COUNT).toLocaleString('fa-IR')} موضوع دیگر`,
                                        }]
                                        : []),
                                ]}
                            />
                        </section>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
