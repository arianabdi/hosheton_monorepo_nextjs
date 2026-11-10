import { useEffect, type CSSProperties, type RefObject } from 'react';

const GUTTER = 12;
const VIEWPORT_GUTTER = 8;
const WIDE_POPOVER_PX = 360;
/** محدوده‌های باریک‌تر از این، پنجره را تمام‌عرض می‌گیرند */
const NARROW_BOUNDS_PX = 720;

export type PopoverBounds = { element: HTMLElement; gutter: number };

/**
 * محدوده‌ای که پنجره‌های شناور کادر چت (تنظیمات مدل، انتخاب مدل، تخمین هزینه) باید داخلش بمانند:
 * ۱. میزبانی که خودش را با data-chat-popover-bounds علامت زده (مثل سایدبار تنظیمات نود)
 * ۲. ناحیه پیام‌های چتِ دارای پیام
 * ۳. کل ستون چت — مثلاً چت خالی یا چت کشویی explore که ناحیه پیام ندارد
 */
export function resolvePopoverBounds(anchor: HTMLElement): PopoverBounds | null {
    const marked = anchor.closest<HTMLElement>('[data-chat-popover-bounds]');
    if (marked) return { element: marked, gutter: 0 };
    const scroll = anchor.closest('[data-chat-shell]')?.querySelector<HTMLElement>('[data-chat-scroll]');
    if (scroll) return { element: scroll, gutter: GUTTER };
    const column = anchor.closest<HTMLElement>('[data-chat-column]');
    return column ? { element: column, gutter: GUTTER } : null;
}

function horizontalRange(bounds: PopoverBounds | null) {
    const area = bounds?.element.getBoundingClientRect();
    const gutter = bounds ? bounds.gutter : VIEWPORT_GUTTER;
    const left = Math.max(VIEWPORT_GUTTER, (area ? area.left : 0) + gutter);
    const right = Math.min(window.innerWidth - VIEWPORT_GUTTER, (area ? area.right : window.innerWidth) - gutter);
    return { left, right, width: Math.max(0, right - left), boundsWidth: area?.width ?? window.innerWidth };
}

/**
 * پنجره تنظیمات/تخمین هزینه: در محدوده باریک ۱۰۰٪ عرض محدوده؛ در محدوده پهن ۳۶۰px
 * کنار دکمه — در هر دو حالت هرگز از محدوده بیرون نمی‌زند.
 */
export function panelPopoverPlacement(anchorRect: DOMRect, bounds: PopoverBounds | null) {
    const range = horizontalRange(bounds);
    if (bounds && range.boundsWidth <= NARROW_BOUNDS_PX) {
        return { fill: true, style: { left: range.left, width: range.width } satisfies CSSProperties };
    }
    const width = Math.min(WIDE_POPOVER_PX, range.width);
    const left = Math.max(range.left, Math.min(anchorRect.left, range.right - width));
    return { fill: false, style: { left, width } satisfies CSSProperties };
}

/** منوهای کوچک (انتخاب مدل/نوع): عرض دلخواه، ولی جابه‌جا و در صورت لزوم باریک می‌شوند تا داخل محدوده بمانند */
export function menuPopoverPlacement(anchorRect: DOMRect, preferredWidth: number, bounds: PopoverBounds | null): CSSProperties {
    const range = horizontalRange(bounds);
    const width = Math.min(preferredWidth, range.width);
    const left = Math.max(range.left, Math.min(anchorRect.left, range.right - width));
    return { left, width };
}

/**
 * پنجره شناوری که به دکمه چسبیده، با اسکرولِ ظرفی که دکمه داخل آن است بسته می‌شود
 * (مثلاً اسکرول سایدبار تنظیمات نود). اسکرول داخل خود پنجره، یا ناحیه‌ای که دکمه
 * داخلش نیست (مثل پیام‌های چت بالای کادر)، پنجره را نمی‌بندد.
 */
export function useCloseOnAnchorScroll(
    open: boolean,
    anchorRef: RefObject<HTMLElement | null>,
    menuRef: RefObject<HTMLElement | null>,
    setOpen: (open: boolean) => void,
) {
    useEffect(() => {
        if (!open) return;
        const onScroll = (event: Event) => {
            const anchor = anchorRef.current;
            const target = event.target;
            if (!anchor) return;
            if (target instanceof Node && menuRef.current?.contains(target)) return;
            if (target === document || (target instanceof Node && target.contains(anchor))) setOpen(false);
        };
        // scroll حباب نمی‌زند؛ در فاز capture روی window همه ظرف‌ها دیده می‌شوند
        window.addEventListener('scroll', onScroll, true);
        return () => window.removeEventListener('scroll', onScroll, true);
    }, [open, anchorRef, menuRef, setOpen]);
}

/**
 * منوها بالای دکمه باز می‌شوند (کادر چت پایین صفحه است)؛ اگر بالا جا نباشد —
 * مثل تولبار بالای سایدبار تنظیمات نود — زیر دکمه باز می‌شوند.
 */
export function verticalMenuPlacement(rect: DOMRect, cap: number, min: number): CSSProperties {
    const above = rect.top - 16;
    const below = window.innerHeight - rect.bottom - 16;
    if (above >= Math.min(cap, 240) || above >= below) {
        return {
            bottom: Math.max(12, window.innerHeight - rect.top + 8),
            top: 'auto',
            maxHeight: Math.min(cap, Math.max(min, above)),
        };
    }
    return {
        top: rect.bottom + 8,
        bottom: 'auto',
        maxHeight: Math.min(cap, Math.max(min, below)),
    };
}
