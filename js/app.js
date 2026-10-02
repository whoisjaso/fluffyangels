/* ============================================================
   Fluffy Angels — site behaviour
   No dependencies. Sounds are synthesised with Web Audio (no files).
   Set window.FA_CONFIG = { waitlistEndpoint: 'https://…' } before this
   script to POST sign-ups somewhere real.
   ============================================================ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CONFIG = Object.assign({ waitlistEndpoint: '' }, window.FA_CONFIG);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

const store = {
  get(k, d) { try { const v = localStorage.getItem('fa_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('fa_' + k, JSON.stringify(v)); } catch {} }
};

/* ------------------------------------------------------------
   DATA
   ------------------------------------------------------------ */
const BEN = {
  heart:  { c: '#ff3b6b', t: 'Heart' },
  drop:   { c: '#3b9eff', t: 'Hydrate' },
  bolt:   { c: '#ffb300', t: 'Energy' },
  shield: { c: '#8b5cf6', t: 'Boost' },
  sun:    { c: '#ff9f43', t: 'Glow' },
  leaf:   { c: '#27b27a', t: 'Tummy' },
  spark:  { c: '#ff5fa2', t: 'Sparkle' }
};

const FLAVORS = [
  { id: 'straw',  name: 'Strawberry',            c: '#ff3b6b', img: 'assets/bottle-0.jpg', ben: ['heart', 'shield'], r: 1 },
  { id: 'mango',  name: 'Mango',                 c: '#ff9f43', img: 'assets/bottle-1.jpg', ben: ['sun', 'shield'],   r: 1 },
  { id: 'melon',  name: 'Watermelon Pomegranate', c: '#ff2f6d', img: 'assets/bottle-2.jpg', ben: ['heart', 'drop'],   r: 3 },
  { id: 'peach',  name: 'Peach Ginger Guava',    c: '#ff8a3d', img: 'assets/bottle-3.jpg', ben: ['leaf', 'shield'],  r: 3 },
  { id: 'cuke',   name: 'Cucumber Mint',         c: '#27b27a', img: 'assets/bottle-4.jpg', ben: ['drop', 'leaf'],    r: 2 },
  { id: 'jala',   name: 'Pineapple Jalapeño',    c: '#a8c800', img: 'assets/bottle-5.jpg', ben: ['bolt', 'leaf'],    r: 3 },
  { id: 'cherry', name: 'Cherry',                c: '#e5173f', img: 'assets/big-0.jpg',    ben: ['heart', 'spark'],  r: 1 },
  { id: 'blue',   name: 'Blue Raspberry',        c: '#2f7bff', img: 'assets/big-1.jpg',    ben: ['spark', 'shield'], r: 1 },
  { id: 'pine',   name: 'Pineapple',             c: '#ffc400', img: 'assets/big-2.jpg',    ben: ['sun', 'leaf'],     r: 1 },
  { id: 'lime',   name: 'Lime',                  c: '#3dbb2f', img: 'assets/big-3.jpg',    ben: ['shield', 'drop'],  r: 1 },
  { id: 'dragon', name: 'Dragon Fruit',          c: '#ff3fa4', orb: 'dragon', isNew: true, ben: ['spark', 'leaf'],   r: 4 },
  { id: 'secret', name: 'Secret Drop',           c: '#8b5cf6', lock: true, ben: [], r: 4 }
];

const PACKS = [
  { id: 'cherry', c1: '#ff5b7f', c2: '#d41c47', em: '🍒' },
  { id: 'blue',   c1: '#5b97ff', c2: '#2457d6', em: '🫐' },
  { id: 'pine',   c1: '#ffdc5c', c2: '#e0a800', em: '🍍' },
  { id: 'lime',   c1: '#7fe04a', c2: '#3da516', em: '🍏' },
  { id: 'dragon', c1: '#ff5fd0', c2: '#b8179a', em: '🐲' },
  { id: 'mango',  c1: '#ffb35c', c2: '#e0731a', em: '🥭' }
];

const CARDS = [
  { id: 'cherry', em: '🍒', name: 'Cherry Cloud',  t: 1 },
  { id: 'lime',   em: '🍏', name: 'Lime Lift',     t: 1 },
  { id: 'berry',  em: '🫐', name: 'Berry Bop',     t: 1 },
  { id: 'pine',   em: '🍍', name: 'Sunny Pine',    t: 1 },
  { id: 'straw',  em: '🍓', name: 'Berry Sky',     t: 1 },
  { id: 'mango',  em: '🥭', name: 'Mango Mellow',  t: 2 },
  { id: 'peach',  em: '🍑', name: 'Peach Spark',   t: 2 },
  { id: 'mint',   em: '🌿', name: 'Mint Wink',     t: 2 },
  { id: 'melon',  em: '🍉', name: 'Melon Wing',    t: 3 },
  { id: 'fly',    em: '🦋', name: 'Guava Glow',    t: 3 },
  { id: 'dragon', em: '🐉', name: 'Dragon Dazzle', t: 4 },
  { id: 'halo',   em: '😇', name: 'Golden Halo',   t: 4 }
];
const TIER_W = { 1: 60, 2: 25, 3: 11, 4: 4 };

/* ------------------------------------------------------------
   AUDIO — tiny synth, starts only after the first tap
   ------------------------------------------------------------ */
