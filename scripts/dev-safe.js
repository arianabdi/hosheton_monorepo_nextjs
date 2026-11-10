#!/usr/bin/env node
/**
 * dev-safe.js — `next dev` را با محافظ CPU دیوانه اجرا می‌کند.
 *
 * مشکل: کش پایدار Turbopack (‏.next/dev/cache) بعد از kill سخت یا ریفکتورهای بزرگ
 * می‌تواند خراب شود؛ در آن حالت سرورِ dev حتی بدون هیچ درخواستی CPU را برای همیشه
 * می‌سوزاند (الگوی تشخیص: CPU بالا + صفر اتصال باز). راه‌حل، پاک‌کردن کش است.
 *
 * این رپر دو محافظ دارد:
 *   1) قبل از استارت: اگر حجم کش از حد مجاز بزرگ‌تر بود پاکش می‌کند.
 *   2) حین اجرا: CPU پروسه‌های سرور را نمونه‌برداری می‌کند؛ اگر «داغِ بی‌کار»
 *      (CPU بالا بدون هیچ اتصال) یا مدت‌ها پین‌شده روی سقف بماند، سرور را می‌کشد،
 *      کش را پاک و خودکار ری‌استارت می‌کند (تا ۳ بار؛ بعدش خطا می‌دهد).
 *
 * مصرف:  node ../../scripts/dev-safe.js [-- <آرگومان‌های next dev>]
 * مثال:  npm run dev -- --port 3005
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TAG = '[dev-safe]';
const APP_DIR = process.cwd();
const NEXT_ARGS = process.argv.slice(2); // e.g. -- --port 3005

// --- تنظیمات محافظ ---
const CACHE_MAX_BYTES = 1.5 * 1024 * 1024 * 1024; // کش بزرگ‌تر از این = مشکوک به خرابی
const SAMPLE_INTERVAL_MS = 5000;
const IDLE_HOT_LIMIT = 6;          // ۶ نمونه پشت‌سرهم CPU>40% بدون هیچ اتصال  (~۳۰s)
const PINNED_HOT_LIMIT = 24;       // ۲۴ نمونه پشت‌سرهم CPU>80% با یا بدون اتصال (~۲min)
const IDLE_HOT_CPU = 60;   // یک پروسه بیش از ۰.۶ هسته
const PINNED_HOT_CPU = 85; // یک پروسه تقریباً یک هسته‌ی کامل
const MAX_HEALS = 3;

function log(msg) { console.log(`${TAG} ${msg}`); }

function findNextCli() {
    let dir = APP_DIR;
    for (let i = 0; i < 6 && dir; i++) {
        const candidate = path.join(dir, 'node_modules', 'next', 'dist', 'bin', 'next');
        if (fs.existsSync(candidate)) return candidate;
        dir = path.dirname(dir);
    }
    return null;
}

function dirSizeBytes(dir) {
    let total = 0;
    const stack = [dir];
    while (stack.length) {
        const cur = stack.pop();
        let entries;
        try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
        for (const e of entries) {
            const p = path.join(cur, e.name);
            try {
                if (e.isDirectory()) stack.push(p);
                else total += fs.statSync(p).size;
            } catch { /* فایل حین خواندن حذف شده */ }
        }
    }
    return total;
}

function rmRf(dir) {
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); return true; }
    catch (e) { log(`پاک‌کردن ${dir} شکست خورد: ${e.message}`); return false; }
}

// --- کنترل پروسه‌ها (ویندوز-محور، fallback لینوکس/مک) ---
const IS_WIN = process.platform === 'win32';

function killTree(pid) {
    return new Promise((resolve) => {
        if (IS_WIN) {
            const k = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
            k.on('close', () => resolve());
            k.on('error', () => resolve());
        } else {
            try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch {} }
            resolve();
        }
    });
}

