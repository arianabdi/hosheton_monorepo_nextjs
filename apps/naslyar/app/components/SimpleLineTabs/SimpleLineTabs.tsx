'use client';

import React from 'react';
import styles from './SimpleLineTabs.module.scss';

export interface SimpleLineTab {
    id: string;
    label: string;
}

interface SimpleLineTabsProps {
    tabs: SimpleLineTab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export default function SimpleLineTabs({ tabs, activeTab, onChange, className }: SimpleLineTabsProps) {
    return (
        <div className={`${styles.tabBar} ${className || ''}`} role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
