import { CAT_COLORS as C } from './palette';
import {
    DEG, TAU, clamp, hullPath, ik2, lerp, mixColor, n2, n3, polygonPath, smoothPath, smoothstep, wrap180,
} from './math';
import { PARAMS, PARAM_NAMES, SPRINGS, basePose, type ParamName, type Pose, type PosePatch } from './params';
import { POSES, type PoseName } from './poses';
import { catDebug } from '../debug';

/*
 * ریگ رویه‌ای گربه (2.5D): اسکلت در فضای سه‌بعدی ساده تعریف می‌شود (a جلو، b بالا، c پهلو)،
 * با زاویهٔ heading به صفحه تصویر می‌شود و هر فریم مستقیماً روی المان‌های SVG نوشته می‌شود.
 * هر پارامتر ژست فنر خودش را دارد؛ نفس، پلک، تکان گوش، موج دم و چرخهٔ راه رفتن رویه‌ای‌اند.
 */

const NS = 'http://www.w3.org/2000/svg';

const FRONT_UPPER = 14;
const FRONT_LOWER = 26;
const THIGH = 13;
const SHIN = 18;
const FOOT = 9;
const LEG_W = 6.8;
const SHOULDER_A = 2;
const SHOULDER_B = -6;
const HIP_JOINT_A = -1;
const HIP_JOINT_B = -4;
const TAIL_SEGS = 14;
const TAIL_LEN = 52;
const TAIL_W = 6.2;
const EYE_R = 4.2;
const PUPIL_R = 2.15;
const EYE_X = 6.8;
const EYE_Y = 0.4;
const STRIPE_W = 3.3;
const STRIPE_GAP = 13;
const BODY_STRIPES = [
    { t: 0.1, max: 82 },
    { t: 0.27, max: 102 },
    { t: 0.44, max: 106 },
    { t: 0.61, max: 102 },
    { t: 0.78, max: 86 },
];
const SUBSTEP = 1 / 240;
/** کلیدهای صفحهٔ «انیمیشن‌ها» (همه پیش‌فرض روشن) */
const F = catDebug.flags;

const HEAD_D = 'M-10 -12.5C-4 -13.3 4 -13.3 10 -12.5C14.6 -12 15.7 -7 15.7 -1C15.7 6.6 10.6 12.7 0 12.7'
    + 'C-10.6 12.7 -15.7 6.6 -15.7 -1C-15.7 -7 -14.6 -12 -10 -12.5Z';
const EAR_D = 'M-15.2 -5.5L-4.4 -12.6L-13.4 -21.2Z';
const EAR_INNER_D = 'M-12.9 -8.4L-7.5 -12.1L-12.4 -17.3Z';
const EAR_PIVOT_X = -9.7;
const EAR_PIVOT_Y = -9;
const HEART_D = 'M0 3.4C-0.7 2.7 -4.2 0.4 -4.2 -1.9C-4.2 -3.3 -3.1 -4.3 -1.9 -4.3C-1 -4.3 -0.3 -3.8 0 -3.1'
    + 'C0.3 -3.8 1 -4.3 1.9 -4.3C3.1 -4.3 4.2 -3.3 4.2 -1.9C4.2 0.4 0.7 2.7 0 3.4Z';

type LegId = 'FN' | 'FF' | 'HN' | 'HF';
const WALK_PHASE: Record<LegId, number> = { HF: 0, FN: 0.06, HN: 0.5, FF: 0.56 };
const RUN_PHASE: Record<LegId, number> = { FN: 0, FF: 0.1, HN: 0.52, HF: 0.62 };

export type GaitMode = 'walk' | 'slow' | 'run';

/** ژست بدن هنگام حرکت؛ آهنگ قدم (gaitFreq) و طول قدم (stride) سرعت را تعیین می‌کنند تا پنجه روی زمین نلغزد */
const GAIT_POSTURE: Record<GaitMode, PosePatch> = {
    walk: { ...POSES.walk, gait: 0 },
    slow: { ...POSES.walkSlow, gait: 0 },
    run: { ...POSES.run, gait: 0 },
};

/** سهم زمانی که هر پنجه روی زمین است */
const dutyOf = (run: number) => lerp(0.62, 0.4, run);

type Spring = { x: number; v: number; t: number; k: number; c: number };
type Wobble = { x: number; v: number; next: number };
type Sphere = { a: number; b: number; r: number };
type SpinePoint = { a: number; b: number; r: number; ta: number; tb: number; da: number; db: number };

type LegNodes = {
    id: LegId;
    front: boolean;
    near: boolean;
    pa: ParamName;
    pb: ParamName;
    g: SVGGElement;
    haunch: SVGPathElement | null;
    leg: SVGPathElement;
    stripes: SVGPathElement;
};

type EyeNodes = { g: SVGGElement; pupil: SVGEllipseElement; lid: SVGPathElement; arc: SVGPathElement };
type EarNodes = { g: SVGGElement; inner: SVGPathElement; wob: Wobble };

export type ParticleKind = 'heart' | 'z' | 'question' | 'exclaim' | 'note';

type Particle = {
    node: SVGGElement;
    heart: SVGPathElement;
    text: SVGTextElement;
    active: boolean;
    kind: ParticleKind;
    age: number;
    life: number;
    x: number;
    y: number;
    drift: number;
    rise: number;
    seed: number;
};

type DepthItem = { key: string; node: SVGGElement; depth: number };

export type TransitionOptions = {
    /** ضریب سرعت فنرها (1 = عادی، 2 = دو برابر سریع‌تر) */
    speed?: number;
    /** بدون انیمیشن */
    instant?: boolean;
    /** اگر جهت بدن عوض شود، از رو به بیننده بچرخد یا از پشت */
    via?: 'front' | 'back';
};

export type CatRigOptions = { id: string; pose?: PoseName; x?: number; y?: number; scale?: number };

type Attrs = Record<string, string | number>;

function make<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs, parent: Element): SVGElementTagNameMap[K] {
    const node = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
    for (const key of Object.keys(attrs)) node.setAttribute(key, String(attrs[key]));
    parent.appendChild(node);
    return node;
}

function stepSpring(s: { x: number; v: number }, target: number, k: number, c: number, h: number) {
    s.v += (k * (target - s.x) - c * s.v) * h;
    s.x += s.v * h;
}

export class CatRig {
    x: number;
    y: number;
    scale: number;

    private readonly root: SVGGElement;
    private readonly squash: SVGGElement;
    private readonly springs = {} as Record<ParamName, Spring>;
    private readonly cur = {} as Pose;

    private facing: 1 | -1 = 1;
    private poseHeading = 0;
    private breathPhase = Math.random();
    private wavePhase = Math.random();
    private gaitPhase = 0;
    private wigglePhase = 0;
    private blinkLeft = 1 + Math.random() * 3;
    private blinkAge = -1;
    private readonly blinkDur = 0.17;
    private readonly headHeading = { x: 70, v: 0 };
    private readonly lookX = { x: 0, v: 0 };
    private readonly lookY = { x: 0, v: 0 };
    private lookTarget: { x: number; y: number } | null = null;
    private readonly head = { x: 0, y: 0 };

