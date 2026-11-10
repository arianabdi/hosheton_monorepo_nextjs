/**
 * کاتالوگ «مشکل‌های سراسری» استودیو — خطاهایی که مال یک درخواست نیستند و کل اپ را درگیر می‌کنند
 * (اینترنت قطع، سرور در دسترس نیست، سرویس موقتاً از کار افتاده).
 *
 * این خطاها toast نمی‌شوند؛ یک بنر بالای صفحه نشانشان می‌دهد و با برطرف‌شدن، خودش می‌رود.
 *
 * افزودن مشکل جدید:
 * 1. یک ورودی به STATUS_ISSUES اضافه کن (اولویت، رنگ، راه بازیابی).
 * 2. متن‌ها: `errors.status_banner.<id>.title` و `.message` در هر ۱۰ زبان (`app/lib/i18n/locales/*.json`).
 * 3. تشخیصش را در `detect.ts` بنویس (یا از هر جای کد `reportStatusIssue('<id>')` صدا بزن).
 */

export type StatusIssueTone = 'danger' | 'warning';

/**
 * راه فهمیدن اینکه مشکل برطرف شد:
 * - `browser`: رویداد online مرورگر (و بعد چک سرور)
 * - `server`: چک دوره‌ای `/api/health` با فاصلهٔ افزایشی + هر پاسخ موفق API
 */
export type StatusRecovery = 'browser' | 'server';

export interface StatusIssueDefinition {
    /** عدد بیشتر = مهم‌تر؛ وقتی چند مشکل هم‌زمان است، مهم‌ترین نمایش داده می‌شود */
    priority: number;
    tone: StatusIssueTone;
    recovery: StatusRecovery;
    /** قبل از نمایش، با یک چک سرور تأیید شود؟ (خطای تکی شبکه بنر بی‌مورد نسازد) */
    confirmWithProbe: boolean;
}

export const STATUS_ISSUES = {
    /** مرورگر می‌گوید آفلاین است */
    offline: { priority: 30, tone: 'danger', recovery: 'browser', confirmWithProbe: false },
    /** اینترنت هست ولی پاسخی از سرور هوشتون نمی‌آید */
    network: { priority: 20, tone: 'danger', recovery: 'server', confirmWithProbe: true },
    /** سرور پاسخ می‌دهد ولی دروازه خطای 502/503/504 می‌دهد (به‌روزرسانی، شلوغی) */
    service: { priority: 10, tone: 'warning', recovery: 'server', confirmWithProbe: true },
} as const satisfies Record<string, StatusIssueDefinition>;

export type StatusIssueId = keyof typeof STATUS_ISSUES;

/** فاصلهٔ چک‌های بازیابی (ثانیه) — آخرین عدد تکرار می‌شود */
export const RECOVERY_BACKOFF_SECONDS = [3, 5, 10, 20, 30] as const;

/** مدت نمایش پیام «اتصال برقرار شد» قبل از بسته‌شدن بنر (میلی‌ثانیه) */
export const RECOVERED_VISIBLE_MS = 2600;

/** حداکثر انتظار برای پاسخ چک سرور (میلی‌ثانیه) */
export const PROBE_TIMEOUT_MS = 8000;

export function higherPriority(a: StatusIssueId | null, b: StatusIssueId): StatusIssueId {
    if (!a) return b;
    return STATUS_ISSUES[b].priority > STATUS_ISSUES[a].priority ? b : a;
}
