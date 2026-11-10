'use client';

import React from 'react';
import styles from './BlogSectionGuide.module.scss';
import { BLOG_GUIDES, BlogGuideKey, toFarsiStepNumber } from './blogGuides';

interface BlogSectionGuideProps {
    guideKey: BlogGuideKey;
    compact?: boolean;
}

export default function BlogSectionGuide({ guideKey, compact = false }: BlogSectionGuideProps) {
    const guide = BLOG_GUIDES[guideKey];
    if (!guide) return null;

    const cardCount = guide.cards.length;
    const gridClass =
        cardCount === 1
            ? styles.gridOne
            : cardCount === 2
              ? styles.gridTwo
              : styles.gridThree;

    return (
        <div
            className={`${styles.noticeContainer} ${compact ? styles.compact : ''}`}
            aria-label={guide.noticeTitle}
        >
            <div className={styles.noticeHeader}>
                <div className={styles.noticeTitleGroup}>
                    <span className={styles.noticeIcon} aria-hidden>
                        💡
                    </span>
                    <h2 className={styles.noticeTitle}>{guide.noticeTitle}</h2>
                </div>
                {guide.badge && <span className={styles.noticeBadge}>{guide.badge}</span>}
            </div>

            <div className={`${styles.noticeGrid} ${gridClass}`}>
                {guide.cards.map((card, index) => (
                    <div key={index} className={styles.noticeCard}>
                        <div className={styles.noticeCardHead}>
                            <span className={styles.stepNumber}>{toFarsiStepNumber(index + 1)}</span>
                            <h3>{card.title}</h3>
                        </div>
                        <p>{card.body}</p>
                    </div>
                ))}
            </div>

            {guide.footer && (
                <div className={styles.noticeFooter}>
                    <p>{guide.footer}</p>
                </div>
            )}
        </div>
    );
}
