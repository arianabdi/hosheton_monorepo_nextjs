'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GalleryMediaFilter } from './galleryUtils';
import styles from './GalleryTypeFilter.module.scss';

const FILTER_OPTIONS: GalleryMediaFilter[] = ['all', 'image', 'video', 'audio'];

type Props = {
    value: GalleryMediaFilter;
    onChange: (next: GalleryMediaFilter) => void;
    locked?: boolean;
    /** تعداد فایل هر نوع — نوعی که فایلی ندارد غیرفعال می‌شود */
    counts?: Partial<Record<GalleryMediaFilter, number>>;
};

/**
 * فیلتر نوع فایل گالری (همه / عکس / ویدیو / صوت) با تعداد — هم‌الگوی تب‌های پروفایل سازنده
 * (`creators/[creatorId]` → `.tabScroller` / `.tabRow` / `.fadeStart` / `.fadeEnd`):
 * زیرخط‌دار، تمام‌عرض، در عرض کم اسکرول افقی با هاله‌ی لبه (RTL-aware).
 */
export function GalleryTypeFilter({ value, onChange, locked = false, counts }: Props) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const rowRef = useRef<HTMLDivElement>(null);
    const [fade, setFade] = useState({ start: false, end: false });

    const optionLabel = (option: GalleryMediaFilter) => {
        if (option === 'all') return t('gallery_all_files');
        if (option === 'image') return t('photo');
        return t(option);
    };

    const updateFade = useCallback(() => {
        const el = rowRef.current;
        const first = el?.firstElementChild as HTMLElement | undefined;
        const last = el?.lastElementChild as HTMLElement | undefined;
        if (!el || !first || !last) {
            setFade({ start: false, end: false });
            return;
        }
        const box = el.getBoundingClientRect();
        const firstBox = first.getBoundingClientRect();
        const lastBox = last.getBoundingClientRect();
        const pad = 3;
        const rtl = getComputedStyle(el).direction === 'rtl';
        const start = rtl ? firstBox.right > box.right + pad : firstBox.left < box.left - pad;
        const end = rtl ? lastBox.left < box.left - pad : lastBox.right > box.right + pad;
        setFade((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    }, []);

    useLayoutEffect(() => {
        const el = rowRef.current;
        if (!el) return;
        updateFade();
        const observer = new ResizeObserver(() => updateFade());
        observer.observe(el);
        window.addEventListener('resize', updateFade);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateFade);
        };
    }, [updateFade]);

    // تب فعال همیشه در دید ردیف
    useLayoutEffect(() => {
        const row = rowRef.current;
        const current = row?.querySelector<HTMLElement>('[aria-checked="true"]');
        if (!row || !current) return;
        const rowBox = row.getBoundingClientRect();
        const box = current.getBoundingClientRect();
        if (box.left < rowBox.left) row.scrollBy({ left: box.left - rowBox.left - 12 });
        else if (box.right > rowBox.right) row.scrollBy({ left: box.right - rowBox.right + 12 });
        updateFade();
    }, [value, updateFade]);

    return (
        <div className={`${styles.tabScroller} ${fade.start ? styles.fadeStart : ''} ${fade.end ? styles.fadeEnd : ''}`}>
            <div
                ref={rowRef}
                className={styles.tabRow}
                onScroll={updateFade}
                role="radiogroup"
                aria-label={t('gallery_file_type', { defaultValue: tc('filter') })}
            >
                {FILTER_OPTIONS.map((option) => {
                    const count = counts?.[option];
                    const active = value === option;
                    const empty = option !== 'all' && count === 0;
                    return (
                        <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={`${styles.tabBtn} ${active ? styles.active : ''}`}
                            disabled={locked || (empty && !active)}
                            onClick={() => onChange(option)}
                        >
                            <span>{optionLabel(option)}</span>
                            {typeof count === 'number' ? (
                                // شمارنده همیشه با رقم انگلیسی
                                <span className={styles.count} dir="ltr">{String(count)}</span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
