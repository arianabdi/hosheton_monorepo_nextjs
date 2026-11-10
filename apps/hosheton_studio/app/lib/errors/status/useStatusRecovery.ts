'use client';

import { useEffect, useRef } from 'react';
import { onStatusRecovered } from './statusStore';

/**
 * وقتی اتصال برگشت، callback صفحه اجرا می‌شود — مثلاً داده‌ای که در قطعی بار نشد دوباره خوانده شود.
 *
 * useStatusRecovery(() => reload());
 */
export function useStatusRecovery(callback: () => void): void {
    const ref = useRef(callback);
    useEffect(() => {
        ref.current = callback;
    });
    useEffect(() => onStatusRecovered(() => ref.current()), []);
}