    /** شفافیت کل گربه (ورود/خروج آرام) */
    opacity = 1;
    /** نام آخرین ژست برای صفحهٔ بررسی؛ patch بی‌نام = «custom» */
    poseLabel = 'stand';
    /** نسخهٔ آرام برای prefers-reduced-motion: موج دم کمتر، بدون فشردگی فرود */
    calm = false;
    private vel = 0;
    private lastVel = 0;
    private readonly loco = { active: false, target: 0, mode: 'walk' as GaitMode, vmax: 0 };
    private jumpState: { t: number; dur: number; x0: number; y0: number; x1: number; y1: number; h: number } | null = null;
    private airPitch = 0;
    private spinLeft = 0;
    private spinDir = 1;
    private spinSpeed = 0;
    private stepW = 0;
    private locoW = 0;
    private readonly inertia = { x: 0, v: 0 };
    private inertiaTarget = 0;

    private tailG!: SVGGElement;
    private tailSpikes!: SVGPathElement;
    private tailPath!: SVGPathElement;
    private tailStripes!: SVGPathElement;
    private readonly tailPts = new Float64Array((TAIL_SEGS + 1) * 2);
    private readonly tailOut = new Float64Array((TAIL_SEGS + 1) * 2);
    private readonly legs: LegNodes[] = [];
    private bodyG!: SVGGElement;
    private bodyPath!: SVGPathElement;
    private bodyClip!: SVGPathElement;
    private bodyStripes!: SVGPathElement;
    private backSpikes!: SVGPathElement;
    private headG!: SVGGElement;
    private faceG!: SVGGElement;
    private backHeadG!: SVGGElement;
    private mouthClosed!: SVGPathElement;
    private mouthOpenG!: SVGGElement;
    private readonly eyes: EyeNodes[] = [];
    private readonly ears: EarNodes[] = [];
    private fxG!: SVGGElement;
    private readonly particles: Particle[] = [];
    private readonly depthItems: DepthItem[] = [];
    private orderKey = '';

    constructor(host: SVGGElement, opts: CatRigOptions) {
        this.x = opts.x ?? 0;
        this.y = opts.y ?? 0;
        this.scale = opts.scale ?? 1;
        this.root = make('g', {}, host);
        this.squash = make('g', {}, this.root);
        this.build(opts.id);

        const start = { ...basePose(), ...POSES[opts.pose ?? 'stand'] };
        this.poseLabel = opts.pose ?? 'stand';
        this.poseHeading = start.heading;
        for (const name of PARAM_NAMES) {
            const { k, z } = SPRINGS[PARAMS[name].g];
            this.springs[name] = { x: start[name], v: 0, t: start[name], k, c: 2 * z * Math.sqrt(k) };
        }
        this.headHeading.x = this.headTarget(start);
        this.update(0);
    }

    destroy() {
        this.root.remove();
    }

    // ───────── API ─────────

    /** رفتن نرم به یک ژست کامل (همهٔ پارامترهای دیگر به پیش‌فرض برمی‌گردند) */
    setPose(pose: PoseName | PosePatch, opts: TransitionOptions = {}) {
        const patch = typeof pose === 'string' ? POSES[pose] : pose;
        this.poseLabel = typeof pose === 'string' ? pose : 'custom';
        const full = { ...basePose(), ...patch };
        this.poseHeading = full.heading;
        for (const name of PARAM_NAMES) this.target(name, full[name], opts);
        if (opts.instant) this.snapHead();
    }

    /** تغییر بخشی از پارامترها، بقیه دست نمی‌خورند */
    set(patch: PosePatch, opts: TransitionOptions = {}) {
        if (patch.heading !== undefined) this.poseHeading = patch.heading;
        for (const name of Object.keys(patch) as ParamName[]) {
            const value = patch[name];
            if (value !== undefined) this.target(name, value, opts);
        }
        if (opts.instant) this.snapHead();
    }

    /** ضربه به سرعت یک پارامتر (مثلاً پرش کوچک: kick('lift', 160)) */
    kick(name: ParamName, velocity: number) {
        if ((this.calm || !F['rig.squash']) && (name === 'sx' || name === 'sy' || name === 'lift')) return;
        this.springs[name].v += velocity;
    }

    /** چرخیدن به سمت مخالف، از جلو (رو به بیننده) یا از پشت */
    turn(via: 'front' | 'back' = 'front', opts: TransitionOptions = {}) {
        this.facing = this.facing > 0 ? -1 : 1;
        const mapped = this.facing > 0 ? this.poseHeading : 180 - this.poseHeading;
        this.setSpring('heading', this.headingTarget(mapped, via), opts);
    }

    /** heading خام (برای ابزار تست) */
    setHeading(deg: number, opts: TransitionOptions = {}) {
        const cur = this.springs.heading.x;
        this.facing = Math.cos(deg * DEG) >= 0 ? 1 : -1;
        this.poseHeading = this.facing > 0 ? deg : 180 - deg;
        this.setSpring('heading', cur + wrap180(deg - cur), opts);
    }

    /** رو کردن به راست/چپ */
    setFacing(right: boolean, opts: TransitionOptions = {}) {
        this.facing = right ? 1 : -1;
        const mapped = right ? this.poseHeading : 180 - this.poseHeading;
        this.setSpring('heading', opts.instant ? mapped : this.headingTarget(mapped, opts.via ?? 'front'), opts);
        if (opts.instant) this.snapHead();
    }

    /** گذاشتن فوری گربه در یک نقطه از فضای والد */
    place(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.vel = 0;
        this.lastVel = 0;
        this.loco.active = false;
        this.jumpState = null;
    }

    /**
     * راه رفتن روی لبه تا x (فضای والد). اگر مقصد پشت سرش باشد اول برمی‌گردد، اگر نشسته باشد اول بلند می‌شود.
     * صدا زدن پشت‌سرهم با همان حالت فقط مقصد را عوض می‌کند (برای دنبال کردن هدف متحرک).
     */
    walkTo(x: number, mode: GaitMode = 'walk', opts: { extra?: PosePatch; repose?: boolean } = {}) {
        const L = this.loco;
        const right = x >= this.x;
        const sameDir = right === this.facing > 0;
        if (L.active && L.mode === mode && (sameDir || Math.abs(x - this.x) < 4) && !opts.repose) {
            L.target = x;
            return;
        }
        const flip = !sameDir && Math.abs(x - this.x) > 1;
        if (flip) this.facing = right ? 1 : -1;
        const posture = GAIT_POSTURE[mode];
        this.setPose(opts.extra ? { ...posture, ...opts.extra } : posture, { via: 'front' });
        this.poseLabel = `${mode === 'slow' ? 'walkSlow' : mode}${opts.extra ? '+' : ''}`;
        L.active = true;
        L.target = x;
        L.mode = mode;
        L.vmax = ((posture.stride ?? 15) * (posture.gaitFreq ?? 1)) / dutyOf(posture.gaitRun ?? 0);
    }

