// ────────────────────────────── Types ──────────────────────────────

/** یک نمونه‌ی وضعیت المان در لحظه‌ی t — مبنای توصیف موشن برای AI */
export interface AdsCutMotionSample {
    /** ثانیه‌ی تایم‌لاین که نمونه در آن گرفته شده */
    t: number;
    /** موقعیت/اندازه نسبت به گوشه‌ی بالا-چپ استیج (پیکسل طراحی) */
    x: number;
    y: number;
    w: number;
    h: number;
    /** opacity محاسبه‌شده در همان لحظه */
    o: number;
}

/**
 * وضعیت زنده‌ی یک المان قابل‌ویرایش — علاوه بر مقدار، هندسه‌ی واقعی روی استیج،
 * متن نمایش‌داده‌شده و نمونه‌های حرکت در طول تایم‌لاین هم جمع می‌شود تا مدل
 * قبل از ویرایش بداند کاربر دقیقاً به کدام المان اشاره می‌کند و چه حرکتی دارد.
 */
export interface AdsCutElementState {
    id: string;
    label?: string;
    type?: string;
    value?: unknown;
    /** هندسه در شروع تایم‌لاین (t=0) */
    box?: { x: number; y: number; width: number; height: number };
    /** متن نمایشی کوتاه — برای تطبیق با حرف کاربر */
    text?: string;
    /** شناسه‌ی CSS کوتاه مثل h1.hero-title */
    css?: string;
    /** نمونه‌های وضعیت در ۵ نقطه‌ی تایم‌لاین (۰/۲۵/۵۰/۷۵/۱۰۰٪) */
    samples?: AdsCutMotionSample[];
    /** خلاصه‌ی کی‌فریم‌های CSS/Web Animations مثل «opacity 0→1 @1.2s ease-out» */
    keyframes?: string;
}

/** نقطه‌های نمونه‌گیری از تایم‌لاین — درصد طول کات */
const SAMPLE_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

interface AdsInspectWindow extends Window {
    __adsElements?: unknown;
    __adsSeek?: (t: number) => void;
    __adsPause?: () => void;
    __adsResume?: () => void;
    __adsDuration?: number;
}

interface RegisteredElement {
    id?: unknown;
    label?: unknown;
    type?: unknown;
    value?: unknown;
    el?: unknown;
}

