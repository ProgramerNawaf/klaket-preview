/* H6, the slate.
   The cheapest hero on the site and the one that should look the most sure of
   itself: one SVG clapperboard, six fields chalked in in Plex Mono, then the
   stick shuts, one frame of overexposure, and the headline settles.

   Two drawings, one board. A six field board at 1000 units wide renders its
   22 unit labels at 8px on a 360px phone, so the narrow layout is a portrait
   board with fewer columns and proportionally larger type. The layout is picked
   at build time and only rebuilt when the viewport actually crosses over. */
(function () {
  const VALUES = {
    PRODUCTION: 'KLAKET',
    SCENE: '12',
    TAKE: '03',
    ROLL: 'A',
    DIRECTOR: 'YOU',
    DATE: stamp(),
  };

  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + p(d.getFullYear() % 100);
  }

  /* A board is a stick, a striped lip and a lettered face. Everything below is
     measured in the viewBox units of that drawing, nowhere else. */
  const WIDE = {
    vb: [0, 0, 1000, 640],
    stick: 104, lipTop: 108, faceTop: 212, faceH: 428,
    pad: 56, label: 22, value: 46, cols: 3,
    rows: [
      [['PRODUCTION', 3]],
      [['SCENE', 1], ['TAKE', 1], ['ROLL', 1]],
      [['DIRECTOR', 2], ['DATE', 1]],
    ],
  };
  const TALL = {
    vb: [0, 0, 620, 660],
    stick: 76, lipTop: 80, faceTop: 152, faceH: 508,
    pad: 40, label: 25, value: 46, cols: 2,
    rows: [
      [['PRODUCTION', 2]],
      [['SCENE', 1], ['TAKE', 1]],
      [['ROLL', 1], ['DATE', 1]],
      [['DIRECTOR', 2]],
    ],
  };

  const BREAK = 760;
  const pick = () => (window.innerWidth < BREAK ? TALL : WIDE);

  function board(S) {
    const w = S.vb[2];
    const inner = w - S.pad * 2;
    const col = inner / S.cols;
    const n = S.rows.length;
    let fields = '';

    S.rows.forEach((row, ri) => {
      /* Rows sit on a baseline a shade below centre of their band, where a
         crew would chalk them: the label hangs above, the rule sits under. */
      const base = S.faceTop + (S.faceH * (ri + 0.62)) / n;
      let ci = 0;
      row.forEach(([key, span]) => {
        const x = S.pad + col * ci;
        const width = col * span - (ci + span < S.cols ? S.pad * 0.7 : 0);
        ci += span;
        fields += `
      <text class="hslate__label" x="${x}" y="${(base - S.value * 1.18).toFixed(1)}" font-size="${S.label}">${key}</text>
      <rect class="hslate__rule" x="${x}" y="${(base + S.value * 0.3).toFixed(1)}" width="${width.toFixed(1)}" height="2.5"/>
      <text class="hslate__value" data-f="${key}" x="${x}" y="${base.toFixed(1)}" font-size="${S.value}">${VALUES[key]}</text>
      <rect class="hslate__caret" data-c="${key}" x="${x}" y="${(base + S.value * 0.3 - 10).toFixed(1)}" width="${(S.value * 0.44).toFixed(1)}" height="5"/>`;
      });
    });

    return `
    <svg viewBox="${S.vb.join(' ')}" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="hslate-stripes" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect class="hslate__stripe-b" width="56" height="56"/>
          <rect class="hslate__stripe-a" width="28" height="56"/>
        </pattern>
      </defs>
      <rect class="hslate__face" x="0" y="${S.faceTop}" width="${w}" height="${S.faceH}" rx="6"/>
      <rect x="0" y="${S.lipTop}" width="${w}" height="${S.faceTop - S.lipTop}" fill="url(#hslate-stripes)"/>
      <rect class="hslate__edge" x="0" y="${S.faceTop - 4}" width="${w}" height="5"/>
      <g class="hslate__stick">
        <rect x="0" y="0" width="${w}" height="${S.stick}" rx="4" fill="url(#hslate-stripes)"/>
        <rect class="hslate__stripe-b" x="0" y="${S.stick - 5}" width="${w}" height="5"/>
      </g>
      <circle class="hslate__stripe-a" cx="14" cy="${S.stick - 14}" r="7"/>
      ${fields}
    </svg>`;
  }

  function build() {
    const root = document.querySelector('.hero-slate');
    const D = window.KLDATA;
    if (!root || !D) return;
    const H = D.hero;
    const id = 'hslate-title';
    const tag = root.dataset.h === '2' ? 'h2' : 'h1';

    root.setAttribute('aria-labelledby', id);
    root.innerHTML = `
      <div class="hslate__flash"></div>
      <div class="hslate__inner">
        <div class="hslate__board">${board(pick())}</div>
        <div class="hslate__copy">
          <${tag} id="${id}">${H.slogan}</${tag}>
          <p class="hslate__ar" lang="ar" dir="rtl">${H.sloganAr}</p>
          <p class="lede">${H.lede}</p>
          <div class="hslate__cta">
            <a class="btn" href="${H.primary.href}">${H.primary.label}
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <a class="btn btn--ghost" href="${H.secondary.href}">${H.secondary.label}</a>
          </div>
        </div>
      </div>`;

    const g = window.KL && KL.gsap;
    const wrap = root.querySelector('.hslate__board');
    let narrow = window.innerWidth < BREAK;

    /* The markup ships with the board already lettered and shut, so no-JS and
       reduced motion are the finished still. Only the animated path empties it. */
    if (!g || KL.reduced) {
      window.addEventListener('resize', () => {
        if ((window.innerWidth < BREAK) === narrow) return;
        narrow = !narrow;
        wrap.innerHTML = board(pick());
      });
      return;
    }

    const copy = root.querySelector('.hslate__copy');
    const flash = root.querySelector('.hslate__flash');
    let tl = null;

    /* Blank the board and lift the stick the moment the markup lands, not when
       the trigger fires, or the first frame shows the finished still and then
       takes it away again. */
    function prime() {
      const S = pick();
      const stick = root.querySelector('.hslate__stick');
      const cells = S.rows.flat().map(([key]) => ({
        key,
        text: root.querySelector(`[data-f="${key}"]`),
        caret: root.querySelector(`[data-c="${key}"]`),
        x0: 0,
        cw: S.value * 0.6,              // Plex Mono advances 600/1000 of the em
      }));
      cells.forEach((c) => { c.x0 = parseFloat(c.text.getAttribute('x')); c.text.textContent = ''; });
      g.set(stick, { rotation: -8, svgOrigin: '14 ' + (S.stick - 6) });
      g.set(copy, { opacity: 0, y: 16 });
      return { S, stick, cells };
    }

    function run() {
      if (tl) tl.kill();
      const { S, stick, cells } = prime();

      tl = g.timeline({ paused: true });
      let t = 0.15;
      cells.forEach((c) => {
        const v = VALUES[c.key];
        const o = { n: 0 };
        const dur = Math.max(0.1, v.length * 0.05);
        tl.to(o, {
          n: v.length, duration: dur, ease: 'none',
          onStart: () => { c.caret.style.opacity = '1'; },
          onUpdate: () => {
            const k = Math.min(v.length, Math.ceil(o.n));
            c.text.textContent = v.slice(0, k);
            c.caret.setAttribute('x', String(c.x0 + k * c.cw));
          },
          onComplete: () => { c.text.textContent = v; c.caret.style.opacity = '0'; },
        }, t);
        t += dur + 0.05;
      });

      /* The clap: fast down, one bounce off the lip, then set. */
      tl.to(stick, { rotation: 0, duration: 0.16, ease: 'power3.in' }, t)
        .to(stick, { rotation: -2.4, duration: 0.07, ease: 'power2.out' })
        .to(stick, { rotation: 0, duration: 0.14, ease: 'power2.in' });

      tl.fromTo(flash, { opacity: 0 }, { opacity: 0.82, duration: 0.05, ease: 'none' }, t + 0.16)
        .to(flash, { opacity: 0, duration: 0.3, ease: 'power2.out' }, t + 0.21);
      tl.fromTo(wrap, { scale: 1 }, { scale: 1.015, duration: 0.07, ease: 'power2.out' }, t + 0.16)
        .to(wrap, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }, t + 0.23);

      tl.to(copy, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, t + 0.2);
      tl.play();
    }

    prime();
    KL.ScrollTrigger.create({ trigger: root, start: 'top 85%', once: true, onEnter: run });

    /* Crossing the breakpoint means a different drawing, so redraw and replay. */
    window.addEventListener('resize', () => {
      if ((window.innerWidth < BREAK) === narrow) return;
      narrow = !narrow;
      wrap.innerHTML = board(pick());
      if (tl && tl.progress() > 0) run();
    });

    window.addEventListener('pagehide', () => { if (tl) tl.kill(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
