'use client';

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import styles from '@/app/(developers)/layout.module.scss';
import exploreStyles from './explore-layout.module.scss';
import { iransansxvf } from '@my-workspace/fonts/iransansxvf';
import AppSidebar from '@/app/components/sidebar/AppSidebar';
import { ExploreSearchProvider } from '@/app/(marketplace)/lib/explore-search-context';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import { ChatSessionProvider } from '@/app/(developers)/projects/[projectId]/chat/ChatSessionContext';
import PersonalChatView from '@/app/(developers)/chat/PersonalChatView';
import { QaConsole } from '@/app/components/qa-testing/QaConsole';
import { DeveloperToolsHost } from '@/app/components/developer-menu';
import { isRtlLanguage } from '@/app/lib/i18n/config';
import PageMaintenanceBoundary from '@/app/components/MaintenanceGate/PageMaintenanceBoundary';

const DESKTOP_QUERY = '(min-width: 901px)';

/** کار را به بعد از نقاشی فریم بعد می‌اندازد تا انیمیشنی که همین حالا شروع شده اول راه بیفتد */
function afterNextPaint(run: () => void) {
    let inner = 0;
    let done = false;
    const once = () => {
        if (done) return;
        done = true;
        run();
    };
    const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(once);
    });
    // تب پس‌زمینه rAF را متوقف می‌کند — بدون این، کار عقب‌افتاده هیچ‌وقت اجرا نمی‌شد
    const fallback = window.setTimeout(once, 150);
    return () => {
        window.cancelAnimationFrame(outer);
        window.cancelAnimationFrame(inner);
        window.clearTimeout(fallback);
    };
}

/** Public marketplace layout — no auth required */
export default function MarketplaceLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
    const pathname = usePathname();
    const { i18n } = useTranslation();
    const isExplore = Boolean(pathname?.startsWith('/explore') && !pathname.startsWith('/explore/buy'));
    const isCheckout = Boolean(pathname?.startsWith('/explore/buy'));
    // Detail modal slot only renders on /explore/<slug>. When closing navigates back to
    // /explore, dropping the slot guarantees the intercepted modal unmounts even though
    // router.push can leave a stale slot tree (known Next.js parallel-routes quirk).
    const isTemplateDetail = Boolean(
        pathname
        && pathname.startsWith('/explore/')
        && !pathname.startsWith('/explore/buy/'),
    );
    const contentDir = isRtlLanguage(i18n.language) ? 'rtl' : 'ltr';
    const open = useStudioPersonalChatStore((s) => s.open);
    const setOpen = useStudioPersonalChatStore((s) => s.setOpen);
    const docked = useStudioPersonalChatStore((s) => s.docked);
    const setDocked = useStudioPersonalChatStore((s) => s.setDocked);
    const [mounted, setMounted] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    // باز بودن اولیه‌ی دسکتاپ بی‌انیمیشن است؛ بعد از اولین نقاشی ترنزیشن روشن می‌شود
    const [animated, setAnimated] = useState(false);

    useLayoutEffect(() => {
        const query = window.matchMedia(DESKTOP_QUERY);
        const sync = () => setIsDesktop(query.matches);
        sync();
        query.addEventListener('change', sync);
        return () => query.removeEventListener('change', sync);
    }, []);

    useEffect(() => afterNextPaint(() => setAnimated(true)), []);

    // چت کناری برای مهمان هم هست (ChatSessionContext حالت مهمان را خودش دارد)
    useLayoutEffect(() => {
        if (!isExplore) return;
        if (window.matchMedia(DESKTOP_QUERY).matches) {
            setOpen(true);
            setDocked(true);
            setMounted(true);
        }
    }, [isExplore, setOpen, setDocked]);

    // پنل فقط با transform جابه‌جا می‌شود؛ جا باز/بسته کردن گرید (دسکتاپ) یک‌بار، یک فریم بعد
    // از شروع کشیدن پنل — انیمیشن روی GPU ادامه می‌دهد و چیدمان گرید وسطش قطعش نمی‌کند
    useEffect(() => {
        const wantDocked = isExplore && isDesktop && open;
        if (wantDocked === docked) return;
        return afterNextPaint(() => setDocked(wantDocked));
    }, [isExplore, isDesktop, open, docked, setDocked]);

    // چت با اولین باز شدن ساخته می‌شود (مثل قبل) تا موشن لوگو و متن بالای chat input همان
    // لحظه دیده شود؛ یک فریم بعد از شروع کشیدن پنل تا ساختنش انیمیشن را عقب نیندازد
    useEffect(() => {
        if (mounted || !open) return;
        return afterNextPaint(() => setMounted(true));
    }, [open, mounted]);

    useEffect(() => {
        if (pathname === '/chat' || pathname?.startsWith('/chat/')) setOpen(false);
    }, [pathname, setOpen]);

    const content = (
        <>
            <div className={`${styles.wrapper} ${iransansxvf.className}`} style={{ flexDirection: 'row' }}>
                <AppSidebar />
                <div className={`${styles.applicationView} ${isExplore ? `${styles.applicationViewFill} ${exploreStyles.viewUnderBar}` : ''}`}>
                    <div className={`${styles.outlet} ${isExplore ? `${styles.outletFill} ${styles.outletLock}` : ''} ${isCheckout ? styles.outletFill : ''}`}>
                        <PageMaintenanceBoundary>
                        {isExplore ? (
                            <div className={exploreStyles.exploreLayout} dir={contentDir}>
                                <div className={`${exploreStyles.exploreOutlet} ${docked ? exploreStyles.outletDocked : ''}`}>{children}</div>
                                <button
                                    type="button"
                                    className={`${exploreStyles.chatBackdrop} ${open ? exploreStyles.open : ''}`}
                                    aria-label="Close chat"
                                    aria-hidden={!open}
                                    tabIndex={open ? 0 : -1}
                                    onClick={() => setOpen(false)}
                                />
                                <aside
                                    className={`${exploreStyles.chatPanel} ${open ? exploreStyles.open : ''} ${animated ? '' : exploreStyles.instant}`}
                                    inert={!open}
                                >
                                    <div className={exploreStyles.panelContent}>
                                        {mounted ? (
                                            <ChatSessionProvider scope={{ kind: 'personal' }}>
                                                <PersonalChatView layout="slide" />
                                            </ChatSessionProvider>
                                        ) : null}
                                    </div>
                                </aside>
                            </div>
                        ) : children}
                        </PageMaintenanceBoundary>
                    </div>
                </div>
            </div>
            {/* Intercepted /explore/<slug> renders the detail modal through this slot */}
            {isTemplateDetail ? modal : null}
            <QaConsole />
            <DeveloperToolsHost />
        </>
    );

    if (isExplore) {
        return <ExploreSearchProvider>{content}</ExploreSearchProvider>;
    }

    return content;
}
