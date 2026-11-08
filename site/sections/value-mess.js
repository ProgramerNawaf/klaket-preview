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

  /* The chain, drawn once and left alone. Six nodes on a rail: the four agents
     the schema allows, the client's own step in the middle of them, and the
     budget. It is a diagram, not a performance, so nothing here moves. */
  const ICON = {
    inbox:  '<path d="M4 13h5l2 3h6l2-3h5M4 13l3-8h14l3 8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    bulb:   '<path d="M11 24h6M10.5 20.5a8 8 0 1 1 7 0v2.5h-7z"/>',
    check:  '<path d="M14 4.5l2.6 2 3.2-.5 1 3.1 2.7 1.8-1.4 2.9 1.4 2.9-2.7 1.8-1 3.1-3.2-.5-2.6 2-2.6-2-3.2.5-1-3.1L4.5 16l1.4-2.9L4.5 10.2l2.7-1.8 1-3.1 3.2.5z"/><path d="M10.5 14.2l2.6 2.6 4.9-5.3"/>',
    script: '<path d="M7 3.5h10l4 4V24a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 5 24V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M17 3.5v4h4M9.5 13h9M9.5 17h9M9.5 21h5"/>',
    slate:  '<path d="M4 11h20v11a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 4 22z"/><path d="M4 11l1.6-5 19 2.2-.7 2.8z"/><path d="M10 5.6L8 11M15.5 6.3L13.5 11M21 7L19 11"/>',
    chart:  '<path d="M5 23h18M9 19V11M14 19V6M19 19v-5"/>',
  };

  function node(step, i) {
    return `<li class="vm__node${step.live ? ' is-live' : ''}${step.human ? ' is-human' : ''}">
      <span class="vm__dot">
        ${step.live ? '<span class="vm__dots" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}
        <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">${ICON[step.icon] || ''}</svg>
      </span>
      <span class="vm__node-label">${step.label}</span>
    </li>`;
  }

  function build() {
    const root = document.querySelector('.vmess');
    const D = window.KLDATA;
    if (!root || !D || !D.value.mess) return;
    const M = D.value.mess;
    const V = D.value;
    const A = D.agents;

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
          <h2 class="vm__head">
            <span class="vm__line">${V.answer[0]}</span>
            <span class="vm__line">${V.answer[1]}</span>
          </h2>
          <div class="vm__chain">
            <p class="vm__chain-title">${A.title}</p>
            <ul class="vm__rail">${A.steps.map(node).join('')}</ul>
          </div>
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
    const flash = root.querySelector('.vm__flash');
    const phases = [...root.querySelectorAll('.vm__phase')];
    const phaseRow = root.querySelector('.vm__phases');
    const chain = root.querySelector('.vm__chain');

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
    const EDGE_FROM = 0.2, EDGE_TO = 0.46;
    const clamp01 = (n) => Math.min(1, Math.max(0, n));



    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 3.4,
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

    function paint(p) {
      const ex = 112 + (-9 - 112) * clamp01((p - EDGE_FROM) / (EDGE_TO - EDGE_FROM));
      pin.style.setProperty('--x', ex + '%');

      /* Derived rather than tweened: a scrubbed tween's inline style can be
         restored on a refresh, which used to leave the edge back at its CSS
         default with the mess still covering everything. */
      phaseRow.style.opacity = String(1 - clamp01((p - 0.62) / 0.08));
      chain.style.opacity = String(clamp01((p - 0.52) / 0.1));
    }
    paint(0);
    window.addEventListener('resize', () => paint(tl.scrollTrigger ? tl.scrollTrigger.progress : 0));

    window.addEventListener('pagehide', () => {
      falls.forEach((f) => f.kill());
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
