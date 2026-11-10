'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LuLock } from 'react-icons/lu';
import styles from './GuestSignInPanel.module.scss';

/**
 * جای محتوای صفحه‌ای که بدون ورود معنا ندارد (حساب، چت، صفحه‌های سازنده):
 * مهمان در همان قاب برنامه می‌ماند، منو را می‌بیند و با یک دکمه وارد می‌شود.
 */
export function GuestSignInPanel({ returnTo }: { returnTo?: string | null }) {
    const router = useRouter();
    const { t } = useTranslation('auth');
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';

    return (
        <section className={styles.wrap} aria-labelledby="guest-sign-in-title">
            <div className={styles.panel}>
                <span className={styles.icon} aria-hidden>
                    <LuLock size={22} strokeWidth={1.75} />
                </span>
                <h2 id="guest-sign-in-title" className={styles.title}>{t('auth_required_title')}</h2>
                <p className={styles.body}>{t('auth_required_body')}</p>
                <div className={styles.actions}>
                    <button type="button" className={styles.primary} onClick={() => router.push(`/login${next}`)}>
                        {t('login_btn')}
                    </button>
                    <button type="button" className={styles.secondary} onClick={() => router.push('/explore')}>
                        {t('auth_required_continue')}
                    </button>
                </div>
            </div>
        </section>
    );
}

export default GuestSignInPanel;
