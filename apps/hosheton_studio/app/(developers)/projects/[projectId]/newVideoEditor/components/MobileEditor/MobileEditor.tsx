'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LuCheck } from 'react-icons/lu';
import { ModalCloseButton } from '@my-workspace/components';
import styles from './MobileEditor.module.scss';

/**
 * Mobile editor pieces (≤768px). The phone layout stacks preview → transport →
 * timeline → tool bar; panels that live in dock tabs on desktop (media,
 * settings, export, chat, logs) open here as full-screen windows in the
 * gallery style (icon + title, ✕ on the far side) instead of floating windows.
 */

type MobileEditorScreenProps = {
    title: string;
    icon?: ReactNode;
    dir: 'rtl' | 'ltr';
    onClose: () => void;
    children: ReactNode;
    /** Sticky actions pinned under the scrolling body (export buttons…). */
    footer?: ReactNode;
    /** Body without padding — for panels that manage their own layout. */
    flush?: boolean;
    /** Restyle the desktop settings sections inside as a flat phone form. */
    form?: boolean;
};

export function MobileEditorScreen({ title, icon, dir, onClose, children, footer, flush, form }: MobileEditorScreenProps) {
    const { t } = useTranslation('common');

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <section className={styles.screen} dir={dir} role="dialog" aria-modal="true" aria-label={title}>
            <header className={styles.screenHeader}>
                <div className={styles.screenTitleWrap}>
                    {icon && <span className={styles.screenIcon} aria-hidden>{icon}</span>}
                    <h2 className={styles.screenTitle}>{title}</h2>
                </div>
                <ModalCloseButton placement="inline" onClick={onClose} aria-label={t('close')} />
            </header>
            <div className={`${styles.screenBody} ${flush ? styles.screenBodyFlush : ''} ${form ? styles.formBody : ''}`}>
                {children}
            </div>
            {footer && <div className={styles.screenFooter}>{footer}</div>}
        </section>
    );
}

type MobileToolBarProps = {
    dir: 'rtl' | 'ltr';
    label: string;
    children: ReactNode;
    /** Pinned at the start, outside the scrolling row (the selection's ✓). */
    leading?: ReactNode;
};

/** Horizontally scrolling tool row with a fade on each side that has more tools. */
export function MobileToolBar({ dir, label, children, leading }: MobileToolBarProps) {
    const barRef = useRef<HTMLElement>(null);
    const [fade, setFade] = useState({ left: false, right: false });

    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return;
        const update = () => {
            const tools = bar.querySelectorAll('button');
            if (tools.length === 0) return;
            const box = bar.getBoundingClientRect();
            const rects = [tools[0], tools[tools.length - 1]].map((tool) => tool.getBoundingClientRect());
            const minLeft = Math.min(...rects.map((rect) => rect.left));
            const maxRight = Math.max(...rects.map((rect) => rect.right));
            const next = { left: minLeft < box.left - 1, right: maxRight > box.right + 1 };
            setFade((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
        };
        update();
        bar.addEventListener('scroll', update, { passive: true });
        const observer = new ResizeObserver(update);
        observer.observe(bar);
        // The tool set swaps with the selection (clip / layer / none).
        const mutations = new MutationObserver(update);
        mutations.observe(bar, { childList: true });
        return () => {
            bar.removeEventListener('scroll', update);
            observer.disconnect();
            mutations.disconnect();
        };
    }, []);

    return (
        <div className={styles.toolBarWrap} dir={dir}>
            {leading && <div className={styles.toolBarLeading}>{leading}</div>}
            <div className={styles.toolBarScroll}>
                <nav ref={barRef} className={styles.toolBar} aria-label={label}>
                    {children}
                </nav>
                {fade.left && <span className={styles.fadeLeft} aria-hidden />}
                {fade.right && <span className={styles.fadeRight} aria-hidden />}
            </div>
        </div>
    );
}

type MobileToolButtonProps = {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    tone?: 'default' | 'danger' | 'accent';
};

/** Icon-only tool; the label is the aria-label and tooltip. */
export function MobileToolButton({ icon, label, onClick, disabled, tone = 'default' }: MobileToolButtonProps) {
    return (
        <button
            type="button"
            className={`${styles.tool} ${tone !== 'default' ? styles[tone] : ''}`}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
        >
            <span className={styles.toolIcon}>{icon}</span>
        </button>
    );
}

type MobileDoneButtonProps = {
    label: string;
    onClick: () => void;
};

/** Ends the current selection — the clear "I'm done with this item" exit. */
export function MobileDoneButton({ label, onClick }: MobileDoneButtonProps) {
    return (
        <button type="button" className={styles.doneBtn} onClick={onClick} aria-label={label} title={label}>
            <LuCheck aria-hidden />
        </button>
    );
}

type MobileFieldProps = {
    label: string;
    children: ReactNode;
    hint?: ReactNode;
};

/** Label-above-control row, like a native export/settings form. */
export function MobileField({ label, children, hint }: MobileFieldProps) {
    return (
        <div className={styles.field}>
            <span className={styles.fieldLabel}>{label}</span>
            {children}
            {hint && <span className={styles.fieldHint}>{hint}</span>}
        </div>
    );
}

type MobileSegmentedProps<T extends string> = {
    value: T;
    options: Array<{ value: T; label: string }>;
    onChange: (value: T) => void;
};

export function MobileSegmented<T extends string>({ value, options, onChange }: MobileSegmentedProps<T>) {
    return (
        <div className={styles.segmented} role="radiogroup">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    className={option.value === value ? styles.segmentActive : ''}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export { styles as mobileEditorStyles };
