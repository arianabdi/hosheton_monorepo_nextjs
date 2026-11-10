'use client';

import * as React from 'react';
import { Drawer } from 'vaul';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import styles from '../modalHelper.module.scss';

interface MobileBottomSheetProps {
    open: boolean;
    onDismiss: () => void;
    children: React.ReactNode;
    className?: string;
    title?: string; // Optional: for screen readers
}

const noopSubscribe = () => () => undefined;

/** کلیک داخل پاپ‌اورهای پورتال‌شده (dropdown، date picker و...) شیت را نبندد */
const isInsidePopover = (target: EventTarget | null) =>
    !!(target as HTMLElement | null)?.closest?.('[data-modal-popover]');

/**
 * BottomSheet موبایل (Vaul).
 * استایل پیش‌فرض داخل خود پکیج است (styles.drawerContent)؛ کلاس‌های global
 * `drawer-overlay` / `drawer-content` هم حفظ شده‌اند تا تنظیمات globals.css هر اپ همچنان اعمال شود.
 */
export function MobileBottomSheet({
    open,
    onDismiss,
    children,
    className,
    title = 'Bottom sheet',
}: MobileBottomSheetProps) {
    const isClient = React.useSyncExternalStore(noopSubscribe, () => true, () => false);

    if (!isClient) return null;

    return (
        <Drawer.Root open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
            <Drawer.Portal>
                <Drawer.Overlay className={`drawer-overlay ${styles.drawerOverlay}`} />
                <Drawer.Content
                    className={['drawer-content', styles.drawerContent, className].filter(Boolean).join(' ')}
                    onPointerDownOutside={(event) => {
                        if (isInsidePopover(event.target)) event.preventDefault();
                    }}
                    onInteractOutside={(event) => {
                        if (isInsidePopover(event.target)) event.preventDefault();
                    }}
                >
                    {/* Hidden title for screen readers */}
                    <VisuallyHidden asChild>
                        <Drawer.Title>{title}</Drawer.Title>
                    </VisuallyHidden>

                    <VisuallyHidden asChild>
                        <Drawer.Description>{title}</Drawer.Description>
                    </VisuallyHidden>

                    {children}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