/** خلاصه‌ی متن نمایشی یک نود — حداکثر ۸۰ نویسه، بدون فاصله‌های تکراری */
function displayText(node: Element): string {
    return (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/** شناسه‌ی CSS کوتاه: tag + حداکثر دو کلاس معنادار */
function cssHint(node: Element): string {
    const classes = String(node.className && typeof node.className === 'string' ? node.className : '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join('.');
    return classes ? `${node.tagName.toLowerCase()}.${classes}` : node.tagName.toLowerCase();
}

/** هندسه‌ی یک المان نسبت به viewport خود iframe — همان مختصات طراحی استیج */
function sampleElement(node: HTMLElement, win: Window, t: number): AdsCutMotionSample {
    const rect = node.getBoundingClientRect();
    let opacity = 1;
    try {
        opacity = Number(win.getComputedStyle(node).opacity);
        if (!Number.isFinite(opacity)) opacity = 1;
    } catch { /* سند آماده نیست */ }
    return {
        t: Math.round(t * 10) / 10,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        o: Math.round(opacity * 100) / 100,
    };
}

/** کی‌فریم‌های Web Animations متصل به یک نود — خلاصه‌ی property/duration/easing */
function keyframeHint(node: Element): string {
    try {
        const holder = node as Element & { getAnimations?: () => Animation[] };
        const anims = holder.getAnimations?.() || [];
        const parts: string[] = [];
        for (const anim of anims.slice(0, 4)) {
            const effect = anim.effect as KeyframeEffect | null;
            if (!effect || typeof effect.getKeyframes !== 'function') continue;
            const timing = effect.getComputedTiming();
            const durationMs = Number(timing.duration) || 0;
            const delayMs = Number(timing.delay) || 0;
            const easing = String(effect.getTiming().easing || 'linear').split('(')[0];
            const frames = effect.getKeyframes() as Array<Record<string, unknown>>;
            const first = frames[0] || {};
            const last = frames[frames.length - 1] || {};
            const props = new Set<string>();
            for (const key of [...Object.keys(first), ...Object.keys(last)]) {
                if (key === 'offset' || key === 'easing' || key === 'composite') continue;
                props.add(key);
            }
            const fromTo = [...props].slice(0, 3).map((prop) => {
                const from = first[prop];
                const to = last[prop];
                if (from === undefined && to === undefined) return '';
                return `${prop} ${String(from ?? '—')}→${String(to ?? '—')}`;
            }).filter(Boolean).join(', ');
            if (!fromTo && !durationMs) continue;
            parts.push(
                `${fromTo || 'transform/opacity'} @${Math.round(durationMs / 100) / 10}s${delayMs ? ` delay ${Math.round(delayMs / 100) / 10}s` : ''} ${easing}`,
            );
        }
        return parts.slice(0, 3).join(' | ');
    } catch {
        return '';
    }
}

/**
 * اسنپ‌شات وضعیت زنده‌ی یک کات از روی iframe پیش‌نمایش:
 * برای هر المانِ window.__adsElements مقدار فعلی + هندسه + نمونه‌های حرکت
 * در طول تایم‌لاین جمع می‌شود. تایم‌لاینِ داخلی سند موقتاً pause و در پایان
 * به restoreTime برمی‌گردد تا کاربر تغییر لحظه‌ای حس نکند.
 */
export function inspectCutState(
    frame: HTMLIFrameElement | null | undefined,
    restoreTime = 0,
): AdsCutElementState[] {
    try {
        const doc = frame?.contentDocument;
        const win = frame?.contentWindow as AdsInspectWindow | null;
        if (!doc || !win || !Array.isArray(win.__adsElements)) return [];

        const registered = (win.__adsElements as RegisteredElement[])
            .filter((item): item is RegisteredElement & { id: string; el: HTMLElement } => (
                Boolean(item)
                && typeof item.id === 'string'
                && Boolean(item.el)
                && (item.el as HTMLElement).nodeType === 1
            ))
            .slice(0, 12);

        if (!registered.length) return [];

        const seek = typeof win.__adsSeek === 'function' ? win.__adsSeek : null;
        const duration = Number(win.__adsDuration) || 0;
        const canSample = Boolean(seek) && duration > 0;

        // تایم‌لاین داخلی سند موقتاً فریز می‌شود تا نمونه‌ها deterministic باشند
        if (canSample) {
            try { win.__adsPause?.(); } catch { /* ignore */ }
        }
        const sampleTimes = canSample
            ? SAMPLE_FRACTIONS.map((f) => Math.round(f * duration * 10) / 10)
            : [];

        let states: AdsCutElementState[] = [];
        try {
            states = registered.map((item) => {
                const node = item.el as HTMLElement;
                const state: AdsCutElementState = {
                    id: String(item.id),
                    label: item.label != null ? String(item.label) : undefined,
                    type: item.type != null ? String(item.type) : undefined,
                    value: item.value,
                    css: cssHint(node),
                    text: displayText(node) || undefined,
                };
                if (canSample) {
                    const samples: AdsCutMotionSample[] = [];
                    for (const time of sampleTimes) {
                        try {
                            seek!(time);
                            samples.push(sampleElement(node, win, time));
                        } catch {
                            break;
                        }
                    }
                    if (samples.length > 1) {
                        state.samples = samples;
                        const first = samples[0];
                        state.box = { x: first.x, y: first.y, width: first.w, height: first.h };
                    }
                    const frames = keyframeHint(node);
                    if (frames) state.keyframes = frames;
                } else {
                    const rect = node.getBoundingClientRect();
                    state.box = {
                        x: Math.round(rect.left),
                        y: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    };
                }
                return state;
            });
        } finally {
            // بازگشت به لحظه‌ی قبل از نمونه‌گیری — پلیرِ بیرونی در فریم بعدی خودش ادامه می‌دهد
            if (canSample) {
                try {
                    seek!(Math.min(Math.max(0, restoreTime), duration));
                    win.__adsResume?.();
                } catch { /* ignore */ }
            }
        }
        return states.filter((state) => state.id);
    } catch {
        return [];
    }
}

/** رندر متنی فشرده‌ی یک state — برای ارسال مستقیم در پرامپت */
export function describeElementState(state: AdsCutElementState): string {
    const parts: string[] = [`id="${state.id}"`];
    if (state.label) parts.push(`label="${state.label}"`);
    parts.push(`type=${state.type || 'text'}`);
    parts.push(`value=${JSON.stringify(state.value ?? '')}`);
    if (state.text) parts.push(`text="${state.text}"`);
    if (state.css) parts.push(`css=${state.css}`);
    if (state.box) parts.push(`box=(x:${state.box.x},y:${state.box.y},w:${state.box.width},h:${state.box.height})`);
    if (state.keyframes) parts.push(`cssAnim=${state.keyframes}`);
    if (state.samples?.length) {
        const trail = state.samples
            .map((sample) => `${sample.t}s:(x${sample.x},y${sample.y},${sample.w}x${sample.h},α${sample.o})`)
            .join(' → ');
        parts.push(`motion=[${trail}]`);
    }
    return parts.join(' | ');
}
