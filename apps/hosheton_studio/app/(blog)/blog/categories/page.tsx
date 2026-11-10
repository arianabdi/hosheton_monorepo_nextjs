import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';
import {
    BLOG_BASE_PATH,
    BLOG_CATEGORIES_PATH,
    blogHref,
    fetchBlog,
    fetchCategoryTree,
    type ContentCategory,
} from '@/app/(marketplace)/lib/content-api';
import { getSiteUrl } from '@/app/(marketplace)/lib/seo';
import { Breadcrumbs, EmptyState, JsonLd, breadcrumbJsonLd } from '../../_content/ContentParts';
import { ContentPagination } from '../../_content/ContentPagination';
import styles from '../../_content/content.module.scss';

/** گرید سه‌ستونه → ۴ ردیف کامل در هر صفحه */
const PAGE_SIZE = 12;
/** sectionهای دستهٔ بلاگ در core (BLOG_CATEGORY_SECTIONS) */
const BLOG_SECTIONS = ['post', 'blog'];
const TITLE = 'دسته‌بندی‌های بلاگ';
const DESCRIPTION = 'همهٔ موضوع‌های بلاگ هوشتون در یک‌جا: از تولید تصویر و ویدیو تا ایجنت‌ها و اتوماسیون؛ دسته‌ای را انتخاب کنید و مقاله‌هایش را بخوانید.';

type BlogCategoriesProps = { searchParams: Promise<{ page?: string }> };

function pageNumber(raw?: string) {
    return Math.max(1, Math.floor(Number(raw) || 1));
}

export async function generateMetadata({ searchParams }: BlogCategoriesProps): Promise<Metadata> {
    const page = pageNumber((await searchParams).page);
    const url = `${getSiteUrl()}${BLOG_CATEGORIES_PATH}${page > 1 ? `?page=${page}` : ''}`;
    return {
        title: page > 1 ? `${TITLE} — صفحه ${page}` : TITLE,
        description: DESCRIPTION,
        alternates: { canonical: url },
        openGraph: { title: TITLE, description: DESCRIPTION, url, siteName: 'Hosheton Studio', type: 'website', locale: 'fa_IR' },
    };
}

/**
 * همهٔ دسته‌های بلاگ با صفحه‌بندی (?page=) — مقصد «نمایش بیشتر» سایدبار بلاگ.
 * هر کارت: دستهٔ سطح ۱، توضیح، زیردسته‌ها (لینک واقعی برای خزنده) و «مشاهدهٔ مقاله‌ها».
 */
export default async function BlogCategoriesPage({ searchParams }: BlogCategoriesProps) {
    const [root, ...trees] = await Promise.all([fetchBlog([], 1, 1), ...BLOG_SECTIONS.map(fetchCategoryTree)]);
    // ترتیب و فهرست سطح ۱ همان ریشهٔ بلاگ؛ زیردسته‌ها از درخت هر دو section
    const topLevel = root?.type === 'root' ? root.categories : [];
    const all = trees.flatMap((tree) => tree?.categories || []);
    const childrenOf = (id: string) => all.filter((category) => category.parentId === id);

    const lastPage = Math.max(1, Math.ceil(topLevel.length / PAGE_SIZE));
    const page = Math.min(pageNumber((await searchParams).page), lastPage);
    const visible = topLevel.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const crumbs = [
        { name: 'هوشتون استودیو', href: '/' },
        { name: 'بلاگ', href: BLOG_BASE_PATH },
        { name: 'دسته‌بندی‌ها', href: BLOG_CATEGORIES_PATH },
    ];

    return (
        <main>
            <JsonLd
                data={[
                    {
                        '@context': 'https://schema.org',
                        '@type': 'CollectionPage',
                        name: TITLE,
                        url: `${getSiteUrl()}${BLOG_CATEGORIES_PATH}`,
                        inLanguage: 'fa-IR',
                        hasPart: visible.map((category) => ({
                            '@type': 'CollectionPage',
                            name: category.name,
                            url: `${getSiteUrl()}${blogHref(category.path)}`,
                        })),
                    },
                    breadcrumbJsonLd(crumbs),
                ]}
            />
            <Breadcrumbs crumbs={crumbs} />
            <header className={styles.intro}>
                <h1>{TITLE}</h1>
                <p>{DESCRIPTION}</p>
            </header>
            {visible.length ? (
                <>
                    <p className={styles.categoryCount}>
                        {`${topLevel.length.toLocaleString('fa-IR')} دسته · صفحهٔ ${page.toLocaleString('fa-IR')} از ${lastPage.toLocaleString('fa-IR')}`}
                    </p>
                    <ul className={styles.categoryCards}>
                        {visible.map((category) => (
                            <CategoryCard key={category._id} category={category} subcategories={childrenOf(category._id)} />
                        ))}
                    </ul>
                    <div className={styles.pager}>
                        <ContentPagination page={page} limit={PAGE_SIZE} total={topLevel.length} />
                    </div>
                </>
            ) : (
                <EmptyState>هنوز دسته‌ای برای بلاگ ساخته نشده است.</EmptyState>
            )}
        </main>
    );
}

function CategoryCard({ category, subcategories }: { category: ContentCategory; subcategories: ContentCategory[] }) {
    const href = blogHref(category.path);
    return (
        <li className={styles.categoryCard}>
            <div className={styles.categoryCardHead}>
                {/* نشان دسته: حرف اول نام در مربع گوشه‌گرد (دستهٔ core آیکون ندارد) */}
                <span className={styles.categoryInitial} aria-hidden>{Array.from(category.name)[0]}</span>
                <h2><Link href={href}>{category.name}</Link></h2>
            </div>
            {category.description ? <p>{category.description}</p> : null}
            {subcategories.length ? (
                <ul className={styles.categorySubs} aria-label={`زیردسته‌های ${category.name}`}>
                    {subcategories.map((sub) => (
                        <li key={sub._id}><Link href={blogHref(sub.path)}>{sub.name}</Link></li>
                    ))}
                </ul>
            ) : null}
            <Link href={href} className={styles.categoryCardMore}>
                مشاهدهٔ مقاله‌ها
                <LuArrowLeft size={14} aria-hidden />
            </Link>
        </li>
    );
}
