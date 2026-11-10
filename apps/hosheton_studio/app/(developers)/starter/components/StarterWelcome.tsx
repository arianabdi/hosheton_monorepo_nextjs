'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { promptGuestLogin } from '@/app/components/guest/guestAccess';
import logoLight from '@/app/assets/hooshetun/logo-light.svg';
import logoDark from '@/app/assets/hooshetun/logo-dark.svg';
import styles from '../StarterPage.module.scss';

export function StarterWelcome() {
    const { theme } = useAppStore();
    const router = useRouter();
    const { t } = useTranslation('starter');
    const { t: tc } = useTranslation('common');
    const token = useAuthStore((state) => state.token);
    // ساخت پروژه برای مهمان: پنجره‌ی ورود، بدون رفتن به صفحه
    const startProject = () => {
        if (!token) {
            promptGuestLogin('/projects/new');
            return;
        }
        router.push('/projects/new');
    };

    const infoSections = [
        { title: t('info_1_title'), body: t('info_1_body') },
        { title: t('info_2_title'), body: t('info_2_body') },
        { title: t('info_3_title'), body: t('info_3_body') },
        { title: t('info_4_title'), body: t('info_4_body') },
    ];

    return (
        <section className={styles.root}>
            <Image
                src={theme === 'dark' ? logoLight : logoDark}
                alt={tc('brand')}
                className={styles.logo}
                priority
            />

            <h1 className={styles.title}>
                {t('welcome_title')} <span className={styles.waveEmoji}>👋</span>
            </h1>

            <p className={styles.lead}>{t('lead_1')}</p>
            <p className={styles.lead}>{t('lead_2')}</p>

            <ul className={styles.list}>
                <li>
                    <a href="/projects/new" onClick={(e) => { e.preventDefault(); router.push('/projects/new'); }}>
                        {t('link_first_project')}
                    </a>
                    {t('link_first_project_desc')}
                </li>
                <li>
                    <a href="/explore" onClick={(e) => { e.preventDefault(); router.push('/explore'); }}>
                        {t('link_templates')}
                    </a>
                    {t('link_templates_desc')}
                </li>
                <li>
                    <a href="/ai-model-pricing" onClick={(e) => { e.preventDefault(); router.push('/ai-model-pricing'); }}>
                        {t('link_pricing')}
                    </a>
                    {t('link_pricing_desc')}
                </li>
                <li>
                    <a href="/usage" onClick={(e) => { e.preventDefault(); router.push('/usage'); }}>
                        {t('link_usage')}
                    </a>
                    {t('link_usage_desc')}
                </li>
            </ul>

            <hr className={styles.divider} />

            <section>
                {infoSections.map((section, index) => (
                    <div key={section.title}>
                        {index > 0 && <hr className={styles.divider} />}
                        <h2 className={styles.sectionTitle}>{section.title}</h2>
                        <p className={styles.lead}>{section.body}</p>
                    </div>
                ))}
            </section>

            <div className={styles.actions}>
                <button type="button" className={styles.primaryBtn} onClick={startProject}>
                    {t('cta_project')}
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={() => router.push('/explore')}>
                    {t('cta_templates')}
                </button>
            </div>
        </section>
    );
}