    stop() {
        this.loco.active = false;
    }

    get moving() {
        return this.loco.active || Math.abs(this.vel) > 1;
    }

    /** سرعت افقی (px/s در فضای والد) */
    get velocity() {
        return this.vel;
    }

    /** پرش کمانی به (x, y) در فضای والد؛ height بلندی قوس */
    jumpTo(x: number, y: number, opts: { height: number; duration: number }) {
        this.loco.active = false;
        this.vel = 0;
        this.jumpState = { t: 0, dur: Math.max(0.15, opts.duration), x0: this.x, y0: this.y, x1: x, y1: y, h: opts.height };
    }

    get airborne() {
        return this.jumpState !== null;
    }

    /** چرخیدن دور خودش (مثل قبل از خوابیدن)؛ پاها در جا قدم برمی‌دارند */
    spin(turns = 1, via: 'front' | 'back' = 'front', degPerSec = 240) {
        this.spinLeft = 360 * Math.abs(turns);
        this.spinDir = (via === 'front' ? 1 : -1) * this.facing;
        this.spinSpeed = degPerSec;
    }

    get spinning() {
        return this.spinLeft > 0 || !this.headingSettled;
    }

    get headingSettled() {
        const h = this.springs.heading;
        return Math.abs(h.t - h.x) < 6 && Math.abs(h.v) < 40;
    }

    /** بدن تقریباً به ژست هدف رسیده (مثلاً قبل از راه افتادن، بلند شدن تمام شده) */
    get postureSettled() {
        const a = this.springs.hipB;
        const b = this.springs.chestB;
        return Math.abs(a.t - a.x) < 7 && Math.abs(b.t - b.x) < 7;
    }

    get facingRight() {
        return this.facing > 0;
    }

    /** نگاه به یک نقطه در فضای والد (همان فضای x/y)؛ null یعنی نگاه آزاد */
    lookAt(x: number | null, y = 0) {
        this.lookTarget = x === null ? null : { x, y };
    }

    /** نقطهٔ بالای سر در فضای والد */
    headTop() {
        const p = this.cur;
        return {
            x: this.x + this.scale * this.head.x * p.sx,
            y: this.y + this.scale * ((this.head.y - 16) * p.sy - p.lift),
        };
    }

    blink() {
        if (this.blinkAge < 0) this.blinkAge = 0;
    }

    twitchEar(side: 'L' | 'R' | 'both' = 'both', strength = 1) {
        this.ears.forEach((ear, i) => {
            if (side === 'both' || (side === 'L') === (i === 0)) ear.wob.v -= 260 * strength;
        });
    }

    emit(kind: ParticleKind) {
        if (!F['rig.particles']) return;
        const pt = this.particles.find((item) => !item.active);
        if (!pt) return;
        const p = this.cur;
        pt.active = true;
        pt.kind = kind;
        pt.age = 0;
        pt.seed = Math.random() * TAU;
        pt.x = this.head.x * p.sx + (Math.random() - 0.5) * 6 + (kind === 'z' ? 8 : 0);
        pt.y = (this.head.y - 16) * p.sy - p.lift;
        pt.life = kind === 'z' ? 2.3 : kind === 'heart' ? 1.7 : kind === 'note' ? 1.6 : 1.4;
        pt.rise = kind === 'question' || kind === 'exclaim' ? 7 : 22;
        pt.drift = kind === 'z' ? 12 : (Math.random() - 0.5) * 8;
        const isHeart = kind === 'heart';
        pt.heart.setAttribute('display', isHeart ? 'inline' : 'none');
        pt.text.setAttribute('display', isHeart ? 'none' : 'inline');
        if (!isHeart) {
            pt.text.textContent = kind === 'z' ? 'z' : kind === 'question' ? '?' : kind === 'exclaim' ? '!' : '♪';
            pt.text.setAttribute('font-size', kind === 'z' ? '10' : '13');
        }
    }

    /** وضعیت زنده برای صفحهٔ بررسی: مقدار فعلی و هدف هر پارامتر + حرکت */
    inspect() {
        const params = {} as Record<ParamName, { x: number; t: number }>;
        for (const name of PARAM_NAMES) params[name] = { x: this.springs[name].x, t: this.springs[name].t };
        return {
            pose: this.poseLabel,
            x: this.x,
            y: this.y,
            facingRight: this.facing > 0,
            velocity: this.vel,
            moving: this.moving,
            airborne: this.airborne,
            spinning: this.spinLeft > 0,
            opacity: this.opacity,
            looking: this.lookTarget !== null,
            params,
        };
    }

    // ───────── حلقهٔ فریم ─────────

    update(dtIn: number) {
        const dt = clamp(dtIn, 0, 0.05);
        this.stepSpin(dt);
        this.integrate(dt);
        this.stepLocomotion(dt);
        this.stepJump(dt);
        const p = this.cur;
        for (const name of PARAM_NAMES) p[name] = this.springs[name].x;
        this.advance(p, dt);
        this.render(p);
        this.renderParticles(dt);
    }

    private target(name: ParamName, value: number, opts: TransitionOptions) {
        let v = value;
        if (name === 'heading') v = this.headingTarget(this.facing > 0 ? value : 180 - value, opts.via);
        this.setSpring(name, v, opts);
    }

    /** نزدیک‌ترین زاویهٔ هم‌ارز؛ با via مسیری انتخاب می‌شود که از رو به بیننده (یا پشت) بگذرد */
    private headingTarget(mapped: number, via?: 'front' | 'back') {
        const cur = this.springs.heading.x;
        const nearest = cur + wrap180(mapped - cur);
        if (!via || Math.abs(nearest - cur) < 100) return nearest;
        const viaDeg = via === 'front' ? 90 : -90;
        let best = nearest;
        let bestScore = Infinity;
        for (let k = -2; k <= 2; k++) {
            const t = mapped + 360 * k;
            if (Math.abs(t - cur) > 300) continue;
            const score = Math.abs(wrap180((cur + t) / 2 - viaDeg)) + Math.abs(t - cur) * 0.05;
            if (score < bestScore) {
                bestScore = score;
                best = t;
            }
        }
        return best;
    }

    private snapHead() {
        this.headHeading.x = this.headTarget(this.springsSnapshot());
        this.headHeading.v = 0;
    }

    private stepSpin(dt: number) {
        if (this.spinLeft <= 0) return;
        const d = Math.min(this.spinLeft, this.spinSpeed * dt);
        this.spinLeft -= d;
        this.springs.heading.t += d * this.spinDir;
    }

