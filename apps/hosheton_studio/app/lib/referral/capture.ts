/**
 * نگهداری کد دعوت captured از URL (?ref=CODE یا ?referral=CODE).
 *
 * کد در سه لایه ذخیره می‌شود تا با جابه‌جایی بین همه صفحه‌ها، رفرش، تب جدید و
 * بستن/بازکردن مرورگر از دست نرود و تا لحظه لاگین/ثبت‌نام موفق باقی بماند:
 *   ۱) localStorage  — ۳۰ روز
 *   ۲) sessionStorage — پشتیبان
 *   ۳) کوکی ref_code — توسط proxy.ts (سرور) و همین ماژول (کلاینت)
 *
 * URL پاک نمی‌شود؛ ?ref= در نوار آدرس می‌ماند تا هر رفرش/اشتراک‌گذاری لینک،
 * کد را دوباره ثبت کند.
 */

const STORAGE_KEY = 'referral_code';
const ATTRIBUTED_KEY = 'referral_code_attributed';
const REFERRAL_COOKIE = 'ref_code';
const EXPIRY_DAYS = 30;

function expiryDate(): string {
    return new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toISOString();
}

function readReferralCookie(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REFERRAL_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1]).trim().toUpperCase() : '';
}

function writeReferralCookie(code: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code)}; max-age=${EXPIRY_DAYS * 86_400}; path=/; samesite=lax`;
}

function clearReferralCookie(): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${REFERRAL_COOKIE}=; max-age=0; path=/; samesite=lax`;
}

/** کد معتبر لایه localStorage (منقضی/خراب پاک می‌شود) */
function readLocalCode(): string {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return '';
        const parsed = JSON.parse(raw) as { code?: string; expiresAt?: string };
        if (parsed.code && (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() > Date.now())) {
            return parsed.code;
        }
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // مقدار خراب یا storage در دسترس نیست
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // storage در دسترس نیست
        }
    }
    return '';
}

/** خواندن کد ذخیره‌شده — به ترتیب localStorage ← sessionStorage ← کوکی */
export function getStoredReferralCode(): string {
    if (typeof window === 'undefined') return '';
    const local = readLocalCode();
    if (local) return local;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as { code?: string };
            if (parsed.code) return parsed.code;
        }
    } catch {
        // sessionStorage در دسترس نیست
    }
    return readReferralCookie();
}

/** ذخیره صریح کد — هر سه لایه */
export function saveReferralCode(code: string): void {
    if (typeof window === 'undefined') return;
    const clean = String(code || '').trim().toUpperCase();
    if (!clean) return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: clean, expiresAt: expiryDate() }));
    } catch {
        // storage در دسترس نیست
    }
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: clean }));
    } catch {
        // sessionStorage در دسترس نیست
    }
    writeReferralCookie(clean);
}

/**
 * ساخت لینک دعوت روی همین environment — در development روی localhost و در
 * production روی دامنه اصلی؛ لینک همیشه به همان محیطی اشاره می‌کند که کاربر در آن است.
 * خارج از مرورگر رشته خالی برمی‌گرداند (caller به لینک API fallback می‌کند).
 */
export function buildReferralLink(code: string): string {
    if (typeof window === 'undefined') return '';
    try {
        const clean = String(code || '').trim().toUpperCase();
        if (!clean) return '';
        return `${window.location.origin}/?ref=${encodeURIComponent(clean)}`;
    } catch {
        return '';
    }
}

/**
 * کپچر کد از پارامترهای URL فعلی — فقط وقتی «کد جدیدی» ذخیره شود مقدار برمی‌گرداند
 * (برای جلوگیری از toast/action تکراری روی همان کد قبلی).
 */
export function captureReferralCode(): string | null {
    if (typeof window === 'undefined') return null;
    let param = '';
    try {
        const url = new URL(window.location.href);
        param = (url.searchParams.get('ref') || url.searchParams.get('referral') || '').trim().toUpperCase();
    } catch {
        return null;
    }
    if (!param || !/^[A-Z0-9_-]{3,32}$/.test(param)) return null;
    // این کد قبلاً روی این مرورگر قطعی شده (اعمال/رد قطعی) — دیگر کپچر نشود
    if (wasAttributionAttempted(param)) return null;
    // فقط لایه localStorage مبناست: کوکی را proxy.ts قبل از رسیدن به کلاینت ست کرده و نباید
    // مانع ذخیره در بقیه لایه‌ها و toast «کد ذخیره شد» شود
    if (readLocalCode() === param) return null;
    saveReferralCode(param);
    return param;
}

/** پاکسازی کامل (localStorage + sessionStorage + کوکی) — بعد از attribution قطعی */
export function clearStoredReferralCode(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // sessionStorage در دسترس نیست
    }
    clearReferralCookie();
}

/**
 * علامت‌گذاری «تسویه‌شده» — فقط برای نتیجه قطعی (موفق، کد نامعتبر، قبلاً attributed).
 * خطاهای موقت (شبکه/۵xx) علامت نمی‌خورند تا دوباره تلاش شود.
 */
export function markAttributionAttempted(code: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(ATTRIBUTED_KEY, JSON.stringify({ code, expiresAt: expiryDate() }));
    } catch {
        // storage در دسترس نیست
    }
}

export function wasAttributionAttempted(code: string): boolean {
    if (typeof window === 'undefined') return true;
    try {
        const raw = window.localStorage.getItem(ATTRIBUTED_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { code?: string; expiresAt?: string };
        if (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() < Date.now()) {
            window.localStorage.removeItem(ATTRIBUTED_KEY);
            return false;
        }
        return parsed.code === code;
    } catch {
        return false;
    }
}