const Sound = (() => {
  let ctx, master, noiseBuf, musicTimer, step = 0;
  let on = store.get('sound', true);
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = on ? 1 : 0;
    master.connect(ctx.destination);
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  function tone(f, { t = 0, d = .2, type = 'sine', v = .2, to = null, bell = false } = {}) {
    if (!ctx || !on) return;
    const t0 = ctx.currentTime + t;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + .015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + d + .05);
    if (bell) {
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type = 'sine'; o2.frequency.value = f * 2.76;
      g2.gain.setValueAtTime(v * .35, t0); g2.gain.exponentialRampToValueAtTime(0.0001, t0 + d * .5);
      o2.connect(g2); g2.connect(master); o2.start(t0); o2.stop(t0 + d);
    }
  }
  function noise({ t = 0, d = .1, f = 1500, q = 1, type = 'bandpass', v = .2, to = null } = {}) {
    if (!ctx || !on) return;
    const t0 = ctx.currentTime + t;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t0);
    if (to) flt.frequency.exponentialRampToValueAtTime(to, t0 + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + .01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    s.connect(flt); flt.connect(g); g.connect(master);
    s.start(t0, Math.random() * .5); s.stop(t0 + d + .05);
  }

  const sfx = {
    tick()   { tone(880, { d: .06, v: .05, type: 'triangle' }); },
    pop()    { tone(700, { d: .12, v: .22, to: 220 }); },
    boing()  { tone(180, { d: .5, v: .25, to: 520, type: 'triangle' }); tone(520, { t: .25, d: .3, v: .15, to: 200, type: 'triangle' }); },
    whoosh() { noise({ d: .7, f: 300, to: 3500, q: .8, v: .28 }); },
    squirt() { noise({ d: .09, f: rand(1100, 1700), to: rand(2200, 3200), q: 3, v: .16 }); },
    crunch() { noise({ d: .07, f: 3200, type: 'highpass', v: .3 }); noise({ t: .06, d: .09, f: 2400, type: 'highpass', v: .22 }); tone(140, { d: .1, v: .18, to: 70 }); },
    poof()   { noise({ d: .35, f: 900, to: 200, type: 'lowpass', v: .3 }); sfx.sparkle(); },
    shake()  { for (let i = 0; i < 6; i++) noise({ t: i * .07, d: .05, f: 5000, type: 'highpass', v: .1 }); },
    tear()   { noise({ d: .35, f: 1200, to: 5000, q: 1.5, v: .25 }); },
    sad()    { tone(330, { d: .35, v: .16, to: 300, type: 'triangle' }); tone(262, { t: .3, d: .5, v: .16, to: 190, type: 'triangle' }); },
    sparkle(n = 5, base = 880) {
      for (let i = 0; i < n; i++) tone(base * Math.pow(1.26, i), { t: i * .06, d: .35, v: .1, bell: true });
    },
    chime(t) {
      const seq = { 1: [660, 784], 2: [660, 784, 988], 3: [523, 659, 784, 1046], 4: [523, 659, 784, 1046, 1319, 1568] }[t] || [660];
      seq.forEach((f, i) => tone(f, { t: i * .09, d: .5, v: .16, bell: true, type: 'triangle' }));
      if (t >= 3) for (let i = 0; i < 8; i++) tone(rand(1800, 3200), { t: .3 + i * .05, d: .3, v: .04, bell: true });
    },
    fanfare() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, { t: i * .1, d: .35, v: .16, type: 'triangle', bell: true }));
      [784, 1046, 1319].forEach(f => tone(f, { t: .45, d: .9, v: .1, bell: true }));
    },
    on() { sfx.sparkle(3, 660); }
  };

  function startMusic() {
    if (!ctx || musicTimer) return;
    let idx = 2;
    musicTimer = setInterval(() => {
      if (!on || document.hidden) return;
      idx = clamp(idx + pick([-2, -1, -1, 0, 1, 1, 2]), 0, SCALE.length - 1);
      if (step % 2 === 0 || Math.random() > .35) tone(SCALE[idx], { d: .9, v: .035, bell: true });
      if (step % 8 === 0) tone([261.6, 220, 196, 233][(step / 8) % 4], { d: 2.2, v: .05, type: 'triangle' });
      step++;
    }, 380);
  }
  function set(v) {
    on = v; store.set('sound', v);
    if (master) master.gain.value = v ? 1 : 0;
    if (v) { init(); startMusic(); }
  }
  return { init, startMusic, set, get on() { return on; }, sfx };
})();
const sfx = new Proxy(Sound.sfx, { get: (t, k) => t[k] || (() => {}) });

/* ------------------------------------------------------------
   CONFETTI / SPARKLES  (one canvas, only animates while needed)
   ------------------------------------------------------------ */
