import type { Metadata } from 'next';
import { docsHref, DOCS_BASE_PATH, fetchDocsLanding } from '@/app/(marketplace)/lib/content-api';
import { getSiteUrl } from '@/app/(marketplace)/lib/seo';
import { EmptyState, JsonLd, breadcrumbJsonLd } from '../_content/ContentParts';
import { DocsLinkGrid, DocsTopicGrid, DocsWelcome, DocsWelcomeLogo, topicIcon } from '../_content/DocsCards';
import styles from '../_content/content.module.scss';

const TITLE = 'مستندات';
const DESCRIPTION = 'راهنمای قدم‌به‌قدم کار با هوشتون استودیو: چت هوش مصنوعی، ساخت تصویر و ویدیو، قالب‌ها، پروژه‌ها و کیف پول.';
/** کارت‌لینک‌های «همین حالا شروع کنید» — آموزش‌های پرخواننده، وگرنه تازه‌ترین‌ها */
const QUICK_COUNT = 8;

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${getSiteUrl()}${DOCS_BASE_PATH}` },
    openGraph: { title: TITLE, description: DESCRIPTION, url: `${getSiteUrl()}${DOCS_BASE_PATH}`, type: 'website', locale: 'fa_IR', siteName: 'Hosheton Studio' },
};

/** صفحهٔ اصلی آموزش‌ها — الگوی docs.liara.ir: بنر خوش‌آمد، شروع سریع، کارت موضوع‌ها */
export default async function DocsHomePage() {
    const data = await fetchDocsLanding();
    const crumbs = [{ name: 'هوشتون استودیو', href: '/' }, { name: 'مستندات', href: DOCS_BASE_PATH }];
    const categories = (data?.categories || []).filter((category) => category.pageCount > 0);
    const popular = data?.popularPages || [];
    const quick = (popular.length ? popular : data?.latestPages || []).slice(0, QUICK_COUNT).map((page) => ({
        href: docsHref(page.categorySlug, page.slug),
        title: page.title,
        icon: topicIcon(page.categorySlug),
    }));

    return (
        <main className={styles.docsHome}>
            <JsonLd data={breadcrumbJsonLd(crumbs)} />
            <DocsWelcome title={<>به مستندات <DocsWelcomeLogo /> خوش آمدید</>} description={DESCRIPTION} />

            {quick.length ? (
                <section aria-labelledby="docs-quick">
                    <h2 id="docs-quick" className={styles.docsHeading}>همین حالا شروع کنید</h2>
                    <DocsLinkGrid items={quick} />
                </section>
            ) : null}

            {categories.length ? (
                <section aria-labelledby="docs-topics">
                    <h2 id="docs-topics" className={styles.docsHeading}>موضوع‌های مستندات</h2>
                    <DocsTopicGrid
                        topics={categories.map((category) => ({
                            href: docsHref(category.slug),
                            name: category.name,
                            description: category.description,
                            icon: topicIcon(category.slug),
                            count: category.pageCount,
                        }))}
                    />
                </section>
            ) : (
                <EmptyState>هنوز بخشی در مستندات منتشر نشده است.</EmptyState>
            )}
        </main>
    );
}
