/* J1, the journey: one fixed canvas, scroll flies a camera through a 3D film set.

   The architecture is vectrfl.com's, verified live: there is no pinning of the
   3D. One `position: fixed` full-viewport canvas sits behind the content at a
   low z-index and an ordinary tall section scrolls over it. Scroll progress
   drives a camera along a Catmull-Rom path through the set, a glowing line
   traces the route ahead of it, and the step list rides over the top in a
   sticky column where the active step opens and the rest collapse to a line.

   The scenario, Nawaf's own: the camera flies in across a set, pushes in over
   the shoulder of the film camera, and at the lens the Klaket board comes into
   focus. We fly through the board and the six steps play out as six stations
   down a corridor. Wherever the AI does the work it is the same signature every
   time: a teal bar passes over the thing and leaves it organised. That
   repetition is the whole reason the scene is legible.

   Everything is driven straight off scroll progress in one frame function.
   There is no GSAP timeline for the 3D, no second Lenis and no private rAF:
   the loop is KL.paint, and it is released whenever the section is off screen.

   three is only ever reached through the kit, never imported from vendor here,
   so there is exactly one copy of it on the page. */
import * as K from '../core/three-kit.js';

(function () {
  let THREE;   // handed over by the kit's stage, below
  const root = document.querySelector('.jfly');
  const D = window.KLDATA;
  if (!root || !D || !D.journey) return;

  const J = D.journey;
  const KL = window.KL || {};
  const STEPS = J.steps;
  const small = () => window.matchMedia('(max-width: 860px)').matches;

  /* Scroll budget: the fly-in across the set, then one window per step. */
  const INTRO_P = 0.13;
  const WIN = (1 - INTRO_P) / STEPS.length;

  const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ================================================================ markup */

  function passBand(x, y, w) {
    /* The AI signature as a still: the bright edge plus its haze, drawn once
       and reused by every drawing so the six read as one idea. */
    let s = `<rect x="${x}" y="${y}" width="${w}" height="2.5" class="f-pass"/>`;
    [0.3, 0.17, 0.08].forEach((o, k) => {
      s += `<rect x="${x}" y="${(y + 2.5 + k * 9).toFixed(1)}" width="${w}" height="9" class="f-pass" opacity="${o}"/>`;
    });
    return s;
  }

  const bar = (x, y, w, h, cls, extra = '') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(2, h / 2)}" class="${cls}" ${extra}/>`;

  /* 01 a deck, a voice note and a paragraph resolve into one structured brief. */
  function draw1() {
    let scraps = '';
    /* deck slide */
    scraps += `<g transform="translate(16 26) rotate(-7)">${bar(0, 0, 84, 54, 'f-dark')}${bar(8, 8, 44, 7, 'f-tint')}${bar(8, 22, 66, 5, 'f-dim')}${bar(8, 32, 50, 5, 'f-dim')}${bar(8, 42, 60, 5, 'f-dim')}</g>`;
    /* voice note */
    scraps += `<g transform="translate(10 98) rotate(4)">${bar(0, 0, 96, 26, 'f-dark')}`;
    for (let i = 0; i < 11; i++) {
      const h = 4 + ((i * 7) % 13);
      scraps += bar(10 + i * 7, 13 - h / 2, 3, h, 'f-dim');
    }
    scraps += `</g>`;
    /* a paragraph off a phone */
    scraps += `<g transform="translate(22 142) rotate(-3)">${bar(0, 0, 80, 56, 'f-dark')}${bar(8, 10, 62, 5, 'f-dim')}${bar(8, 21, 48, 5, 'f-dim')}${bar(8, 32, 58, 5, 'f-dim')}${bar(8, 43, 34, 5, 'f-dim')}</g>`;

    let rows = '';
    for (let i = 0; i < 5; i++) {
      const y = 76 + i * 23;
      rows += `<g>${bar(206, y, 34, 6, 'f-tint')}${bar(248, y - 2, i === 4 ? 52 : 86, 10, 'f-dim')}</g>`;
    }

    return svg(`
      <g class="before">${scraps}</g>
      <path d="M150 110 L186 110" class="s-tint"/><path d="M180 104 L188 110 L180 116" class="s-tint"/>
      ${bar(196, 20, 150, 180, 'f-paper')}
      ${bar(196, 20, 150, 30, 'f-teal')}
      ${bar(206, 31, 56, 8, 'f-paper', 'opacity=".9"')}
      <g class="after">${rows}</g>
      <g class="pass">${passBand(196, 122, 150)}</g>`);
  }

  /* 02 the script's lines light up and sort into four tagged piles. */
  function draw2() {
    let lines = '';
    for (let i = 0; i < 13; i++) {
      const y = 36 + i * 12;
      const w = 30 + ((i * 37) % 76);
      const lit = y < 122;
      lines += `${bar(30, y, w, 5, lit ? 'f-teal' : 'f-dim')}` +
        (lit ? bar(22, y, 4, 5, 'f-c1') : '');
    }
    const glyph = {
      /* cast, props, locations, stunts: a silhouette each, so the four piles
         are told apart without labelling them. */
      cast: `<circle cx="0" cy="-5" r="4.2"/><path d="M-7 6 a7 7 0 0 1 14 0z"/>`,
      props: `<path d="M-6 -4.2 L0 -7.6 L6 -4.2 L6 4.2 L0 7.6 L-6 4.2z" opacity=".82"/>`,
      locn: `<path d="M0 8 C0 8 6 0 6 -3 a6 6 0 1 0 -12 0 C-6 0 0 8 0 8z"/>`,
      stunt: `<path d="M1 -8 L-5 1 L-0.5 1 L-2 8 L5 -1 L0.5 -1z"/>`,
    };
    /* The tagged top card carries the colour and the glyph sits on it, so all
       four piles read: a colour on a glyph alone loses the dark one. */
    const piles = [['cast', 'f-c1', 'f-paper'], ['props', 'f-c2', 'f-ink'],
                   ['locn', 'f-c3', 'f-ink'], ['stunt', 'f-c4', 'f-paper']];
    let out = '';
    piles.forEach(([k, card, mark], i) => {
      const x = 212 + (i % 2) * 76;
      const y = 44 + Math.floor(i / 2) * 84;
      out += `<g transform="translate(${x} ${y})">
        ${bar(0, 10, 56, 38, 'f-dark')}${bar(3, 6, 50, 38, 'f-dim')}${bar(6, 2, 44, 38, card)}
        <g transform="translate(28 21)" class="${mark}">${glyph[k]}</g>
      </g>`;
    });

    return svg(`
      ${bar(14, 18, 128, 184, 'f-paper')}
      ${bar(22, 26, 40, 5, 'f-teal')}
      <g class="before">${lines}</g>
      <path d="M150 110 L186 110" class="s-tint"/><path d="M180 104 L188 110 L180 116" class="s-tint"/>
      <g class="after">${out}</g>
      <g class="pass">${passBand(14, 118, 128)}</g>`);
  }

  /* 03 strips slide into their slots and the day count comes down with them. */
  function draw3() {
    const tone = ['f-c1', 'f-c2', 'f-c3', 'f-c4'];
    let settled = '';
    let loose = '';
    for (let col = 0; col < 3; col++) {
      for (let r = 0; r < 7; r++) {
        const x = 24 + col * 72;
        const y = 30 + r * 23;
        if (y < 118) settled += bar(x, y, 64, 16, tone[(col + r) % 4]);
        else {
          const rot = ((col * 7 + r * 13) % 11) - 5;
          const dx = ((col * 11 + r * 5) % 13) - 6;
          loose += `<g transform="translate(${x + dx} ${y}) rotate(${rot} 32 8)">${bar(0, 0, 64, 16, 'f-dim')}</g>`;
        }
      }
    }
    return svg(`
      ${bar(10, 16, 240, 188, 'f-dark')}
      <g class="before">${loose}</g>
      <g class="after">${settled}</g>
      <g class="pass">${passBand(10, 114, 240)}</g>
      <g transform="translate(266 78)">
        <text x="0" y="0" class="jnum jnum--was">12</text>
        <path d="M-2 -10 L29 -12" class="s-tint"/>
        <text x="0" y="40" class="jnum jnum--is">9</text>
        <text x="30" y="40" class="junit">DAYS</text>
      </g>`);
  }

  /* 04 one sheet multiplies out to the crew and the receipts light up. */
  function draw4() {
    let flying = '';
    [[128, 52, -12], [146, 96, 6], [126, 142, -5]].forEach(([x, y, r]) => {
      flying += `<g transform="translate(${x} ${y}) rotate(${r})">${bar(0, 0, 40, 52, 'f-dark')}${bar(0, 0, 40, 9, 'f-tint')}${bar(5, 16, 28, 4, 'f-dim')}${bar(5, 25, 22, 4, 'f-dim')}</g>`;
    });
    let crew = '';
    for (let i = 0; i < 9; i++) {
      const x = 236 + (i % 3) * 40;
      const y = 36 + Math.floor(i / 3) * 58;
      const read = i < 6;
      crew += `<g transform="translate(${x} ${y})" class="${read ? 'jread' : ''}">
        <circle cx="12" cy="12" r="11" class="${read ? 'f-teal' : 'f-dim'}"/>
        ${read ? '<path d="M7 12.5 L10.5 16 L17.5 8.5" fill="none" stroke="currentColor" stroke-width="2.2" class="s-paper"/>'
               : '<circle cx="12" cy="12" r="3.2" class="f-dark"/>'}
      </g>`;
    }
    return svg(`
      ${bar(16, 40, 92, 140, 'f-paper')}
      ${bar(16, 40, 92, 22, 'f-teal')}
      ${bar(24, 48, 40, 7, 'f-paper', 'opacity=".9"')}
      <g class="before">${[0, 1, 2, 3, 4].map((i) => bar(24, 76 + i * 18, i === 4 ? 40 : 70, 6, 'f-dim')).join('')}</g>
      <g class="before">${flying}</g>
      <path d="M112 110 C160 110 184 72 214 62" class="s-tint" opacity=".5"/>
      <path d="M112 110 L214 110" class="s-tint" opacity=".5"/>
      <path d="M112 110 C160 110 184 148 214 158" class="s-tint" opacity=".5"/>
      <g class="after">${crew}</g>
      <g class="pass">${passBand(16, 104, 92)}</g>`);
  }

  /* 05 the board claps, the flash, the shots tick off. The one use of signal. */
  function draw5() {
    let stripes = '';
    /* The bar carries the mark's 45 degree stripes, so they are skewed, not upright. */
    for (let i = -3; i < 16; i++) stripes += bar(i * 22, -16, 11, 64, 'f-paper');
    let ticks = '';
    for (let i = 0; i < 8; i++) {
      const done = i < 6;
      ticks += `<g transform="translate(286 ${34 + i * 21})">${bar(0, 0, 16, 16, done ? 'f-teal' : 'f-dark')}${done ? '<path d="M3.5 8.5 L6.5 11.5 L12.5 5" fill="none" stroke="currentColor" stroke-width="2" class="s-paper"/>' : ''}</g>`;
    }
    return svg(`
      <circle cx="140" cy="108" r="104" class="f-paper" opacity=".07"/>
      <circle cx="140" cy="108" r="66" class="f-paper" opacity=".07"/>
      ${bar(26, 56, 228, 126, 'f-teal')}
      <g class="after">
        <g>${[0, 1, 2].map((i) => `${bar(42, 78 + i * 34, 30, 5, 'f-paper', 'opacity=".55"')}${bar(42, 88 + i * 34, 54, 14, 'f-paper')}`).join('')}
           ${[0, 1, 2].map((i) => `${bar(124, 78 + i * 34, 30, 5, 'f-paper', 'opacity=".55"')}${bar(124, 88 + i * 34, 54, 14, 'f-paper')}`).join('')}</g>
        <g>${ticks}</g>
      </g>
      <g transform="translate(26 30)" clip-path="url(#jfly-clip5)">${bar(0, 0, 228, 30, 'f-dark')}<g transform="skewX(-38)">${stripes}</g></g>
      <circle cx="230" cy="74" r="7" class="f-sig"/>
      <g class="pass">${passBand(26, 120, 228)}</g>
      <defs><clipPath id="jfly-clip5"><rect x="0" y="0" width="228" height="30" rx="2"/></clipPath></defs>`);
  }

  /* 06 the strip winds onto the reel and the set goes dark and calm. */
  function draw6() {
    const tone = ['f-c1', 'f-c2', 'f-c3', 'f-c4'];
    let strip = '';
    for (let i = 0; i < 7; i++) {
      const x = 18 + i * 38;
      strip += bar(x, 90, 30, 36, tone[i % 4]);
      for (let k = 0; k < 2; k++) {
        strip += bar(x + 4, k ? 130 : 80, 7, 6, 'f-dark');
        strip += bar(x + 19, k ? 130 : 80, 7, 6, 'f-dark');
      }
    }
    return svg(`
      ${bar(10, 74, 268, 68, 'f-dark')}
      <g>${strip}</g>
      ${bar(10, 74, 118, 68, 'f-ground', 'opacity=".86"')}
      ${bar(128, 74, 46, 68, 'f-ground', 'opacity=".45"')}
      <g class="after">
        <circle cx="286" cy="108" r="52" class="f-dark"/>
        <circle cx="286" cy="108" r="50" fill="none" class="s-tint"/>
        <circle cx="286" cy="108" r="30" fill="none" class="s-tint" opacity=".5"/>
        <circle cx="286" cy="108" r="11" class="f-teal"/>
        <path d="M278 160 C300 150 316 128 318 108" fill="none" class="s-tint" opacity=".45"/>
        ${bar(70, 196, 200, 2, 'f-tint')}
      </g>
      <g class="pass">${passBand(10, 120, 268)}</g>`);
  }

  function svg(inner) {
    return `<svg viewBox="0 0 360 220" role="presentation" focusable="false">${inner}</svg>`;
  }

  const DRAWS = [draw1, draw2, draw3, draw4, draw5, draw6];

  root.innerHTML = `
    <div class="jfly__sky" aria-hidden="true">
      <canvas class="jfly__canvas"></canvas>
      <div class="jfly__flash"></div>
    </div>
    <div class="jfly__hold">
      <div class="jfly__panel">
        <h2 class="jfly__title" id="jfly-title">${J.title}</h2>
        <div class="jfly__col">
          <div class="jfly__list">
            <ol class="jfly__steps">
              ${STEPS.map((s, i) => `
                <li class="jfly__step${i === 0 ? ' is-on' : ''}" data-i="${i}"${i === 0 ? ' aria-current="step"' : ''}>
                  <h3><button class="jfly__btn" type="button" data-i="${i}">
                    <span class="jfly__n">${s.n}</span><span class="jfly__ttl">${s.title}</span>
                  </button></h3>
                  <div class="jfly__fold"><p class="jfly__body"><span>${s.body}</span></p></div>
                  <figure class="jfly__draw">${DRAWS[i]()}</figure>
                </li>`).join('')}
            </ol>
          </div>
        </div>
      </div>
    </div>`;

  const sky = root.querySelector('.jfly__sky');
  const canvas = root.querySelector('.jfly__canvas');
  const flash = root.querySelector('.jfly__flash');
  const list = root.querySelector('.jfly__list');
  const stepEls = [...root.querySelectorAll('.jfly__step')];

  /* null, not -1: flat mode clears the list with setActive(-1), and starting at
     -1 would make that a no-op and leave aria-current on the first step. */
  let active = null;
  function setActive(i) {
    if (i === active) return;
    active = i;
    stepEls.forEach((el, k) => {
      el.classList.toggle('is-on', k === i);
      if (k === i) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  }

  /* A step title is a real button, so the list doubles as the section's own
     nav: keyboard or click puts you at that waypoint. */
  root.querySelectorAll('.jfly__btn').forEach((b) => {
    b.addEventListener('click', () => {
      const i = +b.dataset.i;
      if (root.classList.contains('jfly--flat')) {
        const li = stepEls[i];
        if (KL.lenis) KL.lenis.scrollTo(li, { offset: -80 });
        else li.scrollIntoView({ block: 'center' });
        return;
      }
      const span = root.offsetHeight - window.innerHeight;
      const y = root.offsetTop + span * (INTRO_P + (i + 0.42) * WIN);
      if (KL.lenis) KL.lenis.scrollTo(y);
      else window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  /* ================================================================== flat
     Built first and on purpose: it is what anyone on reduced motion, an old
     phone or a dead GL context actually gets, and it has to make the same
     argument on its own. */
  function flat() {
    root.classList.add('jfly--flat');
    root.classList.remove('jfly--3d');
    setActive(-1);
    if (!KL.ScrollTrigger || KL.reduced) return;
    stepEls.forEach((el) => {
      KL.ScrollTrigger.create({
        trigger: el,
        start: 'top 78%',
        end: 'bottom 20%',
        onToggle: (self) => el.classList.toggle('is-near', self.isActive),
      });
    });
  }

  if (!K.supported() || KL.reduced || !KL.paint) { flat(); return; }

  /* =================================================================== 3D */
  root.classList.add('jfly--3d');

  let stage;
  try {
    stage = K.makeStage(canvas, { fov: 42, fog: K.C.ink, fogNear: 10, fogFar: 70 });
  } catch (e) {
    flat();
    return;
  }
  THREE = stage.THREE;
  const { scene, camera, renderer } = stage;
  camera.far = 220;
  camera.updateProjectionMatrix();

  const C = K.C;
  /* The pass, the read receipts and the ticked shots are all the same idea: a
     thing is done. They take the brand's accent, which is the teal tint in the
     colour brand and the signal red in mono, where teal tint is plain white and
     would vanish against a paper card. */
  const ACCENT = (() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
    if (!m) return C.tealTint;
    const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    return parseInt(h, 16);
  })();
  const lights = K.lightRig(scene);
  /* The stations are flat faces pointed at the camera. The kit's rig is lit for
     a set seen in the round, so they need one light of their own or every paper
     card comes back brown. */
  const front = new THREE.DirectionalLight(C.paper, 0.5);
  front.position.set(0.4, 0.6, 3);
  scene.add(front);

  /* ---- shared geometry and materials.
     Three geometries and a dozen materials carry the whole world: a plate is
     the unit 1x1 plane scaled, so six stations cost almost nothing to build
     and nothing to keep. */
  const PLANE = new THREE.PlaneGeometry(1, 1);
  const DISC = new THREE.CircleGeometry(0.5, 18);
  const std = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  /* The greys of the set are mixed out of the brand's own ink and paper rather
     than typed, so the mono brand gets neutral greys and the colour brand gets
     the warm ones, from the same line. */
  const mix = (a, b, t) => {
    const ch = (sh) => Math.round((((a >> sh) & 255) * (1 - t)) + (((b >> sh) & 255) * t));
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  };

  const M = {
    paper: std(C.paper, 0.9),
    teal: std(C.teal, 0.7),
    deep: std(C.tealDeep, 0.8),
    tint: std(C.tealTint, 0.6),
    dark: std(mix(C.ink, C.paper, 0.055), 0.95),
    dim: std(mix(C.ink, C.paper, 0.135), 0.95),
    accent: std(ACCENT, 0.7),
    midGrey: std(mix(C.ink, C.paper, 0.42), 0.85),
    ground: std(mix(C.ink, C.paper, 0.04), 1),
    floor: std(mix(C.ink, C.paper, 0.1), 1),
    lit: new THREE.MeshBasicMaterial({ color: C.tealTint }),
    done: new THREE.MeshBasicMaterial({ color: ACCENT }),
    sig: new THREE.MeshBasicMaterial({ color: C.signal }),
  };
  const TONES = [M.teal, M.accent, M.paper, M.midGrey];

  function plate(w, h, mat, x, y, z, parent) {
    const m = new THREE.Mesh(PLANE, mat);
    m.scale.set(w, h, 1);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }
  function disc(r, mat, x, y, z, parent) {
    const m = new THREE.Mesh(DISC, mat);
    m.scale.setScalar(r * 2);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }

  /* ---- the AI signature.
     The same bar, the same colour, the same direction, six times: it travels
     down the object and what it has crossed is organised. One object per
     station so they can be told to fade independently. */
  function makePass(w, h, y0 = 0) {
    const g = new THREE.Group();
    const edge = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true });
    const haze = new THREE.MeshBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0.22, depthWrite: false,
    });
    const hz = Math.min(h * 0.16, 0.55);
    plate(w, 0.03, edge, 0, 0, 0.04, g);
    plate(w, hz, haze, 0, -hz / 2, 0.03, g);
    g.visible = false;
    g.y0 = y0;                       // the middle of the object it travels over
    g.at = (t) => {
      const on = t > 0.001 && t < 0.999;
      g.visible = on;
      if (!on) return;
      g.position.y = g.y0 + h / 2 - t * h;
      const k = Math.min(1, Math.min(t, 1 - t) * 7);
      edge.opacity = k;
      haze.opacity = k * 0.2;
    };
    return g;
  }

  /* ---- a readout, for the numbers a crew actually reads off the board. */
  function readout(w, h, px) {
    const el = document.createElement('canvas');
    el.width = 512; el.height = Math.round(512 * (h / w));
    const ctx = el.getContext('2d');
    const tex = new THREE.CanvasTexture(el);
    tex.anisotropy = 4;
    const mesh = plate(w, h, new THREE.MeshBasicMaterial({ map: tex, transparent: true }), 0, 0, 0);
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    let last = null;
    mesh.say = (big, unit) => {
      const key = big + '|' + unit;
      if (key === last) return;
      last = key;
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.fillStyle = hex(C.paper);
      ctx.font = `900 ${px}px Cairo, system-ui, sans-serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(big, 0, px);
      ctx.fillStyle = hex(C.tealTint);
      ctx.font = `500 ${Math.round(px * 0.3)}px "IBM Plex Mono", monospace`;
      ctx.fillText(unit, px * big.length * 0.66, px);
      tex.needsUpdate = true;
    };
    return mesh;
  }

  /* ---- station 0: the set, and the board at the lens -------------------- */
  const set = new THREE.Group();
  scene.add(set);

  plate(70, 150, M.ground, 0, 0, -50, set).rotation.x = -Math.PI / 2;
  plate(23, 9.5, M.deep, 0, 4.2, -8.2, set);            // the cyc behind the set
  const pool = disc(5.4, M.floor, 0, 0.012, -1.2, set);  // the pool of light it stands on
  pool.rotation.x = -Math.PI / 2;

  const filmCam = K.makeSetPiece('camera');
  filmCam.position.set(1.55, 0, 0.7);
  filmCam.rotation.y = Math.atan2(-1.55, -3.3);   // its lens aimed at the board
  set.add(filmCam);
  [['light', -3.6, -1.4, 0], ['light', 3.8, -2.6, 0.3], ['flag', -2.4, 1.9, 0.2]].forEach(([k, x, z, ry]) => {
    const p = K.makeSetPiece(k);
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    set.add(p);
  });
  const track = K.makeSetPiece('track');
  track.position.set(0.6, 0, 2.6);
  set.add(track);
  [[2.0, 1.7, 0.4], [-1.6, -1.6, -0.6], [3.1, 0.3, 0.9]].forEach(([x, z, ry]) => {
    const p = K.makeSetPiece('crew');
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    set.add(p);
  });

  /* The board at the lens: it rises into the shot, takes the teal pass once to
     introduce the signature, and then we fly straight through it. */
  const hero = K.makeSlate({ fields: [['PRODUCTION', 'KLAKET'], ['SCENE', '01'], ['TAKE', '01'], ['ROLL', 'A'], ['DIRECTOR', 'YOU'], ['DAY', '1/1']] });
  hero.position.set(0, 1.56, -2.6);
  hero.clap(0.78);
  set.add(hero);
  const heroPass = makePass(2.05, 1.4);
  heroPass.position.set(0, 0, -2.52);
  set.add(heroPass);

  /* ---- the six stations ------------------------------------------------- */
  const SP = [];   // station anchors, laid out as a corridor with a lateral swing
  for (let i = 0; i < 6; i++) {
    const x = i < 4 ? (i % 2 ? 5.4 : -5.4) : 0;
    SP.push(new THREE.Vector3(x, 1.65, -16 - i * 15));
  }

  function station(i, build) {
    const g = new THREE.Group();
    g.position.copy(SP[i]);
    scene.add(g);
    const api = build(g);
    api.group = g;
    return api;
  }

  const tiny = small();
  /* Every station is built to the same half width, so one fit factor frames
     all six the same way on any window. */
  const STATION_HALF = 3.6;

  /* 01 scraps drift in and resolve into one structured brief card. */
  const st1 = station(0, (g) => {
    const card = new THREE.Group();
    plate(3.7, 4.5, M.paper, 0, 0, 0, card);
    plate(3.7, 0.68, M.teal, 0, 1.91, 0.01, card);
    plate(1.4, 0.18, M.paper, -1.0, 1.91, 0.02, card);
    const rows = [];
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Group();
      plate(0.88, 0.12, M.teal, -1.2, 0, 0.02, r);
      plate(i === 4 ? 1.1 : 1.8, 0.24, M.dim, i === 4 ? 0.05 : 0.4, -0.02, 0.02, r);
      r.position.y = 1.2 - i * 0.66;
      r.scale.x = 0;
      card.add(r);
      rows.push(r);
    }
    g.add(card);

    const scraps = [];
    const deck = new THREE.Group();
    plate(1.7, 1.08, M.dark, 0, 0, 0, deck);
    plate(0.9, 0.12, M.tint, -0.3, 0.3, 0.01, deck);
    [0.06, -0.14, -0.34].forEach((y, k) => plate(1.2 - k * 0.3, 0.07, M.dim, -0.15 - k * 0.1, y, 0.01, deck));
    scraps.push([deck, new THREE.Vector3(-7.2, 2.6, 3.4), new THREE.Vector3(-1.2, 0.8, 0.6)]);

    const note = new THREE.Group();
    plate(1.9, 0.5, M.dark, 0, 0, 0, note);
    for (let i = 0; i < 13; i++) {
      const h = 0.07 + ((i * 7) % 11) * 0.025;
      plate(0.05, h, M.tint, -0.78 + i * 0.13, 0, 0.01, note);
    }
    scraps.push([note, new THREE.Vector3(7.4, -1.9, 3.0), new THREE.Vector3(1.1, -0.2, 0.7)]);

    const para = new THREE.Group();
    plate(1.5, 1.1, M.dark, 0, 0, 0, para);
    [0.34, 0.14, -0.06, -0.26].forEach((y, k) => plate(1.1 - (k % 2) * 0.35, 0.07, M.dim, -0.1 - (k % 2) * 0.17, y, 0.01, para));
    scraps.push([para, new THREE.Vector3(0.4, 5.2, 4.2), new THREE.Vector3(-0.3, -1.3, 0.8)]);

    scraps.forEach(([m, from]) => { m.position.copy(from); g.add(m); });

    const pass = makePass(3.9, 4.6);
    pass.position.z = 0.06;
    g.add(pass);

    return {
      update(t) {
        const fly = outCubic(seg(t, 0, 0.44));
        const p = seg(t, 0.32, 0.8);
        scraps.forEach(([m, from, to], k) => {
          m.position.lerpVectors(from, to, fly);
          m.rotation.z = lerp(0.5 - k * 0.4, 0.04, fly);
          /* The pass takes them as it crosses: scale, not opacity, so no
             station needs a transparent material. */
          const gone = cl((p - 0.12 - k * 0.14) * 4);
          m.scale.setScalar(Math.max(0.0001, 1 - gone));
          m.visible = gone < 0.99;
        });
        rows.forEach((r, k) => { r.scale.x = outCubic(cl((p - 0.1 - k * 0.13) * 4.5)); });
        pass.at(p);
        card.rotation.y = lerp(-0.22, 0, outCubic(seg(t, 0.1, 0.9)));
      },
    };
  });

  /* 02 the script's lines light up and separate into four tagged piles. */
  const st2 = station(1, (g) => {
    const page = new THREE.Group();
    plate(2.7, 3.9, M.paper, 0, 0, 0, page);
    plate(0.8, 0.12, M.teal, -0.85, 1.65, 0.01, page);
    const N = tiny ? 11 : 15;
    const lines = [];
    for (let i = 0; i < N; i++) {
      const w = 0.6 + ((i * 37) % 70) / 60;
      const row = new THREE.Group();
      const ln = plate(w, 0.1, M.dim, -1.1 + w / 2, 0, 0.01, row);
      const chip = plate(0.14, 0.12, TONES[i % 4], -1.52, 0, 0.02, row);
      chip.scale.set(0.0001, 0.12, 1);
      row.position.y = 1.35 - i * (2.8 / N);
      page.add(row);
      lines.push({ row, ln, chip, w, y: row.position.y });
    }
    g.add(page);

    const piles = [];
    [[-2.35, 1.05], [2.35, 1.05], [-2.35, -1.05], [2.35, -1.05]].forEach(([x, y], i) => {
      const p = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        plate(1.15, 0.78, k === 2 ? TONES[i] : M.dim, k * 0.06, k * 0.06, k * 0.01, p);
      }
      p.position.set(x, y, 0.4);
      p.scale.setScalar(0.0001);
      g.add(p);
      piles.push(p);
    });

    const pass = makePass(2.9, 4.0);
    pass.position.z = 0.06;
    g.add(pass);

    return {
      update(t) {
        const p = seg(t, 0.08, 0.72);
        const y0 = 1.95 - p * 3.9;
        lines.forEach((l, i) => {
          const lit = l.y > y0;
          l.ln.material = lit ? M.teal : M.dim;
          l.chip.scale.x = lit ? 0.14 : 0.0001;
          /* The line stays and keeps its tag colour; a copy of the tag is what
             travels to the pile that claims it. */
          const k = outCubic(cl((seg(t, 0.5, 1) - (i / lines.length) * 0.4) * 2.4));
          const pile = piles[i % 4];
          l.chip.position.x = lerp(-1.52, pile.position.x, lit ? k : 0);
          l.chip.position.y = lerp(0, pile.position.y - l.y, lit ? k : 0);
          l.chip.position.z = 0.02 + (lit ? k : 0) * 0.38;
        });
        piles.forEach((p, i) => {
          p.scale.setScalar(Math.max(0.0001, outCubic(cl((seg(t, 0.5, 1) - i * 0.07) * 2.4))));
        });
        pass.at(p);
      },
    };
  });

  /* 03 strips slide into order and the day count comes down with them. */
  const st3 = station(2, (g) => {
    plate(6.4, 3.9, M.dark, 0, -0.45, 0, g);
    const COLS = 3, ROWS = tiny ? 6 : 9;
    const strips = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const m = plate(1.82, 0.22, TONES[(c + r) % 4], 0, 0, 0.02, g);
        const tx = -2.05 + c * 2.05;
        const ty = 1.0 - r * (3.0 / ROWS);
        const fx = tx + (((c * 11 + r * 5) % 13) - 6) * 0.28;
        const fy = ty - 0.4 - ((c * 7 + r * 3) % 9) * 0.1;
        strips.push({ m, tx, ty, fx, fy, rot: (((c * 7 + r * 13) % 11) - 5) * 0.06, ord: (ROWS - r) / ROWS + c * 0.04 });
        m.position.set(fx, fy, 0.02);
        m.rotation.z = (((c * 7 + r * 13) % 11) - 5) * 0.06;
      }
    }
    const days = readout(1.15, 0.58, 180);
    days.position.set(2.0, 1.85, 0.1);
    days.say('12', 'DAYS');
    g.add(days);

    const pass = makePass(6.6, 4.0, -0.45);
    pass.position.z = 0.08;
    g.add(pass);

    return {
      update(t) {
        const p = seg(t, 0.06, 0.78);
        const y0 = 2.2 - p * 4.4;
        strips.forEach((s) => {
          const k = outCubic(cl((y0 < s.ty ? (s.ty - y0) * 1.6 : 0)));
          s.m.position.set(lerp(s.fx, s.tx, k), lerp(s.fy, s.ty, k), 0.02);
          s.m.rotation.z = s.rot * (1 - k);
          s.m.material = k > 0.6 ? TONES[Math.round(s.ord * 3) % 4] : M.dim;
        });
        const settled = strips.filter((s) => s.ty > y0).length / strips.length;
        days.say(String(Math.round(lerp(12, 9, settled))), 'DAYS');
        pass.at(p);
      },
    };
  });

  /* 04 one call sheet multiplies out to the crew and the receipts light up. */
  const st4 = station(3, (g) => {
    const sheet = new THREE.Group();
    plate(2.1, 2.9, M.paper, 0, 0, 0, sheet);
    plate(2.1, 0.44, M.teal, 0, 1.22, 0.01, sheet);
    plate(0.85, 0.12, M.paper, -0.55, 1.22, 0.02, sheet);
    for (let i = 0; i < 6; i++) plate(i === 5 ? 0.8 : 1.5, 0.11, M.dim, i === 5 ? -0.68 : -0.33, 0.7 - i * 0.33, 0.02, sheet);
    sheet.position.set(-2.1, 0, 0);
    g.add(sheet);

    const N = tiny ? 8 : 12;
    const copies = [], marks = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 1.5 - Math.PI * 0.75;
      const rad = 3.3 + (i % 3) * 0.5;
      const at = new THREE.Vector3(1.75 + Math.cos(a) * 0.8, Math.sin(a) * 1.95, 0.3);

      const c = new THREE.Group();
      plate(0.62, 0.86, M.paper, 0, 0, 0, c);
      plate(0.62, 0.15, M.teal, 0, 0.35, 0.01, c);
      c.add(plate(0.4, 0.06, M.dim, -0.06, 0.05, 0.01));
      g.add(c);
      copies.push({ c, at, a, rad });

      const mk = disc(0.075, M.dim, at.x + 0.14, at.y - 0.2, 0.34, g);
      marks.push(mk);
    }

    const pass = makePass(2.3, 3.0, 0);
    pass.position.set(-2.1, 0, 0.06);
    g.add(pass);

    return {
      update(t) {
        const p = seg(t, 0.04, 0.46);
        pass.at(p);
        const go = seg(t, 0.38, 1);
        copies.forEach(({ c, at }, i) => {
          const k = outCubic(cl((go - (i / copies.length) * 0.45) * 2.2));
          c.visible = k > 0.001;
          c.position.set(lerp(-2.1, at.x, k), lerp(0, at.y, k), lerp(0.08, at.z, k));
          c.scale.setScalar(Math.max(0.0001, lerp(1.2, 0.7, k)));
          c.rotation.z = lerp(0, (i % 2 ? 0.3 : -0.3), k);
          /* The receipt lights the moment its sheet lands. */
          marks[i].visible = k > 0.5;
          marks[i].material = k > 0.92 ? M.done : M.dim;
          marks[i].scale.setScalar(k > 0.92 ? 0.18 : 0.15);
        });
      },
    };
  });

  /* 05 Action: the board claps, the flash, the shots tick off. */
  let flashAmt = 0;
  const st5 = station(4, (g) => {
    const slate = K.makeSlate({ fields: [['PRODUCTION', 'KLAKET'], ['SCENE', '14'], ['TAKE', '03'], ['ROLL', 'B'], ['DIRECTOR', 'YOU'], ['DAY', '6/9']] });
    slate.clap(0.5);
    slate.position.set(-0.45, 0.1, 0);
    g.add(slate);

    const N = 8;
    const ticks = [];
    plate(0.72, 2.5, M.dark, 1.45, 0, -0.01, g);
    for (let i = 0; i < N; i++) {
      const m = plate(0.26, 0.26, M.dim, 1.45, 1.05 - i * 0.3, 0, g);
      ticks.push(m);
    }
    /* The one use of signal in the whole scene: the camera is rolling. */
    const rec = disc(0.09, M.sig, 0.3, 0.4, 0.1, g);

    const pass = makePass(2.05, 1.4, 0.14);
    pass.position.set(-0.45, 0, 0.1);
    g.add(pass);

    return {
      update(t) {
        pass.at(seg(t, 0.03, 0.34));
        const shut = inOut(seg(t, 0.34, 0.46));
        slate.clap(lerp(0.5, 1, shut));
        const hit = seg(t, 0.44, 0.52) * (1 - seg(t, 0.46, 0.62));
        flashAmt = Math.max(flashAmt, hit * 1.6);
        rec.scale.setScalar(t > 0.44 ? 0.22 : 0.18);
        const done = seg(t, 0.5, 1) * N;
        ticks.forEach((m, i) => {
          const on = done > i + 0.4;
          m.material = on ? M.done : M.dim;
          m.scale.set(on ? 0.26 : 0.19, on ? 0.26 : 0.19, 1);
        });
      },
    };
  });

  /* 06 the strip winds onto the reel and the set goes dark and calm. */
  const st6 = station(5, (g) => {
    const strip = K.makeFilmStrip({ frames: tiny ? 5 : 7, w: 0.78, h: 0.5, gap: 0.05 });
    strip.position.set(-1.5, 0.3, 0);
    g.add(strip);

    const reel = new THREE.Group();
    disc(1.15, M.dark, 0, 0, 0, reel);
    disc(0.9, M.teal, 0, 0, 0.01, reel);
    disc(0.26, M.accent, 0, 0, 0.02, reel);
    for (let i = 0; i < 6; i++) {
      const s = plate(0.14, 0.62, M.dark, 0, 0, 0.03, reel);
      s.position.set(Math.cos(i / 6 * Math.PI * 2) * 0.58, Math.sin(i / 6 * Math.PI * 2) * 0.58, 0.03);
      s.rotation.z = i / 6 * Math.PI * 2 + Math.PI / 2;
    }
    reel.position.set(0.75, 0.3, 0.1);
    g.add(reel);

    const calm = plate(6.4, 0.035, M.lit, 0, -1.9, 0.2, g);
    calm.scale.x = 0.0001;

    const pass = makePass(strip.width + 0.3, 1.3, 0.34);
    pass.position.set(-1.5, 0, 0.14);
    g.add(pass);

    return {
      update(t) {
        pass.at(seg(t, 0.02, 0.3));
        const wind = outCubic(seg(t, 0.26, 0.86));
        /* A tail of film stays on the reel: wound to nothing it reads as a
           bug rather than as a wrap. */
        strip.scale.x = 1 - wind * 0.86;
        strip.position.x = lerp(-1.5, 0.75, wind);
        reel.rotation.z = -wind * 7.5;
        calm.scale.x = outCubic(seg(t, 0.72, 1)) * 6.4;
      },
    };
  });

  const stations = [st1, st2, st3, st4, st5, st6];
  stations.forEach((s) => { s.update(0); s.group.visible = false; });

  /* ---- the camera path.
     Keyframes carry their own scroll position, so pacing is explicit: the
     fly-in gets 13% of the section and each station holds for most of its own
     window while the camera creeps in, then travels. The two Catmull-Rom
     curves (where the camera is, where it is pointed) are sampled at a u
     remapped from p, which is what keeps the holds from easing oddly. */
  const KF = [
    { p: 0.000, c: [11.6, 4.5, 13.0], l: [0.2, 1.5, -1.4] },
    { p: 0.048, c: [5.8, 3.0, 7.2], l: [0.5, 1.5, -1.8] },
    { p: 0.090, c: [2.9, 2.15, 2.5], l: [0.2, 1.55, -2.4] },
    { p: 0.118, c: [0.88, 1.72, 0.05], l: [0.0, 1.56, -2.6] },
    { p: 0.132, c: [0.12, 1.62, -1.7], l: [0.0, 1.60, -6.5] },
  ];
  SP.forEach((s, i) => {
    const a = INTRO_P + i * WIN;
    KF.push({ p: a + WIN * 0.30, c: [s.x, s.y + 0.08, s.z + 7.4], l: [s.x, s.y, s.z] });
    KF.push({ p: a + WIN * 0.94, c: [s.x, s.y + 0.02, s.z + 5.7], l: [s.x, s.y, s.z] });
  });
  const lastS = SP[SP.length - 1];
  KF.push({ p: 1.0, c: [0, lastS.y + 1.5, lastS.z + 3.2], l: [lastS.x, lastS.y, lastS.z] });

  const PS = KF.map((k) => k.p);
  const curveC = new THREE.CatmullRomCurve3(KF.map((k) => new THREE.Vector3(...k.c)), false, 'centripetal', 0.5);
  const curveL = new THREE.CatmullRomCurve3(KF.map((k) => new THREE.Vector3(...k.l)), false, 'centripetal', 0.5);

  function uFromP(p) {
    const n = PS.length;
    if (p <= PS[0]) return 0;
    if (p >= PS[n - 1]) return 1;
    let i = 0;
    while (i < n - 2 && p > PS[i + 1]) i++;
    const f = (p - PS[i]) / (PS[i + 1] - PS[i]);
    return (i + f) / (n - 1);
  }

  /* ---- the route line.
     A thin tube on the camera's own path, dropped below eye level so the
     camera can see the road it is on, drawn only as far as it has travelled. */
  const routePts = curveC.getPoints(300).map((v) => new THREE.Vector3(v.x, v.y - 1.45, v.z));
  const routeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePts), 300, 0.028, 5, false);
  const route = new THREE.Mesh(routeGeo, new THREE.MeshBasicMaterial({
    color: C.tealTint, transparent: true, opacity: 0.85,
  }));
  scene.add(route);
  const TUBE_SEGS = 300;
  const PER_SEG = routeGeo.index.count / TUBE_SEGS;
  const head = disc(0.055, M.lit, 0, 0, 0, scene);
  const headGlow = new THREE.Mesh(DISC, new THREE.MeshBasicMaterial({
    color: C.tealTint, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  headGlow.scale.setScalar(0.2);
  scene.add(headGlow);

  /* ---- the frame.
     One function, run only while the section is on screen. Progress comes
     straight off the section's rect, so nothing can go stale on a refresh,
     and it is eased once more on top of Lenis so the camera has a little drag. */
  const posV = new THREE.Vector3();
  const lookV = new THREE.Vector3();
  let cur = 0, target = 0, railP = -1;

  function progress() {
    const r = root.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    return span > 0 ? cl(-r.top / span) : 0;
  }

  function frame() {
    target = progress();
    cur += (target - cur) * 0.16;
    if (Math.abs(target - cur) < 0.0002) cur = target;
    const p = cur;

    /* camera */
    const u = uFromP(p);
    curveC.getPoint(u, posV);
    curveL.getPoint(u, lookV);
    camera.position.copy(posV);
    camera.lookAt(lookV);
    /* The step column owns the left of the screen, so the subject is pushed
       off centre by a fraction of the frame width rather than by moving it. */
    const half = posV.distanceTo(lookV) * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    const phone = small();
    if (!phone) camera.translateX(-half * 0.34);
    /* A station is built 3.2 wide either side of its anchor. On a narrow or a
       tall window there is not that much frame left once the column has taken
       its share, so the whole station is scaled to what is there. */
    const fit = Math.min(1, (half * (phone ? 0.92 : 0.66)) / STATION_HALF);

    /* the route, and its head running just ahead of us */
    const onRoute = p > 0.145 && p < INTRO_P + 5.3 * WIN;
    route.visible = head.visible = headGlow.visible = onRoute;
    let a0 = Math.floor(u * TUBE_SEGS);
    for (let n = 0; n < 140 && a0 < TUBE_SEGS - 2; n++) {
      if (routePts[a0].distanceToSquared(camera.position) > 26) break;
      a0++;
    }
    const a1 = Math.min(TUBE_SEGS, a0 + 60);
    routeGeo.setDrawRange(a0 * PER_SEG, (a1 - a0) * PER_SEG);
    const hu = a1 / TUBE_SEGS;
    curveC.getPoint(hu, posV);
    head.position.set(posV.x, posV.y - 1.45, posV.z);
    headGlow.position.copy(head.position);
    head.lookAt(camera.position);
    headGlow.lookAt(camera.position);

    /* the overture: the board rises into the lens, takes the pass, and we fly
       through it */
    const rise = outCubic(seg(p, 0.03, 0.115));
    hero.position.y = lerp(0.85, 1.56, rise);
    hero.rotation.y = lerp(0.42, 0, rise);
    hero.rotation.z = lerp(0.1, 0, rise);
    heroPass.y0 = hero.position.y - 0.06;
    heroPass.at(seg(p, 0.075, 0.128));
    const toBoard = Math.abs(camera.position.z + 2.6);   // posV has moved on to the route head
    if (p > 0.1 && p < 0.22 && toBoard < 1.5) flashAmt = Math.max(flashAmt, (1 - toBoard / 1.5) * 1.9);
    set.visible = p < INTRO_P + WIN * 0.7;

    /* the fog opens for the wide shot and closes for the corridor */
    if (scene.fog) scene.fog.far = lerp(74, 25, seg(p, 0.04, 0.14));

    /* stations: only the one we are at and its neighbour are drawn */
    stations.forEach((s, i) => {
      const a = INTRO_P + i * WIN;
      const t = cl((p - a) / WIN);
      const near = p > a - WIN * 0.34 && p < a + WIN * 1.3;
      s.group.visible = near;
      if (near) { s.group.scale.setScalar(fit); s.update(t); }
    });

    /* The set goes dark over the last station: the rig comes down and the reel
       is the last thing lit. Driven off p, so scrolling back up brings it up. */
    const dark = seg(p, INTRO_P + 5.55 * WIN, 1);
    lights.key.intensity = lerp(1.5, 0.26, dark);
    lights.fill.intensity = lerp(0.6, 0.12, dark);
    lights.rim.intensity = lerp(0.9, 0.74, dark);

    /* the step list and its rail */
    setActive(Math.min(STEPS.length - 1, Math.floor(Math.max(0, p - INTRO_P) / WIN)));
    const rp = Math.round(cl((p - INTRO_P * 0.5) / (1 - INTRO_P * 0.5)) * 200) / 200;
    if (rp !== railP) { railP = rp; list.style.setProperty('--jfly-p', String(rp)); }

    if (flashAmt > 0.001) {
      flash.style.opacity = String(Math.min(0.92, flashAmt));
      flashAmt *= 0.82;
    } else if (flash.style.opacity !== '0') {
      flash.style.opacity = '0';
      flashAmt = 0;
    }

    renderer.render(scene, camera);
  }

  /* ---- play, pause, teardown.
     Rendering stops the instant the section leaves the viewport, the way
     core/companies.js parks its marquee. */
  let release = null;
  function play() {
    if (release) return;
    sky.classList.add('is-live');
    stage.resize();
    release = KL.paint(frame);
  }
  function pause() {
    if (!release) return;
    release();
    release = null;
    sky.classList.remove('is-live');
  }

  if (KL.ScrollTrigger) {
    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? play() : pause()),
    });
    if (KL.ScrollTrigger.isInViewport(root)) play();
  } else {
    play();
  }

  /* A lost context must not leave a dead rectangle where the argument was. */
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    pause();
    flat();
  });

  window.addEventListener('pagehide', () => {
    pause();
    [PLANE, DISC].forEach((g) => g.dispose());
    stage.dispose();
  }, { once: true });
})();
