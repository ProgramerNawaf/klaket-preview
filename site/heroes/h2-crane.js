/* Hero 2: crane down the set.
   One move, start to finish: high and wide over a working set, then down and in
   until the slate fills the frame. It plays once on load and the rest of it is
   handed to the scroll, so the page itself finishes the shot. */
import * as K from '../core/three-kit.js';

const root = document.querySelector('.hero-crane');
if (root) build(root);

function build(root) {
  const D = window.KLDATA;
  root.innerHTML = `
    <div class="hero-crane__stage" aria-hidden="true"></div>
    <p class="hero-crane__stamp data" aria-hidden="true">SC 01 &middot; TK 01 &middot; ROLL A</p>
    <div class="hero-crane__copy">
      <h1 data-reveal="up">${D.hero.slogan}</h1>
      <p class="hero-crane__ar ar" dir="rtl" lang="ar" data-reveal="up">${D.hero.sloganAr}</p>
      <p class="lede hero-crane__lede" data-reveal="up">${D.hero.lede}</p>
      <div class="hero-crane__cta" data-reveal="up">
        <a class="btn" href="${D.hero.primary.href}">${D.hero.primary.label}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a class="btn btn--ghost" href="${D.hero.secondary.href}">${D.hero.secondary.label}</a>
      </div>
    </div>`;

  const stage = root.querySelector('.hero-crane__stage');
  const g = window.KL && KL.gsap;

  if (!K.supported()) { flat(stage); if (window.KL) KL.autoReveal(root); return; }

  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);

  let S;
  try {
    S = K.makeStage(canvas, { fov: 44, fog: 0x0B0B0B, fogNear: 10, fogFar: 40 });
  } catch (e) { canvas.remove(); flat(stage); if (window.KL) KL.autoReveal(root); return; }

  const { THREE, scene, camera, start, dispose } = S;
  K.lightRig(scene);

  /* A pool of light on the floor: the set is only lit where the work is. */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(16, 48),
    new THREE.MeshStandardMaterial({ color: 0x17201F, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  /* The set, dressed once. Positions are hand placed rather than random so the
     crane move always finds the same composition. */
  const set = new THREE.Group();
  const put = (kind, x, z, ry = 0, s = 1) => {
    const p = K.makeSetPiece(kind);
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    p.scale.setScalar(s);
    set.add(p);
    return p;
  };
  put('track', 0, 2.2);
  put('camera', -2.6, 1.4, 0.55);
  put('light', 3.4, -1.2, 0, 1.15);
  put('light', -4.2, -2.4, 0, 0.95);
  put('flag', 2.2, -3.1, -0.4);
  put('flag', -2.9, -3.6, 0.3);
  [[-1.5, -0.4], [0.9, -1.1], [-3.4, 0.6], [2.9, 1.1], [0.2, 2.9]].forEach(([x, z], i) => put('crew', x, z, i * 1.1, 0.95 + (i % 3) * 0.06));
  scene.add(set);

  /* The slate is held up in front of the lens, where a second AC would hold it. */
  const slate = K.makeSlate();
  slate.scale.setScalar(0.52);
  slate.position.set(-1.5, 1.35, 2.9);
  slate.rotation.y = 0.34;
  scene.add(slate);

  /* The crane path: a high wide three quarter, down to the slate at eye level. */
  const FROM = { px: 6.5, py: 7.2, pz: 9.5, tx: 0, ty: 1.2, tz: 0 };
  const TO   = { px: -0.6, py: 1.6, pz: 5.2, tx: -1.5, ty: 1.35, tz: 2.9 };
  const shot = { t: 0 };
  const look = new THREE.Vector3();

  function frame() {
    const t = shot.t;
    camera.position.set(
      FROM.px + (TO.px - FROM.px) * t,
      FROM.py + (TO.py - FROM.py) * t,
      FROM.pz + (TO.pz - FROM.pz) * t,
    );
    look.set(
      FROM.tx + (TO.tx - FROM.tx) * t,
      FROM.ty + (TO.ty - FROM.ty) * t,
      FROM.tz + (TO.tz - FROM.tz) * t,
    );
    camera.lookAt(look);
  }
  frame();

  start(() => {
    /* The reels on the set camera keep turning: the set is working, not posed. */
    set.children.forEach((p) => { if (p.children.length > 5) p.rotation.y += 0.00002; });
  });
  window.addEventListener('pagehide', dispose, { once: true });

  if (!g || KL.reduced) { shot.t = 1; frame(); slate.clap(1); if (window.KL) KL.autoReveal(root); return; }

  const tl = g.timeline();
  tl.to(shot, { t: 0.72, duration: 3.1, ease: 'power2.inOut', onUpdate: frame })
    .to(shot, { t: 1, duration: 1.1, ease: 'power2.out', onUpdate: frame }, '>-0.3')
    .to({}, { duration: 0.1 })
    .add(() => { const s = { c: 0 }; g.to(s, { c: 1, duration: 0.3, ease: 'power3.in', onUpdate: () => slate.clap(s.c) }); });

  /* Past the hero the crane keeps creeping in, so leaving feels like the shot
     continuing rather than the page cutting. */
  KL.onScroll(() => {
    const r = root.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    camera.position.z = (FROM.pz + (TO.pz - FROM.pz) * shot.t) - p * 1.8;
  });

  KL.autoReveal(root);
}

/* No WebGL: the same composition, drawn. */
function flat(stage) {
  stage.innerHTML = `
    <div class="hero-crane__flat">
      <svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="1200" height="760" fill="var(--bg-deep)"/>
        <ellipse cx="600" cy="620" rx="520" ry="150" fill="var(--raised)"/>
        <g stroke="var(--surface)" stroke-width="7" fill="none">
          <path d="M250 640 H950"/><path d="M250 672 H950"/>
          ${Array.from({ length: 9 }, (_, i) => `<path d="M${270 + i * 80} 636 V676"/>`).join('')}
        </g>
        <g fill="var(--surface)">
          <rect x="300" y="430" width="14" height="210" rx="6"/>
          <rect x="248" y="358" width="118" height="80" rx="8"/>
          <circle cx="282" cy="330" r="30"/><circle cx="334" cy="330" r="30"/>
          <rect x="860" y="300" width="10" height="340" rx="5"/>
          <rect x="818" y="246" width="94" height="68" rx="8" fill="var(--paper)" opacity=".82"/>
          <rect x="120" y="360" width="9" height="280" rx="4"/>
          <rect x="84" y="316" width="80" height="58" rx="7" fill="var(--paper)" opacity=".6"/>
          ${[[520, 1], [640, 0.92], [760, 0.97], [430, 0.88]].map(([x, s]) => `
            <g transform="translate(${x} ${640 - 150 * s}) scale(${s})">
              <rect x="-16" y="40" width="32" height="76" rx="12"/><circle cy="18" r="17"/>
            </g>`).join('')}
        </g>
        <g transform="translate(372 300) rotate(-7)">
          <rect width="190" height="112" rx="7" fill="var(--teal)"/>
          <rect y="-22" width="190" height="22" rx="4" fill="var(--paper)" opacity=".82"/>
          ${[0, 1].map((r) => [0, 1, 2].map((c) => `<rect x="${14 + c * 60}" y="${26 + r * 42}" width="${34 - c * 5}" height="9" rx="3" fill="var(--paper)" opacity=".7"/>`).join('')).join('')}
        </g>
        <circle cx="880" cy="268" r="200" fill="var(--teal-tint)" opacity=".07"/>
      </svg>
    </div>`;
}
