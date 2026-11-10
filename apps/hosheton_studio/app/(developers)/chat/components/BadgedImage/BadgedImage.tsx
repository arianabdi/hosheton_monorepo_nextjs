'use client';

import type { CSSProperties, ReactNode } from 'react';
import styles from './BadgedImage.module.scss';

export type BadgedImageProps = {
    src?: string;
    alt?: string;
    badgeText?: string;
    badgeIcon?: ReactNode;
    width?: number;
    height?: number;
    /** Hide the heart/favorite control (default true when used as history thumb). */
    showFavorite?: boolean;
    /** Show badge label text next to the icon. */
    showBadgeText?: boolean;
    /** Compact chrome for chat-history thumbs. */
    compact?: boolean;
    className?: string;
    style?: CSSProperties;
    /** Custom image node — keeps OptimizedThumbImage ghost loading when provided. */
    children?: ReactNode;
};

export function BadgedImage({
    src,
    alt = '',
    badgeText,
    badgeIcon,
    width = 300,
    height = 350,
    showFavorite = false,
    showBadgeText = Boolean(badgeText),
    compact = false,
    className,
    style,
    children,
}: BadgedImageProps) {
    const hasLabel = Boolean(showBadgeText && badgeText);
    const showBadge = Boolean(badgeIcon || hasLabel);

    return (
        <div
            className={`${styles.container} ${compact ? styles.compact : ''} ${hasLabel ? styles.hasLabel : ''} ${className || ''}`.trim()}
            style={{ width, height, ...style }}
        >
            {showFavorite ? (
                <button type="button" className={styles.favoriteBtn} aria-label="Add to favorites">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                </button>
            ) : null}

            <div className={styles.imageWrapper}>
                {children || (src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={alt} className={styles.image} />
                ) : null)}
            </div>

            {showBadge ? (
                <div className={styles.badgeWrapper}>
                    <span className={styles.badgeBtn} aria-hidden={!hasLabel} title={badgeText || undefined}>
                        {badgeIcon || (hasLabel ? null : (
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                        ))}
                        {hasLabel ? <span className={styles.badgeText}>{badgeText}</span> : null}
                    </span>
                </div>
            ) : null}
        </div>
    );
}

export default BadgedImage;
