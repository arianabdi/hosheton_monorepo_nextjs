'use client';

import React, {useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import ReactDOM from 'react-dom';
import dynamic from 'next/dynamic';
import styles from './modalHelper.module.scss';
import {ModalCloseButton} from './components/modalCloseButton';

const MobileBottomSheet = dynamic(
    () => import('./MobileBottomSheet/index').then((mod) => mod.MobileBottomSheet),
    {
        ssr: false,
        loading: () => null,
    },
);

/** زیر این عرض (px) مودال به‌صورت BottomSheet موبایل نمایش داده می‌شود */
const MOBILE_QUERY = '(max-width: 575.98px)';

type PopupAnchor = HTMLElement | { pageX: number; pageY: number } | null | undefined;

export interface ModalHelperProps {
    open: boolean;
    onClose: () => void;
    onOpen?: () => void;
    hideCloseBtn?: boolean;
    /** sm | md | lg | xl — پیش‌فرض md */
    size?: string;
    type?: 'modal' | 'popup';
    /** فقط برای popup: حداکثر ارتفاع بر حسب vh */
    height?: number;
    /** فقط برای popup: المان یا رویداد کلیکی که popup کنار آن باز می‌شود */
    targetElement?: PopupAnchor;
    /** فقط popup: `auto` (پیش‌فرض) = بالای المان اگر جا باشد؛ `below` = همیشه زیر المان (مثل dropdown) مگر پایین جا نباشد */
    popupPlacement?: 'auto' | 'below';
    /** فقط popup: عرض کادر — پیکسل، یا `anchor` = هم‌عرض المان هدف (حداقل ۲۲۰px). پیش‌فرض: تا ۳۸۰px */
    popupWidth?: number | 'anchor';
    /** محتوای مودال (اگر نبود children استفاده می‌شود) */
    component?: React.ReactNode;
    children?: React.ReactNode;
    /** props اضافه روی کادر مودال دسکتاپ */
    props?: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
    /** عنوان BottomSheet و برچسب دسترسی‌پذیری (aria-label) مودال */
    sheetTitle?: string;
    /** Always use the mobile bottom sheet, even above the 576px breakpoint. */
    forceSheet?: boolean;
    /** موبایل: به‌جای BottomSheet مودال وسط صفحه (popup هم وسط صفحه باز می‌شود، نه کنار المان) */
    mobileCentered?: boolean;
    sheetClassName?: string;
    /** کلیک روی پس‌زمینه مودال را ببندد — پیش‌فرض true */
    closeOnOverlayClick?: boolean;
    /** کلید Escape مودال/popup را ببندد — پیش‌فرض true */
    closeOnEsc?: boolean;
}

// ───────────────────────── کمک‌کننده‌ها ─────────────────────────

const noopSubscribe = () => () => undefined;

function useIsClient() {
    return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function subscribeMobile(onChange: () => void) {
    const mq = window.matchMedia(MOBILE_QUERY);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
}

/** بدون setState در effect و بدون پرش اولیه؛ در SSR همیشه false */
function useIsMobile() {
    return useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
}

/** پشته مودال‌های باز: Escape فقط بالاترین مودال را می‌بندد و قفل اسکرول تا بسته شدن آخرین مودال می‌ماند */
const openStack: symbol[] = [];
let previousBodyOverflow = '';

function lockBody(id: symbol) {
    if (openStack.length === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }
    openStack.push(id);
}

function unlockBody(id: symbol) {
    const index = openStack.indexOf(id);
    if (index !== -1) openStack.splice(index, 1);
    if (openStack.length === 0) document.body.style.overflow = previousBodyOverflow;
}

const isTopmost = (id: symbol) => openStack[openStack.length - 1] === id;

/** کلیک داخل پاپ‌اورهای پورتال‌شده (dropdown، date picker و...) نباید مودال را ببندد */
const isInsidePopover = (target: EventTarget | null) =>
    !!(target as HTMLElement | null)?.closest?.('[data-modal-popover]');

function anchorPoint(anchor: PopupAnchor): { x: number; y: number; bottom: number } | null {
    if (!anchor) return null;
    if (typeof HTMLElement !== 'undefined' && anchor instanceof HTMLElement) {
        const rect = anchor.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 + window.scrollX,
            y: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
        };
    }
    const point = anchor as { pageX?: number; pageY?: number };
    if (typeof point.pageX === 'number' && typeof point.pageY === 'number') {
        return {x: point.pageX, y: point.pageY, bottom: point.pageY};
    }
    return null;
}

/** عرض popup: پیکسل ثابت، یا هم‌عرض المان هدف (حداقل ۲۲۰px) — همیشه داخل عرض صفحه */
function popupWidthStyle(width: ModalHelperProps['popupWidth'], anchor: PopupAnchor): React.CSSProperties {
    if (!width) return {};
    const anchorWidth = typeof HTMLElement !== 'undefined' && anchor instanceof HTMLElement
        ? anchor.getBoundingClientRect().width
        : 0;
    const px = width === 'anchor' ? Math.max(220, Math.round(anchorWidth)) : width;
    return {width: px, maxWidth: 'calc(100vw - 16px)'};
}

// ───────────────────────── کامپوننت ─────────────────────────

export const ModalHelper: React.FC<ModalHelperProps> = ({
    open,
    onClose,
    onOpen,
    hideCloseBtn,
    size,
    type: typeProp = 'modal',
    height = 40,
    targetElement,
    popupPlacement = 'auto',
    popupWidth,
    component: componentProp,
    children,
    props = {},
    sheetTitle = 'Modal Options',
    forceSheet = false,
    mobileCentered = false,
    sheetClassName,
    closeOnOverlayClick = true,
    closeOnEsc = true,
}) => {
    const component = componentProp ?? children;
    const isClient = useIsClient();
    const isMobile = useIsMobile();
    const useSheet = forceSheet || (isMobile && !mobileCentered);
    const isDesktopOverlay = open && !useSheet;
    const type = isMobile && mobileCentered ? 'modal' : typeProp;

    const idRef = useRef<symbol>(Symbol('modal'));
    const contentRef = useRef<HTMLDivElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const overlayPressRef = useRef(false);
    const onCloseRef = useRef(onClose);
    const [popupPos, setPopupPos] = useState<{top: number; left: number; placement: 'above' | 'below'} | null>(null);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (open && onOpen) onOpen();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // مودال دسکتاپ: قفل اسکرول، فوکوس و بازگرداندن فوکوس
    useEffect(() => {
        if (!isDesktopOverlay || type !== 'modal') return;
        const id = idRef.current;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        lockBody(id);
        contentRef.current?.focus({preventScroll: true});
        return () => {
            unlockBody(id);
            previouslyFocused?.focus?.({preventScroll: true});
        };
    }, [isDesktopOverlay, type]);

    // Escape (مودال و popup دسکتاپ)
    useEffect(() => {
        if (!isDesktopOverlay || !closeOnEsc) return;
        const id = idRef.current;
        const isPopup = type === 'popup';
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (!isPopup && !isTopmost(id)) return;
            e.stopPropagation();
            onCloseRef.current();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isDesktopOverlay, closeOnEsc, type]);

    // popup: کلیک بیرون ببندد
    useEffect(() => {
        if (!isDesktopOverlay || type !== 'popup' || !closeOnOverlayClick) return;
        const onDown = (e: PointerEvent) => {
            if (popupRef.current?.contains(e.target as Node) || isInsidePopover(e.target)) return;
            onCloseRef.current();
        };
        // اجرای تأخیری تا کلیکی که popup را باز کرده همان لحظه آن را نبندد
        const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener('pointerdown', onDown);
        };
    }, [isDesktopOverlay, type, closeOnOverlayClick]);

    // popup: جای‌گذاری بر اساس ارتفاع واقعی، داخل عرض صفحه و برگشت به زیر المان اگر بالا جا نشد
    const placePopup = useCallback(() => {
        const el = popupRef.current;
        const point = anchorPoint(targetElement);
        if (!el || !point) return;
        const gap = 12;
        const width = el.offsetWidth;
        const popupHeight = el.offsetHeight;
        const minLeft = window.scrollX + width / 2 + 8;
        const maxLeft = window.scrollX + window.innerWidth - width / 2 - 8;
        const left = Math.min(Math.max(point.x, minLeft), Math.max(minLeft, maxLeft));
        const aboveTop = point.y - popupHeight - gap;
        const fitsAbove = aboveTop >= window.scrollY + 8;
        const fitsBelow = point.bottom + gap + popupHeight <= window.scrollY + window.innerHeight - 8;
        const placement = popupPlacement === 'below'
            ? (fitsBelow || !fitsAbove ? 'below' : 'above')
            : (fitsAbove ? 'above' : 'below');
        const top = placement === 'above' ? aboveTop : point.bottom + gap;
        setPopupPos({top, left, placement});
    }, [targetElement, popupPlacement]);

    useLayoutEffect(() => {
        if (!isDesktopOverlay || type !== 'popup') return;
        placePopup();
        window.addEventListener('resize', placePopup);
        return () => window.removeEventListener('resize', placePopup);
    }, [isDesktopOverlay, type, placePopup, component]);

    if (!isClient) return null;

    // موبایل (یا forceSheet): BottomSheet
    if (useSheet) {
        return (
            <MobileBottomSheet
                className={`${styles.modalHelper} ${sheetClassName || ''}`}
                onDismiss={onClose}
                open={open}
                title={sheetTitle}
            >
                {component}
            </MobileBottomSheet>
        );
    }

    if (!open) return null;

    // دسکتاپ: popup کنار المان
    if (type === 'popup') {
        return ReactDOM.createPortal(
            <div
                ref={popupRef}
                role="dialog"
                aria-label={sheetTitle}
                className={`${styles.popup} ${styles.modalHelper}`}
                style={{
                    top: popupPos?.top ?? 0,
                    left: popupPos?.left ?? 0,
                    visibility: popupPos ? 'visible' : 'hidden',
                    ...popupWidthStyle(popupWidth, targetElement),
                }}
            >
                <span className={`${styles.arrow} ${popupPos?.placement === 'below' ? styles.arrowTop : styles.arrowBottom}`}/>
                {!hideCloseBtn && (
                    <ModalCloseButton size="sm" placement="inline" className={styles.closeButton} onClick={onClose} />
                )}
                <div className={styles.popupScroll} style={{maxHeight: `${height}vh`}}>
                    {component}
                </div>
            </div>,
            document.body,
        );
    }

    // دسکتاپ: مودال معمولی — JSX مستقیم تا با هر رندر parent، portal remount نشود
    const {className: extraClassName, ...restProps} = props as React.HTMLAttributes<HTMLDivElement>;
    const sizeClass = (size && styles[size]) || styles.md;

    return ReactDOM.createPortal(
        <div
            className={styles.modalOverlay}
            // بستن فقط وقتی هم فشردن و هم رها کردن روی پس‌زمینه بوده (نه با درگ انتخاب متن از داخل مودال)
            onMouseDown={(e) => {
                overlayPressRef.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
                if (closeOnOverlayClick && overlayPressRef.current && e.target === e.currentTarget) onClose();
                overlayPressRef.current = false;
            }}
        >
            <div
                ref={contentRef}
                role="dialog"
                aria-modal="true"
                aria-label={sheetTitle}
                tabIndex={-1}
                className={[styles.modalContent, sizeClass, styles.modalHelper, extraClassName].filter(Boolean).join(' ')}
                onClick={(e) => e.stopPropagation()}
                {...restProps}
            >
                {!hideCloseBtn && <ModalCloseButton onClick={onClose} />}
                {component}
            </div>
        </div>,
        document.body,
    );
};
