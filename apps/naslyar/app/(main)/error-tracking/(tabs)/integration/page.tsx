'use client';

// صفحه «راهنمای اتصال» — تب آموزش یکپارچه‌سازی؛ برای هر پروژه متصل‌شده یک تب دارد.
// محتوای تب‌ها از components/guides/errorTrackingGuides.ts (ETR_INTEGRATION_PROJECTS) می‌آید.

import React, { useState } from 'react';
import { TbPlugConnected } from 'react-icons/tb';
import { GuideSectionList } from '../../components/HelpTip';
import IntegrationGuide from '../../components/IntegrationGuide';
import TabIntro from '../../components/TabIntro';
import {
    ETR_INTEGRATION_PROJECTS,
    ETR_INTEGRATION_QUICKSTART,
} from '../../components/guides/errorTrackingGuides';
import styles from '../../ErrorTracking.module.scss';

export default function ErrorTrackingIntegrationPage() {
    const [activeTab, setActiveTab] = useState(ETR_INTEGRATION_PROJECTS[0]?.key || '');

    const project = ETR_INTEGRATION_PROJECTS.find((p) => p.key === activeTab) || ETR_INTEGRATION_PROJECTS[0];

    return (
        <>
            <TabIntro>
                <TbPlugConnected size={15} /> کد، متغیر محیطی و تست هر پروژهٔ متصل به پایش خطا.
            </TabIntro>
            <IntegrationGuide />

            <div className={styles.panel}>
                <div className={styles.sectionHead}>
                    <h3 className={styles.panelTitle}>شروع سریع</h3>
                </div>
                <GuideSectionList sections={ETR_INTEGRATION_QUICKSTART} />
            </div>

            <div className={styles.etrTabs} role="tablist">
                {ETR_INTEGRATION_PROJECTS.map((p) => (
                    <button
                        key={p.key}
                        type="button"
                        role="tab"
                        aria-selected={p.key === activeTab}
                        className={`${styles.etrTab} ${p.key === activeTab ? styles.etrTabActive : ''}`}
                        onClick={() => setActiveTab(p.key)}
                    >
                        {p.title}
                        <span className={styles.etrBadge}>{p.badge}</span>
                    </button>
                ))}
            </div>

            {project && (
                <div className={styles.panel} role="tabpanel">
                    <div className={styles.sectionHead}>
                        <h3 className={styles.panelTitle}>{project.title}</h3>
                    </div>
                    <GuideSectionList sections={project.sections} />
                </div>
            )}
        </>
    );
}
