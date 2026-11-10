'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import cn from 'clsx';
import styles from './navbar.module.scss';

// Icons
import {TbBoxMultiple0, TbCheckupList, TbNotebook} from 'react-icons/tb';
import {PiLinkSimpleHorizontalBold, PiMicrophoneStage} from 'react-icons/pi';
import {CgClapperBoard, CgReadme} from 'react-icons/cg';
import {LuBookCopy, LuMessagesSquare, LuWalletCards} from 'react-icons/lu';
import {RiBook3Line, RiTestTubeFill} from 'react-icons/ri';
import {FaChalkboardTeacher, FaFilm} from 'react-icons/fa';
import { IoFlashOutline } from 'react-icons/io5';
import {GrAppsRounded, GrBook, GrDocumentTest, GrHelpBook} from 'react-icons/gr';
import {BiCameraMovie, BiChat, BiCog} from "react-icons/bi";
import {MdDynamicFeed, MdOutlineCastForEducation, MdOutlineContactSupport, MdOutlineRssFeed} from "react-icons/md";
import {LiaBinocularsSolid, LiaHandsHelpingSolid, LiaLanguageSolid} from "react-icons/lia";
import {SiGitbook} from "react-icons/si";

const size =32;
const color ='var(--header-icon-color)';

// Full list of all apps in priority order (left to right)
const ALL_APPS = [
    {
        id: 'dictionary',
        path: '/dictionary',
        icon: <LiaLanguageSolid size={size} color={color} />,
    },
    {
        id: 'feed',
        path: '/feed',
        icon: <LiaBinocularsSolid size={size} color={color} />,
    },
    {
        id: 'films',
        path: '/films',
        icon: <FaFilm size={size} color={color} />,
    },
    {
        id: 'flashcards',
        path: '/flashcard',
        icon: <LuWalletCards size={size} color={color} />,
    },
    {
        id: 'books',
        path: '/books',
        icon: <CgReadme size={size} color={color} />,
    },
    {
        id: 'teacher',
        path: '/teacher',
        icon: <MdOutlineCastForEducation size={size} color={color} />,
    },
    {
        id: 'support',
        path: '/support',
        icon: <MdOutlineContactSupport size={size} color={color} />,
    },
    {
        id: 'settings',
        path: '/settings',
        icon: <BiCog size={size} color={color} />,
    },
];

const MOBILE_NAV_ITEMS = [
    { id: 'dictionary', path: '/dictionary', icon: <TbBoxMultiple0 size={size} color="var(--icon-color)" /> },
    { id: 'feed', path: '/feed', icon: <PiLinkSimpleHorizontalBold size={size} color="var(--icon-color)" /> },
    { id: 'apps', path: '/apps', icon: <GrAppsRounded size={size} color="var(--icon-color)" /> },
];

const MOBILE_APP_ITEMS = [
    { id: 'films', path: '/films', icon: <CgClapperBoard size={size} color="var(--icon-color)" /> },
    { id: 'books', path: '/books', icon: <LuBookCopy size={size} color="var(--icon-color)" /> },
    { id: 'test', path: '/test', icon: <RiTestTubeFill size={size} color="var(--icon-color)" /> },
    { id: 'teacher', path: '/teacher', icon: <FaChalkboardTeacher size={size} color="var(--icon-color)" /> },
    { id: 'flashcards', path: '/flashcards', icon: <IoFlashOutline size={size} color="var(--icon-color)" /> },
];

