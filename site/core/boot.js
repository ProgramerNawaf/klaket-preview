/* Klaket landing runtime: smooth scroll, the scroll timeline, and the one reveal helper.
   Loaded as a plain script after gsap, ScrollTrigger and lenis, so every variant shares
   one Lenis instance and one ScrollTrigger ticker. Three.js scenes attach to the same
   instance through KL.onScroll, so a variant never runs two scroll loops. */
window.KL = (function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* This script always sits at <site>/core/boot.js, which makes its own URL the
     only reliable way to find the site root from a page at any depth. */
  const SITE = new URL('..', document.currentScript.src).href;

  /* The mark, in whichever brand is on. The colour brand has a real two colour
     mark; the mono brand uses the official one colour cut, painted with
     currentColor through a CSS mask, because an external SVG in an <img> cannot
     inherit a colour from the page. */
  function mark(px, alt) {
    const mono = document.documentElement.getAttribute('data-brand') === 'mono';
    const file = mono ? 'klaket-mark-mono.svg' : 'klaket-mark-on-dark.svg';
    const url = new URL('../brand/' + file, SITE).href;
    const size = `width:${px}px;height:${px}px`;
    return mono
      ? `<span class="kl-mark" style="${size};--kl-mark:url('${url}')" role="img" aria-label="${alt || ''}"></span>`
      : `<img src="${url}" alt="${alt || ''}" width="${px}" height="${px}" decoding="async">`;
  }
  const api = { reduced, lenis: null, gsap: window.gsap, ScrollTrigger: window.ScrollTrigger };

  if (!window.gsap) {
    document.documentElement.classList.add('js-off');
    return Object.assign(api, { mark, SITE });
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ---- smooth scroll ----------------------------------------------------
     Lenis replaces the browser's scroll easing. ScrollTrigger must be told to
     update on Lenis's own frames, and Lenis must be driven by the gsap ticker,
     or the two run on separate clocks and every pinned thing jitters. */
  if (!reduced) {
    api.lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      // Touch devices already ease natively; doubling it feels like treacle.
      syncTouch: false,
    });
    api.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => api.lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    document.documentElement.classList.add('no-anim');
  }

  /* ---- reveals ----------------------------------------------------------
     One helper, so the whole page enters with the same curve and the same
     distance. Anything with [data-reveal] is handled without being asked. */
  const REVEALS = {
    up:    { y: 28, opacity: 0 },
    fade:  { opacity: 0 },
    left:  { x: -24, opacity: 0 },
    right: { x: 24, opacity: 0 },
    clip:  { clipPath: 'inset(0 0 100% 0)', opacity: 1 },
    scale: { scale: 0.94, opacity: 0 },
  };

  function reveal(el, opts) {
    if (reduced) { gsap.set(el, { clearProps: 'all', opacity: 1 }); return null; }
    const o = opts || {};
    const from = REVEALS[o.kind || el.dataset.reveal || 'up'] || REVEALS.up;
    const stagger = o.stagger != null ? o.stagger : parseFloat(el.dataset.stagger || 0.06);
    const targets = o.children ? el.children : el;
    return gsap.from(targets, {
      ...from,
      duration: o.duration || 0.9,
      ease: o.ease || 'power3.out',
      stagger,
      delay: o.delay || 0,
      scrollTrigger: o.trigger === false ? undefined : {
        trigger: el,
        start: o.start || 'top 82%',
        once: true,
      },
    });
  }

  function autoReveal(root) {
    (root || document).querySelectorAll('[data-reveal]').forEach((el) => {
      if (el.dataset.revealed) return;
      el.dataset.revealed = '1';
      el.style.opacity = '';
      reveal(el, { children: el.hasAttribute('data-reveal-children') });
    });
  }

  /* ---- scroll subscribers ----------------------------------------------
     Three.js scenes and anything else that wants raw progress register here
     rather than adding their own listener. */
  const subs = new Set();
  function onScroll(fn) { subs.add(fn); return () => subs.delete(fn); }
  function pump() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    const p = max > 0 ? y / max : 0;
    subs.forEach((fn) => fn(y, p));
  }
  if (api.lenis) api.lenis.on('scroll', pump);
  else window.addEventListener('scroll', pump, { passive: true });

  /* ---- a shared render loop -------------------------------------------
     One rAF for every canvas on the page, paused when the tab is hidden so a
     parked tab costs nothing. */
  const painters = new Set();
  let running = false;
  function paint(fn) {
    painters.add(fn);
    if (!running) { running = true; gsap.ticker.add(tick); }
    return () => {
      painters.delete(fn);
      if (!painters.size) { running = false; gsap.ticker.remove(tick); }
    };
  }
  function tick(time, delta) {
    if (document.hidden) return;
    painters.forEach((fn) => fn(time, delta));
  }

  /* ---- in-page links ----------------------------------------------------
     On a landing variant these scroll. On the journal, the demo page or a post
     the section does not exist, and a link that silently does nothing is worse
     than one that leaves the page, so it is sent to the site root instead.
     Done on click rather than on load because modules render their own markup
     and the targets do not all exist yet when this file runs. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) {
      e.preventDefault();
      location.href = SITE + id;
      return;
    }
    e.preventDefault();
    if (api.lenis) api.lenis.scrollTo(target, { offset: -24 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });

  /* Fonts shift metrics; a layout measured before they land is measured wrong. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  document.addEventListener('DOMContentLoaded', () => autoReveal());

  return Object.assign(api, { reveal, autoReveal, onScroll, paint, mark, SITE });
})();
