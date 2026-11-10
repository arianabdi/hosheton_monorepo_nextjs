'use client';

import type { ReactNode } from 'react';
import parentStyles from '../../Marketing.module.scss';
import hrStyles from '@/app/(main)/management/hr/Hr.module.scss';

export interface GuideCard {
    title: string;
    items: ReactNode[];
    ordered?: boolean;
}

/**
 * راهنمای همیشه‌نمایان فهرست‌ها (قرارداد AGENTS.md / EmployeesGuide):
 * هدر + مقدمه + کارت‌ها + مثال عملی + نکته. هر تب فقط راهنمای مخصوص خودش را دارد.
 */
export default function Guide({
    icon,
    title,
    intro,
    cards,
    example,
    note,
}: {
    icon: string;
    title: string;
    intro: ReactNode;
    cards: GuideCard[];
    example?: ReactNode;
    note?: ReactNode;
}) {
    return (
        <section className={parentStyles.guideContainer}>
            <div className={parentStyles.guideHeader}>
                <div className={parentStyles.guideTitleGroup}>
                    <span className={parentStyles.guideIcon}>{icon}</span>
                    <h2 className={parentStyles.guideTitle}>{title}</h2>
                </div>
                <span className={parentStyles.guideBadge}>راهنمای ادمین</span>
            </div>
            <p className={hrStyles.employeesGuideIntro}>{intro}</p>
            <div className={parentStyles.guideGrid}>
                {cards.map((card) => {
                    const List = card.ordered ? 'ol' : 'ul';
                    return (
                        <div key={card.title} className={parentStyles.guideCard}>
                            <h3>{card.title}</h3>
                            <List>
                                {card.items.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </List>
                        </div>
                    );
                })}
            </div>
            {example && (
                <div className={hrStyles.employeesGuideExample}>
                    <h3>مثال عملی</h3>
                    <p>{example}</p>
                </div>
            )}
            {note && (
                <div className={hrStyles.employeesGuideNote}>
                    <strong>نکته:</strong> {note}
                </div>
            )}
        </section>
    );
}
