'use client';

import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { LuHistory, LuMessageCircle } from 'react-icons/lu';
import styles from '@/app/(developers)/layout.module.scss';
import exploreStyles from '../(marketplace)/explore-layout.module.scss';
import chatStyles from '@/app/(marketing)/components/ads-chat/ads-chat.module.scss';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import AppSidebar from '@/app/components/sidebar/AppSidebar';
import { ExploreSearchProvider } from '@/app/(marketplace)/lib/explore-search-context';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import { QaConsole } from '@/app/components/qa-testing/QaConsole';
import { DeveloperToolsHost } from '@/app/components/developer-menu';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import PageMaintenanceBoundary from '@/app/components/MaintenanceGate/PageMaintenanceBoundary';
import AdsChat from '@/app/(marketing)/components/ads-chat/AdsChat';
import AdsChatSidebar from '@/app/(marketing)/components/ads-chat/AdsChatSidebar';

/** Public marketplace layout — no auth required */
export default function MarketplaceLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
    const pathname = usePathname();
    const { i18n } = useTranslation();
    const { t } = useTranslation('adsVideo');
    const videoEditing = Boolean(pathname?.startsWith('/ads-2video') && !pathname.startsWith('/explore/buy'));
    const isCheckout = Boolean(pathname?.startsWith('/explore/buy'));
    // Detail modal slot only renders on /explore/<slug>. When closing navigates back to
    // /explore, dropping the slot guarantees the intercepted modal unmounts even though
    // router.push can leave a stale slot tree (known Next.js parallel-routes quirk).
    const isTemplateDetail = Boolean(
        pathname
        && pathname.startsWith('/explore/')
        && !pathname.startsWith('/explore/buy/'),
    );
    const token = useAuthStore((s) => s.token);
    const contentDir = isRtlLanguage(i18n.language) ? 'rtl' : 'ltr';
    const open = useStudioPersonalChatStore((s) => s.open);
    const setOpen = useStudioPersonalChatStore((s) => s.setOpen);
    const historyOpen = useStudioPersonalChatStore((s) => s.historyOpen);
    const toggleHistory = useStudioPersonalChatStore((s) => s.toggleHistory);

    useEffect(() => {
        if (token) return;
        setOpen(false);
    }, [token, setOpen]);

    // چت در صفحه‌های پهن باز شروع می‌شود؛ کاربر می‌تواند بسته‌اش کند
    useLayoutEffect(() => {
        if (!videoEditing || !token) return;
        if (window.matchMedia('(min-width: 901px)').matches) {
            setOpen(true);
        }
    }, [videoEditing, token, setOpen]);

    useEffect(() => {
        if (pathname === '/chat' || pathname?.startsWith('/chat/')) setOpen(false);
    }, [pathname, setOpen]);

    const content = (
        <>

            <div className={`${styles.wrapper} ${iransansxvf.className}`} style={{ flexDirection: 'row' }}>
                <AppSidebar />
                <div className={`${styles.applicationView} ${videoEditing ? styles.applicationViewFill : ''}`}>
                    <div className={`${styles.outlet} ${videoEditing ? `${styles.outletFill} ${styles.outletLock}` : ''} ${isCheckout ? styles.outletFill : ''}`}>
                        <PageMaintenanceBoundary>
                        {videoEditing ? (
                            <div className={exploreStyles.exploreLayout} dir={contentDir}>
                                <div className={exploreStyles.exploreOutlet}>{children}</div>
                                {/* چت تولید ویدیو — جایگزین چت شخصی؛ همان الگوی باز/بسته explore + resize عرض.
                                    دکمه‌ی هدر = تاریخچه‌ی چت همین پروژه، در همان سایدبار باز می‌شود */}
                                <AdsChatSidebar
                                    open={open}
                                    onClose={() => setOpen(false)}
                                    title={t('chat_sidebar_title', { defaultValue: 'دستیار تولید ویدیو' })}
                                    headerExtra={(
                                        <button
                                            type="button"
                                            className={chatStyles.historyToggleBtn}
                                            onClick={toggleHistory}
                                            aria-pressed={historyOpen}
                                            aria-label={t('chat_history_btn', { defaultValue: 'تاریخچه چت' })}
                                            title={t('chat_history_btn', { defaultValue: 'تاریخچه چت' })}
                                        >
                                            <LuHistory size={15} />
                                        </button>
                                    )}
                                >
                                    <AdsChat />
                                </AdsChatSidebar>
                            </div>
                        ) : children}
                        </PageMaintenanceBoundary>
                    </div>
                </div>
            </div>
            {/* Intercepted /explore/<slug> renders the detail modal through this slot */}
            {isTemplateDetail ? modal : null}
            {/* تب شناور بازکردن چت — وقتی سایدبار بسته است */}
            {videoEditing && !open ? (
                <button
                    type="button"
                    className={chatStyles.chatToggleTab}
                    onClick={() => setOpen(true)}
                    aria-label={t('chat_sidebar_open', { defaultValue: 'باز کردن چت تولید' })}
                    title={t('chat_sidebar_open', { defaultValue: 'باز کردن چت تولید' })}
                >
                    <LuMessageCircle size={18} />
                </button>
            ) : null}
            <QaConsole />
            <DeveloperToolsHost />
        </>
    );

    if (videoEditing) {
        return <ExploreSearchProvider>{content}</ExploreSearchProvider>;
    }

    return content;
}