const FX = (() => {
  const cv = $('#fx'), c = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, parts = [], raf = 0;
  const COLORS = ['#ff5fa2', '#ffd23f', '#3ddc97', '#3b82f6', '#8b5cf6', '#ff9f43', '#fff'];
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();

  function star(x, y, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  }
  function heart(x, y, r) {
    c.beginPath();
    c.moveTo(x, y + r * .9);
    c.bezierCurveTo(x - r * 1.6, y - r * .1, x - r * .7, y - r * 1.2, x, y - r * .35);
    c.bezierCurveTo(x + r * .7, y - r * 1.2, x + r * 1.6, y - r * .1, x, y + r * .9);
    c.fill();
  }
  function frame() {
    c.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.life > 0 && p.y < H + 40);
    for (const p of parts) {
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      c.save();
      c.globalAlpha = clamp(p.life / 22, 0, 1);
      c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col;
      if (p.shape === 'star') star(0, 0, p.s);
      else if (p.shape === 'heart') heart(0, 0, p.s * .8);
      else if (p.shape === 'rect') c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6);
      else { c.beginPath(); c.arc(0, 0, p.s * .5, 0, 7); c.fill(); }
      c.restore();
    }
    raf = parts.length ? requestAnimationFrame(frame) : (c.clearRect(0, 0, W, H), 0);
  }
  function burst(x, y, n = 40, o = {}) {
    if (reduce) n = Math.min(n, 8);
    const cols = o.colors || COLORS, sp = o.speed || 9;
    for (let i = 0; i < n; i++) {
      const a = o.up ? rand(-Math.PI * .9, -Math.PI * .1) : rand(0, Math.PI * 2), v = rand(sp * .35, sp);
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up ? 2 : 0), g: o.g ?? .28, drag: .985,
        rot: rand(0, 6), vr: rand(-.25, .25), s: rand(8, 18) * (o.size || 1),
        col: pick(cols), shape: pick(o.shapes || ['star', 'heart', 'circle', 'rect']),
        life: Math.round(rand(55, 100))
      });
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function rain(n = 80) {
    for (let i = 0; i < n; i++) setTimeout(() => burst(rand(0, W), -10, 1, { speed: 2, g: .12, size: 1.1 }), i * 14);
  }
  return { burst, rain, W: () => W, H: () => H };
})();
const burstAt = (el, n, o) => {
  const r = el.getBoundingClientRect();
  FX.burst(r.left + r.width / 2, r.top + r.height / 2, n, o);
};

// sparkle trail (mouse only, kid mode)
let lastTrail = 0;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || document.body.dataset.mode !== 'kid' || reduce) return;
  const n = performance.now();
  if (n - lastTrail < 60 || document.body.classList.contains('locked')) return;
  lastTrail = n;
  FX.burst(e.clientX, e.clientY, 1, { speed: 1.4, g: .05, size: .55, shapes: ['star'] });
}, { passive: true });

/* ------------------------------------------------------------
   TOAST
   ------------------------------------------------------------ */
const toastEl = $('#toast'); let toastT;
function toast(msg, ms = 2200) {
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), ms);
}

/* ------------------------------------------------------------
   SHARED SVG: the cone
   ------------------------------------------------------------ */
const DOME = 'M34 152C22 96 54 40 100 38c46 2 78 58 66 114z';
let coneN = 0;
function coneSVG({ kind }) {
  const id = 'cn' + (coneN++);
  let crystals = '', puffs = '';
  if (kind === 'ice') {
    let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 90; i++) {
      const x = 28 + r() * 144, y = 40 + r() * 112, w = 5 + r() * 8;
      crystals += `<path d="M${x} ${y}l${w} ${w * .4}l${-w * .4} ${w}z" fill="${r() > .5 ? '#c4d2e6' : '#f4f8ff'}" opacity=".85"/>`;
    }
  }
  if (kind === 'fluff') {
    [[60, 120, 22], [96, 128, 24], [140, 120, 22], [76, 92, 22], [118, 92, 22], [100, 62, 22], [52, 146, 16], [150, 146, 16]]
      .forEach(([x, y, r]) => { puffs += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".42"/>`; });
  }
  if (kind === 'play') {
    [[62, 122, 20], [100, 130, 22], [138, 122, 20], [78, 94, 20], [120, 94, 20], [100, 64, 20]]
      .forEach(([x, y, r]) => { puffs += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".5" stroke="#cfe0f5" stroke-width="2"/>`; });
  }
  const body = kind === 'ice' ? '#dbe5f2' : kind === 'play' ? '#eaf3ff' : '#fff';
  return `<svg viewBox="0 0 200 280" data-id="${id}" role="img" aria-hidden="true">
    <defs>
      <clipPath id="${id}-d"><path d="${DOME}"/></clipPath>
      <mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="280">
        <rect width="200" height="280" fill="#fff"/>
        <g class="eat" style="transform:translateY(0);transition:transform .45s cubic-bezier(.34,1.56,.64,1)" fill="#000">
          <rect x="-10" y="-300" width="220" height="300"/>
          ${[10, 42, 74, 106, 138, 170].map((x, i) => `<circle cx="${x + (i % 2 ? 8 : -4)}" cy="${i % 2 ? 6 : 0}" r="19"/>`).join('')}
        </g>
      </mask>
      <linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="0" y1="38" x2="0" y2="152">
        ${kind === 'ice'
          ? '<stop offset="0" stop-color="#ff3b6b" stop-opacity="1"/><stop offset=".35" stop-color="#ff3b6b" stop-opacity=".6"/><stop offset=".7" stop-color="#ff3b6b" stop-opacity=".08"/><stop offset="1" stop-color="#ff3b6b" stop-opacity="0"/>'
          : '<stop offset="0" stop-color="#ff5b7f"/><stop offset=".5" stop-color="#ff3b6b"/><stop offset="1" stop-color="#ff4d85"/>'}
      </linearGradient>
    </defs>
    <path d="M52 150h96l-16 108q-2 14-16 14H84q-14 0-16-14z" fill="#fff" stroke="#e7d9ff" stroke-width="5" stroke-linejoin="round"/>
    <path d="M62 178h76M68 204h64M74 230h52" stroke="#ffc4de" stroke-width="7" stroke-linecap="round"/>
    <g mask="url(#${id}-m)">
      <g clip-path="url(#${id}-d)">
        <rect x="0" y="30" width="200" height="130" fill="${body}"/>
        ${crystals}
        ${kind === 'play' ? '<g class="layers"></g>' : `<rect x="0" y="30" width="200" height="130" fill="url(#${id}-g)"/>`}
        ${puffs}
      </g>
      <path d="${DOME}" fill="none" stroke="${kind === 'ice' ? '#b9c7dc' : kind === 'play' ? '#b8d2f2' : '#fff'}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="40" y="148" width="120" height="10" rx="5" fill="${kind === 'ice' ? '#cdd8e7' : '#fff'}" />
    </g>
  </svg>`;
}

