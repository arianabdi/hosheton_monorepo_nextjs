import Link from 'next/link';
import { getSiteUrl } from '@/app/(marketplace)/lib/seo';
import {
    blogHref,
    contentImageUrl,
    docsHref,
    formatFaDate,
    htmlToText,
    type BlogPostCard,
    type ContentCategory,
    type DocsLatestPage,
    type DocsPageRef,
} from '@/app/(marketplace)/lib/content-api';
import styles from './content.module.scss';

/**
 * قطعه‌های مشترک صفحه‌های بلاگ و آموزش‌ها (سرور کامپوننت — HTML کامل برای خزنده‌ها).
 * چیدمان از الگوی blog2: پست ویژه + فهرست «تازه‌ها» با تصویر کوچک، و گرید برای بقیه.
 * متن رابط فارسی است چون خود محتوا (از naslyar) فارسی است؛ همان قرارداد lib/seo.ts.
 */

export type Crumb = { name: string; href?: string };

/** شکل یکسان کارت برای مقاله‌های بلاگ و صفحه‌های آموزش */
export type ContentCard = {
    id: string;
    href: string;
    title: string;
    category?: string;
    excerpt?: string;
    image?: string;
    date?: string | null;
};

export function blogCard(post: BlogPostCard): ContentCard {
    return {
        id: post._id,
        href: blogHref(post.path),
        title: post.title,
        category: post.categoryName,
        excerpt: htmlToText(post.excerpt, 180),
        image: contentImageUrl(post.image) || contentImageUrl(post.thumbnail),
        date: post.createdAt,
    };
}

export function docsCard(
    page: (DocsPageRef | DocsLatestPage) & { content?: string; createdAt?: string | null },
    category: { slug: string; name?: string },
): ContentCard {
    return {
        id: page._id,
        href: docsHref(category.slug, page.slug),
        title: page.title,
        category: category.name,
        excerpt: page.metaDescription || htmlToText(page.content, 180),
        image: contentImageUrl(page.image),
        date: page.createdAt || page.updatedAt,
    };
}

/** زمان تقریبی مطالعه از متن HTML (۲۰۰ کلمه در دقیقه) */
export function readingMinutes(html?: string | null): number {
    const words = htmlToText(html, 1_000_000).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

export function JsonLd({ data }: { data: unknown }) {
    return (
        <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
    const site = getSiteUrl();
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            ...(crumb.href ? { item: `${site}${crumb.href}` } : {}),
        })),
    };
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
    return (
        <nav aria-label="مسیر صفحه" className={styles.breadcrumb}>
            <ol>
                {crumbs.map((crumb, index) => (
                    <li key={`${crumb.name}-${index}`}>
                        {crumb.href && index < crumbs.length - 1 ? (
                            <Link href={crumb.href}>{crumb.name}</Link>
                        ) : (
                            <span aria-current={index === crumbs.length - 1 ? 'page' : undefined}>{crumb.name}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export function PageIntro({ title, description }: { title: string; description?: string | null }) {
    return (
        <header className={styles.intro}>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
        </header>
    );
}

export function CategoryLinks({
    categories,
    label,
    hrefOf = (category) => blogHref(category.path),
    activeId,
}: {
    categories: ContentCategory[];
    label: string;
    hrefOf?: (category: ContentCategory) => string;
    activeId?: string;
}) {
    if (!categories.length) return null;
    return (
        <nav aria-label={label} className={styles.categoryLinks}>
            {categories.map((category) => (
                <Link
                    key={category._id}
                    href={hrefOf(category)}
                    className={category._id === activeId ? styles.categoryActive : undefined}
                >
                    {category.name}
                </Link>
            ))}
        </nav>
    );
}

function Media({ card, className, priority }: { card: ContentCard; className: string; priority?: boolean }) {
    return (
        <Link href={card.href} className={className} tabIndex={-1} aria-hidden>
            {card.image ? (
                <img src={card.image} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} />
            ) : (
                <span className={styles.mediaEmpty} />
            )}
        </Link>
    );
}

/** ستون اول: پست ویژه (دسته، عنوان بزرگ، تصویر پهن) */
export function FeaturedPost({ card, headingLevel = 2 }: { card: ContentCard; headingLevel?: 1 | 2 }) {
    const Heading = headingLevel === 1 ? 'h1' : 'h2';
    return (
        <article className={styles.featured}>
            {card.category ? <span className={styles.kicker}>{card.category}</span> : null}
            <Heading className={styles.featuredTitle}>
                <Link href={card.href}>{card.title}</Link>
            </Heading>
            {card.excerpt ? <p className={styles.featuredExcerpt}>{card.excerpt}</p> : null}
            <Media card={card} className={styles.featuredMedia} priority />
        </article>
    );
}

/** ستون دوم: فهرست «تازه‌ها» — متن کنار تصویر کوچک، جداکننده با خط */
export function RecentList({ title, cards }: { title: string; cards: ContentCard[] }) {
    if (!cards.length) return null;
    return (
        <section className={styles.recent} aria-label={title}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <ul className={styles.recentList}>
                {cards.map((card) => (
                    <li key={card.id} className={styles.recentItem}>
                        <div className={styles.recentInfo}>
                            {card.category ? <span className={styles.kickerSmall}>{card.category}</span> : null}
                            <h3 className={styles.recentTitle}>
                                <Link href={card.href}>{card.title}</Link>
                            </h3>
                            {card.excerpt ? <p className={styles.snippet}>{card.excerpt}</p> : null}
                        </div>
                        <Media card={card} className={styles.recentThumb} />
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** پست ویژه + تازه‌ها کنار هم (بالای صفحهٔ بلاگ و آموزش‌ها) */
export function FeaturedSection({ cards, recentTitle }: { cards: ContentCard[]; recentTitle: string }) {
    if (!cards.length) return null;
    const [featured, ...rest] = cards;
    return (
        <div className={`${styles.featuredGrid} ${rest.length ? '' : styles.featuredGridSingle}`}>
            <FeaturedPost card={featured} />
            <RecentList title={recentTitle} cards={rest} />
        </div>
    );
}

/** بقیهٔ مطالب — گرید سه‌ستونه با همان تایپوگرافی */
export function CardGrid({ cards, title }: { cards: ContentCard[]; title?: string }) {
    if (!cards.length) return null;
    return (
        <section className={styles.gridSection} aria-label={title}>
            {title ? <h2 className={styles.sectionTitle}>{title}</h2> : null}
            <ul className={styles.cardGrid}>
                {cards.map((card) => (
                    <li key={card.id} className={styles.card}>
                        <Media card={card} className={styles.cardMedia} />
                        {card.category ? <span className={styles.kickerSmall}>{card.category}</span> : null}
                        <h3 className={styles.cardTitle}>
                            <Link href={card.href}>{card.title}</Link>
                        </h3>
                        {card.excerpt ? <p className={styles.snippet}>{card.excerpt}</p> : null}
                        {card.date ? <time className={styles.date} dateTime={card.date}>{formatFaDate(card.date)}</time> : null}
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
    return <p className={styles.empty}>{children}</p>;
}
