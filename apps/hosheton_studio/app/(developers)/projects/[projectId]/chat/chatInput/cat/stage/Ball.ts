import { DEG, TAU, n2, n3 } from '../rig/math';

/*
 * توپ کاموا روی لبهٔ چت‌باکس — فیزیک ساده یک‌بعدی: اصطکاک غلتشی، برگشت از دو سر لبه،
 * چرخش دقیقاً به اندازهٔ مسافت طی‌شده (زاویه = مسافت / شعاع). کلیک روی توپ آن را می‌ترکاند.
 * همهٔ واحدها پیکسل صحنه‌اند.
 */

const NS = 'http://www.w3.org/2000/svg';
const BALL = '#2BB3C2';
const BALL_LINE = '#9BE5EC';
const GRAVITY = 1500;

type Shard = { node: SVGElement; x: number; y: number; vx: number; vy: number; rot: number; vr: number };

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) {
    const node = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
    for (const key of Object.keys(attrs)) node.setAttribute(key, String(attrs[key]));
    parent.appendChild(node);
    return node;
}

export class Ball {
    x = 0;
    vx = 0;
    popped = false;
    gone = false;
    /** اگر باز باشد توپ از آن سر بیرون می‌غلتد به‌جای برگشتن */
    openLeft = false;
    openRight = false;
    readonly r: number;

    private hop = 0;
    private vhop = 0;
    private angle = 0;
    private readonly root: SVGGElement;
    private readonly body: SVGGElement;
    private readonly spin: SVGGElement;
    private readonly shards: Shard[] = [];
    private ring: SVGCircleElement | null = null;
    private burstAge = 0;

    constructor(host: SVGGElement, r: number, onPop: () => void) {
        this.r = r;
        this.root = el('g', { 'pointer-events': 'none' }, host);
        this.body = el('g', { style: 'pointer-events: visiblePainted; cursor: pointer' }, this.root);
        // ناحیهٔ کلیک کمی بزرگ‌تر از خود توپ
        el('circle', { r: r * 1.7, fill: 'transparent' }, this.body);
        this.spin = el('g', {}, this.body);
        el('circle', { r, fill: BALL }, this.spin);
        const lines = el('g', {
            transform: `scale(${n3(r)})`,
            fill: 'none',
            stroke: BALL_LINE,
            'stroke-width': 0.15,
            'stroke-linecap': 'round',
        }, this.spin);
        el('path', { d: 'M-0.78 -0.42C-0.3 -0.08 0.3 -0.08 0.78 -0.42' }, lines);
        el('path', { d: 'M-0.86 0.24C-0.3 0.62 0.3 0.62 0.86 0.24' }, lines);
        el('path', { d: 'M-0.18 -0.96C-0.48 -0.2 -0.36 0.5 0.04 0.97' }, lines);

        this.body.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!this.popped) onPop();
        });
        this.body.addEventListener('mousedown', (event) => event.preventDefault());
    }

    /** ضربه: v سرعت افقی (px/s)، up سرعت پرش کوچک رو به بالا */
    kick(v: number, up = 0) {
        if (this.popped) return;
        this.vx += v;
        if (up > 0) this.vhop = Math.min(this.vhop, -up);
    }

    update(dt: number, minX: number, maxX: number, groundY: number) {
        if (this.popped) {
            this.updateBurst(dt);
            return;
        }
        const speed = Math.abs(this.vx);
        if (speed > 0) {
            const drop = Math.min(speed, (26 + speed * 0.55) * dt);
            this.vx -= Math.sign(this.vx) * drop;
        }
        this.x += this.vx * dt;

        if (this.hop < 0 || this.vhop !== 0) {
            this.vhop += GRAVITY * dt;
            this.hop += this.vhop * dt;
            if (this.hop >= 0) {
                this.hop = 0;
                this.vhop = this.vhop > 140 ? -this.vhop * 0.35 : 0;
            }
        }

        const lo = minX + this.r;
        const hi = maxX - this.r;
        if (this.x < lo) {
            if (!this.openLeft) {
                this.x = lo;
                this.vx = Math.abs(this.vx) * 0.55;
            } else if (this.x < minX - this.r * 8) {
                this.gone = true;
            }
        } else if (this.x > hi) {
            if (!this.openRight) {
                this.x = hi;
                this.vx = -Math.abs(this.vx) * 0.55;
            } else if (this.x > maxX + this.r * 8) {
                this.gone = true;
            }
        }

        this.angle += (this.vx * dt) / this.r / DEG;
        this.root.setAttribute('transform', `translate(${n2(this.x)} ${n2(groundY - this.r + this.hop)})`);
        this.spin.setAttribute('transform', `rotate(${n2(this.angle % 360)})`);
    }

    /** ترکیدن: تکه‌ها با جاذبه پخش می‌شوند و یک حلقه باز می‌شود */
    pop() {
        if (this.popped) return;
        this.popped = true;
        this.body.setAttribute('display', 'none');
        const count = 10;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * TAU + Math.random() * 0.5;
            const sp = (130 + Math.random() * 150) * (this.r / 6);
            const size = this.r * (0.22 + Math.random() * 0.16);
            const node = i % 3 === 0
                ? el('rect', {
                    x: n2(-size), y: n2(-size * 0.45), width: n2(size * 2), height: n2(size * 0.9), rx: n2(size * 0.45), fill: BALL_LINE,
                }, this.root)
                : el('circle', { r: n2(size), fill: BALL }, this.root);
            this.shards.push({
                node,
                x: 0,
                y: 0,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 150,
                rot: Math.random() * 360,
                vr: (Math.random() - 0.5) * 900,
            });
        }
        this.ring = el('circle', { r: this.r, fill: 'none', stroke: BALL_LINE, 'stroke-width': 2 }, this.root);
        this.burstAge = 0;
    }

    private updateBurst(dt: number) {
        this.burstAge += dt;
        const q = this.burstAge / 0.7;
        for (const s of this.shards) {
            s.vy += GRAVITY * 0.7 * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.rot += s.vr * dt;
            s.node.setAttribute('transform', `translate(${n2(s.x)} ${n2(s.y)}) rotate(${n2(s.rot)}) scale(${n3(Math.max(0, 1 - q * 0.7))})`);
            s.node.setAttribute('opacity', `${n2(Math.max(0, 1 - q))}`);
        }
        if (this.ring) {
            const rq = Math.min(1, this.burstAge / 0.32);
            this.ring.setAttribute('r', `${n2(this.r * (1 + rq * 1.8))}`);
            this.ring.setAttribute('opacity', `${n2(1 - rq)}`);
        }
        if (q >= 1) this.gone = true;
    }

    destroy() {
        this.root.remove();
    }
}
