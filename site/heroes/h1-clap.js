/* Hero 1: the clap.
   One board in an ink void. It swings in, the stick slams, the screen takes a
   single frame of white, and the headline lands on that frame. The words are
   timed to the impact rather than to the page load, because the whole point is
   that the clap is what starts the thing. */
import * as K from '../core/three-kit.js';

const root = document.querySelector('.hero-clap');
if (root) build(root);

function build(root) {
  const D = window.KLDATA;
  const words = D.hero.slogan.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');

  root.innerHTML = `
    <div class="hero-clap__stage" aria-hidden="true"></div>
    <div class="hero-clap__flash" aria-hidden="true"></div>
    <div class="hero-clap__copy">
      <h1>${words}</h1>
      <p class="hero-clap__ar ar" dir="rtl" lang="ar">${D.hero.sloganAr}</p>
      <p class="lede hero-clap__lede">${D.hero.lede}</p>
      <div class="hero-clap__cta">
        <a class="btn" href="${D.hero.primary.href}">${D.hero.primary.label}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a class="btn btn--ghost" href="${D.hero.secondary.href}">${D.hero.secondary.label}</a>
      </div>
    </div>`;

  const stage = root.querySelector('.hero-clap__stage');
  const flash = root.querySelector('.hero-clap__flash');
  const ws = [...root.querySelectorAll('.w')];
  const rest = [root.querySelector('.hero-clap__ar'), root.querySelector('.hero-clap__lede'), root.querySelector('.hero-clap__cta')];
  const g = window.KL && KL.gsap;

  if (!K.supported()) { flat(stage); settle(g, ws, rest, 0.3); return; }

  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);

  let stageApi;
  try {
    stageApi = K.makeStage(canvas, { fov: 38, fog: 0x0B0B0B, fogNear: 7, fogFar: 22 });
  } catch (e) {
    canvas.remove(); flat(stage); settle(g, ws, rest, 0.3); return;
  }
  const { scene, camera, start, dispose } = stageApi;

  K.lightRig(scene);

  const slate = K.makeSlate();
  scene.add(slate);

  /* No shadow catcher: on an ink ground a cast shadow reads as a stray black
     slab, and the rim light already separates the board from the dark. */

  function place() {
    const wide = window.innerWidth > 900;
    /* The canvas owns its own column on wide screens, so the board sits at the
       middle of that column, not at an offset guessed against the whole page. */
    camera.position.set(0, 0, wide ? 4.4 : 4.6);
    slate.position.set(0, wide ? -0.05 : 0.95, 0);
    slate.scale.setScalar(wide ? 0.86 : 0.8);
  }
  place();
  window.addEventListener('resize', place);

  /* Mouse parallax: a couple of degrees, enough to feel held, not enough to wobble. */
  let tx = 0, ty = 0, cx = 0, cy = 0;
  if (!KL.reduced) {
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 0.34;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 0.22;
    });
  }

  let scrollTilt = 0;
  KL.onScroll(() => {
    const r = root.getBoundingClientRect();
    scrollTilt = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
  });

  start(() => {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    slate.rotation.y = cx + 0.12;
    slate.rotation.x = cy - scrollTilt * 0.5;
    const restY = window.innerWidth > 900 ? -0.05 : 0.95;
    slate.position.y += (restY - scrollTilt * 1.2 - slate.position.y) * 0.08;
  });

  window.addEventListener('pagehide', dispose, { once: true });

  /* ---- the clap ---- */
  if (!g || KL.reduced) { slate.clap(1); settle(g, ws, rest, 0); return; }

  const state = { t: 0 };
  const tl = g.timeline({ delay: 0.25 });

  tl.from(slate.position, { x: '+=0.7', y: '+=0.5', duration: 1.1, ease: 'power3.out' }, 0)
    .from(slate.rotation, { y: 0.9, z: -0.18, duration: 1.1, ease: 'power3.out' }, 0)
    /* The stick falls under its own weight, so it accelerates in. */
    .to(state, { t: 1, duration: 0.42, ease: 'power3.in', onUpdate: () => slate.clap(state.t) }, 0.62)
    .to(flash, { opacity: 0.55, duration: 0.05, ease: 'none' }, 1.04)
    .to(flash, { opacity: 0, duration: 0.3, ease: 'power2.out' }, 1.09)
    /* and the board rings once, the way a real one does. */
    .to(slate.rotation, { z: 0.035, duration: 0.09, ease: 'power2.out' }, 1.04)
    .to(slate.rotation, { z: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 1.13);

  settle(g, ws, rest, 1.04, tl);
}

/* The headline arrives on the impact, not before it. */
function settle(g, ws, rest, at, tl) {
  if (!g || (window.KL && KL.reduced)) {
    g && g.set([...ws, ...rest], { opacity: 1, y: 0 });
    return;
  }
  const t = tl || g.timeline();
  t.from(ws, { y: 34, opacity: 0, duration: 0.7, stagger: 0.045, ease: 'power3.out' }, at)
   .from(rest, { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, at + 0.14);
}

/* No WebGL: the same board, drawn flat, still clapping. */
function flat(stage) {
  stage.innerHTML = `
    <div class="hero-clap__flat">
      <svg viewBox="0 0 400 300" aria-hidden="true">
        <defs><pattern id="hc-st" width="34" height="34" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="17" height="34" fill="var(--paper)"/><rect x="17" width="17" height="34" fill="var(--ink)"/>
        </pattern></defs>
        <rect x="40" y="96" width="320" height="180" rx="10" fill="var(--teal)"/>
        <rect x="40" y="70" width="320" height="30" rx="6" fill="url(#hc-st)"/>
        <g class="stick"><rect x="40" y="38" width="320" height="30" rx="6" fill="url(#hc-st)"/></g>
        ${[0, 1].map((r) => [0, 1, 2].map((c) => `
          <rect x="${66 + c * 100}" y="${134 + r * 62}" width="${40 - c * 6}" height="7" rx="3.5" fill="var(--paper)" opacity=".5"/>
          <rect x="${66 + c * 100}" y="${150 + r * 62}" width="${70 - c * 10}" height="13" rx="3" fill="var(--paper)" opacity=".88"/>
        `).join('')).join('')}
      </svg>
    </div>`;
}
