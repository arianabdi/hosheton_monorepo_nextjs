'use client';

import React, { useEffect, useState } from 'react';
import { MdOutlineArrowDropDown } from 'react-icons/md';
import { LuExternalLink } from 'react-icons/lu';
import styles from './AppSidebar.module.scss';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useMobileShellStore } from '@/app/zustand/store/useMobileShellStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import LogoDark from '@/app/assets/hooshetun/logo-dark.svg';
import LogoLight from '@/app/assets/hooshetun/logo-light.svg';
import { useStudioNav, isStudioNavActive, type StudioNavItem } from './studioNav';
import SidebarFooter from './SidebarFooter';
import { DeveloperMenu } from '@/app/components/developer-menu';
import MobileAppBar from '@/app/components/header/MobileAppBar';
import MobileHeaderBrand from '@/app/components/header/MobileHeaderBrand';
import MobileTabBar from './MobileTabBar';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useLoginModalStore } from '@/app/zustand/store/useLoginModalStore';
import { BannerBox, BANNER_PLACEMENTS } from '@/app/(studio)/banner';
type AppSidebarProps = {
    menu?: StudioNavItem[];
    logo?: React.ReactNode;
    footer?: React.ReactNode;
    showFooter?: boolean;
    showMobileToggle?: boolean;
};

export default function AppSidebar({
    menu,
    logo,
    footer,
    showFooter = true,
    showMobileToggle = true,
}: AppSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme } = useAppStore();
    const defaultMenu = useStudioNav();
    const items = menu ?? defaultMenu;
    const { t: tBrand } = useTranslation('common');
    const closePersonalChat = useStudioPersonalChatStore((s) => s.setOpen);
    const { sidebarOpen, toggleSidebar, setSidebarOpen, closeAll } = useMobileShellStore();
    const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
    const isMobile = useMobileViewport();
    const token = useAuthStore((s) => s.token);
    const openLoginModal = useLoginModalStore((s) => s.openLoginModal);

    useEffect(() => {
        closeAll();
    }, [pathname, closeAll]);

    const go = (link?: string, requiresAuth?: boolean) => {
        if (!link) return;
        if (requiresAuth && !token) {
            openLoginModal(link);
            setSidebarOpen(false);
            return;
        }
        if (link === '/chat' || link.startsWith('/chat/')) closePersonalChat(false);
        router.push(link);
        setSidebarOpen(false);
    };

    return (
        <>
            {showMobileToggle && isMobile && <MobileAppBar />}
            {showMobileToggle && isMobile && <MobileTabBar />}

            {sidebarOpen && (
                <div
                    className={`${styles.mobileOverlay} ${styles.open}`}
                    onClick={toggleSidebar}
                />
            )}

            <aside className={`${styles.verticalMenu} ${sidebarOpen ? styles.open : ''}`}>
                {isMobile ? (
                    <div className={styles.logoWrapMobile}>
                        <MobileHeaderBrand onLogoClick={() => go('/explore')} fixedLayout />
                    </div>
                ) : (
                    <div className={styles.logoWrap}>
                        {logo ?? (
                            <button
                                type="button"
                                className={styles.logoBtn}
                                onClick={() => go('/explore')}
                                aria-label={tBrand('brand_studio')}
                            >
                                <Image
                                    src={theme === 'dark' ? LogoLight : LogoDark}
                                    alt={tBrand('brand')}
                                    className={styles.brandLogo}
                                />
                            </button>
                        )}
                    </div>
                )}

                <nav className={styles.navScroll}>
                    <ul className={styles.menuList}>
                        {items.map((item, index) => {
                            if (item.section) {
                                return (
                                    <li key={`section-${item.section}-${index}`} className={styles.sectionTitle}>
                                        {item.section}
                                    </li>
                                );
                            }

                            if (item.divider) {
                                return <li key={`divider-${index}`} className={styles.divider} />;
                            }

                            const active = isStudioNavActive(pathname, item.link);
                            const hasSub = Boolean(item.subMenu?.length);

                            if (item.external && item.href) {
                                return (
                                    <li key={item.href} className={styles.menuItem}>
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.menuLink}
                                            onClick={() => setSidebarOpen(false)}
                                        >
                                            <span className={styles.ico}>
                                                {item.icon}
                                                <span>{item.text}</span>
                                                {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                                            </span>
                                            <LuExternalLink size={14} className={styles.externalIcon} />
                                        </a>
                                    </li>
                                );
                            }

                            return (
                                <li
                                    key={item.link || item.text || index}
                                    className={`${styles.menuItem} ${active ? styles.active : ''}`}
                                >
                                    <button
                                        type="button"
                                        className={styles.menuLink}
                                        onClick={() => {
                                            if (hasSub) {
                                                setOpenSubmenu(openSubmenu === index ? null : index);
                                                return;
                                            }
                                            go(item.link, item.requiresAuth);
                                        }}
                                    >
                                        <span className={styles.ico}>
                                            {item.icon}
                                            <span>{item.text}</span>
                                            {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                                        </span>
                                        {hasSub && <MdOutlineArrowDropDown size={18} />}
                                    </button>
                                    {hasSub && openSubmenu === index && (
                                        <ul className={styles.submenu}>
                                            {item.subMenu?.map((sub, subIndex) => (
                                                <li key={sub.link || subIndex}>
                                                    <button
                                                        type="button"
                                                        className={styles.submenuLink}
                                                        onClick={() => go(sub.link, sub.requiresAuth)}
                                                    >
                                                        {sub.text}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* باکس بنر مربعی — پین‌شده پایین سایدبار (با منو اسکرول نمی‌شود) */}
                <BannerBox placementKey={BANNER_PLACEMENTS.SIDEBAR_SQUARE} variant="square" className={styles.bannerSlot} />

                {footer ?? (showFooter ? <SidebarFooter /> : null)}
            </aside>
            <DeveloperMenu />
        </>
    );
}
