/* ابزارهای هندسی ریگ گربه — همه در مختصات صفحهٔ SVG (y رو به پایین) مگر خلافش گفته شود */

export const DEG = Math.PI / 180;
export const TAU = Math.PI * 2;

export function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/** هموار بین دو لبه؛ لبه‌ها می‌توانند برعکس هم باشند (e0 > e1) */
export function smoothstep(e0: number, e1: number, x: number): number {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
}

/** زاویه (درجه) در بازهٔ [-180, 180) */
export function wrap180(deg: number): number {
    return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** عدد کوتاه برای رشته‌های path/transform */
export function n2(v: number): number {
    return Math.round(v * 100) / 100;
}

export function n3(v: number): number {
    return Math.round(v * 1000) / 1000;
}

/** دایره به‌صورت path با جهت پادساعت‌گرد (هم‌جهت با hullPath تا اجتماع با nonzero درست پر شود) */
export function circlePath(x: number, y: number, r: number): string {
    const rr = n2(r);
    return `M${n2(x + r)} ${n2(y)}A${rr} ${rr} 0 1 0 ${n2(x - r)} ${n2(y)}A${rr} ${rr} 0 1 0 ${n2(x + r)} ${n2(y)}Z`;
}

/**
 * پوستهٔ محدب دو دایره (کپسول مخروطی) — بدن، ران و … از همین ساخته می‌شوند.
 * اگر یکی دیگری را بپوشاند، فقط دایرهٔ بزرگ‌تر برمی‌گردد.
 */
export function hullPath(ax: number, ay: number, ar: number, bx: number, by: number, br: number): string {
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.hypot(dx, dy);
    if (d <= Math.abs(ar - br) + 1e-3) {
        return ar >= br ? circlePath(ax, ay, ar) : circlePath(bx, by, br);
    }
    const ux = dx / d;
    const uy = dy / d;
    const phi = Math.acos(clamp((ar - br) / d, -1, 1));
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const n1x = ux * c - uy * s;
    const n1y = ux * s + uy * c;
    const n2x = ux * c + uy * s;
    const n2y = -ux * s + uy * c;
    const largeB = 2 * phi > Math.PI ? 1 : 0;
    const largeA = largeB ? 0 : 1;
    const a1x = n2(ax + ar * n1x);
    const a1y = n2(ay + ar * n1y);
    return (
        `M${a1x} ${a1y}`
        + `L${n2(bx + br * n1x)} ${n2(by + br * n1y)}`
        + `A${n2(br)} ${n2(br)} 0 ${largeB} 0 ${n2(bx + br * n2x)} ${n2(by + br * n2y)}`
        + `L${n2(ax + ar * n2x)} ${n2(ay + ar * n2y)}`
        + `A${n2(ar)} ${n2(ar)} 0 ${largeA} 0 ${a1x} ${a1y}Z`
    );
}

/** منحنی نرم Catmull-Rom از نقاط تخت [x0, y0, x1, y1, …] */
export function smoothPath(pts: ArrayLike<number>, count = pts.length / 2): string {
    if (count < 2) return '';
    let d = `M${n2(pts[0])} ${n2(pts[1])}`;
    for (let i = 0; i < count - 1; i++) {
        const i0 = Math.max(0, i - 1) * 2;
        const i1 = i * 2;
        const i2 = (i + 1) * 2;
        const i3 = Math.min(count - 1, i + 2) * 2;
        const c1x = pts[i1] + (pts[i2] - pts[i0]) / 6;
        const c1y = pts[i1 + 1] + (pts[i2 + 1] - pts[i0 + 1]) / 6;
        const c2x = pts[i2] - (pts[i3] - pts[i1]) / 6;
        const c2y = pts[i2 + 1] - (pts[i3 + 1] - pts[i1 + 1]) / 6;
        d += `C${n2(c1x)} ${n2(c1y)} ${n2(c2x)} ${n2(c2y)} ${n2(pts[i2])} ${n2(pts[i2 + 1])}`;
    }
    return d;
}

/** چندضلعی بسته از نقاط تخت */
export function polygonPath(pts: ArrayLike<number>, count = pts.length / 2): string {
    if (count < 3) return '';
    let d = `M${n2(pts[0])} ${n2(pts[1])}`;
    for (let i = 1; i < count; i++) d += `L${n2(pts[i * 2])} ${n2(pts[i * 2 + 1])}`;
    return `${d}Z`;
}

/**
 * IK دو استخوانی در صفحهٔ جلو/بالا (b رو به بالا).
 * bend = -1 مفصل را به عقب می‌برد (آرنج/مچ پای گربه).
 * خروجی: [مفصل میانی a, b, سرِ قابل دسترس a, b]
 */
export function ik2(
    ja: number, jb: number, ta: number, tb: number,
    l1: number, l2: number, bend: number,
): [number, number, number, number] {
    let da = ta - ja;
    let db = tb - jb;
    let d = Math.hypot(da, db);
    if (d < 1e-6) {
        da = 0;
        db = -1;
        d = 1;
    }
    const reach = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    const ua = da / d;
    const ub = db / d;
    const ea = ja + ua * reach;
    const eb = jb + ub * reach;
    const inner = Math.acos(clamp((l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach), -1, 1));
    const ang = Math.atan2(ub, ua) + bend * inner;
    return [ja + Math.cos(ang) * l1, jb + Math.sin(ang) * l1, ea, eb];
}

const rgbCache = new Map<string, [number, number, number]>();

function rgb(hex: string): [number, number, number] {
    let v = rgbCache.get(hex);
    if (!v) {
        const h = hex.replace('#', '');
        v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        rgbCache.set(hex, v);
    }
    return v;
}

/** ترکیب دو رنگ hex */
export function mixColor(a: string, b: string, t: number): string {
    const k = clamp(t, 0, 1);
    if (k <= 0.001) return a;
    if (k >= 0.999) return b;
    const A = rgb(a);
    const B = rgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
}
