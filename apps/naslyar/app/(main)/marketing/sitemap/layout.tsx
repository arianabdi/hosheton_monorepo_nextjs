'use client';

import type { ReactNode } from 'react';
import { SitemapProvider } from './lib/SitemapProvider';

/**
 * ماژول سایت‌مپ — داده مشترک (کلاینت API، تنظیمات، کش تب‌ها) برای تب‌ها و فرم‌های گروه.
 * شل تب‌ها در (tabs)/layout.tsx است؛ فرم‌های افزودن/ویرایش گروه بیرون از آن و بدون تب‌اند.
 */
export default function SitemapLayout({ children }: { children: ReactNode }) {
    return <SitemapProvider>{children}</SitemapProvider>;
}
