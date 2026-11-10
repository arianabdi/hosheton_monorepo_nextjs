import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import {
    blogHref,
    BLOG_BASE_PATH,
    contentImageUrl,
    fetchBlog,
    formatFaDate,
    htmlToText,
    type BlogResolution,
} from '@/app/(marketplace)/lib/content-api';
import { decodeSegments } from '@/app/(marketplace)/lib/explore-taxonomy';
import { absoluteMediaUrl, getSiteUrl } from '@/app/(marketplace)/lib/seo';
import {
    Breadcrumbs,
    CardGrid,
    CategoryLinks,
    EmptyState,
    FeaturedSection,
    JsonLd,
    PageIntro,
    blogCard,
    breadcrumbJsonLd,
    readingMinutes,
    type Crumb,
} from '../../_content/ContentParts';
import { ContentPagination } from '../../_content/ContentPagination';
import styles from '../../_content/content.module.scss';

const PAGE_SIZE = 13;
/** صفحهٔ اول دسته: ۱ ویژه + ۴ تازه، بقیه در گرید */
const FEATURED_COUNT = 5;

type BlogPathProps = {
    params: Promise<{ path: string[] }>;
    searchParams: Promise<{ page?: string }>;
};

/** metadata و صفحه یک بار fetch می‌کنند (cache درخواست) */
const load = cache(async (path: string, page: number) => fetchBlog(path ? path.split('/') : [], page, PAGE_SIZE));

async function resolve({ params, searchParams }: BlogPathProps) {
    const segments = decodeSegments((await params).path);
    const page = Math.max(1, Math.floor(Number((await searchParams).page) || 1));
    return { segments, page, data: await load(segments.join('/'), page) };
}

function crumbsFor(data: Exclude<BlogResolution, { type: 'root' }>): Crumb[] {
    return [
        { name: 'هوشتون استودیو', href: '/' },
        { name: 'بلاگ', href: BLOG_BASE_PATH },
        ...data.breadcrumbs.map((crumb) => ({ name: crumb.name, href: blogHref(crumb.path) })),
        ...(data.type === 'post' ? [{ name: data.post.title, href: blogHref(data.post.path) }] : []),
    ];
}

export async function generateMetadata(props: BlogPathProps): Promise<Metadata> {
    const { data, page } = await resolve(props);
    const site = getSiteUrl();
    if (!data || data.type === 'root') return { title: 'یافت نشد', robots: { index: false, follow: false } };

    if (data.type === 'category') {
        const { category } = data;
        const url = `${site}${blogHref(category.path)}${page > 1 ? `?page=${page}` : ''}`;
        const title = category.metaTitle || `${category.name} | بلاگ`;
        const description = category.metaDescription || category.description || htmlToText(category.content)
            || `مقاله‌های «${category.name}» در بلاگ هوشتون استودیو.`;
        const image = absoluteMediaUrl(category.image);
        return {
            title: page > 1 ? `${title} — صفحه ${page}` : title,
            description,
            alternates: { canonical: url },
            robots: category.noindex ? { index: false, follow: true } : undefined,
            openGraph: { title, description, url, type: 'website', locale: 'fa_IR', siteName: 'Hosheton Studio', images: image ? [image] : undefined },
        };
    }

    const { post } = data;
    const url = `${site}${blogHref(post.path)}`;
    const title = post.seo?.metaTitle || post.title;
    const description = post.seo?.metaDescription || htmlToText(post.excerpt) || htmlToText(post.content);
    const image = contentImageUrl(post.image) || contentImageUrl(post.thumbnail);
    return {
        title,
        description,
        keywords: post.seo?.keywords?.length ? post.seo.keywords : undefined,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: 'article',
            locale: 'fa_IR',
            siteName: 'Hosheton Studio',
            publishedTime: post.createdAt,
            modifiedTime: post.updatedAt,
            images: image ? [image] : undefined,
        },
        twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
    };
}

