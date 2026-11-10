'use client';

import React from 'react';
import { ModalHelper } from '@my-workspace/components';
import { ACCOUNTING_GUIDES, AccountingGuideKey } from './guides';
import styles from './Help.module.scss';

interface HelpModalProps {
    open: boolean;
    onClose: () => void;
    topic: AccountingGuideKey;
}

/**
 * مودال نمایش راهنمای فارسی هر بخش — روی کامپوننت مشترک ModalHelper سوار است.
 */
export default function HelpModal({ open, onClose, topic }: HelpModalProps) {
    const guide = ACCOUNTING_GUIDES[topic];
    if (!guide) return null;

    const content = (
        <div className={styles.guide} aria-label={guide.title}>
            <div className={styles.guideHeader}>
                <h3 className={styles.guideTitle}>{guide.title}</h3>
                {guide.badge && <span className={styles.guideBadge}>{guide.badge}</span>}
            </div>

            {guide.intro && <p className={styles.guideIntro}>{guide.intro}</p>}

            {guide.cards.map((card, index) => (
                <div key={index} className={styles.stepCard}>
                    <div className={styles.stepHead}>
                        <span className={styles.stepNumber}>{toFarsiDigits(index + 1)}</span>
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

            {guide.tips && guide.tips.length > 0 && (
                <div className={styles.tipsBox}>
                    <div className={styles.tipsTitle}>نکته‌ها</div>
                    <ul>
                        {guide.tips.map((tip, tIndex) => (
                            <li key={tIndex}>{tip}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    return (
        <ModalHelper
            open={open}
            onClose={onClose}
            component={content}
            sheetTitle={guide.title}
            size="720px"
        />
    );
}

function toFarsiDigits(value: number): string {
    return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