    private stepLocomotion(dt: number) {
        if (dt <= 0) return;
        const L = this.loco;
        const vmax = Math.max(1, L.vmax * this.scale);
        const accel = vmax * 2.6;
        let target = 0;
        if (L.active) {
            const dx = L.target - this.x;
            if (Math.abs(dx) > 6 && Math.sign(dx) !== this.facing) this.walkTo(L.target, L.mode, { repose: true });
            const h = this.springs.heading;
            const ready = Math.abs(h.t - h.x) < 30 && this.postureSettled;
            const brake = Math.sqrt(2 * accel * 0.85 * Math.abs(dx));
            target = ready ? Math.sign(dx) * Math.min(vmax, brake) : 0;
            if (Math.abs(dx) < 1.5 && Math.abs(this.vel) < accel * dt * 1.5) {
                this.x = L.target;
                this.vel = 0;
                L.active = false;
            }
        }
        if (L.active || this.vel !== 0) {
            this.vel += clamp(target - this.vel, -accel * dt, accel * dt);
            if (!L.active && Math.abs(this.vel) < accel * dt) this.vel = 0;
            this.x += this.vel * dt;
        }
        // شتاب جلو/عقب → سر و دم کمی جا می‌مانند
        const acc = ((this.vel - this.lastVel) / dt / Math.max(0.01, this.scale)) * this.facing;
        this.lastVel = this.vel;
        this.inertiaTarget = clamp(-acc * 0.004, -1, 1);
    }

    private stepJump(dt: number) {
        const J = this.jumpState;
        if (!J) {
            this.airPitch += -this.airPitch * Math.min(1, dt * 10);
            return;
        }
        J.t = Math.min(1, J.t + dt / J.dur);
        const u = J.t;
        this.x = lerp(J.x0, J.x1, u);
        this.y = lerp(J.y0, J.y1, u) - J.h * 4 * u * (1 - u);
        const vx = (J.x1 - J.x0) / J.dur;
        const vy = (J.y1 - J.y0 - J.h * 4 * (1 - 2 * u)) / J.dur;
        const pitch = clamp((Math.atan2(vy, Math.max(Math.abs(vx), 160)) / DEG) * 0.35, -20, 20) * this.facing;
        this.airPitch += (pitch - this.airPitch) * Math.min(1, dt * 14);
        if (u >= 1) {
            this.jumpState = null;
            this.kick('sy', -2.6);
            this.kick('sx', 1.7);
        }
    }

    private setSpring(name: ParamName, value: number, opts: TransitionOptions) {
        const s = this.springs[name];
        const base = SPRINGS[PARAMS[name].g];
        const speed = opts.speed ?? 1;
        s.t = value;
        s.k = base.k * speed * speed;
        s.c = 2 * base.z * Math.sqrt(base.k) * speed;
        if (opts.instant) {
            s.x = value;
            s.v = 0;
        }
    }

    private headTarget(p: Pose) {
        let diff = wrap180(90 - p.heading);
        if (Math.abs(diff) > 168) diff = Math.abs(diff) * (p.lookSide >= 0 ? 1 : -1);
        return p.heading + diff * p.faceViewer - (p.headYaw + this.lookX.x * 24);
    }

    private integrate(dt: number) {
        if (dt <= 0) return;
        const steps = Math.ceil(dt / SUBSTEP);
        const h = dt / steps;
        const springy = F['rig.springs'];
        for (const name of PARAM_NAMES) {
            const s = this.springs[name];
            if (s.x === s.t && s.v === 0) continue;
            if (!springy) {
                s.x = s.t;
                s.v = 0;
                continue;
            }
            for (let i = 0; i < steps; i++) stepSpring(s, s.t, s.k, s.c, h);
            if (Math.abs(s.t - s.x) < 1e-4 && Math.abs(s.v) < 1e-3) {
                s.x = s.t;
                s.v = 0;
            }
        }
        // نگاه
        let lx = 0;
        let ly = 0;
        if (this.lookTarget && F['rig.lookAt']) {
            const p = this.cur;
            const local = {
                x: (this.lookTarget.x - this.x) / this.scale,
                y: (this.lookTarget.y - this.y) / this.scale,
            };
            const hx = this.head.x * (p.sx || 1);
            const hy = this.head.y * (p.sy || 1) - (p.lift || 0);
            lx = clamp((local.x - hx) / 80, -1, 1);
            ly = clamp((local.y - hy) / 55, -1, 1);
        }
        // جهت سر — هدفش هر لحظه از heading بدن حساب می‌شود و با فنر خودش دنبالش می‌کند
        let headTarget = this.headTarget(this.springsSnapshot());
        headTarget = this.headHeading.x + wrap180(headTarget - this.headHeading.x);
        for (let i = 0; i < steps; i++) {
            stepSpring(this.lookX, lx, 110, 2 * 0.8 * Math.sqrt(110), h);
            stepSpring(this.lookY, ly, 110, 2 * 0.8 * Math.sqrt(110), h);
            stepSpring(this.headHeading, headTarget, 70, 2 * 0.78 * Math.sqrt(70), h);
            stepSpring(this.inertia, this.inertiaTarget, 70, 2 * 0.45 * Math.sqrt(70), h);
            for (const ear of this.ears) stepSpring(ear.wob, 0, 260, 2 * 0.22 * Math.sqrt(260), h);
        }
        // بدون تأخیر سر: جهت سر قفل به بدن
        if (!F['rig.headLag']) {
            this.headHeading.x = headTarget;
            this.headHeading.v = 0;
        }
    }

    private springsSnapshot(): Pose {
        const p = this.cur;
        for (const name of PARAM_NAMES) p[name] = this.springs[name].x;
        return p;
    }

    private advance(p: Pose, dt: number) {
        this.breathPhase += p.breathRate * dt;
        this.wavePhase += p.tailWaveFreq * dt;
        this.wigglePhase += 4.2 * dt;

        // چرخهٔ قدم از سرعت واقعی درمی‌آید: هر پنجه در فاز تماس دقیقاً هم‌سرعت زمین عقب می‌رود و نمی‌لغزد
        const vLocal = Math.abs(this.vel) / Math.max(0.01, this.scale);
        const stride = Math.max(4, p.stride);
        this.locoW = smoothstep(0.4, stride * 0.9, vLocal);
        if (vLocal > 0.05) this.gaitPhase += ((vLocal * dutyOf(clamp(p.gaitRun, 0, 1))) / stride) * dt;
        else if (p.gait > 0.001) this.gaitPhase += p.gaitFreq * dt;
        // هنگام چرخیدن در جا، پاها قدم کوتاه برمی‌دارند
        const turnRate = Math.abs(this.springs.heading.v);
        const stepTarget = this.jumpState || !F['rig.turnSteps'] ? 0 : smoothstep(25, 110, turnRate) * (1 - this.locoW);
        this.stepW += (stepTarget - this.stepW) * Math.min(1, dt * 7);
        if (vLocal <= 0.05 && this.stepW > 0.02) this.gaitPhase += 2.2 * dt * this.stepW;

        if (this.blinkAge >= 0) {
            this.blinkAge += dt;
            if (this.blinkAge > this.blinkDur) this.blinkAge = -1;
        } else if (F['rig.blink']) {
            this.blinkLeft -= dt;
            if (this.blinkLeft <= 0) {
                this.blinkAge = 0;
                this.blinkLeft = Math.random() < 0.18 ? 0.3 : 2.2 + Math.random() * 3.8;
            }
        }

        const awake = Math.max(p.eyeL, p.eyeR) > 0.3;
        for (const ear of this.ears) {
            ear.wob.next -= dt;
            if (ear.wob.next <= 0) {
                ear.wob.next = 2.5 + Math.random() * 6;
                if (F['rig.earTwitch'] && (awake || Math.random() < 0.4)) ear.wob.v -= 150 + Math.random() * 130;
            }
        }
    }

