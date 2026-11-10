'use client'
import styles from './header.module.scss';
import ProfileMenu from "@/app/components/header/components/ProfileMenu/ProfileMenu";
import NotificationPopup from "@/app/components/header/components/NotificationPopup/NotificationPopup";
import HeaderSearch from "@/app/components/header/components/HeaderSearch/HeaderSearch";
import {useRouter, usePathname} from "next/navigation";
import React, {useEffect} from "react";
import {IoMdMenu} from "react-icons/io";
import Image from 'next/image';
import UsagePopup from "@/app/components/header/components/UsagePopup/UsagePopup";
import {isProjectWorkspacePath} from "@/app/(developers)/projects/lib/project-workspace-path";
import {useMobileShellStore} from "@/app/zustand/store/useMobileShellStore";
import {useAppStore} from "@/app/zustand/store/useAppStore";
import LogoDark from "@/app/assets/hooshetun/logo-dark.svg";
import LogoLight from "@/app/assets/hooshetun/logo-light.svg";
import {useTranslation} from 'react-i18next';


type HeaderProps = {
    showMobileShellToggle?: boolean;
};

export default function Header({showMobileShellToggle = false}: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const {t} = useTranslation('common');
    const { theme } = useAppStore();
    const size = 24;
    const isEditorWorkspace = isProjectWorkspacePath(pathname);
    const {
        sidebarOpen,
        editorPanelOpen,
        toggleSidebar,
        toggleEditorPanel,
        closeAll,
    } = useMobileShellStore();

    useEffect(() => {
        if (showMobileShellToggle) {
            closeAll();
        }
    }, [pathname, showMobileShellToggle, closeAll]);

    const handleMobileShellToggle = () => {
        if (isEditorWorkspace) {
            toggleEditorPanel();
        } else {
            toggleSidebar();
        }
    };

    const isShellOpen = isEditorWorkspace ? editorPanelOpen : sidebarOpen;

    return (
        <header className={`${styles.header}`}>
            <div className={styles.headerStart}>
                {showMobileShellToggle && (
                    <button
                        type="button"
                        className={`${styles.mobileMenuBtn} ${isShellOpen ? styles.mobileMenuBtnActive : ''}`}
                        onClick={handleMobileShellToggle}
                        aria-label={isEditorWorkspace ? t('open_editor_panel') : t('open_menu')}
                        aria-expanded={isShellOpen}
                    >
                        <IoMdMenu size={size} color={"var(--icon-color)"}/>
                    </button>
                )}
                <button
                    type="button"
                    className={styles.logoBtn}
                    onClick={() => router.push('/explore')}
                    aria-label={t('home_usage')}
                    title={t('home_usage_short')}
                >
                    <Image
                        src={theme === 'dark' ? LogoLight : LogoDark}
                        alt={t('brand')}
                        className={styles.brandLogo}
                    />
                </button>
            </div>
            <div className={styles.headerCenter}>
                <HeaderSearch />
            </div>
            <div className={styles.headerIcons}>
                <div className={styles.desktopNotification}>
                    <NotificationPopup />
                </div>
                <UsagePopup/>
                <ProfileMenu/>
            </div>

        </header>
    );
}


export function Logs({theme, token, fullname, font}: any) {
    return (
        <div className={styles.logs}>
            {
                process.env.NODE_ENV === 'development' ?
                    <div>
                        <span>theme: {theme || 'NULL'}</span>
                        <span>token: {token || 'NULL'}</span>
                        <span>fullName: {fullname || 'NULL'}</span>
                        <span>font: {font || 'NULL'}</span>
                    </div> : ''
            }
        </div>
    )
}