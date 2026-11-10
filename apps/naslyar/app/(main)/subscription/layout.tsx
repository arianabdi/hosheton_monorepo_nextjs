'use client';

import type { ReactNode } from 'react';
import { SubscriptionProvider } from './lib/SubscriptionProvider';

/**
 * ماژول اشتراک — دادهٔ مشترک (پلن‌ها، ویژگی‌ها، قیمت‌ها) و کش تب‌ها برای همهٔ صفحات.
 * شل تب‌ها در (tabs)/layout.tsx است؛ فرم‌های افزودن/ویرایش و مستندات بیرون از آن و بدون تب‌اند.
 */
export default function SubscriptionLayout({ children }: { children: ReactNode }) {
    return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
