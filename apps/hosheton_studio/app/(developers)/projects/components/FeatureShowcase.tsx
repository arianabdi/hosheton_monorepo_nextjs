'use client';

import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type TouchEvent } from 'react';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import { LuPlus } from 'react-icons/lu';
import styles from './FeatureShowcase.module.scss';

/* حالت خالی چندبخشی — وسط صفحه یک صحنه موشن و کنار/زیرش فهرست قابلیت‌ها؛ با انتخاب هر قابلیت
   موشن همان نمایش داده می‌شود (تا کاربر چیزی انتخاب نکرده، خودکار یکی‌یکی جلو می‌رود).
   هر صحنه ۳۶۰×۲۲۰ و چپ‌به‌راست است و keyframeهایش درصدی از --loop (همان loopMs) است.
   موبایل: به‌جای فهرست خط‌دار، فقط متن همان اسلاید + نقطه‌های جابه‌جایی (و کشیدن روی صحنه)،
   و دکمهٔ ساخت زیر اسلاید؛ عنوان و توضیح معرفی حذف می‌شوند چون هر اسلاید توضیح خودش را دارد. */

export type ShowcaseFeature = {
    key: string;
    Icon: IconType;
    Art: ComponentType;
    loopMs: number;
    title: string;
    text: string;
};

type FeatureShowcaseProps = {
    title: string;
    lead: string;
    features: ShowcaseFeature[];
    createLabel: string;
    createHref: string;
    /** معرفی (عنوان، توضیح، دکمه ساخت) — جایی که هدر صفحه خودش دکمه‌ی ساخت دارد خاموش می‌شود */
    showIntro?: boolean;
};

const SWIPE_MIN_PX = 40;

export function FeatureShowcase({ title, lead, features, createLabel, createHref, showIntro = true }: FeatureShowcaseProps) {
    const [active, setActive] = useState(0);
    // تا وقتی کاربر خودش قابلیتی انتخاب نکرده، بعد از یک دور موشن سراغ قابلیت بعدی می‌رویم
    const [autoplay, setAutoplay] = useState(true);
    const touchStartX = useRef<number | null>(null);
    const feature = features[active];

    useEffect(() => {
        if (!autoplay) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const timer = window.setTimeout(() => {
            setActive((i) => (i + 1) % features.length);
        }, features[active].loopMs);
        return () => window.clearTimeout(timer);
    }, [active, autoplay, features]);

    const select = (index: number) => {
        setAutoplay(false);
        setActive(index);
    };

    const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next = (active + step + features.length) % features.length;
        select(next);
        event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
    };

    // کشیدن افقی روی صحنه (موبایل) — جهت با RTL صفحه: کشیدن به سمت «شروع» = اسلاید بعد
    const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
    };
    const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        const end = event.changedTouches[0]?.clientX;
        if (start == null || end == null || Math.abs(end - start) < SWIPE_MIN_PX) return;
        const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
        const forward = rtl ? end > start : end < start;
        select((active + (forward ? 1 : -1) + features.length) % features.length);
    };

    const { Art } = feature;

    const createLink = (
        <Link href={createHref} className={styles.createBtn}>
            <LuPlus size={18} />
            {createLabel}
        </Link>
    );

    return (
        <section className={styles.showcase}>
            {/* معرفی (عنوان، توضیح و دکمه ساخت) بالای فهرست؛ دسکتاپ: صحنه کنار هر دو؛ موبایل: پنهان */}
            {showIntro ? (
                <div className={styles.intro}>
                    <h2 className={styles.introTitle}>{title}</h2>
                    <p className={styles.introText}>{lead}</p>
                    {createLink}
                </div>
            ) : null}

            <div className={styles.stage} aria-hidden onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                <span
                    key={feature.key}
                    className={styles.art}
                    style={{ '--loop': `${feature.loopMs}ms` } as CSSProperties}
                >
                    <Art />
                </span>
            </div>

            <ul className={styles.features} onKeyDown={onListKeyDown}>
                {features.map(({ key, Icon, loopMs, title: featureTitle, text }, index) => {
                    const isActive = index === active;
                    return (
                        <li key={key} className={`${styles.feature} ${isActive ? styles.featureActive : ''}`}>
                            <button
                                type="button"
                                className={styles.featureBtn}
                                aria-expanded={isActive}
                                onClick={() => select(index)}
                            >
                                <span className={styles.featureIcon}><Icon /></span>
                                <span className={styles.featureTitle}>{featureTitle}</span>
                                <span className={styles.featureBody}>
                                    <span className={styles.featureDesc}>{text}</span>
                                </span>
                                {isActive && autoplay ? (
                                    <span
                                        className={styles.featureProgress}
                                        style={{ '--dur': `${loopMs}ms` } as CSSProperties}
                                    />
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {/* موبایل: فقط متن اسلاید فعال + نقطه‌ها؛ دکمه ساخت زیرش */}
            <div className={styles.slide} aria-live="polite">
                <p key={feature.key} className={styles.slideText}>
                    <strong className={styles.slideTitle}>{feature.title}</strong>
                    <span className={styles.slideDesc}>{feature.text}</span>
                </p>
                <div className={styles.dots} role="tablist">
                    {features.map(({ key, title: featureTitle, loopMs }, index) => {
                        const isActive = index === active;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-label={featureTitle}
                                className={`${styles.dot} ${isActive ? styles.dotActive : ''}`}
                                onClick={() => select(index)}
                            >
                                {isActive && autoplay ? (
                                    <span
                                        className={styles.dotProgress}
                                        style={{ '--dur': `${loopMs}ms` } as CSSProperties}
                                    />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
                {showIntro ? <div className={styles.slideCta}>{createLink}</div> : null}
            </div>
        </section>
    );
}
