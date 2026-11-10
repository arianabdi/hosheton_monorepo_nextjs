'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { EDGE_TYPE_OPTIONS, type EdgeTypeOption } from '../../../types/node-catalog';
import { EdgeTypeIcon } from './EdgeTypeIcons';
import styles from './NavbarEdgeTypeMenu.module.scss';

interface NavbarEdgeTypeMenuProps {
    value: EdgeTypeOption;
    onChange: (value: EdgeTypeOption) => void;
}

export function NavbarEdgeTypeMenu({ value, onChange }: NavbarEdgeTypeMenuProps) {
    const { t } = useTranslation('projects');
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        setMounted(true);
    }, []);

    const updatePopupPosition = () => {
        const trigger = rootRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        setPopupStyle({
            position: 'fixed',
            left: rect.left + rect.width / 2,
            bottom: window.innerHeight - rect.top + 10,
            transform: 'translateX(-50%)',
        });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updatePopupPosition();
        window.addEventListener('resize', updatePopupPosition);
        window.addEventListener('scroll', updatePopupPosition, true);
        return () => {
            window.removeEventListener('resize', updatePopupPosition);
            window.removeEventListener('scroll', updatePopupPosition, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target)) return;
            if (popupRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    const popup = open && mounted ? createPortal(
        <div
            ref={popupRef}
            className={styles.popup}
            style={popupStyle}
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
        >
            {EDGE_TYPE_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={value === opt.value}
                    className={`${styles.item} ${value === opt.value ? styles.itemActive : ''}`}
                    title={t(`edge_${opt.value}`)}
                    onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                    }}
                >
                    <EdgeTypeIcon type={opt.value} />
                </button>
            ))}
        </div>,
        document.body,
    ) : null;

    return (
        <div className={styles.root} ref={rootRef}>
            <button
                type="button"
                className={styles.trigger}
                title={t(`edge_${value}`)}
                aria-label={t(`edge_${value}`)}
                aria-expanded={open}
                aria-haspopup="menu"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setOpen((prev) => !prev)}
            >
                <EdgeTypeIcon type={value} />
            </button>
            {popup}
        </div>
    );
}
