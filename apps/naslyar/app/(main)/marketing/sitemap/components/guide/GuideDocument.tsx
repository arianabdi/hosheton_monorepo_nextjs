'use client';

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import styles from '../../Sitemap.module.scss';

export interface GuideTopic {
    id: string;
    title: string;
    /** یک خط زیر عنوان در تایم‌لاین */
    summary: string;
    body: ReactNode;
}

/**
 * مستند آموزش: مقاله در ستون اصلی و موضوعات به‌صورت تایم‌لاین در ستون چپ (sticky).
 * موضوع در حال مطالعه با scroll-spy مشخص می‌شود و هر موضوع با #id لینک مستقیم دارد.
 */
export default function GuideDocument({ title, lead, topics }: { title: string; lead: ReactNode; topics: GuideTopic[] }) {
    const [activeId, setActiveId] = useState(topics[0]?.id ?? '');
    const articleRef = useRef<HTMLElement>(null);

    // scroll-spy: بخشی که از نوار بالای صفحه (زیر هدر) عبور می‌کند فعال است
    useEffect(() => {
        const sections = articleRef.current?.querySelectorAll<HTMLElement>('[data-topic-id]');
        if (!sections?.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((entry) => entry.isIntersecting);
                if (visible.length) setActiveId((visible[0].target as HTMLElement).dataset.topicId ?? '');
            },
            { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
        );
        sections.forEach((section) => observer.observe(section));
        // موضوعات کوتاه انتهای مقاله هیچ‌وقت به نوار بالا نمی‌رسند؛ در انتهای صفحه آخرین موضوع فعال است
        const onScroll = () => {
            const root = document.documentElement;
            if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) setActiveId(topics[topics.length - 1]?.id ?? '');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onScroll);
        };
    }, [topics]);

    // ورود با لینک مستقیم (#topic) از تب‌های دیگر — موضوع فعال را خود scroll-spy بعد از اسکرول تعیین می‌کند
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
    };

    const activeIndex = Math.max(0, topics.findIndex((topic) => topic.id === activeId));

    return (
        <div className={styles.doc}>
            <article ref={articleRef} className={styles.docArticle}>
                <header className={styles.docHeader}>
                    <h2>{title}</h2>
                    <div className={styles.docLead}>{lead}</div>
                </header>
                {topics.map((topic, index) => (
                    <section key={topic.id} id={topic.id} data-topic-id={topic.id} className={styles.docSection}>
                        <h2 className={styles.docSectionTitle}>
                            <span className={styles.docStep}>{(index + 1).toLocaleString('fa-IR')}</span>
                            {topic.title}
                        </h2>
                        {topic.body}
                    </section>
                ))}
            </article>

            <nav className={styles.docToc} aria-label="موضوعات آموزش">
                <p className={styles.docTocTitle}>موضوعات</p>
                <ol className={styles.timeline}>
                    {topics.map((topic, index) => (
                        <li
                            key={topic.id}
                            className={`${styles.timelineItem} ${index < activeIndex ? styles.timelineDone : ''} ${index === activeIndex ? styles.timelineActive : ''}`}
                        >
                            <a href={`#${topic.id}`} onClick={(event) => goTo(event, topic.id)} aria-current={index === activeIndex ? 'location' : undefined}>
                                <span className={styles.timelineDot} aria-hidden />
                                <span className={styles.timelineText}>
                                    <strong>{topic.title}</strong>
                                    <small>{topic.summary}</small>
                                </span>
                            </a>
                        </li>
                    ))}
                </ol>
            </nav>
        </div>
    );
}

/** اجزای متن مستند — ظاهر یکسان همه موضوعات */
export function Callout({ tone = 'note', title, children }: { tone?: 'note' | 'warn' | 'tip'; title?: string; children: ReactNode }) {
    return (
        <div className={`${styles.callout} ${styles[`callout_${tone}`]}`}>
            {title && <strong>{title}</strong>}
            <div>{children}</div>
        </div>
    );
}

export function Code({ children }: { children: ReactNode }) {
    return (
        <code className={styles.docCode} dir="ltr">
            {children}
        </code>
    );
}

export function CodeBlock({ children }: { children: string }) {
    return (
        <pre className={styles.docPre} dir="ltr">
            <code>{children}</code>
        </pre>
    );
}
