'use client';

import type { ReactNode } from 'react';
import styles from './ToggleField.module.scss';

/**
 * ردیف روشن/خاموش فرم‌های پنل: عنوان + توضیح (fieldHint) + چک‌باکس —
 * جایگزین checkbox خام و label اینلاین در فرم‌های افزودن/ویرایش.
 */
export default function ToggleField({
    title,
    hint,
    checked,
    onChange,
    disabled,
}: {
    title: string;
    hint?: ReactNode;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <label className={`${styles.toggle} ${disabled ? styles.disabled : ''}`}>
            <span className={styles.texts}>
                <span className={styles.title}>{title}</span>
                {hint && <span className={styles.hint}>{hint}</span>}
            </span>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        </label>
    );
}
