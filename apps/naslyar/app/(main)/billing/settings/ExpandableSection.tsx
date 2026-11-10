'use client';

import React, { useId, useState } from 'react';
import styles from './ExpandableSection.module.scss';

interface ExpandableSectionProps {
    title: string;
    subtitle?: string;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
    children: React.ReactNode;
}

export default function ExpandableSection({
    title,
    subtitle,
    defaultOpen = true,
    badge,
    children,
}: ExpandableSectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    const panelId = useId();

    return (
        <section className={`${styles.section} ${open ? styles.open : ''}`}>
            <button
                type="button"
                className={styles.header}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen(v => !v)}
            >
                <div className={styles.headerText}>
                    <h2 className={styles.title}>{title}</h2>
                    {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
                </div>
                <div className={styles.headerMeta}>
                    {badge}
                    <span className={styles.chevron} aria-hidden>{open ? '▲' : '▼'}</span>
                </div>
            </button>
            {open ? (
                <div id={panelId} className={styles.body}>
                    {children}
                </div>
            ) : null}
        </section>
    );
}
