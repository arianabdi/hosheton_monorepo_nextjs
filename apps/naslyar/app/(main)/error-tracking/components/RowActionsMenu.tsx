'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TbDotsVertical } from 'react-icons/tb';
import styles from '../ErrorTracking.module.scss';

export interface RowActionItem {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    danger?: boolean;
    /** خط جداکننده قبل از این آیتم */
    separated?: boolean;
}

const MENU_GAP = 4;

/**
 * دکمه سه‌نقطه «⋮» عملیات سطر.
 * منو با portal و position: fixed رندر می‌شود تا overflow جدول (tableWrap) آن را نبرد؛
 * اگر زیر دکمه جا نباشد به سمت بالا باز می‌شود.
 */
export default function RowActionsMenu({ items }: { items: RowActionItem[] }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // جای منو بعد از رندر (وقتی اندازه‌اش معلوم است) محاسبه می‌شود
    useLayoutEffect(() => {
        if (!open || !btnRef.current || !menuRef.current) return;
        const btn = btnRef.current.getBoundingClientRect();
        const menu = menuRef.current.getBoundingClientRect();
        const fitsBelow = window.innerHeight - btn.bottom >= menu.height + MENU_GAP + 8;
        const top = fitsBelow ? btn.bottom + MENU_GAP : Math.max(8, btn.top - menu.height - MENU_GAP);
        // RTL: لبه چپ منو هم‌تراز لبه چپ دکمه — منو به سمت داخل صفحه باز می‌شود
        const left = Math.min(Math.max(8, btn.left), window.innerWidth - menu.width - 8);
        setPos({ top, left });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node | null;
            if (!target) return;
            if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
            close();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    const toggle = () => {
        setPos(null);
        setOpen((v) => !v);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                className={`${styles.kebabBtn} ${open ? styles.kebabBtnActive : ''}`}
                aria-label="عملیات"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={toggle}
            >
                <TbDotsVertical size={18} />
            </button>
            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        dir="rtl"
                        className={styles.rowMenu}
                        style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
                    >
                        {items.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                role="menuitem"
                                className={`${styles.rowMenuItem} ${item.danger ? styles.rowMenuItemDanger : ''} ${item.separated ? styles.rowMenuItemSeparated : ''}`}
                                onClick={() => {
                                    setOpen(false);
                                    item.onClick();
                                }}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </div>,
                    document.body,
                )}
        </>
    );
}
