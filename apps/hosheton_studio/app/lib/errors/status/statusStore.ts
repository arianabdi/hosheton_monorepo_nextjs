'use client';

import { create } from 'zustand';
import {
    PROBE_TIMEOUT_MS,
    RECOVERED_VISIBLE_MS,
    RECOVERY_BACKOFF_SECONDS,
    STATUS_ISSUES,
    higherPriority,
    type StatusIssueId,
} from './issues';

export type StatusPhase = 'hidden' | 'active' | 'recovered';

interface StatusState {
    phase: StatusPhase;
    /** مشکلی که بنر نشان می‌دهد (در phase=recovered همان مشکلِ برطرف‌شده) */
    issue: StatusIssueId | null;
    /** چک سرور همین الان در جریان است */
    checking: boolean;
    /** زمان چک بعدی (ms) برای شمارش معکوس؛ null = منتظر رویداد مرورگر */
    nextCheckAt: number | null;
}

export const useStatusStore = create<StatusState>(() => ({
    phase: 'hidden',
    issue: null,
    checking: false,
    nextCheckAt: null,
}));

const set = useStatusStore.setState;
const get = useStatusStore.getState;

let attempt = 0;
let checkTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let checkInFlight: Promise<void> | null = null;
let pendingConfirm: Promise<boolean> | null = null;
let pendingIssue: StatusIssueId | null = null;
let listenersInstalled = false;
const recoveryListeners = new Set<() => void>();

const isBrowser = () => typeof window !== 'undefined';
/** تابع (نه مقایسهٔ مستقیم) تا مقدار تازه بعد از await دوباره خوانده شود */
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

function apiBase(): string {
    return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

/** نتیجهٔ چک: ok = سالم؛ reachable = سرور جواب داد ولی وضعیتش معلوم نیست (CORS)؛ بقیه = همان مشکل */
type ProbeResult = 'ok' | 'reachable' | StatusIssueId;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, cache: 'no-store', signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/** چک سبک سلامت سرور (`GET /api/health` در API استودیو) */
async function probe(): Promise<ProbeResult> {
    if (isOffline()) return 'offline';
    const base = apiBase();
    try {
        const res = await fetchWithTimeout(`${base}/api/health`, { method: 'GET' });
        if (res.status === 502 || res.status === 503 || res.status === 504) return 'service';
        // هر پاسخ دیگری (حتی 404 روی سرور قدیمی بدون health) یعنی سرور زنده است
        return 'ok';
    } catch {
        if (isOffline()) return 'offline';
        // پاسخ بدون هدر CORS (صفحهٔ خطای CDN) هم با TypeError می‌آید؛ no-cors فقط «رسیدن» را می‌سنجد
        try {
            await fetchWithTimeout(`${base}/`, { method: 'GET', mode: 'no-cors' });
            return 'reachable';
        } catch {
            return 'network';
        }
    }
}

function clearTimers(): void {
    if (checkTimer) clearTimeout(checkTimer);
    checkTimer = null;
}

function scheduleNextCheck(): void {
    clearTimers();
    const issue = get().issue;
    // آفلاین: منتظر رویداد online مرورگر می‌مانیم، چک بی‌فایده نمی‌زنیم
    if (!issue || STATUS_ISSUES[issue].recovery === 'browser') {
        set({ nextCheckAt: null });
        return;
    }
    const seconds = RECOVERY_BACKOFF_SECONDS[Math.min(attempt, RECOVERY_BACKOFF_SECONDS.length - 1)];
    set({ nextCheckAt: Date.now() + seconds * 1000 });
    checkTimer = setTimeout(() => void runRecoveryCheck(), seconds * 1000);
}

function activate(issue: StatusIssueId): void {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    const current = get();
    const next = current.phase === 'active' ? higherPriority(current.issue, issue) : issue;
    if (current.phase !== 'active') attempt = 0;
    if (current.phase === 'active' && current.issue === next) return;
    set({ phase: 'active', issue: next });
    scheduleNextCheck();
}

function recover(): void {
    if (get().phase !== 'active') return;
    clearTimers();
    attempt = 0;
    set({ phase: 'recovered', checking: false, nextCheckAt: null });
    recoveryListeners.forEach((listener) => {
        try {
            listener();
        } catch {
            // شنونده‌ی صفحه نباید بنر را خراب کند
        }
    });
    hideTimer = setTimeout(() => {
        hideTimer = null;
        if (get().phase === 'recovered') set({ phase: 'hidden', issue: null });
    }, RECOVERED_VISIBLE_MS);
}

function applyProbe(result: ProbeResult): void {
    // در همین فاصله یک پاسخ موفق API بنر را بسته است
    if (get().phase !== 'active') return;
    const issue = get().issue;
    if (result === 'ok' || (result === 'reachable' && issue !== 'service')) {
        recover();
        return;
    }
    attempt += 1;
    // نوع مشکل ممکن است عوض شود (اینترنت برگشت ولی سرور هنوز 503 می‌دهد)
    set({ issue: result === 'reachable' ? issue : result });
    scheduleNextCheck();
}

async function runRecoveryCheck(): Promise<void> {
    if (get().phase !== 'active') return;
    if (checkInFlight) return checkInFlight;
    clearTimers();
    set({ checking: true, nextCheckAt: null });
    checkInFlight = probe()
        .then(applyProbe)
        .finally(() => {
            checkInFlight = null;
            set({ checking: false });
        });
    return checkInFlight;
}

function installListeners(): void {
    if (listenersInstalled || !isBrowser()) return;
    listenersInstalled = true;
    window.addEventListener('offline', () => void reportStatusIssue('offline'));
    window.addEventListener('online', () => void runRecoveryCheck());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void runRecoveryCheck();
    });
}

