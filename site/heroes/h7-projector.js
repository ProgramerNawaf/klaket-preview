/* H7, the projector.
   A dark room: a projector low and to the left throws a beam at a screen, dust
   turns over inside the beam, and the light lands on the headline.

   The beam is a cheap trick on purpose. Two open ended cones with additive
   blending and a gradient down their length read as volume for two draw calls,
   where a real volumetric pass would cost a framebuffer and a blur. The dust is
   one Points cloud walking along the beam axis.

   The headline is HTML, not a texture, and the renderer takes its orders from
   the DOM: the lit screen is measured off the real `.hproj__screen` box every
   resize, so the beam always lands on the words. */
import * as K from '../core/three-kit.js';

/* three itself arrives on the stage the kit hands back, so this file never
   names the vendor path and never risks a second copy of the library. */
let T = null;

const root = document.querySelector('.hero-projector');
const D = window.KLDATA;

if (root && D) {
  const H = D.hero;
  const id = 'hproj-title';
  const tag = root.dataset.h === '2' ? 'h2' : 'h1';
  root.setAttribute('aria-labelledby', id);

  root.innerHTML = `
    <canvas class="hproj__canvas" aria-hidden="true"></canvas>
    <div class="hproj__still">${still()}</div>
    <div class="hproj__vignette"></div>
    <div class="hproj__screen">
      <${tag} id="${id}">${H.slogan}</${tag}>
      <p class="hproj__ar" lang="ar" dir="rtl">${H.sloganAr}</p>
      <p class="lede">${H.lede}</p>
      <div class="hproj__cta">
        <a class="btn" href="${H.primary.href}">${H.primary.label}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a class="btn btn--ghost" href="${H.secondary.href}">${H.secondary.label}</a>
      </div>
    </div>`;

  if (!K.supported() || !window.KL || !KL.paint) root.classList.add('is-still');
  else live();

  /* ------------------------------------------------------------ the still
     Laid out by CSS, not fitted as one picture. A single slice fitted SVG shows
     only the middle third of itself at a phone's aspect, which crops the
     projector straight out of the shot. So: the lit panel is sized by the same
     rule as the live screen box, the beam is a clipped wedge in percentages,
     and the projector is its own small drawing parked in the corner. */
  function still() {
    return `
    <div class="hproj__still-glow"></div>
    <div class="hproj__still-beam"></div>
    <svg class="hproj__still-proj" viewBox="0 0 180 142" aria-hidden="true" focusable="false">
      <rect class="hproj__dark" x="26" y="128" width="104" height="11" rx="5.5"/>
      <rect class="hproj__dark" x="70" y="94" width="16" height="38"/>
      <circle class="hproj__reel" cx="46" cy="22" r="21"/>
      <circle class="hproj__reel" cx="104" cy="22" r="21"/>
      <path class="hproj__reel" d="M46 43 V52 M104 43 V52"/>
      <rect class="hproj__body" x="12" y="52" width="126" height="44" rx="8"/>
      <rect class="hproj__dark" x="134" y="62" width="30" height="24" rx="4"/>
      <circle class="hproj__led" cx="28" cy="88" r="4"/>
    </svg>`;
  }

  /* ------------------------------------------------------------- the room */
  function live() {
    const canvas = root.querySelector('.hproj__canvas');
    const screenEl = root.querySelector('.hproj__screen');
    const stage = K.makeStage(canvas, { fov: 40, fog: K.C.inkDeep, fogNear: 7, fogFar: 30 });
    const { scene, camera, renderer } = stage;
    T = stage.THREE;

    const SCREEN_Z = -2.2;
    const PROJ_Z = 1.9;
    const DUST = 180;
    const BEAM_OP = 0.12;

    /* Lit like a room with one source in it, so the kit's set rig is turned
       most of the way down and the projector itself carries the light. */
    const rig = K.lightRig(scene);
    rig.key.intensity = 0.4;
    rig.fill.intensity = 0.22;
    rig.rim.intensity = 0.7;
    scene.children.filter((o) => o.isAmbientLight).forEach((o) => { o.intensity = 0.16; });
    const bulb = new T.PointLight(K.C.paper, 6, 9, 2);
    scene.add(bulb);

    /* ---- the screen: a dim paper panel, an additive pool, a hairline edge ---- */
    const quad = new T.PlaneGeometry(1, 1);
    const panel = new T.Mesh(quad, new T.MeshStandardMaterial({
      color: K.C.paper, roughness: 1, metalness: 0, transparent: true, opacity: 0.04,
    }));
    panel.position.z = SCREEN_Z;
    scene.add(panel);

    const pool = new T.Mesh(quad, new T.MeshBasicMaterial({
      map: glowTexture(), transparent: true, opacity: 0, depthWrite: false,
      blending: T.AdditiveBlending, fog: false,
    }));
    pool.position.z = SCREEN_Z + 0.01;
    scene.add(pool);

    const edge = new T.LineSegments(
      new T.EdgesGeometry(quad),
      new T.LineBasicMaterial({ color: K.C.paper, transparent: true, opacity: 0.14, fog: false }),
    );
    edge.position.z = SCREEN_Z + 0.02;
    scene.add(edge);

    /* ---- floor: just enough to say the room has one ---- */
    const floor = new T.Mesh(
      new T.PlaneGeometry(40, 30),
      new T.MeshStandardMaterial({ color: K.C.inkDeep, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    /* ---- the projector ---- */
    const proj = projector();
    scene.add(proj);

    /* ---- the beam: core cone, halo cone ---- */
    const beamTex = beamTexture();
    const core = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial({
      map: beamTex, transparent: true, opacity: 0, depthWrite: false, fog: false,
      blending: T.AdditiveBlending, side: T.DoubleSide,
    }));
    const halo = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial({
      map: beamTex, transparent: true, opacity: 0, depthWrite: false, fog: false,
      blending: T.AdditiveBlending, side: T.DoubleSide,
    }));
    scene.add(core, halo);

    /* ---- dust: one cloud, walking the beam axis ---- */
    const motes = { u: new Float32Array(DUST), a: new Float32Array(DUST), r: new Float32Array(DUST), p: new Float32Array(DUST) };
    for (let i = 0; i < DUST; i++) {
      motes.u[i] = Math.random();
      motes.a[i] = Math.random() * Math.PI * 2;
      motes.r[i] = Math.sqrt(Math.random()) * 0.94;
      motes.p[i] = Math.random() * Math.PI * 2;
    }
    const dustGeo = new T.BufferGeometry();
    dustGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(DUST * 3), 3));
    const dust = new T.Points(dustGeo, new T.PointsMaterial({
      map: dotTexture(), color: K.C.paper, size: 0.055, sizeAttenuation: true,
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false,
    }));
    scene.add(dust);

    /* ---------------------------------------------------------- the layout
       Everything spatial is derived here, from the measured DOM box, so one
       resize handler is the only place that knows any geometry. */
    const from = new T.Vector3();
    const to = new T.Vector3();
    const dir = new T.Vector3();
    const pu = new T.Vector3();
    const pv = new T.Vector3();
    let beamLen = 1, rTop = 0.085, rBot = 1;

    function layout() {
      stage.resize();
      const host = canvas.getBoundingClientRect();
      const box = screenEl.getBoundingClientRect();
      if (!host.height) return;

      const perPx = (2 * Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z - SCREEN_Z)) / host.height;
      const sw = box.width * perPx;
      const sh = box.height * perPx;
      const cx = (box.left + box.width / 2 - (host.left + host.width / 2)) * perPx;
      const cy = -(box.top + box.height / 2 - (host.top + host.height / 2)) * perPx;

      panel.scale.set(sw, sh, 1);
      panel.position.set(cx, cy, SCREEN_Z);
      pool.scale.set(sw * 1.04, sh * 1.06, 1);
      pool.position.set(cx, cy, SCREEN_Z + 0.01);
      edge.scale.set(sw, sh, 1);
      edge.position.set(cx, cy, SCREEN_Z + 0.02);

      /* The projector keeps the same place in frame at every aspect: low, left,
         and on a phone most of the way off the bottom. */
      const near = 2 * Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z - PROJ_Z);
      const tall = camera.aspect < 0.85;
      from.set(-near * camera.aspect * (tall ? 0.3 : 0.34), -near * (tall ? 0.4 : 0.33), PROJ_Z);
      to.set(cx, cy, SCREEN_Z);
      proj.position.copy(from);
      proj.scale.setScalar(tall ? 0.72 : 1);
      proj.lookAt(to);
      floor.position.y = -near * 0.62;

      dir.subVectors(to, from);
      beamLen = dir.length();
      dir.normalize();
      bulb.position.copy(from).addScaledVector(dir, 0.3);
      pu.set(0, 1, 0).cross(dir).normalize();
      pv.copy(dir).cross(pu).normalize();
      rBot = Math.min(sw, sh) * 0.4;

      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, -1, 0), dir);
      [[core, 1], [halo, 1.26]].forEach(([mesh, k]) => {
        const geo = new T.CylinderGeometry(rTop * k, rBot * k, beamLen, 40, 1, true);
        geo.translate(0, -beamLen / 2, 0);
        mesh.geometry.dispose();
        mesh.geometry = geo;
        mesh.position.copy(from);
        mesh.quaternion.copy(q);
      });
      halo.material.opacity = core.material.opacity * 0.34;
    }

    layout();
    window.addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

    /* ---------------------------------------------------------- the frame */
    const pos = dustGeo.attributes.position;
    function frame(time, delta) {
      const dt = Math.min(delta || 16, 48) / 1000;
      for (let i = 0; i < DUST; i++) {
        let u = motes.u[i] + dt * 0.035;
        if (u > 1) u -= 1;
        motes.u[i] = u;
        const rad = (rTop + (rBot - rTop) * u) * motes.r[i];
        const wob = Math.sin(time * 0.6 + motes.p[i]) * 0.06;
        const a = motes.a[i] + wob;
        const x = from.x + dir.x * u * beamLen + pu.x * Math.cos(a) * rad + pv.x * Math.sin(a) * rad;
        const y = from.y + dir.y * u * beamLen + pu.y * Math.cos(a) * rad + pv.y * Math.sin(a) * rad + wob * 0.3;
        const z = from.z + dir.z * u * beamLen + pu.z * Math.cos(a) * rad + pv.z * Math.sin(a) * rad;
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
      renderer.render(scene, camera);
    }

    /* ---- one subscription to the shared ticker, dropped when off screen ---- */
    let release = null;
    const run = () => { if (!release) release = KL.paint(frame); };
    const halt = () => { if (release) { release(); release = null; } };

    const io = new IntersectionObserver((es) => { es[0].isIntersecting ? run() : halt(); }, { rootMargin: '120px' });
    io.observe(root);

    /* ---- the light comes up, and the words come up with it ---- */
    const g = KL.gsap;
    if (g) {
      const bits = [...root.querySelectorAll('.hproj__screen > *')];
      g.set(bits, { opacity: 0, clipPath: 'inset(0 100% 0 0)' });
      const tl = g.timeline({ delay: 0.15 });
      tl.to(core.material, { opacity: BEAM_OP * 0.55, duration: 0.1, ease: 'none' })
        .to(core.material, { opacity: BEAM_OP * 0.2, duration: 0.07, ease: 'none' })
        .to(core.material, { opacity: BEAM_OP, duration: 0.7, ease: 'power2.out' })
        .to(halo.material, { opacity: BEAM_OP * 0.34, duration: 0.7, ease: 'power2.out' }, '<')
        .to(pool.material, { opacity: 1, duration: 0.8, ease: 'power2.out' }, '<')
        .to(panel.material, { opacity: 0.3, duration: 0.8, ease: 'power2.out' }, '<')
        .to(dust.material, { opacity: 0.5, duration: 1.2, ease: 'power1.out' }, '<')
        .to(bits, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.62, stagger: 0.09, ease: 'power2.out' }, '-=0.5');
    } else {
      core.material.opacity = BEAM_OP;
      halo.material.opacity = BEAM_OP * 0.34;
      pool.material.opacity = 1;
      panel.material.opacity = 0.3;
      dust.material.opacity = 0.5;
    }

    /* ---- a lost context is a real state, not a crash ---- */
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      halt();
      io.disconnect();
      root.classList.add('is-still');
    });

    window.addEventListener('pagehide', () => {
      halt();
      io.disconnect();
      window.removeEventListener('resize', layout);
      stage.dispose();
    });
  }

  /* --------------------------------------------------------------- textures
     A canvas is drawn in sRGB, so it has to say so or the renderer treats it as
     linear data and every teal comes back washed out. */

  function srgb(t) { t.colorSpace = T.SRGBColorSpace; return t; }

  function glowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(128, 128, 6, 128, 128, 128);
    gr.addColorStop(0, 'rgba(246,235,217,0.22)');
    gr.addColorStop(0.45, 'rgba(246,235,217,0.1)');
    gr.addColorStop(1, 'rgba(246,235,217,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 256);
    const t = srgb(new T.CanvasTexture(c));
    t.anisotropy = 4;
    return t;
  }

  /* Bright at the lens, gone by the screen: the falloff that sells the volume. */
  function beamTexture() {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(246,235,217,0.06)');
    gr.addColorStop(0.6, 'rgba(246,235,217,0.34)');
    gr.addColorStop(1, 'rgba(246,235,217,1)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 4, 256);
    return srgb(new T.CanvasTexture(c));
  }

  function dotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return srgb(new T.CanvasTexture(c));
  }

  /* A projector: body, lens, two reels, a stand, one red light. Built facing
     +z so the group can simply lookAt the screen. */
  function projector() {
    const g = new T.Group();
    const shell = new T.MeshStandardMaterial({ color: 0x262523, roughness: 0.7 });
    const trim = new T.MeshStandardMaterial({ color: K.C.teal, roughness: 0.6 });

    const body = new T.Mesh(new T.BoxGeometry(0.86, 0.38, 0.6), shell);
    g.add(body);
    const snout = new T.Mesh(new T.CylinderGeometry(0.11, 0.13, 0.26, 20), shell);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.4);
    g.add(snout);
    const glass = new T.Mesh(new T.CircleGeometry(0.1, 20), new T.MeshBasicMaterial({ color: K.C.paper, fog: false }));
    glass.position.set(0, -0.02, 0.54);
    g.add(glass);
    for (const x of [-0.19, 0.19]) {
      const reel = new T.Mesh(new T.CylinderGeometry(0.19, 0.19, 0.055, 24), trim);
      reel.rotation.set(Math.PI / 2, 0, 0);
      reel.position.set(x, 0.3, -0.04);
      g.add(reel);
    }
    const post = new T.Mesh(new T.BoxGeometry(0.08, 0.5, 0.08), shell);
    post.position.y = -0.44;
    g.add(post);
    const foot = new T.Mesh(new T.BoxGeometry(0.6, 0.05, 0.42), shell);
    foot.position.y = -0.7;
    g.add(foot);
    const led = new T.Mesh(new T.CircleGeometry(0.022, 12), new T.MeshBasicMaterial({ color: K.C.signal, fog: false }));
    led.position.set(-0.3, -0.1, 0.302);
    g.add(led);
    return g;
  }
}
