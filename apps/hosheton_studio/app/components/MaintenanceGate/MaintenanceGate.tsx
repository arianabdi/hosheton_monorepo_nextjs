'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuMoon, LuSun, LuLanguages, LuWrench, LuSettings, LuShieldCheck, LuClock, LuHeart } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { LanguagePickerPanel } from '@/app/components/LanguageSwitcher/LanguageSwitcher';
import { SUPPORTED_LANGUAGES } from '@/app/lib/i18n/config';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useMaintenanceStore } from '@/app/zustand/store/useMaintenanceStore';
import { AuthLoadingScreen } from '@/app/components/AuthLoadingScreen';
import styles from './MaintenanceGate.module.scss';

/** لوگوی مینی هوشتون — همان مینی‌آیکون chat input استودیو، به‌صورت inline
 *  (بدون وابستگی به svgr/next-image تا در هر حالتی رندر شود) */
function BrandMiniIcon() {
    return (
        <svg className={styles.logo} viewBox="0 0 387 387" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M252.615 182.195H251.615" stroke="#8665FF" strokeWidth="43" strokeMiterlimit="10" strokeLinecap="round" />
            <path d="M266.405 274.955H53.0352" stroke="#8665FF" strokeWidth="43" strokeMiterlimit="10" strokeLinecap="round" />
            <path d="M266.186 274.725C274.156 274.735 282.796 273.215 291.136 269.755C299.476 266.295 307.506 260.885 314.116 253.975C320.716 247.075 325.896 238.675 329.206 229.955C332.516 221.235 333.976 212.205 333.966 203.875V181.925" stroke="#8665FF" strokeWidth="43" strokeMiterlimit="10" strokeLinecap="round" />
            <path d="M266.186 112.045C274.156 112.035 282.796 113.555 291.136 117.015C299.476 120.475 307.506 125.885 314.116 132.795C320.716 139.695 325.896 148.095 329.206 156.815C332.516 165.535 333.976 174.565 333.966 182.895" stroke="#8665FF" strokeWidth="43" strokeMiterlimit="10" strokeLinecap="round" />
            <path d="M170.566 182.905C170.556 174.575 172.006 165.545 175.326 156.825C178.636 148.105 183.817 139.705 190.417 132.805C197.017 125.905 205.057 120.495 213.397 117.025C221.737 113.565 230.376 112.035 238.346 112.055H265.657" stroke="#8665FF" strokeWidth="43" strokeMiterlimit="10" strokeLinecap="round" />
            <path d="M121.395 112.045C113.425 112.035 104.785 113.555 96.4452 117.015C88.1052 120.475 80.0753 125.885 73.4653 132.795C66.8653 139.695 61.6853 148.095 58.3753 156.815C55.0653 165.535 53.6053 174.565 53.6153 182.895" stroke="#8665FF" strokeWidth="43" strokeMiterlimit="10" strokeLinecap="round" />
        </svg>
    );
}

