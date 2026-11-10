/*
 * صداهای گربه با Web Audio. فقط بعد از اولین تعامل کاربر فعال می‌شود (قانون autoplay مرورگر).
 * فایل‌ها از /sounds/cat/ خوانده می‌شوند؛ اگر فایلی نبود یا خراب بود، بی‌صدا رد می‌شود.
 */

export type CatSoundName = 'meow' | 'angry' | 'purr' | 'pop' | 'noise';

export const CAT_SOUND_FILES: Record<CatSoundName, string> = {
    meow: 'meow.mp3',
    angry: 'angry-meow.mp3',
    purr: 'purr.mp3',
    pop: 'pop.mp3',
    noise: 'noise.mp3',
};

type AudioCtor = typeof AudioContext;

export class CatSounds {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private readonly buffers = new Map<CatSoundName, Promise<AudioBuffer | null>>();
    private readonly loops = new Map<CatSoundName, AudioBufferSourceNode>();
    private readonly wanted = new Set<CatSoundName>();
    private readonly listeners = new Set<(available: boolean) => void>();
    private enabled = true;
    private muted = false;
    private volume = 0.25;
    /** حداقل یک فایل صدا واقعاً وجود دارد (برای نشان دادن دکمهٔ بی‌صدا) */
    available = false;

    constructor(private readonly base = '/sounds/cat/') {}

    configure(opts: { enabled?: boolean; volume?: number; muted?: boolean }) {
        if (opts.enabled !== undefined) this.enabled = opts.enabled;
        if (opts.volume !== undefined) this.volume = opts.volume;
        if (opts.muted !== undefined) this.muted = opts.muted;
        if (this.master) this.master.gain.value = this.muted || !this.enabled ? 0 : this.volume;
        if (this.muted || !this.enabled) this.stopAll();
    }

    onAvailable(fn: (available: boolean) => void) {
        this.listeners.add(fn);
        return () => {
            this.listeners.delete(fn);
        };
    }

    /** باید داخل یک رویداد کاربر (pointerdown/keydown) صدا زده شود */
    unlock() {
        if (typeof window === 'undefined' || !this.enabled) return;
        if (!this.ctx) {
            const Ctor: AudioCtor | undefined = window.AudioContext
                ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
            if (!Ctor) return;
            try {
                this.ctx = new Ctor();
                this.master = this.ctx.createGain();
                this.master.gain.value = this.muted ? 0 : this.volume;
                this.master.connect(this.ctx.destination);
            } catch {
                this.ctx = null;
                return;
            }
            // یک بار بررسی می‌کنیم فایل‌ها هستند یا نه
            void this.load('meow').then((buffer) => this.setAvailable(Boolean(buffer)));
        }
        if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    }

    play(name: CatSoundName, opts: { rate?: number; gain?: number } = {}) {
        const ctx = this.ready();
        if (!ctx) return;
        void this.load(name).then((buffer) => {
            if (!buffer || !this.ready() || !this.master) return;
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = opts.rate ?? 1;
            const gain = ctx.createGain();
            gain.gain.value = opts.gain ?? 1;
            source.connect(gain);
            gain.connect(this.master);
            source.start();
        });
    }

    loop(name: CatSoundName) {
        const ctx = this.ready();
        if (!ctx || this.wanted.has(name)) return;
        this.wanted.add(name);
        void this.load(name).then((buffer) => {
            if (!buffer || !this.wanted.has(name) || this.loops.has(name) || !this.ready() || !this.master) return;
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(this.master);
            source.start();
            this.loops.set(name, source);
        });
    }

    stopLoop(name: CatSoundName) {
        this.wanted.delete(name);
        const source = this.loops.get(name);
        if (!source) return;
        try {
            source.stop();
        } catch {
            // قبلاً متوقف شده
        }
        this.loops.delete(name);
    }

    stopAll() {
        for (const name of [...this.wanted, ...this.loops.keys()]) this.stopLoop(name);
    }

    dispose() {
        this.stopAll();
        this.listeners.clear();
        void this.ctx?.close().catch(() => undefined);
        this.ctx = null;
        this.master = null;
    }

    private ready() {
        if (!this.enabled || this.muted || !this.ctx || this.ctx.state !== 'running') return null;
        return this.ctx;
    }

    private load(name: CatSoundName) {
        let pending = this.buffers.get(name);
        if (!pending) {
            const ctx = this.ctx;
            pending = !ctx
                ? Promise.resolve(null)
                : fetch(`${this.base}${CAT_SOUND_FILES[name]}`)
                    .then((res) => (res.ok ? res.arrayBuffer() : null))
                    .then((data) => (data ? ctx.decodeAudioData(data) : null))
                    .catch(() => null);
            this.buffers.set(name, pending);
        }
        return pending;
    }

    private setAvailable(value: boolean) {
        if (this.available === value) return;
        this.available = value;
        for (const fn of this.listeners) fn(value);
    }
}
