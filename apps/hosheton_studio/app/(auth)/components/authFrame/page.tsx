'use client';

import React, {ReactNode, useCallback, useEffect, useLayoutEffect} from 'react';
import styles from './AuthFrame.module.scss';
import {iransans} from '@my-workspace/fonts/iransans';
import {useAppStore} from '@/app/zustand/store/useAppStore';
import {useAuthStore} from '@/app/zustand/store/authStore';
import logoLight from '@/app/assets/hooshetun/logo-light.svg';
import logoDark from '@/app/assets/hooshetun/logo-dark.svg';
import {usePathname, useRouter} from 'next/navigation';
import Image from 'next/image';
import {PiPaintBrushBold} from 'react-icons/pi';
import {AuthLoadingScreen} from '@/app/components/AuthLoadingScreen';
import LanguageSwitcher from '@/app/components/LanguageSwitcher/LanguageSwitcher';
import {useTranslation} from 'react-i18next';
import {isRtlLanguage} from '@/app/lib/i18n/config';
import {observeResize} from '@my-workspace/utils';
import ReferralInviteNotice from '../ReferralInviteNotice';

interface AuthFrameProps {
    children: ReactNode;
}
const AUTH_ENTRY_PREFIXES = ['/login', '/sms-code', '/otp'];

// عنوان خوش‌آمد همیشه یک خط است: اگر در عرض پنل جا نشود، فونتش به همان نسبت کوچک می‌شود
// (با تغییر عرض پنل و لود شدن فونت دوباره اندازه می‌گیرد)
function fitOnOneLine(el: HTMLElement) {
    const fit = () => {
        el.style.fontSize = '';
        const base = parseFloat(getComputedStyle(el).fontSize);
        const available = el.clientWidth - 6;
        const needed = el.scrollWidth;
        if (available > 0 && needed > available) {
            el.style.fontSize = `${Math.max(14, Math.floor((base * available) / needed))}px`;
        }
    };
    fit();
    void document.fonts?.ready.then(fit);
    // فریم بعد: کوچک‌کردن فونت ارتفاع همان والدِ observe شده را عوض می‌کند (حلقهٔ ResizeObserver)
    return observeResize(el.parentElement, fit);
}

// بیرون از AuthFrame تعریف شده‌اند تا با هر رندر از نو ساخته و ری‌مانت نشوند (react-hooks/static-components)
function ThemeSwitcher({compact = false}: {compact?: boolean}) {
    const {theme, setTheme} = useAppStore();
    const {t} = useTranslation('auth');
    return (
        <span
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={styles.themeSwitcher}
            title={t('theme_toggle')}
            aria-label={t('theme_toggle')}
        >
            <PiPaintBrushBold size={20} color={'var(--icon-color)'} />
            {!compact ? <span>{t('theme_toggle')}</span> : null}
        </span>
    );
}

function Logo({size}: {size: number}) {
    const router = useRouter();
    const theme = useAppStore((s) => s.theme);
    return (
        <div className={styles.logoContainer}>
            <Image
                src={theme === 'dark' ? logoLight : logoDark}
                alt="Hosheton"
                className={styles.logo}
                onClick={() => {
                    router.push('/login');
                }}
                style={{cursor: 'pointer', maxWidth: `${size}px`}}
            />
        </div>
    );
}

export default function AuthFrame({children}: AuthFrameProps) {
    const router = useRouter();
    const pathname = usePathname();
    const {theme, lang} = useAppStore();
    const {t} = useTranslation('auth');
    const token = useAuthStore((s) => s.token);
    const isLoading = useAuthStore((s) => s.isLoading);
    const isVerifying = useAuthStore((s) => s.isVerifying);
    const isAuthEntry = AUTH_ENTRY_PREFIXES.some((path) => pathname?.startsWith(path));
    const authBusy = isLoading || isVerifying;

    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }, [theme]);

    // ref تابعی: عنوان بعد از صفحه بارگذاری auth سوار می‌شود؛ با تغییر زبان (متن تازه) دوباره اندازه می‌گیرد
    const welcomeTitle = t('welcome_title');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- متن عنوان فقط محرک اندازه‌گیری دوباره است
    const titleRef = useCallback((el: HTMLHeadingElement | null) => (el ? fitOnOneLine(el) : undefined), [welcomeTitle]);

    useEffect(() => {
        if (!isAuthEntry || authBusy) return;
        if (token) {
            router.replace('/explore');
        }
    }, [isAuthEntry, authBusy, token, router]);

    if (authBusy || (isAuthEntry && token)) {
        return <AuthLoadingScreen/>;
    }

    return (
        <div
            className={`${styles.container} ${iransans.className}`}
            dir={isRtlLanguage(lang) ? 'rtl' : 'ltr'}
        >
            <div className={styles.mobileHeader}>
                <Logo size={80}/>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <LanguageSwitcher compact/>
                    <ThemeSwitcher compact/>
                </div>
            </div>
            <div className={styles.leftPanel}>
                <div className={styles.header}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <LanguageSwitcher compact/>
                        <ThemeSwitcher/>
                    </div>
                </div>
                <div className={styles.panelContent}>
                    <div className={styles.asteriskIcon}>
                        <Logo size={250} />
                    </div>
                    {/* متن خوش‌آمد از چپ به راست ظاهر می‌شود (در هر زبانی)؛ بعد دست از پشت آخرین کلمه بیرون می‌آید و دست تکان می‌دهد */}
                    <h1 ref={titleRef} className={styles.greetingTitle}>
                        <span className={styles.greetingText}>{welcomeTitle}</span>
                        <span className={styles.waveEmoji}>👋</span>
                    </h1>
                    <p className={styles.description}>{t('welcome_desc')}</p>
                </div>
                <div className={styles.copyright}>{t('copyright')}</div>
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.formWrapper}>
                    {isAuthEntry && <ReferralInviteNotice />}
                    {children}
                </div>
            </div>
        </div>
    );
}
