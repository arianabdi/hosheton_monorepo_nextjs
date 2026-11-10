'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { LuX } from 'react-icons/lu';
import { ADS_CHAT_HEADER_SLOT_ID, ADS_CHAT_TOP_SLOT_ID } from './chat-slots';
import styles from './ads-chat.module.scss';

// ────────────────────────────── Types ──────────────────────────────

interface AdsChatSidebarProps {
    open: boolean;
    onClose(): void;
    /** عنوان نوار بالای پنل */
    title?: string;
    /** اکشن‌های هدر (مثل دکمه‌ی تاریخچه‌ی چت) — قبل از دکمه‌ی بستن رندر می‌شوند */
    headerExtra?: ReactNode;
    children: ReactNode;
}

const WIDTH_STORAGE_KEY = 'ads2.chatSidebarWidth';
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 340;
const MAX_WIDTH = 760;

// ────────────────────────────── Component ──────────────────────────────

/**
 * سایدبار کشویی چت — همان الگوی باز/بسته شدن پنل چت explore (عرض 0 ↔ مقصد با
 * transition و بک‌دراپ در موبایل) با این تفاوت که عرضِ پنل با کشیدن دستگیره‌ی
 * لبه‌ی داخلی قابل resize است و انتخاب کاربر در localStorage می‌ماند.
 * پنل در انتهای محور inline می‌نشیند (در RTL سمت چپ صفحه) و دستگیره روی لبه‌ی
 * inline-start آن است.
 */
export default function AdsChatSidebar({ open, onClose, title, headerExtra, children }: AdsChatSidebarProps) {
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [resizing, setResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement | null>(null);

    // عرض ذخیره‌شده‌ی کاربر — با microtask بعد از mount می‌آید تا با SSR تضاد نداشته باشد
    useEffect(() => {
        const stored = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
        if (Number.isFinite(stored) && stored >= MIN_WIDTH && stored <= MAX_WIDTH) {
            queueMicrotask(() => setWidth(stored));
        }
    }, []);

    const startResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const rtl = (document.documentElement.dir || 'ltr') === 'rtl';
        const startX = event.clientX;
        const startWidth = panelRef.current?.offsetWidth || width;
        const panel = event.currentTarget;
        panel.setPointerCapture(event.pointerId);
        setResizing(true);

        const onMove = (moveEvent: PointerEvent) => {
            // LTR: کشیدن به راست پهن می‌کند؛ RTL: کشیدن به چپ
            const delta = rtl ? startX - moveEvent.clientX : moveEvent.clientX - startX;
            const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(startWidth + delta)));
            setWidth(next);
        };
        const onUp = () => {
            panel.releasePointerCapture(event.pointerId);
            panel.removeEventListener('pointermove', onMove);
            panel.removeEventListener('pointerup', onUp);
            panel.removeEventListener('pointercancel', onUp);
            setResizing(false);
            setWidth((finalWidth) => {
                window.localStorage.setItem(WIDTH_STORAGE_KEY, String(finalWidth));
                return finalWidth;
            });
        };
        panel.addEventListener('pointermove', onMove);
        panel.addEventListener('pointerup', onUp);
        panel.addEventListener('pointercancel', onUp);
    }, [width]);

    return (
        <>
            <button
                type="button"
                className={styles.sideBackdrop}
                aria-label="بستن چت"
                onClick={onClose}
                tabIndex={-1}
            />
            <aside
                ref={panelRef}
                className={`${styles.sidePanel} ${open ? styles.sideOpen : ''} ${resizing ? styles.sideResizing : ''}`}
                style={{ '--side-w': `${width}px` } as CSSProperties}
                aria-hidden={!open}
            >
                <div
                    className={styles.sideResizeHandle}
                    onPointerDown={startResize}
                    title="تغییر عرض"
                    aria-hidden
                />
                <div className={styles.sideContent}>
                    <div className={styles.sideHeader}>
                        {/* جایگاه نوار پروژه‌ی صفحه — اگر صفحه چیزی نگذارد، عنوان دیده می‌شود */}
                        <div id={ADS_CHAT_HEADER_SLOT_ID} className={styles.sideHeaderSlot} />
                        <span className={styles.sideTitle}>{title}</span>
                        {headerExtra ? (
                            <div className={styles.sideHeaderActions}>{headerExtra}</div>
                        ) : null}
                        <button
                            type="button"
                            className={styles.sideClose}
                            onClick={onClose}
                            aria-label="بستن"
                            title="بستن"
                        >
                            <LuX size={15} />
                        </button>
                    </div>
                    {/* جایگاه کارت‌های بالای چت (برند کیت) — از صفحه با portal پر می‌شود */}
                    <div id={ADS_CHAT_TOP_SLOT_ID} className={styles.sideTopSlot} />
                    <div className={styles.sideBody}>{children}</div>
                </div>
            </aside>
        </>
    );
}
