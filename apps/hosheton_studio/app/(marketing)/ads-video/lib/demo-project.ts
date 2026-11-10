// ─────────────────────────────────────────────────────────────────────────────
// پروژه‌ی نمونه (دمو) — ۵ کات آماده برای آزمایش همه‌ی قابلیت‌های استودیو:
// موشن‌های نوآورانه‌ی متن، جاسازی عکس و ویدیو داخل موشن، موزیک و افکت صوتی
// (WebAudio سینک با تایم‌لاین — شنیدنی در پیش‌نمایش) و المان‌های قابل‌ویرایش.
// صداها در خروجی ffmpeg پخش نمی‌شوند؛ برای صدای واقعیِ خروجی از تب «صدا» یا
// چک‌باکس «تولید صدا» استفاده کنید.
// ─────────────────────────────────────────────────────────────────────────────

export interface DemoCutSpec {
    title: string;
    durationSeconds: number;
    html: string;
}

export const DEMO_PROJECT_TITLE = 'پروژه آزمایشی استودیو تبلیغات';
export const DEMO_PROJECT_ASPECT = '16:9';

/** اژان مشترک همه‌ی کات‌ها: ساعت، seek/pause/resume، صدا و ثبت المان‌ها */
const RUNTIME = `
var D = __DURATION__;
var t0 = performance.now();
var paused = false;
var pauseStart = 0;
var lastSeekT = -1;
var rafId = 0;
var audioState = { ctx: null, nodes: [] };

function ensureAudio() {
  if (!audioState.ctx) {
    try { audioState.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  var ac = audioState.ctx;
  if (ac && ac.state === 'suspended') ac.resume().catch(function () {});
  return ac;
}

function stopNodes() {
  audioState.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
  audioState.nodes = [];
}

function scheduleFrom(t) {
  var ac = audioState.ctx;
  if (!ac || ac.state !== 'running') return;
  stopNodes();
  (window.__adsSoundEvents || []).forEach(function (ev) {
    if (ev.at >= t - 0.02 && ev.at < D) {
      try { ev.make(ac, Math.max(0, ev.at - t), audioState.nodes); } catch (e) {}
    }
  });
}

window.__adsSeek = function (t) {
  var jumped = lastSeekT < 0 || Math.abs(t - lastSeekT) > 0.16;
  t0 = performance.now() - t * 1000;
  if (window.__adsRender) window.__adsRender(t);
  if (jumped) scheduleFrom(t);
  lastSeekT = t;
};

window.__adsPause = function () {
  if (paused) return;
  paused = true;
  pauseStart = performance.now();
  stopNodes();
  cancelAnimationFrame(rafId);
  if (audioState.ctx) audioState.ctx.suspend().catch(function () {});
};

window.__adsResume = function () {
  if (!paused) return;
  paused = false;
  t0 += performance.now() - pauseStart;
  if (audioState.ctx) audioState.ctx.resume().catch(function () {});
  rafId = requestAnimationFrame(loop);
};

// در حالت paused حلقه کامل متوقف می‌شود تا iframeهای غیرفعال CPU نگیرند
function loop() {
  if (paused) return;
  var t = Math.min(D, (performance.now() - t0) / 1000);
  if (window.__adsRender) window.__adsRender(t);
  rafId = requestAnimationFrame(loop);
}
if (window.__adsRender) window.__adsRender(0);
rafId = requestAnimationFrame(loop);

document.addEventListener('click', function () {
  ensureAudio();
  scheduleFrom(Math.min(D, (performance.now() - t0) / 1000));
});

`;

