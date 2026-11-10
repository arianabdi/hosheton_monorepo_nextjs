'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import { Workspace } from './types';
import styles from './Workspace.module.scss';

export default function WorkspaceHubDashboard() {
    const { t, i18n } = useTranslation('projects');
    const router = useRouter();
    const lang = i18n.language;

    const projects: Workspace[] = useMemo(() => [
        { id: '1', name: t('sample_game_name', { n: 1 }), description: t('sample_game_desc'), env: 'game', createdAt: '2026-06-05' },
        { id: '2', name: t('sample_game_name', { n: 2 }), description: t('sample_game_desc'), env: 'game', createdAt: '2026-06-05' },
        { id: '3', name: t('sample_game_name', { n: 3 }), description: t('sample_game_desc'), env: 'game', createdAt: '2026-06-05' },
        { id: '4', name: t('sample_media_name', { n: 1 }), description: t('sample_media_desc'), env: 'media', createdAt: '2026-06-10' },
        { id: '5', name: t('sample_media_name', { n: 2 }), description: t('sample_media_desc'), env: 'media', createdAt: '2026-06-10' },
        { id: '6', name: t('sample_media_name', { n: 3 }), description: t('sample_media_desc'), env: 'media', createdAt: '2026-06-10' },
        { id: '7', name: t('sample_blog_name', { n: 1 }), description: t('sample_blog_desc'), env: 'blog', createdAt: '2026-06-12' },
        { id: '8', name: t('sample_blog_name', { n: 2 }), description: t('sample_blog_desc'), env: 'blog', createdAt: '2026-06-12' },
        { id: '9', name: t('sample_blog_name', { n: 3 }), description: t('sample_blog_desc'), env: 'blog', createdAt: '2026-06-12' },
        { id: '10', name: t('sample_blog_name', { n: 4 }), description: t('sample_blog_desc'), env: 'blog', createdAt: '2026-06-12' },
        { id: '11', name: t('sample_blog_name', { n: 5 }), description: t('sample_blog_desc'), env: 'blog', createdAt: '2026-06-12' },
    ], [t]);

    const gameCount = projects.filter(p => p.env === 'game').length;
    const mediaCount = projects.filter(p => p.env === 'media').length;
    const blogCount = projects.filter(p => p.env === 'blog').length;

    const environments = [
        {
            key: 'game',
            title: t('env_game_title'),
            icon: '🎮',
            description: t('env_game_desc'),
            count: gameCount,
            path: '/studio/game'
        },
        {
            key: 'media',
            title: t('env_media_title'),
            icon: '🎬',
            description: t('env_media_desc'),
            count: mediaCount,
            path: '/studio/media'
        },
        {
            key: 'blog',
            title: t('env_blog_title'),
            icon: '✍️',
            description: t('env_blog_desc'),
            count: blogCount,
            path: '/studio/blog'
        }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>{t('hub_title')}</h1>
                <p>{t('hub_lead')}</p>
            </header>

            <main className={styles.workspaceGrid}>
                {environments.map((env) => (
                    <div
                        key={env.key}
                        className={`${styles.workspaceCard} ${styles[env.key]}`}
                        onClick={() => router.push(env.path)}
                    >
                        <div className={styles.cardHeader}>
                            <span className={styles.icon}>{env.icon}</span>
                            <span className={styles.badge}>{t('active_n', { count: formatAppNumber(env.count, lang) })}</span>
                        </div>

                        <div className={styles.cardBody}>
                            <h2>{env.title}</h2>
                            <p>{env.description}</p>
                        </div>

                        <div className={styles.cardFooter}>
                            <span>{t('enter_studio')}</span>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}