/* ------------------------------------------------------------
   GATE  (loader → pick who you are → enter)
   ------------------------------------------------------------ */
const body = document.body, gate = $('#gate');
let entered = false;

function setMode(m, { silent, save = true } = {}) {
  body.dataset.mode = m; if (save) store.set('mode', m);
  $$('.who-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.who === m)));
  renderFlavorDetail(); renderBook();
  if (!silent) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

function runLoader() {
  const bar = $('#loaderBar'), fill = $('#loaderFill'), btn = $('#startBtn');
  const dur = reduce ? 200 : 2400, t0 = performance.now();
  (function step(now) {
    const p = clamp((now - t0) / dur, 0, 1);
    bar.style.width = (p * 100) + '%';
    fill.setAttribute('y', 90 - 80 * p);
    if (p < 1) return requestAnimationFrame(step);
    btn.disabled = false; btn.focus({ preventScroll: true });
  })(t0);
}

$('#startBtn').addEventListener('click', () => {
  Sound.init(); sfx.whoosh();
  const saved = store.get('mode', null);
  $('#loader').hidden = true;
  if (saved === 'kid' || saved === 'parent') return enter(saved);
  $('#choose').hidden = false;
  $('#choose .choice').focus({ preventScroll: true });
  sfx.sparkle(4, 660);
});

$$('.choice').forEach(b => b.addEventListener('click', () => {
  sfx.boing(); buzz(20);
  burstAt(b, 50);
  setTimeout(() => enter(b.dataset.pick), 380);
}));

function enter(mode) {
  if (entered) return; entered = true;
  setMode(mode, { silent: true });
  sfx.fanfare(); Sound.startMusic();
  gate.classList.add('leave');
  body.classList.remove('locked');
  window.scrollTo(0, 0);
  setTimeout(() => FX.burst(FX.W() / 2, FX.H() * .45, 60, { speed: 12 }), 500);
  setTimeout(() => { gate.style.display = 'none'; }, 1300);
}

/* sound + mode buttons */
const soundBtn = $('#soundBtn');
function paintSound() { soundBtn.setAttribute('aria-pressed', String(Sound.on)); }
soundBtn.addEventListener('click', () => { Sound.init(); Sound.set(!Sound.on); paintSound(); if (Sound.on) sfx.on(); });
paintSound();
$('#modeBtn').addEventListener('click', () => {
  const m = body.dataset.mode === 'kid' ? 'parent' : 'kid';
  setMode(m); sfx.boing(); burstAt($('#modeBtn'), 24);
  toast(m === 'kid' ? '⭐' : '🌿', 1200);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) Sound.init(); });

/* generic tap sounds + tap-fx */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('button, a');
  if (b && !b.dataset.nosfx && !b.matches('#startBtn,.choice,.pack,.foil,.bite-btn,#soundBtn,#modeBtn')) sfx.tick();
});
$$('.tap-fx').forEach(el => el.addEventListener('click', e => {
  const k = el.dataset.sfx; if (sfx[k]) sfx[k]();
  FX.burst(e.clientX, e.clientY, 22, { speed: 7 }); buzz(12);
  if (el.id === 'fluffPile') { el.classList.remove('poof'); void el.offsetWidth; el.classList.add('poof'); }
}));

/* reveal on scroll */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
$$('.reveal').forEach((el, i) => { el.style.setProperty('--d', (i % 3) * .08 + 's'); io.observe(el); });

/* ------------------------------------------------------------
   LAST BITE — ordinary cone fades, Fluffy stays loud
   ------------------------------------------------------------ */
(() => {
  const bad = $('#coneBad'), good = $('#coneGood');
  bad.innerHTML = coneSVG({ kind: 'ice' }); good.innerHTML = coneSVG({ kind: 'fluff' });
  const FACE_BAD = ['😋', '🙂', '😐', '😢', '😭'], FACE_GOOD = ['🤩', '😍', '😋', '🥰', '🤩'];
  const LEFT_BAD = [5, 4, 2, 1, 0];
  const CUT = [0, 30, 56, 82, 106];
  const mkDrops = (el, n, fill) => { el.innerHTML = '<svg><use href="#i-drop"/></svg>'.repeat(5); };
  mkDrops($('#dropsBad')); mkDrops($('#dropsGood'));
  $$('#dropsBad svg').forEach(s => s.style.color = '#ff3b6b');
  $$('#dropsGood svg').forEach(s => s.style.color = '#ff3b6b');
  const btn = $('#biteBtn'), mouth = $('.mouth', btn);
  let level = 0, auto = true, busy = false;

  function paint() {
    $$('.eat', bad).concat($$('.eat', good)).forEach(g => g.style.transform = `translateY(${CUT[level] + 38}px)`);
    if (level === 0) $$('.eat', bad).concat($$('.eat', good)).forEach(g => g.style.transform = 'translateY(0)');
    $('#faceBad').textContent = FACE_BAD[level]; $('#faceGood').textContent = FACE_GOOD[level];
    $$('#dropsBad svg').forEach((s, i) => s.classList.toggle('off', i >= LEFT_BAD[level]));
    $$('#dropsGood svg').forEach(s => s.classList.remove('off'));
    ['#faceBad', '#faceGood'].forEach(q => { const f = $(q); f.classList.remove('bump'); void f.offsetWidth; f.classList.add('bump'); });
    mouth.textContent = level >= 4 ? '🔁' : '😋';
  }
  function bite() {
    if (busy) return;
    if (level >= 4) { level = 0; paint(); sfx.pop(); return; }
    level++; sfx.crunch(); buzz(15); paint();
    if (level >= 3) setTimeout(() => sfx.sad(), 220);
    setTimeout(() => sfx.sparkle(3, 988), 260);
    burstAt(btn, 10, { speed: 5, shapes: ['circle'] });
    if (level === 4) { btn.classList.remove('nudge'); setTimeout(() => FX.burst(btn.getBoundingClientRect().right, btn.getBoundingClientRect().top, 26), 400); }
  }
  btn.addEventListener('click', () => { auto = false; btn.classList.remove('nudge'); bite(); });

  // demo once when scrolled into view
  const seen = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return; seen.disconnect();
    if (reduce) { btn.classList.add('nudge'); return; }
    let n = 0;
    const tick = () => {
      if (!auto) return;
      if (n++ < 4) { bite(); setTimeout(tick, 1100); }
      else setTimeout(() => { if (auto) { level = 0; paint(); btn.classList.add('nudge'); } }, 1600);
    };
    setTimeout(tick, 900);
  }, { threshold: .6 });
  seen.observe($('.bite-stage'));
})();

