/* The 3D kit. Everything in the four brand colours, built from boxes, planes and
   a couple of lathes: this is a flat graphic world that happens to have depth,
   not a render. Shared so that eight heroes and the journey all agree on what a
   Klaket clapperboard looks like.

   Import inside a module script:  import * as K from '../core/three-kit.js' */
import * as THREE from '../vendor/three.module.min.js';

/* The colours the 3D world is built from. The defaults are the colour brand;
   readPalette overwrites them from the CSS custom properties at import time, so
   switching to the mono brand moves the whole scene without any scene code
   knowing a second brand exists. The object is mutated rather than replaced
   because every module holds the same live binding to it. */
export const C = {
  ink:      0x121212,
  inkDeep:  0x0B0B0B,
  paper:    0xF6EBD9,
  teal:     0x0F5C57,
  tealDeep: 0x0A3F3C,
  tealTint: 0x5FA8A1,
  signal:   0xF2483A,
};

const TOKEN = {
  ink: '--ink', inkDeep: '--bg-deep', paper: '--paper', teal: '--teal',
  tealDeep: '--teal-deep', tealTint: '--teal-tint', signal: '--signal',
};

export function readPalette(el) {
  const cs = getComputedStyle(el || document.documentElement);
  for (const key in TOKEN) {
    const raw = cs.getPropertyValue(TOKEN[key]).trim();
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
    if (!m) continue;                      // rgba() and the like are left alone
    const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    C[key] = parseInt(h, 16);
  }
  return C;
}

readPalette();

export function supported() {
  if (window.KL && KL.reduced) return false;
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

/* ---------------------------------------------------------------- textures */

function canvas2d(w, h) {
  const el = document.createElement('canvas');
  el.width = w; el.height = h;
  return [el, el.getContext('2d')];
}

function hex(n) { return '#' + n.toString(16).padStart(6, '0'); }

/* The 45 degree stripes off the mark, as a tiling texture. */
export function stripeTexture(a = C.paper, b = C.ink, repeat = 8) {
  const S = 128;
  const [el, ctx] = canvas2d(S, S);
  ctx.fillStyle = hex(b);
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = hex(a);
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(-Math.PI / 4);
  for (let i = -S; i < S; i += S / 4) ctx.fillRect(i, -S, S / 8, S * 2);
  ctx.restore();
  const t = new THREE.CanvasTexture(el);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, 1);
  t.anisotropy = 4;
  return t;
}

