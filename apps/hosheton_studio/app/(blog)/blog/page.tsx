import type { Metadata } from 'next';
import { fetchBlog, BLOG_BASE_PATH } from '@/app/(marketplace)/lib/content-api';
import { getSiteUrl } from '@/app/(marketplace)/lib/seo';
import {
    CardGrid,
    CategoryLinks,
    EmptyState,
    FeaturedSection,
    JsonLd,
    blogCard,
    breadcrumbJsonLd,
} from '../_content/ContentParts';
import { CategorySidebar } from '../_content/CategorySidebar';
import { ContentPagination } from '../_content/ContentPagination';
import styles from '../_content/content.module.scss';

const PAGE_SIZE = 13;
/** صفحهٔ اول: ۱ ویژه + ۴ تازه، بقیه در گرید */
const FEATURED_COUNT = 5;
const TITLE = 'بلاگ';
const DESCRIPTION = 'تازه‌ترین خبرها و ترندهای هوش مصنوعی، و ترفندهای تولید تصویر و ویدیو در هوشتون استودیو.';

type BlogHomeProps = { searchParams: Promise<{ page?: string }> };

function pageNumber(raw?: string) {
    return Math.max(1, Math.floor(Number(raw) || 1));
}

export async function generateMetadata({ searchParams }: BlogHomeProps): Promise<Metadata> {
    const page = pageNumber((await searchParams).page);
    const url = `${getSiteUrl()}${BLOG_BASE_PATH}${page > 1 ? `?page=${page}` : ''}`;
    return {
        title: page > 1 ? `${TITLE} — صفحه ${page}` : TITLE,
        description: DESCRIPTION,
        alternates: { canonical: url },
        openGraph: { title: TITLE, description: DESCRIPTION, url, siteName: 'Hosheton Studio', type: 'website', locale: 'fa_IR' },
    };
}

export default async function BlogHomePage({ searchParams }: BlogHomeProps) {
    const page = pageNumber((await searchParams).page);
    const data = await fetchBlog([], page, PAGE_SIZE);
    const root = data?.type === 'root' ? data : null;
    const crumbs = [{ name: 'هوشتون استودیو', href: '/' }, { name: 'بلاگ', href: BLOG_BASE_PATH }];
    const cards = (root?.posts || []).map(blogCard);
    const top = page === 1 ? cards.slice(0, FEATURED_COUNT) : [];
    const rest = page === 1 ? cards.slice(FEATURED_COUNT) : cards;

    return (
        <main>
            <JsonLd data={breadcrumbJsonLd(crumbs)} />
            {/* H1 برای خزنده؛ از نظر بصری هدر و پست ویژه کار عنوان را می‌کنند */}
            <h1 className={styles.srOnly}>بلاگ هوشتون استودیو</h1>
            <CategoryLinks categories={root?.categories || []} label="دسته‌های بلاگ" />
            {cards.length ? (
                <>
                    <FeaturedSection cards={top} recentTitle="تازه‌ها" />
                    <div className={styles.gridWithSidebar}>
                        <div className={styles.gridMain}>
                            <CardGrid cards={rest} title={page === 1 ? 'مقاله‌های بیشتر' : undefined} />
                            <div className={styles.pager}>
                                <ContentPagination page={root!.page} limit={root!.limit} total={root!.totalItems} />
                            </div>
                        </div>
                        <CategorySidebar categories={root?.categories || []} title="دسته‌بندی‌ها" />
                    </div>
                </>
            ) : (
                <EmptyState>هنوز مقاله‌ای منتشر نشده است.</EmptyState>
            )}
        </main>
    );
}
