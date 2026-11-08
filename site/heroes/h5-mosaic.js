/* H5, the mosaic.
   Every tile is two faces. The near face is a drawn production still; the far
   face holds the same board drawing, sized to the whole grid and offset by the
   tile's own column and row, so turning the wall over assembles one board out of
   pieces that were never drawn as pieces.
   The grid is rebuilt when the breakpoint or the aspect changes, because the
   board's viewBox has to match the wall it is cut into. */
(function () {
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function seeded(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }

  /* ---- the six stills, drawn ------------------------------------------
     Each fills its tile, so a crop of any of them still reads as itself. */
  const STILLS = {
    /* a strip of the board's own top bar */
    bar(rnd) {
      let s = '';
      for (let x = -60; x < 160; x += 26) {
        s += `<path class="hm-paper" d="M${x} 0 L${x + 13} 0 L${x + 13 - 100} 100 L${x - 100} 100 Z"/>`;
      }
      return `<rect class="hm-ink" width="100" height="100"/>${s}<rect class="hm-ink" width="100" height="100" opacity="${(0.1 + rnd() * 0.2).toFixed(2)}"/>`;
    },
    /* one row off a call sheet */
    sheet(rnd) {
      let s = `<rect class="hm-paper" width="100" height="100"/>`;
      for (let i = 0; i < 5; i++) {
        s += `<rect class="hm-rule" x="12" y="${16 + i * 16}" width="${(26 + rnd() * 50).toFixed(0)}" height="4" rx="2"/>`;
      }
      s += `<rect class="hm-teal" x="12" y="${16 + 2 * 16 - 4}" width="30" height="12" rx="6"/>`;
      return s;
    },
    /* a lit set: one head, one cone, one stand */
    set(rnd) {
      return `<rect class="hm-deep" width="100" height="100"/>
        <path class="hm-soft" d="M38 6 L96 100 L4 100 Z" opacity="${(0.12 + rnd() * 0.1).toFixed(2)}"/>
        <rect class="hm-ink" x="34" y="4" width="18" height="13" rx="3"/>
        <rect class="hm-ink" x="41" y="16" width="4" height="78"/>
        <rect class="hm-ink" x="26" y="92" width="34" height="4" rx="2"/>
        <circle class="hm-tint" cx="43" cy="10" r="3" opacity=".5"/>`;
    },
    /* a lens, straight down the barrel */
    lens() {
      return `<rect class="hm-ink" width="100" height="100"/>
        <circle class="hm-tealD" cx="50" cy="50" r="40"/>
        <circle class="hm-line" cx="50" cy="50" r="32" opacity=".7"/>
        <circle class="hm-line" cx="50" cy="50" r="22" opacity=".45"/>
        <circle class="hm-teal" cx="50" cy="50" r="14"/>
        <circle class="hm-tint" cx="42" cy="41" r="4" opacity=".6"/>`;
    },
    /* a page of script */
    script(rnd) {
      let s = `<rect class="hm-paper" width="100" height="100"/>`;
      for (let i = 0; i < 8; i++) {
        const indent = i % 3 === 1 ? 28 : 12;
        s += `<rect class="hm-rule" x="${indent}" y="${10 + i * 10}" width="${(22 + rnd() * (76 - indent)).toFixed(0)}" height="3" rx="1.5" opacity="${i % 3 === 0 ? 0.5 : 0.25}"/>`;
      }
      return s;
    },
    /* a length of tape through the gate */
    tape() {
      let s = `<rect class="hm-ink" width="100" height="100"/><rect class="hm-tealD" x="16" y="0" width="68" height="100"/>`;
      for (let y = 4; y < 100; y += 16) {
        s += `<rect class="hm-ink" x="5" y="${y}" width="7" height="9" rx="2"/><rect class="hm-ink" x="88" y="${y}" width="7" height="9" rx="2"/>`;
      }
      s += `<rect class="hm-teal" x="24" y="22" width="52" height="56" rx="2"/>`;
      return s;
    },
  };

  const ORDER = ['bar', 'sheet', 'set', 'lens', 'script', 'tape'];

  /* ---- the board the wall turns into ----------------------------------
     The board is cut to the words, not to a fixed rectangle: its body is the
     headline block plus a margin, so the type always lands on teal and never on
     the stripes, at any viewport. */
  /* The board's measurements, in the wall's own 1000-wide space. Shared, because
     the stick that claps onto the bar has to land on the same pixels the bar is
     drawn at, and two copies of this arithmetic would drift apart. */
  function boardGeom(aspect, plate) {
    const AW = 1000;
    const AH = Math.round(AW / aspect);
    const k = AW / plate.gridW;
    const padX = AW * 0.035;

    const x = Math.max(AW * 0.03, plate.x * k - padX);
    const right = Math.min(AW * 0.97, (plate.x + plate.w) * k + padX);
    const bw = right - x;
    /* A strip under the words carries the fields, so this reads as a board. */
    const bodyBottom = Math.min(AH * 0.96, (plate.y + plate.h) * k + AH * 0.1);
    const wanted = Math.max(AH * 0.04, plate.y * k - AH * 0.035);
    /* The bar is a share of the board, not a fixed rule: a slate whose stripes are
       a thin line on a tall body stops reading as a slate. */
    const barH = Math.min(AH * 0.16, Math.max(AW * 0.03, (bodyBottom - wanted) * 0.2));
    const bodyTop = Math.max(barH + AH * 0.025, wanted);
    const y = bodyTop - barH;
    const bh = bodyBottom - y;
    return { AW, AH, k, x, bw, y, bh, barH, bodyBottom };
  }

  function boardSvg(cols, rows, aspect, plate, uid) {
    const G = boardGeom(aspect, plate);
    const AW = G.AW, AH = G.AH, x = G.x, bw = G.bw, y = G.y, bh = G.bh;
    const barH = G.barH, bodyBottom = G.bodyBottom;

    /* The 45 degree stripes, clipped to the bar. The period is capped against the
       board's width as well as the bar's height, or a tall narrow board gets
       three enormous bands instead of a slate's comb. */
    const step = Math.min(barH * 0.62, bw * 0.055);
    let stripes = '';
    for (let sx = x - barH; sx < x + bw + barH; sx += step * 2) {
      stripes += `<path class="b-stripe-a" d="M${sx} ${y} L${sx + step} ${y} L${sx + step - barH} ${y + barH} L${sx - barH} ${y + barH} Z"/>`;
    }

    /* Three fields along the foot of the board, under the words. */
    const fpad = bw * 0.06;
    const colW = (bw - fpad * 2) / 3;
    const fy = bodyBottom - AH * 0.062;
    const lh = Math.max(3, AH * 0.009);
    let fields = '';
    [0.46, 0.3, 0.38].forEach((fill, i) => {
      const fx = x + fpad + i * colW;
      const fw = colW - bw * 0.035;
      fields += `<rect class="b-label" x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${(fw * 0.3).toFixed(1)}" height="${lh.toFixed(1)}" rx="1.5"/>`;
      fields += `<rect class="b-value" x="${fx.toFixed(1)}" y="${(fy + lh * 2.4).toFixed(1)}" width="${(fw * fill).toFixed(1)}" height="${(lh * 1.9).toFixed(1)}" rx="1.5"/>`;
      fields += `<path class="b-rule" d="M${fx.toFixed(1)} ${(fy + lh * 6).toFixed(1)} H${(fx + fw).toFixed(1)}"/>`;
    });

    return `<svg class="hm__board" viewBox="0 0 ${AW} ${AH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <defs><clipPath id="hmBar${uid}"><rect x="${x}" y="${y}" width="${bw}" height="${barH}"/></clipPath></defs>
      <rect class="b-edge" x="${x - 6}" y="${y - 6}" width="${bw + 12}" height="${bh + 12}" rx="6"/>
      <rect class="b-stripe-b" x="${x}" y="${y}" width="${bw}" height="${barH}"/>
      <g clip-path="url(#hmBar${uid})">${stripes}</g>
      <rect class="b-body" x="${x}" y="${y + barH}" width="${bw}" height="${bh - barH}"/>
      ${fields}
    </svg>`;
  }

  function build() {
    const root = document.querySelector('.hero-mosaic');
    const D = window.KLDATA;
    if (!root || !D) return;
    const H = D.hero;

    /* data-clap="scroll" turns the wall into a board that claps as you leave it.
       Without it the hero behaves exactly as it always has. */
    const CLAP = root.dataset.clap === 'scroll';

    root.innerHTML = `
      <div class="hm__grid" aria-hidden="true"></div>
      ${CLAP ? '<div class="hm__stick" aria-hidden="true"></div><div class="hm__flash" aria-hidden="true"></div>' : ''}
      <div class="hm__veil" aria-hidden="true"></div>
      <div class="hm__plate">
        <h1 class="hm__title">${H.slogan}</h1>
        <p class="hm__ar" lang="ar" dir="rtl">${H.sloganAr}</p>
        <p class="hm__lede">${H.lede}</p>
        <div class="hm__ctas">
          <a class="btn" href="${H.primary.href}">${H.primary.label}${ARROW}</a>
          <a class="btn btn--ghost" href="${H.secondary.href}">${H.secondary.label}</a>
        </div>
      </div>`;

    const grid = root.querySelector('.hm__grid');
    const plate = root.querySelector('.hm__plate');
    const stick = root.querySelector('.hm__stick');
    const flash = root.querySelector('.hm__flash');
    const g = window.KL && KL.gsap;
    const still = !g || (window.KL && KL.reduced);

    let tiles = [];
    let shape = '';
    let tl = null;
    let uid = 0;

    function wall() {
      const cs = getComputedStyle(root);
      const cols = parseInt(cs.getPropertyValue('--cols'), 10) || 6;
      const rows = parseInt(cs.getPropertyValue('--rows'), 10) || 4;
      const r = grid.getBoundingClientRect();
      const aspect = r.height > 0 ? r.width / r.height : 1.6;
      const p = plate.getBoundingClientRect();
      /* The words, in the grid's own coordinates: the board is cut to fit them. */
      const box = { gridW: r.width, x: p.left - r.left, y: p.top - r.top, w: p.width, h: p.height };
      /* Only redraw when the wall is actually a different wall. */
      const key = `${cols}x${rows}x${aspect.toFixed(2)}x${Math.round(box.x)}x${Math.round(box.y)}x${Math.round(box.w)}x${Math.round(box.h)}`;
      if (key === shape) return false;
      shape = key;
      uid++;

      const rnd = seeded(7731);
      let signalUsed = false;
      let html = '';
      let n = 0;
      for (let r2 = 0; r2 < rows; r2++) {
        for (let c = 0; c < cols; c++) {
          /* Every copy needs its own clip id: a document with two of the same id
             sends both references to whichever came first. */
          const board = boardSvg(cols, rows, aspect, box, `${uid}-${n++}`);
          const kind = ORDER[(r2 * 3 + c * 2 + Math.floor(rnd() * 2)) % ORDER.length];
          /* One tally light on the whole wall, and only one. */
          const tally = !signalUsed && kind === 'set' && r2 > 0;
          if (tally) signalUsed = true;
          html += `<div class="hm__tile" style="--c:${c};--r:${r2}" data-c="${c}" data-r="${r2}">
            <span class="hm__face"><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${STILLS[kind](rnd)}${tally ? '<circle class="hm-signal" cx="82" cy="18" r="5"/>' : ''}</svg></span>
            <span class="hm__back">${board}</span>
          </div>`;
        }
      }
      grid.innerHTML = html;
      tiles = [...grid.children];

      /* Lay the stick along the bar it has to shut onto, in grid pixels. */
      if (stick) {
        const G = boardGeom(aspect, box);
        const px = (v) => (v / G.k) + 'px';
        stick.style.left = px(G.x);
        stick.style.width = px(G.bw);
        stick.style.top = px(G.y);
        stick.style.height = px(G.barH);
        stick.style.setProperty('--stripe-w', px(Math.min(G.barH * 0.62, G.bw * 0.055)));
      }
      return true;
    }

    wall();

    if (still) {
      root.classList.add('is-still');
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => wall());
      return;
    }

    function animate(replay) {
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); tl = null; }
      const cols = parseInt(getComputedStyle(root).getPropertyValue('--cols'), 10) || 6;
      const rows = parseInt(getComputedStyle(root).getPropertyValue('--rows'), 10) || 4;

      if (replay) {
        g.set(tiles, { rotationY: 0, x: 0, y: 0, opacity: 1 });
        g.set(plate, { opacity: 0, y: 18 });
        const intro = g.timeline({ delay: 0.12 });
        intro.to(tiles, {
          rotationY: 180,
          duration: 0.9,
          ease: 'power3.inOut',
          stagger: { grid: [rows, cols], from: 'center', amount: 0.85 },
        }, 0);
        intro.to(plate, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.75);
      } else {
        g.set(tiles, { rotationY: 180, x: 0, y: 0, opacity: 1 });
        g.set(plate, { opacity: 1, y: 0 });
      }

      /* Scrolling takes the wall apart again, outward from the middle. In clap
         mode the stick shuts first and the wall only lets go on the impact, so
         leaving the hero reads as the take starting rather than as a transition. */
      /* The clap has to be watched, so in clap mode the hero is held while the
         stick comes down. Without the pin the board is already leaving the
         screen by the time it shuts and the whole point is missed. */
      tl = g.timeline({
        scrollTrigger: CLAP
          ? { trigger: root, start: 'top top', end: () => '+=' + window.innerHeight * 1.5,
              pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
              /* This pin is rebuilt once the display face lands, which is after
                 the sections below have already measured themselves. Without a
                 priority they keep starts that ignore this pin's spacer and the
                 hero ends up drawn on top of the screen after it. Higher means
                 measured first, and this is the first thing on the page. */
              refreshPriority: 10 }
          : { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });

      const SHUT = CLAP ? 0.42 : 0;
      if (CLAP) {
        g.set(stick, { rotation: -20, opacity: 1 });
        g.set(flash, { opacity: 0 });
        tl.to(stick, { rotation: 0, duration: SHUT, ease: 'power3.in' }, 0)
          .to(flash, { opacity: 0.62, duration: 0.012, ease: 'none' }, SHUT)
          .to(flash, { opacity: 0, duration: 0.09, ease: 'power2.out' }, SHUT + 0.012);
      }

      if (CLAP) {
        /* Once the board has shut there is nothing left to say here, so the
           hero just goes dark and scrolls away. Flinging the wall apart on the
           way out fights the screen underneath, which is already waiting. */
        /* Gone, not faint. The screen underneath is already there, and a hero
           left at eight percent reads as two pages printed on top of each other. */
        const OUT = (1 - SHUT) * 0.62;
        tl.to([grid, plate, stick], { opacity: 0, ease: 'power2.in', duration: OUT }, SHUT);
      } else {
        tl.to(tiles, {
          x: (i, el) => ((+el.dataset.c) - (cols - 1) / 2) / cols * 420,
          y: (i, el) => ((+el.dataset.r) - (rows - 1) / 2) / rows * 460,
          opacity: 0.05,
          ease: 'none',
          duration: 1,
        }, 0);
        tl.to(plate, { y: -60, opacity: 0, ease: 'none', duration: 0.7 }, 0);
      }
    }

    animate(true);

    /* A pin added here lengthens the page, and every trigger further down was
       measured against the page as it was a moment ago. Without this they keep
       their old numbers and the sections below end up with dead gaps in them. */
    function remeasure() {
      if (CLAP) requestAnimationFrame(() => KL.ScrollTrigger.refresh());
    }
    remeasure();

    /* The display face changes how wide the words are, and the board is cut to
       the words, so the wall is cut again once the face has landed. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (wall()) animate(true); remeasure(); });
    }

    /* A rebuild has to replace the tiles the timelines were holding. */
    let pending = null;
    function onResize() {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        if (wall()) animate(false);
        KL.ScrollTrigger.refresh();
      }, 180);
    }
    window.addEventListener('resize', onResize);

    window.addEventListener('pagehide', () => {
      window.removeEventListener('resize', onResize);
      if (pending) clearTimeout(pending);
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
