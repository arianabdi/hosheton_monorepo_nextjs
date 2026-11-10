import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import {
    LEGAL_KEYS,
    fetchLegalPost,
    formatFaDate,
    htmlToText,
    legalHref,
    type ContentCategory,
    type LegalKey,
} from '@/app/(marketplace)/lib/content-api';
import { getSiteUrl } from '@/app/(marketplace)/lib/seo';
import { Breadcrumbs, CategoryLinks, JsonLd, breadcrumbJsonLd, type Crumb } from '../../_content/ContentParts';
import styles from '../../_content/content.module.scss';

/**
 * صفحه‌های حقوقی (قوانین، حریم خصوصی) — به سبک مقالهٔ بلاگ، بدون سایدبار و مقاله‌های مرتبط.
 * فقط پست‌های قفل‌شدهٔ بلاگ را باز می‌کند (`systemKey`)؛ محتوا از naslyar > محتوا > بلاگ.
 */
type LegalPageProps = { params: Promise<{ key: string }> };

const load = cache(async (key: LegalKey) => fetchLegalPost(key));

function legalKey(value: string): LegalKey | null {
    return (LEGAL_KEYS as readonly string[]).includes(value) ? (value as LegalKey) : null;
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
    const key = legalKey((await params).key);
    const data = key ? await load(key) : null;
    if (!key || !data) return { title: 'یافت نشد', robots: { index: false, follow: false } };
    const { post } = data;
    const url = `${getSiteUrl()}${legalHref(key)}`;
    const title = post.seo?.metaTitle || post.title;
    const description = post.seo?.metaDescription || htmlToText(post.content);
    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: { title, description, url, type: 'article', locale: 'fa_IR', siteName: 'Hosheton Studio', modifiedTime: post.updatedAt },
    };
}

export default async function LegalPage({ params }: LegalPageProps) {
    const key = legalKey((await params).key);
    const data = key ? await load(key) : null;
    if (!key || !data) notFound();

    const { post, pages } = data;
    const url = `${getSiteUrl()}${legalHref(key)}`;
    const updatedAt = post.updatedAt || post.createdAt;
    const crumbs: Crumb[] = [
        { name: 'هوشتون استودیو', href: '/' },
        { name: post.title, href: legalHref(key) },
    ];
    // جابه‌جایی بین صفحه‌های حقوقی با همان چیپ‌های دسته‌های بلاگ
    const tabs: ContentCategory[] = pages.map((page) => ({
        _id: page.systemKey,
        name: page.title,
        slug: page.systemKey,
        description: '',
    }));

    return (
        <main>
            <JsonLd
                data={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'WebPage',
                        name: post.title,
                        description: post.seo?.metaDescription || htmlToText(post.content),
                        url,
                        inLanguage: 'fa-IR',
                        dateModified: updatedAt,
                        publisher: { '@type': 'Organization', name: 'Hosheton Studio', url: getSiteUrl() },
                    },
                    breadcrumbJsonLd(crumbs),
                ]}
            />
            <div className={styles.articleWrap}>
                <Breadcrumbs crumbs={crumbs} />
                {tabs.length > 1 ? (
                    <CategoryLinks
                        categories={tabs}
                        label="قوانین و سیاست‌ها"
                        hrefOf={(tab) => legalHref(tab._id as LegalKey)}
                        activeId={key}
                    />
                ) : null}
                <article className={styles.article}>
                    <header className={styles.articleHead}>
                        <h1 className={styles.articleTitle}>{post.title}</h1>
                        {updatedAt ? (
                            <div className={styles.articleMeta}>
                                <time dateTime={updatedAt}>{`آخرین به‌روزرسانی: ${formatFaDate(updatedAt)}`}</time>
                            </div>
                        ) : null}
                    </header>
                    {/* متن HTML ویرایشگر پنل naslyar است */}
                    {/* eslint-disable-next-line react/no-danger */}
                    <div className={styles.prose} dangerouslySetInnerHTML={{ __html: post.content || '' }} />
                </article>
            </div>
        </main>
    );
}
