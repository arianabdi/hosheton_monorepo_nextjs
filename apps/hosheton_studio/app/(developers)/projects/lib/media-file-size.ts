'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';

/**
 * حجم فایل اصلی (نه thumbnail) برای نمایش کنار هزینه/در گالری.
 * sizeBytes اگر روی رسانه باشد همان؛ وگرنه یک‌بار HEAD روی URL اصلی (content-length)،
 * با کش سراسری و سقف درخواست هم‌زمان تا گالری‌های بزرگ شبکه را پر نکنند.
 */
const MAX_PARALLEL = 4;

const sizes = new Map<string, number | null>();
const queue: string[] = [];
const queued = new Set<string>();
const listeners = new Set<() => void>();
let running = 0;
let version = 0;

function emit() {
    version += 1;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function pump() {
    while (running < MAX_PARALLEL && queue.length) {
        const url = queue.shift()!;
        running += 1;
        fetch(url, { method: 'HEAD' })
            .then((res) => {
                const length = Number(res.headers.get('content-length'));
                sizes.set(url, res.ok && Number.isFinite(length) && length > 0 ? length : null);
            })
            .catch(() => sizes.set(url, null))
            .finally(() => {
                running -= 1;
                queued.delete(url);
                emit();
                pump();
            });
    }
}

function request(url: string) {
    if (!/^https?:\/\//.test(url) || sizes.has(url) || queued.has(url)) return;
    queued.add(url);
    queue.push(url);
    pump();
}

export function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
        const mb = bytes / (1024 * 1024);
        return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export type SizedMedia = { url?: string; sizeBytes?: number };

/**
 * حجم یک فایل — برای کاشی‌های فهرست‌های بزرگ (گالری مجازی‌سازی‌شده):
 * HEAD فقط برای کاشی‌هایی که واقعاً mount شده‌اند، و هر کاشی فقط با تغییر حجم خودش رندر می‌شود
 * (نه با هر پاسخ HEAD کل گالری).
 */
export function useMediaFileSize(url?: string, sizeBytes?: number): number {
    const known = Number(sizeBytes) > 0 ? Number(sizeBytes) : 0;
    const key = String(url || '');
    const fetched = useSyncExternalStore(
        subscribe,
        () => (known || !key ? null : sizes.get(key) ?? null),
        () => null,
    );
    useEffect(() => {
        if (!known && key) request(key);
    }, [known, key]);
    return known || fetched || 0;
}

/** حجم چند رسانه یک‌جا — خروجی: url → بایت (فقط آن‌هایی که معلوم شده‌اند). */
export function useMediaFileSizes(items: SizedMedia[]): Map<string, number> {
    const tick = useSyncExternalStore(subscribe, () => version, () => 0);
    const missing = useMemo(
        () => items
            .filter((item) => item.url && !(Number(item.sizeBytes) > 0))
            .map((item) => String(item.url)),
        [items],
    );

    useEffect(() => {
        missing.forEach(request);
    }, [missing]);

    return useMemo(() => {
        void tick;
        const out = new Map<string, number>();
        for (const item of items) {
            if (!item.url) continue;
            const known = Number(item.sizeBytes) > 0 ? Number(item.sizeBytes) : sizes.get(item.url);
            if (known) out.set(item.url, known);
        }
        return out;
    }, [items, tick]);
}
