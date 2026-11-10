'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LuSearch, LuSlidersHorizontal } from 'react-icons/lu';
import { ModalCloseButton, ModalHelper } from '@my-workspace/components';
import { formatAppNumber } from '@/app/lib/i18n/formatLocaleNumber';
import type { MediaSpace } from '../types/media-api';
import styles from './ProjectFilters.module.scss';

/** فیلترهای صفحهٔ پروژه‌ها؛ رشتهٔ خالی = «همه» (در URL نوشته نمی‌شود) */
export interface ProjectFilterState {
    q: string;
    space: string;
    status: string;
    ownership: string;
    budget: string;
    deadline: string;
}

export const PROJECT_FILTER_KEYS = ['q', 'space', 'status', 'ownership', 'budget', 'deadline'] as const;

export function countActiveFilters(filters: ProjectFilterState): number {
    // جستجو در کادر خودش دیده می‌شود؛ نشان فقط فیلترهای داخل پنل را می‌شمارد
    return PROJECT_FILTER_KEYS.filter((key) => key !== 'q' && filters[key]).length;
}

interface ProjectFiltersProps {
    filters: ProjectFilterState;
    spaces: MediaSpace[];
    onChange: (next: Partial<ProjectFilterState>) => void;
    onClear: () => void;
}

/** کادر جستجو + دکمهٔ فیلتر با پنل بخش‌بندی‌شده (فضا، وضعیت، مالکیت، بودجه، ددلاین) */
export function ProjectFilters({ filters, spaces, onChange, onClear }: ProjectFiltersProps) {
    const { t, i18n } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const open = Boolean(anchor);
    const activeCount = countActiveFilters(filters);

    // جستجو: تایپ محلی، اعمال با مکث (debounce) یا Enter
    const [query, setQuery] = useState(filters.q);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    useEffect(() => setQuery(filters.q), [filters.q]);
    useEffect(() => {
        if (query.trim() === filters.q) return;
        const timer = window.setTimeout(() => onChangeRef.current({ q: query.trim() }), 350);
        return () => window.clearTimeout(timer);
    }, [query, filters.q]);

    const sections: { key: keyof ProjectFilterState; title: string; options: { value: string; label: string }[] }[] = [
        {
            key: 'space',
            title: t('card_space'),
            options: [
                { value: '', label: t('all_spaces') },
                ...spaces.map((space) => ({
                    value: space._id,
                    label: space.projectCount != null
                        ? `${space.name} (${formatAppNumber(space.projectCount, i18n.language)})`
                        : space.name,
                })),
                { value: 'none', label: t('filter_no_space') },
            ],
        },
        {
            key: 'status',
            title: t('filter_status'),
            options: [
                { value: '', label: t('filter_all') },
                { value: 'in_progress', label: t('in_progress') },
                { value: 'completed', label: t('completed') },
            ],
        },
        {
            key: 'ownership',
            title: t('filter_ownership'),
            options: [
                { value: '', label: t('filter_all') },
                { value: 'mine', label: t('filter_mine') },
                { value: 'shared', label: t('filter_shared') },
            ],
        },
        {
            key: 'budget',
            title: t('card_budget'),
            options: [
                { value: '', label: t('filter_all') },
                { value: 'with', label: t('filter_budget_with') },
                { value: 'without', label: t('filter_budget_without') },
            ],
        },
        {
            key: 'deadline',
            title: t('card_deadline'),
            options: [
                { value: '', label: t('filter_all') },
                { value: 'overdue', label: t('card_overdue') },
                { value: 'week', label: t('filter_deadline_week') },
                { value: 'has', label: t('filter_deadline_has') },
                { value: 'none', label: t('card_no_deadline') },
            ],
        },
    ];

    return (
        <>
            <label className={styles.search}>
                <LuSearch size={16} aria-hidden />
                <input
                    type="search"
                    value={query}
                    placeholder={t('filter_search_ph')}
                    aria-label={t('filter_search_ph')}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onChange({ q: query.trim() });
                        }
                    }}
                />
            </label>

            <button
                type="button"
                className={`${styles.filterBtn} ${activeCount ? styles.filterBtnActive : ''}`}
                onClick={(e) => setAnchor(e.currentTarget)}
                title={t('filters')}
                aria-label={t('filters')}
                aria-expanded={open}
            >
                <LuSlidersHorizontal size={16} />
                {activeCount ? (
                    <span className={styles.badge}>{formatAppNumber(activeCount, i18n.language)}</span>
                ) : null}
            </button>

            <ModalHelper
                open={open}
                onClose={() => setAnchor(null)}
                type="popup"
                targetElement={anchor ?? undefined}
                popupPlacement="below"
                popupWidth={340}
                height={75}
                hideCloseBtn
                sheetTitle={t('filters')}
                component={open ? (
                    <div className={styles.panel}>
                        <header className={styles.panelHead}>
                            <span className={styles.panelTitle}>{t('filters')}</span>
                            {activeCount ? (
                                <button type="button" className={styles.clearBtn} onClick={onClear}>
                                    {t('filter_clear')}
                                </button>
                            ) : null}
                            <ModalCloseButton size="sm" placement="inline" onClick={() => setAnchor(null)} aria-label={tc('close')} />
                        </header>
                        <div className={styles.panelBody}>
                            {sections.map((section) => (
                                <section key={section.key} className={styles.section} aria-label={section.title}>
                                    <h3 className={styles.sectionTitle}>{section.title}</h3>
                                    <div className={styles.options} role="radiogroup" aria-label={section.title}>
                                        {section.options.map((option) => {
                                            const active = filters[section.key] === option.value;
                                            return (
                                                <button
                                                    key={option.value || 'all'}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={active}
                                                    className={`${styles.option} ${active ? styles.optionActive : ''}`}
                                                    onClick={() => onChange({ [section.key]: option.value })}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                ) : null}
            />
        </>
    );
}