/* ------------------------------------------------------------
   FLUFF — shaved ice vs cloud
   ------------------------------------------------------------ */
(() => {
  const cv = $('#iceCanvas'), c = cv.getContext('2d');
  let s = 11; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  c.fillStyle = '#e8eff8'; c.beginPath(); c.ellipse(160, 215, 135, 120, 0, Math.PI, 0); c.fill();
  for (let i = 0; i < 520; i++) {
    const a = r() * Math.PI, rad = Math.sqrt(r());
    const x = 160 - Math.cos(a) * 135 * rad, y = 215 - Math.sin(a) * 120 * rad;
    const w = 6 + r() * 12, rot = r() * 6;
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = ['#c4d2e6', '#a9bbd4', '#f4f8ff', '#d6e0ee'][Math.floor(r() * 4)];
    c.beginPath(); c.moveTo(0, 0); c.lineTo(w, w * .3); c.lineTo(w * .2, w * .9); c.closePath(); c.fill(); c.restore();
  }
  // flat grey base
  c.fillStyle = '#b7c4d8'; c.fillRect(20, 210, 280, 6);
})();

/* ------------------------------------------------------------
   SQUEEZE — hold a packet, fill the cone
   ------------------------------------------------------------ */
(() => {
  const wrap = $('#playCone'); wrap.innerHTML = coneSVG({ kind: 'play' });
  const svg = $('svg', wrap), layersG = $('.layers', svg);
  const packsEl = $('#packs'), meter = $('#playMeter');
  const MAX = 114; let layers = [], total = 0, done = false;

  packsEl.innerHTML = PACKS.map(p => `
    <button class="pack" type="button" data-id="${p.id}" aria-label="Squeeze ${p.id} flavor">
      <svg viewBox="0 0 60 92"><defs><linearGradient id="pk-${p.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c2}"/></linearGradient></defs>
        <path d="M6 16h48v62q0 8-8 8H14q-8 0-8-8z" fill="url(#pk-${p.id})" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
        <path d="M6 16l4-7 4 7 4-7 4 7 4-7 4 7 4-7 4 7 4-7 4 7" fill="url(#pk-${p.id})" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
        <path d="M6 78l4 6 4-6 4 6 4-6 4 6 4-6 4 6 4-6 4 6 4-6 4 6" fill="none" stroke="#ffffff99" stroke-width="2"/>
        <rect x="12" y="22" width="7" height="48" rx="3.500" fill="#fff" opacity=".35"/>
      </svg><span class="emo">${p.em}</span></button>`).join('');

  function render() {
    let y = 152;
    layersG.innerHTML = layers.map(l => {
      y -= l.h;
      return `<rect x="0" y="${y.toFixed(2)}" width="200" height="${(l.h + 1).toFixed(2)}" fill="${l.col}" opacity=".92"/>`;
    }).join('');
    meter.style.width = clamp(total / MAX * 100, 0, 100) + '%';
  }
  function add(p, v) {
    const last = layers[layers.length - 1];
    if (last && last.id === p.id) last.h += v; else layers.push({ id: p.id, col: p.c1, h: v });
    total += v; render();
    if (total >= MAX - .5 && !done) finish();
  }
  function finish() {
    done = true; stopAll();
    sfx.fanfare(); buzz([40, 30, 60]);
    $('#rainbowFlash').classList.remove('go'); void $('#rainbowFlash').offsetWidth; $('#rainbowFlash').classList.add('go');
    burstAt(wrap, 70, { speed: 13 });
    toast('🌈😍🌈');
  }
  function reset() { layers = []; total = 0; done = false; render(); sfx.pop(); }
  $('#playReset').addEventListener('click', reset);

  let active = null, timer = 0;
  function stopAll() { clearInterval(timer); timer = 0; if (active) { active.el.classList.remove('squeezing'); active = null; } }
  function drop(from, p) {
    const a = from.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + 6, x1 = b.left + b.width / 2 + rand(-24, 24), y1 = b.top + b.height * .2;
    const d = document.createElement('i'); d.className = 'droplet'; d.style.background = p.c1;
    d.style.left = '0'; d.style.top = '0'; document.body.appendChild(d);
    const dx = x1 - x0, dy = y1 - y0;
    const anim = d.animate([
      { transform: `translate(${x0}px,${y0}px) scale(.8)` },
      { transform: `translate(${x0 + dx * .5}px,${y0 + dy * .5 - 90}px) scale(1)`, offset: .5 },
      { transform: `translate(${x1}px,${y1}px) scale(.7)` }
    ], { duration: 460, easing: 'ease-in' });
    anim.onfinish = () => d.remove();
  }
  packsEl.addEventListener('pointerdown', e => {
    const el = e.target.closest('.pack'); if (!el) return;
    e.preventDefault(); Sound.init();
    if (done) { toast('↻'); sfx.pop(); return; }
    const p = PACKS.find(x => x.id === el.dataset.id);
    stopAll(); active = { el, p };
    const a = el.getBoundingClientRect(), b = wrap.getBoundingClientRect();
    el.style.setProperty('--tilt', (a.left + a.width / 2 > b.left + b.width / 2 ? -38 : 38) + 'deg');
    el.classList.add('squeezing');
    const go = () => { sfx.squirt(); buzz(8); drop(el, p); setTimeout(() => !done && add(p, 2.6), 380); };
    go(); timer = setInterval(go, 95);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => packsEl.addEventListener(ev, e => {
    if (ev === 'pointerleave' && e.target !== packsEl) return; stopAll();
  }));
  addEventListener('pointerup', stopAll); addEventListener('blur', stopAll);
  packsEl.addEventListener('contextmenu', e => e.preventDefault());
  packsEl.addEventListener('keydown', e => {          // keyboard: space/enter = squeeze a burst
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const el = e.target.closest('.pack'); if (!el || e.repeat) return; e.preventDefault();
    Sound.init(); const p = PACKS.find(x => x.id === el.dataset.id);
    for (let i = 0; i < 4; i++) setTimeout(() => { sfx.squirt(); drop(el, p); setTimeout(() => !done && add(p, 2.6), 380); }, i * 90);
  });
  render();
})();

/* ------------------------------------------------------------
   CLOUD CARDS — open a pack, fill the book
   ------------------------------------------------------------ */
let renderBook = () => {};
(() => {
  const foil = $('#foil'), row = $('#revealRow'), grid = $('#bookGrid');
  let have = new Set(store.get('cards', []));
  let opening = false;

  const stars = n => '<svg><use href="#i-star"/></svg>'.repeat(n);
  function roll() {
    const tot = Object.values(TIER_W).reduce((a, b) => a + b, 0); let x = rand(0, tot), t = 1;
    for (const k of [1, 2, 3, 4]) { if ((x -= TIER_W[k]) < 0) { t = k; break; } }
    return pick(CARDS.filter(c => c.t === t));
  }
  const cardHTML = c => `
    <div class="card-in">
      <div class="face-f"><span class="holo"></span><span class="art">${c.em}</span><span class="nm">${c.name}</span><span class="st">${stars(c.t)}</span></div>
      <div class="face-b">☁️</div>
    </div>`;

  renderBook = function () {
    grid.innerHTML = CARDS.map(c => have.has(c.id)
      ? `<button class="slot have t${c.t}" type="button" data-id="${c.id}" aria-label="${c.name}"><span class="em">${c.em}</span><span class="s-st">${stars(c.t)}</span></button>`
      : `<div class="slot" aria-hidden="true"><span class="em">${c.em}</span></div>`).join('');
    const n = have.size;
    $('#bookCount').textContent = n + '/' + CARDS.length;
    $('#bookRing').style.setProperty('--p', n / CARDS.length * 100);
  };
  grid.addEventListener('click', e => {
    const s = e.target.closest('.slot.have'); if (!s) return;
    const c = CARDS.find(x => x.id === s.dataset.id); sfx.chime(c.t); burstAt(s, 14, { speed: 5 }); toast(c.em + ' ' + c.name, 1400);
  });
  $('#bookReset').addEventListener('click', () => { have = new Set(); store.set('cards', []); renderBook(); sfx.pop(); toast('☁️'); });

  function openPack() {
    if (opening) return; opening = true; Sound.init();
    row.innerHTML = '';
    foil.classList.add('shake'); sfx.shake(); buzz([20, 20, 20]);
    setTimeout(() => {
      foil.classList.remove('shake'); foil.classList.add('open'); sfx.tear();
      burstAt(foil, 30, { speed: 9 });
      setTimeout(() => foil.classList.add('gone'), 450);
      const draws = [roll(), roll(), roll()];
      if (!draws.some(c => c.t >= 2)) draws[2] = pick(CARDS.filter(c => c.t === 2));   // every pack has a rare+
      draws.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = `card back t${c.t} deal`; el.style.setProperty('--d', (.5 + i * .15) + 's'); el.innerHTML = cardHTML(c);
        el.setAttribute('role', 'img'); el.setAttribute('aria-label', c.name);
        row.appendChild(el);
        setTimeout(() => flip(el, c), 1500 + i * 900);
      });
      setTimeout(() => {
        opening = false; foil.classList.remove('open', 'gone'); foil.style.animation = 'popin .6s var(--bounce)';
        setTimeout(() => foil.style.animation = '', 700);
      }, 1500 + 3 * 900 + 600);
    }, 560);
  }
  function flip(el, c) {
    el.classList.remove('back');
    const isNew = !have.has(c.id);
    sfx.chime(c.t); buzz(c.t * 10);
    burstAt(el, 10 + c.t * 14, { speed: 6 + c.t * 2, colors: c.t === 4 ? ['#ffd23f', '#fff', '#ff5fa2', '#8b5cf6'] : undefined });
    if (c.t === 4) {
      const f = $('#rainbowFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      FX.rain(60); sfx.fanfare();
    }
    if (isNew) { have.add(c.id); store.set('cards', [...have]); el.classList.add('new'); renderBook(); }
  }
  foil.addEventListener('click', openPack);

  // 3D tilt + holo
  row.addEventListener('pointermove', e => {
    const el = e.target.closest('.card'); if (!el || el.classList.contains('back')) return;
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', ((px - .5) * 28) + 'deg'); el.style.setProperty('--rx', ((.5 - py) * 28) + 'deg');
    el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
  });
  row.addEventListener('pointerleave', () => $$('.card', row).forEach(el => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }));
  row.addEventListener('click', e => {
    const el = e.target.closest('.card'); if (el) { el.classList.remove('new'); sfx.pop(); }
  });
  renderBook();
})();

