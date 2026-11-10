'use client'

import React, {useEffect, useRef} from "react";
import styles from "./layout.module.scss";
import {usePathname, useRouter} from "next/navigation";
import {iransansxvf} from "@my-workspace/fonts/iransansxvf";
import { useTranslation } from 'react-i18next';

export default function Layout({children}: any) {
    const router = useRouter();
    const pathname = usePathname();
    const currentTab = pathname.split('/').pop();
    const tabsRef = useRef<HTMLElement>(null);

    const { t } = useTranslation('settings');
    const navItems = [
        { id: 'profile', label: t('account_info') },
        { id: 'security', label: t('security') },
    ];

    useEffect(() => {
        const root = tabsRef.current;
        if (!root || window.matchMedia('(min-width: 769px)').matches) return;

        const active = root.querySelector(`.${styles.active}`) as HTMLElement | null;
        if (!active) return;

        const rootRect = root.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        const delta =
            activeRect.left + activeRect.width / 2 - (rootRect.left + rootRect.width / 2);

        root.scrollBy({ left: delta, behavior: 'smooth' });
    }, [currentTab]);

    return (
        <div className={`${styles.settingsContainer} ${iransansxvf.className}`}>
            <aside className={styles.sidebar} ref={tabsRef}>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => router.push(`/settings/${item.id}`)}
                        className={`${styles.navButton} ${currentTab === item.id ? styles.active : ''}`}
                    >
                        <span>{item.label}</span>
                    </button>
                ))}
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
