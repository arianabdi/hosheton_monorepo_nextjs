import type { ReactNode } from 'react';
import Link from 'next/link';
import { docsHref, type DocsTreeNode } from '@/app/(marketplace)/lib/content-api';
import { flattenDocsTree } from './DocsNav';
import { ThemedLogo } from './ThemedLogo';
import styles from './content.module.scss';

/**
 * کارت‌های صفحهٔ اصلی و موضوع‌های آموزش — الگوی docs.liara.ir:
 * بنر خوش‌آمد، کارت‌لینک کوچک (آیکون + عنوان + فلش) و کارت موضوع (آیکون، عنوان، توضیح، «بیشتر بدانید»).
 * آیکون‌ها SVG درون‌خطی‌اند تا سرور کامپوننت بماند.
 */

const PATHS: Record<string, string> = {
    chat: 'M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
    studio: 'M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z',
    image: 'M4 5h16v14H4zM8 10a1.5 1.5 0 1 0 0-.01M4 17l5-5 4 4 2-2 5 5',
    video: 'M4 6h16v12H4zM10 9l5 3-5 3z',
    wallet: 'M4 7h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4zM4 7l12-3v3M16 13h2',
    book: 'M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM17 20h2V6',
    doc: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
    spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
    arrow: 'M19 12H5M11 6l-6 6 6 6',
};

export function DocIcon({ name, size = 18 }: { name: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={PATHS[name] || PATHS.doc} />
        </svg>
    );
}

/** آیکون موضوع از slug (دستهٔ core فیلد آیکون ندارد) */
export function topicIcon(slug: string): string {
    if (/chat|چت/.test(slug)) return 'chat';
    if (/studio|project|استودیو/.test(slug)) return 'studio';
    if (/video/.test(slug)) return 'video';
    if (/image/.test(slug)) return 'image';
    if (/wallet|billing|pay/.test(slug)) return 'wallet';
    return 'book';
}

/** لوگوی هوشتون داخل عنوان (جای کلمهٔ «هوشتون») */
export function DocsWelcomeLogo() {
    return (
        <span className={styles.welcomeLogo}>
            {/* متن H1 برای خزنده و صفحه‌خوان همان «هوشتون» بماند */}
            <span className={styles.srOnly}>هوشتون</span>
            <ThemedLogo alt="" priority />
        </span>
    );
}

export function DocsWelcome({ title, description }: { title: ReactNode; description: string }) {
    return (
        <section className={styles.docsWelcome}>
            <div className={styles.docsWelcomeText}>
                {/* مثل AuthFrame: کل جمله یکپارچه ظاهر می‌شود، بعد دست از پشت آخرین کلمه می‌آید و تکان می‌خورد */}
                <h1>
                    <span className={styles.welcomeTitleText}>{title}</span>
                    <span className={styles.welcomeWave} aria-hidden>👋</span>
                </h1>
                <p>{description}</p>
            </div>
            <div className={styles.docsWelcomeWindow} aria-hidden>
                <div className={styles.docsWelcomeBar}><i /><i /><i /></div>
                <span>hosheton.com/docs</span>
                <strong>Tutorials.</strong>
            </div>
        </section>
    );
}

export function DocsLinkGrid({
    items,
    wide,
}: {
    /** بدون icon کارت فقط عنوان + توضیح + فلش دارد (مثل «موضوع‌های دیگر») */
    items: Array<{ href: string; title: string; icon?: string; hint?: string; /** کارت اقدام (مثل «نمایش موضوعات دیگر») با رنگ برند */ accent?: boolean }>;
    /** دو ستون پهن (کارت‌های «از اینجا شروع کنید» صفحهٔ موضوع) */
    wide?: boolean;
}) {
    if (!items.length) return null;
    return (
        <ul className={`${styles.linkGrid} ${wide ? styles.linkGridWide : ''}`}>
            {items.map((item) => (
                <li key={item.href}>
                    <Link href={item.href} className={`${styles.linkCard} ${item.accent ? styles.linkCardAccent : ''}`}>
                        {item.icon ? <span className={styles.linkIcon}><DocIcon name={item.icon} /></span> : null}
                        <span className={styles.linkText}>
                            <span className={styles.linkTitle}>{item.title}</span>
                            {item.hint ? <span className={styles.linkHint}>{item.hint}</span> : null}
                        </span>
                        <span className={styles.linkArrow}><DocIcon name="arrow" size={16} /></span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

/**
 * فهرست بخش‌های یک موضوع (صفحهٔ موضوع) — ردیف‌های شماره‌دار با خط جداکننده:
 * شماره | عنوان + توضیح کوتاه | فلش، و زیربخش‌ها به‌صورت لینک‌های کوچک زیر همان ردیف.
 */
export function DocsSectionList({ categorySlug, tree }: { categorySlug: string; tree: DocsTreeNode[] }) {
    if (!tree.length) return null;
    return (
        <ol className={styles.sectionList}>
            {tree.map((node, index) => (
                <li key={node._id}>
                    <Link href={docsHref(categorySlug, node.slug)} className={styles.sectionRow}>
                        <span className={styles.sectionNumber}>{(index + 1).toLocaleString('fa-IR')}</span>
                        <span className={styles.sectionText}>
                            <span className={styles.sectionRowTitle}>{node.title}</span>
                            {node.metaDescription ? <span className={styles.sectionHint}>{node.metaDescription}</span> : null}
                        </span>
                        <span className={styles.linkArrow}><DocIcon name="arrow" size={16} /></span>
                    </Link>
                    {node.children?.length ? (
                        <ul className={styles.sectionChildren} aria-label={`زیربخش‌های ${node.title}`}>
                            {flattenDocsTree(node.children).map((child) => (
                                <li key={child._id}>
                                    <Link href={docsHref(categorySlug, child.slug)}>{child.title}</Link>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </li>
            ))}
        </ol>
    );
}

export function DocsTopicGrid({ topics }: { topics: Array<{ href: string; name: string; description?: string; icon: string; count?: number }> }) {
    if (!topics.length) return null;
    return (
        <ul className={styles.topicGrid}>
            {topics.map((topic) => (
                <li key={topic.href} className={styles.topicCard}>
                    <div className={styles.topicHead}>
                        <h3><Link href={topic.href}>{topic.name}</Link></h3>
                        <span className={styles.topicIcon}><DocIcon name={topic.icon} /></span>
                    </div>
                    {topic.description ? <p>{topic.description}</p> : null}
                    <div className={styles.topicFoot}>
                        {typeof topic.count === 'number' ? <span>{`${topic.count.toLocaleString('fa-IR')} بخش`}</span> : <span />}
                        <Link href={topic.href} className={styles.topicMore}>بیشتر بدانید</Link>
                    </div>
                </li>
            ))}
        </ul>
    );
}