/* ------------------------------------------------------------
   FLAVORS
   ------------------------------------------------------------ */
function orbSVG(kind, c) {
  if (kind === 'dragon') {
    const seeds = Array.from({ length: 34 }, (_, i) => {
      const a = i * 2.4, r = 6 + (i % 7) * 4.6;
      return `<circle cx="${50 + Math.cos(a) * r}" cy="${52 + Math.sin(a) * r * .9}" r="1.5" fill="#2b2250"/>`;
    }).join('');
    return `<svg viewBox="0 0 100 100"><path d="M50 8C80 12 94 40 88 66c-6 22-24 30-38 30S18 88 12 66C6 40 20 12 50 8z" fill="#ff3fa4" stroke="#fff" stroke-width="4"/>
      <path d="M50 22c22 4 32 24 28 42-4 16-16 22-28 22S26 80 22 64c-4-18 6-38 28-42z" fill="#fff6fb"/>${seeds}
      <path d="M50 4c-6 6-14 8-20 6M50 4c6 6 14 8 20 6M12 66c-6-4-8-10-6-16M88 66c6-4 8-10 6-16" stroke="#3ddc97" stroke-width="5" stroke-linecap="round" fill="none"/></svg>`;
  }
  return '';
}

(() => {
  const grid = $('#flavorGrid'), det = $('#flavorDetail');
  let cur = 2;
  const pips = f => f.ben.map(b => `<svg><use href="#i-${b}"/></svg>`).join('');
  grid.innerHTML = FLAVORS.map((f, i) => {
    if (f.lock) return `<button class="fl fl-lock" type="button" data-i="${i}" style="--c:${f.c}" aria-label="Secret flavor"><span>🔒</span></button>`;
    return `<button class="fl" type="button" data-i="${i}" style="--c:${f.c}" aria-label="${f.name}">
      ${f.img ? `<img src="${f.img}" alt="" loading="lazy">` : `<span class="orb" style="background:radial-gradient(circle,${f.c}33,transparent 70%)">${orbSVG(f.orb)}</span>`}
      ${f.isNew ? '<span class="new">NEW</span>' : ''}<span class="pips">${pips(f)}</span></button>`;
  }).join('');

  window.renderFlavorDetail = function () {
    const f = FLAVORS[cur];
    $$('.fl', grid).forEach((el, i) => el.classList.toggle('sel', i === cur));
    if (f.lock) {
      det.innerHTML = `<div class="fd-img" style="--bgc:#efe6ff"><span style="font-size:64px">🔒</span></div><div class="fd-stars">${'<svg style="width:1em;height:1em"><use href="#i-star"/></svg>'.repeat(4)}</div><div class="fd-name">???</div>`;
      return;
    }
    const media = f.img ? `<img src="${f.img}" alt="${f.name}">` : `<span class="orb">${orbSVG(f.orb)}</span>`;
    det.innerHTML = `
      <div class="fd-img" style="--bgc:${f.c}22">${media}</div>
      <div class="fd-info">
        <div class="fd-name" style="color:${f.c}">${f.name}</div>
        <div class="fd-stars">${'<svg><use href="#i-star"/></svg>'.repeat(f.r)}</div>
      </div>
      <div class="fd-ben">${f.ben.map(b => `<div class="ben" style="--bc:${BEN[b].c}"><svg><use href="#i-${b}"/></svg><b>${BEN[b].t}</b></div>`).join('')}</div>`;
  };
  grid.addEventListener('click', e => {
    const el = e.target.closest('.fl'); if (!el) return;
    cur = +el.dataset.i; renderFlavorDetail();
    const f = FLAVORS[cur];
    if (f.lock) { sfx.boing(); toast('🔒✨'); buzz(30); } else { sfx.pop(); sfx.sparkle(3, 700 + cur * 40); }
    burstAt(el, 16, { speed: 6, colors: [f.c, '#fff', '#ffd23f'] });
  });
  renderFlavorDetail();
})();
function renderFlavorDetail() { window.renderFlavorDetail && window.renderFlavorDetail(); }

