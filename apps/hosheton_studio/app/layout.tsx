import {cookies} from 'next/headers';
import {Suspense} from 'react';
import type {Metadata, Viewport} from 'next';
import {I18nProvider} from '@/app/lib/i18n/provider';
import {DEFAULT_LANGUAGE, isRtlLanguage, type AppLanguage} from '@/app/lib/i18n/config';
import {APP_STORAGE_KEY, languageFromCookies} from '@/app/lib/i18n/languageCookies';
import './globals.css';
import styles from './layout.module.scss';
import {AuthProvider} from '@/app/zustand/providers/AuthProvider';
import ToastProvider from 'naslyar/app/toastProvider';
import StatusBanner from '@/app/lib/errors/status/StatusBanner';
import LoginModal from '@/app/components/LoginModal';
import MaintenanceGate from '@/app/components/MaintenanceGate/MaintenanceGate';
import EtrInit from '@/app/etr-init';
import ReferralAttributor from '@/app/components/ReferralAttributor';
import ThemeColorSync from '@/app/components/ThemeColorSync';
import KeyboardInsetSync from '@/app/components/KeyboardInsetSync';
import GoogleAnalytics from '@/app/components/GoogleAnalytics';
import {BROWSER_THEME_COLORS} from '@/app/lib/browser-theme';

const siteUrl = (process.env.NEXT_PUBLIC_URL || 'http://localhost:3001').replace(/\/+$/, '');

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'هوشتون استودیو | Hosheton Studio',
        template: '%s | هوشتون استودیو',
    },
    description: 'هوشتون استودیو — استودیوی تولید محتوا با هوش مصنوعی؛ ایده‌ها، پرامپت‌ها و ورک‌فلوهای آماده.',
    applicationName: 'Hosheton Studio',
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        type: 'website',
        siteName: 'Hosheton Studio',
        locale: 'fa_IR',
        url: siteUrl,
    },
    twitter: {
        card: 'summary_large_image',
    },
};

// اندروید (Chrome): با باز شدن کیبورد خود صفحه کوچک می‌شود (100dvh کم می‌شود) تا کادر نوشتن زیر کیبورد
// نرود؛ iOS این را ندارد و KeyboardInsetSync با visualViewport جبرانش می‌کند
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-content',
};

// تم از state ذخیره‌شده zustand (کلید app-storage) خوانده می‌شود؛ هر چیزی جز light یعنی تیره
const THEME_INIT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(APP_STORAGE_KEY)})||'null');var t=s&&s.state&&s.state.theme;var m=t==='light'?'light':'dark';document.documentElement.setAttribute('data-theme',m);document.documentElement.style.colorScheme=m;var c=document.querySelector('meta[name="theme-color"]');if(c)c.setAttribute('content',m==='light'?${JSON.stringify(BROWSER_THEME_COLORS.light)}:${JSON.stringify(BROWSER_THEME_COLORS.dark)});}catch(e){}`;

export default async function RootLayout({children}: {children: React.ReactNode}) {
    const cookieStore = await cookies();
    const initialLang: AppLanguage = languageFromCookies((name) => cookieStore.get(name)?.value);

    return (
        <html
            lang={initialLang || DEFAULT_LANGUAGE}
            dir={isRtlLanguage(initialLang) ? 'rtl' : 'ltr'}
            className={styles.global}
            data-theme="dark"
            suppressHydrationWarning
        >
            <head>
                {/* رنگ نوار آدرس/وضعیت مرورگر — اسکریپت زیر و ThemeColorSync با تم برنامه هماهنگش می‌کنند */}
                <meta name="theme-color" content={BROWSER_THEME_COLORS.dark} />
                {/* پیش از اولین رنگ‌آمیزی: تم ذخیره‌شده کاربر، وگرنه تیره (پیش‌فرض) — بدون پرش رنگ */}
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
            </head>
            <body>
                <GoogleAnalytics/>
                <I18nProvider>
                    <AuthProvider>
                        {/* راه‌انداز پایش خطا — ERROR_TRACKING.md */}
                        <EtrInit/>
                        <ThemeColorSync/>
                        <KeyboardInsetSync/>
                        <ToastProvider/>
                        {/* قطع اینترنت / سرور: یک بنر بالای صفحه به‌جای toastهای پشت‌سرهم — app/lib/errors/status */}
                        <StatusBanner/>
                        <MaintenanceGate>
                            {children}
                        </MaintenanceGate>
                        <LoginModal />
                        {/* حفظ کد دعوت (?ref=) در همه صفحه‌ها + اتصال خودکار بعد از لاگین */}
                        <Suspense fallback={null}>
                            <ReferralAttributor />
                        </Suspense>
                    </AuthProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