/* The face of the board: the fields a crew actually fills in. */
export function slateTexture(fields) {
  const W = 1024, H = 640;
  const [el, ctx] = canvas2d(W, H);
  const texture = new THREE.CanvasTexture(el);

  function draw() {
    ctx.fillStyle = hex(C.teal);
    ctx.fillRect(0, 0, W, H);

    const rows = fields || [
      ['PRODUCTION', 'KLAKET'],
      ['SCENE', '01'], ['TAKE', '01'], ['ROLL', 'A'],
      ['DIRECTOR', 'YOU'], ['DATE', ''],
    ];
    const pad = 64;
    const colW = (W - pad * 2) / 3;

    ctx.textBaseline = 'alphabetic';
    rows.forEach((row, i) => {
      const col = i === 0 ? 0 : (i - 1) % 3;
      const line = i === 0 ? 0 : Math.floor((i - 1) / 3) + 1;
      const x = pad + col * colW;
      const y = 150 + line * 170;
      const w = i === 0 ? W - pad * 2 : colW - 40;

      ctx.font = '500 26px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(246,235,217,0.52)';
      ctx.fillText(row[0], x, y - 46);

      ctx.strokeStyle = 'rgba(246,235,217,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + w, y + 14); ctx.stroke();

      ctx.font = '900 64px Cairo, system-ui, sans-serif';
      ctx.fillStyle = hex(C.paper);
      ctx.fillText(row[1], x, y);
    });
    texture.needsUpdate = true;
  }

  draw();
  /* Cairo and Plex Mono arrive after the first paint; redraw once they do or the
     board is lettered in the fallback face forever. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  texture.anisotropy = 8;
  texture.redraw = draw;
  return texture;
}

/* ------------------------------------------------------------------ pieces */

/* The clapperboard. Returns a Group whose `clap` sets the stick angle from 0
   (open) to 1 (shut), so a caller can scrub it off scroll or fire it once. */
export function makeSlate(opts = {}) {
  const g = new THREE.Group();
  const W = 2.0, H = 1.18, D = 0.055, BAR = 0.26;

  const face = new THREE.MeshStandardMaterial({
    map: slateTexture(opts.fields),
    roughness: 0.72, metalness: 0.02,
  });
  const edge = new THREE.MeshStandardMaterial({ color: C.tealDeep, roughness: 0.8 });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, D),
    [edge, edge, edge, edge, face, edge],
  );
  body.position.y = -BAR / 2;
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  const stripes = stripeTexture(C.paper, C.ink, 7);
  const barMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.68 });
  const barEdge = new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.8 });

  /* The stick hinges at its left end, so the mesh is offset inside a pivot. */
  const pivot = new THREE.Group();
  pivot.position.set(-W / 2, H / 2 - BAR / 2, 0);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(W, BAR, D),
    [barEdge, barEdge, barEdge, barEdge, barMat, barEdge],
  );
  bar.position.set(W / 2, 0, 0);
  bar.castShadow = true;
  pivot.add(bar);
  g.add(pivot);

  /* The top of the board carries the same stripes, so a shut board reads as one. */
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(W, BAR, D * 0.9),
    [barEdge, barEdge, barEdge, barEdge, new THREE.MeshStandardMaterial({ map: stripeTexture(C.paper, C.ink, 7), roughness: 0.68 }), barEdge],
  );
  lip.position.y = H / 2 - BAR / 2 - BAR;
  g.add(lip);

  /* The pivot sits at the stick's left end and the bar runs out along +X, so a
     POSITIVE rotation about z lifts the far end. Negative drops it across the
     board's own face and hides the lettering. */
  const OPEN = 0.52;
  g.userData.open = OPEN;
  g.clap = (t) => { pivot.rotation.z = OPEN * (1 - Math.min(1, Math.max(0, t))); };
  g.clap(0);
  g.size = { W, H, BAR };
  g.dispose = () => {
    [body, bar, lip].forEach((m) => m.geometry.dispose());
    [face, edge, barMat, barEdge].forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
  };
  return g;
}

/* A length of film: a ribbon with sprocket holes punched down both edges. */
export function makeFilmStrip({ frames = 24, w = 1.1, h = 0.72, gap = 0.06 } = {}) {
  const g = new THREE.Group();
  const stripW = frames * (w + gap);
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(stripW, h * 1.46),
    new THREE.MeshStandardMaterial({ color: C.inkDeep, roughness: 0.9, side: THREE.DoubleSide }),
  );
  g.add(base);

  const frameGeo = new THREE.PlaneGeometry(w, h);
  const holeGeo = new THREE.PlaneGeometry(w * 0.13, h * 0.12);
  const holeMat = new THREE.MeshBasicMaterial({ color: C.ink });
  const tones = [C.teal, C.tealDeep, C.paper, C.tealTint];

  for (let i = 0; i < frames; i++) {
    const x = -stripW / 2 + w / 2 + i * (w + gap);
    const m = new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({
      color: tones[i % tones.length], roughness: 0.85,
    }));
    m.position.set(x, 0, 0.002);
    g.add(m);
    for (const sign of [1, -1]) {
      for (let k = -1; k <= 1; k++) {
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(x + k * w * 0.3, sign * h * 0.62, 0.003);
        g.add(hole);
      }
    }
  }
  g.width = stripW;
  g.dispose = () => {
    frameGeo.dispose(); holeGeo.dispose(); holeMat.dispose();
    base.geometry.dispose(); base.material.dispose();
    g.children.forEach((c) => c.material && c.material.dispose && c.material.dispose());
  };
  return g;
}

