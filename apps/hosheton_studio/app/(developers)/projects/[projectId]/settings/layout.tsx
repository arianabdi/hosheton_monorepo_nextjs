'use client';

import React, { useEffect, useRef } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import { useTranslation } from 'react-i18next';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import styles from './layout.module.scss';

export default function MediaProjectSettingsLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { projectId } = useParams<{ projectId: string }>();
    const pathname = usePathname();
    const currentTab = pathname.split('/').pop();
    const tabsRef = useRef<HTMLElement>(null);
    const { t, i18n } = useTranslation('projects');
    const BackIcon = isRtlLanguage(i18n.language) ? LuArrowRight : LuArrowLeft;

    const navItems = [
        { id: 'info', label: t('info') },
        { id: 'member', label: t('members') },
    ];

    useEffect(() => {
        const root = tabsRef.current;
        if (!root || window.matchMedia('(min-width: 769px)').matches) return;

        const active = root.querySelector(`.${styles.active}`) as HTMLElement | null;
        if (!active) return;

        const rootRect = root.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        const delta =
            activeRect.left + activeRect.width / 2 - (rootRect.left + rootRect.width / 2);

        root.scrollBy({ left: delta, behavior: 'smooth' });
    }, [currentTab]);

    return (
        <div className={`${styles.settingsContainer} ${iransansxvf.className}`}>
            <aside className={styles.sidebar} ref={tabsRef}>
                <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => router.push(`/projects/${projectId}`)}
                >
                    <BackIcon /> {t('back_editor')}
                </button>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => router.push(`/projects/${projectId}/settings/${item.id}`)}
                        className={`${styles.navButton} ${currentTab === item.id ? styles.active : ''}`}
                    >
                        <span>{item.label}</span>
                    </button>
                ))}
            </aside>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
