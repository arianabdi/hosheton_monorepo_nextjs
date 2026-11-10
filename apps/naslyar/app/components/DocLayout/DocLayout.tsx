'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Container, Wrapper } from '@/app/(main)/layout';
import styles from './DocLayout.module.scss';

export interface DocHeading {
    id: string;
    title: string;
}

export interface DocSection {
    id: string;
    title: string;
    /** زیرعنوان‌های همین بخش (h3) — در فهرست کنار صفحه زیر عنوان بخش می‌آیند */
    headings?: DocHeading[];
    body: ReactNode;
}

/**
 * چیدمان مستند مثل سایت‌های مستندات (NestJS و…): فهرست عناوین در ستون راست (sticky) و مقاله در وسط.
 * عنوان در حال مطالعه با scroll-spy پررنگ می‌شود؛ هر عنوان لینک مستقیم #id دارد.
 * در عرض کم فهرست بالای مقاله به‌صورت بازشونده می‌آید (همان سمت راست، بدون مودال).
 */
export default function DocLayout({ sections, children }: { sections: DocSection[]; children?: ReactNode }) {
    const anchors = useMemo(
        () => sections.flatMap((section) => [section.id, ...(section.headings || []).map((heading) => heading.id)]),
        [sections],
    );
    const [activeId, setActiveId] = useState(anchors[0] || '');
    const [tocOpen, setTocOpen] = useState(false);
    const articleRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const nodes = articleRef.current?.querySelectorAll<HTMLElement>('[data-doc-anchor]');
        if (!nodes?.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible.length) setActiveId((visible[0].target as HTMLElement).dataset.docAnchor || '');
            },
            { rootMargin: '-90px 0px -65% 0px', threshold: 0 },
        );
        nodes.forEach((node) => observer.observe(node));
        // بخش‌های کوتاه انتهای صفحه هیچ‌وقت به نوار بالا نمی‌رسند
        const onScroll = () => {
            const root = document.documentElement;
            if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) setActiveId(anchors[anchors.length - 1] || '');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onScroll);
        };
    }, [anchors]);

    // ورود با لینک مستقیم (#id)
    useEffect(() => {
        const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        if (!target) return;
        const frame = requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
        return () => cancelAnimationFrame(frame);
    }, []);

    const goTo = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
        event.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(window.history.state, '', `#${id}`);
        setActiveId(id);
        setTocOpen(false);
    };

    const activeSection = sections.find(
        (section) => section.id === activeId || section.headings?.some((heading) => heading.id === activeId),
    )?.id;

    const toc = (
        <ol className={styles.tocList}>
            {sections.map((section, index) => (
                <li key={section.id} className={activeSection === section.id ? styles.tocSectionActive : ''}>
                    <a
                        href={`#${section.id}`}
                        className={`${styles.tocLink} ${activeId === section.id ? styles.tocLinkActive : ''}`}
                        onClick={(event) => goTo(event, section.id)}
                        aria-current={activeId === section.id ? 'location' : undefined}
                    >
                        <span className={styles.tocIndex}>{(index + 1).toLocaleString('fa-IR')}</span>
                        {section.title}
                    </a>
                    {section.headings?.length ? (
                        <ul className={styles.tocSub}>
                            {section.headings.map((heading) => (
                                <li key={heading.id}>
                                    <a
                                        href={`#${heading.id}`}
                                        className={`${styles.tocSubLink} ${activeId === heading.id ? styles.tocLinkActive : ''}`}
                                        onClick={(event) => goTo(event, heading.id)}
                                        aria-current={activeId === heading.id ? 'location' : undefined}
                                    >
                                        {heading.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </li>
            ))}
        </ol>
    );

    return (
        <div className={styles.doc}>
            <nav className={styles.toc} aria-label="فهرست عناوین">
                <button
                    type="button"
                    className={styles.tocToggle}
                    aria-expanded={tocOpen}
                    onClick={() => setTocOpen((open) => !open)}
                >
                    فهرست عناوین
                    <span aria-hidden>{tocOpen ? '▴' : '▾'}</span>
                </button>
                <p className={styles.tocTitle}>در این صفحه</p>
                <div className={`${styles.tocBody} ${tocOpen ? styles.tocBodyOpen : ''}`}>{toc}</div>
            </nav>

            <article ref={articleRef} className={styles.article}>
                {children}
                {sections.map((section, index) => (
                    <section key={section.id} id={section.id} data-doc-anchor={section.id} className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <span className={styles.sectionIndex}>{(index + 1).toLocaleString('fa-IR')}</span>
                            {section.title}
                        </h2>
                        {section.body}
                    </section>
                ))}
            </article>
        </div>
    );
}

/** زیرعنوان یک بخش؛ id باید در `headings` همان بخش هم آمده باشد تا در فهرست دیده شود */
export function DocH3({ id, children }: { id: string; children: ReactNode }) {
    return (
        <h3 id={id} data-doc-anchor={id} className={styles.subTitle}>
            {children}
        </h3>
    );
}

export function Callout({ tone = 'note', title, children }: { tone?: 'note' | 'warn' | 'tip' | 'danger'; title?: string; children: ReactNode }) {
    return (
        <div className={`${styles.callout} ${styles[`callout_${tone}`]}`}>
            {title && <strong>{title}</strong>}
            <div>{children}</div>
        </div>
    );
}

export function Code({ children }: { children: ReactNode }) {
    return (
        <code className={styles.code} dir="ltr">
            {children}
        </code>
    );
}

export function CodeBlock({ children, caption }: { children: string; caption?: string }) {
    return (
        <figure className={styles.codeFigure}>
            {caption && <figcaption>{caption}</figcaption>}
            <pre className={styles.pre} dir="ltr">
                <code>{children}</code>
            </pre>
        </figure>
    );
}

export function DocTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {headers.map((header) => (
                            <th key={header}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} data-label={headers[cellIndex]}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** شل صفحهٔ مستند: هدر (عنوان، توضیح، لینک برگشت) + محتوا — داخل Container/Wrapper پنل */
export function DocPage({
    title,
    lead,
    back,
    children,
}: {
    title: string;
    lead: ReactNode;
    back?: { href: string; label: string };
    children: ReactNode;
}) {
    return (
        <Container>
            <Wrapper>
                <div className={styles.page}>
                    <header className={styles.pageHeader}>
                        <div>
                            <h1>{title}</h1>
                            <p>{lead}</p>
                        </div>
                        {back && <Link href={back.href} className={styles.backLink}>{back.label}</Link>}
                    </header>
                    {children}
                </div>
            </Wrapper>
        </Container>
    );
}

/** مراحل شماره‌دار (۱، ۲، ۳ …) */
export function DocSteps({ children }: { children: ReactNode }) {
    return <ol className={styles.flow}>{children}</ol>;
}

/** سؤال و جواب */
export function DocFaq({ items }: { items: Array<[ReactNode, ReactNode]> }) {
    return (
        <dl className={styles.faq}>
            {items.map(([question, answer], index) => (
                <div key={index}>
                    <dt>{question}</dt>
                    <dd>{answer}</dd>
                </div>
            ))}
        </dl>
    );
}

export interface DocTopic {
    slug: string;
    title: string;
    /** یک خط: این موضوع چه چیزی را جواب می‌دهد */
    summary: string;
    /** گروه در صفحهٔ موضوعات (مثلاً «شروع»، «اتصال اپ‌ها») */
    group: string;
}

/**
 * صفحهٔ موضوعات یک مستند چندبخشی: موضوعات گروه‌بندی‌شده؛ هر کدام به صفحهٔ خودش (`${basePath}/${slug}`)
 * که با DocLayout ساخته می‌شود.
 */
export function DocTopicIndex({ topics, basePath }: { topics: DocTopic[]; basePath: string }) {
    const groups = topics.reduce<Array<{ group: string; items: DocTopic[] }>>((all, topic) => {
        const existing = all.find((entry) => entry.group === topic.group);
        if (existing) existing.items.push(topic);
        else all.push({ group: topic.group, items: [topic] });
        return all;
    }, []);
    let index = 0;
    return (
        <div className={styles.topicIndex}>
            {groups.map(({ group, items }) => (
                <section key={group} className={styles.topicGroup}>
                    <h2>{group}</h2>
                    <ol>
                        {items.map((topic) => {
                            index += 1;
                            return (
                                <li key={topic.slug}>
                                    <Link href={`${basePath}/${topic.slug}`}>
                                        <span className={styles.sectionIndex}>{index.toLocaleString('fa-IR')}</span>
                                        <span>
                                            <strong>{topic.title}</strong>
                                            <small>{topic.summary}</small>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ))}
        </div>
    );
}

/** موضوع قبلی / بعدی + برگشت به فهرست، پایین هر صفحهٔ موضوع */
export function DocPager({ topics, current, basePath }: { topics: DocTopic[]; current: string; basePath: string }) {
    const index = topics.findIndex((topic) => topic.slug === current);
    const prev = index > 0 ? topics[index - 1] : null;
    const next = index >= 0 && index < topics.length - 1 ? topics[index + 1] : null;
    return (
        <nav className={styles.pager} aria-label="موضوع قبلی و بعدی">
            {prev ? (
                <Link href={`${basePath}/${prev.slug}`} className={styles.pagerPrev}>
                    <small>→ قبلی</small>
                    <strong>{prev.title}</strong>
                </Link>
            ) : <span />}
            <Link href={basePath} className={styles.pagerIndex}>همهٔ موضوعات</Link>
            {next ? (
                <Link href={`${basePath}/${next.slug}`} className={styles.pagerNext}>
                    <small>بعدی ←</small>
                    <strong>{next.title}</strong>
                </Link>
            ) : <span />}
        </nav>
    );
}
