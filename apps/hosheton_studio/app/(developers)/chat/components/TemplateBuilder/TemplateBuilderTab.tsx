'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LuLayoutTemplate } from 'react-icons/lu';
import { useAppStore } from '@/app/zustand/store/useAppStore';
import { useMobileViewport } from '@/app/hooks/useMobileViewport';
import { rehydrateTemplateCreateStore, useTemplateCreateStore } from '@/app/zustand/store/useTemplateCreateStore';
import { TemplateBuilderPanel } from './TemplateBuilderPanel';
import styles from './TemplateBuilder.module.scss';

/**
 * برچسب عمودی «قالب» روی لبه‌ی ستون چت که پنل ساخت قالب را باز می‌کند
 * (مقصد انیمیشن «افزودن به قالب» با data-template-tab).
 * ارتفاعش: هم‌تراز لوگوی صفحه‌ی خالی چت (بالای «شروع کنید») تا روی کادر پیام نیفتد؛ در چت با پیام، وسط.
 * دسکتاپ: پنل لغزان از همان لبه؛ چت باریک/موبایل: پنجرهٔ تمام‌صفحه مثل گالری (نه BottomSheet).
 */
export function TemplateBuilderTab({ sheet, placementKey }: { sheet: boolean; placementKey?: string }) {
    const { t } = useTranslation('projects');
    const [open, setOpen] = useState(false);
    const isPhone = useMobileViewport();
    const tabRef = useRef<HTMLButtonElement>(null);
    const userId = useAppStore((state) => state.userId);
    const hydrated = useTemplateCreateStore((state) => state.hydrated);
    const claimOwner = useTemplateCreateStore((state) => state.claimOwner);
    const count = useTemplateCreateStore((state) => (
        state.hydrated ? state.previewMedia.length + (state.promptText.trim() ? 1 : 0) : 0
    ));

    useEffect(() => {
        rehydrateTemplateCreateStore();
    }, []);
    useEffect(() => {
        if (hydrated) claimOwner(userId);
    }, [hydrated, userId, claimOwner]);

    // هم‌ارتفاع لوگوی صفحه‌ی خالی؛ لوگو بعد از mount / با تغییر اندازه جابه‌جا می‌شود
    useLayoutEffect(() => {
        const tab = tabRef.current;
        const column = tab?.offsetParent as HTMLElement | null;
        if (!tab || !column) return undefined;
        let frame = 0;
        const align = () => {
            frame = 0;
            const logo = column.querySelector<HTMLElement>('[data-chat-stage-logo]');
            if (!logo || !logo.getClientRects().length) {
                tab.style.top = '';
                return;
            }
            const logoRect = logo.getBoundingClientRect();
            const columnRect = column.getBoundingClientRect();
            tab.style.top = `${Math.max(56, logoRect.top + logoRect.height / 2 - columnRect.top)}px`;
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(align);
        };
        align();
        const resize = new ResizeObserver(schedule);
        resize.observe(column);
        // صفحه‌ی خالی (و لوگو) ممکن است بعد از این برچسب رندر شود
        const mutation = new MutationObserver(schedule);
        mutation.observe(column, { childList: true, subtree: true });
        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            resize.disconnect();
            mutation.disconnect();
        };
    }, [placementKey]);

    const title = t('template_builder_title', { defaultValue: 'ساخت قالب' });
    const close = useCallback(() => setOpen(false), []);

    return (
        <>
            <button
                ref={tabRef}
                type="button"
                data-template-tab
                className={`${styles.tab} ${open ? styles.tabActive : ''}`}
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={title}
                title={title}
            >
                <LuLayoutTemplate size={15} aria-hidden />
                <span className={styles.tabLabel}>{t('template_builder_tab', { defaultValue: 'قالب' })}</span>
                {count ? <span className={styles.tabCount}>{count}</span> : null}
            </button>

            {sheet || isPhone ? (
                open ? <TemplateBuilderWindow title={title} onClose={close} /> : null
            ) : (
                <div className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`} aria-hidden={!open}>
                    {open ? <TemplateBuilderPanel onClose={close} /> : null}
                </div>
            )}
        </>
    );
}

/**
 * پنجرهٔ تمام‌صفحهٔ ساخت قالب (چت باریک/موبایل) — همان الگوی پنجرهٔ گالری: inset 0 از فریم اول،
 * قفل اسکرول پس‌زمینه و بستن با Escape؛ ✕ همان ModalCloseButton هدر پنل است.
 */
function TemplateBuilderWindow({ title, onClose }: { title: string; onClose: () => void }) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return createPortal(
        <div className={styles.window} role="dialog" aria-modal="true" aria-label={title}>
            <TemplateBuilderPanel onClose={onClose} />
        </div>,
        document.body,
    );
}

export default TemplateBuilderTab;
