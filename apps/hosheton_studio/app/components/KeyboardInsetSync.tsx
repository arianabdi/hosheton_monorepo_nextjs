'use client';

import { useEffect } from 'react';

/**
 * کیبورد موبایل روی صفحه — `--keyboard-inset` روی <html>: ارتفاعی از پایین صفحه که کیبورد پوشانده.
 * iOS لایه را کوچک نمی‌کند و پوسته‌ها با این متغیر کوتاه می‌شوند؛ اندروید با viewport
 * `interactive-widget=resizes-content` خودش 100dvh را کم می‌کند و این ۰ می‌ماند.
 * نوار پایین (MobileTabBar) موقع تایپ هم سر جایش می‌ماند.
 */
export default function KeyboardInsetSync() {
    useEffect(() => {
        const root = document.documentElement;
        const vv = window.visualViewport;
        if (!vv) return;

        const update = () => {
            const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
            // چند پیکسل لرزش نوار آدرس کیبورد نیست
            root.style.setProperty('--keyboard-inset', `${inset > 60 ? inset : 0}px`);
        };

        update();
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
            root.style.removeProperty('--keyboard-inset');
        };
    }, []);

    return null;
}
