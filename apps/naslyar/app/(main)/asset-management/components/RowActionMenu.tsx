'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../AssetManagement.module.scss';

export type RowActionMenuItem = {
    label: string;
    onClick: () => void;
    danger?: boolean;
};

type Props = {
    rowId: string;
    items: RowActionMenuItem[];
    ariaLabel?: string;
};

/**
 * منوی «...» اکشن‌های هر ردیف جدول — همان الگوی HrRowActionMenu (صفحه کاربران):
 * دکمه سه‌نقطه و منوی پورتال‌شده به body با موقعیت fixed.
 */
export default function RowActionMenu({ rowId, items, ariaLabel = 'عملیات' }: Props) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (open) {
            setOpen(false);
            return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ top: rect.bottom + 4, left: Math.max(8, rect.right - 160) });
        setOpen(true);
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={styles.moreBtn}
                aria-label={ariaLabel}
                aria-expanded={open}
                onClick={toggle}
            >
                ⋯
            </button>
            {open && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={menuRef}
                          className={styles.actionMenu}
                          style={{ top: position.top, left: position.left }}
                          role="menu"
                      >
                          {items.map((item) => (
                              <button
                                  key={`${rowId}-${item.label}`}
                                  type="button"
                                  role="menuitem"
                                  className={item.danger ? styles.menuDanger : undefined}
                                  onClick={() => {
                                      setOpen(false);
                                      item.onClick();
                                  }}
                              >
                                  {item.label}
                              </button>
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
