'use client';

import {useEffect} from 'react';

/** Runs an async loader after mount without a synchronous setState in the effect body. */
export function useLoadOnMount(load: () => void | Promise<void>) {
    useEffect(() => {
        let cancelled = false;
        const timer = window.setTimeout(() => {
            if (!cancelled) void load();
        }, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [load]);
}
