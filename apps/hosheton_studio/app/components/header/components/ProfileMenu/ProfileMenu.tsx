'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './profileMenu.module.scss';
import { useAuthStore } from "@/app/zustand/store/authStore";
import {
    HiOutlineUserCircle,
} from "react-icons/hi";
import {
    LuLogOut,
    LuLogIn,
    LuMoon,
    LuSettings,
    LuSun,
    LuUser,
    LuLifeBuoy,
    LuBell,
    LuMessageSquare,
    LuNewspaper,
    LuBookOpen,
    LuLayoutGrid,
} from 'react-icons/lu';
import { MdLanguage } from 'react-icons/md';
import { iransans } from "@my-workspace/fonts/iransans";
import { useRouter } from "next/navigation";
import { useTranslation } from 'react-i18next';
import { useAppStore } from "@/app/zustand/store/useAppStore";
import { useStudioPersonalChatStore } from '@/app/zustand/store/useStudioPersonalChatStore';
import { notificationApi } from '@/app/(marketplace)/lib/marketplace-api';
import { useDirectMessagesStore } from '@/app/zustand/store/useDirectMessagesStore';
import { useDirectMessagesRealtime } from '@/app/hooks/useDirectMessagesRealtime';
import { ModalHelper } from '@my-workspace/components';
import { LanguagePickerPanel } from '@/app/components/LanguageSwitcher/LanguageSwitcher';
import { SUPPORTED_LANGUAGES } from '@/app/lib/i18n/config';

type ProfileMenuProps = {
    placement?: 'bottom' | 'top';
    variant?: 'default' | 'rail';
    triggerLabel?: string;
    triggerClassName?: string;
    iconSize?: number;
    /** منوی هدر بلاگ/مستندات: بدون اعلان‌ها، پیام‌ها، تنظیمات و لینک بلاگ/مستندات؛ به‌جایش «بازگشت به استودیو» */
    contentArea?: boolean;
};

