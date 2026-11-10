import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';
import {
    BLOG_BASE_PATH,
    DOCS_BASE_PATH,
    blogHref,
    docsHref,
    fetchBlog,
    fetchDocsLanding,
    legalHref,
} from '@/app/(marketplace)/lib/content-api';
import { ThemedLogo } from './ThemedLogo';
import styles from './content.module.scss';

/** چند دسته/موضوع اول در فوتر؛ بقیه با «همه …» */
const LINK_COUNT = 6;

type FooterLink = { href: string; label: string };

/**
 * فوتر بلاگ و مستندات (سرور کامپوننت — لینک واقعی برای خزنده):
 * معرفی برند | دسته‌های سطح ۱ بلاگ | موضوع‌های مستندات | استودیو | پشتیبانی و قوانین، و خط کپی‌رایت.
 * داده همان درخواست‌های کش‌شدهٔ صفحه‌هاست (revalidate 60).
 */
export async function ContentFooter() {
    const [blog, docs] = await Promise.all([fetchBlog([], 1, 1), fetchDocsLanding()]);
    const blogCategories = blog?.type === 'root' ? blog.categories : [];
    const docsTopics = docs?.categories || [];

    const columns: Array<{ title: string; links: FooterLink[] }> = [
        {
            title: 'بلاگ',
            links: [
                ...blogCategories.slice(0, LINK_COUNT).map((category) => ({ href: blogHref(category.path), label: category.name })),
                { href: BLOG_BASE_PATH, label: 'همهٔ مقاله‌ها' },
            ],
        },
        {
            title: 'مستندات',
            links: [
                ...docsTopics.slice(0, LINK_COUNT).map((topic) => ({ href: docsHref(topic.slug), label: topic.name })),
                { href: DOCS_BASE_PATH, label: 'همهٔ مستندات' },
            ],
        },
        {
            title: 'استودیو',
            links: [
                { href: '/starter', label: 'شروع به کار' },
                { href: '/chat', label: 'چت هوشتون' },
                { href: '/templates', label: 'قالب‌ها' },
                { href: '/ai-model-pricing', label: 'مدل‌ها و قیمت‌ها' },
                { href: '/pricing', label: 'پلن‌ها' },
            ],
        },
        {
            title: 'پشتیبانی و قوانین',
            links: [
                { href: '/support', label: 'تماس با پشتیبانی' },
                { href: legalHref('terms'), label: 'قوانین و مقررات' },
                { href: legalHref('privacy'), label: 'حریم خصوصی' },
            ],
        },
    ];

    return (
        <footer className={styles.footer}>
            <div className={styles.footerGrid}>
                <div className={styles.footerBrand}>
                    <Link href="/explore" className={styles.footerLogo} aria-label="هوشتون استودیو">
                        <ThemedLogo />
                    </Link>
                    <p>
                        استودیوی ساخت محتوا با هوش مصنوعی؛ ده‌ها مدل تصویر، ویدیو و صدا در یک جا.
                        در بلاگ تازه‌ترین خبرها و ترفندها را بخوانید و در مستندات کار با استودیو را قدم‌به‌قدم یاد بگیرید.
                    </p>
                    <Link href="/chat" className={styles.studioLink}>
                        ورود به استودیو
                        <LuArrowLeft size={15} aria-hidden />
                    </Link>
                </div>
                {columns.map((column) => (
                    <nav key={column.title} className={styles.footerColumn} aria-label={column.title}>
                        <h2>{column.title}</h2>
                        <ul>
                            {column.links.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href}>{link.label}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                ))}
            </div>
            <div className={styles.footerBottom}>
                <span>© ۱۴۰۵ هوشتون. تمامی حقوق محفوظ است.</span>
                <span>
                    <Link href={legalHref('terms')}>قوانین</Link>
                    <Link href={legalHref('privacy')}>حریم خصوصی</Link>
                </span>
            </div>
        </footer>
    );
}
