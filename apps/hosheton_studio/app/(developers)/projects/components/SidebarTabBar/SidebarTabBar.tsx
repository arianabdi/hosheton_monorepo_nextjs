'use client';

import type { ReactNode } from 'react';
import { LuX } from 'react-icons/lu';
import styles from './SidebarTabBar.module.scss';

export type SidebarTab<T extends string> = {
    id: T;
    icon: ReactNode;
    title: string;
};

/**
 * نوار تب سایدبار — مشترک بین سایدبار ورک‌فلو (تنظیمات نود/پردازش‌ها/چت تیم)
 * و پنل چت پروژه (تاریخچه چت/پردازش‌ها/چت تیم) تا هر دو دقیقاً یکی باشند.
 */
export function SidebarTabBar<T extends string>({
    tabs,
    active,
    onSelect,
    onClose,
    closeLabel,
    ariaLabel,
}: {
    tabs: SidebarTab<T>[];
    active: T | null;
    onSelect: (id: T) => void;
    /** دکمه بستن بعد از جداکننده (مثلاً موبایل) */
    onClose?: () => void;
    closeLabel?: string;
    ariaLabel?: string;
}) {
    return (
        <div className={styles.bar} role="tablist" aria-label={ariaLabel}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.id}
                    className={`${styles.segment} ${active === tab.id ? styles.segmentActive : ''}`}
                    title={tab.title}
                    aria-label={tab.title}
                    onClick={() => onSelect(tab.id)}
                >
                    {tab.icon}
                </button>
            ))}
            {onClose ? (
                <>
                    <span className={styles.divider} aria-hidden />
                    <button
                        type="button"
                        className={styles.shortcut}
                        title={closeLabel}
                        aria-label={closeLabel}
                        onClick={onClose}
                    >
                        <LuX />
                    </button>
                </>
            ) : null}
        </div>
    );
}