/** فهرست pidهای زیرمجموعه root (خود root هم شامل می‌شود) با یک کوئری WMI */
async function collectTreePids(rootPid) {
    const pids = [rootPid];
    if (!IS_WIN) return pids;
    const out = await new Promise((resolve) => {
        const ps = spawn('powershell', ['-NoProfile', '-Command',
            `Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress`],
            { stdio: ['ignore', 'pipe', 'ignore'] });
        let buf = '';
        ps.stdout.on('data', (d) => { buf += d; });
        ps.on('close', () => resolve(buf));
        ps.on('error', () => resolve(''));
    });
    let rows;
    try {
        const parsed = JSON.parse(out);
        rows = Array.isArray(parsed) ? parsed : [parsed];
    } catch { return pids; }
    const byParent = new Map();
    for (const r of rows) {
        const p = Number(r.ParentProcessId);
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(Number(r.ProcessId));
    }
    // BFS با سقف تعداد تا در حالت غیرعادی لوپ نزند
    const seen = new Set(pids);
    for (let i = 0; i < pids.length && i < 200; i++) {
        for (const child of byParent.get(pids[i]) || []) {
            if (!seen.has(child)) { seen.add(child); pids.push(child); }
        }
    }
    return pids;
}

/** مجموع CPU-ثانیه مصرف‌شده هر pid از لحظه بالا آمدن پروسه */
async function cpuSeconds(pids) {
    if (!pids.length) return new Map();
    const list = pids.join(',');
    const out = await new Promise((resolve) => {
        const ps = spawn('powershell', ['-NoProfile', '-Command',
            `Get-Process -Id ${list} -ErrorAction SilentlyContinue | ForEach-Object { "{0} {1}" -f $_.Id, $_.TotalProcessorTime.TotalMilliseconds }`],
            { stdio: ['ignore', 'pipe', 'ignore'] });
        let buf = '';
        ps.stdout.on('data', (d) => { buf += d; });
        ps.on('close', () => resolve(buf));
        ps.on('error', () => resolve(''));
    });
    const map = new Map();
    for (const line of out.split('\n')) {
        const m = line.trim().match(/^(\d+)\s+([\d.]+)$/);
        if (m) map.set(Number(m[1]), Number(m[2]));
    }
    return map;
}

/**
 * پورت HTTP سرور (فقط bindهای غیر-loopback) + تعداد اتصال‌های واقعی مرورگر/کلاینت.
 * اتصالات داخلی IPC (روی 127.0.0.1) و inspector حساب نمی‌شوند تا «بی‌کاری» واقعی
 * تشخیص داده شود.
 */
function netstatForPids(pids) {
    const pidSet = new Set(pids);
    const httpPorts = new Set();
    let connections = 0;
    let out;
    try { out = require('child_process').execSync('netstat -ano', { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); }
    catch { return { httpPorts, connections }; }
    const established = [];
    for (const line of out.split('\n')) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 5) continue;
        const [proto, local, , state, pidStr] = cols;
        if (proto !== 'TCP') continue;
        const pid = Number(pidStr);
        if (!pidSet.has(pid)) continue;
        const localPort = Number(local.replace(/^\[?[^\]]*\]?:/, ''));
        if (state === 'LISTENING') {
            const localIp = local.replace(/^\[?([^\]]*)\]?:.*$/, '$1');
            const external = localIp === '0.0.0.0' || localIp === '::' || (!localIp.startsWith('127.') && localIp !== '::1' && localIp !== '');
            if (external && localPort && localPort < 9200) httpPorts.add(localPort);
        } else if (state === 'ESTABLISHED') {
            established.push(localPort);
        }
    }
    for (const p of established) if (httpPorts.has(p)) connections++;
    return { httpPorts, connections };
}

