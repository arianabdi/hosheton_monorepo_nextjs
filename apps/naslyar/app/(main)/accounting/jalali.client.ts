/**
 * تبدیل تاریخ شمسی ↔ میلادی در سمت کلاینت — بدون وابستگی خارجی
 * (همان الگوریتم استاندارد jalaali که در بک‌اند libs/core/src/accounting/jalali.util.ts استفاده شده)
 */

const BREAKS = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
];

const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000; // UTC+3:30

function div(a: number, b: number): number {
    return ~~(a / b);
}

function mod(a: number, b: number): number {
    return a - ~~(a / b) * b;
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
    const bl = BREAKS.length;
    const gy = jy + 621;
    let leapJ = -14;
    let jp = BREAKS[0];
    if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error(`سال شمسی نامعتبر است: ${jy}`);
    let jump = 0;
    for (let i = 1; i < bl; i += 1) {
        const jm = BREAKS[i];
        jump = jm - jp;
        if (jy < jm) break;
        leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
        jp = jm;
    }
    let n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    let leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
    let d =
        div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
        div(153 * mod(gm + 9, 12) + 2, 5) +
        gd -
        34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1;
    const gm = mod(div(i, 153), 12) + 1;
    const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
    const r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): { jy: number; jm: number; jd: number } {
    const gy = d2g(jdn).gy;
    let jy = gy - 621;
    const r = jalCal(jy);
    const jdn1f = g2d(gy, 3, r.march);
    let jd: number;
    let jm: number;
    let k = jdn - jdn1f;
    if (k >= 0) {
        if (k <= 185) {
            jm = 1 + div(k, 31);
            jd = mod(k, 31) + 1;
            return { jy, jm, jd };
        }
        k -= 186;
    } else {
        jy -= 1;
        k += 179;
        if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy, jm, jd };
}

export interface JalaliParts {
    jy: number;
    jm: number;
    jd: number;
}

/** رشته ISO/Date → اجزای شمسی به وقت تهران */
export function isoToJalaliParts(date: Date | string): JalaliParts {
    const d = typeof date === 'string' ? new Date(date) : date;
    const tehran = new Date(d.getTime() + TEHRAN_OFFSET_MS);
    return d2j(g2d(tehran.getUTCFullYear(), tehran.getUTCMonth() + 1, tehran.getUTCDate()));
}

/** رشته ISO → نمایش شمسی «1405/04/12» */
export function isoToJalaliString(date: Date | string | null | undefined): string {
    if (!date) return '';
    const { jy, jm, jd } = isoToJalaliParts(date);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/** اجزای شمسی → رشته ISO (نیمه‌شب تهران) */
export function jalaliPartsToIso(jy: number, jm: number, jd: number): string {
    const g = d2g(j2d(jy, jm, jd));
    return new Date(Date.UTC(g.gy, g.gm - 1, g.gd, 0, 0, 0) - TEHRAN_OFFSET_MS).toISOString();
}

/** ورودی کاربر «1405/04/12» یا «1405-4-12» → ISO؛ ورودی نامعتبر null */
export function jalaliStringToIso(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(String(value).trim());
    if (!match) return null;
    const jy = Number(match[1]);
    const jm = Number(match[2]);
    const jd = Number(match[3]);
    if (jy < 1200 || jy > 1600) return null;
    if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
    // کنترل روزهای ماه (ماه ۷ تا ۱۲ سی روزه، اسفند کبیسه ۳۰ روزه)
    const monthLength = jm <= 6 ? 31 : jm <= 11 ? 30 : jalaliYearLength(jy) - 336;
    if (jd > monthLength) return null;
    return jalaliPartsToIso(jy, jm, jd);
}

/** امروز به وقت تهران به شکل ISO */
export function todayTehranIso(): string {
    return new Date(Date.now() + TEHRAN_OFFSET_MS).toISOString().slice(0, 10) + 'T00:00:00.000Z';
}

/** تعداد روزهای سال شمسی (کبیسه: ۳۶۶) */
export function jalaliYearLength(jy: number): number {
    return j2d(jy + 1, 1, 1) - j2d(jy, 1, 1);
}

/** سال شمسی جاری */
export function currentJalaliYear(): number {
    return isoToJalaliParts(new Date()).jy;
}