/** سازنده‌های صدای WebAudio (whoosh/ding/pop/نت موزیک) */
const AUDIO_HELPERS = `
function adsNoiseBuffer(ac) {
  if (!adsNoiseBuffer.buf) {
    var len = ac.sampleRate * 1.2;
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    adsNoiseBuffer.buf = buf;
  }
  return adsNoiseBuffer.buf;
}

function adsWhoosh(ac, at, dur, peak, nodes) {
  var src = ac.createBufferSource();
  src.buffer = adsNoiseBuffer(ac);
  var filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.1;
  var gain = ac.createGain();
  var t = ac.currentTime + at;
  filter.frequency.setValueAtTime(280, t);
  filter.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.7);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + dur * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter); filter.connect(gain); gain.connect(ac.destination);
  src.start(t); src.stop(t + dur + 0.05);
  nodes.push(src);
}

function adsDing(ac, at, freq, dur, peak, nodes) {
  var osc = ac.createOscillator();
  var gain = ac.createGain();
  var t = ac.currentTime + at;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain); gain.connect(ac.destination);
  osc.start(t); osc.stop(t + dur + 0.05);
  nodes.push(osc);
}

function adsPop(ac, at, peak, nodes) {
  var osc = ac.createOscillator();
  var gain = ac.createGain();
  var t = ac.currentTime + at;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
  gain.gain.setValueAtTime(peak, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(gain); gain.connect(ac.destination);
  osc.start(t); osc.stop(t + 0.2);
  nodes.push(osc);
}

function adsNote(ac, at, freq, dur, type, peak, nodes) {
  var osc = ac.createOscillator();
  var filter = ac.createBiquadFilter();
  var gain = ac.createGain();
  var t = ac.currentTime + at;
  osc.type = type || 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(filter); filter.connect(gain); gain.connect(ac.destination);
  osc.start(t); osc.stop(t + dur + 0.05);
  nodes.push(osc);
}
`;

const SHELL_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; overflow: hidden; background: #000; }
  body { font-family: Vazirmatn, Tahoma, 'Segoe UI', sans-serif; }
  #stage {
    position: relative; width: __W__px; height: __H__px; overflow: hidden;
    background: radial-gradient(120% 90% at 50% 0%, #1c2145 0%, #0f1226 55%, #090b18 100%);
    color: #fff; direction: rtl;
  }
  #fadeout { position: absolute; inset: 0; background: #090b18; opacity: 0; pointer-events: none; }
  #demoBadge {
    position: absolute; bottom: 14px; left: 16px; padding: 3px 10px; border-radius: 6px;
    background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4);
    font-size: 15px; letter-spacing: 2px; direction: ltr; z-index: 5;
  }
`;

function shell(duration: number, body: string, perCutCss: string, script: string, elements: string, soundEvents: string): string {
    return `<!doctype html>
<html dir="rtl"><head><meta charset="utf-8">
<style>${SHELL_CSS.replace('__W__', '1920').replace('__H__', '1080')}${perCutCss}</style></head>
<body>
<div id="stage">${body}<div id="fadeout"></div><div id="demoBadge">DEMO</div></div>
<script>
${AUDIO_HELPERS}
${script}
window.__adsElements = ${elements};
window.__adsSoundEvents = ${soundEvents};
window.__adsDuration = ${duration};
${RUNTIME.replace('__DURATION__', String(duration))}
</script>
</body></html>`;
}

/** محوِ آرام فریم آخر برای پیوستگی با کات بعدی */
const FADE_SNIPPET = `
  var fadeEl = document.getElementById('fadeout');
  var fade = Math.max(0, Math.min(1, (t - (D - 0.35)) / 0.35));
  fadeEl.style.opacity = fade;
