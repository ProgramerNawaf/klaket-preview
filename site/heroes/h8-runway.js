/* H8, the runway.
   A length of film comes down a rail at the camera, carrying call sheets, a
   stripboard and a shot list in its frames. It decelerates hard, and the last
   frame lifts off the rail, turns to face front and sets itself down on the
   empty `.hrun__slot` that CSS laid out, with the headline beside it.

   The blur is a lie, on purpose: three copies of the resting frame trailing back
   along the rail, plus a few additive streaks, both tied to the speed of the
   strip. No post pass, no second render target.

   three comes off the stage the kit returns, so the vendor path is named in one
   place for the whole site. */
import * as K from '../core/three-kit.js';

let T = null;

const root = document.querySelector('.hero-runway');
const D = window.KLDATA;

if (root && D) {
  const H = D.hero;
  const id = 'hrun-title';
  const tag = root.dataset.h === '2' ? 'h2' : 'h1';
  root.setAttribute('aria-labelledby', id);

  root.innerHTML = `
    <canvas class="hrun__canvas" aria-hidden="true"></canvas>
    <div class="hrun__vignette"></div>
    <div class="hrun__stage">
      <div class="hrun__copy">
        <${tag} id="${id}">${H.slogan}</${tag}>
        <p class="hrun__ar" lang="ar" dir="rtl">${H.sloganAr}</p>
        <p class="lede">${H.lede}</p>
        <div class="hrun__cta">
          <a class="btn" href="${H.primary.href}">${H.primary.label}
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <a class="btn btn--ghost" href="${H.secondary.href}">${H.secondary.label}</a>
        </div>
      </div>
      <div class="hrun__slot"><div class="hrun__still">${still()}</div></div>
    </div>`;

  if (!K.supported() || !window.KL || !KL.paint) root.classList.add('is-still');
  else live();

  /* ------------------------------------------------------------- the still
     One frame at rest with the strip trailing away behind it, drawn inside the
     same slot the renderer would park on, so the composition does not move. */
  function still() {
    const ghost = (x, y, w, h) => {
      const r = Array.from({ length: 3 }, (_, i) =>
        `<rect class="hrun__row" x="${x + w * 0.1}" y="${y + h * (0.3 + i * 0.2)}" width="${w * (0.6 - i * 0.14)}" height="${h * 0.07}" rx="${h * 0.035}"/>`).join('');
      return `<g><rect class="hrun__ghost" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>
        <rect class="hrun__bar" x="${x}" y="${y}" width="${w}" height="${h * 0.17}"/>${r}</g>`;
    };
    const perf = (y) => Array.from({ length: 9 }, (_, i) =>
      `<rect class="hrun__hole" x="${236 + i * 86}" y="${y}" width="36" height="15" rx="4"/>`).join('');
    const rows = [['05:30', 0.9], ['06:00', 0.66], ['06:30', 0.8], ['07:15', 0.72], ['12:00', 0.44]];

    return `
    <svg viewBox="0 0 1000 625" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      ${ghost(14, 16, 126, 79)}
      ${ghost(116, 8, 222, 139)}
      ${ghost(296, 0, 372, 233)}
      <rect class="hrun__card" x="200" y="125" width="800" height="500" rx="6"/>
      <rect class="hrun__perf" x="200" y="125" width="800" height="36"/>
      <rect class="hrun__perf" x="200" y="589" width="800" height="36"/>
      ${perf(136)}${perf(600)}
      <rect class="hrun__bar" x="228" y="183" width="744" height="62" rx="3"/>
      <text class="hrun__mono" x="250" y="222" font-size="27">CALL SHEET</text>
      <circle class="hrun__live" cx="822" cy="214" r="7"/>
      <text class="hrun__mono" x="948" y="222" font-size="27" text-anchor="end">DAY 02</text>
      ${rows.map(([t, w], i) => `
        <text class="hrun__mono hrun__mono--dim" x="250" y="${310 + i * 58}" font-size="24">${t}</text>
        <rect class="hrun__row" x="392" y="${294 + i * 58}" width="${Math.round(540 * w)}" height="18" rx="9"/>`).join('')}
      <text class="hrun__mono hrun__mono--dim" x="250" y="566" font-size="22">CALL 05:30 · NORTH GATE · 14 CREW</text>
    </svg>`;
  }

  /* -------------------------------------------------------------- the rail */
  function live() {
    const canvas = root.querySelector('.hrun__canvas');
    const slot = root.querySelector('.hrun__slot');
    const stage = K.makeStage(canvas, { fov: 42, fog: K.C.inkDeep, fogNear: 11, fogFar: 44 });
    const { scene, camera, renderer } = stage;
    T = stage.THREE;

    const REST_Z = 0.7;
    const FW = 1.1;                 // the kit's frame width, matched below
    const FRAMES = 16;
    const HALF = (FRAMES * (FW + 0.06)) / 2;
    /* The run ends with the strip's near end just behind the resting frame, so
       nothing is left frozen in front of the card. Everything else follows. */
    const STOP = HALF - 0.1;
    const SPAN = STOP + 11.6;       // eleven and a half units is ten frames past

    K.lightRig(scene);

    /* ---- the strip. The kit builds it, this file only dresses the frames. ---- */
    const strip = K.makeFilmStrip({ frames: FRAMES, w: FW, h: 0.72, gap: 0.06 });
    const redraws = [];
    const sheets = ['callsheet', 'board', 'shots'].map((k) => uiTexture(k, false, redraws));
    const faces = strip.children.filter((c) => c.geometry && c.geometry.parameters
      && Math.abs(c.geometry.parameters.width - FW) < 1e-4);
    faces.forEach((m, i) => {
      m.material.map = sheets[i % sheets.length];
      m.material.color.set(0xffffff);
      m.material.needsUpdate = true;
    });
    scene.add(strip);

    /* The rail: one direction, fixed. It leaves the resting frame and climbs
       away to the upper left, through the empty corner above the copy, because
       a shallower rail hides the whole strip behind the frame that lands on it.
       The strip's face is turned as near to the camera as a plane containing
       the rail can be turned, which is what keeps the frames readable rather
       than edge on. */
    const d = new T.Vector3(-0.46, 0.34, -1).normalize();
    const nrm = new T.Vector3();
    const side = new T.Vector3();
    const railQ = new T.Quaternion();
    const basis = new T.Matrix4();

    /* ---- the frame that stops, and the three that smear behind it ---- */
    const quad = new T.PlaneGeometry(1, 1);
    const heroTex = uiTexture('callsheet', true, redraws);
    const hero = new T.Mesh(quad, new T.MeshBasicMaterial({ map: heroTex, transparent: true, opacity: 0 }));
    scene.add(hero);

    const ghosts = [0, 1, 2].map(() => {
      const m = new T.Mesh(quad, new T.MeshBasicMaterial({
        map: heroTex, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending,
      }));
      scene.add(m);
      return m;
    });

    const smear = new T.Group();
    const smearMat = new T.MeshBasicMaterial({
      color: K.C.paper, transparent: true, opacity: 0, depthWrite: false,
      blending: T.AdditiveBlending, fog: false, side: T.DoubleSide,
    });
    const smearGeo = new T.PlaneGeometry(13, 0.016);
    [-0.52, -0.2, 0.22, 0.5].forEach((y) => {
      const m = new T.Mesh(smearGeo, smearMat);
      m.position.set(0, y, 0.01);
      smear.add(m);
    });
    scene.add(smear);

    /* ----------------------------------------------------------- the layout
       The slot is the only place the resting pose comes from. */
    const rail = new T.Vector3();
    const restPos = new T.Vector3();
    const restScale = new T.Vector3(1, 1, 1);
    const startPos = new T.Vector3();
    const startScale = new T.Vector3(FW, FW * 0.625, 1);
    const flat = new T.Quaternion();

    function layout() {
      stage.resize();
      const host = canvas.getBoundingClientRect();
      const box = slot.getBoundingClientRect();
      if (!host.height || !box.height) return;
      const perPx = (2 * Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z - REST_Z)) / host.height;
      restScale.set(box.width * perPx, box.height * perPx, 1);
      restPos.set(
        (box.left + box.width / 2 - (host.left + host.width / 2)) * perPx,
        -(box.top + box.height / 2 - (host.top + host.height / 2)) * perPx,
        REST_Z,
      );
      rail.set(restPos.x * 0.9, restPos.y * 0.9, 0);
      nrm.copy(camera.position).sub(rail);
      nrm.addScaledVector(d, -nrm.dot(d)).normalize();
      side.crossVectors(nrm, d).normalize();
      railQ.setFromRotationMatrix(basis.makeBasis(d, side, nrm));
      strip.quaternion.copy(railQ);
      smear.quaternion.copy(railQ);
      smear.position.copy(rail).addScaledVector(d, 4.4);
    }

    layout();
    window.addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { redraws.forEach((fn) => fn()); layout(); });
    }

    /* ------------------------------------------------------------ the frame */
    const st = { travel: SPAN, p: 0 };
    let last = SPAN;

    function tick(time, delta) {
      const dt = Math.max(0.001, Math.min(delta || 16, 48) / 1000);
      const speed = Math.min(1, (Math.abs(st.travel - last) / dt) / 7);
      last = st.travel;

      strip.position.copy(rail).addScaledVector(d, st.travel);

      startPos.copy(rail).addScaledVector(d, 1.5);
      const p = st.p;
      hero.position.lerpVectors(startPos, restPos, p);
      hero.position.y += Math.sin(time * 0.5) * 0.012 * p;
      hero.scale.lerpVectors(startScale, restScale, p);
      hero.quaternion.slerpQuaternions(railQ, flat, p);

      ghosts.forEach((gh, i) => {
        gh.position.copy(hero.position).addScaledVector(d, (i + 1) * 0.5 * speed);
        gh.quaternion.copy(hero.quaternion);
        gh.scale.copy(hero.scale);
        gh.material.opacity = (0.3 * speed * hero.material.opacity) / (i + 1);
      });
      smearMat.opacity = 0.1 * speed;

      renderer.render(scene, camera);
    }

    let release = null;
    const run = () => { if (!release) { last = st.travel; release = KL.paint(tick); } };
    const halt = () => { if (release) { release(); release = null; } };
    const io = new IntersectionObserver((es) => { es[0].isIntersecting ? run() : halt(); }, { rootMargin: '120px' });
    io.observe(root);

    /* ---- the run down the rail, then the stop ---- */
    const g = KL.gsap;
    if (g) {
      const bits = [...root.querySelectorAll('.hrun__copy > *')];
      g.set(bits, { opacity: 0, y: 18 });
      const tl = g.timeline({ delay: 0.15 });
      tl.to(st, { travel: STOP, duration: 2.5, ease: 'power4.out' }, 0)
        .to(st, { p: 1, duration: 1.5, ease: 'power3.out' }, 1.1)
        .to(hero.material, { opacity: 1, duration: 0.3, ease: 'none' }, 1.1)
        .to(bits, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 1.7);
      window.addEventListener('pagehide', () => tl.kill());
    } else {
      st.travel = STOP;
      st.p = 1;
      hero.material.opacity = 1;
    }

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
      sheets.concat([heroTex]).forEach((t) => t.dispose());
      strip.dispose();
      stage.dispose();
    });
  }

  /* ---------------------------------------------------------------- frames
     Three Klaket screens drawn flat into a canvas, in the four colours and
     Plex Mono, at the size a 16:10 frame wants. `perfs` adds the sprocket
     bands, which only the resting frame needs: the kit punches its own. */
  function uiTexture(kind, perfs, redraws) {
    const W = 640, Hh = 400;
    const el = document.createElement('canvas');
    el.width = W; el.height = Hh;
    const x = el.getContext('2d');
    const tex = new T.CanvasTexture(el);
    const hx = (n) => '#' + n.toString(16).padStart(6, '0');
    const C = K.C;

    function mono(size, alpha, weight) {
      x.font = `${weight || 500} ${size}px "IBM Plex Mono", ui-monospace, monospace`;
      x.fillStyle = `rgba(246,235,217,${alpha})`;
    }

    function draw() {
      const band = perfs ? Hh * 0.075 : 0;
      x.fillStyle = hx(C.ink);
      x.fillRect(0, 0, W, Hh);
      x.fillStyle = hx(kind === 'board' ? C.inkDeep : 0x1C1C1C);
      x.fillRect(0, band, W, Hh - band * 2);

      if (perfs) {
        x.fillStyle = 'rgba(246,235,217,0.1)';
        for (let i = 0; i < 9; i++) {
          x.fillRect(22 + i * 68, band * 0.28, 26, band * 0.44);
          x.fillRect(22 + i * 68, Hh - band * 0.72, 26, band * 0.44);
        }
      }

      const pad = 26;
      const top = band + 18;

      if (kind === 'callsheet') {
        x.fillStyle = hx(C.teal);
        x.fillRect(pad, top, W - pad * 2, 46);
        mono(19, 0.95); x.fillText('CALL SHEET', pad + 16, top + 30);
        /* Signal appears once per screen, so the live dot is drawn only on the
           frame that comes to rest, never on the ones streaming past. */
        if (perfs) {
          x.fillStyle = hx(C.signal);
          x.beginPath(); x.arc(W - pad - 96, top + 22, 5, 0, 6.3); x.fill();
        }
        mono(19, 0.95); x.fillText('DAY 02', W - pad - 78, top + 30);
        const rows = [['05:30', 0.9], ['06:00', 0.64], ['06:30', 0.8], ['07:15', 0.7], ['12:00', 0.42]];
        rows.forEach(([t, w], i) => {
          const y = top + 86 + i * 42;
          mono(17, 0.6); x.fillText(t, pad + 16, y + 12);
          x.fillStyle = 'rgba(246,235,217,0.16)';
          x.fillRect(pad + 110, y, (W - pad * 2 - 130) * w, 13);
        });
        mono(16, 0.5); x.fillText('NORTH GATE · 14 CREW', pad + 16, Hh - band - 26);
      } else if (kind === 'board') {
        mono(17, 0.55); x.fillText('STRIPBOARD · DAY 02', pad, top + 14);
        const tones = [C.teal, C.tealDeep, C.teal, C.tealTint, C.tealDeep, C.teal];
        tones.forEach((tone, i) => {
          const y = top + 36 + i * 44;
          x.fillStyle = hx(tone);
          x.fillRect(pad, y, W - pad * 2, 34);
          x.fillStyle = 'rgba(18,18,18,0.5)';
          x.fillRect(pad, y, 58, 34);
          mono(16, 0.92); x.fillText(String(11 + i), pad + 18, y + 23);
          x.fillStyle = 'rgba(246,235,217,0.3)';
          x.fillRect(pad + 76, y + 14, (W - pad * 2 - 110) * (0.4 + ((i * 7) % 5) / 9), 7);
        });
      } else {
        mono(17, 0.55); x.fillText('SHOT LIST · SC 12', pad, top + 14);
        for (let i = 0; i < 3; i++) {
          const y = top + 34 + i * 88;
          x.fillStyle = hx(C.tealDeep);
          x.fillRect(pad, y, 118, 74);
          x.strokeStyle = 'rgba(95,168,161,0.9)';
          x.lineWidth = 2.5;
          x.beginPath();
          if (i === 0) { x.arc(pad + 59, y + 37, 22, 0, 6.3); }
          else if (i === 1) { x.moveTo(pad + 24, y + 56); x.lineTo(pad + 59, y + 20); x.lineTo(pad + 94, y + 56); }
          else { x.rect(pad + 30, y + 18, 58, 38); }
          x.stroke();
          mono(16, 0.9); x.fillText((i + 1) + '. ' + ['WIDE', 'TWO SHOT', 'INSERT'][i], pad + 138, y + 26);
          x.fillStyle = 'rgba(246,235,217,0.16)';
          x.fillRect(pad + 138, y + 42, (W - pad - 160) * [0.72, 0.5, 0.62][i], 11);
        }
      }

      x.strokeStyle = 'rgba(246,235,217,0.14)';
      x.lineWidth = 2;
      x.strokeRect(1, band + 1, W - 2, Hh - band * 2 - 2);
      tex.needsUpdate = true;
    }

    draw();
    redraws.push(draw);
    /* The canvas is drawn in sRGB. Without saying so the renderer reads it as
       linear data and the teal comes back as a pastel. */
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }
}
