'use client'

import React, {useLayoutEffect} from "react";
import { usePathname } from 'next/navigation';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import style from './header.module.scss'
import ProfileMenu from "@/app/components/AppHeader/components/ProfileMenu/ProfileMenu";
import {useAppStore} from "@/app/zustand/store/useAppStore";
import { getPageTitleFromPath } from '@/app/config/navigation';

export const AppHeader = () => {
    const pathname = usePathname();
    const { theme, setTheme, toggleSidebar } = useAppStore();
    const pageTitle = getPageTitleFromPath(pathname);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    };

    useLayoutEffect(() => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [theme]);

    return (
        <div className={style.headerContainer}>
            <div className={style.actions}>
                <ProfileMenu onToggleTheme={toggleTheme} theme={theme} />
            </div>

            <div className={style.headerDock}>
                <button
                    type="button"
                    className={style.menuToggle}
                    onClick={toggleSidebar}
                    aria-label="باز و بسته کردن منو"
                >
                    <HiOutlineMenuAlt2 size={20} />
                </button>
                <span className={style.pageTitle}>{pageTitle}</span>
            </div>
        </div>
    )
}
