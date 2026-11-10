'use client';

/**
 * HelpGuideViewer — the reusable help surface shared by every app.
 *
 * Layout: section/guide index sidebar · guide content · topic outline sidebar.
 * Fully responsive:
 *  - wide (≥1100px): the three-column layout
 *  - medium (900–1100px): outline collapses into a sticky dropdown
 *  - small (<900px): section/guide pickers + collapsible topics above content
 * `embedded` mode drops the page chrome so the same viewer can live inside a
 * ModalHelper anywhere in the workspace (e.g. the level editor help button).
 */
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
    DEFAULT_HELP_LABELS,
    type HelpBlock,
    type HelpGuide,
    type HelpGuideLabels,
    type HelpSection,
    type HelpTopic,
} from './helpGuideTypes';
import {helpGuideRegistry} from './sections';
import styles from './HelpGuideViewer.module.scss';

// ── Block renderer ──────────────────────────────────────────────────────────

function Kbd({children}: {children: React.ReactNode}) {
    return <kbd>{children}</kbd>;
}

function BlockView({block}: {block: HelpBlock}) {
    switch (block.type) {
        case 'p':
            return <p>{block.text}</p>;
        case 'ul':
            return (
                <ul>
                    {block.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            );
        case 'ol':
            return (
                <ol>
                    {block.items.map((item, i) => <li key={i}>{item}</li>)}
                </ol>
            );
        case 'kbd-list':
            return (
                <div className={styles.kbdList}>
                    {block.items.map((item, i) => (
                        <div key={i} className={styles.kbdRow}>
                            <span className={styles.kbdKeys}>
                                {item.keys.map(k => <Kbd key={k}>{k}</Kbd>)}
                            </span>
                            <span className={styles.kbdDesc}>{item.desc}</span>
                        </div>
                    ))}
                </div>
            );
        case 'code':
            return (
                <pre dir="ltr" className={styles.codeBlock} data-lang={block.lang ?? ''}>
                    <code>{block.code}</code>
                </pre>
            );
        case 'table':
            return (
                <div className={styles.tableWrap}>
                    <table>
                        <thead>
                            <tr>{block.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row, i) => (
                                <tr key={i}>
                                    {row.map((cell, j) => <td key={j}>{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        case 'note':
            return (
                <div className={`${styles.note} ${block.tone === 'warn' ? styles.warn : ''}`}>
                    {block.text}
                </div>
            );
        default:
            return null;
    }
}

// ── Viewer ──────────────────────────────────────────────────────────────────

export interface HelpGuideViewerProps {
    sections?: HelpSection[];
    initialSectionId?: string;
    initialGuideId?: string;
    /** Compact mode for rendering inside a ModalHelper. */
    embedded?: boolean;
    labels?: HelpGuideLabels;
    /** Notified on section/guide change (lets hosts update URLs). */
    onNavigate?: (sectionId: string, guideId: string) => void;
}

export function HelpGuideViewer({
    sections,
    initialSectionId,
    initialGuideId,
    embedded = false,
    labels,
    onNavigate,
}: HelpGuideViewerProps) {
    const allSections = sections ?? helpGuideRegistry;
    const L = {...DEFAULT_HELP_LABELS, ...(labels ?? {})};

    const [sectionId, setSectionId] = useState(() =>
        initialSectionId && allSections.some(s => s.id === initialSectionId)
            ? initialSectionId
            : allSections[0]?.id ?? '');
    const section = allSections.find(s => s.id === sectionId) ?? allSections[0];

    const [guideId, setGuideId] = useState(() => {
        const first = section?.guides.find(g => g.id === initialGuideId) ?? section?.guides[0];
        return first?.id ?? '';
    });
    const guide: HelpGuide | undefined = section?.guides.find(g => g.id === guideId) ?? section?.guides[0];

    const [activeTopic, setActiveTopic] = useState<string>('');
    const [topicsOpen, setTopicsOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Keep guide valid when the section changes.
    useEffect(() => {
        if (!section) return;
        if (!section.guides.some(g => g.id === guideId)) {
            setGuideId(section.guides[0]?.id ?? '');
        }
    }, [section, guideId]);

    useEffect(() => {
        if (section && guide) onNavigate?.(section.id, guide.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section?.id, guide?.id]);

    // Scroll-spy: highlight the outline entry of the topic in view.
    useLayoutEffect(() => {
        const root = contentRef.current;
        if (!root || !guide) return;
        const headings = Array.from(root.querySelectorAll<HTMLElement>('[data-topic-id]'));
        if (!headings.length) return;
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    setActiveTopic((entry.target as HTMLElement).dataset.topicId ?? '');
                    break;
                }
            }
        }, {root, rootMargin: '-15% 0px -70% 0px', threshold: 0});
        headings.forEach(h => observer.observe(h));
        return () => observer.disconnect();
    }, [guide, section]);

    const scrollToTopic = (topicId: string) => {
        const el = contentRef.current?.querySelector<HTMLElement>(`[data-topic-id="${topicId}"]`);
        if (!el) return;
        contentRef.current?.scrollTo({top: el.offsetTop - 8, behavior: 'smooth'});
        setActiveTopic(topicId);
        setTopicsOpen(false);
    };

    const topicList = useMemo<HelpTopic[]>(() => guide?.topics ?? [], [guide]);

    if (!allSections.length || !section || !guide) {
        return <div className={`${styles.viewer} ${embedded ? styles.embedded : ''}`}>{L.emptySection}</div>;
    }

    const audienceBadge = guide.audience === 'developer' ? L.audienceDeveloper : L.audienceUser;

    const sidebar = (
        <aside className={styles.indexSidebar} aria-label={L.sectionsTitle}>
            <h4>{L.sectionsTitle}</h4>
            {allSections.map(s => (
                <div key={s.id} className={`${styles.indexSection} ${s.id === section.id ? styles.current : ''}`}>
                    <button
                        type="button"
                        className={styles.indexSectionTitle}
                        onClick={() => setSectionId(s.id)}
                    >
                        {s.icon && <span aria-hidden>{s.icon}</span>}
                        <span>{s.title}</span>
                    </button>
                    {(s.id === section.id) && (
                        <div className={styles.indexGuides}>
                            {s.guides.map(g => (
                                <button
                                    key={g.id}
                                    type="button"
                                    className={`${styles.indexGuide} ${g.id === guide.id ? styles.currentGuide : ''}`}
                                    onClick={() => setGuideId(g.id)}
                                    title={g.description}
                                >
                                    <span className={styles.guideTitle}>{g.title}</span>
                                    <em>{g.audience === 'developer' ? L.audienceDeveloper : L.audienceUser}</em>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </aside>
    );

    const outline = (
        <nav className={styles.outlineSidebar} aria-label={L.outlineTitle}>
            <h4>{guide.title}</h4>
            <ol>
                {topicList.map((topic, i) => (
                    <li key={topic.id}>
                        <button
                            type="button"
                            className={activeTopic === topic.id ? styles.activeTopic : ''}
                            onClick={() => scrollToTopic(topic.id)}
                        >
                            <em>{i + 1}</em> {topic.title}
                        </button>
                    </li>
                ))}
            </ol>
            {section.route && (
                <a className={styles.sectionRoute} href={section.route}>{L.openGuide}</a>
            )}
        </nav>
    );

    return (
        <div className={`${styles.viewer} ${embedded ? styles.embedded : ''}`}>
            {/* Mobile pickers (hidden on wide screens) */}
            <div className={styles.mobileBar}>
                <select value={section.id} onChange={e => setSectionId(e.target.value)} aria-label={L.sectionsTitle}>
                    {allSections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                <select value={guide.id} onChange={e => setGuideId(e.target.value)} aria-label={guide.title}>
                    {section.guides.map(g => (
                        <option key={g.id} value={g.id}>{g.title} — {g.audience === 'developer' ? L.audienceDeveloper : L.audienceUser}</option>
                    ))}
                </select>
                <button type="button" className={styles.topicsToggle} onClick={() => setTopicsOpen(o => !o)}>
                    {L.topicsToggle} ({topicList.length})
                </button>
            </div>

            {sidebar}

            <div className={styles.contentColumn}>
                {topicsOpen && (
                    <div className={styles.mobileTopics}>
                        <ol>
                            {topicList.map((topic, i) => (
                                <li key={topic.id}>
                                    <button
                                        type="button"
                                        className={activeTopic === topic.id ? styles.activeTopic : ''}
                                        onClick={() => scrollToTopic(topic.id)}
                                    >
                                        <em>{i + 1}</em> {topic.title}
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                <header className={styles.guideHead}>
                    <span className={styles.audienceBadge} data-audience={guide.audience}>{audienceBadge}</span>
                    <h2>{guide.title}</h2>
                    {guide.description && <p>{guide.description}</p>}
                </header>

                <div className={styles.content} ref={contentRef}>
                    {topicList.map(topic => (
                        <section key={topic.id} className={styles.topic} data-topic-id={topic.id}>
                            <h3>{topic.title}</h3>
                            {topic.blocks.map((block, i) => <BlockView key={i} block={block}/>)}
                        </section>
                    ))}
                </div>
            </div>

            {outline}
        </div>
    );
}

export default HelpGuideViewer;
