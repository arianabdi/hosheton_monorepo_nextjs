'use client';

import type { ReactNode } from 'react';
import projectStyles from '../[projectId]/project-view.module.scss';

export type ProjectSideTab = {
    id: string;
    label: string;
    content: ReactNode;
};

type ProjectSideTabPanelClassNames = {
    root?: string;
    tabs?: string;
    tabActive?: string;
    content?: string;
};

type ProjectSideTabPanelProps = {
    tabs: ProjectSideTab[];
    activeTabId: string;
    onTabChange: (tabId: string) => void;
    /** داخل آکاردئون workflow — بدون wrapper panelBox */
    embedded?: boolean;
    /** کلاس‌های سفارشی — مثلاً استایل تب‌های video editor */
    classNames?: ProjectSideTabPanelClassNames;
};

function TabPanelBody({
    tabs,
    activeTabId,
    onTabChange,
    classNames,
}: Pick<ProjectSideTabPanelProps, 'tabs' | 'activeTabId' | 'onTabChange' | 'classNames'>) {
    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
    const tabsClass = classNames?.tabs ?? projectStyles.sidebarTabs;
    const tabActiveClass = classNames?.tabActive ?? projectStyles.tabActive;
    const contentClass = classNames?.content ?? projectStyles.sideTabContent;

    return (
        <div className={classNames?.root}>
            <div className={tabsClass}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={activeTabId === tab.id ? tabActiveClass : ''}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className={contentClass}>
                {activeTab?.content}
            </div>
        </div>
    );
}

/** تب‌پanel مشترک workflow و video editor — استایل project-view */
export function ProjectSideTabPanel({
    tabs,
    activeTabId,
    onTabChange,
    embedded = false,
    classNames,
}: ProjectSideTabPanelProps) {
    if (embedded) {
        return (
            <TabPanelBody
                tabs={tabs}
                activeTabId={activeTabId}
                onTabChange={onTabChange}
                classNames={classNames}
            />
        );
    }

    return (
        <section className={`${projectStyles.panelBox} ${projectStyles.panelOpen}`}>
            <div className={projectStyles.panelBoxBody}>
                <div className={projectStyles.sidebarScrollContent}>
                    <TabPanelBody
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onTabChange={onTabChange}
                        classNames={classNames}
                    />
                </div>
            </div>
        </section>
    );
}
