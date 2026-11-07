/* The slate wipe.
   The section is pinned for not quite three screens and one number runs the
   whole thing: --x, the screen position of the clapperboard edge. The two
   worlds are clipped against it from opposite sides and the striped bar sits on
   it, so there is no way for the edge and the worlds to disagree. The edge
   starts off the right of the screen and leaves past the left, which means the
   screen you are standing on is always the scattered one until the board has
   passed. It ends on one sentence with a rule under it, and nothing else. */
(function () {
  function fields(c) {
    return `<div class="vwipe__row">
        <span class="vwipe__dot"></span>
        <span class="vwipe__app">${c.app}</span>
        <span class="vwipe__time">${c.time}</span>
      </div>
      <p class="vwipe__who">${c.who}</p>
      <p class="vwipe__body">${c.body}</p>`;
  }

  function build() {
    const root = document.querySelector('.vwipe');
    const D = window.KLDATA;
    if (!root || !D) return;
    const V = D.value;

    /* The printed sheet is the last card in the data and the only one that is
       already wrong, so it carries the single signal on this screen. */
    const last = V.cards.length - 1;

    root.innerHTML = `
      <div class="vwipe__pin">
        <div class="vwipe__world vwipe__world--mess">
          <div class="vwipe__stage">
            <span class="vwipe__state data">${V.phases[0]}</span>
            <div class="vwipe__chips">
              ${V.cards.map((c, i) => `<article class="vwipe__chip${i === last ? ' vwipe__chip--stale' : ''}">${fields(c)}</article>`).join('')}
            </div>
            <p class="vwipe__say vwipe__say--problem">${V.problem.join(' ')}</p>
          </div>
        </div>

        <div class="vwipe__world vwipe__world--good">
          <div class="vwipe__stage">
            <span class="vwipe__state data">${V.phases[2]}</span>
            <article class="vwipe__sheet">${fields(V.resolved)}</article>
            <h2 class="vwipe__say vwipe__say--answer">${V.answer.join(' ')}<i class="vwipe__rule"></i></h2>
          </div>
        </div>

        <div class="vwipe__bar stripes" aria-hidden="true"></div>
      </div>`;

    const g = window.KL && KL.gsap;
    const pin = root.querySelector('.vwipe__pin');
    const chips = [...root.querySelectorAll('.vwipe__chip')];
    const messStage = root.querySelector('.vwipe__world--mess .vwipe__stage');
    const goodStage = root.querySelector('.vwipe__world--good .vwipe__stage');
    const sheet = root.querySelector('.vwipe__sheet');
    const rule = root.querySelector('.vwipe__rule');

    if (!g || KL.reduced) {
      /* Still version: the wipe becomes a band and the two worlds sit side by
         side as a before and after. The sentence still lands. */
      root.classList.add('vwipe--still');
      rule.style.transform = 'none';
      return;
    }

    /* One proxy drives --x so the clips, the bar and the paint pass below all
       read the same edge. */
    const edge = { x: 112 };
    const setEdge = () => pin.style.setProperty('--x', edge.x + '%');
    setEdge();

    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 2.6,
        pin: pin,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });

    /* The wipe itself, linear: a board swung across the lens does not ease. */
    tl.fromTo(edge, { x: 112 }, { x: -9, ease: 'none', duration: 0.82, onUpdate: setEdge }, 0);

    /* The mess drifts up as it is taken away; Klaket settles down into place. */
    tl.to(chips, { y: () => -window.innerHeight * 0.06, stagger: 0.015, ease: 'none', duration: 0.82 }, 0)
      .fromTo(messStage, { scale: 1 }, { scale: 0.97, ease: 'none', duration: 0.82 }, 0)
      .fromTo(goodStage, { scale: 1.05 }, { scale: 1, ease: 'none', duration: 0.82 }, 0);

    /* Once the board is gone the screen is one sentence: the sheet steps back
       and a rule draws under the line. */
    tl.to(sheet, { opacity: 0.5, scale: 0.95, duration: 0.1, ease: 'power2.out' }, 0.84)
      .to(rule, { scaleX: 1, duration: 0.12, ease: 'power3.out' }, 0.86);

    /* Per frame, because it depends on where each chip actually is rather than
       on progress: a chip dissolves just before the edge reaches it, so the
       board reads as taking the mess with it rather than hiding it. Measured
       against the chip's leading edge, not its middle, or a wide chip on a
       narrow screen is already gone before the board gets there. */
    const release = KL.paint(() => {
      const edgePx = (edge.x / 100) * window.innerWidth;
      const band = Math.max(window.innerWidth * 0.16, 120);
      for (const el of chips) {
        const r = el.getBoundingClientRect();
        const d = (edgePx - r.right) / band;
        const k = Math.max(0, Math.min(1, d));            // 1 well clear of the edge, 0 under it
        el.style.opacity = String(0.18 + k * 0.82);
        el.style.filter = k > 0.96 ? 'none' : `blur(${((1 - k) * 4).toFixed(2)}px)`;
      }
    });

    window.addEventListener('pagehide', release);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