    // ───────── ساخت DOM ─────────

    private build(id: string) {
        const g = this.squash;

        this.tailG = make('g', {}, g);
        this.tailSpikes = make('path', { fill: C.fur }, this.tailG);
        this.tailPath = make('path', {
            fill: 'none', stroke: C.fur, 'stroke-width': TAIL_W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        }, this.tailG);
        this.tailStripes = make('path', {
            fill: 'none',
            stroke: C.stripe,
            'stroke-width': TAIL_W,
            pathLength: 100,
            'stroke-dasharray': '0 44 6 9 6 9 6 9 6 100',
        }, this.tailG);
        this.depthItems.push({ key: 't', node: this.tailG, depth: 0 });

        for (const legId of ['FF', 'HF', 'FN', 'HN'] as LegId[]) {
            const front = legId[0] === 'F';
            const lg = make('g', {}, g);
            const haunch = front ? null : make('path', { fill: C.fur }, lg);
            const leg = make('path', {
                fill: 'none', stroke: C.fur, 'stroke-width': LEG_W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
            }, lg);
            const stripes = make('path', {
                fill: 'none',
                stroke: C.stripe,
                'stroke-width': LEG_W,
                pathLength: 100,
                'stroke-dasharray': front ? '0 9 8 13 8 13 8 100' : '0 12 9 14 9 100',
            }, lg);
            this.legs.push({
                id: legId,
                front,
                near: legId[1] === 'N',
                pa: `paw${legId}a` as ParamName,
                pb: `paw${legId}b` as ParamName,
                g: lg,
                haunch,
                leg,
                stripes,
            });
            this.depthItems.push({ key: legId, node: lg, depth: 0 });
        }

        this.bodyG = make('g', {}, g);
        const clip = make('clipPath', { id: `${id}-body` }, this.bodyG);
        this.bodyClip = make('path', {}, clip);
        this.backSpikes = make('path', { fill: C.fur }, this.bodyG);
        this.bodyPath = make('path', { fill: C.fur }, this.bodyG);
        this.bodyStripes = make('path', {
            fill: 'none',
            stroke: C.stripe,
            'stroke-width': STRIPE_W,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'clip-path': `url(#${id}-body)`,
        }, this.bodyG);
        this.depthItems.push({ key: 'b', node: this.bodyG, depth: 0 });

        this.headG = make('g', {}, g);
        for (let i = 0; i < 2; i++) {
            const earG = make('g', {}, this.headG);
            make('path', { d: EAR_D, fill: C.fur, stroke: C.fur, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }, earG);
            const inner = make('path', { d: EAR_INNER_D, fill: C.earInner, stroke: C.earInner, 'stroke-width': 1, 'stroke-linejoin': 'round' }, earG);
            this.ears.push({ g: earG, inner, wob: { x: 0, v: 0, next: 1 + Math.random() * 5 } });
        }
        make('path', { d: HEAD_D, fill: C.fur }, this.headG);
        const headClip = make('clipPath', { id: `${id}-head` }, this.headG);
        make('path', { d: HEAD_D }, headClip);
        const eyeClip = make('clipPath', { id: `${id}-eye` }, this.headG);
        make('circle', { r: EYE_R + 0.15 }, eyeClip);
        const inner = make('g', { 'clip-path': `url(#${id}-head)` }, this.headG);

        this.backHeadG = make('g', { fill: C.stripe, opacity: 0 }, inner);
        make('rect', { x: -5.6, y: -14, width: 2.2, height: 7.5, rx: 1.1 }, this.backHeadG);
        make('rect', { x: -1.1, y: -14, width: 2.2, height: 9, rx: 1.1 }, this.backHeadG);
        make('rect', { x: 3.4, y: -14, width: 2.2, height: 7.5, rx: 1.1 }, this.backHeadG);

        this.faceG = make('g', {}, inner);
        const brow = make('g', { fill: C.stripe }, this.faceG);
        make('rect', { x: -4.6, y: -13.5, width: 1.8, height: 5.6, rx: 0.9 }, brow);
        make('rect', { x: -0.9, y: -14, width: 1.8, height: 6.8, rx: 0.9 }, brow);
        make('rect', { x: 2.8, y: -13.5, width: 1.8, height: 5.6, rx: 0.9 }, brow);
        for (let i = 0; i < 2; i++) {
            const eg = make('g', {}, this.faceG);
            make('circle', { r: EYE_R, fill: C.eye }, eg);
            const pupil = make('ellipse', { rx: PUPIL_R, ry: PUPIL_R, fill: C.pupil }, eg);
            const lid = make('path', { fill: C.fur, 'clip-path': `url(#${id}-eye)` }, eg);
            const arc = make('path', {
                fill: 'none', stroke: C.pupil, 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0,
            }, eg);
            this.eyes.push({ g: eg, pupil, lid, arc });
        }
        this.mouthOpenG = make('g', { opacity: 0 }, this.faceG);
        make('ellipse', { cx: 0, cy: 2.8, rx: 3.1, ry: 3, fill: C.mouthDark }, this.mouthOpenG);
        make('ellipse', { cx: 0, cy: 4.6, rx: 1.9, ry: 1.2, fill: C.tongue }, this.mouthOpenG);
        this.mouthClosed = make('path', {
            d: 'M0 7.4V8.5M-2.4 8.2Q-1.2 9.8 0 8.5Q1.2 9.8 2.4 8.2',
            fill: 'none',
            stroke: C.mouth,
            'stroke-width': 0.95,
            'stroke-linecap': 'round',
        }, this.faceG);
        make('path', {
            d: 'M-1.8 5.4H1.8L0 7.4Z', fill: C.nose, stroke: C.nose, 'stroke-width': 1, 'stroke-linejoin': 'round',
        }, this.faceG);
        this.depthItems.push({ key: 'h', node: this.headG, depth: 0 });

        this.fxG = make('g', { 'pointer-events': 'none' }, this.root);
        for (let i = 0; i < 8; i++) {
            const node = make('g', { opacity: 0 }, this.fxG);
            const heart = make('path', { d: HEART_D, fill: C.heart, display: 'none' }, node);
            const text = make('text', {
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
                'font-weight': 800,
                fill: C.mark,
                display: 'none',
            }, node);
            this.particles.push({
                node, heart, text, active: false, kind: 'z', age: 0, life: 1, x: 0, y: 0, drift: 0, rise: 0, seed: 0,
            });
        }
    }

