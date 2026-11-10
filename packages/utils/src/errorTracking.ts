/**
 * ETR — SDK سبک پایش خطا برای مرورگر (مدل Sentry SDK، بدون وابستگی)
 *
 * یک‌بار در ریشه اپ مقداردهی می‌شود:
 *   initErrorTracking({ baseUrl: process.env.NEXT_PUBLIC_API_URL, publicKey: process.env.NEXT_PUBLIC_ETR_KEY });
 * و بعد از لاگین، اطلاعات کاربر برای همه خطاهای بعدی ضمیمه می‌شود:
 *   etr.setUser({ id, email, username });
 *
 * رفتارها:
 * - خطاهای مدیریت‌نشده (window error + unhandledrejection) به‌صورت خودکار ثبت می‌شوند
 * - breadcrumb خودکار برای هر fetch (آدرس، وضعیت، مدت) — خطاهای شبکه هم قبل از کرش دیده می‌شوند
 * - رویدادها صف و هر ۵ ثانیه (یا هنگام بستن تب با sendBeacon) دسته‌ای ارسال می‌شوند
 * - سقف ۲۰ رویداد در دقیقه سمت کلاینت + حذف تکراری‌های پشت‌سرهم (ضد طوفان خطا)
 * - publicKey خالی = کاملاً غیرفعال (بدون هیچ درخواست شبکه)
 */

export type EtrLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface EtrUser {
    id?: string;
    email?: string;
    username?: string;
}

interface EtrBreadcrumb {
    timestamp: string;
    category: string;
    level: string;
    message: string;
    data?: Record<string, any>;
}

interface EtrEventPayload {
    event_id: string;
    timestamp: string;
    level: EtrLevel;
    message?: string;
    exception?: { type: string; value: string; stacktrace: any[] };
    user?: EtrUser;
    request?: Record<string, any>;
    runtime?: Record<string, any>;
    context?: Record<string, any>;
    tags?: Record<string, any>;
    breadcrumbs?: EtrBreadcrumb[];
    environment?: string;
    release?: string;
}

interface EtrConfig {
    baseUrl: string;
    ingestPath: string;
    publicKey: string;
    environment: string;
    release: string;
    appName: string;
}

const MAX_BREADCRUMBS = 100;
const MAX_QUEUE = 30;
const FLUSH_INTERVAL_MS = 5_000;
const CLIENT_RATE_LIMIT_PER_MINUTE = 20;
const DEDUPE_WINDOW_MS = 2_000;

const state = {
    config: null as EtrConfig | null,
    user: undefined as EtrUser | undefined,
    tags: {} as Record<string, any>,
    breadcrumbs: [] as EtrBreadcrumb[],
    queue: [] as EtrEventPayload[],
    sentTimestamps: [] as number[],
    lastSignature: '',
    lastSignatureAt: 0,
    installed: false,
    flushTimer: undefined as ReturnType<typeof setInterval> | undefined,
};

function uuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * فریم‌های stack با ستون — در build production کل کد در یک خط minify شده و بدون ستون، سرور
 * نمی‌تواند با source map به فایل/خط اصلی برگردد. هر دو قالب Chrome/Edge (`at fn (url:l:c)`) و
 * Firefox/Safari (`fn@url:l:c`).
 */
function parseStack(stack: string): any[] {
    return (stack || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 40)
        .map((line) => {
            const chrome = line.match(/^at\s+(?:(.+?)(?:\s+\[as\s+\S+\])?\s+\()?(.+?):(\d+):(\d+)\)?$/);
            if (chrome) {
                return { function: chrome[1] || '', filename: chrome[2], lineno: Number(chrome[3]), colno: Number(chrome[4]) };
            }
            const gecko = line.match(/^(.*?)@(.+?):(\d+):(\d+)$/);
            if (gecko) {
                return { function: gecko[1] || '', filename: gecko[2], lineno: Number(gecko[3]), colno: Number(gecko[4]) };
            }
            return null;
        })
        .filter((frame): frame is { function: string; filename: string; lineno: number; colno: number } => Boolean(frame))
        .slice(0, 30);
}