export default function ProfileMenu({
    placement = 'bottom',
    variant = 'default',
    triggerLabel,
    triggerClassName,
    iconSize,
    contentArea = false,
}: ProfileMenuProps) {
    const router = useRouter();
    const { t } = useTranslation('header');
    const { t: tc } = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);
    const [languageModalOpen, setLanguageModalOpen] = useState(false);
    const { theme, setTheme, fullname, avatar, email, lang, userId } = useAppStore();
    const { logout, token } = useAuthStore();
    const loggedIn = Boolean(token);
    const profileSettingsHref = loggedIn && userId ? `/creators/${userId}?tab=profile` : '/login';
    const menuRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    // پیام‌های خوانده‌نشده زنده از سوکت (dm:unread) — نقطهٔ قرمز آواتار + شمارندهٔ منو
    useDirectMessagesRealtime(!contentArea);
    const storeUnreadMessages = useDirectMessagesStore((s) => s.unreadTotal);
    const unreadMessages = loggedIn && !contentArea ? storeUnreadMessages : 0;
    const [alignStart, setAlignStart] = useState(false);

    const currentLanguage =
        SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

    const toggleMenu = () => setIsOpen((prev) => !prev);

    const navigate = (path: string) => {
        router.push(path);
        setIsOpen(false);
    };

    const handleLogout = async () => {
        await logout();
        useStudioPersonalChatStore.getState().setOpen(false);
        setIsOpen(false);
        router.push('/explore');
    };

    const handleLogin = () => {
        navigate('/login');
    };

    const openLanguageModal = () => {
        setIsOpen(false);
        window.setTimeout(() => setLanguageModalOpen(true), 50);
    };

    useLayoutEffect(() => {
        const media = window.matchMedia('(max-width: 768px)');
        const sync = () => setIsMobileViewport(media.matches);
        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
                return;
            }
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useLayoutEffect(() => {
        if (!isOpen || !menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const menuWidth = variant === 'rail' ? 280 : 300;
        const pad = 8;
        const rtl = getComputedStyle(menuRef.current).direction === 'rtl';
        if (rtl) {
            setAlignStart(rect.left + menuWidth > window.innerWidth - pad);
        } else {
            setAlignStart(rect.right - menuWidth < pad);
        }
    }, [isOpen, variant]);

    useEffect(() => {
        if (!token || contentArea) {
            setUnreadCount(0);
            return;
        }
        notificationApi.getUnreadCount()
            .then((data) => setUnreadCount(data.count ?? 0))
            .catch(() => setUnreadCount(0));
    }, [token, isOpen, contentArea]);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }, [theme]);

    const portalHeaderMenu = isOpen && isMobileViewport && placement === 'bottom' && variant === 'default';
    const dropdown = isOpen ? (
                <div
                    ref={dropdownRef}
                    className={`${styles.dropdown} ${placement === 'top' ? styles.dropdownTop : ''} ${variant === 'rail' ? styles.dropdownRail : ''} ${alignStart ? styles.dropdownAlignStart : ''} ${portalHeaderMenu ? styles.dropdownPortaled : ''}`}
                >
                    <div className={styles.profileInfo}>
                        {loggedIn && avatar ? (
                            <img
                                src={avatar}
                                alt={fullname || 'user_avatar'}
                                className={styles.dropdownAvatar}
                            />
                        ) : (
                            <span className={styles.dropdownAvatarFallback} aria-hidden>
                                <HiOutlineUserCircle size={28} />
                            </span>
                        )}
                        <div className={styles.userDetails}>
                            {loggedIn ? (
                                <>
                                    <div className={styles.fullName}>{fullname || tc('user')}</div>
                                    <div className={styles.email}>{email || '—'}</div>
                                </>
                            ) : (
                                <>
                                    <div className={styles.fullName}>{t('not_signed_in')}</div>
                                    <div className={styles.email}>{t('guest_hint')}</div>
                                </>
                            )}
                        </div>
                    </div>

                    {loggedIn && (
                    <div className={styles.menuGroup}>
                        <button type="button" className={styles.menuItem} onClick={() => navigate(profileSettingsHref)}>
                            <LuUser className={styles.icon} />
                            <span>{t('profile')}</span>
                        </button>
                        {!contentArea && (
                        <>
                        <button type="button" className={styles.menuItem} onClick={() => navigate('/notifications')}>
                            <LuBell className={styles.icon} />
                            <span>{t('notifications')}</span>
                            {unreadCount > 0 && (
                                <span className={styles.unreadBadge}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                        <button type="button" className={styles.menuItem} onClick={() => navigate('/messages')}>
                            <LuMessageSquare className={styles.icon} />
                            <span>{t('messages')}</span>
                            {unreadMessages > 0 && (
                                <span className={styles.unreadBadge}>
                                    {unreadMessages > 99 ? '99+' : unreadMessages}
                                </span>
                            )}
                        </button>
                        </>
                        )}
                    </div>
                    )}

                    {loggedIn && <div className={styles.divider} />}

                    <div className={styles.menuGroup}>
                        <button type="button" className={styles.menuItem} onClick={toggleTheme}>
                            <span className={styles.menuItemStart}>
                                {theme === 'dark' ? <LuMoon className={styles.icon} /> : <LuSun className={styles.icon} />}
                                <span>{tc('theme_toggle')}</span>
                            </span>
                            <span className={styles.menuItemMeta}>{theme === 'dark' ? tc('theme_dark') : tc('theme_light')}</span>
                        </button>
                        <button type="button" className={styles.menuItem} onClick={openLanguageModal}>
                            <span className={styles.menuItemStart}>
                                <MdLanguage className={styles.icon} />
                                <span>{tc('language')}</span>
                            </span>
                            <span className={styles.menuItemMeta}>{currentLanguage.nativeLabel}</span>
                        </button>
                        {loggedIn && !contentArea && (
                        <button type="button" className={styles.menuItem} onClick={() => navigate(profileSettingsHref)}>
                            <LuSettings className={styles.icon} />
                            <span>{t('settings')}</span>
                        </button>
                        )}
                        <button type="button" className={styles.menuItem} onClick={() => navigate('/support')}>
                            <LuLifeBuoy className={styles.icon} />
                            <span>{t('support')}</span>
                        </button>
                    </div>

                    <div className={styles.divider} />

                    {/* بلاگ و آموزش‌ها layout جدای خود را دارند (app/(blog)) — بدون سایدبار استودیو */}
                    <div className={styles.menuGroup}>
                        {contentArea ? (
                        <button type="button" className={styles.menuItem} onClick={() => navigate('/chat')}>
                            <LuLayoutGrid className={styles.icon} />
                            <span>{t('back_to_studio')}</span>
                        </button>
                        ) : (
                        <>
                        <button type="button" className={styles.menuItem} onClick={() => navigate('/blog')}>
                            <LuNewspaper className={styles.icon} />
                            <span>{t('blog')}</span>
                        </button>
                        <button type="button" className={styles.menuItem} onClick={() => navigate('/docs')}>
                            <LuBookOpen className={styles.icon} />
                            <span>{t('docs')}</span>
                        </button>
                        </>
                        )}
                    </div>

                    <div className={styles.divider} />

                    {loggedIn ? (
                        <button type="button" className={`${styles.menuItem} ${styles.logoutItem}`} onClick={() => void handleLogout()}>
                            <LuLogOut className={styles.icon} />
                            <span>{t('logout')}</span>
                        </button>
                    ) : (
                        <button type="button" className={`${styles.menuItem} ${styles.loginItem}`} onClick={handleLogin}>
                            <LuLogIn className={styles.icon} />
                            <span>{t('login')}</span>
                        </button>
                    )}
                </div>
    ) : null;

    const backdrop = (
        <button
            type="button"
            className={styles.menuBackdrop}
            aria-label={t('profile_menu')}
            onClick={() => setIsOpen(false)}
        />
    );

    return (
        <div
            className={`${styles.profileContainer} ${variant === 'rail' ? styles.profileContainerRail : ''} ${isOpen ? styles.profileContainerOpen : ''} ${iransans.className}`}
            ref={menuRef}
        >
            <ModalHelper
                open={languageModalOpen}
                onClose={() => setLanguageModalOpen(false)}
                hideCloseBtn
                size="sm"
                sheetTitle={tc('language')}
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

            {isOpen && typeof document !== 'undefined'
                ? createPortal(
                    portalHeaderMenu ? (
                        <>
                            {backdrop}
                            {dropdown}
                        </>
                    ) : backdrop,
                    document.body,
                )
                : null}

            <button
                type="button"
                className={triggerClassName || `${styles.triggerBtn} ${variant === 'rail' ? styles.triggerBtnRail : ''}`}
                onClick={toggleMenu}
                aria-label={triggerLabel || t('profile_menu')}
            >
                {triggerLabel ? (
                    triggerLabel
                ) : loggedIn && avatar ? (
                    <img
                        src={avatar}
                        alt={fullname || 'user'}
                        className={styles.triggerAvatar}
                        style={iconSize ? { width: iconSize, height: iconSize } : undefined}
                    />
                ) : (
                    <HiOutlineUserCircle
                        size={iconSize ?? (variant === 'rail' ? 22 : 28)}
                        color="var(--icon-color)"
                    />
                )}
            </button>
            {unreadMessages > 0 && <span className={styles.unreadDot} aria-hidden />}

            {!portalHeaderMenu ? dropdown : null}
        </div>
    );
}
