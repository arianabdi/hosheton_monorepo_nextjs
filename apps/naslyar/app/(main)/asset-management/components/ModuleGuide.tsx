'use client';

import React, { useState } from 'react';
import { ModalHelper } from '@my-workspace/components';
import parentStyles from '../../marketing/Marketing.module.scss';
import styles from './Guide.module.scss';

export interface AssetGuideCard {
    title: string;
    items: string[];
    /** آیتم‌ها مرحله‌ای/شماره‌دار نمایش داده شوند */
    ordered?: boolean;
}

export interface AssetGuideSection {
    heading: string;
    items: string[];
}

/** ساختار محتوای راهنمای هر بخش مدیریت اموال — هم‌سبک راهنمای ای‌کامرس */
export interface AssetGuideContent {
    /** عنوان راهنما (هدر باکس و مودال) */
    title: string;
    badge?: string;
    /** توضیح کلی — داخل باکس بازشده نمایش داده می‌شود */
    intro: string;
    /** مثال عملی — باکس آبی */
    example?: string;
    /** کارت‌های آموزشی لیستی — گرید دو ستونه داخل باکس و مودال */
    cards: AssetGuideCard[];
    /** بخش‌های تکمیلی — فقط داخل مودال آموزش بیشتر */
    sections?: AssetGuideSection[];
    /** نکته‌ها — نکته اول به‌صورت باکس زرد «نکته» در باکس، همه در مودال */
    tips?: string[];
}

interface ModuleGuideProps {
    guide: AssetGuideContent;
    /** حالت پیش‌فرض باز بودن باکس — در مودال‌ها بسته می‌گذاریم که فُرم جمع‌وجور بماند */
    defaultExpanded?: boolean;
}

const toFa = (value: number) => String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

/**
 * باکس راهنمای هر صفحه مدیریت اموال — دقیقاً مثل راهنمای ای‌کامرس:
 * خودِ باکس آموزش مستقیم روی صفحه قرار می‌گیرد و هدر باکس (عنوان + بج)
 * نقش Expand/Collapse را دارد. دکمه «آموزش بیشتر» مودال راهنمای کامل را باز می‌کند.
 */
export default function ModuleGuide({ guide, defaultExpanded = true }: ModuleGuideProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [modalOpen, setModalOpen] = useState(false);

    const renderItems = (card: AssetGuideCard) => {
        const list = card.items.map((item, iIndex) => <li key={iIndex}>{item}</li>);
        return card.ordered ? <ol>{list}</ol> : <ul>{list}</ul>;
    };

    // ---------- محتوای کامل مودال «آموزش بیشتر» ----------
    const fullGuide = (
        <div className={styles.guide} aria-label={guide.title}>
            <div className={styles.guideHeader}>
                <h3 className={styles.guideTitle}>{guide.title}</h3>
                {guide.badge ? <span className={styles.guideBadge}>{guide.badge}</span> : null}
            </div>

            <p className={styles.modalIntro}>{guide.intro}</p>

            {guide.cards.map((card, index) => (
                <div key={index} className={styles.stepCard}>
                    <div className={styles.stepHead}>
                        <span className={styles.stepNumber}>{toFa(index + 1)}</span>
                        <h4 className={styles.stepTitle}>{card.title}</h4>
                    </div>
                    {renderItems(card)}
                </div>
            ))}

            {guide.example ? (
                <div className={styles.guideExample}>
                    <h3>مثال عملی</h3>
                    <p>{guide.example}</p>
                </div>
            ) : null}

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

            {guide.tips && guide.tips.length > 1 ? (
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
        <section className={parentStyles.guideContainer}>
            <button
                type="button"
                className={styles.guideToggle}
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
            >
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>📖</span>
                    <h2 className={parentStyles.guideTitle}>{guide.title}</h2>
                </div>
                <span className={styles.guideToggleLeft}>
                    <span className={parentStyles.guideBadge}>{guide.badge || 'راهنمای ادمین'}</span>
                    <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
                </span>
            </button>

            {expanded ? (
                <>
                    <p className={styles.guideIntro}>{guide.intro}</p>

                    <div className={parentStyles.guideGrid}>
                        {guide.cards.map((card, index) => (
                            <div key={index} className={parentStyles.guideCard}>
                                <h3>{card.title}</h3>
                                {renderItems(card)}
                            </div>
                        ))}
                    </div>

                    {guide.example ? (
                        <div className={styles.guideExample}>
                            <h3>مثال عملی</h3>
                            <p>{guide.example}</p>
                        </div>
                    ) : null}

                    {guide.tips && guide.tips.length > 0 ? (
                        <div className={styles.guideNote}>
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