export default function Taskbar() {
    const { t } = useTranslation('menu');
    const router = useRouter();
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);
    const [mobileAppsExpanded, setMobileAppsExpanded] = useState(false);

    // Desktop taskbar states
    const [visibleCount, setVisibleCount] = useState(ALL_APPS.length);
    const [isOverflowOpen, setIsOverflowOpen] = useState(false);

    // Refs for responsive measuring
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const overflowBtnRef = useRef<HTMLButtonElement>(null);
    const overflowMenuRef = useRef<HTMLDivElement>(null);
    const resizeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Check mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close overflow menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                isOverflowOpen &&
                overflowBtnRef.current &&
                !overflowBtnRef.current.contains(e.target as Node) &&
                overflowMenuRef.current &&
                !overflowMenuRef.current.contains(e.target as Node)
            ) {
                setIsOverflowOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOverflowOpen]);

    // Calculate how many icons fit in the taskbar - wrapped in useCallback to prevent recreation
    const calculateVisibleCount = useCallback(() => {
        if (!containerRef.current || itemRefs.current.length === 0 || isMobile) return;

        const containerWidth = containerRef.current.clientWidth;
        const gap = 40; // CSS gap between items
        const overflowBtnWidth = overflowBtnRef.current?.offsetWidth || 56;

        // Get widths of all app buttons (including margins)
        const widths = itemRefs.current.map((ref) => (ref?.offsetWidth || 0) + gap);

        let totalWidth = 0;
        let count = 0;

        for (let i = 0; i < widths.length; i++) {
            const wouldBeTotal = totalWidth + widths[i];
            // If this is the last item and we're showing all, no overflow needed
            if (i === widths.length - 1) {
                if (wouldBeTotal <= containerWidth) {
                    count = i + 1;
                }
                break;
            }
            // Check if current item + overflow button fits
            if (wouldBeTotal + overflowBtnWidth <= containerWidth) {
                totalWidth = wouldBeTotal;
                count = i + 1;
            } else {
                break;
            }
        }

        // Ensure at least 1 item is visible
        const newCount = Math.max(1, count);

        // Only update state if value actually changed
        setVisibleCount(prev => prev !== newCount ? newCount : prev);
    }, [isMobile]);

    // Handle resize with debouncing
    useEffect(() => {
        if (isMobile) return;

        // Initial calculation after a small delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            calculateVisibleCount();
        }, 100);

        const handleResize = () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
            resizeTimeoutRef.current = setTimeout(() => {
                calculateVisibleCount();
            }, 150);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timeoutId);
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, [calculateVisibleCount, isMobile]);

    // Recalculate when apps visibility might affect overflow button width
    useEffect(() => {
        if (!isMobile) {
            calculateVisibleCount();
        }
    }, [calculateVisibleCount, isMobile]);

    // Get visible apps and hidden apps
    const visibleApps = ALL_APPS.slice(0, visibleCount);
    const hiddenApps = ALL_APPS.slice(visibleCount);
    const showOverflow = hiddenApps.length > 0 && visibleCount < ALL_APPS.length;

    // Handle navigation
    const handleNavigate = (path: string) => {
        router.push(path);
        setIsOverflowOpen(false);
        setMobileAppsExpanded(false);
    };

    // ----- MOBILE VERSION -----
    if (isMobile) {
        return (
            <nav className={styles.mobileNav}>
                <ul className={styles.mobileNavList}>
                    {MOBILE_NAV_ITEMS.map((item) => (
                        <li key={item.id}>
                            <button
                                className={cn(styles.mobileNavItem, {
                                    [styles.mobileActive]: pathname === item.path,
                                })}
                                onClick={() => {
                                    if (item.id === 'apps') {
                                        setMobileAppsExpanded(!mobileAppsExpanded);
                                    } else {
                                        handleNavigate(item.path);
                                    }
                                }}
                            >
                                <span className={styles.mobileIcon}>{item.icon}</span>
                                <span className={styles.mobileLabel}>{t(item.id)}</span>
                            </button>

                            {/* Mobile apps submenu overlay */}
                            {item.id === 'apps' && mobileAppsExpanded && (
                                <div className={styles.mobileAppsOverlay}>
                                    <div className={styles.mobileAppsContainer}>
                                        <div className={styles.mobileAppsHeader}>
                                            <h3>{t('select_app')}</h3>
                                            <button
                                                className={styles.closeButton}
                                                onClick={() => setMobileAppsExpanded(false)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <ul className={styles.mobileAppsList}>
                                            {MOBILE_APP_ITEMS.map((app) => (
                                                <li key={app.id}>
                                                    <button
                                                        className={cn(styles.mobileAppItem, {
                                                            [styles.mobileAppActive]: pathname === app.path,
                                                        })}
                                                        onClick={() => {
                                                            handleNavigate(app.path);
                                                            setMobileAppsExpanded(false);
                                                        }}
                                                    >
                                                        <span className={styles.mobileAppIcon}>{app.icon}</span>
                                                        {/*<span className={styles.mobileAppLabel}>{app.label}</span>*/}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
        );
    }

    // ----- DESKTOP TASKBAR -----
    return (
        <div className={styles.taskbarWrapper}>
            <div className={styles.taskbar} ref={containerRef}>
                <div className={styles.taskbarInner}>
                    {/* Visible app icons */}
                    {visibleApps.map((app, idx) => (
                        <button
                            key={app.id}
                            ref={(el) => {
                                itemRefs.current[idx] = el;
                            }}
                            className={cn(styles.taskbarItem, {
                                [styles.active]: pathname === app.path,
                            })}
                            onClick={() => handleNavigate(app.path)}
                            title={t(app.id)}
                        >
                            <span className={styles.iconWrapper}>{app.icon}</span>
                            <span className={styles.label}>{t(app.id)}</span>
                        </button>
                    ))}

                    {/* Overflow "Apps" button (shows hidden apps) */}
                    {showOverflow && (
                        <div className={styles.overflowContainer}>
                            <button
                                ref={overflowBtnRef}
                                className={cn(styles.taskbarItem, styles.overflowBtn, {
                                    [styles.overflowOpen]: isOverflowOpen,
                                })}
                                onClick={() => setIsOverflowOpen(!isOverflowOpen)}
                                title={t('apps')}
                            >
                            <span className={styles.iconWrapper}>
                              <GrAppsRounded size={size} color={color} />
                            </span>
                                <span className={styles.label}>{t('apps')}</span>
                            </button>

                            {/* Overflow dropdown menu */}
                            {isOverflowOpen && (
                                <div className={styles.overflowMenu} ref={overflowMenuRef}>
                                    <div className={styles.overflowMenuHeader}>
                                        <span>{t('all_apps')}</span>
                                    </div>
                                    <div className={styles.overflowMenuGrid}>
                                        {hiddenApps.map((app) => (
                                            <button
                                                key={app.id}
                                                className={cn(styles.overflowMenuItem, {
                                                    [styles.active]: pathname === app.path,
                                                })}
                                                onClick={() => handleNavigate(app.path)}
                                            >
                                                <span className={styles.overflowIcon}>{app.icon}</span>
                                                <span className={styles.overflowLabel}>
                                                  {t(app.id)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}