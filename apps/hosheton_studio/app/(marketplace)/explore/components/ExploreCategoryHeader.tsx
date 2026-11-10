'use client';

import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuChevronDown } from 'react-icons/lu';
import {
    categoryHref,
    categoryTrailFor,
    childCategoriesOf,
    type TemplateCategoryNode,
} from '@/app/(marketplace)/lib/explore-taxonomy';
import { useCategoryName } from '@/app/(marketplace)/lib/useCategoryName';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './ExploreCategoryHeader.module.scss';

/** سایهٔ لبه‌های ردیف اسکرولی — فقط سمتی (چپ/راست فیزیکی) که هنوز محتوای پنهان دارد */
function useEdgeFade() {
    const ref = useRef<HTMLElement>(null);
    const [fade, setFade] = useState({ left: false, right: false });
    const update = useCallback(() => {
        const el = ref.current;
        if (!el || !el.children.length) return;
        const box = el.getBoundingClientRect();
        let minLeft = Infinity;
        let maxRight = -Infinity;
        for (const child of Array.from(el.children)) {
            const r = child.getBoundingClientRect();
            minLeft = Math.min(minLeft, r.left);
            maxRight = Math.max(maxRight, r.right);
        }
        const left = minLeft < box.left - 2;
        const right = maxRight > box.right + 2;
        setFade((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    }, []);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        el.addEventListener('scroll', update, { passive: true });
        return () => {
            observer.disconnect();
            el.removeEventListener('scroll', update);
        };
    });
    return { ref, fade };
}

type Props = {
    nodes: TemplateCategoryNode[];
    node: TemplateCategoryNode;
    /** تعداد قالب‌های دسته (با زیرشاخه‌ها) — null تا وقتی بار نشده */
    total?: number | null;
    /** H1 فقط روی خود صفحهٔ دسته؛ زیر آدرس قالب، H1 مال قالب است */
    headingLevel?: 'h1' | 'h2';
    /** نوار کارت‌های زیردسته/قالب — تمام‌عرض زیر متن */
    strip?: ReactNode;
};

/**
 * سرصفحهٔ دستهٔ فعال اکسپلور — زیر نوار جستجو و چیپ‌ها، بالای گرید. ساده و بدون کارت (خط جداکننده):
 * breadcrumb کوچک، عنوان + تعداد قالب، توضیح دوخطی، «بیشتر بخوانید» که متن معرفی را باز می‌کند،
 * و زیرتگ‌ها به‌صورت لینک‌های قرصی.
 */
export function ExploreCategoryHeader({ nodes, node, total = null, headingLevel = 'h1', strip }: Props) {
    const Heading = headingLevel;
    const { t, i18n } = useTranslation('marketplace');
    const childFade = useEdgeFade();
    const nameOf = useCategoryName();
    const contentId = useId();
    const [expanded, setExpanded] = useState(false);
    const trail = categoryTrailFor(nodes, node.path);
    const children = childCategoriesOf(nodes, node._id);
    const intro = node.description || node.metaDescription;
    const expandable = Boolean(node.content);

    return (
        <header className={styles.header}>
            <div className={styles.body}>
            <nav aria-label={t('breadcrumb')} className={styles.breadcrumb}>
                <ol>
                    <li>
                        <Link href="/explore" scroll={false}>{t('explore_root')}</Link>
                    </li>
                    {trail.map((crumb) => (
                        <li key={crumb._id}>
                            {crumb._id === node._id ? (
                                <span aria-current="page">{nameOf(crumb)}</span>
                            ) : (
                                <Link href={categoryHref(crumb)} scroll={false}>{nameOf(crumb)}</Link>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>

            <div className={styles.titleRow}>
                <Heading className={styles.title}>{nameOf(node)}</Heading>
                {total ? (
                    <span className={styles.count}>
                        {t('category_templates_count', { count: total, value: formatAppNumber(total, i18n.language) })}
                    </span>
                ) : null}
            </div>

            {intro || expandable ? (
                <div className={styles.about}>
                    {intro ? <p className={`${styles.intro} ${expanded ? styles.introOpen : ''}`}>{intro}</p> : null}
                    {expandable ? (
                        <>
                            {/* متن معرفی از پنل ادمین (naslyar) — همیشه در DOM، فقط بسته/باز */}
                            <div id={contentId} className={`${styles.content} ${expanded ? styles.contentOpen : ''}`}>
                                <div className={styles.contentInner} dangerouslySetInnerHTML={{ __html: node.content }} />
                            </div>
                            <button
                                type="button"
                                className={styles.more}
                                aria-expanded={expanded}
                                aria-controls={contentId}
                                onClick={() => setExpanded((value) => !value)}
                            >
                                {expanded ? t('category_less') : t('category_more')}
                                <LuChevronDown size={14} aria-hidden className={expanded ? styles.chevronOpen : undefined} />
                            </button>
                        </>
                    ) : null}
                </div>
            ) : null}

            {children.length ? (
                <div
                    className={`${styles.childrenScroller} ${childFade.fade.left ? styles.fadeLeft : ''} ${childFade.fade.right ? styles.fadeRight : ''}`}
                >
                    <nav
                        ref={childFade.ref}
                        className={styles.children}
                        aria-label={t('subcategories')}
                    >
                        {children.map((child) => (
                            <Link key={child._id} href={categoryHref(child)} scroll={false}>{nameOf(child)}</Link>
                        ))}
                    </nav>
                </div>
            ) : null}
            </div>
            {strip}
        </header>
    );
}