/** صفحه‌ی حالت نگهداری؛ سوییچ تم همیشه، سوییچ زبان فقط با متن‌های پیش‌فرض */
export function MaintenanceScreen() {
    const { t } = useTranslation('common');
    const { theme, setTheme, lang } = useAppStore();
    const { title, content } = useMaintenanceStore();
    const usesDefaults = !title.trim() && !content.trim();
    const [languageModalOpen, setLanguageModalOpen] = useState(false);
    const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

    // همگام‌سازی data-theme — در این صفحه هدر/پروفایل سوار نیستند
    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }, [theme]);

    return (
        <div className={styles.screen}>
            {/* پس‌زمینه‌ی زنده — هاله‌های رنگی شناور روی شبکه‌ی نقطه‌ای محو */}
            <div className={styles.backdrop} aria-hidden="true">
                <span className={styles.grid} />
                <span className={`${styles.blob} ${styles.blobA}`} />
                <span className={`${styles.blob} ${styles.blobB}`} />
                <span className={`${styles.blob} ${styles.blobC}`} />
            </div>

            <div className={styles.actions}>
                <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label={theme === 'dark' ? t('maintenance_light_mode') : t('maintenance_dark_mode')}
                    title={theme === 'dark' ? t('maintenance_light_mode') : t('maintenance_dark_mode')}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    {theme === 'dark' ? <LuSun size={17} /> : <LuMoon size={17} />}
                </button>
                {usesDefaults && (
                    <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={t('maintenance_change_language')}
                        title={t('maintenance_change_language')}
                        onClick={() => setLanguageModalOpen(true)}
                    >
                        <LuLanguages size={15} />
                        <span className={styles.langLabel}>{currentLanguage.nativeLabel}</span>
                    </button>
                )}
            </div>

            <main className={styles.card}>
                {/* لوگو در مرکز حلقه‌های مداری — چرخ‌دنده دور آن می‌چرخد و آچار روی لوگو کار می‌کند */}
                <div className={styles.hero} aria-hidden="true">
                    <span className={styles.glow} />
                    <span className={`${styles.ring} ${styles.ringOuter}`} />
                    <span className={`${styles.ring} ${styles.ringInner}`} />
                    <span className={`${styles.orbit} ${styles.orbitSlow}`}>
                        <span className={styles.gearChip}>
                            <LuSettings size={14} />
                        </span>
                    </span>
                    <span className={`${styles.orbit} ${styles.orbitFast}`}>
                        <span className={styles.orbitDot} />
                    </span>
                    <div className={styles.logoChip}>
                        <BrandMiniIcon />
                    </div>
                    <span className={styles.wrenchBadge}>
                        <span className={styles.wrenchIcon}>
                            <LuWrench size={15} />
                        </span>
                    </span>
                </div>

                <span className={styles.status}>
                    <span className={styles.statusDot} />
                    {t('maintenance_status')}
                </span>

                <h1 className={styles.title}>{title.trim() || t('maintenance_title')}</h1>
                <p className={styles.lead}>{content.trim() || t('maintenance_content')}</p>

                <div className={styles.progress} role="progressbar" aria-label={t('maintenance_status')}>
                    <span className={styles.progressBar} />
                </div>

                <ul className={styles.chips}>
                    <li className={styles.chip}>
                        <LuShieldCheck size={15} />
                        {t('maintenance_badge_safe')}
                    </li>
                    <li className={styles.chip}>
                        <LuClock size={15} />
                        {t('maintenance_badge_soon')}
                    </li>
                </ul>

                <p className={styles.thanks}>
                    <LuHeart size={13} className={styles.heart} />
                    {t('maintenance_thanks')}
                </p>
            </main>

            {/* همان انتخاب‌گر زبان منوی پروفایل — همه‌ی زبان‌های پشتیبانی‌شده */}
            <ModalHelper
                open={languageModalOpen}
                onClose={() => setLanguageModalOpen(false)}
                hideCloseBtn
                size="sm"
                sheetTitle={t('language')}
                props={{
                    style: {
                        background: 'var(--input-background-color)',
                        color: 'var(--body-text-color)',
                    },
                }}
                component={
                    <LanguagePickerPanel onSelected={() => setLanguageModalOpen(false)} />
                }
            />
        </div>
    );
}

/**
 * گارد سراسری حالت نگهداری — در روت layout سوار می‌شود.
 * وقتی ادمین حالت نگهداری را روشن کند، «هیچ کاربری — بدون استثنا» به هیچ صفحه‌ای
 * دسترسی ندارد و فقط این صفحه را می‌بیند. تا پایان اولین چک هم هیچ صفحه‌ای
 * رندر نمی‌شود تا حتی لحظه‌ای محتوای واقعی دیده نشود.
 */
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
    const { enabled, checked, fetchStatus } = useMaintenanceStore();

    useEffect(() => {
        void fetchStatus();
        const interval = setInterval(() => { void fetchStatus(); }, 60_000);
        const onFocus = () => { void fetchStatus(); };
        window.addEventListener('focus', onFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, [fetchStatus]);

    // تا پایان اولین چک، همان صفحهٔ loading همیشگی (لوگو + اسپینر + متن) نشان
    // داده می‌شود — قبلاً اینجا مینی‌آیکون برند رندر می‌شد و به‌عنوان آیکون
    // اضافه در loading سایت به چشم می‌آمد.
    if (!checked) {
        return <AuthLoadingScreen />;
    }

    // حالت نگهداری فعال: همه — بدون استثنا — فقط این صفحه را می‌بینند
    if (enabled) {
        return <MaintenanceScreen />;
    }

    return <>{children}</>;
}
