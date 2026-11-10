import type { ScenarioName } from './config';
import type { CatDirector } from './stage/CatDirector';

/*
 * ابزار بررسی گربه برای صفحهٔ «انیمیشن‌ها» (منوی توسعه‌دهنده): کلید روشن/خاموش هر لایهٔ حرکت و هر مرحلهٔ
 * سناریو، ضریب زمان صحنه و رد مراحل اجرا. در حالت عادی همهٔ کلیدها روشن‌اند و بدون شنونده رویدادی ساخته
 * نمی‌شود، پس گربهٔ چت هیچ فرقی نمی‌کند. وضعیت ماژولی است: صفحهٔ بررسی هنگام خروج reset() را صدا می‌زند.
 */

export const CAT_FLAG_DEFAULTS = {
    // لایه‌های رویه‌ای ریگ (همهٔ گربه‌ها)
    'rig.springs': true,
    'rig.breath': true,
    'rig.blink': true,
    'rig.earTwitch': true,
    'rig.tailWave': true,
    'rig.gaitLegs': true,
    'rig.gaitBody': true,
    'rig.turnSteps': true,
    'rig.inertia': true,
    'rig.squash': true,
    'rig.airPitch': true,
    'rig.lookAt': true,
    'rig.headLag': true,
    'rig.wiggle': true,
    'rig.particles': true,
    'rig.depthSort': true,
    // جلوه‌های صحنه
    'fx.bubble': true,
    'fx.speedLines': true,
    // ورود و خروج (مشترک بین سناریوها)
    'enter.walk': true,
    'enter.jump': true,
    'leave.walk': true,
    'leave.jump': true,
    // سناریو خواب
    'sleep.spin': true,
    'sleep.curl': true,
    'sleep.side': true,
    'sleep.noiseReact': true,
    'sleep.wakeTap': true,
    'sleep.wakeNoise': true,
    'sleep.stretch': true,
    // سناریو تماشا
    'watch.front': true,
    'watch.back': true,
    'watch.look': true,
    'watch.pet': true,
    'watch.meow': true,
    'watch.hunt': true,
    'watch.huntSwipe': true,
    'watch.huntLeap': true,
    'watch.curious': true,
    'watch.think': true,
    // سناریو توپ
    'ball.pounce': true,
    'ball.pop': true,
    // سناریو قدم‌زدن
    'walk.yawn': true,
    'walk.stretchHind': true,
} satisfies Record<string, boolean>;

export type CatFlag = keyof typeof CAT_FLAG_DEFAULTS;

export const CAT_FLAGS = Object.keys(CAT_FLAG_DEFAULTS) as CatFlag[];

/** شاخه‌های تصادفی دوتایی؛ دست‌کم یکی باید روشن بماند (خاموش کردن یکی = همیشه دیگری) */
export const CAT_VARIANT_GROUPS: [CatFlag, CatFlag][] = [
    ['enter.walk', 'enter.jump'],
    ['leave.walk', 'leave.jump'],
    ['sleep.curl', 'sleep.side'],
    ['watch.front', 'watch.back'],
    ['watch.huntSwipe', 'watch.huntLeap'],
];

export type CatTrace =
    | { type: 'start'; scenario: ScenarioName }
    /** blip = رویداد لحظه‌ای داخل یک مرحله (مرحلهٔ فعلی عوض نمی‌شود) */
    | { type: 'step'; scenario: ScenarioName; id: string; detail?: string; at: number; blip: boolean }
    | { type: 'done'; scenario: ScenarioName; at: number }
    | { type: 'schedule'; delay: number; pool: ScenarioName[]; first: boolean };

export type CatDebugState = {
    readonly flags: Readonly<Record<CatFlag, boolean>>;
    /** ضریب زمان صحنهٔ زنده (فقط ChatCat) */
    readonly timeScale: number;
    readonly paused: boolean;
};

class CatDebugStore {
    /** همان شیء همیشه؛ موتور مستقیم از آن می‌خواند */
    readonly flags: Record<CatFlag, boolean> = { ...CAT_FLAG_DEFAULTS };
    timeScale = 1;
    paused = false;
    /** کارگردان صحنهٔ در حال اجرا (برای خواندن وضعیت زنده و جلو بردن دستی فریم) */
    director: CatDirector | null = null;

    private snapshot: CatDebugState = { flags: { ...CAT_FLAG_DEFAULTS }, timeScale: 1, paused: false };
    private readonly stateListeners = new Set<() => void>();
    private readonly traceListeners = new Set<(event: CatTrace) => void>();

    readonly serverState: CatDebugState = this.snapshot;

    getState = () => this.snapshot;

    subscribeState = (fn: () => void) => {
        this.stateListeners.add(fn);
        return () => {
            this.stateListeners.delete(fn);
        };
    };

    setFlag(flag: CatFlag, value: boolean) {
        this.flags[flag] = value;
        // شاخه‌ی دوتایی هرگز هر دو خاموش نمی‌شود
        if (!value) {
            for (const [a, b] of CAT_VARIANT_GROUPS) {
                if (flag === a && !this.flags[b]) this.flags[b] = true;
                if (flag === b && !this.flags[a]) this.flags[a] = true;
            }
        }
        this.commit();
    }

    setFlags(values: Partial<Record<CatFlag, boolean>>) {
        for (const flag of CAT_FLAGS) {
            const value = values[flag];
            if (typeof value === 'boolean') this.flags[flag] = value;
        }
        for (const [a, b] of CAT_VARIANT_GROUPS) {
            if (!this.flags[a] && !this.flags[b]) this.flags[a] = true;
        }
        this.commit();
    }

    setTime(opts: { timeScale?: number; paused?: boolean }) {
        if (opts.timeScale !== undefined) this.timeScale = opts.timeScale;
        if (opts.paused !== undefined) this.paused = opts.paused;
        this.commit();
    }

    reset() {
        Object.assign(this.flags, CAT_FLAG_DEFAULTS);
        this.timeScale = 1;
        this.paused = false;
        this.commit();
    }

    /** شاخهٔ تصادفی دوتایی: اگر فقط یکی روشن است همان، وگرنه با احتمال p اولی */
    pick(a: CatFlag, b: CatFlag, p: number) {
        if (this.flags[a] !== this.flags[b]) return this.flags[a];
        return Math.random() < p;
    }

    subscribe(fn: (event: CatTrace) => void) {
        this.traceListeners.add(fn);
        return () => {
            this.traceListeners.delete(fn);
        };
    }

    get tracing() {
        return this.traceListeners.size > 0;
    }

    trace(event: CatTrace) {
        for (const fn of this.traceListeners) fn(event);
    }

    private commit() {
        this.snapshot = { flags: { ...this.flags }, timeScale: this.timeScale, paused: this.paused };
        for (const fn of this.stateListeners) fn();
    }
}

export const catDebug = new CatDebugStore();
