'use client';

import type { ReactNode } from 'react';
import { DatabaseProvider } from './lib/DatabaseProvider';

/** دادهٔ مشترک ماژول دیتابیس (دیتابیس‌ها، وضعیت ابزار، کار در حال اجرا) یک‌بار برای همهٔ صفحه‌ها */
export default function DatabaseLayout({ children }: { children: ReactNode }) {
    return <DatabaseProvider>{children}</DatabaseProvider>;
}
