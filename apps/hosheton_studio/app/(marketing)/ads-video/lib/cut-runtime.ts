// ────────────────────────────── Types ──────────────────────────────

/** سایز استیج تولیدی هر نسبت تصویر — باید با ASPECT_STAGE_SIZES سمت API یکی باشد */
export const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
};

export const ASPECT_CSS_RATIO: Record<string, string> = {
    '16:9': '16 / 9',
    '9:16': '9 / 16',
    '1:1': '1 / 1',
};

/** یکی از المان‌های قابل‌ویرایش که کات از طریق window.__adsElements معرفی می‌کند */
export interface AdsElementHandle {
    id: string;
    label: string;
    type: 'text' | 'color' | 'number' | 'image';
    value: unknown;
    /** نود DOM داخل iframe — برای هایلایت، انتخاب با کلیک و جابه‌جایی (کات‌های جدیدتر) */
    el?: HTMLElement;
    apply(value: unknown): void;
}

/** شکل ذخیره‌ی سفارشی المان: مقدار ساده یا مقدار + جابه‌جایی */
export type ElementOverrideValue = string | number | { value?: string | number; x?: number; y?: number };

interface AdsElementWindow {
    __adsElements?: unknown;
    __adsInteractive?: boolean;
    __adsSeek?: (t: number) => void;
    __adsPause?: () => void;
    __adsResume?: () => void;
    __adsDuration?: number;
}

// ────────────────────────────── Helpers ──────────────────────────────

export function aspectCss(ratio?: string): string {
    return ASPECT_CSS_RATIO[ratio || ''] || '16 / 9';
}

export function stageSize(ratio?: string): { width: number; height: number } {
    return ASPECT_DIMENSIONS[ratio || ''] || ASPECT_DIMENSIONS['16:9'];
}

/** برچسب سایز بالای قاب پخش — مثل «1920×1080» */
export function stageSizeLabel(ratio?: string): string {
    const { width, height } = stageSize(ratio);
    return `${width}×${height}`;
}

export function formatClock(seconds: number): string {
    const safe = Math.max(0, seconds);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    const d = Math.floor((safe - Math.floor(safe)) * 10);
    return `${m}:${String(s).padStart(2, '0')}.${d}`;
}

/** استایل هایلایت المان انتخاب‌شده — در سند تزریق می‌شود */
const HIGHLIGHT_STYLE = `
  [data-ads-highlight="1"] {
    outline: 3px solid #ff6a3d !important;
    outline-offset: 2px;
    box-shadow: 0 0 0 6px rgba(255, 106, 61, 0.25) !important;
  }
  [data-ads-element-id] { cursor: grab; }
  [data-ads-element-id]:hover { outline: 2px dashed rgba(255, 106, 61, 0.65); outline-offset: 2px; }
  [data-ads-inline-edit="1"] { cursor: text !important; outline: 2px solid #ff6a3d !important; }
`;

/**
 * پایدارساز پیش‌نمایش — اسکرول‌بار لحظه‌ای (که با سرریز خروجی انیمیشن‌ها ظاهر/
 * غیب می‌شود) قاب را نمی‌لرزاند؛ جریان چیدمان هم روی html قفل می‌شود.
 */
const STAGE_STABILIZER_STYLE = [
    '<style>',
    'html, body { overflow: hidden !important; margin: 0 !important; }',
    'html { scrollbar-width: none; }',
    '::-webkit-scrollbar { width: 0; height: 0; display: none; }',
    '</style>',
].join('');

/**
 * ران‌تایم پشتیبان برای کات‌هایی که قرارداد __adsPause/__adsResume/__adsSeek را
 * پیاده نکرده‌اند (مثلاً انیمیشن CSS با تکرار infinite): با Web Animations API
 * همه‌ی انیمیشن‌ها و مدیاها را فریز/ادامه/seek می‌کند. اگر خود سند این توابع را
 * تعریف کرده باشد دست نمی‌زند — برای همین آخرِ body تزریق می‌شود.
 */