`;

// ────────────────────────────── ۱) هوک تایپوگرافی کنتیک ──────────────────────────────

const CUT_TYPOGRAPHY = shell(
    6,
    `
  <div id="pulse"></div>
  <div id="words">
    <h1 id="w0">آماده‌ای؟</h1>
    <h1 id="w1">تخفیف ویژه</h1>
    <h1 id="w2">فقط ۳ روز!</h1>
  </div>
  <div id="bar"><i></i></div>
  `,
    `
  #pulse { position:absolute; inset:0; background: radial-gradient(60% 60% at 50% 45%, rgba(255,106,61,0.35), transparent 70%); opacity:0; }
  #words { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
  #words h1 {
    position:absolute; margin:0; font-size:150px; font-weight:900; opacity:0;
    background: linear-gradient(180deg, #ffffff 30%, #ffb199 100%);
    -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
    text-shadow: 0 30px 80px rgba(255,106,61,0.25); white-space:nowrap;
  }
  #bar { position:absolute; bottom:0; left:0; right:0; height:6px; background:rgba(255,255,255,0.08); }
  #bar i { display:block; height:100%; width:0; background:linear-gradient(90deg,#ff6a3d,#2ec4b6); }
  `,
    `
  var D = 6;
  var words = [document.getElementById('w0'), document.getElementById('w1'), document.getElementById('w2')];
  var pulse = document.getElementById('pulse');
  var barFill = document.querySelector('#bar i');

  window.__adsRender = function (t) {
    var slot = Math.min(2, Math.floor(t / 2));
    var local = t - slot * 2;
    words.forEach(function (el, i) {
      if (i !== slot) { el.style.opacity = '0'; return; }
      var inT = Math.min(1, local / 0.55);
      var outT = Math.max(0, (local - 1.62) / 0.38);
      var ease = 1 - Math.pow(1 - inT, 3);
      var dir = i % 2 === 0 ? 1 : -1;
      el.style.opacity = String(Math.max(0, (inT > 0 ? 1 : 0) * (1 - outT)));
      el.style.transform =
        'translateY(' + ((1 - ease) * 90 - outT * 70) + 'px)' +
        ' rotate(' + ((1 - ease) * 7 * dir - outT * 5 * dir) + 'deg)' +
        ' scale(' + (0.82 + ease * 0.18 + outT * 0.12) + ')';
      el.style.filter = 'blur(' + ((1 - ease) * 10 + outT * 8) + 'px)';
    });
    pulse.style.opacity = String(Math.max(0, 1 - local / 0.45) * 0.9);
    barFill.style.width = (t / D) * 100 + '%';
    ${FADE_SNIPPET}
  };
  `,
    `[
    { id:'word1', el:document.getElementById('w0'), label:'کلمه اول', type:'text', value:'آماده‌ای؟', apply:function(v){ document.getElementById('w0').textContent = String(v); } },
    { id:'word2', el:document.getElementById('w1'), label:'کلمه دوم', type:'text', value:'تخفیف ویژه', apply:function(v){ document.getElementById('w1').textContent = String(v); } },
    { id:'word3', el:document.getElementById('w2'), label:'کلمه سوم', type:'text', value:'فقط ۳ روز!', apply:function(v){ document.getElementById('w2').textContent = String(v); } }
  ]`,
    `[
    { at: 0.02, make: function(ac, when, nodes){ adsWhoosh(ac, when, 0.5, 0.5, nodes); } },
    { at: 2.02, make: function(ac, when, nodes){ adsWhoosh(ac, when, 0.45, 0.55, nodes); adsDing(ac, when + 0.2, 660, 0.5, 0.25, nodes); } },
    { at: 4.02, make: function(ac, when, nodes){ adsWhoosh(ac, when, 0.4, 0.6, nodes); adsPop(ac, when + 0.25, 0.5, nodes); } }
  ]`,
);

// ────────────────────────────── ۲) عکس و ویدیو داخل موشن ──────────────────────────────

const CUT_MEDIA = shell(
    7,
    `
  <h1 id="head">محصول ما، در حرکت</h1>
  <div id="videoCard"><div id="videoFall"></div><video id="vid" src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" muted playsinline></video><span id="vidTag">ویدیوی واقعی داخل موشن</span></div>
  <div id="imgCard"><div id="imgFall"><img id="pic" src="https://picsum.photos/seed/hosheton-ad/900/700" alt="" /></div><span id="imgTag">عکس با حرکت پارالاکس</span></div>
  <p id="cap">هر دو، قابل تعویض از تب «المان‌ها»</p>
  `,
    `
  #head { position:absolute; top:70px; right:80px; margin:0; font-size:64px; font-weight:900; opacity:0; }
  #videoCard, #imgCard { position:absolute; top:200px; width:800px; height:560px; border-radius:26px; overflow:hidden;
    box-shadow: 0 40px 90px rgba(0,0,0,0.5); outline:1px solid rgba(255,255,255,0.14); }
  #videoCard { right:80px; }
  #imgCard { left:80px; }
  #videoCard video, #imgCard img { width:100%; height:100%; object-fit:cover; display:block; }
  #videoFall, #imgFall { width:100%; height:100%; }
  #videoCard video { transform: scale(1.1); }
  #vidTag, #imgTag {
    position:absolute; bottom:16px; inset-inline-start:16px; padding:6px 14px; border-radius:8px;
    background:rgba(9,11,24,0.65); font-size:22px; backdrop-filter:blur(4px);
  }
  #cap { position:absolute; bottom:70px; right:0; left:0; text-align:center; font-size:30px; color:rgba(255,255,255,0.75); opacity:0; }
  `,
    `
  var D = 7;
  var head = document.getElementById('head');
  var videoCard = document.getElementById('videoCard');
  var imgFall = document.getElementById('imgFall');
  var vid = document.getElementById('vid');
  var cap = document.getElementById('cap');
  var vidReady = false;
  var lastVidSync = 0;
  vid.addEventListener('loadedmetadata', function () { vidReady = true; vid.muted = true; });
  vid.play().catch(function () {});

  window.__adsRender = function (t) {
    var headIn = Math.min(1, t / 0.7);
    head.style.opacity = String(headIn);
    head.style.transform = 'translateX(' + (1 - headIn) * 60 + 'px)';
    head.style.filter = 'blur(' + (1 - headIn) * 6 + 'px)';

    // کنِ برنز روی ویدیو + چرخش خیلی نرم
    var kb = 1.1 + Math.min(0.14, t * 0.02);
    videoCard.style.transform = 'rotate(' + (Math.sin(t * 0.7) * 1.2) + 'deg) scale(' + (0.94 + Math.min(1, t / 2.5) * 0.06) + ')';
    vid.style.transform = 'scale(' + kb + ')';

    // پارالاکس شناور عکس
    imgFall.style.transform = 'translateY(' + (Math.sin(t * 1.4) * 16) + 'px) scale(' + (1.06 + Math.sin(t * 0.9) * 0.03) + ')';

    var capIn = Math.max(0, Math.min(1, (t - 3.2) / 0.6));
    cap.style.opacity = String(capIn);
    cap.style.transform = 'translateY(' + (1 - capIn) * 30 + 'px)';

    // سینک ویدیو — حداکثر هر ۴۰۰ms و فقط با خطای فاز قابل توجه (جلوگیری از رگبار seek)
    if (vidReady && vid.duration && performance.now() - lastVidSync > 400) {
      var target = t % Math.max(1, vid.duration - 0.1);
      if (Math.abs(vid.currentTime - target) > 0.35) {
        vid.currentTime = target;
        lastVidSync = performance.now();
      }
    }
    ${FADE_SNIPPET}
  };
  `,
    `[
    { id:'title', el:document.getElementById('beat'), el:document.getElementById('head'), label:'تیتر', type:'text', value:'محصول ما، در حرکت', apply:function(v){ document.getElementById('head').textContent = String(v); } },
    { id:'videoSrc', el:document.getElementById('vid'), label:'ویدیوی محصول', type:'image', value:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', apply:function(v){ document.getElementById('vid').src = String(v); } },
    { id:'imageSrc', el:document.getElementById('pic'), label:'عکس محصول', type:'image', value:'https://picsum.photos/seed/hosheton-ad/900/700', apply:function(v){ document.getElementById('pic').src = String(v); } },
    { id:'caption', el:document.getElementById('cap'), label:'زیرنویس', type:'text', value:'هر دو، قابل تعویض از تب «المان‌ها»', apply:function(v){ document.getElementById('cap').textContent = String(v); } }
  ]`,
    `[
    { at: 0.1, make: function(ac, when, nodes){ adsWhoosh(ac, when, 0.6, 0.35, nodes); } },
    { at: 3.3, make: function(ac, when, nodes){ adsDing(ac, when, 880, 0.4, 0.2, nodes); } }
  ]`,
);

// ────────────────────────────── ۳) شمارنده و آمار ──────────────────────────────

const CUT_COUNTER = shell(
    6,
    `
  <div id="wrap">
    <svg id="ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="86" /><circle id="ringFill" cx="100" cy="100" r="86" /></svg>
    <div id="center"><b id="num">۰٪</b><span id="numLabel">رضایت مشتری</span></div>
  </div>
  <div id="side">
    <div class="stat"><b id="users">۰</b><span>کاربر جدید</span></div>
    <div class="barRow"><i id="bar1"></i></div>
    <div class="barRow"><i id="bar2"></i></div>
    <div class="barRow"><i id="bar3"></i></div>
  </div>
  `,
    `
  #wrap { position:absolute; top:50%; right:220px; transform:translateY(-50%); width:460px; height:460px; }
  #ring { width:100%; height:100%; transform:rotate(-90deg); }
  #ring circle { fill:none; stroke-width:14; }
  #ring circle:first-child { stroke:rgba(255,255,255,0.08); }
  #ringFill { stroke:#ff6a3d; stroke-linecap:round; stroke-dasharray:540; stroke-dashoffset:540; }
  #center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; }
  #num { font-size:96px; font-weight:900; }
  #numLabel { font-size:30px; color:rgba(255,255,255,0.65); }
  #side { position:absolute; left:200px; top:50%; transform:translateY(-50%); width:640px; display:flex; flex-direction:column; gap:34px; }
  .stat b { font-size:80px; font-weight:900; color:#2ec4b6; display:block; }
  .stat span { font-size:28px; color:rgba(255,255,255,0.65); }
  .barRow { height:22px; border-radius:11px; background:rgba(255,255,255,0.08); overflow:hidden; }
  .barRow i { display:block; height:100%; width:0; border-radius:11px; background:linear-gradient(90deg,#2ec4b6,#ff6a3d); }
  `,
    `
  var D = 6;
  var numEl = document.getElementById('num');
  var usersEl = document.getElementById('users');
  var ring = document.getElementById('ringFill');
  var bars = [document.getElementById('bar1'), document.getElementById('bar2'), document.getElementById('bar3')];
  var TARGET = 98, USERS = 2400, TARGET_REF = TARGET;

  function faNum(n) { return Math.round(n).toLocaleString('fa-IR'); }
  window.__adsSetTarget = function (v) { TARGET_REF = v; };

  window.__adsRender = function (t) {
    var p = Math.min(1, t / 2.6);
    var eased = 1 - Math.pow(1 - p, 3);
    numEl.textContent = faNum(eased * TARGET_REF) + '٪';
    usersEl.textContent = faNum(eased * USERS);
    ring.style.strokeDashoffset = String(540 - 540 * eased);
    bars.forEach(function (bar, i) {
      var bp = Math.max(0, Math.min(1, (t - 0.5 - i * 0.35) / 0.9));
      bar.style.width = (Math.pow(1 - Math.pow(1 - bp, 3), 1) * (88 - i * 22)) + '%';
    });
    ${FADE_SNIPPET}
  };
  `,
    `[
    { id:'target', el:document.getElementById('num'), label:'درصد هدف', type:'number', value:98, apply:function(v){ window.__adsSetTarget(Number(v) || 0); } },
    { id:'label', el:document.getElementById('numLabel'), label:'برچسب شمارنده', type:'text', value:'رضایت مشتری', apply:function(v){ document.getElementById('numLabel').textContent = String(v); } },
    { id:'accent', el:document.getElementById('ringFill'), label:'رنگ حلقه', type:'color', value:'#ff6a3d', apply:function(v){ document.getElementById('ringFill').style.stroke = String(v); } }
  ]`,
    `[
    { at: 2.62, make: function(ac, when, nodes){ adsDing(ac, when, 990, 0.5, 0.3, nodes); adsDing(ac, when + 0.09, 1320, 0.6, 0.2, nodes); } },
    { at: 3.35, make: function(ac, when, nodes){ adsPop(ac, when, 0.4, nodes); } },
    { at: 4.05, make: function(ac, when, nodes){ adsPop(ac, when, 0.4, nodes); } }
  ]`,
);

// ────────────────────────────── ۴) موزیک + ویژوالایزر ──────────────────────────────

const CUT_MUSIC = shell(
    6,
    `
  <div id="bars"></div>
  <h1 id="beat">روحِ آهنگ، در تصویر</h1>
  <div id="hint">🔊 برای شنیدن موزیک، روی تصویر کلیک کن</div>
  `,
    `
  #bars { position:absolute; inset:auto 0 0 0; height:520px; display:flex; align-items:flex-end; justify-content:center; gap:10px; padding:0 60px; }
  #bars i { flex:1; max-width:26px; height:10%; border-radius:8px 8px 0 0; background:linear-gradient(180deg,#ff6a3d,#2ec4b6); opacity:0.85; }
  #beat { position:absolute; top:170px; right:0; left:0; margin:0; text-align:center; font-size:84px; font-weight:900; }
  #hint { position:absolute; top:300px; right:0; left:0; text-align:center; font-size:26px; color:rgba(255,255,255,0.55); }
  `,
    `
  var D = 6;
  var barsWrap = document.getElementById('bars');
  var BAR_COUNT = 42;
  var bars = [];
  for (var i = 0; i < BAR_COUNT; i++) {
    var b = document.createElement('i');
    barsWrap.appendChild(b);
    bars.push(b);
  }
  var beat = document.getElementById('beat');
  var hint = document.getElementById('hint');
  document.addEventListener('click', function () { hint.style.opacity = '0.25'; });

  // آرپژ پنتاتونیک + بیس — هر نت یک event زمان‌بندی‌شده
  var SCALE = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
  var events = [];
  for (var s = 0; s < D; s += 0.25) {
    events.push({ at: s, make: function (ac, when, nodes) {
      var idx = Math.floor(Math.random() * 100) % SCALE.length;
      adsNote(ac, when, SCALE[idx], 0.34, 'triangle', 0.16, nodes);
    } });
  }
  for (var b2 = 0; b2 < D; b2 += 1) {
    events.push({ at: b2, make: function (ac, when, nodes) {
      adsNote(ac, when, 110, 0.9, 'sawtooth', 0.12, nodes);
    } });
  }

  window.__adsRender = function (t) {
    bars.forEach(function (bar, i) {
      var v = Math.abs(Math.sin(t * 3.1 + i * 0.55) * Math.cos(t * 1.3 + i * 0.21));
      bar.style.height = (12 + v * 82) + '%';
      bar.style.opacity = String(0.55 + v * 0.45);
    });
    var pulse = 1 + Math.max(0, Math.sin(t * Math.PI * 2)) * 0.035;
    beat.style.transform = 'scale(' + pulse + ')';
    ${FADE_SNIPPET}
  };
  `,
    `[
    { id:'title', label:'تیتر', type:'text', value:'روحِ آهنگ، در تصویر', apply:function(v){ document.getElementById('beat').textContent = String(v); } },
    { id:'tint', el:document.getElementById('bars'), label:'رنگ موج‌ها', type:'color', value:'#ff6a3d', apply:function(v){ var list = document.querySelectorAll('#bars i'); Array.prototype.forEach.call(list, function (el) { el.style.background = 'linear-gradient(180deg,' + String(v) + ',#2ec4b6)'; }); } },
    { id:'hint', el:document.getElementById('hint'), label:'راهنمای صدا', type:'text', value:'🔊 برای شنیدن موزیک، روی تصویر کلیک کن', apply:function(v){ document.getElementById('hint').textContent = String(v); } }
  ]`,
    `(typeof events !== 'undefined' ? events : [])`,
);

// ────────────────────────────── ۵) CTA با کانفتی ──────────────────────────────

const CUT_CTA = shell(
    5,
    `
  <div id="confetti"></div>
  <div id="ctaWrap">
    <h1 id="cta">همین حالا شروع کن</h1>
    <div id="btn"><span id="btnText">سفارش آنلاین</span></div>
  </div>
  `,
    `
  #ctaWrap { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:60px; }
  #cta { margin:0; font-size:130px; font-weight:900; opacity:0;
    background:linear-gradient(180deg,#fff,#ffb199); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  #btn { padding:26px 90px; border-radius:60px; font-size:44px; font-weight:800; color:#0f1226;
    background:linear-gradient(135deg,#ff6a3d,#ffb199); box-shadow:0 24px 60px rgba(255,106,61,0.4); opacity:0; }
  #confetti { position:absolute; inset:0; overflow:hidden; }
  #confetti i { position:absolute; width:16px; height:26px; border-radius:4px; opacity:0; }
  `,
    `
  var D = 5;
  var cta = document.getElementById('cta');
  var btn = document.getElementById('btn');
  var confetti = document.getElementById('confetti');
  var COLORS = ['#ff6a3d', '#2ec4b6', '#ffd166', '#ef476f', '#ffffff'];
  var parts = [];
  for (var i = 0; i < 64; i++) {
    var p = document.createElement('i');
    p.style.background = COLORS[i % COLORS.length];
    confetti.appendChild(p);
    parts.push({
      el: p,
      x: (i * 137.5) % 100,
      delay: (i % 11) * 0.22,
      speed: 1.4 + ((i * 7) % 10) / 8,
      drift: (((i * 31) % 10) - 5) * 22,
      rot: ((i * 53) % 360),
    });
  }

  window.__adsRender = function (t) {
    var inT = Math.min(1, t / 0.55);
    var spring = 1 + Math.sin(Math.min(1, t / 0.55) * Math.PI) * 0.12;
    cta.style.opacity = String(inT);
    cta.style.transform = 'scale(' + (0.6 + inT * 0.4) * spring + ')';

    var btnIn = Math.max(0, Math.min(1, (t - 0.5) / 0.5));
    var beat = 1 + Math.sin(Math.max(0, t - 1) * 4) * 0.03;
    btn.style.opacity = String(btnIn);
    btn.style.transform = 'translateY(' + (1 - btnIn) * 40 + 'px) scale(' + beat + ')';

    parts.forEach(function (part) {
      var local = t - part.delay - 0.6;
      if (local <= 0 || local > 2.6) { part.el.style.opacity = '0'; return; }
      var fall = Math.pow(local / 2.6, 1.4) * 1100;
      part.el.style.opacity = String(Math.max(0, 1 - local / 2.6));
      part.el.style.transform =
        'translate(' + (part.x / 100 * 1920 + Math.sin(local * part.speed) * part.drift) + 'px,' + (fall - 200) + 'px)' +
        ' rotate(' + (part.rot + local * 340) + 'deg)';
    });
    ${FADE_SNIPPET}
  };
  `,
    `[
    { id:'cta', el:document.getElementById('cta'), label:'متن CTA', type:'text', value:'همین حالا شروع کن', apply:function(v){ document.getElementById('cta').textContent = String(v); } },
    { id:'btnText', el:document.getElementById('btnText'), label:'متن دکمه', type:'text', value:'سفارش آنلاین', apply:function(v){ document.getElementById('btnText').textContent = String(v); } },
    { id:'btnColor', el:document.getElementById('btn'), label:'رنگ دکمه', type:'color', value:'#ff6a3d', apply:function(v){ document.getElementById('btn').style.background = 'linear-gradient(135deg,' + String(v) + ',#ffb199)'; } }
  ]`,
    `[
    { at: 0.05, make: function(ac, when, nodes){ adsWhoosh(ac, when, 0.5, 0.5, nodes); } },
    { at: 0.65, make: function(ac, when, nodes){ adsPop(ac, when, 0.5, nodes); adsDing(ac, when + 0.05, 740, 0.4, 0.22, nodes); } },
    { at: 2.4, make: function(ac, when, nodes){ adsPop(ac, when, 0.45, nodes); } }
  ]`,
);

/** همه‌ی کات‌های پروژه‌ی نمونه — به ترتیب پخش */
export function buildDemoCuts(): DemoCutSpec[] {
    return [
        { title: 'هوک — تایپوگرافی کنتیک', durationSeconds: 6, html: CUT_TYPOGRAPHY },
        { title: 'محصول — عکس و ویدیو', durationSeconds: 7, html: CUT_MEDIA },
        { title: 'آمار — شمارنده و نمودار', durationSeconds: 6, html: CUT_COUNTER },
        { title: 'موزیک — ویژوالایزر صوتی', durationSeconds: 6, html: CUT_MUSIC },
        { title: 'CTA — کانفتی و دکمه', durationSeconds: 5, html: CUT_CTA },
    ];
}
