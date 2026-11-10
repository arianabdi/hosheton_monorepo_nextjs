import { toFarsiNumber } from '@my-workspace/utils';
import type { BackupPurpose, BackupRow, JobPhase, RestoreMode } from './database-api';

export { relativeTime, fullDate, formatCount } from '../../../error-tracking/lib/format';

/** Owner-facing word for a MongoDB collection. */
export const COLLECTION_FA = 'مجموعه';

export function formatSize(bytes?: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${toFarsiNumber(bytes)} بایت`;
    if (bytes < 1024 * 1024) return `${toFarsiNumber(Math.round(bytes / 1024))} کیلوبایت`;
    if (bytes < 1024 ** 3) return `${toFarsiNumber(Number((bytes / 1024 / 1024).toFixed(1)))} مگابایت`;
    return `${toFarsiNumber(Number((bytes / 1024 ** 3).toFixed(2)))} گیگابایت`;
}

export function formatDuration(ms?: number): string {
    if (!ms && ms !== 0) return '—';
    if (ms < 1000) return 'کمتر از ۱ ثانیه';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${toFarsiNumber(s)} ثانیه`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${toFarsiNumber(m)} دقیقه${s % 60 ? ` و ${toFarsiNumber(s % 60)} ثانیه` : ''}`;
    return `${toFarsiNumber(Math.floor(m / 60))} ساعت و ${toFarsiNumber(m % 60)} دقیقه`;
}

const TZ = 'Asia/Tehran';

/** «۱۴ آبان ۱۴۰۵، ساعت ۳:۰۰» — Jalali, Tehran time (backups are thought of by date, not file name). */
export function formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const day = d.toLocaleDateString('fa-IR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('fa-IR', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
    return `${day}، ساعت ${time}`;
}

/** «۱۴۰۵/۰۸/۱۶ ۰۳:۰۰:۱۲» — fixed-width log timestamp (Jalali, Tehran, seconds). */
export function formatLogTime(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    // «۱۶ آبان ۱۴۰۵، ۲۳:۰۹:۳۹» — month name reads better in Persian text than 1405/08/16
    const day = d.toLocaleDateString('fa-IR', { timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('fa-IR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${day}، ${time}`;
}

/** «۱۴ آبان، ۳:۰۰» — short form for buttons and lines. */
export function formatDateShort(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const day = d.toLocaleDateString('fa-IR', { timeZone: TZ, day: 'numeric', month: 'long' });
    const time = d.toLocaleTimeString('fa-IR', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
    return `${day}، ${time}`;
}

/** «امشب ۳:۰۰» / «فردا ۳:۰۰» / «۱۷ آبان، ۳:۰۰» for an upcoming run. */
export function formatUpcoming(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const dayKey = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: TZ });
    const time = d.toLocaleTimeString('fa-IR', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const hour = Number(d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
    if (dayKey(d) === dayKey(today)) return `${hour >= 18 || hour < 5 ? 'امشب' : 'امروز'} ${time}`;
    if (dayKey(d) === dayKey(tomorrow)) return `${hour < 5 ? 'امشب (بامداد فردا)' : 'فردا'} ${time}`;
    return formatDateShort(iso);
}

export const PURPOSE_LABEL: Record<BackupPurpose, string> = {
    manual: 'دستی',
    cron: 'خودکار',
    'pre-restore': 'ایمنی قبل از بازگردانی',
    uploaded: 'آپلودی',
};

export const MODE_LABEL: Record<RestoreMode, string> = {
    replace: 'بازگردانی کامل',
    missing: 'فقط داده‌های پاک‌شده',
    test: 'امتحان در یک کپی جدا',
};

export const PHASE_LABEL: Record<JobPhase, string> = {
    dump: 'بک‌آپ‌گیری',
    safety: 'بک‌آپ ایمنی از وضعیت فعلی',
    download: 'آماده‌کردن فایل بک‌آپ',
    restore: 'برگرداندن داده‌ها',
    verify: 'بررسی اینکه چیزی جا نمانده باشد',
};

/** Title of a backup = its date (owners pick a restore point by date, not by file name). */
export function backupTitle(row: Pick<BackupRow, 'createdAt' | 'takenAt'>): string {
    return formatDate(backupAt(row));
}

/** the moment a backup holds — for an uploaded file the original backup time, not the upload time */
export function backupAt(row: Pick<BackupRow, 'createdAt' | 'takenAt'>): string | undefined {
    return row.takenAt || row.createdAt;
}

/**
 * A failure reason the owner can act on; the raw text stays in `title` / «جزئیات».
 * Server messages that are already Persian pass through.
 */
export function explainFailure(raw?: string | null): string {
    const r = String(raw || '');
    if (!r) return 'خطای غیرمنتظره';
    if (/پیدا نشد — MongoDB Database Tools|ENOENT.*mongo(dump|restore)/i.test(r)) return 'ابزار بک‌آپ روی سرور نصب نیست؛ به برنامه‌نویس خبر دهید.';
    if (/not authorized|unauthorized|authentication failed|requires authentication/i.test(r)) return 'دیتابیس اجازهٔ این کار را نداد (دسترسی کاربر دیتابیس).';
    if (/ENOSPC|no space left/i.test(r)) return 'فضای دیسک سرور پر است.';
    if (/timed? ?out|ETIMEDOUT|server selection|connection (reset|refused)|ECONNREFUSED/i.test(r)) return 'اتصال به دیتابیس قطع شد؛ دوباره امتحان کنید.';
    if (/S3|storage|upload|PutObject|NoSuchKey|استوریج/i.test(r) && !/[؀-ۿ]{3}/.test(r.slice(0, 20))) return 'ذخیره یا خواندن فایل روی استوریج ناموفق بود.';
    if (/stalled|نیمه‌کاره/i.test(r)) return 'کار وسط راه متوقف شد (سرور ری‌استارت شد)؛ دوباره اجرا کنید.';
    if (/[؀-ۿ]/.test(r)) return r.replace(/:\s*[A-Za-z][\s\S]*$/, '').trim() || r;
    return 'خطای غیرمنتظره؛ متن کامل در جزئیات است.';
}
