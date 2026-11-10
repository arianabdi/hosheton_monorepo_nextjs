'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import styles from '../../ProviderForm.module.scss';
import local from './FormCardSection.module.scss';

export default function FormCardSection({
    id,
    title,
    subtitle,
    defaultOpen = true,
    open: openProp,
    onOpenChange,
    compact = false,
    dense = false,
    extra,
    children,
}: {
    id?: string;
    title: ReactNode;
    subtitle?: ReactNode;
    defaultOpen?: boolean;
    /** Controlled open state (e.g. section nav) */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Smaller nested cards (e.g. routes inside a mode) */
    compact?: boolean;
    /** Tighter padding for admin density */
    dense?: boolean;
    extra?: ReactNode;
    children: ReactNode;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = openProp !== undefined;
    const open = isControlled ? openProp : uncontrolledOpen;
    const panelId = useId();

    useEffect(() => {
        if (!isControlled) setUncontrolledOpen(defaultOpen);
    }, [defaultOpen, isControlled]);

    const setOpen = (next: boolean) => {
        if (!isControlled) setUncontrolledOpen(next);
        onOpenChange?.(next);
    };

    return (
        <section
            id={id}
            className={`${styles.formCard} ${local.card} ${compact ? local.compact : ''} ${dense ? local.dense : ''}`}
            data-section={id}
        >
            <div className={local.headerRow}>
                <button
                    type="button"
                    className={local.header}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpen(!open)}
                >
                    <div className={local.headerText}>
                        <h4 className={styles.formCardTitle}>{title}</h4>
                        {subtitle ? <div className={`${styles.formCardDesc} ${local.subtitle}`}>{subtitle}</div> : null}
                    </div>
                    <span className={local.chevron} aria-hidden>{open ? '▲' : '▼'}</span>
                </button>
                {extra ? <div className={local.extra} onClick={(event) => event.stopPropagation()}>{extra}</div> : null}
            </div>
            {open ? (
                <div id={panelId} className={local.body}>
                    {children}
                </div>
            ) : null}
        </section>
    );
}
