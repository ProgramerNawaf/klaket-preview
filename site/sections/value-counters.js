/* The counters.
   Four figures that count up once when the row enters, and stop. The figures
   are small on purpose: they are counts of things the product is made of, not
   measurements of what it achieved, and KLDATA.value.counters says so in the
   line under each. Nothing here may imply a metric Klaket has not published.
   The count runs on a gsap tween rather than a scrub, because a number that
   runs backwards when you scroll up is a slot machine, not a fact. */
(function () {
  function build() {
    const root = document.querySelector('.vcount');
    const D = window.KLDATA;
    if (!root || !D || !D.value.counters) return;
    const C = D.value.counters;

    root.innerHTML = `
      <div class="wrap">
        <h2 class="vcount__title" data-reveal="up">${C.title}</h2>
        <ol class="vcount__row">
          ${C.items.map((it) => `
            <li class="vcount__cell">
              <span class="vcount__n" aria-hidden="true">0</span>
              <span class="sr">${it.n}</span>
              <span class="vcount__unit data">${it.unit}</span>
              <p class="vcount__line">${it.line}</p>
            </li>`).join('')}
        </ol>
      </div>`;

    const g = window.KL && KL.gsap;
    const nums = [...root.querySelectorAll('.vcount__n')];

    /* The final value is the honest one, so it is what gets painted if there is
       no gsap, if motion is reduced, or if anything below throws. */
    const land = () => nums.forEach((el, i) => { el.textContent = String(C.items[i].n); });

    if (!g || KL.reduced) { land(); return; }

    KL.autoReveal(root);

    const tl = g.timeline({
      scrollTrigger: { trigger: root.querySelector('.vcount__row'), start: 'top 78%', once: true },
    });

    nums.forEach((el, i) => {
      const target = C.items[i].n;
      const box = { v: 0 };
      tl.to(box, {
        v: target,
        duration: 0.9,
        ease: 'power2.out',
        snap: { v: 1 },
        onUpdate: () => { el.textContent = String(box.v); },
      }, i * 0.12);
      /* A zero has nothing to count through, so it arrives instead of rolling. */
      tl.from(el, { opacity: 0, y: 12, duration: 0.5, ease: 'power3.out' }, i * 0.12);
    });

    tl.eventCallback('onComplete', land);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