/**
 * گزارش یک مشکل سراسری. Promise:
 * - true  = مشکل تأیید شد و بنر نمایش داده می‌شود
 * - false = چک سرور سالم بود (خطای تکی) — صدازننده می‌تواند پیام عادی خودش را نشان دهد
 */
export function reportStatusIssue(issue: StatusIssueId): Promise<boolean> {
    if (!isBrowser()) return Promise.resolve(false);
    installListeners();
    if (get().phase === 'active') {
        activate(issue);
        return Promise.resolve(true);
    }
    if (!STATUS_ISSUES[issue].confirmWithProbe) {
        activate(issue);
        return Promise.resolve(true);
    }
    pendingIssue = higherPriority(pendingIssue, issue);
    if (pendingConfirm) return pendingConfirm;
    pendingConfirm = probe()
        .then((result) => {
            const reported = pendingIssue ?? issue;
            if (result === 'ok' || (result === 'reachable' && reported !== 'service')) return false;
            activate(result === 'reachable' ? reported : higherPriority(reported, result));
            return true;
        })
        .catch(() => false)
        .finally(() => {
            pendingConfirm = null;
            pendingIssue = null;
        });
    return pendingConfirm;
}

/** یک پاسخ موفق از API رسید — اتصال برقرار است (از interceptor کلاینت API) */
export function markServerReachable(): void {
    if (get().phase === 'active') recover();
}

/** دکمهٔ «تلاش دوباره» بنر */
export function retryStatusNow(): void {
    void runRecoveryCheck();
}

/** وقتی مشکل سراسری برطرف شد صدا زده می‌شود (مثلاً برای بارگذاری دوبارهٔ داده‌ی صفحه) */
export function onStatusRecovered(listener: () => void): () => void {
    recoveryListeners.add(listener);
    return () => {
        recoveryListeners.delete(listener);
    };
}

/** آیا الان بنر یک مشکل فعال را نشان می‌دهد؟ */
export function hasActiveStatusIssue(): boolean {
    return get().phase === 'active';
}
