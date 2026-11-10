/* Klaket landing · main.js (ES module, anime.js v4 via the import map in index.html)

   Always on:   live slate text, work lightbox, contact form, footer year.
   Motion only (html.motion, i.e. no prefers-reduced-motion):
     hero letter reveal + letterbox, section reveals (stagger), counting stats, card tilt,
     hover previews, the Action! scroll scene, and sound. */
import { animate, createTimeline, onScroll, stagger, utils } from 'animejs';

const root = document.documentElement;
const motion = root.classList.contains('motion');
window.__klaketReady = true; // tells the inline fallback in <head> that the module loaded

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode: choice lasts for this visit */ } },
};

/* ------------------------------------------------------------------ hero */
function hero() {
  const h1 = $('[data-split]');
  const text = h1.textContent;
  h1.setAttribute('aria-label', text);
  // one span per letter, grouped by word so lines only break between words
  h1.innerHTML = text.split(' ').map((w) =>
    `<span aria-hidden="true" style="display:inline-block;white-space:nowrap">${[...w].map((c) => `<span class="ch">${c}</span>`).join('')}</span>`
  ).join(' ');
  utils.set('.letterbox', { scaleY: 7.2 }); // bars start shut, then open like a frame
  createTimeline({ defaults: { ease: 'outExpo' } })
    .add('.letterbox', { scaleY: 1, duration: 1100, ease: 'inOutQuart' }, 100)
    .add('.hero .slate-label', { opacity: [0, 1], duration: 600 }, 500)
    .add('.hero-title .ch', { opacity: [0, 1], translateY: ['.4em', 0], duration: 900, delay: stagger(30) }, 600)
    .add(['.hero-ar', '.hero-tag', '.hero-cta'], { opacity: [0, 1], translateY: [16, 0], duration: 800, delay: stagger(120) }, 1100);
}

/* --------------------------------------------- reveals, counters, tilt */
function reveals() {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    animate($$('[data-reveal]', e.target), { opacity: [0, 1], translateY: [28, 0], duration: 800, ease: 'outCubic', delay: stagger(90) });
    $$('[data-count]', e.target).forEach(count);
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal-group]').forEach((g) => io.observe(g));
}

function count(el) {
  const to = Number(el.dataset.count), n = { v: 0 };
  el.textContent = '0';
  animate(n, { v: to, duration: 1800, ease: 'outExpo', onUpdate: () => { el.textContent = Math.round(n.v); } });
}

function tilt() {
  $$('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      animate(card, { rotateX: -y * 12, rotateY: x * 12, duration: 400, ease: 'outQuad' });
    });
    card.addEventListener('pointerleave', () => animate(card, { rotateX: 0, rotateY: 0, duration: 700, ease: 'outElastic(1, .6)' }));
  });
}

/* ------------------------------------------------- work: previews + lightbox */
function work() {
  const dlg = $('#lightbox'), lbVideo = $('.lb-video', dlg);
  $$('.thumb').forEach((btn) => {
    if (motion) {
      // muted preview, created on first hover/focus so nothing downloads up front
      const play = () => {
        let v = $('video', btn);
        if (!v) {
          v = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'none', src: btn.dataset.video });
          v.setAttribute('aria-hidden', 'true');
          v.addEventListener('playing', () => btn.classList.add('playing'));
          btn.insertBefore(v, $('.thumb-meta', btn));
        }
        v.play().catch(() => {});
      };
      const stop = () => { const v = $('video', btn); if (v) v.pause(); btn.classList.remove('playing'); };
      btn.addEventListener('pointerenter', play);
      btn.addEventListener('focus', play);
      btn.addEventListener('pointerleave', stop);
      btn.addEventListener('blur', stop);
    }
    btn.addEventListener('click', () => {
      $('#lb-title').textContent = btn.dataset.title;
      lbVideo.src = btn.dataset.video;
      lbVideo.setAttribute('aria-label', `${btn.dataset.title} (placeholder clip)`);
      dlg.showModal();
      lbVideo.play().catch(() => {});
    });
  });
  $('.lb-close', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // backdrop
  dlg.addEventListener('close', () => { lbVideo.pause(); lbVideo.removeAttribute('src'); lbVideo.load(); });
}

