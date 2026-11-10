'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuChevronLeft, LuChevronRight, LuFolderTree, LuX } from 'react-icons/lu';
import {
    categoryHref,
    childCategoriesOf,
    type TemplateCategoryNode,
} from '@/app/(marketplace)/lib/explore-taxonomy';
import { useCategoryName } from '@/app/(marketplace)/lib/useCategoryName';
import styles from './ExploreCategoryRow.module.scss';

type Props = {
    nodes: TemplateCategoryNode[];
    active: TemplateCategoryNode | null;
    onClear: () => void;
};

/**
 * انتخابگر فشردهٔ درخت دسته‌بندی — یک چیپ اول ردیف موضوع‌ها. با کلیک یک پنل کوچک باز می‌شود
 * که سطح‌به‌سطح در درخت جلو می‌رود؛ هر گزینه لینک واقعی (<a href>) به صفحهٔ فرود دسته است تا
 * خزنده‌ها هم دنبالش کنند. وقتی دسته‌ای فعال است چیپ نام آن را با ✕ نشان می‌دهد.
 */
export function ExploreCategoryPicker({ nodes, active, onClear }: Props) {
    const { t } = useTranslation('marketplace');
    const nameOf = useCategoryName();
    const [open, setOpen] = useState(false);
    // سطحی از درخت که پنل نشان می‌دهد — با باز شدن، از والد دستهٔ فعال شروع می‌شود
    const [levelId, setLevelId] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    // موبایل: پنل fixed است (ردیف اسکرول‌شونده آن را نبرد) — جایش زیر چیپ از همین‌جا
    const [panelTop, setPanelTop] = useState(0);

    useEffect(() => {
        if (open) setLevelId(active?.parentId ?? null);
    }, [open, active]);

    useEffect(() => {
        if (!open) return;
        const place = () => setPanelTop((rootRef.current?.getBoundingClientRect().bottom ?? 0) + 4);
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        const onPointer = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open]);

    const level = useMemo(() => nodes.find((node) => node._id === levelId) || null, [nodes, levelId]);
    const items = useMemo(() => childCategoriesOf(nodes, levelId), [nodes, levelId]);
    const hasChildren = (node: TemplateCategoryNode) => nodes.some((child) => child.parentId === node._id);

    if (!nodes.length) return null;

    return (
        <div className={styles.pickerWrap} ref={rootRef}>
            {/* یک چیپ: [آیکون نام ⌄ | ✕] — حذف فیلتر داخل همان چیپ، جدا با خط عمودی */}
            <div className={`${styles.card} ${styles.pickerChip} ${active ? styles.cardActive : ''}`}>
                <button
                    type="button"
                    className={styles.pickerToggle}
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    aria-haspopup="true"
                >
                    <span className={styles.iconSvg}><LuFolderTree aria-hidden /></span>
                    <span className={styles.cardText}>
                        <strong>{active ? nameOf(active) : t('category_picker')}</strong>
                    </span>
                    <LuChevronDown size={14} aria-hidden className={styles.pickerCaret} />
                </button>
                {active ? (
                    <>
                        <span className={styles.pickerDivider} aria-hidden />
                        <button
                            type="button"
                            className={styles.pickerClear}
                            onClick={onClear}
                            aria-label={t('clear_category')}
                            title={t('clear_category')}
                        >
                            <LuX size={14} aria-hidden />
                        </button>
                    </>
                ) : null}
            </div>

            <div
                className={styles.pickerPanel}
                hidden={!open}
                role="menu"
                style={{ ['--panel-top' as string]: `${panelTop}px` }}
            >
                <div className={styles.pickerHead}>
                    {level ? (
                        <button
                            type="button"
                            className={styles.pickerBack}
                            onClick={() => setLevelId(level.parentId)}
                            aria-label={t('category_back')}
                        >
                            <LuChevronRight size={16} aria-hidden className={styles.flipRtl} />
                        </button>
                    ) : null}
                    <span>{level ? nameOf(level) : t('category_picker')}</span>
                </div>
                <Link
                    href={level ? categoryHref(level) : '/explore'}
                    scroll={false}
                    className={`${styles.pickerItem} ${(level ? active?._id === level._id : !active) ? styles.pickerItemActive : ''}`}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                >
                    {level ? t('category_all_in', { name: nameOf(level) }) : t('all_categories')}
                </Link>
                {items.map((node) => (
                    <div key={node._id} className={styles.pickerRow}>
                        <Link
                            href={categoryHref(node)}
                            scroll={false}
                            className={`${styles.pickerItem} ${active?._id === node._id ? styles.pickerItemActive : ''}`}
                            onClick={() => setOpen(false)}
                            role="menuitem"
                        >
                            {nameOf(node)}
                        </Link>
                        {hasChildren(node) ? (
                            <button
                                type="button"
                                className={styles.pickerDrill}
                                onClick={() => setLevelId(node._id)}
                                aria-label={t('category_open_sub', { name: nameOf(node) })}
                            >
                                <LuChevronLeft size={16} aria-hidden className={styles.flipRtl} />
                            </button>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
