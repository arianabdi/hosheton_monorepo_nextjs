'use client';
import type {ButtonHTMLAttributes} from 'react';
import styles from './modalCloseButton.module.scss'

type ModalCloseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    /**
     * `floating` (پیش‌فرض): گوشه بالای مودال، absolute — سمت چپ در RTL، راست در LTR.
     * `inline`: داخل هدر/نوار ابزار خود محتوا (در جریان flex).
     */
    placement?: 'floating' | 'inline';
    /** `md` = 32px (مودال)، `sm` = 26px (popup و نوارهای فشرده) */
    size?: 'sm' | 'md';
};

/**
 * دکمه بستن واحد همه‌ی مودال‌ها/شیت‌ها/popup ها — مربع با گوشه گرد (نه دایره) و آیکون SVG.
 * ModalHelper خودش از همین استفاده می‌کند؛ اگر با `hideCloseBtn` هدر اختصاصی می‌سازی، همین را بگذار.
 */
export const ModalCloseButton = ({
    placement = 'floating',
    size = 'md',
    className,
    type = 'button',
    'aria-label': ariaLabel = 'بستن',
    title,
    ...props
}: ModalCloseButtonProps) => (
    <button
        {...props}
        type={type}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={[
            styles.closeBtn,
            placement === 'floating' ? styles.floating : '',
            size === 'sm' ? styles.sm : '',
            className,
        ].filter(Boolean).join(' ')}
    >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    </button>
);
