/* The messy reading of the value argument, resolved by a wipe and handed to the
   camera without ever cutting away.

   One clapperboard edge crosses the pinned screen right to left. Everything
   left of it is the mess; everything right of it is the answer, and the
   journey's own sentence sits with that answer rather than waiting for a
   screen of its own. When the edge has gone the camera pushes in, so the
   section ends inside the lens the journey opens on.

   The pile is laid out from a fixed seed rather than Math.random: the mess
   should be the same mess every time it is looked at. */
(function () {
  function seeded(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function cardHTML(c, note) {
    return `<div class="vm__card${note ? ' vm__card--note' : ''}">
      <div class="vm__top">
        <span class="vm__icon" aria-hidden="true">${c.icon}</span>
        <span class="vm__app">${c.app}</span>
        <span class="vm__time">${c.time}</span>
      </div>
      <p class="vm__who">${c.who}</p>
      <p class="vm__body">${c.body}</p>
    </div>`;
  }

  /* A camera of our own, used only when this section runs on a page without the
     journey below it. On v25 the journey's own opening frame is borrowed
     instead, so there is one camera rather than two that nearly match. */
  const FALLBACK_SET = `
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1600" height="900" class="f-deep"/>
      <rect y="580" width="1600" height="320" class="f-ink"/>
      <g transform="translate(800 520) scale(1.6) translate(-200 -150)">
        <rect x="18" y="86" width="364" height="186" rx="16" class="f-surf"/>
        <rect x="18" y="86" width="364" height="186" rx="16" class="s-tint" stroke-width="3"/>
        <rect x="112" y="98" width="176" height="162" rx="10" class="f-deep"/>
        <circle cx="200" cy="179" r="48" class="s-faint" stroke-width="2"/>
        <circle cx="200" cy="179" r="30" class="f-deepteal"/>
        <circle cx="200" cy="179" r="14" class="f-teal"/>
        <circle cx="334" cy="134" r="11" class="f-signal"/>
      </g>
    </svg>`;

  /* ---- the four agents, drawn ------------------------------------------
     Each one is a panel the size of a monitor on the stage, and each shows the
     thing that agent actually does rather than an icon standing for it. They
     are driven by a single number, k, which runs 0 to 1 across that agent's
     slice of the scroll, so nothing plays on a clock and scrubbing backwards
     unwinds it exactly. */
  const PW = 620, PH = 360;

  function panel(inner) {
    return `<svg viewBox="0 0 ${PW} ${PH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect width="${PW}" height="${PH}" rx="14" class="f-surf"/>
      <rect x="1" y="1" width="${PW - 2}" height="${PH - 2}" rx="13" class="s-faint" stroke-width="2"/>
      <rect x="0" y="0" width="${PW}" height="34" rx="14" class="f-raised"/>
      <rect x="0" y="22" width="${PW}" height="12" class="f-raised"/>
      <circle cx="22" cy="17" r="4" class="f-tint" opacity=".5"/>
      <circle cx="36" cy="17" r="4" class="f-tint" opacity=".3"/>
      <circle cx="50" cy="17" r="4" class="f-tint" opacity=".3"/>
      ${inner}
    </svg>`;
  }

  /* 01 Brief: the scraps arrive from where they actually come from and land as
     fields, with the two places the client contradicted themselves flagged. */
  function artBrief() {
    const chips = [
      { x: 40,  y: 70,  w: 150, t: 'MEETING 42:11' },
      { x: 430, y: 62,  w: 150, t: 'EMAIL, THU' },
      { x: 60,  y: 290, w: 130, t: 'VOICE NOTE' },
      { x: 420, y: 296, w: 150, t: 'PASTED NOTES' },
    ];
    const rows = ['Client and campaign', 'Deliverables, 3', 'Shoot window', 'Budget band', 'Stakeholders, 4'];
    return panel(`
      <g class="a-chips">${chips.map((c, i) => `
        <g class="a-chip" data-i="${i}" data-x="${c.x}" data-y="${c.y}">
          <rect width="${c.w}" height="30" rx="6" class="f-raised"/>
          <rect x="10" y="12" width="${c.w - 46}" height="6" rx="3" class="f-tint" opacity=".45"/>
          <text x="10" y="-6" class="a-mini">${c.t}</text>
        </g>`).join('')}
      </g>
      <g class="a-rows">${rows.map((r, i) => `
        <g class="a-row" data-i="${i}" transform="translate(150 ${76 + i * 42})">
          <rect width="320" height="30" rx="6" class="f-raised"/>
          <rect x="12" y="12" width="${80 + i * 14}" height="6" rx="3" class="f-paper" opacity=".75"/>
          <text x="${12}" y="-7" class="a-mini">${r}</text>
        </g>`).join('')}
      </g>
      <g class="a-flags">
        <circle cx="462" cy="133" r="7" class="f-signal"/>
        <circle cx="462" cy="217" r="7" class="f-signal"/>
      </g>`);
  }

  /* 02 Creative: one brief becomes three routes, and one of them is chosen. */
  function artCreative() {
    const tiers = [
      { t: 'SAFE', x: 44 },
      { t: 'BOLD', x: 226 },
      { t: 'WILDCARD', x: 408 },
    ];
    return panel(`
      <g class="a-seed"><rect x="226" y="140" width="168" height="90" rx="10" class="f-raised"/>
        <rect x="244" y="166" width="100" height="7" rx="3.5" class="f-tint" opacity=".55"/>
        <rect x="244" y="184" width="130" height="6" rx="3" class="f-paper" opacity=".4"/></g>
      <g class="a-tiers">${tiers.map((t, i) => `
        <g class="a-tier" data-i="${i}" data-x="${t.x}">
          <rect y="96" width="168" height="186" rx="10" class="f-raised"/>
          <rect x="18" y="118" width="${60 + i * 26}" height="7" rx="3.5" class="f-tint" opacity=".6"/>
          ${[0, 1, 2, 3].map((r) => `<rect x="18" y="${146 + r * 20}" width="${132 - (r % 3) * 30}" height="5" rx="2.5" class="f-paper" opacity=".3"/>`).join('')}
          <text x="18" y="268" class="a-mini">${t.t}</text>
        </g>`).join('')}
      </g>
      <g class="a-pick" transform="translate(378 108)">
        <circle r="13" class="f-teal"/>
        <path d="M-6 0 L-2 5 L6 -5" class="s-paper" stroke-width="3" fill="none"/>
      </g>`);
  }

  /* 03 Script: the scenes arrive in order and the running time adds up. */
  function artScript() {
    const scenes = [
      ['01', 'INT. MAJLIS, NIGHT', 12],
      ['02', 'EXT. NORTH GATE, DAWN', 9],
      ['03', 'INT. CAR, DAY', 7],
      ['04', 'EXT. ROOFTOP, DUSK', 14],
      ['05', 'INT. MAJLIS, NIGHT', 8],
    ];
    return panel(`
      <g class="a-scenes">${scenes.map((s, i) => `
        <g class="a-scene" data-i="${i}" transform="translate(44 ${72 + i * 46})">
          <rect width="420" height="34" rx="6" class="f-raised"/>
          <text x="14" y="22" class="a-num">${s[0]}</text>
          <rect x="52" y="14" width="${150 + (i % 3) * 50}" height="6" rx="3" class="f-paper" opacity=".62"/>
          <rect class="a-bar f-tint" x="330" y="13" width="${s[2] * 5}" height="8" rx="4"/>
        </g>`).join('')}
      </g>
      <g class="a-total" transform="translate(492 72)">
        <rect width="86" height="212" rx="8" class="f-raised"/>
        <text x="14" y="30" class="a-mini">TOTAL</text>
        <text x="14" y="64" class="a-big">00:50</text>
        <rect x="14" y="88" width="58" height="5" rx="2.5" class="f-tint" opacity=".5"/>
        <text x="14" y="124" class="a-mini">CUTDOWNS</text>
        <text x="14" y="154" class="a-big">30 15 6</text>
      </g>`);
  }

  /* 04 Treatment: the deck's pages fill in, then the palette lands. */
  function artTreatment() {
    let frames = '';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const i = r * 4 + c;
        frames += `<g class="a-frame" data-i="${i}" transform="translate(${44 + c * 134} ${70 + r * 108})">
          <rect width="118" height="88" rx="6" class="f-deep"/>
          <rect width="118" height="88" rx="6" class="s-faint" stroke-width="1.5"/>
          <rect class="a-fill f-deepteal" width="118" height="88" rx="6"/>
          <path class="a-shape f-tint" d="M22 70 L50 34 L78 70 Z" opacity=".5"/>
        </g>`;
      }
    }
    const swatches = ['f-teal', 'f-deepteal', 'f-tint', 'f-paper', 'f-signal'];
    return panel(`
      <g class="a-frames">${frames}</g>
      <g class="a-palette" transform="translate(44 296)">
        ${swatches.map((s, i) => `<rect class="a-sw ${s}" data-i="${i}" x="${i * 42}" width="32" height="32" rx="6"/>`).join('')}
        <text x="226" y="22" class="a-mini">LOOK, LIGHT, CASTING, WARDROBE, LOCATIONS</text>
      </g>`);
  }

  const ART = [artBrief, artCreative, artScript, artTreatment];

  function build() {
    const root = document.querySelector('.vmess');
    const D = window.KLDATA;
    if (!root || !D || !D.value.mess) return;
    const M = D.value.mess;
    const V = D.value;

    root.innerHTML = `
      <div class="vm__pin">
        <div class="vm__world vm__world--mess">
          <div class="vm__fall" aria-hidden="true">
            ${M.scraps.map((t) => `<span class="vm__scrap">${t}</span>`).join('')}
          </div>
          <div class="vm__pile">
            ${M.channels.map((c) => cardHTML(c, c.app === 'Sticky note')).join('')}
          </div>
          <h2 class="vm__head">
            <span class="vm__line">${V.problem[0]}</span>
            <span class="vm__line">${V.problem[1]}</span>
          </h2>
        </div>

        <div class="vm__world vm__world--kept">
          <div class="vm__frame" aria-hidden="true"><div class="vm__frame-in">${
            (window.KLJOURNEY && window.KLJOURNEY.SET) || FALLBACK_SET
          }${
            /* The journey's opening frame is its set with its camera stage
               nested dead centre at a fifth, so the frame is reproduced the
               same way rather than approximated with the set alone. */
            window.KLJOURNEY && window.KLJOURNEY.CAMERA
              ? `<div class="vm__frame-cam">${window.KLJOURNEY.CAMERA}</div>` : ''
          }</div>
            <div class="vm__agents" aria-hidden="true">
              ${D.agents.map((a, i) => `<div class="vm__agent" data-i="${i}">${ART[i]()}</div>`).join('')}
              <div class="vm__sweep"></div>
            </div>
          </div>
          <figcaption class="vm__agent-copy">
            <span class="vm__agent-n data"></span>
            <b class="vm__agent-name"></b>
            <span class="vm__agent-ar ar" dir="rtl" lang="ar"></span>
            <span class="vm__agent-line"></span>
            <span class="vm__agent-does"></span>
          </figcaption>
          <p class="vm__head">
            <span class="vm__line">${V.answer[0]}</span>
            <span class="vm__line">${V.answer[1]}</span>
            <span class="vm__next">${D.journey.title}</span>
          </p>
        </div>

        <div class="vm__bar" aria-hidden="true"></div>
        <div class="vm__flash" aria-hidden="true"></div>
        <div class="vm__phases">
          ${M.phases.map((p, i) => `<span class="vm__phase data${i === 0 ? ' is-on' : ''}"><i></i>${p}</span>`).join('')}
        </div>
      </div>`;

    const g = window.KL && KL.gsap;
    const pin = root.querySelector('.vm__pin');
    const cards = [...root.querySelectorAll('.vm__pile .vm__card')];
    const scraps = [...root.querySelectorAll('.vm__scrap')];
    const frame = root.querySelector('.vm__frame');
    const agents = root.querySelector('.vm__agents');
    const panels = [...root.querySelectorAll('.vm__agent')];
    const sweep = root.querySelector('.vm__sweep');
    const copyN = root.querySelector('.vm__agent-n');
    const copyName = root.querySelector('.vm__agent-name');
    const copyAr = root.querySelector('.vm__agent-ar');
    const copyLine = root.querySelector('.vm__agent-line');
    const copyDoes = root.querySelector('.vm__agent-does');
    const frameIn = root.querySelector('.vm__frame-in');
    const keptHead = root.querySelector('.vm__world--kept .vm__head');
    const flash = root.querySelector('.vm__flash');
    const phases = [...root.querySelectorAll('.vm__phase')];
    const phaseRow = root.querySelector('.vm__phases');

    if (!g || (window.KL && KL.reduced)) { root.classList.add('is-still'); return; }

    /* Lay the pile out badly on purpose, around the words rather than over them. */
    const rnd = seeded(20261108);
    const spots = [[6, 12], [62, 8], [20, 62], [68, 58], [2, 36], [78, 30], [40, 4], [44, 74]];
    cards.forEach((c, i) => {
      const [sx, sy] = spots[i % spots.length];
      g.set(c, {
        left: (sx + (rnd() - 0.5) * 7) + '%',
        top: (sy + (rnd() - 0.5) * 9) + '%',
        rotation: (rnd() - 0.5) * 22,
        zIndex: Math.floor(rnd() * 8),
      });
    });

    /* Paper keeps falling the whole time the pile is up, each piece started at a
       different point in its own cycle so they never fall in step. */
    const falls = scraps.map((s) => {
      g.set(s, { left: (4 + rnd() * 90) + '%', rotation: (rnd() - 0.5) * 50 });
      return g.to(s, {
        y: () => pin.offsetHeight * 1.3,
        rotation: '+=' + ((rnd() - 0.5) * 200).toFixed(0),
        duration: 7 + rnd() * 7,
        ease: 'none',
        repeat: -1,
        delay: -(rnd() * 10),
      });
    });

    /* The edge and the window are both derived from scroll progress rather than
       driven by proxy tweens. A pinned element's inline styles can be restored
       on a refresh, which silently puts the edge back to its CSS default and
       leaves the mess covering the answer. Deriving them means any scroll
       position, including one jumped straight to, paints the right frame. */
    const EDGE_FROM = 0.14, EDGE_TO = 0.30;
    const WIN_FROM = 0.30, WIN_TO = 0.42;
    /* The agents get the second half: one slice each, so each one has about a
       screen of scroll to do its thing in. */
    const AG_FROM = 0.44, AG_EACH = (1 - 0.44) / 4;
    const clamp01 = (n) => Math.min(1, Math.max(0, n));
    /* The same shape as power2.inOut, written out so it needs no tween. */
    const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);



    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 7,
        pin: pin,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          paint(p);
          const i = p < EDGE_FROM ? 0 : p < EDGE_TO ? 1 : 2;
          phases.forEach((el, j) => el.classList.toggle('is-on', j === i));
        },
        onRefresh: (self) => paint(self.progress),
      },
    });

    /* It gets worse before it gets better. */
    tl.to(cards, {
      x: () => (rnd() - 0.5) * 120,
      y: () => (rnd() - 0.5) * 90,
      rotation: '+=8',
      ease: 'none',
      duration: 0.3,
    }, 0);

    /* A single frame of white as the edge passes the middle of the screen. */
    tl.to(flash, { opacity: 0.6, duration: 0.01, ease: 'none' }, 0.49)
      .to(flash, { opacity: 0, duration: 0.07, ease: 'power2.out' }, 0.5);

    /* The window onto the journey's frame. It opens from a small rectangle held
       on the camera at the middle of that frame to the whole screen, while the
       drawing scales back to 1. The last frame of this section is therefore the
       first frame of the next one, and there is nothing to cut between them. */
    const FRAME_W = () => Math.min(pin.offsetWidth * 0.62, 460);
    const FRAME_H = () => FRAME_W() * 0.62;
    /* The camera is a fifth of the borrowed frame, so to sit it inside a window
       of FRAME_W the drawing has to be scaled by that window's share of a fifth.
       At the end both the window and the scale reach their own 1, which is the
       frame the journey opens on. */
    const START_S = () => Math.max(1, 5 * FRAME_W() / pin.offsetWidth);

    /* ---- the agents ------------------------------------------------------
       One index and one k. The index says which panel is up, k says how far
       through its own demonstration it is. Everything below reads from those
       two, so scrubbing backwards unwinds it exactly and nothing is on a clock.
       The teal pass between panels is the same signature the journey uses for
       work the machine did. */
    let shown = -1;
    function setCopy(i) {
      if (i === shown) return;
      shown = i;
      const a = D.agents[i];
      copyN.textContent = a.n;
      copyName.textContent = a.name;
      copyAr.textContent = a.ar;
      copyLine.textContent = a.line;
      copyDoes.textContent = a.does;
    }

    function playAgents(p) {
      if (p < AG_FROM - 0.02) { panels.forEach((el) => (el.style.opacity = '0')); return; }
      const raw = (p - AG_FROM) / AG_EACH;
      const i = Math.min(3, Math.max(0, Math.floor(raw)));
      const k = clamp01(raw - i);
      setCopy(i);
      panels.forEach((el, j) => { el.style.opacity = j === i ? '1' : '0'; });

      /* The pass sweeps across whenever a panel has just taken over. */
      const into = clamp01(k / 0.18);
      sweep.style.opacity = String(k < 0.18 ? 1 - Math.abs(into * 2 - 1) : 0);
      sweep.style.transform = `translateX(${(-30 + into * 160).toFixed(1)}%)`;

      const el = panels[i];
      const q = (sel) => [...el.querySelectorAll(sel)];
      const step = (n, idx, lead) => clamp01((k - (lead || 0) - idx * ((1 - (lead || 0)) / n)) / ((1 - (lead || 0)) / n));

      if (i === 0) {
        /* Scraps fly from where they came from and land as fields. */
        q('.a-chip').forEach((c, j) => {
          const t = step(4, j, 0.05);
          const x0 = +c.dataset.x, y0 = +c.dataset.y;
          const x1 = 150, y1 = 76 + j * 42;
          c.setAttribute('transform', `translate(${x0 + (x1 - x0) * t} ${y0 + (y1 - y0) * t})`);
          c.style.opacity = String(1 - t * 0.85);
        });
        q('.a-row').forEach((r, j) => { r.style.opacity = String(step(5, j, 0.3)); });
        q('.a-flags')[0].style.opacity = String(clamp01((k - 0.82) / 0.12));
      } else if (i === 1) {
        /* One brief opens into three routes and one is chosen. */
        const t = clamp01(k / 0.6);
        q('.a-seed')[0].style.opacity = String(1 - t);
        q('.a-tier').forEach((g, j) => {
          const x1 = +g.dataset.x;
          const x = 226 + (x1 - 226) * t;
          g.setAttribute('transform', `translate(${x} 0)`);
          g.style.opacity = String(clamp01((k - j * 0.1) / 0.3));
        });
        q('.a-pick')[0].style.opacity = String(clamp01((k - 0.74) / 0.14));
      } else if (i === 2) {
        /* The scenes land in order and the running time adds up with them. */
        q('.a-scene').forEach((g, j) => {
          const t = step(5, j, 0.05);
          g.style.opacity = String(t);
          g.querySelector('.a-bar').setAttribute('transform', `scale(${t.toFixed(3)} 1)`);
        });
        q('.a-total')[0].style.opacity = String(clamp01((k - 0.68) / 0.18));
      } else {
        /* The deck's pages render one by one, then the palette lands. */
        q('.a-frame').forEach((g, j) => {
          const t = step(8, j, 0.05);
          g.querySelector('.a-fill').style.opacity = String(t);
          g.querySelector('.a-shape').style.opacity = String(clamp01((t - 0.4) / 0.6) * 0.5);
        });
        q('.a-sw').forEach((r, j) => {
          r.style.opacity = String(clamp01((k - 0.72 - j * 0.04) / 0.1));
        });
        q('.a-palette text')[0].style.opacity = String(clamp01((k - 0.88) / 0.1));
      }
    }

    function paint(p) {
      const ex = 112 + (-9 - 112) * clamp01((p - EDGE_FROM) / (EDGE_TO - EDGE_FROM));
      pin.style.setProperty('--x', ex + '%');

      /* The words and the phase row are faded here for the same reason: a
         scrubbed tween's inline opacity can be restored on a refresh and leave
         them ghosting over the frame. */
      keptHead.style.opacity = String(1 - clamp01((p - 0.34) / 0.08));
      phaseRow.style.opacity = String(1 - clamp01((p - 0.30) / 0.07));
      frame.style.opacity = String(clamp01((p - 0.27) / 0.05));
      agents.style.opacity = String(clamp01((p - 0.42) / 0.04));
      playAgents(p);

      const t = 1 - inOut(clamp01((p - WIN_FROM) / (WIN_TO - WIN_FROM)));
      const w = pin.offsetWidth, h = pin.offsetHeight;
      const ix = Math.max(0, (w - FRAME_W()) / 2) * t;
      const iy = Math.max(0, (h - FRAME_H()) / 2) * t;
      frame.style.clipPath = `inset(${iy}px ${ix}px round ${(14 * t).toFixed(1)}px)`;
      frameIn.style.transform = `scale(${(1 + (START_S() - 1) * t).toFixed(4)})`;
    }
    paint(0);
    window.addEventListener('resize', () => paint(tl.scrollTrigger ? tl.scrollTrigger.progress : 0));

    /* The answer's words lift a little as they go. Their opacity is derived in
       paint() with everything else; only the movement is a tween. */
    tl.to(keptHead, { y: -22, duration: 0.09, ease: 'power2.in' }, 0.34);

    window.addEventListener('pagehide', () => {
      falls.forEach((f) => f.kill());
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
