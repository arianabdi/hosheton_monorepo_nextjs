'use client';

import React, { useState } from 'react';
import { LuCircleHelp } from 'react-icons/lu';
import { ModalHelper } from '@my-workspace/components';
import { getGuide, type GuideContent, type GuideKey } from './guides/errorTrackingGuides';
import styles from '../ErrorTracking.module.scss';

interface HelpTipProps {
    guideKey: GuideKey;
    /** برچسب اختیاری کنار آیکون */
    label?: string;
    /** اندازه آیکون (پیش‌فرض ۱۸) */
    size?: number;
}

export default function HelpTip({ guideKey, label, size = 18 }: HelpTipProps) {
    const [open, setOpen] = useState(false);
    const guide = getGuide(guideKey);

    return (
        <>
            <button
                type="button"
                className={styles.helpTipBtn}
                onClick={() => setOpen(true)}
                aria-label={`راهنما: ${guide.title}`}
                title="راهنمای این بخش"
            >
                <LuCircleHelp size={size} />
                {label && <span className={styles.helpTipLabel}>{label}</span>}
            </button>

            <ModalHelper
                open={open}
                onClose={() => setOpen(false)}
                size="lg"
                sheetTitle={guide.title}
                component={<GuideModal guide={guide} />}
            />
        </>
    );
}

/** رندر لیست بخش‌های راهنما — بین مودال HelpTip و صفحه راهنمای اتصال مشترک است */
export function GuideSectionList({ sections }: { sections: GuideContent['sections'] }) {
    return (
        <>
            {sections.map((section, index) => (
                <section key={index} className={styles.guideSection}>
                    {section.heading && <h4 className={styles.guideSectionTitle}>{section.heading}</h4>}

                    {section.paragraphs?.map((text, i) => (
                        <p key={i} className={styles.guideText}>{text}</p>
                    ))}

                    {section.bullets && (
                        <ul className={styles.guideList}>
                            {section.bullets.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    )}

                    {section.table && (
                        <div className={styles.guideTableWrap}>
                            <table className={styles.guideTable}>
                                <thead>
                                    <tr>
                                        {section.table.headers.map((header, i) => (
                                            <th key={i}>{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {section.table.rows.map((row, i) => (
                                        <tr key={i}>
                                            {row.map((cell, j) => (
                                                <td key={j}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {section.code && (
                        <div className={styles.guideCodeWrap}>
                            {section.codeCaption && (
                                <div className={styles.guideCodeCaption}>{section.codeCaption}</div>
                            )}
                            <pre className={styles.guideCode} dir="ltr">{section.code}</pre>
                        </div>
                    )}
                </section>
            ))}
        </>
    );
}

function GuideModal({ guide }: { guide: GuideContent }) {
    return (
        <div className={styles.guideModal} dir="rtl">
            <h3 className={styles.guideModalTitle}>{guide.title}</h3>
            <p className={styles.guideModalIntro}>{guide.intro}</p>
            <GuideSectionList sections={guide.sections} />
        </div>
    );
}
