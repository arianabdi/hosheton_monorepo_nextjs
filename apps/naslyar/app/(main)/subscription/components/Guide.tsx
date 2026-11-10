'use client';

import type { ReactNode } from 'react';
import mk from '../../marketing/Marketing.module.scss';
import hr from '../../management/hr/Hr.module.scss';

export interface GuideContent {
    icon: string;
    title: string;
    intro: ReactNode;
    cards: Array<{ title: string; items: ReactNode[]; ordered?: boolean }>;
    example?: ReactNode;
    note?: ReactNode;
}

/** آموزش همیشه‌نمایان بالای هر تب (الگوی EmployeesGuide — بخش ۱ AGENTS.md پنل) */
export default function Guide({ content }: { content: GuideContent }) {
    return (
        <section className={mk.guideContainer}>
            <div className={mk.guideHeader}>
                <div className={mk.guideTitleGroup}>
                    <span className={mk.guideIcon}>{content.icon}</span>
                    <h2 className={mk.guideTitle}>{content.title}</h2>
                </div>
                <span className={mk.guideBadge}>راهنمای ادمین</span>
            </div>

            <p className={hr.employeesGuideIntro}>{content.intro}</p>

            <div className={mk.guideGrid}>
                {content.cards.map((card) => (
                    <div key={card.title} className={mk.guideCard}>
                        <h3>{card.title}</h3>
                        {card.ordered ? (
                            <ol>{card.items.map((item, i) => <li key={i}>{item}</li>)}</ol>
                        ) : (
                            <ul>{card.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
                        )}
                    </div>
                ))}
            </div>

            {content.example ? (
                <div className={hr.employeesGuideExample}>
                    <h3>مثال عملی</h3>
                    <p>{content.example}</p>
                </div>
            ) : null}

            {content.note ? (
                <div className={hr.employeesGuideNote}>
                    <strong>نکته:</strong> {content.note}
                </div>
            ) : null}
        </section>
    );
}