/**
 * اعلان‌های بی‌خطر مرورگر که باگ نیستند و فقط طوفان رویداد می‌سازند (Sentry هم پیش‌فرض نادیده می‌گیرد):
 * ResizeObserver وقتی در همان فریم تغییر اندازهٔ تازه‌ای رخ دهد، بقیه را به فریم بعد می‌برد و این پیام را می‌دهد.
 */
const IGNORED_MESSAGES = [/^ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i];

function isIgnoredMessage(message: string): boolean {
    return IGNORED_MESSAGES.some((pattern) => pattern.test(String(message || '').trim()));
}

function addBreadcrumb(category: string, message: string, data?: Record<string, any>, level = 'info'): void {
    state.breadcrumbs.push({ timestamp: new Date().toISOString(), category, level, message, data });
    if (state.breadcrumbs.length > MAX_BREADCRUMBS) state.breadcrumbs.shift();
}

function underRateLimit(): boolean {
    const now = Date.now();
    state.sentTimestamps = state.sentTimestamps.filter((t) => now - t < 60_000);
    return state.sentTimestamps.length < CLIENT_RATE_LIMIT_PER_MINUTE;
}

function enqueue(event: EtrEventPayload): void {
    if (!underRateLimit()) return; // سقف نرخ پر شده — رویداد ارسال نمی‌شود
    state.sentTimestamps.push(Date.now());
    if (state.queue.length >= MAX_QUEUE) state.queue.shift();
    state.queue.push(event);
}

function flush(): void {
    if (!state.config || !state.queue.length) return;
    const events = state.queue.splice(0, MAX_QUEUE);
    const url = `${state.config.baseUrl}${state.config.ingestPath}`;
    const body = JSON.stringify({ events });
    try {
        // keepalive باعث می‌شود درخواست هنگام بستن تب هم کامل شود
        void fetch(url, {
            method: 'POST',
            keepalive: true,
            headers: { 'content-type': 'application/json', 'x-etr-key': state.config.publicKey },
            body,
        }).catch(() => {});
    } catch {
        // هیچ‌گاه اپ اصلی را مختل نکن
    }
}

/**
 * ساخت و صف‌کردن رویداد از یک خطا (ثبت دستی یا از هندلرهای سراسری).
 * `frames` برای خطاهایی که شیء Error ندارند (ErrorEvent فقط با پیام و فایل/خط) — تا stack خودِ SDK
 * به‌جای محل واقعی ثبت نشود.
 */
function capture(error: unknown, level: EtrLevel = 'error', context?: Record<string, any>, frames?: any[]): void {
    if (!state.config || typeof window === 'undefined') return;

    const err = error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : (() => { try { return JSON.stringify(error); } catch { return String(error); } })());
    if (isIgnoredMessage(err.message)) return;
    const now = Date.now();

    // تکرار همان خطا در بازه کوتاه ارسال نمی‌شود ولی در breadcrumb ها باقی می‌ماند
    const signature = `${err.name}:${err.message}`;
    if (signature === state.lastSignature && now - state.lastSignatureAt < DEDUPE_WINDOW_MS) return;
    state.lastSignature = signature;
    state.lastSignatureAt = now;

    let request: Record<string, any> | undefined;
    try {
        request = {
            url: window.location.href,
            headers: { 'User-Agent': navigator.userAgent },
        };
    } catch { /* ignore */ }

    enqueue({
        event_id: uuid(),
        timestamp: new Date().toISOString(),
        level,
        exception: { type: err.name, value: err.message, stacktrace: frames ?? parseStack(err.stack || '') },
        user: state.user,
        request,
        runtime: { browser: navigator.userAgent, language: navigator.language },
        context,
        tags: { platform: 'javascript', app: state.config.appName, screen: window.location.pathname, ...state.tags },
        breadcrumbs: [...state.breadcrumbs],
        environment: state.config.environment,
        release: state.config.release,
    });
}

