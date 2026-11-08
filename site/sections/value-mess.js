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

  /* The camera the screen goes into, front on, drawn in the four colours. */
  const CAMERA = `
    <svg viewBox="0 0 400 300" aria-hidden="true">
      <rect x="18" y="86" width="364" height="186" rx="16" fill="var(--surface)" stroke="var(--teal-tint)" stroke-width="3"/>
      <rect x="112" y="98" width="176" height="162" rx="10" fill="var(--bg-deep)" stroke="var(--teal-tint)" stroke-width="3"/>
      <circle cx="200" cy="179" r="66" fill="none" stroke="var(--muted)" stroke-width="2.5" opacity=".55"/>
      <circle cx="200" cy="179" r="48" fill="none" stroke="var(--muted)" stroke-width="2" opacity=".4"/>
      <circle cx="200" cy="179" r="30" fill="var(--teal-deep)"/>
      <circle cx="200" cy="179" r="14" fill="var(--teal)"/>
      <circle cx="188" cy="166" r="5" fill="var(--teal-tint)" opacity=".65"/>
      <rect x="46" y="110" width="52" height="30" rx="5" fill="var(--raised)"/>
      <rect x="46" y="158" width="24" height="24" rx="5" fill="var(--raised)"/>
      <rect x="78" y="158" width="24" height="24" rx="5" fill="var(--raised)"/>
      <rect x="304" y="196" width="60" height="22" rx="8" fill="var(--raised)"/>
      <circle cx="334" cy="134" r="11" fill="var(--signal)"/>
      <rect x="96" y="48" width="112" height="14" rx="6" fill="var(--raised)"/>
      <rect x="128" y="62" width="6" height="26" fill="var(--raised)"/>
      <rect x="186" y="62" width="6" height="26" fill="var(--raised)"/>
      <rect x="232" y="40" width="90" height="46" rx="9" fill="var(--raised)"/>
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
          <div class="vm__cam" aria-hidden="true">${CAMERA}</div>
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
    const cam = root.querySelector('.vm__cam');
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

    /* One proxy drives the edge, and the clips follow it. */
    const edge = { x: 112 };
    const setEdge = () => pin.style.setProperty('--x', edge.x + '%');
    setEdge();

    g.set(cam, { scale: 0.82, opacity: 0, yPercent: 10 });

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
          const i = p < 0.3 ? 0 : p < 0.68 ? 1 : 2;
          phases.forEach((el, j) => el.classList.toggle('is-on', j === i));
        },
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

    /* The edge crosses, right to left. */
    tl.fromTo(edge, { x: 112 }, { x: -9, ease: 'none', duration: 0.38, onUpdate: setEdge }, 0.3);

    /* A single frame of white as the edge passes the middle of the screen. */
    tl.to(flash, { opacity: 0.6, duration: 0.01, ease: 'none' }, 0.49)
      .to(flash, { opacity: 0, duration: 0.07, ease: 'power2.out' }, 0.5);

    /* The answer settles, then the screen goes into the lens. The words leave on
       the push so the camera is the only thing left. */
    tl.fromTo(cam, { scale: 0.82, opacity: 0, yPercent: 10 },
      { scale: 1, opacity: 1, yPercent: 0, duration: 0.12, ease: 'power3.out' }, 0.6)
      .to(cam, { scale: 4.6, yPercent: -26, duration: 0.26, ease: 'power2.in' }, 0.74)
      .to(keptHead, { opacity: 0, y: -26, duration: 0.12, ease: 'power2.in' }, 0.78)
      /* The phase row has said what it had to say, and the camera is coming up
         through where it sits. */
      .to(phaseRow, { opacity: 0, duration: 0.08, ease: 'power2.in' }, 0.74);

    window.addEventListener('pagehide', () => {
      falls.forEach((f) => f.kill());
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
