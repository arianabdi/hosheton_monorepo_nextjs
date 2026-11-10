'use client';

import type { ReactNode } from 'react';
import styles from './ModelEditTabCard.module.scss';

interface ModelEditTabCardProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
}

export default function ModelEditTabCard({ title, subtitle, children }: ModelEditTabCardProps) {
    return (
        <section className={styles.card}>
            <header className={styles.header}>
                <h4 className={styles.title}>{title}</h4>
                {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </header>
            <div className={styles.body}>{children}</div>
        </section>
    );
}