const FALLBACK_RUNTIME = [
    '<script>(function(){',
    '  function anims() { try { return document.getAnimations ? document.getAnimations() : []; } catch (e) { return []; } }',
    '  function media() { try { return Array.prototype.slice.call(document.querySelectorAll("video,audio")); } catch (e) { return []; } }',
    '  function playMedia(m) { try { var p = m.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }',
    '  if (typeof window.__adsPause !== "function") window.__adsPause = function () {',
    '    anims().forEach(function (a) { try { a.pause(); } catch (e) {} });',
    '    media().forEach(function (m) { try { m.pause(); } catch (e) {} });',
    '  };',
    '  if (typeof window.__adsResume !== "function") window.__adsResume = function () {',
    '    anims().forEach(function (a) { try { if (a.playState === "paused") a.play(); } catch (e) {} });',
    '    media().forEach(function (m) { try { if (m.paused) playMedia(m); } catch (e) {} });',
    '  };',
    '  if (typeof window.__adsSeek !== "function") window.__adsSeek = function (t) {',
    '    var ms = Math.max(0, (Number(t) || 0) * 1000);',
    '    anims().forEach(function (a) { try { a.currentTime = ms; } catch (e) {} });',
    '    media().forEach(function (m) { try {',
    '      if (m.duration && isFinite(m.duration)) {',
    '        var target = (Number(t) || 0) % m.duration;',
    '        if (Math.abs(m.currentTime - target) > 0.3) m.currentTime = target;',
    '      }',
    '    } catch (e) {} });',
    '  };',
    '})();</script>',
].join('');

/** اعمال یک override روی آیتم مانیفست — مقدار ساده یا {value,x,y} برای جابه‌جایی */
export function applyElementOverride(handle: AdsElementHandle, override: ElementOverrideValue) {
    try {
        if (override && typeof override === 'object') {
            if (override.value !== undefined) handle.apply(override.value);
            if (handle.el && (override.x != null || override.y != null)) {
                handle.el.style.position = 'relative';
                if (override.x != null) handle.el.style.left = `${override.x}px`;
                if (override.y != null) handle.el.style.top = `${override.y}px`;
            }
        } else {
            handle.apply(override);
        }
    } catch {
        /* apply خود المان خطا بدهد نادیده گرفته می‌شود */
    }
}

/** ثبت المان‌ها برای کلیک و هایلایت + تزریق استایل — یک‌بار per سند */
export function setupElementInteractivity(doc: Document) {
    const win = doc.defaultView as (Window & AdsElementWindow) | null;
    if (!win || win.__adsInteractive) return;
    win.__adsInteractive = true;

    const style = doc.createElement('style');
    style.textContent = HIGHLIGHT_STYLE;
    doc.head?.appendChild(style);

    const registry = win.__adsElements;
    if (Array.isArray(registry)) {
        registry.forEach((raw) => {
            const el = raw as { id?: unknown; el?: unknown; type?: unknown };
            if (el && typeof el.id === 'string' && el.el instanceof HTMLElement) {
                el.el.dataset.adsElementId = el.id;
                // نوع المان روی نود — برای ویرایش درجای متن (دابل‌کلیک) لازم است
                if (typeof el.type === 'string') el.el.dataset.adsElementType = el.type;
            }
        });
    }
}

/** اجرای apply بدون ریران — برای ترجمه‌ی دستی المان‌ها به استایل */
export function highlightElement(handle: AdsElementHandle | null | undefined, on: boolean) {
    const node = handle?.el;
    if (!node) return;
    if (on) {
        if (node.dataset.adsPrevOutline === undefined) node.dataset.adsPrevOutline = node.style.outline || '';
        node.style.outline = '3px solid #ff6a3d';
        node.style.outlineOffset = '2px';
        node.dataset.adsHighlight = '1';
    } else {
        node.style.outline = node.dataset.adsPrevOutline ?? '';
        delete node.dataset.adsHighlight;
    }
}

/**
 * سند HTML کات با bootstrap المان‌ها: overrideهای ذخیره‌شده قبل از اجرای انیمیشن
 * تزریق می‌شوند و یک applier هر بار window.__adsElements ثبت شد، آن‌ها را apply می‌کند
 * (مقدار ساده یا {value,x,y}) و المان‌ها را برای کلیک/هایلایت ثبت می‌کند.
 * ران‌تایم پشتیبان (pause/resume/seek با Web Animations API) هم همیشه آخرِ body
 * تزریق می‌شود تا کنترل‌های پلیر روی هر کاتی — حتی کات‌های بدون قرارداد — کار کند.
 * (سمت export سرویس API هم همین تکنیک تکرار شده است.)
 */
