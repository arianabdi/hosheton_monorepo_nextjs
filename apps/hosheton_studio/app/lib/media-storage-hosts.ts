/**
 * میزبان‌های فضای ذخیره‌سازی رسانه — همان فهرست images.remotePatterns در next.config.ts
 * (میزبان تازه را هر دو جا اضافه کن). route دانلود (/api/media-download) فقط از این‌ها
 * فایل می‌کشد تا به پروکسی آزاد برای هر آدرسی (SSRF) تبدیل نشود.
 */
const STORAGE_HOST_PATTERNS = [
    'eu2.contabostorage.com',
    '**.parspack.net',
    'mashinbazaar.storage.iran.liara.space',
    '**.byteplusapi.com',
    '**.byteintl.net',
    '**.bytedance.net',
    '**.volces.com',
];

/** استوریج‌های تنظیم‌شده در env (Contabo / RGW داخل ایران) */
function envStorageHosts(): string[] {
    return [
        process.env.NEXT_PUBLIC_S3_PUBLIC_BASE,
        process.env.NEXT_PUBLIC_S3_COMPATIBLE_STORAGE_ENDPOINT_PUBLIC_URL,
        process.env.NEXT_PUBLIC_RGW_STORAGE,
    ].flatMap((value) => {
        if (!value) return [];
        try {
            return [new URL(value).hostname.toLowerCase()];
        } catch {
            return [];
        }
    });
}

/** آدرس https روی یکی از استوریج‌های رسانه است یا نه */
export function isStorageMediaUrl(value: string): boolean {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return [...STORAGE_HOST_PATTERNS, ...envStorageHosts()].some((pattern) => (
        pattern.startsWith('**.') ? host.endsWith(pattern.slice(2)) : host === pattern
    ));
}
