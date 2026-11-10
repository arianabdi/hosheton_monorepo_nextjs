import { CatRig, type GaitMode } from '../rig/CatRig';
import { clamp, lerp, n2, n3, smoothstep } from '../rig/math';
import type { PosePatch } from '../rig/params';
import type { PoseName } from '../rig/poses';
import type { ScenarioName } from '../config';
import { catDebug, type CatTrace } from '../debug';
import { Ball } from './Ball';
import type { CatSounds } from './CatSounds';

/*
 * کارگردان صحنهٔ گربه: هر سناریو یک تابع async است که روی ساعت فریم جلو می‌رود
 * (wait/until با dt شمرده می‌شوند، پس با پنهان شدن تب و توقف rAF همه‌چیز می‌ایستد).
 * سناریوها: خواب، تماشای ماوس، بازی با توپ، قدم‌زدن آرام و کش و قوس.
 * مختصات همه پیکسل صحنه‌اند؛ کف (لبهٔ بالای چت‌باکس) = env.height.
 */

export type StageEnv = { width: number; height: number; scale: number };

export type DirectorOptions = {
    svg: SVGSVGElement;
    id: string;
    env: StageEnv;
    /** prefers-reduced-motion: ورود/خروج با محو شدن، بدون پرش و شکار */
    calm: boolean;
    sounds: CatSounds | null;
    meow: string;
    rtl: boolean;
};

class Interrupted extends Error {}
class Cancelled extends Error {}

type Waiter = { check: (dt: number) => boolean; resolve: () => void; reject: (reason: unknown) => void };

const NS = 'http://www.w3.org/2000/svg';
const INK = 'fill: var(--body-text-color)';
const CLOUD_D = 'M3 -10A6 6 0 0 1 4 -21A7.5 7.5 0 0 1 17 -24A6.5 6.5 0 0 1 26 -15A5.5 5.5 0 0 1 21 -8Z';
const FISH_D = 'M8 -15.5H21M11 -18.5V-12.5M14 -19V-12M17 -18.5V-12.5M8 -15.5L5 -18.5M8 -15.5L5 -12.5';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;
/** کلیدهای صفحهٔ «انیمیشن‌ها» (همه پیش‌فرض روشن) */
const F = catDebug.flags;
const sideName = (right: boolean) => (right ? 'right' : 'left');

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) {
    const node = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
    for (const key of Object.keys(attrs)) node.setAttribute(key, String(attrs[key]));
    parent.appendChild(node);
    return node;
}

export class CatDirector {
    readonly rig: CatRig;
    onDone: (() => void) | null = null;

    private readonly opts: DirectorOptions;
    private env: StageEnv;
    private readonly backG: SVGGElement;
    private readonly catG: SVGGElement;
    private readonly ballG: SVGGElement;
    private readonly fxG: SVGGElement;
    private ball: Ball | null = null;
    private waiters: Waiter[] = [];
    private timeline: { at: number; fn: () => void }[] = [];
    private interrupt: (() => boolean) | null = null;
    private time = 0;
    private scenario: ScenarioName | null = null;
    private stepId = '';
    private pendingTraces: CatTrace[] | null = [];
    private finished = false;
    private vanishing = false;
    private disposed = false;

    private readonly pointer = { x: -1e4, y: -1e4, speed: 0, lastMoveReal: 0, active: false, touch: false };
    private hovering = false;
    private taps = 0;
    private noiseLevel = 0;
    private noiseCount = 0;

    private readonly speedLines: SVGPathElement;
    private readonly bubble: { g: SVGGElement; rect: SVGRectElement; tail: SVGPathElement; text: SVGTextElement; age: number; life: number };
    private readonly thought: { g: SVGGElement; age: number; life: number };

