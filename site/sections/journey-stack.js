/* J4, the stack.
   Six shot slates clap into a pile. Each one flies in with its stick open, the
   stick shuts with a snap, the board kicks and then drops onto the pile at a
   slight angle. After the sixth clap the pile fans out so all six read at once.

   Every position is a function of the live container, and every tween after the
   first is a fromTo with immediateRender off, so ScrollTrigger's invalidate on
   refresh recomputes the whole choreography from the new box instead of from
   values it recorded at the old one. That is what makes a mid-section resize
   land back on the same board. */
(function () {
  const CLAP = 0.8;              // share of the scroll spent clapping the six in
  const SLOT = CLAP / 6;
  const FAN = 1 - CLAP;
  const PR = [-2.6, 1.9, -1.3, 2.7, -2.0, 1.1];   // a pile never stacks square

  function build() {
    const root = document.querySelector('.jstack');
    const D = window.KLDATA;
    if (!root || !D) return;
    const J = D.journey;
    const F = (D.value && D.value.slateFields) || ['PRODUCTION', 'SCENE', 'TAKE', 'DIRECTOR'];

    const boards = J.steps.map((s) => `
      <li class="slate">
        <div class="slate__board">
          <span class="slate__stick stripes" aria-hidden="true"></span>
          <div class="slate__body">
            <span class="slate__bar stripes" aria-hidden="true"></span>
            <div class="slate__face">
              <h3 class="slate__t"><span class="data slate__n">${s.n}</span>${s.title}</h3>
              <p class="slate__b">${s.body}</p>
              <div class="slate__fields" aria-hidden="true">
                <span class="slate__field data">${F[1]}<b>${s.n}</b></span>
                <span class="slate__field data">${F[2]}<b>1</b></span>
              </div>
            </div>
          </div>
        </div>
        <button class="slate__jump" type="button" aria-label="Step ${s.n}, ${s.title}"></button>
      </li>`).join('');

    root.innerHTML = `
      <div class="jstack__pin">
        <h2 class="jstack__title" id="jstack-title">${J.title}</h2>
        <span class="jstack__tally" aria-hidden="true"></span>
        <ol class="jstack__pile">${boards}</ol>
      </div>`;

    const g = window.KL && KL.gsap;
    const pin = root.querySelector('.jstack__pin');
    const pile = root.querySelector('.jstack__pile');
    const slates = [...root.querySelectorAll('.slate')];

    if (!g || KL.reduced) {
      /* Still version: six boards, sticks already shut, read top to bottom. */
      root.classList.add('is-still');
      return;
    }

    const pileX = (i) => (i - 2.5) * 3.4;
    const pileY = (i) => -i * 7;
    const enterX = (i) => (i % 2 ? 1 : -1) * Math.min(pile.clientWidth * 0.32 + 60, 460);
    const enterY = () => pile.clientHeight * 0.52;

    /* Wide enough and the fan spreads sideways like a hand of cards. Narrow and
       it shingles down the screen, which is the only way six boards stay
       readable on a phone. */
    function fan(i) {
      const w = pile.clientWidth, h = pile.clientHeight;
      const sw = slates[0].offsetWidth, sh = slates[0].offsetHeight;
      const d = i - 2.5;
      if (w >= 940) {
        /* The boards shrink a little so six of them, plus the room the rotation
           needs at each end, still fit between the edges of the page. */
        const k = 0.8;
        const spread = Math.min((w - sw * k - 96) / 5, sw * k * 0.74);
        return { x: d * spread, y: (d * d - 3.125) * 10 - 28, rot: d * 6, s: k };
      }
      const step = Math.max(40, Math.min(78, (h - sh - 70) / 5));
      return { x: d * 5, y: d * step + 8, rot: d * 1.4, s: 0.9 };
    }

    const tl = g.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 6.6,
        pin: pin,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });

    slates.forEach((card, i) => {
      const stick = card.querySelector('.slate__stick');
      const t = i * SLOT;
      g.set(card, { xPercent: -50, yPercent: -50, zIndex: i + 1 });

      tl.fromTo(card,
        { x: () => enterX(i), y: () => enterY(), rotation: () => (i % 2 ? 11 : -11), scale: 1.12 },
        { x: () => pileX(i), y: () => pileY(i), rotation: () => PR[i], scale: 1,
          duration: SLOT * 0.46, ease: 'power3.out' }, t);

      /* Opacity lands long before the board does: a half transparent slate
         sliding over the pile shows the text of the one underneath. */
      tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: SLOT * 0.1, ease: 'none' }, t);

      tl.fromTo(stick, { rotation: -27 }, { rotation: 0, duration: SLOT * 0.17, ease: 'back.out(3.2)' },
        t + SLOT * 0.42);

      /* The snap lifts the board off the pile, then gravity has it back. */
      tl.fromTo(card, { y: () => pileY(i), scale: 1 },
        { y: () => pileY(i) - 11, scale: 1.025, duration: SLOT * 0.07, ease: 'power2.out', immediateRender: false },
        t + SLOT * 0.56);
      tl.fromTo(card, { y: () => pileY(i) - 11, scale: 1.025 },
        { y: () => pileY(i), scale: 1, duration: SLOT * 0.2, ease: 'bounce.out', immediateRender: false },
        t + SLOT * 0.63);
    });

    slates.forEach((card, i) => {
      tl.fromTo(card,
        { x: () => pileX(i), y: () => pileY(i), rotation: () => PR[i], scale: 1 },
        { x: () => fan(i).x, y: () => fan(i).y, rotation: () => fan(i).rot, scale: () => fan(i).s,
          duration: FAN * 0.82, ease: 'power2.inOut', immediateRender: false },
        CLAP + i * (FAN * 0.028));
    });

    KL.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => root.classList.toggle('is-live', self.isActive),
    });

    /* Keyboard: tabbing to a board scrolls to the moment it is clapped, so the
       list is reachable rather than something you can only watch go by. */
    function jump(i) {
      const st = tl.scrollTrigger;
      const y = st.start + (st.end - st.start) * ((i + 0.92) * SLOT);
      if (KL.lenis) KL.lenis.scrollTo(y, { duration: 0.7 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }
    slates.forEach((li, i) => {
      const btn = li.querySelector('.slate__jump');
      btn.addEventListener('click', () => jump(i));
      btn.addEventListener('focus', () => jump(i));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
