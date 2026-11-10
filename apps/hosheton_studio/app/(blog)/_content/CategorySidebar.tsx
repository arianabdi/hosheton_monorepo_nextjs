import Link from 'next/link';
import { BLOG_CATEGORIES_PATH, blogHref, type ContentCategory } from '@/app/(marketplace)/lib/content-api';
import styles from './content.module.scss';

/** حداکثر دسته‌های سایدبار؛ بیشتر از این → لینک صفحهٔ «همهٔ دسته‌بندی‌ها» */
const VISIBLE_COUNT = 15;

/** سایدبار کنار «مقاله‌های بیشتر» — فهرست دسته‌های سطح ۱ بلاگ با خط جداکننده */
export function CategorySidebar({ categories, title }: { categories: ContentCategory[]; title: string }) {
    if (!categories.length) return null;
    const hasMore = categories.length > VISIBLE_COUNT;

    return (
        <aside className={styles.categorySidebar} aria-label={title}>
            <div className={styles.categorySidebarHead}>
                <h2>{title}</h2>
                {hasMore ? (
                    <Link href={BLOG_CATEGORIES_PATH}>{`نمایش همه (${categories.length.toLocaleString('fa-IR')})`}</Link>
                ) : null}
            </div>
            <ul>
                {categories.slice(0, VISIBLE_COUNT).map((category) => (
                    <li key={category._id}>
                        <Link href={blogHref(category.path)}>{category.name}</Link>
                    </li>
                ))}
            </ul>
            {hasMore ? (
                <Link href={BLOG_CATEGORIES_PATH} className={styles.categorySidebarMore}>
                    {`نمایش بیشتر — ${(categories.length - VISIBLE_COUNT).toLocaleString('fa-IR')} دستهٔ دیگر`}
                </Link>
            ) : null}
        </aside>
    );
}
