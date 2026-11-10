'use client'

import type { ReactNode } from 'react';
import styles from './layout.module.scss';
import AppSidebar from "@/app/components/sidebar/AppSidebar";
import PageTransition from "@/app/components/PageTransition";
import {AuthCheckingScreen, useGuestRouteAccess} from "@/app/components/guest/useGuestRouteAccess";
import {GuestSignInPanel} from "@/app/components/guest/GuestSignInPanel";
import {ProfileCompletionGuard} from "@/app/components/ProfileCompletionGuard";
import {iransansxvf} from "@my-workspace/fonts/iransansxvf";
import MobileAppBar from "@/app/components/header/MobileAppBar";
import {usePathname} from "next/navigation";
import {isFullscreenShellPath, isProjectWorkspacePath} from "@/app/(developers)/projects/lib/project-workspace-path";
import {QaConsole} from "@/app/components/qa-testing/QaConsole";
import {DeveloperToolsHost} from "@/app/components/developer-menu";
import PageMaintenanceBoundary from "@/app/components/MaintenanceGate/PageMaintenanceBoundary";

function isPersonalChatPath(pathname: string | null): boolean {
    return pathname === '/chat' || Boolean(pathname?.startsWith('/chat/'));
}

function isMessagesPath(pathname: string | null): boolean {
    return pathname === '/messages' || Boolean(pathname?.startsWith('/messages/'));
}

function isAdsVideoPath(pathname: string | null): boolean {
    return pathname === '/ads-video' || Boolean(pathname?.startsWith('/ads-video/'));
}

function isTemplatesGalleryPath(pathname: string | null): boolean {
    return pathname === '/templates' || pathname === '/templates2';
}

export default function DeveloperLayout({children}: { children: ReactNode }) {
    const pathname = usePathname();
    const isFullscreenShell = isFullscreenShellPath(pathname);
    const isProjectWorkspace = isProjectWorkspacePath(pathname);
    const isTemplatesGallery = isTemplatesGalleryPath(pathname);
    const isPersonalChat = isPersonalChatPath(pathname);
    const isMessages = isMessagesPath(pathname);
    // استودیو ویدیو تبلیغاتی هم مثل چت، کل ارتفاع محتوا را می‌گیرد
    const fillMain = isTemplatesGallery || isPersonalChat || isMessages || isAdsVideoPath(pathname);
    // مهمان: صفحه‌های قابل گشت‌وگذار همان صفحه‌اند؛ بقیه داخل همین قاب پنل ورود نشان می‌دهند (نه redirect)
    const access = useGuestRouteAccess(pathname);
    if (access.checking) return <AuthCheckingScreen />;
    const content = access.blocked
        ? <GuestSignInPanel returnTo={pathname} />
        : <PageMaintenanceBoundary>{children}</PageMaintenanceBoundary>;

    if (isFullscreenShell) {
        return (
            <>
                {isProjectWorkspace && !access.blocked ? <MobileAppBar menuMode="editor" /> : null}
                <div className={`${styles.editorShell} ${iransansxvf.className}`}>
                    <div className={isProjectWorkspace ? styles.editorOutlet : styles.fullscreenOutlet}>
                        {content}
                    </div>
                </div>
                {/* کنسول QA / Developer Tools — در شل تمام‌صفحه هم از استور باز می‌شوند */}
                <QaConsole />
                <DeveloperToolsHost />
            </>
        );
    }

    return (
        <>
            <ProfileCompletionGuard>
            <div className={`${styles.wrapper} ${iransansxvf.className}`} style={{flexDirection: 'row'}}>
                <AppSidebar />
                <div className={`${styles.applicationView} ${fillMain ? styles.applicationViewFill : ''} ${isPersonalChat ? styles.applicationViewUnderBar : ''}`}>
                    <PageTransition waitForData fillHeight={fillMain}>
                        <div className={`${styles.outlet} ${fillMain ? `${styles.outletLock} ${styles.outletFill}` : ''}`}>
                            {content}
                        </div>
                    </PageTransition>
                </div>
            </div>
            <QaConsole />
            <DeveloperToolsHost />
            </ProfileCompletionGuard>
        </>
    );
}
