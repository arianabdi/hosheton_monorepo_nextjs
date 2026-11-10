import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import {
    contentImageUrl,
    docsHref,
    DOCS_BASE_PATH,
    fetchDocsPage,
    formatFaDate,
    htmlToText,
    withHeadingIds,
} from '@/app/(marketplace)/lib/content-api';
import { decodeSlugParam } from '@/app/(marketplace)/lib/explore-detail';
import { getSiteUrl } from '@/app/(marketplace)/lib/seo';
import { Breadcrumbs, JsonLd, breadcrumbJsonLd, readingMinutes } from '../../../_content/ContentParts';
import { DocsNav, flattenDocsTree } from '../../../_content/DocsNav';
import { DocsToc } from '../../../_content/DocsToc';
import styles from '../../../_content/content.module.scss';

type DocsReaderProps = { params: Promise<{ categorySlug: string; pageSlug: string }> };

const load = cache((categorySlug: string, pageSlug: string) => fetchDocsPage(categorySlug, pageSlug));

async function resolve(params: DocsReaderProps['params']) {
    const { categorySlug, pageSlug } = await params;
    return load(decodeSlugParam(categorySlug), decodeSlugParam(pageSlug));
}

export async function generateMetadata({ params }: DocsReaderProps): Promise<Metadata> {
    const data = await resolve(params);
    if (!data) return { title: 'یافت نشد', robots: { index: false, follow: false } };
    const { category, page } = data;
    const url = `${getSiteUrl()}${docsHref(category.slug, page.slug)}`;
    const title = page.metaTitle || `${page.title} | مستندات ${category.name}`;
    const description = page.metaDescription || htmlToText(page.content);
    const image = contentImageUrl(page.image);
    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: 'article',
            locale: 'fa_IR',
            siteName: 'Hosheton Studio',
            modifiedTime: page.updatedAt || undefined,
            images: image ? [image] : undefined,
        },
        twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
    };
}

/** صفحهٔ آموزش مثل مستندات: درخت آموزش‌های موضوع | متن | «در این صفحه» با پرش به هر عنوان */
export default async function DocsReaderPage({ params }: DocsReaderProps) {
    const data = await resolve(params);
    if (!data) notFound();
    const { category, page, pageTree } = data;
    const { html, headings } = withHeadingIds(page.content);
    const ordered = flattenDocsTree(pageTree);
    const index = ordered.findIndex((item) => item.slug === page.slug);
    const prev = index > 0 ? ordered[index - 1] : null;
    const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
    const url = `${getSiteUrl()}${docsHref(category.slug, page.slug)}`;
    const image = contentImageUrl(page.image);
    const minutes = readingMinutes(page.content);
    const crumbs = [
        { name: 'هوشتون استودیو', href: '/' },
        { name: 'مستندات', href: DOCS_BASE_PATH },
        { name: category.name, href: docsHref(category.slug) },
        { name: page.title, href: docsHref(category.slug, page.slug) },
    ];

    return (
        <main>
            <JsonLd
                data={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'TechArticle',
                        headline: page.title,
                        description: page.metaDescription || htmlToText(page.content),
                        url,
                        mainEntityOfPage: url,
                        inLanguage: 'fa-IR',
                        image: image ? [image] : undefined,
                        articleSection: category.name,
                        datePublished: page.createdAt,
                        dateModified: page.updatedAt || page.createdAt,
                        publisher: { '@type': 'Organization', name: 'Hosheton Studio', url: getSiteUrl() },
                    },
                    breadcrumbJsonLd(crumbs),
                ]}
            />
            <Breadcrumbs crumbs={crumbs} />
            <div className={styles.docsLayout}>
                <DocsNav categorySlug={category.slug} categoryName={category.name} tree={pageTree} activeSlug={page.slug} />
                <article className={styles.article}>
                    {headings.length > 1 ? <DocsToc headings={headings} variant="inline" /> : null}
                    <header className={styles.articleHead}>
                        <h1 className={styles.articleTitle}>{page.title}</h1>
                        {page.metaDescription ? <p className={styles.articleLead}>{page.metaDescription}</p> : null}
                        <div className={styles.articleMeta}>
                            <Link href={docsHref(category.slug)}>{category.name}</Link>
                            <span>{`${minutes.toLocaleString('fa-IR')} دقیقه مطالعه`}</span>
                            {page.updatedAt ? (
                                <span>به‌روزرسانی: <time dateTime={page.updatedAt}>{formatFaDate(page.updatedAt)}</time></span>
                            ) : null}
                        </div>
                    </header>
                    {image ? <img className={styles.cover} src={image} alt={page.title} fetchPriority="high" /> : null}
                    {/* متن صفحه HTML ویرایشگر پنل naslyar است */}
                    {/* eslint-disable-next-line react/no-danger */}
                    <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />
                    {prev || next ? (
                        <nav className={styles.pageNav} aria-label="صفحهٔ قبلی و بعدی">
                            {prev ? (
                                <Link href={docsHref(category.slug, prev.slug)} rel="prev">
                                    <span>→ قبلی</span>
                                    {prev.title}
                                </Link>
                            ) : null}
                            {next ? (
                                <Link href={docsHref(category.slug, next.slug)} rel="next">
                                    <span>بعدی ←</span>
                                    {next.title}
                                </Link>
                            ) : null}
                        </nav>
                    ) : null}
                </article>
                {headings.length > 1 ? <DocsToc headings={headings} variant="side" /> : null}
            </div>
        </main>
    );
}
