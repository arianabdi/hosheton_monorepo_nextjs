'use client';

import React, { useState } from 'react';
import { ModalHelper } from '@my-workspace/components';
import parentStyles from '../../marketing/Marketing.module.scss';
import styles from './Help.module.scss';
import type { AccountingGuideContent } from './guides';

interface AccountingGuideProps {
    guide: AccountingGuideContent;
    /** حالت پیش‌فرض باز بودن باکس آموزش */
    defaultExpanded?: boolean;
}

const toFa = (value: number) => String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

/**
 * باکس راهنمای این‌لاین هر صفحه حسابداری — هم‌سبک راهنمای «نیروی انسانی» و «مدیریت اموال»:
 * هدر باکس (عنوان + بج) نقش Expand/Collapse دارد و دکمه «آموزش بیشتر»
 * مودال راهنمای کامل را باز می‌کند (همان محتوای HelpModal).
 */
export default function AccountingGuide({ guide, defaultExpanded = true }: AccountingGuideProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [modalOpen, setModalOpen] = useState(false);

    // ---------- محتوای کامل مودال «آموزش بیشتر» (هم‌ساخت HelpModal) ----------
    const fullGuide = (
        <div className={styles.guide} aria-label={guide.title}>
            <div className={styles.guideHeader}>
                <h3 className={styles.guideTitle}>{guide.title}</h3>
                {guide.badge ? <span className={styles.guideBadge}>{guide.badge}</span> : null}
            </div>

            {guide.intro ? <p className={styles.guideIntro}>{guide.intro}</p> : null}

            {guide.cards.map((card, index) => (
                <div key={index} className={styles.stepCard}>
                    <div className={styles.stepHead}>
                        <span className={styles.stepNumber}>{toFa(index + 1)}</span>
                        <h4 className={styles.stepTitle}>{card.title}</h4>
                    </div>
                    <p className={styles.stepBody}>{card.body}</p>
                </div>
            ))}

            {(guide.sections || []).map((section, sIndex) => (
                <div key={sIndex}>
                    <h4 className={styles.sectionHeading}>{section.heading}</h4>
                    <ul className={styles.sectionList}>
                        {section.items.map((item, iIndex) => (
                            <li key={iIndex}>{item}</li>
                        ))}
                    </ul>
                </div>
            ))}

            {guide.tips && guide.tips.length > 0 ? (
                <div className={styles.tipsBox}>
                    <div className={styles.tipsTitle}>نکته‌ها</div>
                    <ul>
                        {guide.tips.map((tip, tIndex) => (
                            <li key={tIndex}>{tip}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );

    return (
        <section className={parentStyles.guideContainer} style={{ marginBottom: '1.5rem' }}>
            <button
                type="button"
                className={styles.inlineToggle}
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
            >
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>📖</span>
                    <h2 className={parentStyles.guideTitle}>{guide.title}</h2>
                </div>
                <span className={styles.inlineToggleLeft}>
                    <span className={parentStyles.guideBadge}>{guide.badge || 'راهنمای ادمین'}</span>
                    <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
                </span>
            </button>

            {expanded ? (
                <>
                    {guide.intro ? <p className={styles.inlineIntro}>{guide.intro}</p> : null}

                    <div className={parentStyles.guideGrid}>
                        {guide.cards.map((card, index) => (
                            <div key={index} className={parentStyles.guideCard}>
                                <h3>{card.title}</h3>
                                <p className={styles.inlineCardBody}>{card.body}</p>
                            </div>
                        ))}
                    </div>

                    {guide.tips && guide.tips.length > 0 ? (
                        <div className={styles.inlineNote}>
                            <strong>نکته:</strong> {guide.tips[0]}
                        </div>
                    ) : null}

                    <div className={styles.moreWrap}>
                        <button type="button" className={parentStyles.secondaryBtn} onClick={() => setModalOpen(true)}>
                            آموزش بیشتر
                        </button>
                    </div>
                </>
            ) : null}

            <ModalHelper
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                component={fullGuide}
                sheetTitle={guide.title}
                size="720px"
            />
        </section>
    );
}