    // ───────── رندر ─────────

    private render(p: Pose) {
        const th = p.heading * DEG;
        const cT = Math.cos(th);
        const sT = Math.sin(th);
        const X = (a: number, c: number) => a * cT - c * sT;
        const Z = (a: number, c: number) => a * sT + c * cT;

        // لایه‌های رویه‌ای
        const br = F['rig.breath'] ? Math.sin(this.breathPhase * TAU) * p.breathAmp : 0;
        const g = clamp(p.gait + this.locoW + this.stepW, 0, 1);
        const strideEff = lerp(p.stride, 6, clamp(this.stepW - this.locoW, 0, 1));
        const inert = F['rig.inertia'] ? this.inertia.x : 0;
        const run = clamp(p.gaitRun, 0, 1);
        const gp = this.gaitPhase;
        const gb = F['rig.gaitBody'] ? g : 0;
        const bob = gb * (Math.cos(gp * TAU * 2) * lerp(0.9, 0.2, run) + Math.sin(gp * TAU + 1.2) * 2.4 * run);
        const flex = gb * run * Math.sin(gp * TAU) * 5.5;
        const rock = gb * Math.sin(gp * TAU) * lerp(0.6, 2.6, run);
        const wig = F['rig.wiggle'] ? p.wiggle * Math.sin(this.wigglePhase * TAU) : 0;
        const puff = 1 + 0.1 * p.furPuff;

        const hip: Sphere = {
            a: p.hipA - flex + wig * 0.9,
            b: p.hipB + bob - rock + Math.abs(wig) * 0.9,
            r: p.hipR * (1 + br * 0.6) * puff,
        };
        const mid: Sphere = { a: p.midA, b: p.midB + bob + br * 9, r: p.midR * (1 + br * 1.3) * puff };
        const chest: Sphere = {
            a: p.chestA + flex,
            b: p.chestB + bob + rock + br * 12,
            r: p.chestR * (1 + br) * puff,
        };

        // ── بدن
        const hx = X(hip.a, 0);
        const mx = X(mid.a, 0);
        const cx = X(chest.a, 0);
        const bodyD = hullPath(hx, -hip.b, hip.r, mx, -mid.b, mid.r) + hullPath(mx, -mid.b, mid.r, cx, -chest.b, chest.r);
        this.bodyPath.setAttribute('d', bodyD);
        this.bodyClip.setAttribute('d', bodyD);
        const bodyDepth = Z(mid.a, 0);

        const spine = (t: number): SpinePoint => {
            const w0 = (1 - t) * (1 - 2 * t);
            const w1 = 4 * t * (1 - t);
            const w2 = t * (2 * t - 1);
            const d0 = 4 * t - 3;
            const d1 = 4 - 8 * t;
            const d2 = 4 * t - 1;
            let ta = hip.a * d0 + mid.a * d1 + chest.a * d2;
            let tb = hip.b * d0 + mid.b * d1 + chest.b * d2;
            const len = Math.hypot(ta, tb) || 1;
            ta /= len;
            tb /= len;
            return {
                a: hip.a * w0 + mid.a * w1 + chest.a * w2,
                b: hip.b * w0 + mid.b * w1 + chest.b * w2,
                r: hip.r * w0 + mid.r * w1 + chest.r * w2,
                ta,
                tb,
                da: -tb,
                db: ta,
            };
        };

        // راه‌راه‌های پشت: نیم‌حلقه‌هایی روی سطح بدن؛ فقط بخشی که رو به بیننده است کشیده می‌شود
        let stripesD = '';
        const ring: number[] = [];
        // ضخامت راه‌راه به فاصلهٔ تصویرشدهٔ آن‌ها بسته است تا در ژست‌های جمع‌وجور (خواب) به هم نچسبند
        let minGap = Infinity;
        let prevX = 0;
        let prevY = 0;
        BODY_STRIPES.forEach((stripe, i) => {
            const sp = spine(stripe.t);
            const px = X(sp.a, 0);
            const py = -sp.b;
            if (i > 0) minGap = Math.min(minGap, Math.hypot(px - prevX, py - prevY));
            prevX = px;
            prevY = py;
        });
        this.bodyStripes.setAttribute('stroke-width', `${n2(clamp(minGap * 0.55, 1.1, STRIPE_W))}`);
        for (const stripe of BODY_STRIPES) {
            const sp = spine(stripe.t);
            for (const sign of [1, -1]) {
                ring.length = 0;
                let started = false;
                for (let j = 0; j <= 6; j++) {
                    const phi = (STRIPE_GAP + ((stripe.max - STRIPE_GAP) * j) / 6) * DEG * sign;
                    const cp = Math.cos(phi);
                    const na = cp * sp.da;
                    const nb = cp * sp.db;
                    const nc = Math.sin(phi);
                    if (na * sT + nc * cT < 0.12) {
                        if (started) break;
                        continue;
                    }
                    started = true;
                    ring.push(X(sp.a + sp.r * na, sp.r * nc), -(sp.b + sp.r * nb));
                }
                if (ring.length >= 4) stripesD += smoothPath(ring);
            }
        }
        this.bodyStripes.setAttribute('d', stripesD);

        // خارهای پشت (عصبانیت)
        const spikeAmt = p.furPuff * Math.abs(cT);
        if (spikeAmt > 0.02) {
            const pts: number[] = [];
            const inner: number[] = [];
            const n = 18;
            for (let i = 0; i <= n; i++) {
                const t = 0.05 + (0.9 * i) / n;
                const sp = spine(t);
                const len = i % 2 ? 5.4 * spikeAmt * Math.pow(Math.sin(Math.PI * t), 0.6) : 0;
                const out = sp.r * 0.9 + (i % 2 ? sp.r * 0.1 + len : 0);
                pts.push(X(sp.a + sp.da * out, 0), -(sp.b + sp.db * out));
                inner.unshift(X(sp.a + sp.da * sp.r * 0.5, 0), -(sp.b + sp.db * sp.r * 0.5));
            }
            for (let i = 0; i < inner.length; i += 2) pts.push(inner[i], inner[i + 1]);
            this.backSpikes.setAttribute('d', polygonPath(pts));
        } else {
            this.backSpikes.setAttribute('d', '');
        }

        // ── پاها
        for (const leg of this.legs) {
            const c = (leg.near ? 1 : -1) * (leg.front ? p.spreadF : p.spreadH);
            let pa = p[leg.pa];
            let pb = p[leg.pb];
            if (g > 0.001 && F['rig.gaitLegs']) {
                const off = lerp(WALK_PHASE[leg.id], RUN_PHASE[leg.id], run);
                const s = (((gp + off) % 1) + 1) % 1;
                const duty = lerp(0.62, 0.4, run);
                if (s < duty) {
                    pa += g * strideEff * (0.5 - s / duty);
                } else {
                    const q = (s - duty) / (1 - duty);
                    pa += g * strideEff * (q * q * (3 - 2 * q) - 0.5);
                    pb += g * Math.sin(Math.PI * q) * lerp(leg.front ? 5.5 : 4.5, 9, run);
                }
            }
            let d: string;
            let sd: string;
            let depth: number;
            if (leg.front) {
                const ra = chest.a + SHOULDER_A;
                const rb = chest.b + SHOULDER_B;
                const [ka, kb, ea, eb] = ik2(ra, rb, pa, pb, FRONT_UPPER, FRONT_LOWER, -1);
                const k = `${n2(X(ka, c))} ${n2(-kb)}`;
                const e = `${n2(X(ea, c))} ${n2(-eb)}`;
                d = `M${n2(X(ra, c))} ${n2(-rb)}L${k}L${e}`;
                sd = `M${k}L${e}`;
                depth = Z((ra + ea) / 2, c);
            } else {
                const ra = hip.a + HIP_JOINT_A;
                const rb = hip.b + HIP_JOINT_B;
                const thigh = (leg.near ? p.thighN : p.thighF) * DEG;
                const ka = ra + Math.cos(thigh) * THIGH;
                const kb = rb + Math.sin(thigh) * THIGH;
                const [ha, hb, ea, eb] = ik2(ka, kb, pa, pb, SHIN, FOOT, -1);
                leg.haunch?.setAttribute('d', hullPath(X(ra, c), -rb, p.haunchR * puff, X(ka, c), -kb, LEG_W / 2 + 0.7));
                d = `M${n2(X(ka, c))} ${n2(-kb)}L${n2(X(ha, c))} ${n2(-hb)}L${n2(X(ea, c))} ${n2(-eb)}`;
                sd = d;
                depth = Z((ra + ea) / 2, c);
            }
            leg.leg.setAttribute('d', d);
            leg.stripes.setAttribute('d', sd);
            const rel = depth - bodyDepth;
            const far = clamp(-rel / 9, 0, 1);
            const near = clamp((rel - 2) / 9, 0, 1) * 0.85;
            const fill = far > 0 ? mixColor(C.fur, C.furFar, far) : mixColor(C.fur, C.furNear, near);
            leg.leg.setAttribute('stroke', fill);
            leg.haunch?.setAttribute('fill', fill);
            leg.stripes.setAttribute('stroke', mixColor(C.stripe, C.stripeFar, far));
            this.depthOf(leg.id).depth = depth;
        }

        // ── سر
        const headA = p.headA + flex * 0.5 + inert * 3;
        const headB = p.headB + bob * 0.35 + rock * 0.25 + br * 6;
        this.head.x = X(headA, 0);
        this.head.y = -headB;
        const tilt = p.headTilt + this.lookX.x * 5;
        this.headG.setAttribute(
            'transform',
            `translate(${n2(this.head.x)} ${n2(this.head.y)}) rotate(${n2(tilt)}) scale(${n3(p.headScale)})`,
        );
        this.depthOf('b').depth = bodyDepth;
        this.depthOf('h').depth = Z(headA, 0) + p.headZ;

        const ph = this.headHeading.x * DEG;
        const fc = Math.cos(ph);
        const fs = Math.sin(ph);
        const faceVis = smoothstep(0.02, 0.32, fs);
        const nod = p.headNod + this.lookY.x * 0.45;
        this.faceG.setAttribute('transform', `translate(${n2(fc * 8.2)} ${n2(nod * 2.6)})`);
        this.faceG.setAttribute('opacity', `${n2(faceVis)}`);
        this.backHeadG.setAttribute('opacity', `${n2(1 - smoothstep(-0.3, 0.05, fs))}`);
        this.backHeadG.setAttribute('transform', `translate(${n2(-fc * 5)} 0)`);

        const spacing = EYE_X * (0.84 + 0.16 * Math.abs(fs));
        const blink = this.blinkAge >= 0 ? Math.sin(Math.PI * clamp(this.blinkAge / this.blinkDur, 0, 1)) : 0;
        const pr = PUPIL_R * p.pupil;
        const gx = clamp(p.gazeX * this.facing + this.lookX.x + fc * 0.3, -1.25, 1.25) * 1.8;
        const gy = clamp(p.gazeY + this.lookY.x, -1, 1) * 1.6;
        this.renderEye(this.eyes[0], -spacing, 1 - 0.22 * Math.max(0, fc), Math.min(p.eyeL, 1 - blink), p, pr, gx, gy, 1);
        this.renderEye(this.eyes[1], spacing, 1 - 0.22 * Math.max(0, -fc), Math.min(p.eyeR, 1 - blink), p, pr, gx, gy, -1);

        const mo = clamp(p.mouthOpen, 0, 1);
        this.mouthOpenG.setAttribute('transform', `translate(0 7.2) scale(${n2(0.7 + 0.3 * mo)} ${n3(Math.max(mo, 0.001))})`);
        this.mouthOpenG.setAttribute('opacity', mo > 0.04 ? '1' : '0');
        this.mouthClosed.setAttribute('opacity', `${n2(1 - smoothstep(0.04, 0.25, mo))}`);

        const shift = fc * 2.4;
        this.ears.forEach((ear, i) => {
            const left = i === 0;
            const far = left ? Math.max(0, fc) : Math.max(0, -fc);
            const ang = -p.earFlat * 70 + p.earPerk * 7 + ear.wob.x;
            const mirror = left ? '' : ' scale(-1 1)';
            ear.g.setAttribute(
                'transform',
                `translate(${n2(shift)} ${n2(p.earFlat * 2.2)})${mirror} rotate(${n2(ang)} ${EAR_PIVOT_X} ${EAR_PIVOT_Y})`
                + ` translate(${EAR_PIVOT_X} 0) scale(${n3(1 - 0.25 * far)} 1) translate(${-EAR_PIVOT_X} 0)`,
            );
            ear.inner.setAttribute('opacity', `${n2(faceVis)}`);
        });

        // ── دم: زنجیرهٔ سه‌بعدی → تصویر → موج روان از ریشه تا نوک
        const s0 = spine(0);
        let ta = hip.a - s0.ta * hip.r * 0.78 + s0.da * hip.r * 0.22;
        let tb = hip.b - s0.tb * hip.r * 0.78 + s0.db * hip.r * 0.22;
        let tc = wig * 1.5;
        const seg = TAIL_LEN / TAIL_SEGS;
        const pts = this.tailPts;
        pts[0] = X(ta, tc);
        pts[1] = -tb;
        let zsum = Z(ta, tc);
        for (let i = 0; i < TAIL_SEGS; i++) {
            const u = i / (TAIL_SEGS - 1);
            const pitch = (p.tailPitch + inert * 14 + p.tailCurl * u + p.tailCurlTip * u * u * u) * DEG;
            const lat = (p.tailSide + p.tailSideCurl * u) * DEG;
            const cp = Math.cos(pitch);
            ta -= cp * Math.cos(lat) * seg;
            tb += Math.sin(pitch) * seg;
            tc += cp * Math.sin(lat) * seg;
            if (tb < TAIL_W * 0.5) tb = TAIL_W * 0.5;
            pts[(i + 1) * 2] = X(ta, tc);
            pts[(i + 1) * 2 + 1] = -tb;
            if (i < 5) zsum += Z(ta, tc);
        }
        const out = this.tailOut;
        out[0] = pts[0];
        out[1] = pts[1];
        const waveLen = Math.max(0.3, p.tailWaveLen);
        const waveAmp = F['rig.tailWave'] ? p.tailWaveAmp * (this.calm ? 0.5 : 1) : 0;
        for (let i = 0; i < TAIL_SEGS; i++) {
            const dx = pts[(i + 1) * 2] - pts[i * 2];
            const dy = pts[(i + 1) * 2 + 1] - pts[i * 2 + 1];
            const len = Math.hypot(dx, dy);
            const u = (i + 1) / TAIL_SEGS;
            const wave = waveAmp * Math.pow(u, p.tailWaveTip) * Math.sin(TAU * (this.wavePhase - u / waveLen));
            const ang = Math.atan2(dy, dx) + wave;
            out[(i + 1) * 2] = out[i * 2] + Math.cos(ang) * len;
            out[(i + 1) * 2 + 1] = out[i * 2 + 1] + Math.sin(ang) * len;
        }
        const tailD = smoothPath(out);
        const tailW = TAIL_W * (1 + 0.7 * p.tailPuff);
        this.tailPath.setAttribute('d', tailD);
        this.tailPath.setAttribute('stroke-width', `${n2(tailW)}`);
        this.tailStripes.setAttribute('d', tailD);
        this.tailStripes.setAttribute('stroke-width', `${n2(tailW)}`);
        this.tailSpikes.setAttribute('d', p.tailPuff > 0.02 ? this.tailSpikePath(out, tailW, p.tailPuff) : '');
        this.depthOf('t').depth = zsum / 6 + p.tailZ;

        this.sortDepth();

        this.squash.setAttribute('transform', `translate(0 ${n2(-p.lift)}) scale(${n3(p.sx)} ${n3(p.sy)})`);
        this.root.setAttribute(
            'transform',
            `translate(${n2(this.x)} ${n2(this.y)}) scale(${n3(this.scale)}) rotate(${n2(F['rig.airPitch'] ? this.airPitch : 0)} 0 -45)`,
        );
        this.root.setAttribute('opacity', `${n2(clamp(this.opacity, 0, 1))}`);
    }