/* Set dressing: stands, flags, a dolly track, a camera on sticks, crew. Blocky
   on purpose, so a wide shot reads as a set without costing a render. */
export function makeSetPiece(kind) {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, roughness: 0.9 });
  const tealM = new THREE.MeshStandardMaterial({ color: C.teal, roughness: 0.75 });
  const pale = new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.85 });

  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };

  if (kind === 'light') {
    box(0.06, 2.2, 0.06, dark, 0, 1.1, 0);
    box(0.7, 0.7, 0.18, pale, 0, 2.3, 0.1).rotation.x = -0.3;
    box(0.5, 0.04, 0.5, dark, 0, 0.02, 0);
  } else if (kind === 'flag') {
    box(0.05, 1.9, 0.05, dark, 0, 0.95, 0);
    box(0.9, 1.2, 0.03, dark, 0.4, 1.7, 0);
  } else if (kind === 'camera') {
    box(0.09, 1.25, 0.09, dark, 0, 0.62, 0);
    box(0.62, 0.42, 0.95, dark, 0, 1.42, 0);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.42, 20), dark);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 1.42, 0.66);
    g.add(lens);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ color: C.tealTint }));
    glass.position.set(0, 1.42, 0.88);
    g.add(glass);
    for (const x of [-0.17, 0.17]) {
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 24), tealM);
      reel.rotation.z = Math.PI / 2;
      reel.position.set(x, 1.82, -0.1);
      g.add(reel);
    }
  } else if (kind === 'crew') {
    box(0.3, 0.72, 0.22, dark, 0, 0.78, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), dark);
    head.position.y = 1.28;
    g.add(head);
    box(0.34, 0.42, 0.24, dark, 0, 0.21, 0);
  } else if (kind === 'track') {
    for (const z of [-0.26, 0.26]) box(7, 0.05, 0.08, dark, 0, 0.025, z);
    for (let i = -3; i <= 3; i++) box(0.1, 0.05, 0.62, dark, i, 0.025, 0);
  }
  return g;
}

/* ------------------------------------------------------------------- stage */

/* One renderer, one camera, one resize handler, one subscription to the shared
   ticker. Call dispose when the section goes away. */
export function makeStage(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: opts.alpha !== false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !!opts.shadows;
  if (opts.shadows) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  if (opts.fog) scene.fog = new THREE.Fog(opts.fog, opts.fogNear || 8, opts.fogFar || 34);

  const camera = new THREE.PerspectiveCamera(opts.fov || 42, 1, 0.1, 120);
  camera.position.set(0, 0, 6);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let stop = null;
  function start(onFrame) {
    stop = window.KL.paint((time, delta) => {
      if (onFrame) onFrame(time, delta);
      renderer.render(scene, camera);
    });
  }

  function dispose() {
    if (stop) stop();
    window.removeEventListener('resize', resize);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    renderer.dispose();
  }

  return { THREE, renderer, scene, camera, resize, start, dispose };
}

/* Key, fill and a teal rim. Three lights, lit like a set, not like a showroom. */
export function lightRig(scene, { shadows = false } = {}) {
  scene.add(new THREE.AmbientLight(C.paper, 0.52));
  const key = new THREE.DirectionalLight(C.paper, 1.5);
  key.position.set(4, 6, 5);
  key.castShadow = shadows;
  if (shadows) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
  }
  scene.add(key);
  const fill = new THREE.DirectionalLight(C.tealTint, 0.6);
  fill.position.set(-5, 2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(C.tealTint, 0.9);
  rim.position.set(-2, 3, -6);
  scene.add(rim);
  return { key, fill, rim };
}