/* ------------------------------------------------------------
   CLEAN — slide the nasties away
   ------------------------------------------------------------ */
(() => {
  const BAD = ['🧪', '☣️', '🧴', '💊', '⚗️', '🛢️'], GOOD = ['🍓', '🌿', '🍋', '🥭', '🫐', '🍉'];
  const bad = $('#chipsBad'), good = $('#chipsGood'), sl = $('#cleanSlider'), glow = $('.clean-glow');
  bad.innerHTML = BAD.map(e => `<span class="chip">${e}</span>`).join('');
  good.innerHTML = GOOD.map(e => `<span class="chip">${e}</span>`).join('');
  const A0 = [255, 43, 214], A1 = [255, 122, 138], B0 = [122, 0, 255], B1 = [255, 179, 107];
  const mix = (a, b, t) => 'rgb(' + a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',') + ')';
  let lastTick = 0, wasFull = false;
  function paint() {
    const v = +sl.value / 100;
    $$('.chip', bad).forEach((c, i) => {
      const k = clamp((v * 1.15 - i * .05) / .55, 0, 1);
      c.style.opacity = 1 - k; c.style.transform = `scale(${1 - k * .7}) rotate(${k * 90}deg)`; c.style.filter = `grayscale(${k})`;
    });
    $$('.chip', good).forEach((c, i) => {
      const k = clamp((v - .3 - i * .06) / .3, 0, 1);
      c.style.opacity = k; c.style.transform = `scale(${.3 + k * .7}) rotate(${(1 - k) * -60}deg)`;
    });
    $('#cbA').setAttribute('stop-color', mix(A0, A1, v)); $('#cbB').setAttribute('stop-color', mix(B0, B1, v));
    glow.style.setProperty('--g', v);
    if (v > .98 && !wasFull) { wasFull = true; sfx.sparkle(6); burstAt($('#cleanBottle'), 40, { colors: ['#3ddc97', '#fff', '#ffd23f', '#9be22b'], shapes: ['star', 'circle'] }); }
    if (v < .9) wasFull = false;
  }
  sl.addEventListener('input', () => {
    Sound.init(); const n = performance.now();
    if (n - lastTick > 90) { lastTick = n; sfx.tick(); }
    paint();
  });
  paint();
})();

