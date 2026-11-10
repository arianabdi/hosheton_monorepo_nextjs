import { Suspense } from 'react';
import type { Metadata } from 'next';
import AnimationsInspector from './AnimationsInspector';

/* منوی توسعه‌دهنده ← انیمیشن‌ها: بررسی و بهبود انیمیشن‌های گربهٔ چت (فقط admin / super-admin) */

export const metadata: Metadata = {
    title: 'Animations',
    robots: { index: false, follow: false },
};

export default function AnimationsPage() {
    return (
        <Suspense fallback={null}>
            <AnimationsInspector />
        </Suspense>
    );
}