// --- محافظ قبل از استارت: کشِ بیش‌ازحد بزرگ = تقریباً همیشه خراب ---
const cacheDir = path.join(APP_DIR, '.next');
(async function main() {
    const nextCli = findNextCli();
    if (!nextCli) {
        console.error(`${TAG} next پیدا نشد از ${APP_DIR}`);
        process.exit(1);
    }

    if (fs.existsSync(cacheDir)) {
        const size = dirSizeBytes(cacheDir);
        log(`حجم .next: ${(size / 1024 / 1024).toFixed(0)}MB`);
        if (size > CACHE_MAX_BYTES) {
            log(`کش از حد مجاز بزرگ‌تر شده — پاک می‌کنم...`);
            rmRf(cacheDir);
            log('کش پاک شد.');
        }
    }

    let child = null;
    let heals = 0;

    // rolling-state برای تصمیم‌گیری
    let idleHot = 0;
    let pinnedHot = 0;
    let prevCpu = null; // Map pid -> ms
    let prevAt = 0;

    function spawnDev() {
        idleHot = 0; pinnedHot = 0; prevCpu = null;
        log(`next dev شروع می‌شود (تلاش شماره ${heals + 1})...`);
        child = spawn(process.execPath, [nextCli, 'dev', ...NEXT_ARGS], {
            cwd: APP_DIR,
            stdio: 'inherit',
            windowsHide: true,
        });
        child.on('exit', (code, signal) => {
            if (stopping) return;
            log(`next dev خارج شد (code=${code} signal=${signal})`);
            process.exitCode = code ?? 1;
        });
    }

    let stopping = false;
    process.on('SIGINT', async () => {
        stopping = true;
        log('SIGINT — سرور بسته می‌شود...');
        if (child) await killTree(child.pid);
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        stopping = true;
        if (child) await killTree(child.pid);
        process.exit(0);
    });

    async function heal(reason) {
        heals++;
        if (heals > MAX_HEALS) {
            console.error(`${TAG} ❗ ${MAX_HEALS} بار خودترمیمی انجام شد و مشکل برگشت — سرور را می‌بندم.`);
            console.error(`${TAG} دستی اجرا کنید:  rmdir /s /q .next  سپس  npm run dev`);
            if (child) await killTree(child.pid);
            process.exit(1);
        }
        console.error(`${TAG} 🔥 CPU دیوانه شده (${reason}) — خودترمیمی ${heals}/${MAX_HEALS}: کشتن سرور، پاک‌کردن کش، ری‌استارت...`);
        const pid = child.pid;
        await killTree(pid);
        await new Promise((r) => setTimeout(r, 2000));
        rmRf(cacheDir);
        spawnDev();
    }

    async function watchdog() {
        if (stopping || !child || child.exitCode !== null) return;
        const pids = await collectTreePids(child.pid);
        const now = Date.now();
        const cpu = await cpuSeconds(pids);
        const { connections } = netstatForPids(pids);
        if (prevCpu && prevAt) {
            const dtSec = (now - prevAt) / 1000;
            let maxPct = 0;
            for (const [pid, ms] of cpu) {
                const before = prevCpu.get(pid);
                if (before !== undefined && ms >= before) {
                    const pct = ((ms - before) / 1000 / dtSec) * 100;
                    if (pct > maxPct) maxPct = pct;
                }
            }

            if (connections === 0 && maxPct > IDLE_HOT_CPU) {
                idleHot++;
                pinnedHot = 0;
            } else if (maxPct > PINNED_HOT_CPU) {
                pinnedHot++;
                idleHot = 0;
            } else {
                idleHot = 0;
                pinnedHot = 0;
            }

            if (idleHot >= IDLE_HOT_LIMIT) {
                await heal(`CPU ${(maxPct).toFixed(0)}% در یک پروسه با صفر اتصال باز`);
                return;
            }
            if (pinnedHot >= PINNED_HOT_LIMIT) {
                await heal(`CPU ${(maxPct).toFixed(0)}% به مدت طولانی پین شده`);
                return;
            }
        }
        prevCpu = cpu;
        prevAt = now;
    }

    spawnDev();
    setInterval(() => { watchdog().catch(() => {}); }, SAMPLE_INTERVAL_MS);
})();
