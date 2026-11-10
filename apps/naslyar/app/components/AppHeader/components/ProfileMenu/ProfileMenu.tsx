'use client'

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { FiUser, FiMoon, FiSun, FiSettings, FiHeadphones, FiLogOut } from 'react-icons/fi';
import styles from './profileMenu.module.scss';
import { useAuthStore } from '@/app/zustand/store/authStore';
import { useAppStore } from '@/app/zustand/store/useAppStore';

interface ProfileMenuProps {
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
}

type DropdownStyle = {
    top: number;
    left: number;
    width: number;
};

const VIEWPORT_PADDING = 12;
const DROPDOWN_WIDTH = 260;

function clampDropdownPosition(triggerRect: DOMRect): DropdownStyle {
    const viewportWidth = window.innerWidth;
    const width = Math.min(DROPDOWN_WIDTH, viewportWidth - VIEWPORT_PADDING * 2);

    // Prefer aligning the menu's trailing edge with the trigger (RTL-friendly).
    let left = triggerRect.right - width;

    if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
    }
    if (left + width > viewportWidth - VIEWPORT_PADDING) {
        left = viewportWidth - VIEWPORT_PADDING - width;
    }

    return {
        top: triggerRect.bottom + 8,
        left,
        width,
    };
}

const ProfileMenu = ({ theme, onToggleTheme }: ProfileMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<DropdownStyle | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { logout } = useAuthStore();
    const { fullname, email, username } = useAppStore();

    const displayName = fullname || username || 'مدیر سیستم';
    const displayEmail = email || '—';

    const updateDropdownPosition = useCallback(() => {
        const trigger = buttonRef.current;
        if (!trigger) return;
        setDropdownStyle(clampDropdownPosition(trigger.getBoundingClientRect()));
    }, []);

    const toggleMenu = () => {
        setIsOpen((prev) => !prev);
    };

    const handleLogout = () => {
        logout();
        setIsOpen(false);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        updateDropdownPosition();

        const handleReposition = () => updateDropdownPosition();
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);

        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [isOpen, updateDropdownPosition]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                menuRef.current?.contains(target) ||
                dropdownRef.current?.contains(target)
            ) {
                return;
            }
            setIsOpen(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const dropdown = isOpen && dropdownStyle && mounted ? (
        createPortal(
            <div
                ref={dropdownRef}
                className={styles.dropdown}
                style={{
                    position: 'fixed',
                    top: dropdownStyle.top,
                    left: dropdownStyle.left,
                    width: dropdownStyle.width,
                }}
            >
                <div className={styles.profileInfo}>
                    <div className={styles.avatarCircle}>
                        <FiUser size={20} />
                    </div>
                    <div className={styles.userDetails}>
                        <div className={styles.fullName}>{displayName}</div>
                        <div className={styles.email}>{displayEmail}</div>
                    </div>
                </div>

                <div className={styles.divider} />

                <button className={styles.menuItem} onClick={onToggleTheme}>
                    {theme === 'dark' ? <FiSun className={styles.icon} /> : <FiMoon className={styles.icon} />}
                    {theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
                </button>

                <Link href="/settings/website" className={styles.menuItem} onClick={() => setIsOpen(false)}>
                    <FiSettings className={styles.icon} />
                    تنظیمات
                </Link>

                <Link href="/support" className={styles.menuItem} onClick={() => setIsOpen(false)}>
                    <FiHeadphones className={styles.icon} />
                    پشتیبانی
                </Link>

                <div className={styles.divider} />

                <button className={`${styles.menuItem} ${styles.logoutItem}`} onClick={handleLogout}>
                    <FiLogOut className={styles.icon} />
                    خروج
                </button>
            </div>,
            document.body,
        )
    ) : null;

    return (
        <div className={styles.profileContainer} ref={menuRef}>
            <button
                ref={buttonRef}
                className={styles.profileButton}
                onClick={toggleMenu}
                aria-label="منوی کاربر"
                aria-expanded={isOpen}
            >
                <FiUser size={18} />
            </button>
            {dropdown}
        </div>
    );
};

export default ProfileMenu;