/* ------------------------------------------------------------
   CARE BOX — 5 flavors + 1 mystery card
   ------------------------------------------------------------ */
(() => {
  const SLOTS = 5, gift = $('#gift'), slotsEl = $('#giftSlots'), pickEl = $('#boxPicker'), btn = $('#reserveBtn');
  const list = FLAVORS.filter(f => f.img);
  let chosen = store.get('box', []).filter(id => list.some(f => f.id === id)).slice(0, SLOTS);

  pickEl.innerHTML = list.map(f => `<button class="pick" type="button" data-id="${f.id}" aria-label="Add ${f.name}"><img src="${f.img}" alt=""><span class="cnt"></span></button>`).join('');
  function render(animateIdx) {
    slotsEl.innerHTML = Array.from({ length: SLOTS }, (_, i) => {
      const f = list.find(x => x.id === chosen[i]);
      return f ? `<button class="gslot full" type="button" data-i="${i}" aria-label="Remove ${f.name}"><img ${i === animateIdx ? '' : 'style="animation:none"'} src="${f.img}" alt=""><span class="x" aria-hidden="true">×</span></button>`
               : '<div class="gslot" aria-hidden="true"></div>';
    }).join('') + '<div class="gslot mystery" aria-label="Mystery Cloud Card"><span>?</span></div>';
    $$('.pick', pickEl).forEach(p => {
      const n = chosen.filter(id => id === p.dataset.id).length;
      p.classList.toggle('has', n > 0); $('.cnt', p).textContent = n;
    });
    const full = chosen.length >= SLOTS;
    btn.disabled = !full;
    if (full && !gift.classList.contains('closed')) { gift.classList.add('closed'); setTimeout(() => { sfx.fanfare(); burstAt(gift, 60, { speed: 12 }); buzz([30, 30, 50]); }, 700); }
    if (!full) gift.classList.remove('closed');
    store.set('box', chosen);
  }
  pickEl.addEventListener('click', e => {
    const p = e.target.closest('.pick'); if (!p) return;
    if (chosen.length >= SLOTS) { sfx.boing(); toast('✔ 🎁', 1200); return; }
    chosen.push(p.dataset.id); sfx.pop(); buzz(10); burstAt(p, 8, { speed: 4 });
    render(chosen.length - 1);
  });
  slotsEl.addEventListener('click', e => {
    const s = e.target.closest('.gslot.full'); if (!s) return;
    chosen.splice(+s.dataset.i, 1); sfx.tick(); render();
  });
  btn.addEventListener('click', () => {
    sfx.sparkle(6); burstAt(btn, 40);
    toast('🎁 ✔  Join the Cloud Club!', 2600);
    setTimeout(() => $('#join').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }), 500);
  });
  render();
})();

/* ------------------------------------------------------------
   JOIN
   ------------------------------------------------------------ */
(() => {
  const form = $('#joinForm'), msg = $('#joinMsg'), email = $('#joinEmail');
  $$('.who-btn').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.who, { silent: true }); sfx.pop(); }));
  form.addEventListener('submit', async e => {
    e.preventDefault(); Sound.init();
    const v = email.value.trim();
    msg.className = 'form-msg';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      msg.textContent = '📧 ?'; msg.classList.add('err'); sfx.boing(); email.focus(); return;
    }
    const entry = { email: v, city: $('#joinCity').value.trim(), who: body.dataset.mode, box: store.get('box', []), cards: store.get('cards', []), at: new Date().toISOString() };
    const all = store.get('signups', []); all.push(entry); store.set('signups', all);
    if (CONFIG.waitlistEndpoint) {
      try { await fetch(CONFIG.waitlistEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }); } catch {}
    }
    msg.textContent = '☁️ ✔'; msg.classList.add('ok');
    sfx.fanfare(); burstAt(form, 80, { speed: 13 }); FX.rain(50); buzz([30, 30, 60]);
    form.reset();
  });
})();

/* ------------------------------------------------------------
   GO
   ------------------------------------------------------------ */
setMode(store.get('mode', 'kid') === 'parent' ? 'parent' : 'kid', { silent: true, save: false });
runLoader();
})();