export default async function BlogPathPage(props: BlogPathProps) {
    const { data } = await resolve(props);
    if (!data || data.type === 'root') notFound();
    const crumbs = crumbsFor(data);
    const site = getSiteUrl();

    if (data.type === 'category') {
        const { category } = data;
        const cards = data.posts.map(blogCard);
        const first = data.page === 1;
        return (
            <main>
                <JsonLd
                    data={[
                        {
                            '@context': 'https://schema.org',
                            '@type': 'CollectionPage',
                            name: category.metaTitle || category.name,
                            description: category.metaDescription || category.description || undefined,
                            url: `${site}${blogHref(category.path)}`,
                            inLanguage: 'fa-IR',
                        },
                        breadcrumbJsonLd(crumbs),
                    ]}
                />
                <Breadcrumbs crumbs={crumbs} />
                <PageIntro title={category.name} description={category.description} />
                {category.content ? (
                    // eslint-disable-next-line react/no-danger
                    <div className={`${styles.prose} ${styles.categoryContent}`} dangerouslySetInnerHTML={{ __html: category.content }} />
                ) : null}
                <CategoryLinks categories={data.children} label={`زیردسته‌های ${category.name}`} />
                {cards.length ? (
                    <>
                        {first ? <FeaturedSection cards={cards.slice(0, FEATURED_COUNT)} recentTitle="تازه‌ها" /> : null}
                        <CardGrid cards={first ? cards.slice(FEATURED_COUNT) : cards} />
                        <div className={styles.pager}>
                            <ContentPagination page={data.page} limit={data.limit} total={data.totalItems} />
                        </div>
                    </>
                ) : (
                    <EmptyState>هنوز مقاله‌ای در این دسته منتشر نشده است.</EmptyState>
                )}
            </main>
        );
    }

    const { post, related } = data;
    const image = contentImageUrl(post.image);
    const url = `${site}${blogHref(post.path)}`;
    const minutes = readingMinutes(post.content);

    return (
        <main>
            <JsonLd
                data={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        headline: post.title,
                        description: post.seo?.metaDescription || htmlToText(post.excerpt) || htmlToText(post.content),
                        url,
                        mainEntityOfPage: url,
                        inLanguage: 'fa-IR',
                        image: image ? [image] : undefined,
                        datePublished: post.createdAt,
                        dateModified: post.updatedAt || post.createdAt,
                        author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: 'Hosheton' },
                        publisher: { '@type': 'Organization', name: 'Hosheton Studio', url: site },
                        articleSection: data.category.name,
                        keywords: post.seo?.keywords?.length ? post.seo.keywords.join('، ') : undefined,
                    },
                    breadcrumbJsonLd(crumbs),
                ]}
            />
            <div className={styles.articleWrap}>
                <Breadcrumbs crumbs={crumbs} />
                <article className={styles.article}>
                    <header className={styles.articleHead}>
                        <h1 className={styles.articleTitle}>{post.title}</h1>
                        <div className={styles.articleMeta}>
                            <Link href={blogHref(data.category.path)}>{data.category.name}</Link>
                            {post.author ? <span>{post.author}</span> : null}
                            {post.createdAt ? <time dateTime={post.createdAt}>{formatFaDate(post.createdAt)}</time> : null}
                            <span>{`${minutes.toLocaleString('fa-IR')} دقیقه مطالعه`}</span>
                        </div>
                    </header>
                    {image ? <img className={styles.cover} src={image} alt={post.title} fetchPriority="high" /> : null}
                    {/* متن مقاله HTML ویرایشگر پنل naslyar است */}
                    {/* eslint-disable-next-line react/no-danger */}
                    <div className={styles.prose} dangerouslySetInnerHTML={{ __html: post.content || '' }} />
                </article>
            </div>
            {related.length ? (
                <div className={styles.related}>
                    <CardGrid cards={related.map(blogCard)} title="مقاله‌های مرتبط" />
                </div>
            ) : null}
        </main>
    );
}
