'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuPlus } from 'react-icons/lu';
import pageStyles from '@/app/(developers)/projects/ProjectsPage.module.scss';
import { getActiveTemplateTab, type TemplateTabId } from '../lib/templates-hub-path';
import styles from './TemplatesHubShell.module.scss';

const TAB_HREFS: Record<TemplateTabId, string> = {
    mine: '/templates',
    saved: '/templates/saved',
    reviews: '/templates/review-requests',
    analytics: '/templates/analytics',
    messages: '/messages',
};

const TAB_LABEL_KEYS: Record<TemplateTabId, string> = {
    mine: 'mine',
    saved: 'saved',
    reviews: 'review',
    analytics: 'analytics',
    messages: 'messages',
};

const TAB_DESC_KEYS: Record<TemplateTabId, string> = {
    mine: 'hub_mine',
    saved: 'hub_saved',
    reviews: 'hub_review',
    analytics: 'hub_analytics',
    messages: 'hub_messages',
};

const TAB_IDS: TemplateTabId[] = ['mine', 'saved', 'reviews', 'analytics', 'messages'];

export function TemplatesHubShell({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation('templates');
    const pathname = usePathname();
    const activeTab = getActiveTemplateTab(pathname);

    return (
        <div className={`${pageStyles.container} ${pageStyles.rtl} ${styles.shell}`}>
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <div>
                        <h1 className={styles.title}>{t('title')}</h1>
                        <p className={styles.subtitle}>{t(TAB_DESC_KEYS[activeTab])}</p>
                    </div>
                    <Link href="/templates/new" className={styles.createBtn}>
                        <LuPlus size={18} />
                        {t('create_new')}
                    </Link>
                </div>

                <nav className={styles.tabNav} aria-label={t('hub_nav_aria')}>
                    {TAB_IDS.map((id) => {
                        const isActive = activeTab === id;
                        return (
                            <Link
                                key={id}
                                href={TAB_HREFS[id]}
                                className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {t(TAB_LABEL_KEYS[id])}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
