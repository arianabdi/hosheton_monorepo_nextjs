'use client';

import type { ReactNode } from 'react';
import { ErrorTrackingProvider } from './lib/ErrorTrackingProvider';

/**
 * ماژول پایش خطا — داده مشترک (پروژه‌ها، کش تب‌ها) برای تب‌ها و فرم‌ها.
 * شل تب‌ها در (tabs)/layout.tsx است؛ جزئیات مشکل و فرم‌های افزودن/ویرایش بیرون از آن و بدون تب‌اند.
 */
export default function ErrorTrackingLayout({ children }: { children: ReactNode }) {
    return <ErrorTrackingProvider>{children}</ErrorTrackingProvider>;
}