    constructor(opts: DirectorOptions) {
        this.opts = opts;
        this.env = opts.env;
        const { svg } = opts;
        this.backG = el('g', { 'pointer-events': 'none' }, svg);
        this.catG = el('g', { style: 'pointer-events: visiblePainted' }, svg);
        this.ballG = el('g', {}, svg);
        this.fxG = el('g', { 'pointer-events': 'none' }, svg);

        this.rig = new CatRig(this.catG, { id: opts.id, pose: 'stand', x: -2000, y: this.env.height, scale: this.env.scale });
        this.rig.calm = opts.calm;
        this.rig.opacity = 0;

        this.speedLines = el('path', {
            fill: 'none', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0, style: 'stroke: var(--body-text-color)',
        }, this.backG);

        const bubbleG = el('g', { display: 'none' }, this.fxG);
        const rect = el('rect', { y: -24, height: 20, rx: 10, style: INK }, bubbleG);
        const tail = el('path', { d: 'M-4 -5L0 2L4 -5Z', style: INK }, bubbleG);
        const text = el('text', {
            y: -14,
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            'font-size': 12,
            'font-weight': 700,
            style: 'fill: var(--body-background)',
        }, bubbleG);
        if (opts.rtl) text.setAttribute('direction', 'rtl');
        this.bubble = { g: bubbleG, rect, tail, text, age: 1, life: 0 };

        const thoughtG = el('g', { display: 'none' }, this.fxG);
        el('circle', { cx: -3, cy: 3, r: 1.7, style: INK }, thoughtG);
        el('circle', { cx: 1, cy: -3, r: 2.7, style: INK }, thoughtG);
        el('path', { d: CLOUD_D, style: INK }, thoughtG);
        el('path', {
            d: FISH_D, fill: 'none', 'stroke-width': 1.4, 'stroke-linecap': 'round', style: 'stroke: var(--body-background)',
        }, thoughtG);
        el('circle', { cx: 23, cy: -15.5, r: 2.1, fill: 'none', 'stroke-width': 1.4, style: 'stroke: var(--body-background)' }, thoughtG);
        this.thought = { g: thoughtG, age: 1, life: 0 };

        // ماوس روی گربه = نوازش؛ کلیک/تپ = میو (یا بیدار شدن). فوکوس ورودی دست نمی‌خورد.
        this.catG.addEventListener('pointerenter', (event) => {
            if (event.pointerType !== 'touch') this.hovering = true;
        });
        this.catG.addEventListener('pointerleave', (event) => {
            if (event.pointerType !== 'touch') this.hovering = false;
        });
        this.catG.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            this.pointer.touch = event.pointerType === 'touch';
            this.taps += 1;
        });
        this.catG.addEventListener('mousedown', (event) => event.preventDefault());
    }

    // ───────── ورودی‌ها از کامپوننت ─────────

    setEnv(env: StageEnv) {
        const groundBefore = this.env.height;
        this.env = env;
        this.rig.scale = env.scale;
        if (!this.rig.airborne && Math.abs(this.rig.y - groundBefore) < 1) this.rig.y = env.height;
    }

    pointerMove(x: number, y: number, touch: boolean) {
        const now = performance.now();
        const p = this.pointer;
        if (p.active) {
            const dt = Math.max(0.004, (now - p.lastMoveReal) / 1000);
            p.speed = lerp(p.speed, Math.min(5000, Math.hypot(x - p.x, y - p.y) / dt), 0.3);
        }
        p.x = x;
        p.y = y;
        p.lastMoveReal = now;
        p.active = true;
        p.touch = touch;
    }

    pointerOut() {
        this.pointer.active = false;
        this.hovering = false;
    }

    /** صدا در چت: تایپ (key) یا کلیک (click) — گربهٔ خواب را بیدار می‌کند */
    noise(kind: 'key' | 'click') {
        this.noiseLevel += kind === 'click' ? 1.7 : 1;
        this.noiseCount += 1;
    }

    start(name: ScenarioName) {
        this.scenario = name;
        this.trace({ type: 'start', scenario: name });
        const scripts: Record<ScenarioName, () => Promise<void>> = {
            sleep: () => this.sleep(),
            watch: () => this.watch(),
            ball: () => this.ballPlay(),
            walk: () => this.walkStretch(),
        };
        scripts[name]()
            .catch((error: unknown) => {
                if (!(error instanceof Cancelled) && !(error instanceof Interrupted)) console.error('[chat-cat]', error);
            })
            .finally(() => this.finish());
    }

    /** پنهان شدن فوری (مثلاً قفل شدن ورودی): سناریو قطع و گربه محو می‌شود */
    vanish() {
        if (this.finished || this.vanishing) return;
        this.step('vanish');
        this.vanishing = true;
        this.interrupt = null;
        this.cancelWaiters(new Cancelled());
        this.opts.sounds?.stopAll();
        this.ball?.destroy();
        this.ball = null;
    }

    dispose() {
        // قطع از بیرون (stop یا سناریوی بعدی): برای صفحهٔ بررسی هم پایان حساب می‌شود؛
        // صحنه‌ای که هیچ فریمی اجرا نکرده (mount دوبارهٔ StrictMode) اصلاً گزارش نمی‌شود
        if (!this.finished && !this.pendingTraces && this.scenario) this.trace({ type: 'done', scenario: this.scenario, at: this.time });
        this.pendingTraces = null;
        this.finished = true;
        this.disposed = true;
        this.cancelWaiters(new Cancelled());
        this.opts.sounds?.stopAll();
        this.ball?.destroy();
        this.rig.destroy();
        this.backG.remove();
        this.catG.remove();
        this.ballG.remove();
        this.fxG.remove();
    }

    frame(dtIn: number) {
        if (this.disposed) return;
        if (this.pendingTraces) {
            const list = this.pendingTraces;
            this.pendingTraces = null;
            for (const event of list) this.trace(event);
        }
        const dt = clamp(dtIn, 0, 0.05);
        this.time += dt;
        this.noiseLevel = Math.max(0, this.noiseLevel - dt * 0.9);
        if (this.sinceMove() > 0.1) this.pointer.speed *= Math.exp(-dt * 10);
        if (this.vanishing && !this.finished) {
            this.rig.opacity = Math.max(0, this.rig.opacity - dt / 0.35);
            if (this.rig.opacity <= 0) this.complete();
        }
        this.rig.update(dt);
        if (this.ball) {
            this.ball.update(dt, 16, this.env.width - 16, this.env.height);
            if (this.ball.gone) {
                this.ball.destroy();
                this.ball = null;
            }
        }
        this.updateFx(dt);
        this.runTimeline();
        this.tickWaiters(dt);
    }

    // ───────── ابزار زمان ─────────

    private until(check: (dt: number) => boolean): Promise<void> {
        if (this.disposed || this.vanishing) return Promise.reject(new Cancelled());
        return new Promise((resolve, reject) => {
            this.waiters.push({ check, resolve, reject });
        });
    }

    private nextFrame() {
        return this.until(() => true);
    }

    private wait(sec: number) {
        let t = 0;
        return this.until((dt) => (t += dt) >= sec);
    }

    private waitFor(pred: () => boolean, timeout = Infinity) {
        let t = 0;
        return this.until((dt) => pred() || (t += dt) >= timeout);
    }

    private later(sec: number, fn: () => void) {
        this.timeline.push({ at: this.time + sec, fn });
    }

    private runTimeline() {
        if (!this.timeline.length) return;
        const due = this.timeline.filter((item) => item.at <= this.time);
        if (!due.length) return;
        this.timeline = this.timeline.filter((item) => item.at > this.time);
        for (const item of due) item.fn();
    }

    private tickWaiters(dt: number) {
        if (this.interrupt && this.interrupt()) {
            this.interrupt = null;
            this.cancelWaiters(new Interrupted());
            return;
        }
        if (!this.waiters.length) return;
        const list = this.waiters;
        this.waiters = [];
        for (const w of list) {
            if (w.check(dt)) w.resolve();
            else this.waiters.push(w);
        }
    }

    private cancelWaiters(reason: Error) {
        const list = this.waiters;
        this.waiters = [];
        for (const w of list) w.reject(reason);
    }

    private finish() {
        if (this.finished || this.disposed || this.vanishing) return;
        this.opts.sounds?.stopAll();
        this.complete();
    }

    private complete() {
        this.finished = true;
        if (this.scenario) this.trace({ type: 'done', scenario: this.scenario, at: this.time });
        this.onDone?.();
    }

    /** مرحلهٔ فعلی سناریو (برای صفحهٔ بررسی)؛ blip = رویداد لحظه‌ای که مرحلهٔ فعلی را عوض نمی‌کند */
    private step(id: string, detail?: string, blip = false) {
        if (!blip) this.stepId = id;
        if (this.scenario) this.trace({ type: 'step', scenario: this.scenario, id, detail, at: this.time, blip });
    }

    /** رویدادهای قبل از اولین فریم نگه داشته می‌شوند تا صحنه‌ای که هرگز اجرا نشد گزارش نشود */
    private trace(event: CatTrace) {
        if (!catDebug.tracing) return;
        if (this.pendingTraces) this.pendingTraces.push(event);
        else catDebug.trace(event);
    }

    /** وضعیت زنده برای صفحهٔ بررسی */
    inspect() {
        return {
            scenario: this.scenario,
            step: this.stepId,
            time: this.time,
            noise: this.noiseLevel,
            pointerSpeed: this.pointer.speed,
            hovering: this.hovering,
            ball: this.ball ? { x: this.ball.x, vx: this.ball.vx } : null,
            width: this.env.width,
            rig: this.rig.inspect(),
        };
    }

    private sinceMove() {
        return (performance.now() - this.pointer.lastMoveReal) / 1000;
    }

    // ───────── هندسه و حرکت ─────────

    private get s() {
        return this.env.scale;
    }

    private get ground() {
        return this.env.height;
    }

    private get xMin() {
        return Math.min(this.env.width / 2, 24 + 30 * this.s);
    }

    private get xMax() {
        return Math.max(this.env.width / 2, this.env.width - 24 - 30 * this.s);
    }

    private get offstage() {
        return 70 * this.s + 40;
    }

    private async walkTo(x: number, mode: GaitMode = 'walk', extra?: PosePatch) {
        this.rig.walkTo(x, mode, extra ? { extra, repose: true } : {});
        await this.until(() => !this.rig.moving);
    }

    private async faceTo(right: boolean) {
        if (this.rig.facingRight === right) return;
        this.rig.setFacing(right, { via: 'front' });
        await this.waitFor(() => this.rig.headingSettled, 1.6);
    }

    private async jump(x: number, y: number, height: number, duration: number) {
        this.rig.jumpTo(x, y, { height, duration });
        await this.until(() => !this.rig.airborne);
    }

    private async fade(to: number, sec: number) {
        const from = this.rig.opacity;
        let t = 0;
        await this.until((dt) => {
            t += dt;
            this.rig.opacity = lerp(from, to, clamp(t / sec, 0, 1));
            return t >= sec;
        });
    }

    /** ورود: از یک سر لبه راه می‌آید یا از پشت چت‌باکس بالا می‌پرد */
    private async enter(opts: { spot?: number; mode?: GaitMode; calmPose?: PoseName } = {}) {
        const spot = clamp(opts.spot ?? lerp(this.xMin, this.xMax, rand(0.22, 0.78)), this.xMin, this.xMax);
        if (this.opts.calm) {
            this.step('enter.calm', `x=${Math.round(spot)}`);
            this.rig.place(spot, this.ground);
            this.rig.setFacing(chance(0.5), { instant: true });
            this.rig.setPose(opts.calmPose ?? 'sitFront', { instant: true });
            await this.fade(1, 0.8);
            return;
        }
        const fromLeft = chance(0.5);
        if (opts.mode || catDebug.pick('enter.walk', 'enter.jump', 0.62)) {
            this.step(opts.mode === 'slow' ? 'enter.slow' : 'enter.walk', `from=${sideName(!fromLeft)} x=${Math.round(spot)}`);
            this.rig.place(fromLeft ? -this.offstage : this.env.width + this.offstage, this.ground);
            this.rig.setPose('stand', { instant: true });
            this.rig.setFacing(fromLeft, { instant: true });
            this.rig.opacity = 1;
            if (opts.mode === 'slow') {
                // تا رسیدن به لبه قدم عادی؛ روی لبه آرام و قدم‌به‌قدم
                const edge = fromLeft ? this.xMin : this.xMax;
                this.rig.walkTo(spot, 'walk');
                await this.waitFor(() => (fromLeft ? this.rig.x >= edge - 10 : this.rig.x <= edge + 10), 12);
                await this.walkTo(spot, 'slow');
            } else {
                await this.walkTo(spot, opts.mode ?? 'walk');
            }
        } else {
            this.step('enter.jump', `x=${Math.round(spot)}`);
            const dir = fromLeft ? 1 : -1;
            this.rig.place(spot - dir * 24 * this.s, this.ground + 95 * this.s);
            this.rig.setPose('leap', { instant: true });
            this.rig.setFacing(fromLeft, { instant: true });
            this.rig.opacity = 1;
            await this.jump(spot, this.ground, 115 * this.s, 0.58);
            this.rig.setPose('crouchJump', { speed: 2 });
            await this.wait(0.18);
        }
        this.rig.setPose('stand');
        await this.wait(0.35);
    }

    /** خروج: تا یک سر راه می‌رود و بیرون می‌رود، یا از لبه پایین می‌پرد */
    private async leave(kind?: 'walk' | 'jump' | 'run', extra?: PosePatch) {
        if (this.opts.calm) {
            this.step('leave.calm');
            await this.fade(0, 0.7);
            return;
        }
        const k = kind ?? (catDebug.pick('leave.walk', 'leave.jump', 0.5) ? 'walk' : 'jump');
        const right = this.rig.x > this.env.width / 2 ? chance(0.75) : chance(0.25);
        this.step(`leave.${k}`, `to=${sideName(right)}`);
        if (k === 'jump') {
            await this.walkTo(right ? this.xMax : this.xMin, 'walk');
            await this.jumpDown(right);
        } else {
            await this.walkTo(right ? this.env.width + this.offstage : -this.offstage, k === 'run' ? 'run' : 'walk', extra);
        }
        this.rig.opacity = 0;
    }

    private async jumpDown(right: boolean) {
        await this.faceTo(right);
        this.rig.setPose('crouchJump', { speed: 1.6 });
        await this.wait(0.38);
        this.rig.setPose('leap', { speed: 2.4 });
        this.rig.kick('sy', 1.4);
        const dir = right ? 1 : -1;
        await this.jump(this.rig.x + dir * 62 * this.s, this.ground + 150 * this.s, 95 * this.s, 0.62);
    }

    private say(text: string, angry = false, life = 1.3) {
        if (!F['fx.bubble']) return;
        const b = this.bubble;
        b.g.setAttribute('display', 'inline');
        b.text.textContent = text;
        const width = Math.max(26, b.text.getComputedTextLength() + 16);
        b.rect.setAttribute('x', `${n2(-width / 2)}`);
        b.rect.setAttribute('width', `${n2(width)}`);
        const fill = angry ? 'fill: #E5484D' : INK;
        b.rect.setAttribute('style', fill);
        b.tail.setAttribute('style', fill);
        b.text.setAttribute('style', angry ? 'fill: #fff' : 'fill: var(--body-background)');
        b.age = 0;
        b.life = life;
    }

    private think() {
        this.thought.age = 0;
        this.thought.life = 2.8;
        this.thought.g.setAttribute('display', 'inline');
    }

    private updateFx(dt: number) {
        const side = this.rig.facingRight ? 1 : -1;
        const head = this.rig.headTop();
        const b = this.bubble;
        if (b.age < b.life) {
            b.age += dt;
            const q = b.age / b.life;
            const pop = q < 0.12 ? lerp(0.4, 1.08, q / 0.12) : q < 0.2 ? lerp(1.08, 1, (q - 0.12) / 0.08) : 1;
            b.g.setAttribute(
                'transform',
                `translate(${n2(head.x + side * 16 * this.s)} ${n2(head.y + 2 * this.s)}) scale(${n3(pop)})`,
            );
            b.g.setAttribute('opacity', `${n2(q > 0.78 ? 1 - (q - 0.78) / 0.22 : 1)}`);
            if (b.age >= b.life) b.g.setAttribute('display', 'none');
        }
        const t = this.thought;
        if (t.age < t.life) {
            t.age += dt;
            const q = t.age / t.life;
            const k = (this.s / 0.7) * (q < 0.15 ? lerp(0.5, 1, q / 0.15) : 1);
            t.g.setAttribute('transform', `translate(${n2(head.x + side * 6 * this.s)} ${n2(head.y)}) scale(${n3(k)})`);
            t.g.setAttribute('opacity', `${n2(q > 0.8 ? 1 - (q - 0.8) / 0.2 : 1)}`);
            if (t.age >= t.life) t.g.setAttribute('display', 'none');
        }
        // خطوط سرعت پشت سر گربه وقتی می‌دود
        const v = this.rig.velocity;
        const fast = smoothstep(80 * this.s, 140 * this.s, Math.abs(v));
        if (fast > 0.02 && F['fx.speedLines']) {
            const dir = v > 0 ? 1 : -1;
            const len = 20 * this.s;
            let d = '';
            [[34, 0], [48, 8], [62, 3]].forEach(([h, shift]) => {
                const x0 = this.rig.x - dir * (36 + shift) * this.s;
                const y = this.rig.y - h * this.s;
                d += `M${n2(x0)} ${n2(y)}L${n2(x0 - dir * len)} ${n2(y)}`;
            });
            this.speedLines.setAttribute('d', d);
            this.speedLines.setAttribute('opacity', `${n2(fast * 0.45)}`);
        } else {
            this.speedLines.setAttribute('opacity', '0');
        }
    }

    private async meow(angry = false) {
        this.opts.sounds?.play(angry ? 'angry' : 'meow', { rate: rand(0.95, 1.08) });
        this.say(angry ? `${this.opts.meow} ${this.opts.meow}` : this.opts.meow, angry);
        this.rig.set({ mouthOpen: angry ? 0.95 : 0.8 }, { speed: 2.2 });
        await this.wait(angry ? 0.3 : 0.34);
        this.rig.set({ mouthOpen: angry ? 0.5 : 0 }, { speed: 1.6 });
        await this.wait(0.2);
    }

    // ───────── سناریو A: خواب ─────────

    private async sleep() {
        await this.enter({ calmPose: 'lieCurl' });
        if (!this.opts.calm && F['sleep.spin']) {
            const turns = chance(0.5) ? 1 : 2;
            for (let i = 0; i < turns; i++) {
                const via = chance(0.5) ? 'front' : 'back';
                this.step('sleep.spin', `turn=${i + 1}/${turns} via=${via}`);
                this.rig.spin(1, via, 230);
                await this.waitFor(() => !this.rig.spinning, 4);
                await this.wait(0.15);
            }
        }
        const curl = this.opts.calm || catDebug.pick('sleep.curl', 'sleep.side', 0.55);
        this.step(curl ? 'sleep.curl' : 'sleep.side');
        this.rig.setPose(curl ? 'lieCurl' : 'lieSide', { speed: 0.65 });
        await this.wait(1.8);

        let sleeping = true;
        const until = this.time + rand(26, 40);
        this.step('sleep.loop', `${Math.round(until - this.time)}s`);
        let nextZ = this.time + 0.8;
        let seen = this.noiseCount;
        let lastReact = -10;
        this.noiseLevel = 0;
        this.taps = 0;
        let woke: 'natural' | 'noise' | 'tap' = 'natural';
        while (this.time < until) {
            await this.nextFrame();
            if (this.time >= nextZ) {
                this.rig.emit('z');
                nextZ = this.time + (this.opts.calm ? 3 : 2.1);
            }
            if (this.taps > 0) {
                this.taps = 0;
                if (F['sleep.wakeTap']) {
                    woke = 'tap';
                    break;
                }
            }
            if (this.noiseLevel >= 3.4 && F['sleep.wakeNoise']) {
                woke = 'noise';
                break;
            }
            // صدای کم: گوش تکان می‌خورد، شاید یک چشم باز و بسته شود
            if (this.noiseCount > seen) {
                seen = this.noiseCount;
                if (F['sleep.noiseReact'] && this.time - lastReact > 0.45) {
                    lastReact = this.time;
                    this.rig.twitchEar(chance(0.5) ? 'L' : 'R', 0.9);
                    const peek = chance(0.35);
                    this.step('sleep.noiseReact', `noise=${this.noiseLevel.toFixed(1)}${peek ? ' peek' : ''}`, true);
                    if (peek) {
                        const eye = chance(0.5) ? 'eyeL' : 'eyeR';
                        this.rig.set({ [eye]: 0.55 } as PosePatch, { speed: 1.4 });
                        this.later(0.75, () => {
                            if (sleeping) this.rig.set({ [eye]: 0 } as PosePatch, { speed: 0.8 });
                        });
                    }
                }
            }
        }
        sleeping = false;
        this.step('sleep.wake', woke);

        if (woke !== 'natural') {
            this.step('sleep.startle', woke);
            this.opts.sounds?.play('noise', { gain: 0.6 });
            if (this.opts.calm) {
                this.rig.setPose('sitFront', { speed: 1.2 });
            } else {
                this.rig.setPose('startle', { speed: 2.4 });
                this.rig.kick('lift', 170);
            }
            this.rig.emit('exclaim');
            await this.wait(0.9);
            if (chance(0.55)) {
                this.step('sleep.annoyed');
                this.rig.setPose('annoyed');
            } else {
                this.step('sleep.curious');
                this.rig.setPose('curious');
                this.rig.emit('question');
            }
            await this.wait(1.4);
        }
        this.step('sleep.yawn');
        this.rig.setPose('yawn');
        await this.wait(1.6);
        if (!this.opts.calm && F['sleep.stretch']) {
            this.step('sleep.stretch');
            this.rig.setPose('stand');
            await this.wait(0.5);
            this.rig.setPose('stretch', { speed: 0.8 });
            await this.wait(1.7);
            this.rig.setPose('stand');
            await this.wait(0.5);
        }
        await this.leave(woke === 'noise' ? (catDebug.pick('leave.jump', 'leave.walk', 0.5) ? 'jump' : 'walk') : undefined);
    }

    // ───────── سناریو B: نشستن و تماشای ماوس ─────────

    private async watch() {
        await this.enter();
        const back = !this.opts.calm && catDebug.pick('watch.back', 'watch.front', 0.45);
        const sit: PoseName = back ? 'sitBack' : 'sitFront';
        this.step(back ? 'watch.back' : 'watch.front');
        this.rig.setPose(sit);
        await this.wait(0.9);
        this.step('watch.loop');

        const start = this.time;
        let active = this.time;
        let petting = false;
        let petUntil = 0;
        let nextHeart = 0;
        let huntAt = this.time + 2;
        let curiousAt = this.time + 2.5;
        let thoughtAt = this.time + rand(7, 12);
        let overShoulder = false;
        this.taps = 0;

        while (this.time - start < 50) {
            await this.nextFrame();
            const p = this.pointer;
            const head = this.rig.headTop();
            const dist = p.active ? Math.hypot(p.x - head.x, p.y - head.y) : Infinity;
            const near = dist < 150 * this.s + 40;
            const since = this.sinceMove();
            if (p.active && since < 0.3 && dist < 420) active = this.time;

            // نگاه: از روبه‌رو مردمک‌ها و سر ماوس را دنبال می‌کنند؛ از پشت، وقتی ماوس نزدیک شد از روی شانه برمی‌گردد
            if (back && F['watch.look']) {
                if (!overShoulder && (near || petting)) {
                    overShoulder = true;
                    this.step('watch.look', 'over-shoulder', true);
                    this.rig.set({ faceViewer: 0.82, lookSide: p.x > this.rig.x ? 1 : -1 });
                } else if (overShoulder && !petting && dist > 220 * this.s + 60) {
                    overShoulder = false;
                    this.rig.set({ faceViewer: 0 });
                }
            }
            if (F['watch.look'] && p.active && dist < 460 && (!back || overShoulder)) this.rig.lookAt(p.x, p.y);
            else this.rig.lookAt(null);

            // نوازش (ماوس روی گربه، یا تپ در موبایل)
            const wantPet = F['watch.pet'] && (this.hovering || this.time < petUntil);
            if (wantPet !== petting) {
                petting = wantPet;
                if (petting) {
                    this.step('watch.pet', p.touch ? 'tap' : 'hover');
                    this.rig.set({ eyeL: 0, eyeR: 0, eyeHappy: 1, headTilt: back ? 8 : 10, earFlat: 0.12, tailWaveFreq: 0.3 });
                    this.opts.sounds?.loop('purr');
                    nextHeart = this.time + 0.35;
                } else {
                    this.step('watch.loop');
                    this.opts.sounds?.stopLoop('purr');
                    this.rig.setPose(sit);
                    if (back && overShoulder) this.rig.set({ faceViewer: 0.82, lookSide: p.x > this.rig.x ? 1 : -1 });
                }
            }
            if (petting) {
                active = this.time;
                if (this.time >= nextHeart) {
                    this.rig.emit('heart');
                    nextHeart = this.time + 1.1;
                }
                if (this.taps > 0) {
                    this.taps = 0;
                    if (p.touch && F['watch.meow']) {
                        // تپ دوم در موبایل = میو
                        petUntil = 0;
                        this.step('watch.meow', 'second tap', true);
                        await this.meow();
                    }
                }
                continue;
            }

            if (this.taps > 0) {
                this.taps = 0;
                active = this.time;
                if (p.touch && F['watch.pet']) {
                    petUntil = this.time + 2.4;
                } else if (F['watch.meow']) {
                    this.step('watch.meow');
                    await this.meow();
                    this.step('watch.loop');
                }
                continue;
            }

            if (F['watch.hunt'] && !this.opts.calm && p.active && p.speed > 650 && dist < 200 * this.s + 60 && this.time > huntAt) {
                await this.hunt(sit);
                this.step('watch.loop');
                overShoulder = false;
                huntAt = this.time + 5;
                active = this.time;
                continue;
            }

            if (F['watch.curious'] && p.active && near && since > 0.7 && this.time > curiousAt) {
                this.step('watch.curious');
                await this.curious();
                this.step('watch.loop');
                curiousAt = this.time + 7;
                continue;
            }

            if (F['watch.think'] && this.time > thoughtAt && this.time - active > 4) {
                this.step('watch.think', undefined, true);
                this.think();
                thoughtAt = this.time + rand(14, 22);
            }
            if (this.time - active > 15) break;
        }

        this.step('watch.yawn', this.time - start >= 50 ? '50s limit' : 'idle 15s');
        this.opts.sounds?.stopLoop('purr');
        this.rig.lookAt(null);
        this.rig.setPose('yawn');
        await this.wait(1.6);
        this.rig.setPose('stand');
        await this.wait(0.5);
        await this.leave();
    }

    private async hunt(sit: PoseName) {
        const p = this.pointer;
        this.step('watch.hunt', 'crouch');
        this.rig.setPose('crouch', { speed: 1.5 });
        this.rig.setFacing(p.x > this.rig.x, { via: 'front' });
        this.rig.lookAt(p.x, p.y);
        await this.waitFor(() => this.rig.headingSettled, 1.2);
        await this.wait(0.6);
        const swipe = catDebug.pick('watch.huntSwipe', 'watch.huntLeap', 0.5);
        this.step(swipe ? 'watch.huntSwipe' : 'watch.huntLeap', undefined, true);
        if (swipe) {
            for (let i = 0; i < 2; i++) {
                this.rig.lookAt(p.x, p.y);
                this.rig.setPose('swipe', { speed: 2.6 });
                await this.wait(0.2);
                this.rig.setPose('crouch', { speed: 2 });
                await this.wait(0.32);
            }
        } else {
            const dir = this.rig.facingRight ? 1 : -1;
            const reach = clamp(Math.abs(p.x - this.rig.x), 18 * this.s, 70 * this.s);
            const tx = clamp(this.rig.x + dir * reach, this.xMin, this.xMax);
            this.rig.setPose('leap', { speed: 2.6 });
            await this.jump(tx, this.ground, 34 * this.s, 0.42);
            this.rig.setPose('crouch', { speed: 2 });
            await this.wait(0.4);
        }
        this.rig.setPose(sit);
        await this.wait(0.6);
    }

    private async curious() {
        this.rig.set({ headTilt: chance(0.5) ? 15 : -13, earPerk: 0.3, pupil: 1.2 });
        this.rig.emit('question');
        await this.wait(1.5);
        this.rig.set({ headTilt: 0, earPerk: 0, pupil: 1 });
    }

    // ───────── سناریو C: بازی با توپ ─────────

    private async ballPlay() {
        const s = this.s;
        const fromLeft = chance(0.5);
        const ball = new Ball(this.ballG, 8 * s, () => this.popBall());
        this.ball = ball;
        ball.x = fromLeft ? -14 : this.env.width + 14;
        ball.openLeft = fromLeft;
        ball.openRight = !fromLeft;
        ball.vx = (fromLeft ? 1 : -1) * rand(170, 220) * s;
        this.rig.place(fromLeft ? -this.offstage - 40 * s : this.env.width + this.offstage + 40 * s, this.ground);
        this.rig.setPose('stand', { instant: true });
        this.rig.setFacing(fromLeft, { instant: true });
        this.rig.opacity = 1;
        this.step('ball.enter', `from=${sideName(!fromLeft)} v=${Math.round(Math.abs(ball.vx))}`);
        this.interrupt = () => ball.popped;
        try {
            await this.waitFor(() => ball.x > this.xMin + 6 && ball.x < this.xMax - 6, 4);
            ball.openLeft = false;
            ball.openRight = false;
            const until = this.time + rand(20, 28);
            this.step('ball.play', `${Math.round(until - this.time)}s`, true);
            while (this.time < until) await this.chaseAndBat(ball);
            await this.pushOff(ball);
            this.interrupt = null;
        } catch (error) {
            this.interrupt = null;
            if (!(error instanceof Interrupted)) throw error;
            await this.angryExit(ball.x);
        }
    }

    private popBall() {
        const ball = this.ball;
        if (!ball || ball.popped || !F['ball.pop']) return;
        this.step('ball.pop');
        ball.pop();
        this.opts.sounds?.play('pop');
    }

    private async chaseAndBat(ball: Ball) {
        const s = this.s;
        const reach = 36 * s;
        const wantPounce = F['ball.pounce'] && chance(0.35);
        this.step('ball.chase', wantPounce ? 'may pounce' : undefined);
        for (let guard = 0; guard < 900; guard++) {
            const dir = ball.x >= this.rig.x ? 1 : -1;
            const gap = Math.abs(ball.x - this.rig.x);
            const slow = Math.abs(ball.vx) < 60 * s;
            const facing = this.rig.facingRight === dir > 0;
            this.rig.lookAt(ball.x, this.ground - ball.r);
            if (slow && gap < reach + 6 * s) break;
            if (wantPounce && slow && facing && gap > reach + 34 * s && gap < reach + 80 * s) {
                await this.pounce(ball);
                return;
            }
            const goal = clamp(ball.x - dir * reach, this.xMin, this.xMax);
            this.rig.walkTo(goal, Math.abs(goal - this.rig.x) > 120 * s ? 'run' : 'walk');
            await this.nextFrame();
        }
        await this.bat(ball);
    }

    private async bat(ball: Ball) {
        this.step('ball.bat');
        this.rig.stop();
        await this.waitFor(() => !this.rig.moving, 0.8);
        const dir = ball.x >= this.rig.x ? 1 : -1;
        await this.faceTo(dir > 0);
        this.rig.setPose('bat', { speed: 2.4 });
        await this.wait(0.15);
        if (Math.abs(ball.x - this.rig.x) < 70 * this.s) ball.kick(dir * rand(150, 300) * this.s, chance(0.3) ? 180 * this.s : 0);
        await this.wait(0.15);
        this.rig.setPose('stand', { speed: 1.6 });
        this.rig.lookAt(ball.x, this.ground - ball.r);
        await this.wait(rand(0.3, 0.7));
    }

    private async pounce(ball: Ball) {
        this.step('ball.pounce');
        this.rig.stop();
        await this.waitFor(() => !this.rig.moving, 1);
        this.rig.setPose('crouch', { speed: 1.6 });
        this.rig.lookAt(ball.x, this.ground - ball.r);
        await this.wait(0.75);
        const dir = this.rig.facingRight ? 1 : -1;
        const tx = clamp(ball.x - dir * 22 * this.s, this.xMin, this.xMax);
        this.rig.setPose('leap', { speed: 2.4 });
        await this.jump(tx, this.ground, 42 * this.s, 0.45);
        if (Math.abs(ball.x - this.rig.x) < 60 * this.s) ball.kick(dir * rand(220, 330) * this.s, 220 * this.s);
        this.rig.setPose('crouch', { speed: 2 });
        await this.wait(0.35);
        this.rig.setPose('stand');
        await this.wait(0.3);
    }

    /** خروج با هل دادن توپ تا بیرون از یک سر لبه */
    private async pushOff(ball: Ball) {
        const s = this.s;
        const right = ball.x > this.env.width / 2;
        const dir = right ? 1 : -1;
        this.step('ball.pushOff', `to=${sideName(right)}`);
        if (right) ball.openRight = true;
        else ball.openLeft = true;
        const reach = 34 * s;
        let lastNudge = -9;
        for (let guard = 0; guard < 2400 && this.ball === ball && !ball.gone; guard++) {
            const goal = ball.x - dir * reach;
            this.rig.walkTo(goal, 'walk');
            this.rig.lookAt(ball.x, this.ground - ball.r);
            const behind = (ball.x - this.rig.x) * dir > 0;
            if (behind && Math.abs(goal - this.rig.x) < 8 * s && Math.abs(ball.vx) < 45 * s && this.time - lastNudge > 0.6) {
                lastNudge = this.time;
                this.step('ball.pushOff', 'nudge', true);
                this.rig.stop();
                this.rig.setPose('bat', { speed: 2.4 });
                await this.wait(0.14);
                ball.kick(dir * rand(80, 120) * s);
                await this.wait(0.12);
                this.rig.walkTo(ball.x - dir * reach, 'walk', { repose: true });
            }
            await this.nextFrame();
        }
        this.rig.lookAt(null);
        await this.walkTo(right ? this.env.width + this.offstage : -this.offstage, 'walk');
        this.rig.opacity = 0;
    }

    /** توپ ترکید: عصبانیت کامل، «میو میو» و رفتن با عجله */
    private async angryExit(popX: number) {
        this.step('ball.angry');
        this.rig.stop();
        this.rig.lookAt(popX, this.ground - 8 * this.s);
        this.rig.setPose('angry', { speed: 1.8 });
        this.rig.setFacing(popX > this.rig.x, { via: 'front' });
        await this.wait(0.5);
        await this.meow(true);
        await this.wait(0.15);
        await this.meow(true);
        await this.wait(0.45);
        this.rig.lookAt(null);
        const right = this.rig.x > this.env.width / 2;
        this.step('leave.run', `to=${sideName(right)}`);
        await this.walkTo(right ? this.env.width + this.offstage : -this.offstage, 'run', {
            furPuff: 0.6, tailPuff: 0.8, earFlat: 0.8, lidAngle: 18, eyeL: 0.75, eyeR: 0.75,
        });
        this.rig.opacity = 0;
    }

    // ───────── سناریو D: قدم‌زدن آرام و کش و قوس ─────────

    private async walkStretch() {
        await this.enter({ mode: 'slow', spot: lerp(this.xMin, this.xMax, rand(0.4, 0.6)) });
        this.rig.setPose('stand');
        await this.wait(0.7);
        this.step('walk.stretch');
        this.rig.setPose('stretch', { speed: 0.55 });
        await this.wait(2.3);
        if (F['walk.yawn'] && chance(0.6)) {
            this.step('walk.yawn');
            this.rig.set({ mouthOpen: 1 }, { speed: 0.9 });
            await this.wait(1.1);
            this.rig.set({ mouthOpen: 0 });
            await this.wait(0.4);
        }
        this.rig.setPose('stand', { speed: 0.8 });
        await this.wait(1);
        if (F['walk.stretchHind']) {
            this.step('walk.stretchHind');
            this.rig.setPose('stretchHind', { speed: 0.7 });
            await this.wait(1.7);
            this.rig.setPose('stand');
            await this.wait(0.7);
        }
        const right = this.rig.facingRight;
        this.step('walk.leave', `to=${sideName(right)}`);
        await this.walkTo(right ? this.xMax : this.xMin, 'walk');
        await this.jumpDown(right);
        this.rig.opacity = 0;
    }
}
