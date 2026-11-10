'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuEllipsis } from 'react-icons/lu';
import styles from './RowActionMenu.module.scss';

export type RowActionMenuItem = {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    /** کار مخرب (حذف/لغو) — آخر فهرست و قرمز */
    danger?: boolean;
};

type Props = {
    items: RowActionMenuItem[];
    ariaLabel: string;
    className?: string;
};

const MENU_WIDTH = 180;
const PAD = 8;

/**
 * منوی «⋯» عملیات هر ردیف/آیتم استودیو (قانون «عملیات هر ردیف» در AGENTS.md):
 * پورتال به body، بسته شدن با Escape، کلیک بیرون و اسکرول. آیتم مخرب را آخر بده.
 */
export default function RowActionMenu({ items, ariaLabel, className }: Props) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            close();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', close);
        window.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', close, true);
        };
    }, [open]);

    // منو را داخل صفحه نگه دار (پایین صفحه → بالای دکمه باز شود)
    useLayoutEffect(() => {
        if (!open || !menuRef.current || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const menuHeight = menuRef.current.offsetHeight;
        const rtl = getComputedStyle(triggerRef.current).direction === 'rtl';
        let left = rtl ? rect.left : rect.right - MENU_WIDTH;
        left = Math.min(Math.max(PAD, left), window.innerWidth - MENU_WIDTH - PAD);
        let top = rect.bottom + 4;
        if (top + menuHeight > window.innerHeight - PAD) top = Math.max(PAD, rect.top - menuHeight - 4);
        setPosition({ top, left });
    }, [open]);

    if (!items.length) return null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${className || ''}`}
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((prev) => !prev);
                }}
            >
                <LuEllipsis size={18} />
            </button>
            {open && typeof document !== 'undefined'
                ? createPortal(
                    <div
                        ref={menuRef}
                        className={styles.menu}
                        style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
                        role="menu"
                        data-modal-popover
                    >
                        {items.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                role="menuitem"
                                className={`${styles.item} ${item.danger ? styles.danger : ''}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setOpen(false);
                                    item.onClick();
                                }}
                            >
                                {item.icon ? <span className={styles.icon}>{item.icon}</span> : null}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>,
                    document.body,
                )
                : null}
        </>
    );
}
