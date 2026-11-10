import Link from 'next/link';
import { docsHref, type DocsTreeNode } from '@/app/(marketplace)/lib/content-api';
import styles from './content.module.scss';

/**
 * درخت بخش‌های یک موضوع (صفحه‌های تودرتو از پنل naslyar) — ستون کناری به‌شکل تایم‌لاین شماره‌دار:
 * بخش‌های سطح ۱ روی یک خط عمودی با شماره (بخش‌های قبل از صفحهٔ فعلی «انجام‌شده» رنگ می‌گیرند)،
 * زیربخش‌ها با تورفتگی، خط شاخه و نقطه زیر بخش والد.
 */
export function DocsNav({
    categorySlug,
    categoryName,
    tree,
    activeSlug,
}: {
    categorySlug: string;
    categoryName: string;
    tree: DocsTreeNode[];
    activeSlug?: string;
}) {
    const containsActive = (node: DocsTreeNode): boolean =>
        node.slug === activeSlug || (node.children || []).some(containsActive);
    const activeIndex = activeSlug ? tree.findIndex(containsActive) : -1;

    const renderChildren = (nodes: DocsTreeNode[]) => (
        <ul className={styles.timelineChildren}>
            {nodes.map((node) => {
                const active = node.slug === activeSlug;
                return (
                    <li key={node._id}>
                        <Link
                            href={docsHref(categorySlug, node.slug)}
                            className={active ? styles.timelineChildActive : undefined}
                            aria-current={active ? 'page' : undefined}
                        >
                            {node.title}
                        </Link>
                        {node.children?.length ? renderChildren(node.children) : null}
                    </li>
                );
            })}
        </ul>
    );

    const timeline = (
        <ol className={styles.timeline}>
            {tree.map((node, index) => {
                const active = node.slug === activeSlug;
                const state = index === activeIndex ? styles.timelineCurrent : index < activeIndex ? styles.timelineDone : '';
                return (
                    <li key={node._id} className={`${styles.timelineItem} ${state}`}>
                        <Link
                            href={docsHref(categorySlug, node.slug)}
                            className={`${styles.timelineLink} ${active ? styles.timelineLinkActive : ''}`}
                            aria-current={active ? 'page' : undefined}
                        >
                            <span className={styles.timelineNum}>{(index + 1).toLocaleString('fa-IR')}</span>
                            <span>{node.title}</span>
                        </Link>
                        {node.children?.length ? renderChildren(node.children) : null}
                    </li>
                );
            })}
        </ol>
    );

    return (
        <>
            <nav aria-label={`بخش‌های ${categoryName}`} className={styles.docsNav}>
                <Link href={docsHref(categorySlug)} className={styles.navTitle}>{categoryName}</Link>
                {timeline}
            </nav>
            {/* موبایل: همان تایم‌لاین به‌صورت بازشو بالای متن */}
            <details className={styles.docsNavMobile}>
                <summary>{`مستندات ${categoryName}`}</summary>
                {timeline}
            </details>
        </>
    );
}

/** ترتیب خطی درخت (والد، بعد فرزندان) — برای «صفحهٔ قبل / بعد» */
export function flattenDocsTree(nodes: DocsTreeNode[]): DocsTreeNode[] {
    return nodes.flatMap((node) => [node, ...flattenDocsTree(node.children || [])]);
}
