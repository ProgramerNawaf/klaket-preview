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
            window.KLJOURNEY && window.KLJOURNEY.CAMERA
              ? `<div class="vm__frame-cam">${window.KLJOURNEY.CAMERA}</div>` : ''
          }</div></div>
          <p class="vm__head"><span class="vm__next">${D.journey.title}</span></p>
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
    const EDGE_FROM = 0.3, EDGE_TO = 0.68;
    const clamp01 = (n) => Math.min(1, Math.max(0, n));



    /* The edge and the phase row are derived from scroll progress rather than
       driven by proxy tweens. A pinned element's inline styles can be restored
       on a refresh, which silently put the edge back to its CSS default and
       left the mess covering the frame. Derived values are right at any scroll
       position, including one jumped straight to. */
    function paint(pr) {
      const ex = 112 + (-9 - 112) * clamp01((pr - EDGE_FROM) / (EDGE_TO - EDGE_FROM));
      pin.style.setProperty('--x', ex + '%');
      phaseRow.style.opacity = String(1 - clamp01((pr - 0.72) / 0.08));
    }
    paint(0);
    window.addEventListener('resize', () => paint(tl && tl.scrollTrigger ? tl.scrollTrigger.progress : 0));

    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 4,
        pin: pin,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          paint(p);
          const i = p < 0.3 ? 0 : p < 0.68 ? 1 : 2;
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

    /* Nothing opens and nothing zooms. The edge passes and the journey's own
       opening frame is simply what is behind it, which is the frame the
       journey then carries on from. */

    window.addEventListener('pagehide', () => {
      falls.forEach((f) => f.kill());
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
