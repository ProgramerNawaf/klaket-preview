/* H4, the depth cut.
   The illusion is one number: where the striped bar's lower edge sits on the line
   of type it crosses. Guessing it from the line box is wrong, because a line box
   is leading plus ascenders, not letters, so the cap line is measured off the font
   itself with a canvas. The two clips are then cut from the board's own offsets,
   never from a client rect, because transforms move paint without moving layout
   and a clip cut from a moving rectangle lands in the wrong place.
   Everything else is three z layers in the right order. */
(function () {
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* Two lines, balanced by length, so a copy change in data.js still breaks well. */
  function twoLines(text) {
    const words = text.split(' ');
    if (words.length < 3) return [text, ''];
    let best = 1;
    let gap = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length;
      const b = words.slice(i).join(' ').length;
      if (Math.abs(a - b) < gap) { gap = Math.abs(a - b); best = i; }
    }
    return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }

  /* A fixed sequence, so the streaks look placed rather than random, and look the
     same on every reload. */
  function seeded(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }

  /* The streaks are the board's own top edge pulled straight up, so they are made
     of what that edge is made of: the bar's paper and ink, and the body's teal. */
  function streaks() {
    const rnd = seeded(20260101);
    const tones = [
      ['var(--ink)', 0.82], ['var(--paper)', 1], ['var(--teal)', 0.7],
      ['var(--ink)', 0.22], ['var(--teal-deep)', 0.55], ['var(--paper)', 1],
      ['var(--teal-tint)', 0.6], ['var(--ink)', 0.45],
    ];
    const cols = [];
    let x = 0;
    let i = 0;
    while (x < 100) {
      const w = Math.min(2 + rnd() * 9, 100 - x);
      cols.push([x, w, tones[i++ % tones.length]]);
      x += w;
    }
    return cols.map(([left, w, [tone, op]], i) =>
      `<i class="hd__streak" style="left:${left.toFixed(2)}%;width:${(w + 0.4).toFixed(2)}%;background:${tone};opacity:${op}" data-i="${i}"></i>`
    ).join('');
  }

  function build() {
    const root = document.querySelector('.hero-depth');
    const D = window.KLDATA;
    if (!root || !D) return;
    const H = D.hero;
    const [l1, l2] = twoLines(H.slogan);

    const fields = [68, 44, 52].map((w) => `<i class="hd__field" style="--fw:${w}%"></i>`).join('');

    root.innerHTML = `
      <div class="hd__cross">
        <div class="hd__streaks" aria-hidden="true">${streaks()}</div>
        <div class="hd__board" aria-hidden="true"><div class="hd__fields">${fields}</div></div>
        <div class="hd__type">
          <h1 class="hd__title"><span>${l1} </span><span>${l2}</span></h1>
          <p class="hd__echo" aria-hidden="true"><span>${l1} </span><span>${l2}</span></p>
        </div>
        <div class="hd__bar stripes" aria-hidden="true"></div>
      </div>

      <div class="hd__foot">
        <p class="hd__ar" lang="ar" dir="rtl">${H.sloganAr}</p>
        <p class="hd__lede">${H.lede}</p>
        <div class="hd__ctas">
          <a class="btn" href="${H.primary.href}">${H.primary.label}${ARROW}</a>
          <a class="btn btn--ghost" href="${H.secondary.href}">${H.secondary.label}</a>
        </div>
      </div>`;

    const cross = root.querySelector('.hd__cross');
    const type = root.querySelector('.hd__type');
    const title = root.querySelector('.hd__title');
    const echo = root.querySelector('.hd__echo');
    const board = root.querySelector('.hd__board');
    const bar = root.querySelector('.hd__bar');
    /* The bar crosses the FIRST line, so the streaks rise into clear paper above
       all of the type and the rest of the headline sits in front of the body. */
    const crossed = title.firstElementChild;

    const probe = document.createElement('canvas').getContext('2d');

    /* Where the caps of the crossed line start, in the cross's own coordinates.
       Every number here is an offset, never a client rect, because the intro
       tween moves these very elements and a measurement taken mid-tween bakes
       the animation into the clip. */
    function capLine() {
      const top = type.offsetTop + crossed.offsetTop;
      const lineH = crossed.offsetHeight / Math.max(1, crossed.getClientRects().length);
      const cs = getComputedStyle(type);
      try {
        probe.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const m = probe.measureText(crossed.textContent);
        const fa = m.fontBoundingBoxAscent;
        const fd = m.fontBoundingBoxDescent;
        const cap = m.actualBoundingBoxAscent;
        if (!fa || !cap) throw new Error('no metrics');
        const baseline = top + (lineH - (fa + fd)) / 2 + fa;
        return { cap: baseline - cap, height: cap };
      } catch (e) {
        /* Older engines report no glyph box: fall back to a fraction of the line. */
        return { cap: top + lineH * 0.26, height: lineH * 0.66 };
      }
    }

    function layout() {
      const { cap, height } = capLine();
      const barH = parseFloat(getComputedStyle(bar).height) || 0;
      /* The bar's lower edge lands on the x line: the round lowercase keeps its
         whole shape and only the caps and ascenders go behind the bar. Deeper
         than this and the bar eats half of every letter it crosses, which is
         what made the word unreadable; shallower and it only grazes the
         ascenders, so nothing reads as being behind anything.
         The second term keeps the bar's TOP edge above the cap line, because
         anything of the ink pass left standing above the bar would be ink on
         the dark streaks. */
      const cut = Math.min(cap + height * 0.26, cap + barH - height * 0.1);
      root.style.setProperty('--cut', cut.toFixed(1) + 'px');
      /* The body stops just under the last line, so the Arabic and the lede can
         sit close and the whole hero reads as one block. */
      const over = Math.max(28, height * 0.6);
      root.style.setProperty('--body-h', Math.max(60, type.offsetTop + type.offsetHeight + over - cut).toFixed(1) + 'px');

      const a = board.offsetLeft - type.offsetLeft;
      const b = a + board.offsetWidth;
      const t = board.offsetTop - type.offsetTop;
      const W = type.offsetWidth;
      const Hh = type.offsetHeight;

      if (t >= Hh || b <= 0 || a >= W) {
        echo.style.clipPath = 'inset(100% 0 0 0)';
        title.style.clipPath = 'none';
        return;
      }
      const tt = Math.max(0, t);
      echo.style.clipPath = `inset(${tt}px ${(W - b).toFixed(1)}px 0px ${a.toFixed(1)}px)`;
      /* The ink pass keeps everything except the band, so no dark fringe shows
         through the paper pass. */
      title.style.clipPath = `polygon(0px 0px, ${W}px 0px, ${W}px ${Hh}px, ${b.toFixed(1)}px ${Hh}px, ${b.toFixed(1)}px ${tt}px, ${a.toFixed(1)}px ${tt}px, ${a.toFixed(1)}px ${Hh}px, 0px ${Hh}px)`;
    }

    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

    let pending = null;
    const relayout = () => {
      if (pending) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => { pending = null; layout(); });
    };
    const ro = new ResizeObserver(relayout);
    ro.observe(cross);
    window.addEventListener('resize', relayout);

    const g = window.KL && KL.gsap;
    if (!g || (window.KL && KL.reduced)) return;

    /* ---- the board arrives, the bar claps shut, the type crosses it ----
       The board grows from its own top edge rather than sliding, so the line the
       clips are cut on never moves and the paper pass is over teal from the
       first frame. The type only fades: the clips are cut in the type's own box,
       so sliding it would carry the knockout away from the board it was cut for
       and leave the crossed word ink on teal for the length of the tween, which
       is exactly how this hero used to go dark on dark. */
    const bars = root.querySelectorAll('.hd__streak');
    const tl = g.timeline({ delay: 0.1 });
    tl.from(board, { scaleY: 0.82, opacity: 0, transformOrigin: '50% 0%', duration: 0.7, ease: 'power3.out' }, 0)
      .from(bar, { y: -18, opacity: 0, duration: 0.55, ease: 'back.out(2.2)' }, 0.12)
      .from(bars, { scaleY: 0, duration: 0.8, ease: 'power3.out', stagger: { each: 0.025, from: 'center' } }, 0.18)
      .from(type, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.3)
      .from(root.querySelectorAll('.hd__foot > *'), { y: 16, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.5);

    /* Scrolling pulls the streaks a little further up, the way a long exposure
       smears when the camera moves. */
    g.to(bars, {
      scaleY: 1.35,
      ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.5 },
    });

    window.addEventListener('pagehide', () => { ro.disconnect(); window.removeEventListener('resize', relayout); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
