/**
 * کاتالوگ خطاهای هوشتون — هر خطایی که به کاربر نشان داده می‌شود از اینجا رد می‌شود.
 *
 * کاربر فقط پیام‌های خود هوشتون را می‌بیند (namespace `errors` در locales)، نه متن خام
 * ارائه‌دهنده‌ها (Atlas، fal، OpenAI و…) یا جزئیات فنی (HTTP status، stack، URL).
 * متن خام فقط در پایش خطا (naslyar > پایش خطا) ثبت می‌شود.
 *
 * دو نوع ورودی:
 * - `generation`: خطای اجرای گره/چت (worker). متن آزاد هرگز عیناً نمایش داده نمی‌شود؛ فقط دسته‌بندی.
 * - `request`: خطای درخواست API یا خطای ساخته‌شده در کد فرانت. پیام خود API هوشتون اگر تمیز باشد
 *   (بدون نام ارائه‌دهنده و جزئیات فنی) همان‌طور نمایش داده می‌شود.
 */

export type HoshetonErrorKind = 'request' | 'generation';

export type HoshetonErrorCode =
    | 'generation_timeout'
    | 'content_rejected'
    | 'service_busy'
    | 'service_unavailable'
    | 'invalid_request'
    | 'media_unavailable'
    | 'file_too_large'
    | 'no_output'
    | 'insufficient_balance'
    | 'run_interrupted'
    | 'run_in_progress'
    | 'cancelled'
    | 'network'
    | 'session_expired'
    | 'access_denied'
    | 'not_found'
    | 'conflict'
    | 'server'
    | 'generation_failed'
    | 'unknown'
    /** «زاویه و نور»: عکس منبع پیوست/وصل نشده */
    | 'angle_image_required'
    /** «زاویه و نور» برای این مدل/الان در دسترس نیست */
    | 'angle_unavailable'
    /** «زاویه و نور»: نه زاویه عوض شده نه نور */
    | 'angle_no_change'
    /** پیام خود API/فرانت هوشتون که بدون تغییر نمایش داده می‌شود */
    | 'message';

export interface ResolvedHoshetonError {
    code: HoshetonErrorCode;
    /** فقط برای code === 'message' — متن تمیز خود هوشتون */
    text?: string;
    status?: number;
    retryable: boolean;
    /** اقدام پیشنهادی که UI می‌تواند دکمه‌اش را بگذارد */
    action?: 'wallet' | 'login';
    /** متن خام — هرگز رندر نشود؛ فقط برای console/پایش خطا */
    raw: string;
}

export interface ResolveOptions {
    kind?: HoshetonErrorKind;
}

const RETRYABLE = new Set<HoshetonErrorCode>([
    'generation_timeout',
    'service_busy',
    'service_unavailable',
    'no_output',
    'run_interrupted',
    'network',
    'server',
    'generation_failed',
    'unknown',
]);

/** کدهایی که پیام کاتالوگشان عمومی است؛ اگر صفحه پیام زمینه‌ای (fallback) بدهد، همان بهتر است */
export const GENERIC_ERROR_CODES = new Set<HoshetonErrorCode>(['unknown', 'server', 'invalid_request', 'generation_failed']);

/** نام ارائه‌دهنده‌ها/زیرساخت‌هایی که هرگز نباید به کاربر نشان داده شوند */
const PROVIDER_PATTERN = new RegExp(
    [
        'atlas\\s?cloud', '\\batlas\\b', '\\bfal(\\.ai|\\.run|\\.media)?\\b', 'open\\s?ai', 'anthropic', '\\bclaude\\b',
        '\\bgemini\\b', '\\bgoogle\\b', '\\bvertex\\b', 'deep\\s?seek', '\\bx\\.?ai\\b', '\\bgrok\\b', 'heygen',
        '\\bkling\\b', 'eleven\\s?labs', 'byte\\s?plus', 'byte\\s?dance', 'volc(engine|es)', '\\bark\\b',
        'replicate', 'runway', '\\bluma\\b', 'minimax', 'hailuo', 'open\\s?router', 'together\\.ai', '\\bgroq\\b',
        'mistral', 'stability', 'ideogram', 'recraft', '\\bsuno\\b', 'wavespeed', 'piapi', 'segmind', 'dashscope',
        'alibaba', 'tencent', '\\bprovider\\b', 'ارائه[‌\\s]?دهنده',
    ].join('|'),
    'i',
);