/** نصب هندلرهای سراسری + breadcrumb خودکار fetch — فقط یک‌بار */
function installGlobalHandlers(): void {
    if (state.installed || typeof window === 'undefined') return;
    state.installed = true;

    window.addEventListener('error', (event) => {
        if (event.error) {
            capture(event.error, 'error');
            return;
        }
        // ErrorEvent بدون شیء Error (مثل «Script error.» اسکریپت cross-origin): فقط پیام + فایل/خطی که مرورگر داده —
        // نه یک Error ساختگی که stack آن به کد همین SDK اشاره کند. اعلان‌های بی‌خطر در capture حذف می‌شوند.
        if (!event.message) return;
        const frames = event.filename
            ? [{ function: '', filename: event.filename, lineno: event.lineno || undefined, colno: event.colno || undefined }]
            : [];
        capture(new Error(event.message), 'warning', undefined, frames);
    });
    window.addEventListener('unhandledrejection', (event) => capture(event.reason, 'error'));

    if (typeof window.fetch === 'function' && !(window.fetch as any).__etrPatched) {
        const originalFetch = window.fetch.bind(window);
        const patched: typeof fetch = async (input, init) => {
            const url = typeof input === 'string' ? input : (input as Request)?.url || String(input);
            const method = init?.method || (input as Request)?.method || 'GET';
            const startedAt = Date.now();
            try {
                const res = await originalFetch(input as any, init);
                // ترافیک خودِ پایش خطا breadcrumb نمی‌شود (جلوگیری از حلقه)
                if (!url.includes(state.config?.ingestPath || '/api/error-tracking')) {
                    addBreadcrumb('http', `${method} ${url}`, { status: res.status, duration: Date.now() - startedAt });
                }
                return res;
            } catch (e) {
                if (!url.includes(state.config?.ingestPath || '/api/error-tracking')) {
                    addBreadcrumb('http', `${method} ${url}`, { error: String(e), duration: Date.now() - startedAt }, 'error');
                }
                throw e;
            }
        };
        (patched as any).__etrPatched = true;
        window.fetch = patched;
    }

    // قبل از بستن/پنهان‌شدن تب، باقی‌مانده صف ارسال شود
    window.addEventListener('pagehide', () => flush());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
    });
}

export interface EtrInitOptions {
    /** آدرس پایه API هاب پایش خطا (مثل NEXT_PUBLIC_API_URL یا NEXT_PUBLIC_ETR_URL) */
    baseUrl?: string;
    /** کلید عمومی پروژه از پنل پایش خطا — خالی/نامشخص = غیرفعال */
    publicKey?: string;
    /** مسیر ingestion — پیش‌فرض /api/error-tracking/envelope */
    ingestPath?: string;
    /** پیش‌فرض process.env.NODE_ENV */
    environment?: string;
    /** نسخه اپ برای رهگیری Release ها */
    release?: string;
    /** نام این اپ — در پنل پایش خطا ستون «اپ تحت رصد» را پر می‌کند */
    appName?: string;
}

/** مقداردهی اولیه — در کامپوننت کلاینت ریشه اپ صدا زده می‌شود */
export function initErrorTracking(options: EtrInitOptions): void {
    if (typeof window === 'undefined') return;
    const baseUrl = options.baseUrl || '';
    const publicKey = options.publicKey || '';
    if (!baseUrl || !publicKey) return; // بدون کلید، SDK کاملاً خاموش است

    state.config = {
        baseUrl: baseUrl.replace(/\/+$/, ''),
        ingestPath: options.ingestPath || '/api/error-tracking/envelope',
        publicKey,
        environment: options.environment || process.env.NODE_ENV || 'production',
        release: options.release || '',
        appName: options.appName || 'web-app',
    };
    installGlobalHandlers();
    if (state.flushTimer) clearInterval(state.flushTimer);
    state.flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
}

/** آبجکت سراسری ثبت خطا/کاربر/تگ/breadcrumb */
export const etr = {
    setUser(user: EtrUser | undefined): void {
        state.user = user && (user.id || user.email) ? user : undefined;
    },
    setTags(tags: Record<string, any>): void {
        Object.assign(state.tags, tags);
    },
    addBreadcrumb,
    capture,
    /** ارسال فوری صف (برای مواقع خاص مثل بعد از ثبت یک خطای fatal) */
    flush,
};
