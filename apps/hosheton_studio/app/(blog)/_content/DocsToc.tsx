'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import styles from './content.module.scss';

export type TocHeading = { id: string; text: string; level: number };

/**
 * «در این صفحه» — فهرست عنوان‌های آموزش مثل مستندات: کلیک = پرش نرم به همان عنوان،
 * و عنوانی که الان در حال خواندنش هستیم هایلایت می‌شود (scroll-spy).
 * لینک‌ها `href="#id"` واقعی‌اند تا بدون JS هم کار کنند.
 */
export function DocsToc({
    headings,
    variant,
    title = 'در این صفحه',
}: {
    headings: TocHeading[];
    /** side = ستون کناری صفحهٔ پهن؛ inline = بازشوی بالای متن در عرض کم */
    variant: 'side' | 'inline';
    title?: string;
}) {
    const [activeId, setActiveId] = useState(headings[0]?.id);

    useEffect(() => {
        const elements = headings
            .map((heading) => document.getElementById(heading.id))
            .filter((element): element is HTMLElement => Boolean(element));
        if (!elements.length) return;

        // عنوانی فعال است که آخرین بار از ۳۰٪ بالای صفحه رد شده
        const update = () => {
            const line = window.innerHeight * 0.3;
            let current = elements[0].id;
            for (const element of elements) {
                if (element.getBoundingClientRect().top - line <= 0) current = element.id;
                else break;
            }
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
            setActiveId(atBottom ? elements[elements.length - 1].id : current);
        };

        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [headings]);

    const jump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
        const target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
        setActiveId(id);
        (event.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
    };

    const list = (
        <ul>
            {headings.map((heading) => (
                <li key={heading.id} className={heading.level === 3 ? styles.tocL3 : undefined}>
                    <a
                        href={`#${heading.id}`}
                        onClick={(event) => jump(event, heading.id)}
                        className={heading.id === activeId ? styles.tocActive : undefined}
                        aria-current={heading.id === activeId ? 'location' : undefined}
                    >
                        {heading.text}
                    </a>
                </li>
            ))}
        </ul>
    );

    if (variant === 'inline') {
        return (
            <details className={styles.tocMobile}>
                <summary>{title}</summary>
                {list}
            </details>
        );
    }

    return (
        <nav className={styles.toc} aria-label={title}>
            <span className={styles.navTitle}>{title}</span>
            {list}
        </nav>
    );
}
