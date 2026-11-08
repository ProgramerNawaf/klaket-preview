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

  /* The apps themselves, drawn as their own marks rather than as emoji. The
     point of the pile is that a crew recognises every one of these at a
     glance, and a system emoji renders differently on every machine. Keyed by
     the app name in the data, so a channel without a real app (a sticky note,
     a stack of prints) falls back to its emoji. */
  const LOGO = {
    WhatsApp: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#25D366"/><path fill="#fff" d="M12.02 5.6a6.4 6.4 0 0 0-5.47 9.72l-.83 3.04 3.13-.82a6.4 6.4 0 1 0 3.17-11.94zm0 1.5a4.9 4.9 0 1 1-2.49 9.12l-.3-.18-1.57.41.42-1.54-.2-.31A4.9 4.9 0 0 1 12.02 7.1z"/><path fill="#fff" d="M9.93 9.36c-.13-.3-.27-.31-.4-.31h-.35c-.12 0-.31.04-.47.22-.16.18-.62.6-.62 1.46 0 .87.64 1.7.72 1.82.09.12 1.24 1.98 3.05 2.7 1.5.59 1.81.47 2.14.44.32-.03 1.04-.42 1.19-.84.15-.42.15-.77.1-.85-.04-.07-.16-.11-.34-.2-.18-.09-1.04-.51-1.2-.57-.17-.06-.29-.09-.4.09-.12.18-.46.57-.57.69-.1.12-.2.13-.38.04a4.85 4.85 0 0 1-1.43-.88 5.4 5.4 0 0 1-1-1.24c-.1-.18-.01-.28.08-.36.08-.09.18-.22.27-.32.08-.11.11-.18.17-.3.06-.12.03-.23-.02-.32-.04-.09-.39-.97-.54-1.32z"/></svg>`,
    Gmail: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#fff"/><path fill="#4285F4" d="M3.4 18.2h2.9v-7.1L3.4 8.9z"/><path fill="#34A853" d="M17.7 18.2h2.9V8.9l-2.9 2.2z"/><path fill="#FBBC04" d="M6.3 11.1v7.1h11.4v-7.1L12 15.4z"/><path fill="#EA4335" d="M3.4 8.9 12 15.4l8.6-6.5V7.4c0-1-1.2-1.6-2-1l-6.6 5-6.6-5c-.8-.6-2 0-2 1z"/></svg>`,
    Excel: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#107C41"/><path fill="#fff" d="M8.1 6.9h2.7l1.2 2.5 1.2-2.5h2.7l-2.6 5 2.7 5.1h-2.7L12 14.4l-1.3 2.6H8l2.7-5.1z"/></svg>`,
    PDF: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F3EFE6" d="M6 2.4h8.2L19.6 8v13.1c0 .8-.7 1.5-1.5 1.5H6c-.8 0-1.5-.7-1.5-1.5V3.9c0-.8.7-1.5 1.5-1.5z"/><path fill="#CFC7B6" d="M14.2 2.4 19.6 8h-5.4z"/><rect x="2.7" y="12.4" width="14.4" height="6.7" rx="1.6" fill="#E2231A"/><text x="9.9" y="17.2" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="5" font-weight="700" fill="#fff">PDF</text></svg>`,
    'Missed call': `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#34C759"/><path fill="#fff" d="M9.1 6.6c-.4-.5-1.1-.6-1.6-.2l-1.2 1c-.6.5-.8 1.3-.6 2a13.2 13.2 0 0 0 8.9 8.9c.7.2 1.5 0 2-.6l1-1.2c.4-.5.3-1.2-.2-1.6l-2.3-1.7c-.4-.3-1-.3-1.4.1l-.9.9a9.9 9.9 0 0 1-3.2-3.2l.9-.9c.4-.4.4-1 .1-1.4z"/></svg>`,
    'Voice note': `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#141416"/><rect x=".5" y=".5" width="23" height="23" rx="5.5" fill="none" stroke="rgba(246,235,217,.22)"/><rect x="10.4" y="5.2" width="3.2" height="8.2" rx="1.6" fill="#FF3B30"/><path fill="none" stroke="#FF3B30" stroke-width="1.5" stroke-linecap="round" d="M7.6 11.6a4.4 4.4 0 0 0 8.8 0M12 16v2.6"/></svg>`,
    'Sticky note': `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#E2231A" d="M13.8 2.9 21 10.1l-1.7 1.7a2.6 2.6 0 0 1-2.8.6l-3.2 3.2-1.5 4.4-1.6-1.6-3.1 3.1-1-1 3.1-3.1-1.6-1.6 4.4-1.5 3.2-3.2a2.6 2.6 0 0 1 .6-2.8z"/></svg>`,
    Printed: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#4A4A4A"/><path fill="#F3EFE6" d="M8 4.6h8v3.2H8z"/><rect x="4.4" y="8.6" width="15.2" height="7.2" rx="1.6" fill="#D9D4C8"/><circle cx="17" cy="11.2" r=".9" fill="#34C759"/><path fill="#F3EFE6" d="M8 13.4h8v6H8z"/><path stroke="#A9A295" stroke-width=".9" stroke-linecap="round" d="M9.6 15.4h4.8M9.6 17.2h3.2"/></svg>`,
  };

  function cardHTML(c, note) {
    return `<div class="vm__card${note ? ' vm__card--note' : ''}">
      <div class="vm__top">
        <span class="vm__icon" aria-hidden="true">${LOGO[c.app] || c.icon}</span>
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
    /* Left values stay under SPOT_MAX: a card is about a fifth of the pin wide,
       and a spot past that pushes it off the right edge instead of into the
       pile. On a narrow screen a card is nearly half the pin, so the whole
       spread is squeezed by how much room a card actually leaves, rather than
       clamped, which would stack the right-hand cards on one another. */
    const SPOT_MAX = 69;
    const spots = [[4, 12], [58, 13], [14, 60], [62, 55], [4, 35], [SPOT_MAX, 34], [36, 7], [40, 73]];
    const pinW = pin.offsetWidth || window.innerWidth;
    const room = 100 - (cards[0].offsetWidth / pinW) * 100 - 3;
    const squeeze = Math.min(1, room / SPOT_MAX);
    cards.forEach((c, i) => {
      const [sx, sy] = spots[i % spots.length];
      g.set(c, {
        left: Math.min(room, Math.max(0, sx * squeeze + (rnd() - 0.5) * 5)) + '%',
        top: (sy + (rnd() - 0.5) * 7) + '%',
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