/** نشانه‌های متن فنی/خام که نباید به کاربر برسد */
const TECHNICAL_PATTERNS: RegExp[] = [
    /https?:\/\//i,
    /\bHTTP\s?\d{3}\b/i,
    /status code \d{3}/i,
    /\b(ECONN\w*|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE|ECANCELED|ERR_\w+)\b/,
    /socket hang up|network\s?error|failed to fetch|load failed|connection (lost|refused|reset|closed)|\boffline\b/i,
    /cannot read propert|is not a function|is not defined|unexpected token|\bundefined\b|\bnull\b|\bNaN\b/i,
    /\b(TypeError|ReferenceError|SyntaxError|RangeError|AxiosError|MongoServerError|CastError|ValidationError|HttpException)\b/,
    /\n\s+at\s/,
    /[{[]\s*"/,
    /internal server error|bad gateway|service unavailable|gateway time-?out/i,
    /\b(request|generation|upload|registration|prediction|polling|webhook)\s+(failed|error)\b/i,
    /\b(api[\s_-]?key|endpoint|payload|prediction|job\s?id|request\s?id|base64|mime)\b/i,
];

/** پیام‌های پیش‌فرض انگلیسی Nest/گاردها — بر اساس status ترجمه می‌شوند */
const FRAMEWORK_DEFAULT = /^(unauthorized|forbidden( resource)?|not found|bad request( exception)?|validation failed.*|too many requests|conflict|payload too large|request timeout|internal server error)\.?$/i;

/** کد API به شکل UPPER_SNAKE (مثل MEDIA_PROJECT_NOT_FOUND) */
const API_CODE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;

const KNOWN_CODES: Record<string, HoshetonErrorCode> = {
    STUDIO_CHAT_RUN_LOST: 'run_interrupted',
    STUDIO_CHAT_RUN_FAILED: 'generation_failed',
    MEDIA_RUN_IN_FLIGHT: 'run_in_progress',
    SEEDANCE_TASK_FAILED: 'generation_failed',
    MEDIA_WORKFLOW_INVALID: 'invalid_request',
    // همه‌ی مودهای مدل در پنل ادمین خاموش‌اند
    MEDIA_MODEL_MODE_UNAVAILABLE: 'service_unavailable',
    // «زاویه و نور» (چت و نود)
    ANGLE_STUDIO_IMAGE_REQUIRED: 'angle_image_required',
    ANGLE_STUDIO_MODEL_UNSUPPORTED: 'angle_unavailable',
    ANGLE_STUDIO_UNAVAILABLE: 'angle_unavailable',
    ANGLE_STUDIO_NOTHING_TO_CHANGE: 'angle_no_change',
    ANGLE_STUDIO_SHOT_FAILED: 'generation_failed',
};

function codeFromApiCode(code: string): HoshetonErrorCode | null {
    if (KNOWN_CODES[code]) return KNOWN_CODES[code];
    if (/NOT_FOUND$/.test(code)) return 'not_found';
    if (/FORBIDDEN|ACCESS_DENIED|NOT_ALLOWED|PERMISSION|NOT_MEMBER/.test(code)) return 'access_denied';
    if (/INSUFFICIENT|BALANCE|FUNDS/.test(code)) return 'insufficient_balance';
    if (/TIMEOUT/.test(code)) return 'generation_timeout';
    if (/RATE_LIMIT|TOO_MANY/.test(code)) return 'service_busy';
    if (/INVALID|REQUIRED|MISSING|UNSUPPORTED/.test(code)) return 'invalid_request';
    if (/IN_FLIGHT|IN_PROGRESS|ALREADY_RUNNING/.test(code)) return 'run_in_progress';
    return null;
}

/** دسته‌بندی متن آزاد — ترتیب مهم است (لغو و کیف پول قبل از الگوهای عمومی‌تر) */
function codeFromText(text: string): HoshetonErrorCode | null {
    if (!text) return null;
    // «stream has been aborted» / خطای poll وضعیت = سرویس وسط کار قطع کرد، نه لغو کاربر
    if (/stream (has been|was) aborted|status poll error/i.test(text)) return 'service_unavailable';
    if (/cancel+ed|aborted|rejected by developer|لغو شد/i.test(text)) return 'cancelled';
    // worker وسط کار از دست رفت (ری‌استارت/کرش) — نه خطای ورودی کاربر
    if (/stalled|run.?lost|worker (crash|died|restart)/i.test(text)) return 'run_interrupted';
    // کیف پول کاربر — پیام‌های billing هوشتون فارسی‌اند
    if (/(کیف[‌\s]?پول|موجودی).{0,40}(کافی نیست|ناکافی)|شارژ کیف[‌\s]?پول/.test(text)) return 'insufficient_balance';
    if (/content.?(policy|moderation|filter)|moderat|safety|\bnsfw\b|sensitive|inappropriate|prohibited|violat|flagged|blocked by|not allowed by/i.test(text)) {
        return 'content_rejected';
    }
    if (/time[ds]?\s?-?out|timed out|deadline exceeded|took too long/i.test(text)) return 'generation_timeout';
    if (/rate.?limit|too many requests|\b429\b|overload|capacity|\bbusy\b|try again later|temporarily unavailable|throttl|\b503\b/i.test(text)) {
        return 'service_busy';
    }
    // اعتبار حساب ما نزد ارائه‌دهنده (نه کیف پول کاربر) — برای کاربر «سرویس موقتاً در دسترس نیست»
    if (/insufficient|not enough (balance|credit|funds|quota)|quota|billing|credits?\b|payment required|\b402\b/i.test(text)) {
        return 'service_unavailable';
    }
    // فایل مرجع روی هیچ استوریجی نیست (worker قبل از ارسال به ارائه‌دهنده متوقفش می‌کند)
    if (/STUDIO_REFERENCE_FILE_MISSING|not found on any storage/i.test(text)) return 'media_unavailable';
    if (/(download|fetch|load|read|access|reach|upload|register)\w*.{0,40}(image|video|audio|file|media|url|asset)|(image|video|audio|file|media|asset).{0,40}(not found|unreachable|inaccessible|could not be|failed to)|asset (registration|preprocessing)/i.test(text)) {
        return 'media_unavailable';
    }
    if (/too large|file size|payload too large|\b413\b/i.test(text)) return 'file_too_large';
    if (/without .{0,20}output|no output|empty (result|response|output)|did not return/i.test(text)) return 'no_output';
    // صفحهٔ HTML دروازه یا خطای polling وضعیت = مشکل سمت سرویس، نه تنظیمات کاربر
    if (/<!doctype|<html|\bpoll(ing)?\b.{0,20}error|bad gateway|\b50[234]\b/i.test(text)) return 'service_unavailable';
    if (/network\s?error|failed to fetch|load failed|ECONN|ENOTFOUND|EAI_AGAIN|socket hang up|offline|connection (lost|refused|reset|closed)/i.test(text)) return 'network';
    if (/invalid|unsupported|not supported|must be|should be|required|out of range|exceeds|bad request|\b400\b|\b422\b|unprocessable|parameter|argument/i.test(text)) {
        return 'invalid_request';
    }
    return null;
}

function codeFromStatus(status?: number): HoshetonErrorCode | null {
    if (!status) return null;
    if (status === 400 || status === 422) return 'invalid_request';
    if (status === 401) return 'session_expired';
    if (status === 402) return 'insufficient_balance';
    if (status === 403) return 'access_denied';
    if (status === 404) return 'not_found';
    if (status === 408 || status === 504) return 'generation_timeout';
    if (status === 409) return 'conflict';
    if (status === 413) return 'file_too_large';
    if (status === 429) return 'service_busy';
    if (status === 503) return 'service_unavailable';
    if (status >= 500) return 'server';
    return null;
}

export function mentionsProvider(text: string): boolean {
    return PROVIDER_PATTERN.test(text);
}

/** متن تمیز هوشتون: بدون نام ارائه‌دهنده، بدون جزئیات فنی، کوتاه و انسانی */
export function isCleanHoshetonText(text: string): boolean {
    const value = text.trim();
    if (!value || value.length > 300) return false;
    if (API_CODE.test(value) || FRAMEWORK_DEFAULT.test(value)) return false;
    if (mentionsProvider(value)) return false;
    return !TECHNICAL_PATTERNS.some((pattern) => pattern.test(value));
}

interface ExtractedError {
    text: string;
    status?: number;
    /** درخواست HTTP بدون پاسخ (قطع شبکه / timeout کلاینت) */
    noResponse?: boolean;
    clientTimeout?: boolean;
    /** خطای زمان اجرا (TypeError و…) — نه پیام ساخته‌شده در کد */
    runtime?: boolean;
}

function textOf(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join('، ');
    return '';
}

export function isAxiosLike(error: unknown): error is {
    isAxiosError?: boolean;
    code?: string;
    message?: string;
    response?: { status?: number; data?: unknown };
} {
    return Boolean(error && typeof error === 'object' && ((error as { isAxiosError?: boolean }).isAxiosError || 'response' in error));
}

function extract(error: unknown): ExtractedError {
    if (error == null) return { text: '' };
    if (typeof error === 'string') return { text: error };
    if (isAxiosLike(error)) {
        const response = error.response;
        const data = (response?.data && typeof response.data === 'object' ? response.data : {}) as Record<string, unknown>;
        const apiText = textOf(data.message) || textOf(data.error) || (typeof response?.data === 'string' ? response.data : '');
        const clientTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
        return {
            text: apiText || (response ? '' : String(error.message || '')),
            status: response?.status,
            noResponse: !response,
            clientTimeout,
        };
    }
    if (error instanceof Error) {
        return { text: error.message, runtime: error.name !== 'Error' };
    }
    if (typeof error === 'object') {
        const record = error as Record<string, unknown>;
        const status = typeof record.statusCode === 'number' ? record.statusCode : typeof record.status === 'number' ? record.status : undefined;
        return { text: textOf(record.message) || textOf(record.errorMessage) || textOf(record.error), status };
    }
    return { text: String(error) };
}

/** هر ورودی خطا → کد هوشتون (+ متن تمیز اگر پیام خود هوشتون باشد). هرگز متن خام برنمی‌گرداند. */
export function resolveHoshetonError(error: unknown, options: ResolveOptions = {}): ResolvedHoshetonError {
    const kind = options.kind || 'request';
    const extracted = extract(error);
    const text = extracted.text.trim();
    const finish = (code: HoshetonErrorCode, cleanText?: string): ResolvedHoshetonError => ({
        code,
        ...(cleanText ? { text: cleanText } : {}),
        status: extracted.status,
        retryable: RETRYABLE.has(code),
        ...(code === 'insufficient_balance' ? { action: 'wallet' as const } : code === 'session_expired' ? { action: 'login' as const } : {}),
        raw: text,
    });

    if (extracted.runtime) return finish('unknown');
    if (extracted.noResponse && !extracted.status) {
        return finish(extracted.clientTimeout ? 'generation_timeout' : 'network');
    }
    if (API_CODE.test(text)) {
        return finish(codeFromApiCode(text) || codeFromStatus(extracted.status) || (kind === 'generation' ? 'generation_failed' : 'unknown'));
    }
    if (kind === 'generation') {
        return finish(codeFromText(text) || codeFromStatus(extracted.status) || 'generation_failed');
    }
    // request: پیام تمیز خود هوشتون عیناً؛ در غیر این صورت دسته‌بندی
    if (text && isCleanHoshetonText(text)) return finish('message', text);
    if (extracted.status === 401 || extracted.status === 403 || extracted.status === 404) {
        return finish(codeFromStatus(extracted.status)!);
    }
    return finish(codeFromText(text) || codeFromStatus(extracted.status) || 'unknown');
}
