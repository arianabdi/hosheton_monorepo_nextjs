'use client';

import type { ReactNode } from 'react';
import styles from './ToggleSwitch.module.scss';

/**
 * سوییچ کوچک روشن/خاموش برای فرم‌های فشرده‌ی ویرایش مدل.
 * با label → کل ردیف (عنوان + توضیح) کلیک‌خور است؛ بدون label فقط خود سوییچ (مثلاً داخل هدر کارت).
 */
export default function ToggleSwitch({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    title,
    ariaLabel,
    className,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: ReactNode;
    description?: ReactNode;
    disabled?: boolean;
    title?: string;
    ariaLabel?: string;
    className?: string;
}) {
    const track = (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            title={title}
            disabled={disabled}
            className={`${styles.track} ${checked ? styles.on : ''}`}
            onClick={(event) => {
                event.stopPropagation();
                onChange(!checked);
            }}
        >
            <span className={styles.thumb} aria-hidden />
        </button>
    );

    if (!label) return <span className={`${styles.bare} ${className || ''}`}>{track}</span>;

    return (
        <div
            className={`${styles.row} ${disabled ? styles.disabled : ''} ${className || ''}`}
            onClick={() => { if (!disabled) onChange(!checked); }}
            title={title}
        >
            {track}
            <span className={styles.text}>
                <span className={styles.label}>{label}</span>
                {description ? <span className={styles.description}>{description}</span> : null}
            </span>
        </div>
    );
}
