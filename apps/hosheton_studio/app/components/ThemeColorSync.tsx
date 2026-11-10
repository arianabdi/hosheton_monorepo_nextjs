'use client';

import { useEffect } from 'react';
import { BROWSER_THEME_COLORS } from '@/app/lib/browser-theme';

function syncBrowserTheme() {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    // رنگ واقعی هدر از متغیر CSS؛ اگر هنوز استایل‌ها نرسیده‌اند مقدار ثابت
    const color = getComputedStyle(root).getPropertyValue('--plan-card-background-color').trim()
        || BROWSER_THEME_COLORS[theme];
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
    }
    if (meta.content !== color) meta.content = color;
    root.style.colorScheme = theme;
}

/**
 * نوار آدرس/وضعیت مرورگر (Chrome، Safari، Firefox) هم‌رنگ تم برنامه — با هر تغییر data-theme
 * روی <html> (از هر جای برنامه) meta theme-color و color-scheme به‌روز می‌شوند.
 */
export default function ThemeColorSync() {
    useEffect(() => {
        syncBrowserTheme();
        const observer = new MutationObserver(syncBrowserTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    return null;
}