export function buildCutDocument(html: string, overrides?: Record<string, unknown> | null): string {
    if (!html) return '';
    let doc = html;
    // پایدارساز استیج — قبل از هر چیز، تا از ابتدا اسکرول‌بار/جابه‌جایی چیدمان نداشته باشیم
    if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head[^>]*>/i, (m) => `${m}${STAGE_STABILIZER_STYLE}`);
    else doc = STAGE_STABILIZER_STYLE + doc;
    if (overrides && Object.keys(overrides).length > 0) {
        const payload = JSON.stringify(overrides).replace(/</g, '\\u003c');
        const script = [
            '<script>',
            `window.__ADS_ELEMENT_OVERRIDES=${payload};`,
            '(function(){',
            '  var overrides = window.__ADS_ELEMENT_OVERRIDES || {};',
            '  var tries = 0;',
            '  var timer = setInterval(function(){',
            '    tries++;',
            '    var els = window.__adsElements;',
            '    if (Array.isArray(els) && els.length) {',
            '      clearInterval(timer);',
            '      els.forEach(function(el){',
            '        if (!el || !el.id || !Object.prototype.hasOwnProperty.call(overrides, el.id)) return;',
            '        var ov = overrides[el.id];',
            '        try {',
            '          if (ov && typeof ov === "object") {',
            '            if (ov.value !== undefined && typeof el.apply === "function") el.apply(ov.value);',
            '            var node = el.el;',
            '            if (node && node.style && (ov.x != null || ov.y != null)) {',
            '              node.style.position = "relative";',
            '              if (ov.x != null) node.style.left = ov.x + "px";',
            '              if (ov.y != null) node.style.top = ov.y + "px";',
            '            }',
            '          } else if (typeof el.apply === "function") {',
            '            el.apply(ov);',
            '          }',
            '        } catch (e) {}',
            '      });',
            '    } else if (tries > 100) { clearInterval(timer); }',
            '  }, 100);',
            '})();',
            '</script>',
        ].join('');
        if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head[^>]*>/i, (m) => `${m}${script}`);
        else doc = script + doc;
    }
    if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, (m) => `${FALLBACK_RUNTIME}${m}`);
    return doc + FALLBACK_RUNTIME;
}

/** خواندن لیست المان‌های قابل‌ویرایش از iframe کات (نیازمند sandbox با allow-same-origin) */
export function readCutElements(frame: HTMLIFrameElement | null | undefined): AdsElementHandle[] {
    try {
        const doc = frame?.contentDocument;
        if (doc) setupElementInteractivity(doc);
        const win = frame?.contentWindow as (Window & AdsElementWindow) | null;
        const raw = win?.__adsElements;
        if (!Array.isArray(raw)) return [];
        return raw
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
            .map((item) => ({
                id: String(item.id || ''),
                label: String(item.label || item.id || 'element'),
                type: (['text', 'color', 'number', 'image'].includes(String(item.type))
                    ? String(item.type)
                    : 'text') as AdsElementHandle['type'],
                value: item.value,
                // nodeType===1 — چک امن بین realmها (instanceof در والد برای نود iframe کار نمی‌کند)
                el: item.el && (item.el as HTMLElement).nodeType === 1 ? (item.el as HTMLElement) : undefined,
                apply: (value: unknown) => {
                    if (typeof item.apply === 'function') item.apply(value);
                },
            }))
            .filter((item) => item.id && typeof item.apply === 'function');
    } catch {
        return [];
    }
}

export interface AdsAudioTrack {
    url: string;
    startAt: number;
    volume: number;
}

/** ترک‌های صوتی یک کات برای پخش هماهنگ در پیش‌نمایش (نریشن + افکت‌ها) */
export function cutAudioTracks(cut: {
    voiceover?: { audioUrl?: string } | null;
    soundEffects?: { audioUrl?: string; startAt?: number; volume?: number }[] | null;
}): AdsAudioTrack[] {
    const tracks: AdsAudioTrack[] = [];
    if (cut.voiceover?.audioUrl) {
        tracks.push({ url: cut.voiceover.audioUrl, startAt: 0, volume: 1 });
    }
    for (const sfx of cut.soundEffects || []) {
        if (sfx.audioUrl) {
            tracks.push({
                url: sfx.audioUrl,
                startAt: Number(sfx.startAt) || 0,
                volume: Number(sfx.volume) || 1,
            });
        }
    }
    return tracks;
}

/**
 * همگام‌سازی ترک‌های صوتی با زمان فعلی پخش — فقط ترک‌های فعال play می‌شوند.
 * در هر فریم صدا زده می‌شود؛ مدیریت play/pause بر اساس بازه‌ی startAt..startAt+dur.
 */
export function syncAudioTracks(
    audios: HTMLAudioElement[],
    tracks: AdsAudioTrack[],
    time: number,
    playing: boolean,
) {
    audios.forEach((audio, index) => {
        const track = tracks[index];
        if (!track || !track.url) return;
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Number.POSITIVE_INFINITY;
        const active = playing && time >= track.startAt && time < track.startAt + duration;
        if (active) {
            const offset = time - track.startAt;
            if (audio.paused) {
                try {
                    if (Number.isFinite(offset) && offset >= 0 && offset < audio.duration) audio.currentTime = offset;
                } catch {
                    /* seek before metadata */
                }
                audio.volume = Math.min(1, Math.max(0, track.volume));
                void audio.play().catch(() => undefined);
            }
        } else if (!audio.paused) {
            audio.pause();
        }
    });
}
