'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './sidebar.module.scss';
import { LuChevronDown } from 'react-icons/lu';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { NaslyarLogo } from '@/assets/images/svg/naslyar_logo';
import SidebarFooter from './components/SidebarFooter';
import type { NavItem } from '@/app/config/navigation';
import { filterNavItemsByApp } from '@/app/config/navigation-utils';

const APP_BADGE_LABELS: Record<string, string> = {
    lingeeko: 'Lingeeko',
    hosheton: 'Hosheton',
    taskvision: 'TaskVision',
    openforex: 'OpenForex',
    filkosh: 'Filkosh',
};

interface SidebarProps {
    navItems: NavItem[];
    isRTL?: boolean;
}

/** Exact match, or prefix match unless a sibling sub-route owns the path (e.g. /support vs /support/requests). */
function isSubNavActive(href: string, pathname: string, siblingHrefs: string[]): boolean {
    if (pathname === href) return true;
    if (!pathname.startsWith(`${href}/`)) return false;

    const ownedBySibling = siblingHrefs.some(
        (sibling) =>
            sibling !== href &&
            sibling.startsWith(`${href}/`) &&
            (pathname === sibling || pathname.startsWith(`${sibling}/`)),
    );
    return !ownedBySibling;
}

const Sidebar = ({ navItems, isRTL = false }: SidebarProps) => {
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const pathname = usePathname();
    const { appName, appVariant, baseUrl, name, sidebarOpen, setSidebarOpen } = useAppStore();

    useEffect(() => {
        if (isRTL) {
            document.documentElement.dir = 'rtl';
            document.documentElement.lang = 'fa';
        } else {
            document.documentElement.dir = 'ltr';
            document.documentElement.lang = 'en';
        }
    }, [isRTL]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname, setSidebarOpen]);

    useEffect(() => {
        const activeParents = navItems
            .filter((item) =>
                item.subItems?.some((sub) => isSubNavActive(sub.href, pathname, item.subItems!.map((s) => s.href))),
            )
            .map((item) => item.href);

        if (activeParents.length) {
            setExpandedMenus((prev) => Array.from(new Set([...prev, ...activeParents])));
        }
    }, [pathname, navItems]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && sidebarOpen) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [sidebarOpen, setSidebarOpen]);

    const toggleMenu = (menuKey: string) => {
        setExpandedMenus((prev) =>
            prev.includes(menuKey)
                ? prev.filter((item) => item !== menuKey)
                : [...prev, menuKey]
        );
    };

    const isActive = (href: string) => pathname === href;

    const isSubItemActive = (subItems?: NavItem['subItems']) => {
        if (!subItems?.length) return false;
        const hrefs = subItems.map((s) => s.href);
        return subItems.some((subItem) => isSubNavActive(subItem.href, pathname, hrefs));
    };

    const visibleItems = filterNavItemsByApp(navItems, appName, appVariant, baseUrl);

    return (
        <>
            {sidebarOpen && (
                <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
            )}

            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''} ${isRTL ? styles.rtl : ''}`}>
                <div className={styles.brand}>
                    <div
                        className={styles.brandLogo}
                        dangerouslySetInnerHTML={{ __html: NaslyarLogo }}
                    />
                    {name || appName ? (
                        <span className={styles.appBadge}>{name || APP_BADGE_LABELS[appName] || appName}</span>
                    ) : null}
                </div>

                <nav className={styles.nav} aria-label="منوی اصلی">
                    <ul className={styles.navList}>
                        {visibleItems.map((item) => {
                            const hasSubItems = Boolean(item.subItems?.length);
                            const menuKey = item.href;
                            const isExpanded = expandedMenus.includes(menuKey);
                            const isItemActive = isActive(item.href);
                            const isParentActive = isSubItemActive(item.subItems);

                            return (
                                <React.Fragment key={`${item.href}-${item.title}`}>
                                    {item.dividerBefore ? (
                                        <li className={styles.navDivider} role="separator" aria-hidden="true" />
                                    ) : null}
                                    <li className={styles.navItem}>
                                    {hasSubItems ? (
                                        <>
                                            <button
                                                type="button"
                                                className={`${styles.navButton} ${
                                                    isParentActive ? styles.active : ''
                                                }`}
                                                onClick={() => toggleMenu(menuKey)}
                                                aria-expanded={isExpanded}
                                            >
                                                {item.icon && (
                                                    <span className={styles.navIcon}>
                                                        <item.icon size={18} strokeWidth={1.75} />
                                                    </span>
                                                )}
                                                <span className={styles.navTitle}>{item.title}</span>
                                                <span className={`${styles.chevron} ${isExpanded ? styles.rotated : ''}`}>
                                                    <LuChevronDown size={16} />
                                                </span>
                                            </button>
                                            <div
                                                className={`${styles.subNavWrap} ${
                                                    isExpanded ? styles.subNavOpen : ''
                                                }`}
                                            >
                                                <ul className={styles.subNavList}>
                                                    {item.subItems?.map((subItem) => {
                                                        const siblingHrefs = item.subItems!.map((s) => s.href);
                                                        const subActive = isSubNavActive(subItem.href, pathname, siblingHrefs);
                                                        return (
                                                        <li key={subItem.href}>
                                                            <Link
                                                                href={subItem.href}
                                                                className={`${styles.subNavLink} ${
                                                                    subActive ? styles.active : ''
                                                                }`}
                                                            >
                                                                <span className={styles.subDot} aria-hidden />
                                                                <span>{subItem.title}</span>
                                                            </Link>
                                                        </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            className={`${styles.navLink} ${
                                                isItemActive ? styles.active : ''
                                            }`}
                                        >
                                            {item.icon && (
                                                <span className={styles.navIcon}>
                                                    <item.icon size={18} strokeWidth={1.75} />
                                                </span>
                                            )}
                                            <span className={styles.navTitle}>{item.title}</span>
                                        </Link>
                                    )}
                                    </li>
                                    {item.dividerAfter ? (
                                        <li className={styles.navDivider} role="separator" aria-hidden="true" />
                                    ) : null}
                                </React.Fragment>
                            );
                        })}
                    </ul>
                </nav>

                <SidebarFooter />
            </aside>
        </>
    );
};

export default Sidebar;
