'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuArrowLeft, LuSparkles } from 'react-icons/lu';
import styles from './ProjectWorkspacePlaceholder.module.scss';

type ProjectWorkspacePlaceholderProps = {
    projectId: string;
    title: string;
    description: string;
};

export function ProjectWorkspacePlaceholder({
    projectId,
    title,
    description,
}: ProjectWorkspacePlaceholderProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');

    return (
        <main className={styles.page}>
            <section className={styles.card}>
                <span className={styles.icon}><LuSparkles aria-hidden /></span>
                <span className={styles.eyebrow}>{tc('coming_soon')}</span>
                <h1>{title}</h1>
                <p>{description}</p>
                <Link href={`/projects/${projectId}`} className={styles.workflowLink}>
                    {t('back_to_workflow')}
                    <LuArrowLeft aria-hidden />
                </Link>
            </section>
        </main>
    );
}
