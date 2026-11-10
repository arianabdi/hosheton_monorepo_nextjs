'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import styles from './TableEmptyState.module.scss';

export interface TableEmptyStateProps {
    icon?: ReactNode;
    title: string;
    description: string;
    hint?: string;
    primaryLabel?: string;
    primaryHref?: string;
    onPrimaryClick?: () => void;
    secondaryLabel?: string;
    secondaryHref?: string;
    onSecondaryClick?: () => void;
}

export default function TableEmptyState({
    icon,
    title,
    description,
    hint,
    primaryLabel,
    primaryHref,
    onPrimaryClick,
    secondaryLabel,
    secondaryHref,
    onSecondaryClick,
}: TableEmptyStateProps) {
    const showPrimary = Boolean(primaryLabel && (primaryHref || onPrimaryClick));
    const showSecondary = Boolean(
        secondaryLabel && (secondaryHref || onSecondaryClick),
    );
    const showActions = showPrimary || showSecondary;

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                {icon && (
                    <div className={styles.iconRing} aria-hidden>
                        {icon}
                    </div>
                )}
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>
                {hint && <p className={styles.hint}>{hint}</p>}
                {showActions && (
                    <div className={styles.actions}>
                        {showPrimary &&
                            (primaryHref ? (
                                <Link href={primaryHref} className={styles.primaryBtn}>
                                    {primaryLabel}
                                </Link>
                            ) : (
                                <button type="button" className={styles.primaryBtn} onClick={onPrimaryClick}>
                                    {primaryLabel}
                                </button>
                            ))}
                        {showSecondary &&
                            (secondaryHref ? (
                                <Link href={secondaryHref} className={styles.secondaryBtn}>
                                    {secondaryLabel}
                                </Link>
                            ) : (
                                <button type="button" className={styles.secondaryBtn} onClick={onSecondaryClick}>
                                    {secondaryLabel}
                                </button>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
