'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../SimpleLineTabs/SimpleLineTabs.module.scss';

export interface SimpleLineNavItem {
    href: string;
    label: string;
}

interface SimpleLineNavProps {
    items: SimpleLineNavItem[];
    activeHref: string;
    className?: string;
}

export default function SimpleLineNav({ items, activeHref, className }: SimpleLineNavProps) {
    return (
        <nav className={`${styles.tabBar} ${className || ''}`} aria-label="زیرمنو">
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.tab} ${activeHref === item.href ? styles.active : ''}`}
                    aria-current={activeHref === item.href ? 'page' : undefined}
                >
                    {item.label}
                </Link>
            ))}
        </nav>
    );
}
