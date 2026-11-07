/* The value reel.
   The section is pinned for three screens. One track of cards travels up through
   the gap in the headline; every frame each card is weighted by how near it is to
   the middle of the screen, which is what makes the middle one feel in focus and
   the rest feel like noise going past. Past the two thirds mark the headline
   crossfades to its answer and the Klaket card parks in the gap. */
(function () {
  function card(c, klaket) {
    return `<article class="vcard${klaket ? ' vcard--klaket' : ''}">
      <div class="vcard__top">
        <span class="vcard__dot"></span>
        <span class="vcard__app">${c.app}</span>
        <span class="vcard__time">${c.time}</span>
      </div>
      <p class="vcard__who">${c.who}</p>
      <p class="vcard__body">${c.body}</p>
    </article>`;
  }

  function build() {
    const root = document.querySelector('.vreel');
    const D = window.KLDATA;
    if (!root || !D) return;
    const V = D.value;

    const half = (which, i) => `<div class="vreel__half vreel__half--${which}">
      <span class="vreel__line">
        <span class="is-problem">${V.problem[i]}</span>
        <span class="is-answer">${V.answer[i]}</span>
      </span></div>`;

    root.innerHTML = `
      <div class="vreel__pin">
        <div class="vreel__reel"><div class="vreel__track">
          ${V.cards.map((c) => card(c, false)).join('')}
          ${card(V.resolved, true)}
        </div></div>
        <div class="vreel__head">
          ${half('l', 0)}
          <div class="vreel__gap"></div>
          ${half('r', 1)}
        </div>
        <div class="vreel__phases">
          ${V.phases.map((p, i) => `<span class="vreel__phase data${i === 0 ? ' is-on' : ''}"><i></i>${p}</span>`).join('')}
        </div>
      </div>`;

    const g = window.KL && KL.gsap;
    const pin = root.querySelector('.vreel__pin');
    const track = root.querySelector('.vreel__track');
    const cards = [...root.querySelectorAll('.vcard')];
    const problems = [...root.querySelectorAll('.is-problem')];
    const answers = [...root.querySelectorAll('.is-answer')];
    const phases = [...root.querySelectorAll('.vreel__phase')];

    if (!g || (window.KL && KL.reduced)) {
      /* Reduced motion gets the same argument as a static before and after. */
      root.querySelector('.vreel__pin').style.height = 'auto';
      answers.forEach((a) => { a.style.position = 'static'; a.style.opacity = '1'; });
      return;
    }

    /* How far the track must travel for the first card to start below the fold
       and the last to end above it. */
    const span = () => track.scrollHeight + window.innerHeight * 0.9;

    let weighting;
    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 3.2,
        pin: pin,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          const i = p < 0.42 ? 0 : p < 0.74 ? 1 : 2;
          phases.forEach((el, j) => el.classList.toggle('is-on', j === i));
        },
      },
    });

    tl.fromTo(track,
      { y: () => window.innerHeight * 0.55 },
      { y: () => -span() + window.innerHeight * 0.45, ease: 'none', duration: 1 }, 0);

    /* The headline changes its mind once, late, and quickly. */
    tl.to(problems, { opacity: 0, y: -10, duration: 0.07, ease: 'power2.in' }, 0.7)
      .to(answers, { opacity: 1, y: 0, duration: 0.09, ease: 'power2.out' }, 0.74);

    /* The last card is the answer, so it holds in the gap instead of sailing on. */
    tl.to(cards[cards.length - 1], { y: 0, duration: 0.001 }, 0.99);

    /* Per-frame focus. Done on the ticker rather than in the timeline because it
       depends on where each card actually is, not on scroll progress. */
    weighting = KL.paint(() => {
      const mid = window.innerHeight / 2;
      for (const el of cards) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) { el.style.opacity = '0'; continue; }
        const d = Math.abs(r.top + r.height / 2 - mid) / (window.innerHeight * 0.42);
        const k = Math.max(0, 1 - d * d);                 // 1 in the middle, 0 at the edges
        el.style.opacity = String(0.08 + k * 0.92);
        el.style.filter = k > 0.92 ? 'none' : `blur(${((1 - k) * 5).toFixed(2)}px)`;
        el.style.transform = `scale(${(0.9 + k * 0.1).toFixed(3)})`;
      }
    });

    window.addEventListener('pagehide', () => weighting && weighting());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
