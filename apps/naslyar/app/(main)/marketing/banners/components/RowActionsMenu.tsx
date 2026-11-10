'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from '../Banners.module.scss';

export interface RowActionItem {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    danger?: boolean;
}

/**
 * دکمه سه‌نقطه «...» عملیات سطر — منوی کشویی با آیتم‌های داده‌شده.
 * اگر سطر به انتهای صفحه نزدیک باشد منو به سمت بالا باز می‌شود.
 */
export default function RowActionsMenu({ items }: { items: RowActionItem[] }) {
    const [open, setOpen] = useState(false);
    const [up, setUp] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // بستن با کلیک بیرون از منو
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node | null;
            if (ref.current && target && !ref.current.contains(target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const toggle = () => {
        if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setUp(window.innerHeight - rect.bottom < 190 && rect.top > 190);
        }
        setOpen((v) => !v);
    };

    return (
        <div className={styles.rowActions} ref={ref}>
            <button
                type="button"
                className={styles.kebabBtn}
                aria-label="عملیات"
                aria-expanded={open}
                onClick={toggle}
            >
                ⋮
            </button>
            {open && (
                <div className={`${styles.menu} ${up ? styles.menuUp : ''}`}>
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`}
                            onClick={() => {
                                setOpen(false);
                                item.onClick();
                            }}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
