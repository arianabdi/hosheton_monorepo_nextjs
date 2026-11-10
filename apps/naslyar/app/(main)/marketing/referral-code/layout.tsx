'use client';

import type { ReactNode } from 'react';
import { ReferralAdminProvider } from './lib/ReferralAdminProvider';

/**
 * ماژول کد معرف — کلاینت API و revision مشترک برای تب‌ها و فرم‌های کمپین.
 * شل تب‌ها در (tabs)/layout.tsx است؛ فرم‌های افزودن/ویرایش کمپین بیرون از آن و بدون تب‌اند.
 */
export default function ReferralCodeLayout({ children }: { children: ReactNode }) {
    return <ReferralAdminProvider>{children}</ReferralAdminProvider>;
}