    private renderEye(
        e: EyeNodes, ex: number, esx: number, open: number, p: Pose, pr: number, gx: number, gy: number, side: 1 | -1,
    ) {
        e.g.setAttribute('transform', `translate(${n2(ex)} ${EYE_Y}) scale(${n3(esx)} 1)`);
        const lim = Math.max(0, EYE_R - pr * 0.9);
        let px = gx;
        let py = gy;
        const len = Math.hypot(px, py);
        if (len > lim) {
            px *= lim / len;
            py *= lim / len;
        }
        e.pupil.setAttribute('cx', `${n2(px)}`);
        e.pupil.setAttribute('cy', `${n2(py)}`);
        e.pupil.setAttribute('rx', `${n2(pr * (1 - 0.62 * p.pupilSlit))}`);
        e.pupil.setAttribute('ry', `${n2(pr * (1 + 0.3 * p.pupilSlit))}`);
        const o = clamp(open, 0, 1);
        const lidY = -EYE_R + (1 - o) * EYE_R * 2.15;
        e.lid.setAttribute('d', `M-6 -7H6V${n2(lidY)}H-6Z`);
        e.lid.setAttribute('transform', `rotate(${n2(p.lidAngle * side)})`);
        const y0 = lerp(0.3, 1.4, p.eyeHappy);
        const bend = lerp(2.4, -3.3, p.eyeHappy);
        e.arc.setAttribute('d', `M-3.4 ${n2(y0)}Q0 ${n2(y0 + bend)} 3.4 ${n2(y0)}`);
        e.arc.setAttribute('opacity', `${n2(smoothstep(0.3, 0.06, o))}`);
    }

