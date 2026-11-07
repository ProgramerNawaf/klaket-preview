/* The slate.
   The four pillars are the four fields of a clapperboard, so the section is
   pinned and each field is written as you scroll: label, then the rule under
   it, then the claim. The stick stays open the whole time the board is being
   written and claps on the fourth. One movement, at the end, which is what
   makes it read as a take being marked rather than as an animation.
   The clap is deliberately not scrubbed: a clap played backwards at the speed
   of a mouse wheel is a rubber band, so it fires once per pass instead. */
(function () {
  /* Degrees. A crew holds a board further open than this, but the stick is as
     wide as the board, so every degree lifts its far end by another 18px and
     the thing climbs out of the pin. This is as far as it can open and still
     read as one object. */
  const OPEN = -8;
  const STEP = 0.19;       // one field per this much of the pinned scroll

  function build() {
    const root = document.querySelector('.vslate');
    const D = window.KLDATA;
    if (!root || !D) return;
    const V = D.value;
    const names = V.slateFields || [];

    root.innerHTML = `
      <div class="vslate__pin">
        <h2 class="sr">${D.nav[0].label}</h2>
        <div class="vslate__board">
          <div class="vslate__clap" aria-hidden="true">
            <span class="vslate__stick stripes"></span>
            <span class="vslate__anvil stripes"></span>
          </div>
          <ol class="vslate__fields">
            ${V.pillars.map((p, i) => `
              <li class="vslate__field">
                <span class="vslate__tag data">${names[i] || String(i + 1).padStart(2, '0')}</span>
                <i class="vslate__hair"></i>
                <div class="vslate__claim"><div class="vslate__claim-in">
                  <h3>${p.title}</h3>
                  <p>${p.body}</p>
                </div></div>
              </li>`).join('')}
          </ol>
        </div>
      </div>`;

    const g = window.KL && KL.gsap;
    const board = root.querySelector('.vslate__board');
    const stick = root.querySelector('.vslate__stick');
    const fieldEls = [...root.querySelectorAll('.vslate__field')];
    const hairs = [...root.querySelectorAll('.vslate__hair')];
    const claims = [...root.querySelectorAll('.vslate__claim')];

    if (!g || KL.reduced) {
      /* Still version: the board closed, every field written, nothing hidden. */
      root.classList.add('vslate--still', 'is-clapped');
      fieldEls.forEach((el) => el.classList.add('is-on'));
      return;
    }

    /* On a phone only one field is open at a time, so there the writing is done
       by class and the row transition. An inline opacity from a scrub would beat
       the class and the field would never appear. */
    const narrow = () => window.matchMedia('(max-width: 760px)').matches;

    g.set(stick, { rotation: OPEN });

    let clapped = false;
    let shut;

    function clap() {
      clapped = true;
      root.classList.add('is-clapped');
      shut = g.timeline()
        .to(stick, { rotation: 0, duration: 0.24, ease: 'back.out(1.9)' })
        /* The board takes the hit, briefly, the way a held board does. */
        .fromTo(board, { y: -4 }, { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.32)' }, 0.18);
    }

    function reopen() {
      clapped = false;
      root.classList.remove('is-clapped');
      if (shut) shut.kill();
      g.to(stick, { rotation: OPEN, duration: 0.3, ease: 'power2.out' });
    }

    function writeTo(i) {
      fieldEls.forEach((el, j) => {
        el.classList.toggle('is-on', narrow() ? j === i : j <= i);
        el.style.opacity = narrow() || j <= i ? '1' : '0.14';
      });
    }

    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 2.4,
        pin: root.querySelector('.vslate__pin'),
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          writeTo(Math.max(0, Math.min(3, Math.floor(p / STEP))));
          if (p > 0.82 && !clapped) clap();
          else if (p < 0.6 && clapped) reopen();
        },
      },
    });

    /* Positions are absolute and the hold runs to exactly 1, so the timeline's
       progress and the field index above are reading the same clock. */
    hairs.forEach((h, i) => tl.fromTo(h, { scaleX: 0 }, { scaleX: 1, duration: 0.08, ease: 'power2.out' }, i * STEP + 0.02));
    claims.forEach((c, i) => {
      if (narrow()) return;
      tl.fromTo(c, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1, ease: 'power3.out' }, i * STEP + 0.05);
    });
    tl.to({}, { duration: 0.01 }, 1);

    writeTo(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
