'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import { useTranslation } from 'react-i18next';
import styles from './ImageLightbox.module.scss';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    open: boolean;
    onClose: () => void;
}

/** Chrome-style image preview: click to toggle fit ↔ full resolution, drag to pan when zoomed. */
export function ImageLightbox({ src, alt, open, onClose }: ImageLightboxProps) {
    const { t } = useTranslation('projects');
    const { t: tc } = useTranslation('common');
    const resolvedAlt = alt || t('preview');
    const [isZoomed, setIsZoomed] = useState(false);
    const [natural, setNatural] = useState({ w: 0, h: 0 });
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const dragMoved = useRef(false);
    const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    const resetView = useCallback(() => {
        setIsZoomed(false);
        setPan({ x: 0, y: 0 });
    }, []);

    useEffect(() => {
        if (!open) {
            resetView();
            return;
        }

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose, resetView]);

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (dragMoved.current) return;

        if (!isZoomed) {
            setIsZoomed(true);
            setPan({ x: 0, y: 0 });
        } else {
            resetView();
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
        if (!isZoomed) return;
        dragging.current = true;
        dragMoved.current = false;
        dragOrigin.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
        if (!dragging.current) return;
        const dx = e.clientX - dragOrigin.current.x;
        const dy = e.clientY - dragOrigin.current.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
        setPan({
            x: dragOrigin.current.panX + dx,
            y: dragOrigin.current.panY + dy,
        });
    };

    const endDrag = (e: React.PointerEvent<HTMLImageElement>) => {
        if (dragging.current) {
            dragging.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    if (!open || !src || typeof document === 'undefined') return null;

    return createPortal(
        // data-modal-popover: وقتی از داخل BottomSheet (ModalHelper) باز می‌شود، کلیک روی زوم «بیرون شیت» حساب نشود
        <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" data-modal-popover>
            <button type="button" className={styles.close} onClick={onClose} aria-label={tc('close')}>
                <LuX />
            </button>

            <div className={styles.stage}>
                <img
                    className={`${styles.photo} ${isZoomed ? styles.photoFull : styles.photoFit}`}
                    src={src}
                    alt={resolvedAlt}
                    draggable={false}
                    onLoad={(e) => {
                        setNatural({
                            w: e.currentTarget.naturalWidth,
                            h: e.currentTarget.naturalHeight,
                        });
                    }}
                    onClick={handleImageClick}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    style={
                        isZoomed && natural.w > 0
                            ? {
                                width: natural.w,
                                height: natural.h,
                                transform: `translate(${pan.x}px, ${pan.y}px)`,
                            }
                            : undefined
                    }
                />
            </div>
        </div>,
        document.body,
    );
}
