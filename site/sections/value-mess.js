/* The messy reading of the value argument.
   Eight channels piled at angles, paper falling out of them, and a clapperboard
   that shuts across the whole thing. The pile is deliberately laid out badly:
   overlapping, rotated, nothing aligned to anything, because that is the point
   being made. The positions come from a fixed seed rather than Math.random so
   the mess is the same mess every time it is looked at. */
(function () {
  /* A small deterministic generator, so a reload does not re-roll the layout. */
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

  function build() {
    const root = document.querySelector('.vmess');
    const D = window.KLDATA;
    if (!root || !D || !D.value.mess) return;
    const M = D.value.mess;
    const V = D.value;

    root.innerHTML = `
      <div class="vm__pin">
        <div class="vm__fall" aria-hidden="true">
          ${M.scraps.map((t) => `<span class="vm__scrap">${t}</span>`).join('')}
        </div>
        <div class="vm__pile">
          ${M.channels.map((c) => cardHTML(c, c.app === 'Sticky note')).join('')}
        </div>
        <div class="vm__kept">
          <div class="vm__top">
            <span class="vm__icon" aria-hidden="true">🎬</span>
            <span class="vm__app">${V.resolved.app}</span>
            <span class="vm__time">${V.resolved.time}</span>
          </div>
          <p class="vm__who">${V.resolved.who}</p>
          <p class="vm__body">${V.resolved.body}</p>
        </div>
        <h2 class="vm__head">
          <span class="vm__line">
            <span class="is-problem">${V.problem[0]}</span>
            <span class="is-answer">${V.answer[0]}</span>
          </span>
          <span class="vm__line">
            <span class="is-problem">${V.problem[1]}</span>
            <span class="is-answer">${V.answer[1]}</span>
          </span>
        </h2>
        <div class="vm__clap" aria-hidden="true"></div>
        <div class="vm__flash" aria-hidden="true"></div>
        <div class="vm__phases">
          ${M.phases.map((p, i) => `<span class="vm__phase data${i === 0 ? ' is-on' : ''}"><i></i>${p}</span>`).join('')}
        </div>
      </div>`;

    const g = window.KL && KL.gsap;
    const pin = root.querySelector('.vm__pin');
    const cards = [...root.querySelectorAll('.vm__pile .vm__card')];
    const scraps = [...root.querySelectorAll('.vm__scrap')];
    const kept = root.querySelector('.vm__kept');
    const clap = root.querySelector('.vm__clap');
    const flash = root.querySelector('.vm__flash');
    const problems = [...root.querySelectorAll('.is-problem')];
    const answers = [...root.querySelectorAll('.is-answer')];
    const phases = [...root.querySelectorAll('.vm__phase')];

    if (!g || (window.KL && KL.reduced)) { root.classList.add('is-still'); return; }

    /* Lay the pile out badly on purpose, around the headline rather than over it. */
    const rnd = seeded(20261108);
    const spots = [
      [6, 12], [62, 8], [20, 62], [68, 58], [2, 36], [78, 30], [40, 4], [44, 74],
    ];
    cards.forEach((c, i) => {
      const [sx, sy] = spots[i % spots.length];
      g.set(c, {
        left: (sx + (rnd() - 0.5) * 7) + '%',
        top: (sy + (rnd() - 0.5) * 9) + '%',
        rotation: (rnd() - 0.5) * 22,
        zIndex: Math.floor(rnd() * 8),
      });
    });

    /* Paper keeps falling the whole time the pile is up. One tween each, started
       at a different point in its own cycle so they never fall in step. */
    const falls = scraps.map((s, i) => {
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
          const i = p < 0.5 ? 0 : p < 0.72 ? 1 : 2;
          phases.forEach((el, j) => el.classList.toggle('is-on', j === i));
        },
      },
    });

    /* The pile drifts and crowds in before anything resolves, so it gets worse
       before it gets better. */
    tl.to(cards, {
      x: () => (rnd() - 0.5) * 120,
      y: () => (rnd() - 0.5) * 90,
      rotation: '+=' + 8,
      ease: 'none',
      duration: 0.5,
    }, 0);

    /* The stick comes down across the whole screen and shuts. */
    tl.set(clap, { opacity: 1, rotation: -11 }, 0.46)
      .to(clap, { rotation: 0, duration: 0.1, ease: 'power3.in' }, 0.46)
      .to(flash, { opacity: 0.7, duration: 0.012, ease: 'none' }, 0.56)
      .to(flash, { opacity: 0, duration: 0.07, ease: 'power2.out' }, 0.572);

    /* On the impact the mess is gone, the sentence changes its mind, and one
       card is left. */
    tl.to(cards, { opacity: 0, scale: 0.92, y: '+=26', duration: 0.05, ease: 'power2.in' }, 0.56)
      .to(scraps, { opacity: 0, duration: 0.05 }, 0.56)
      .to(problems, { opacity: 0, y: -10, duration: 0.05, ease: 'power2.in' }, 0.56)
      .to(answers, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.58)
      .fromTo(kept, { opacity: 0, y: 22, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.1, ease: 'power3.out' }, 0.58)
      .to(clap, { opacity: 0, duration: 0.06 }, 0.63);

    window.addEventListener('pagehide', () => {
      falls.forEach((f) => f.kill());
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