    private tailSpikePath(pts: Float64Array, width: number, puff: number) {
        const left: number[] = [];
        const right: number[] = [];
        for (let i = 2; i <= TAIL_SEGS; i++) {
            const i0 = (i - 1) * 2;
            const i1 = Math.min(TAIL_SEGS, i + 1) * 2;
            let nx = -(pts[i1 + 1] - pts[i0 + 1]);
            let ny = pts[i1] - pts[i0];
            const len = Math.hypot(nx, ny) || 1;
            nx /= len;
            ny /= len;
            const x = pts[i * 2];
            const y = pts[i * 2 + 1];
            const w = width / 2;
            const l = w + (i % 2 ? 3.4 * puff : 0.2);
            const r = w + (i % 2 ? 0.2 : 3.4 * puff);
            left.push(x + nx * l, y + ny * l);
            right.unshift(x - nx * r, y - ny * r);
        }
        for (let i = 0; i < right.length; i += 2) left.push(right[i], right[i + 1]);
        return polygonPath(left);
    }

    private depthOf(key: string) {
        return this.depthItems.find((item) => item.key === key) as DepthItem;
    }

    private sortDepth() {
        if (!F['rig.depthSort']) return;
        const sorted = [...this.depthItems].sort((a, b) => a.depth - b.depth);
        const key = sorted.map((item) => item.key).join('');
        if (key === this.orderKey) return;
        this.orderKey = key;
        for (const item of sorted) this.squash.appendChild(item.node);
    }

    private renderParticles(dt: number) {
        for (const pt of this.particles) {
            if (!pt.active) continue;
            pt.age += dt;
            const q = pt.age / pt.life;
            if (q >= 1) {
                pt.active = false;
                pt.node.setAttribute('opacity', '0');
                continue;
            }
            const popKind = pt.kind === 'question' || pt.kind === 'exclaim';
            const rise = pt.rise * (1 - (1 - q) * (1 - q));
            const x = pt.x + pt.drift * q + Math.sin(q * 5 + pt.seed) * (popKind ? 0 : 2.2);
            const y = pt.y - rise;
            const s = q < 0.14 ? (q / 0.14) * 1.15 : 1 + 0.15 * Math.max(0, 1 - (q - 0.14) / 0.1);
            const grow = pt.kind === 'z' ? 0.8 + q * 0.7 : 1;
            const o = q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1;
            pt.node.setAttribute('transform', `translate(${n2(x)} ${n2(y)}) scale(${n3(s * grow)})`);
            pt.node.setAttribute('opacity', `${n2(o)}`);
        }
    }
}
