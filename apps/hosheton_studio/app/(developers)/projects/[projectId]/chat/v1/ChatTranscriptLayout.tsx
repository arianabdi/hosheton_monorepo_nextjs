'use client';

import { createContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { observeResize } from '@my-workspace/utils';
import styles from './ChatTranscriptLayout.module.scss';

/**
 * «در حال دیدن خروجی‌ها»: از لبهٔ تازه‌ترین پیام دور شده — کادر نوشتن در موبایل جمع می‌شود
 * (ChatInput) تا جای بیشتری برای تصاویر بماند. بیرون از این لایه (صفحهٔ خالی) همیشه false.
 */
export const ChatBrowsingContext = createContext(false);

export function ChatTranscriptLayout({
    children,
    composer,
    pinEdge = 'bottom',
}: {
    children: ReactNode;
    composer: ReactNode;
    /** v1 transcript sticks to the latest message; v2 gallery keeps newest tiles at the top. */
    pinEdge?: 'bottom' | 'top';
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [browsing, setBrowsing] = useState(false);
    const browsingRef = useRef(false);
    const syncOverlapRef = useRef<() => void>(() => {});
    const dockRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const dock = dockRef.current;
        const scroll = scrollRef.current;
        if (!dock || !scroll) return;
        let overlap = 0;

        const syncOverlap = () => {
            const height = Math.ceil(dock.getBoundingClientRect().height);
            // کادر جمع‌شده (حین اسکرول خروجی‌ها) padding اسکرول را کم نکند: تغییر اندازهٔ ناحیهٔ اسکرول
            // وسط اسکرول، مومنتوم iOS را قطع می‌کرد و observer چسباندن را صدا می‌زد (پرش به اول)
            if (browsingRef.current && height < overlap) return;
            overlap = height;
            scroll.style.setProperty('--composer-overlap', `${height}px`);
        };
        syncOverlapRef.current = syncOverlap;

        syncOverlap();
        // فریم بعد: این CSS var اندازهٔ ناحیه اسکرول را عوض می‌کند که observer پایین‌تر هم آن را می‌پاید —
        // اعمال در همان فریم خطای «ResizeObserver loop …» می‌داد
        return observeResize(dock, syncOverlap);
    }, []);

    // برگشت به تازه‌ترین پیام: کادر کامل شده و padding اسکرول با اندازهٔ واقعی‌اش هماهنگ می‌شود
    useEffect(() => {
        browsingRef.current = browsing;
        if (!browsing) syncOverlapRef.current();
    }, [browsing]);

    useLayoutEffect(() => {
        const scroll = scrollRef.current;
        if (!scroll) return;
        const pin = { current: true };
        const pinTop = pinEdge === 'top';

        // اسکرول با دست کاربر (نه چسباندن خودکار): کادر فوکوس را رها می‌کند (کیبورد بسته می‌شود)
        // تا حالت جمع‌شده — که با فوکوس خاموش است — روی گوشی هم اعمال شود
        let lastGesture = 0;
        const markGesture = () => {
            lastGesture = Date.now();
        };

        const onScroll = () => {
            // فاصله از لبهٔ تازه‌ترین پیام؛ جمع شدن کادر با ۲۴px شروع و فقط نزدیک لبه (۸px) تمام می‌شود
            // تا روی مرز رفت‌وبرگشت نکند
            const distance = pinTop
                ? scroll.scrollTop
                : scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight;
            const away = browsingRef.current ? distance > 8 : distance > 24;
            // در حال دیدن خروجی‌ها چسباندن خاموش است — وگرنه تغییر اندازهٔ کادر کاربر را به اول برمی‌گرداند
            pin.current = !away && distance < 96;
            browsingRef.current = away;
            setBrowsing(away);
            if (away && Date.now() - lastGesture < 1200) {
                const active = document.activeElement;
                if (active instanceof HTMLElement && dockRef.current?.contains(active)) active.blur();
            }
        };
        scroll.addEventListener('scroll', onScroll, { passive: true });
        scroll.addEventListener('touchmove', markGesture, { passive: true });
        scroll.addEventListener('wheel', markGesture, { passive: true });

        const stick = () => {
            if (!pin.current) return;
            scroll.scrollTop = pinTop ? 0 : scroll.scrollHeight;
        };
        stick();
        const observer = new ResizeObserver(stick);
        observer.observe(scroll);
        const content = scroll.firstElementChild;
        if (content) observer.observe(content);

        return () => {
            scroll.removeEventListener('scroll', onScroll);
            scroll.removeEventListener('touchmove', markGesture);
            scroll.removeEventListener('wheel', markGesture);
            observer.disconnect();
            setBrowsing(false);
        };
    }, [pinEdge]);

    return (
        <ChatBrowsingContext.Provider value={browsing}>
            <div className={styles.shell} data-chat-shell>
                <div
                    ref={scrollRef}
                    className={`${styles.scroll} ${pinEdge === 'top' ? styles.scrollPinTop : ''}`}
                    data-chat-scroll
                >
                    {children}
                </div>
                <div ref={dockRef} className={styles.dock}>
                    <div className={styles.composer} data-chat-composer>{composer}</div>
                </div>
            </div>
        </ChatBrowsingContext.Provider>
    );
}