/* ------------------------------------------------------------------ form */
function form() {
  const f = $('#contact-form'), note = $('#form-note');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = $$('input, textarea', f).filter((el) => { const ok = el.checkValidity(); el.setAttribute('aria-invalid', String(!ok)); return !ok; });
    if (bad.length) { note.textContent = 'Please fill in your name, a valid email and a few words about the project.'; bad[0].focus(); return; }
    // PLACEHOLDER: post the FormData to your endpoint here
    note.textContent = `Thanks, ${f.name.value.trim()}. This demo form isn't connected yet, so nothing was sent.`;
    f.reset();
  });
}

/* ------------------------------------------------------------------ sound
   Web Audio, muted by default. The context is created on the visitor's first interaction (autoplay rules),
   and only if they've turned sound on. Clap: once per entry into the Action! scene. Whir: loop whose volume
   follows scroll speed and fades out when scrolling stops. Files: assets/audio (see README). */
const AUDIO = { clap: 'assets/audio/clap.wav', reel: 'assets/audio/reel-loop.wav' };
const sound = {
  on: false, ctx: null, master: null, bytes: {}, buffers: {}, whir: null, whirGain: null,
  preload() { // fetch the bytes early; decoding waits for the context
    for (const [k, url] of Object.entries(AUDIO)) fetch(url).then((r) => r.arrayBuffer()).then((b) => { this.bytes[k] = b; this.decode(); }).catch(() => {});
  },
  unlock() {
    if (!this.on) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.decode();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  decode() {
    if (!this.ctx) return;
    for (const [k, b] of Object.entries(this.bytes)) {
      if (this.buffers[k] || !b) continue;
      this.bytes[k] = null;
      this.ctx.decodeAudioData(b).then((buf) => { this.buffers[k] = buf; }).catch(() => {});
    }
  },
  set(on) {
    this.on = on; store.set('klaket-sound', on ? '1' : '0');
    const btn = $('.sound');
    btn.setAttribute('aria-pressed', String(on));
    $('#sound-tip').textContent = on ? 'Mute cinematic sound' : 'Enable cinematic sound';
    $('[data-slate="sound"]').textContent = on ? 'ON' : 'OFF';
    if (on) this.unlock(); else this.whirTo(0, true);
    if (this.master) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  },
  clap() {
    if (!this.on || !this.ctx || !this.buffers.clap) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.buffers.clap; s.connect(this.master); s.start();
  },
  whirTo(level, stop) { // level 0..1
    if (!this.ctx || !this.buffers.reel) return;
    if (!this.whir && level > 0 && this.on) {
      this.whirGain = this.ctx.createGain(); this.whirGain.gain.value = 0; this.whirGain.connect(this.master);
      this.whir = this.ctx.createBufferSource(); this.whir.buffer = this.buffers.reel; this.whir.loop = true;
      this.whir.connect(this.whirGain); this.whir.start();
    }
    if (!this.whir) return;
    this.whirGain.gain.setTargetAtTime(level * 0.35, this.ctx.currentTime, level > 0 ? 0.06 : 0.25);
    if (stop) { const w = this.whir; this.whir = null; w.stop(this.ctx.currentTime + 1.2); }
  },
};

function soundUI() {
  const btn = $('.sound');
  btn.hidden = false;
  sound.preload();
  sound.set(store.get('klaket-sound') === '1');
  btn.addEventListener('click', () => sound.set(!sound.on));
  const first = () => sound.unlock();
  ['pointerdown', 'keydown', 'touchstart'].forEach((t) => addEventListener(t, first, { once: true, passive: true }));
}

/* ----------------------------------------------------- Action! scroll scene */
function actionScene() {
  const section = $('#action');

  // Reels and film are bound straight to scroll progress over the whole time the scene is on screen:
  // scroll down and they run forward, scroll up and they run back, scroll faster and they spin faster.
  const whileVisible = () => onScroll({ target: section, enter: 'bottom top', leave: 'top bottom', sync: true });
  animate('.reel-back', { rotate: 1440, ease: 'linear', autoplay: whileVisible() });
  animate('.reel-front', { rotate: 1800, ease: 'linear', autoplay: whileVisible() });
  animate('.film-track', { translateX: ['-100%', '60%'], ease: 'linear', autoplay: whileVisible() });

  // The arm rises as the scene slides in (until the stage sticks to the top of the screen).
  animate('.arm-lift', { rotate: [0, -28], ease: 'outQuad', autoplay: onScroll({ target: section, enter: 'bottom top', leave: 'top top', sync: true }) });
}

// Clapper snap: lift a touch more → pause → snap shut (outBack) → clap on complete.
// .arm-snap's +28° cancels .arm-lift's −28°, so "shut" is the board's resting pose.
const clapper = {
  shut: false, clappedThisEntry: false,
  snap() {
    this.shut = true;
    utils.remove('.arm-snap');
    createTimeline()
      .add('.arm-snap', { rotate: -10, duration: 260, ease: 'outCubic' })
      .add('.arm-snap', { rotate: 28, duration: 170, ease: 'outBack(1.6)', onComplete: () => {
        if (!this.clappedThisEntry) { this.clappedThisEntry = true; sound.clap(); }
      } }, '+=280');
  },
  open() {
    this.shut = false;
    utils.remove('.arm-snap');
    animate('.arm-snap', { rotate: 0, duration: 450, ease: 'outQuad' });
  },
};

/* --------------------------------------------- live slate + scroll loop
   One passive scroll listener, work done once per frame:
   SCENE = section under the middle of the screen, TAKE = completed passes through Action!,
   ROLL = page scroll %, plus the clapper state and the whir volume. */
function scrollLoop() {
  const scenes = $$('[data-scene]'), section = $('#action');
  const slate = { scene: $('[data-slate="scene"]'), take: $('[data-slate="take"]'), roll: $('[data-slate="roll"]') };
  let take = 1, lastY = scrollY, ticking = false, idle, inside = false, passed = false;

  const frame = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight, v = y - lastY; lastY = y;
    const max = document.documentElement.scrollHeight - vh;
    slate.roll.textContent = `${Math.round((y / Math.max(1, max)) * 100)}%`;
    let cur = scenes[0];
    for (const s of scenes) if (s.getBoundingClientRect().top <= vh / 2) cur = s;
    slate.scene.textContent = pad(cur.dataset.scene);

    if (!motion) return;
    const r = section.getBoundingClientRect();
    const visible = r.top < vh && r.bottom > 0;
    const p = (-r.top) / Math.max(1, r.height - vh); // 0 when the stage sticks, 1 when it lets go
    if (visible && !inside) { inside = true; passed = false; }
    if (!visible && inside) { // left the scene: a new entry can clap again
      inside = false; clapper.clappedThisEntry = false;
      if (r.bottom <= 0 && passed) { take += 1; slate.take.textContent = pad(take); }
      sound.whirTo(0, true);
    }
    if (inside) {
      if (!clapper.shut && p >= 0.42) clapper.snap();
      else if (clapper.shut && p < 0.36) clapper.open(); // hysteresis so it doesn't chatter at the line
      if (p >= 1) passed = true;
      sound.whirTo(Math.min(1, Math.abs(v) / 40));
      clearTimeout(idle);
      idle = setTimeout(() => sound.whirTo(0), 140); // scrolling stopped: fade the whir out
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();
}

/* ------------------------------------------------------------------ boot */
$('[data-year]').textContent = new Date().getFullYear();
$('[data-slate="date"]').textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
work();
form();
scrollLoop();
if (motion) {
  hero();
  reveals();
  tilt();
  actionScene();
  soundUI();
}
