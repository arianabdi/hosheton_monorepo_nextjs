'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { formatAppDate } from '@/app/lib/i18n/formatLocaleNumber';
import styles from './project-template.module.scss';

interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: string;
}

interface TemplateProps {
    title: string;
    subtitle: string;
    initialProjects: Project[];
    studioType: 'game' | 'media' | 'blog';
    icon: string;
}

export function ProjectListTemplate({ title, subtitle, initialProjects, studioType, icon }: TemplateProps) {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        const newProj: Project = {
            id: `proj-${Date.now()}`,
            name: newName,
            description: newDesc,
            createdAt: formatAppDate(new Date(), i18n.language),
        };

        setProjects([newProj, ...projects]);
        setNewName('');
        setNewDesc('');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>{icon} {title}</h1>
                <p>{subtitle}</p>
            </header>

            <div className={styles.layout}>
                <main className={styles.mainContent}>
                    <div className={styles.grid}>
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className={styles.card}
                                onClick={() => router.push(`/studio/${studioType}/${project.id}`)}
                            >
                                <h3>{project.name}</h3>
                                <p>{project.description}</p>
                                <div className={styles.cardFooter}>
                                    <span>{t('project_id', { id: project.id })}</span>
                                    <span>{project.createdAt}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                <aside className={styles.sidebar}>
                    <h2>➕ {t('new')}</h2>
                    <form onSubmit={handleCreateProject} className={styles.form}>
                        <div className={styles.group}>
                            <label>{t('name_label')}</label>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required />
                        </div>
                        <div className={styles.group}>
                            <label>{tc('description')}</label>
                            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
                        </div>
                        <button type="submit">{t('create_in_workspace')}</button>
                    </form>
                </aside>
            </div>
        </div>
    );
}
