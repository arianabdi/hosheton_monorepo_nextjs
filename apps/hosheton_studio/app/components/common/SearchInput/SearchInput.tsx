'use client';

import React from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import styles from './SearchInput.module.scss';

export type SearchInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Accessible label; falls back to the placeholder. */
    ariaLabel?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    /** Show the clear (✕) button when there is text. Default true. */
    clearable?: boolean;
    onClear?: () => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onFocus?: () => void;
    className?: string;
    name?: string;
    id?: string;
    inputMode?: 'search' | 'text';
    inputRef?: React.Ref<HTMLInputElement>;
};

/**
 * The single search field used across the app: icon + input (+ clear button)
 * in one rounded container. RTL-aware via logical properties.
 */
export default function SearchInput({
    value,
    onChange,
    placeholder,
    ariaLabel,
    autoFocus,
    disabled,
    clearable = true,
    onClear,
    onKeyDown,
    onFocus,
    className,
    name,
    id,
    inputMode,
    inputRef,
}: SearchInputProps) {
    const hasValue = value.trim().length > 0;

    return (
        <div className={`${styles.searchInput} ${disabled ? styles.disabled : ''} ${className || ''}`}>
            <LuSearch className={styles.searchIcon} aria-hidden />
            <input
                ref={inputRef}
                id={id}
                name={name}
                type="search"
                role="searchbox"
                inputMode={inputMode}
                value={value}
                placeholder={placeholder}
                aria-label={ariaLabel || placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
            />
            {clearable && hasValue && !disabled && (
                <button
                    type="button"
                    className={styles.clearBtn}
                    aria-label="clear"
                    onClick={() => {
                        onChange('');
                        onClear?.();
                    }}
                >
                    <LuX aria-hidden />
                </button>
            )}
        </div>
    );
}
