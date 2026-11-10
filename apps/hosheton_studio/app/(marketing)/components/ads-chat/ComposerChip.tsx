'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import toolbarStyles from '@/app/(developers)/projects/[projectId]/chat/chatInput/CompactChatToolbar.module.scss';
import styles from './agent-chat.module.scss';

export interface ComposerChipOption<T extends string | number> {
    value: T;
    label: string;
    description?: string;
    icon?: ReactNode;
    disabled?: boolean;
    /** توضیح غیرفعال بودن — جای description نشان داده می‌شود */
    disabledHint?: string;
}

interface ComposerChipProps<T extends string | number> {
    icon?: ReactNode;
    /** متن چیپ — معمولاً برچسب گزینه‌ی انتخابی */
    label: string;
    title: string;
    options: ComposerChipOption<T>[];
    value: T;
    onChange(value: T): void;
    disabled?: boolean;
    /** عرض منو؛ پیش‌فرض ۲۴۰ */
    menuWidth?: number;
}

/**
 * چیپ + منوی بازشونده با همان ظاهر چیپ‌های کامپوزر چت استودیو (CompactChatToolbar):
 * منو بالای چیپ باز می‌شود، کلیک بیرون و Escape می‌بندند.
 */
export default function ComposerChip<T extends string | number>({
    icon,
    label,
    title,
    options,
    value,
    onChange,
    disabled = false,
    menuWidth = 240,
}: ComposerChipProps<T>) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
    const chipRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // منو بالای چیپ — همان محاسبه‌ی منوی مدل در چت استودیو، لحظه‌ی باز شدن
    const openMenu = () => {
        const chip = chipRef.current;
        if (!chip) return;
        const rect = chip.getBoundingClientRect();
        const width = Math.min(menuWidth, window.innerWidth - 16);
        setMenuStyle({
            position: 'fixed',
            left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
            width,
            bottom: Math.max(12, window.innerHeight - rect.top + 8),
            top: 'auto',
            maxHeight: Math.min(340, Math.max(140, rect.top - 16)),
            zIndex: 10050,
        });
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const onDoc = (event: MouseEvent) => {
            const target = event.target as Node;
            if (chipRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setOpen(false);
            chipRef.current?.focus();
        };
        const onResize = () => setOpen(false);
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onResize);
        };
    }, [open]);

    return (
        <>
            <button
                ref={chipRef}
                type="button"
                className={`${toolbarStyles.chip} ${toolbarStyles.modelChip} ${open ? toolbarStyles.open : ''}`}
                aria-label={title}
                aria-haspopup="listbox"
                aria-expanded={open}
                title={`${title}: ${label}`}
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : openMenu())}
            >
                {icon ? <span className={toolbarStyles.modeChipIcon} aria-hidden>{icon}</span> : null}
                <span className={toolbarStyles.chipLabel} dir="auto">{label}</span>
            </button>
            {open && menuStyle && createPortal(
                <div ref={menuRef} className={toolbarStyles.modelMenu} style={menuStyle} role="listbox" aria-label={title}>
                    <p className={styles.chipMenuTitle}>{title}</p>
                    {options.map((option) => {
                        const selected = option.value === value;
                        return (
                            <button
                                key={String(option.value)}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                aria-disabled={option.disabled}
                                className={`${toolbarStyles.modelOption} ${selected ? toolbarStyles.modelOptionActive : ''} ${option.disabled ? toolbarStyles.modelOptionDisabled : ''}`}
                                onClick={() => {
                                    if (option.disabled) return;
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                            >
                                {option.icon ? <span className={styles.chipOptionIcon} aria-hidden>{option.icon}</span> : null}
                                <span className={styles.chipOptionText}>
                                    <span dir="auto">{option.label}</span>
                                    {option.disabled && option.disabledHint ? (
                                        <small>{option.disabledHint}</small>
                                    ) : option.description ? (
                                        <small>{option.description}</small>
                                    ) : null}
                                </span>
                            </button>
                        );
                    })}
                </div>,
                document.body,
            )}
        </>
    );
}
